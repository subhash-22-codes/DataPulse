"""
Tests for POST /api/auth/login-email

These paths are CSRF-exempt in guardian_middleware, so no Origin/CSRF
headers are needed here — see test_refresh.py and test_logout.py for
endpoints that DO require them.
"""


def test_login_success_sets_all_three_cookies(client, verified_user):
    resp = client.post(
        "/api/auth/login-email",
        json={"email": verified_user.email, "password": "CorrectHorse123!"},
    )

    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == verified_user.email

    cookie_names = {c.name for c in resp.cookies.jar}
    assert cookie_names == {"access_token", "refresh_token", "session_id"}


def test_login_cookies_have_correct_security_flags(client, verified_user):
    resp = client.post(
        "/api/auth/login-email",
        json={"email": verified_user.email, "password": "CorrectHorse123!"},
    )

    # httpx's cookiejar doesn't expose Secure/HttpOnly/SameSite directly,
    # so we inspect the raw Set-Cookie headers instead.
    set_cookie_headers = resp.headers.get_list("set-cookie")
    assert len(set_cookie_headers) == 3

    for header in set_cookie_headers:
        lower = header.lower()
        assert "httponly" in lower, f"Missing HttpOnly: {header}"
        assert "secure" in lower, f"Missing Secure: {header}"
        assert "samesite=none" in lower, f"Missing SameSite=None: {header}"
        assert "path=/" in lower, f"Missing Path=/: {header}"


def test_login_wrong_password_returns_401(client, verified_user):
    resp = client.post(
        "/api/auth/login-email",
        json={"email": verified_user.email, "password": "WrongPassword1!"},
    )
    assert resp.status_code == 401
    assert resp.cookies.get("access_token") is None


def test_login_nonexistent_user_returns_401_not_404(client):
    """
    Timing-attack mitigation: a nonexistent email must return the exact
    same generic 401 as a wrong password, not a 404 or a distinguishable
    error, and it must still run bcrypt.verify() against the DUMMY_HASH
    so response timing doesn't leak whether the email exists.
    """
    resp = client.post(
        "/api/auth/login-email",
        json={"email": "nobody@nowhere.com", "password": "Whatever123!"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password"


def test_login_unverified_user_returns_401(client, make_user, db):
    from passlib.hash import bcrypt

    user = make_user(email="pending@test.com")
    user.password_hash = bcrypt.hash("CorrectHorse123!")
    user.is_verified = False
    db.flush()

    resp = client.post(
        "/api/auth/login-email",
        json={"email": user.email, "password": "CorrectHorse123!"},
    )
    assert resp.status_code == 401


def test_login_social_only_account_rejects_password_login(client, make_user, db):
    """A user who signed up via Google (no password_hash set) must get a
    clear message telling them to use that provider, not a generic 401."""
    user = make_user(email="social@test.com")
    user.google_id = "some-google-sub-id"
    user.signup_method = "google"
    user.is_verified = True
    user.password_hash = None
    db.flush()

    resp = client.post(
        "/api/auth/login-email",
        json={"email": user.email, "password": "Whatever123!"},
    )
    assert resp.status_code == 400
    assert "google" in resp.json()["detail"].lower() or "social" in resp.json()["detail"].lower()


class TestSessionCheck:
    """GET /api/auth/session-check — protected by get_current_user."""

    def test_session_check_without_cookie_returns_401(self, client):
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_session_check_after_login_succeeds(self, client, verified_user):
        login_resp = client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )
        assert login_resp.status_code == 200

        # httpx TestClient persists cookies across requests on the same
        # client instance automatically — no manual cookie forwarding needed.
        check_resp = client.get("/api/auth/session-check")
        assert check_resp.status_code == 200
        assert check_resp.json()["user"]["email"] == verified_user.email

    def test_session_check_rejects_token_after_security_reset(
        self, client, verified_user, db
    ):
        """
        The token_version kill-switch: if the DB's token_version no longer
        matches what's embedded in the access_token JWT, the session must
        be rejected immediately — even though the JWT itself hasn't
        expired. This is what makes logout-all() actually work.
        """
        client.post(
            "/api/auth/login-email",
            json={"email": verified_user.email, "password": "CorrectHorse123!"},
        )
        assert client.get("/api/auth/session-check").status_code == 200

        # Simulate a security-reset event bumping the version server-side
        verified_user.token_version += 1
        db.flush()

        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401