"""
Tests for POST /api/auth/google (the direct token-verification login used
by the frontend's Google Sign-In button — NOT the redirect-based
/google/link -> /google/callback flow).

NOTE: /google/callback and /github/callback rely on authlib's
session-based OAuth state handling and a real browser redirect round
trip. Faking that convincingly in a unit test would mostly test our
mocks, not real behavior — that flow is better covered by an actual
manual click-through test (which we already did in production) than a
unit test here. This file covers the piece that's genuinely testable
in isolation: what happens once we have a verified Google identity.
"""
from app.models.user import User
from unittest.mock import patch


GOOGLE_IDINFO = {
    "email": "googleuser@test.com",
    "email_verified": True,
    "sub": "google-sub-12345",
    "name": "Google User",
}


class TestGoogleLogin:
    def test_new_user_created_on_first_google_login(self, client, db):
        from app.models.user import User

        with patch("app.api.auth.id_token.verify_oauth2_token", return_value=GOOGLE_IDINFO):
            resp = client.post("/api/auth/google", json={"token": "fake-google-token"})

        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "googleuser@test.com"

        user = db.query(User).filter(User.email == "googleuser@test.com").first()
        assert user is not None
        assert user.google_id == "google-sub-12345"
        assert user.is_verified is True
        assert user.signup_method == "google"

    def test_existing_google_user_logs_in_without_duplicate(self, client, db, make_user):
        user = make_user(email="googleuser@test.com")
        user.google_id = "google-sub-12345"
        user.is_verified = True
        db.flush()

        with patch("app.api.auth.id_token.verify_oauth2_token", return_value=GOOGLE_IDINFO):
            resp = client.post("/api/auth/google", json={"token": "fake-google-token"})

        assert resp.status_code == 200

        count = db.query(User).filter(User.email == "googleuser@test.com").count()
        assert count == 1  # no duplicate user created

    def test_unverified_google_email_rejected(self, client):
        bad_idinfo = {**GOOGLE_IDINFO, "email_verified": False}
        with patch("app.api.auth.id_token.verify_oauth2_token", return_value=bad_idinfo):
            resp = client.post("/api/auth/google", json={"token": "fake-google-token"})
        assert resp.status_code == 400

    def test_invalid_google_token_rejected(self, client):
        with patch(
            "app.api.auth.id_token.verify_oauth2_token",
            side_effect=ValueError("bad token"),
        ):
            resp = client.post("/api/auth/google", json={"token": "garbage"})
        assert resp.status_code == 401

    def test_existing_verified_email_password_account_blocks_google_takeover(
        self, client, verified_user
    ):
        """
        If someone already has a verified email/password account, a
        Google login attempt with the SAME email must not silently take
        over that account — get_or_create_social_user raises 400 in
        this case (user_by_email.is_verified is already True).
        """
        idinfo = {**GOOGLE_IDINFO, "email": verified_user.email}
        with patch("app.api.auth.id_token.verify_oauth2_token", return_value=idinfo):
            resp = client.post("/api/auth/google", json={"token": "fake-google-token"})
        assert resp.status_code == 400