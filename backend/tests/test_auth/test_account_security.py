"""
Tests for POST /api/auth/logout-all, POST /api/auth/unlink/{provider},
DELETE /api/auth/me.

None of these are in CSRF_EXEMPT_PATHS, so all need csrf_headers.
"""
import datetime as dt


class TestLogoutAll:
    def test_logout_all_revokes_every_refresh_token(
        self, client, verified_user, csrf_headers, db
    ):
        from app.models.token import RefreshToken

        db.add(RefreshToken(
            token="session-1", user_id=verified_user.id, session_id="s1",
            user_agent_hash="h1", expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
        ))
        db.add(RefreshToken(
            token="session-2", user_id=verified_user.id, session_id="s2",
            user_agent_hash="h2", expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
        ))
        db.flush()

        client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )

        resp = client.post("/api/auth/logout-all", headers=csrf_headers)
        assert resp.status_code == 200

        remaining = db.query(RefreshToken).filter(
            RefreshToken.user_id == verified_user.id
        ).count()
        assert remaining == 0

    def test_logout_all_bumps_token_version(self, client, verified_user, csrf_headers, db):
        client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )
        version_before = verified_user.token_version

        client.post("/api/auth/logout-all", headers=csrf_headers)

        db.refresh(verified_user)
        assert verified_user.token_version == version_before + 1

    def test_current_session_check_fails_after_logout_all(
        self, client, verified_user, csrf_headers
    ):
        client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )
        client.post("/api/auth/logout-all", headers=csrf_headers)

        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401


class TestUnlinkProvider:
    def test_cannot_unlink_only_login_method(
        self, client, make_user, db, csrf_headers
    ):
        """A user with ONLY Google linked (no password, no GitHub) must
        not be able to unlink Google — they'd be permanently locked out."""
        from app.api.dependencies import get_current_user

        user = make_user(email="onlygoogle@test.com")
        user.google_id = "abc123"
        user.password_hash = None
        user.github_id = None
        db.flush()

        client.app.dependency_overrides[get_current_user] = lambda: user
        resp = client.post("/api/auth/unlink/google", headers=csrf_headers)
        client.app.dependency_overrides.pop(get_current_user, None)

        assert resp.status_code == 400
        assert "only login method" in resp.json()["detail"].lower()

    def test_can_unlink_google_if_password_exists(
        self, client, make_user, db, csrf_headers
    ):
        from passlib.hash import bcrypt
        from app.api.dependencies import get_current_user

        user = make_user(email="hasboth@test.com")
        user.google_id = "abc123"
        user.password_hash = bcrypt.hash("SomePass123!")
        db.flush()

        client.app.dependency_overrides[get_current_user] = lambda: user
        resp = client.post("/api/auth/unlink/google", headers=csrf_headers)
        client.app.dependency_overrides.pop(get_current_user, None)

        assert resp.status_code == 200
        db.refresh(user)
        assert user.google_id is None

    def test_unsupported_provider_rejected(self, client, verified_user, csrf_headers):
        from app.api.dependencies import get_current_user

        client.app.dependency_overrides[get_current_user] = lambda: verified_user
        resp = client.post("/api/auth/unlink/facebook", headers=csrf_headers)
        client.app.dependency_overrides.pop(get_current_user, None)

        assert resp.status_code == 400


class TestDeleteAccount:
    def test_delete_account_removes_user_and_clears_cookies(
        self, client, verified_user, csrf_headers, db, monkeypatch
    ):
        from app.models.user import User

        # storage_service.delete_files and email/telegram side effects
        # are already neutralized by the autouse mock fixture for
        # record_login_history/telegram/otp-email, but delete_account
        # also calls delete_files and send_farewell_email directly —
        # stub those too so this test never touches real storage or email.
        monkeypatch.setattr("app.api.auth.delete_files", lambda *a, **k: None)

        client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )

        resp = client.delete("/api/auth/me", headers=csrf_headers)
        assert resp.status_code == 200

        remaining = db.query(User).filter(User.id == verified_user.id).first()
        assert remaining is None

    def test_session_check_fails_after_account_deletion(
        self, client, verified_user, csrf_headers, monkeypatch
    ):
        monkeypatch.setattr("app.api.auth.delete_files", lambda *a, **k: None)

        client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )
        client.delete("/api/auth/me", headers=csrf_headers)

        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401