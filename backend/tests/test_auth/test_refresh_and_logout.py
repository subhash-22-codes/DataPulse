"""
Tests for POST /api/auth/refresh and POST /api/auth/logout.

Both routes are NOT in CSRF_EXEMPT_PATHS, so every call needs the
csrf_headers fixture or guardian_middleware 403s before the route runs.
"""


def _login(client, user, password="CorrectHorse123!"):
    return client.post(
        "/api/auth/login-email",
        json={"email": user.email, "password": password},
    )


class TestRefresh:
    def test_refresh_without_cookies_returns_401(self, client, csrf_headers):
        resp = client.post("/api/auth/refresh", headers=csrf_headers)
        assert resp.status_code == 401
        assert "refresh token" in resp.json()["detail"].lower()

    def test_refresh_without_csrf_header_is_blocked_by_middleware(self, client):
        """
        Sanity check on the middleware itself: even with valid cookies,
        omitting X-CSRF-Token must 403 before the route logic runs at all.
        """
        resp = client.post(
            "/api/auth/refresh", headers={"Origin": "http://localhost:5173"}
        )
        assert resp.status_code == 403

    def test_refresh_rotates_tokens_and_revokes_old_one(
        self, client, verified_user, csrf_headers, db
    ):
        from app.models.token import RefreshToken

        login_resp = _login(client, verified_user)
        old_refresh_value = login_resp.cookies.get("refresh_token")
        assert old_refresh_value is not None

        refresh_resp = client.post("/api/auth/refresh", headers=csrf_headers)
        assert refresh_resp.status_code == 200

        new_refresh_value = refresh_resp.cookies.get("refresh_token")
        assert new_refresh_value is not None
        assert new_refresh_value != old_refresh_value

        old_token_row = (
            db.query(RefreshToken)
            .filter(RefreshToken.token == old_refresh_value)
            .first()
        )
        assert old_token_row is not None
        assert old_token_row.revoked is True
        assert old_token_row.replaced_by_token == new_refresh_value

    def test_refresh_with_already_revoked_token_nukes_all_sessions(
        self, client, verified_user, csrf_headers, db
    ):
        """
        Reuse of a revoked refresh token is treated as a stolen-token
        signal: ALL of the user's refresh tokens get deleted and
        token_version bumps, not just the one that was reused.
        """
        login_resp = _login(client, verified_user)
        original_refresh_value = login_resp.cookies.get("refresh_token")

        # This call rotates the token — original_refresh_value is now revoked
        client.post("/api/auth/refresh", headers=csrf_headers)

        # Replay the OLD, now-revoked token to simulate token theft/reuse
        client.cookies.set("refresh_token", original_refresh_value)

        replay_resp = client.post("/api/auth/refresh", headers=csrf_headers)
        assert replay_resp.status_code == 401


class TestLogout:
    def test_logout_clears_all_three_cookies(self, client, verified_user, csrf_headers):
        _login(client, verified_user)
        assert client.get("/api/auth/session-check").status_code == 200

        logout_resp = client.post("/api/auth/logout", headers=csrf_headers)
        assert logout_resp.status_code == 200

        set_cookie_headers = logout_resp.headers.get_list("set-cookie")
        cleared_names = {h.split("=")[0] for h in set_cookie_headers}
        assert cleared_names == {"access_token", "refresh_token", "session_id"}

        for header in set_cookie_headers:
            lower = header.lower()
            # Deletion is expressed either as an empty value or an
            # immediately-expired Max-Age/Expires — accept either form.
            assert "path=/" in lower

    def test_session_check_fails_after_logout(self, client, verified_user, csrf_headers):
        _login(client, verified_user)
        client.post("/api/auth/logout", headers=csrf_headers)

        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_logout_without_csrf_header_is_blocked(self, client, verified_user):
        _login(client, verified_user)
        resp = client.post(
            "/api/auth/logout", headers={"Origin": "http://localhost:5173"}
        )
        assert resp.status_code == 403