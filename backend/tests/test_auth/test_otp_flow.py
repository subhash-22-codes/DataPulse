"""
Tests for POST /api/auth/send-otp, /verify-otp, /send-password-reset,
/reset-password.

send-otp, verify-otp, send-password-reset, reset-password are all in
CSRF_EXEMPT_PATHS, so no csrf_headers needed for these calls.
"""
import datetime as dt
from passlib.hash import bcrypt


class TestSendOtp:
    def test_send_otp_creates_unverified_user(self, client, db):
        from app.models.user import User

        resp = client.post("/api/auth/send-otp", json={"email": "new@test.com"})
        assert resp.status_code == 200

        user = db.query(User).filter(User.email == "new@test.com").first()
        assert user is not None
        assert user.is_verified is False
        assert user.otp_code is not None

    def test_send_otp_blocks_already_active_account(self, client, verified_user):
        resp = client.post("/api/auth/send-otp", json={"email": verified_user.email})
        assert resp.status_code == 400
        assert "already active" in resp.json()["detail"].lower()

    def test_send_otp_blocks_social_only_account(self, client, make_user, db):
        user = make_user(email="social2@test.com")
        user.google_id = "abc"
        user.signup_method = "google"
        user.password_hash = None
        db.flush()

        resp = client.post("/api/auth/send-otp", json={"email": user.email})
        assert resp.status_code == 400
        assert "google" in resp.json()["detail"].lower()

    def test_send_otp_enforces_60_second_cooldown(self, client, make_user, db):
        user = make_user(email="cooldown@test.com")
        user.last_otp_requested_at = dt.datetime.now(dt.timezone.utc)
        db.flush()

        resp = client.post("/api/auth/send-otp", json={"email": user.email})
        assert resp.status_code == 429


class TestVerifyOtp:
    def _make_pending_user(self, make_user, db, otp="123456", expired=False, attempts=0):
        user = make_user(email="pending@test.com")
        user.otp_code = bcrypt.hash(otp)
        user.otp_attempts = attempts
        user.otp_expiry = dt.datetime.now(dt.timezone.utc) + (
            dt.timedelta(minutes=-1) if expired else dt.timedelta(minutes=5)
        )
        db.flush()
        return user

    def test_verify_otp_success_sets_password_and_verifies(self, client, make_user, db):
        user = self._make_pending_user(make_user, db)

        resp = client.post(
            "/api/auth/verify-otp",
            json={
                "name": "Pending User",
                "email": user.email,
                "otp": "123456",
                "password": "NewPass123!",
            },
        )
        assert resp.status_code == 200

        db.refresh(user)
        assert user.is_verified is True
        assert user.otp_code is None
        assert bcrypt.verify("NewPass123!", user.password_hash)

    def test_verify_otp_wrong_code_increments_attempts(self, client, make_user, db):
        user = self._make_pending_user(make_user, db)

        resp = client.post(
            "/api/auth/verify-otp",
            json={
                "name": "Pending User",
                "email": user.email,
                "otp": "000000",
                "password": "NewPass123!",
            },
        )
        assert resp.status_code == 400
        db.refresh(user)
        assert user.otp_attempts == 1

    def test_verify_otp_expired_code_rejected(self, client, make_user, db):
        user = self._make_pending_user(make_user, db, expired=True)

        resp = client.post(
            "/api/auth/verify-otp",
            json={
                "name": "Pending User",
                "email": user.email,
                "otp": "123456",
                "password": "NewPass123!",
            },
        )
        assert resp.status_code == 400

    def test_verify_otp_locked_after_5_failed_attempts(self, client, make_user, db):
        user = self._make_pending_user(make_user, db, attempts=5)

        resp = client.post(
            "/api/auth/verify-otp",
            json={
                "name": "Pending User",
                "email": user.email,
                "otp": "123456",  # even the CORRECT otp must be rejected now
                "password": "NewPass123!",
            },
        )
        assert resp.status_code == 403
        assert "too many" in resp.json()["detail"].lower()


class TestPasswordReset:
    def test_send_password_reset_same_response_for_unknown_email(self, client, csrf_headers):
        """
        Must not leak whether an email exists — same generic message
        whether the account is real or not.
        """
        resp = client.post(
            "/api/auth/send-password-reset",
            json={"email": "nobody@test.com"},
            headers=csrf_headers,
        )
        assert resp.status_code == 200
        assert "if an account exists" in resp.json()["msg"].lower()

    def test_reset_password_success_and_revokes_existing_sessions(
        self, client, verified_user, db, csrf_headers
    ):
        from app.models.token import RefreshToken

        otp = "654321"
        verified_user.otp_code = bcrypt.hash(otp)
        verified_user.otp_expiry = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=5)
        db.add(RefreshToken(
            token="some-existing-refresh-token",
            user_id=verified_user.id,
            session_id="some-session",
            user_agent_hash="hash",
            expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
        ))
        db.flush()

        resp = client.post(
            "/api/auth/reset-password",
            json={
                "email": verified_user.email,
                "reset_code": otp,
                "new_password": "BrandNewPass123!",
            },
            headers=csrf_headers,
        )
        assert resp.status_code == 200

        remaining = db.query(RefreshToken).filter(
            RefreshToken.user_id == verified_user.id
        ).count()
        assert remaining == 0

    def test_reset_password_wrong_code_rejected(self, client, verified_user, db, csrf_headers):
        verified_user.otp_code = bcrypt.hash("111111")
        verified_user.otp_expiry = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=5)
        db.flush()

        resp = client.post(
            "/api/auth/reset-password",
            json={
                "email": verified_user.email,
                "reset_code": "999999",
                "new_password": "Whatever123!",
            },
            headers=csrf_headers,
        )
        assert resp.status_code == 400