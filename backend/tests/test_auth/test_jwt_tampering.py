"""
Direct tests of app.api.dependencies.get_current_user's JWT validation
logic, via GET /api/auth/session-check as the entry point. These
complement test_login.py's happy-path session-check tests by targeting
specifically malformed/malicious tokens.
"""
import datetime as dt
import os
import jwt
import pytest

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def _make_token(payload_overrides=None, secret=None, algorithm=None, exp_delta=None):
    payload = {
        "sub": "00000000-0000-0000-0000-000000000000",
        "type": "access",
        "ver": 1,
        "iss": "datapulse-auth",
        "iat": dt.datetime.now(dt.timezone.utc),
        "exp": dt.datetime.now(dt.timezone.utc) + (exp_delta or dt.timedelta(minutes=15)),
    }
    if payload_overrides:
        payload.update(payload_overrides)
    return jwt.encode(
        payload,
        secret or JWT_SECRET,
        algorithm=algorithm or JWT_ALGORITHM,
    )


@pytest.fixture
def real_user_token(verified_user):
    return _make_token({"sub": str(verified_user.id), "ver": verified_user.token_version})


class TestJwtTampering:
    def test_valid_token_for_real_user_succeeds(self, client, verified_user, real_user_token):
        client.cookies.set("access_token", real_user_token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == verified_user.email

    def test_token_signed_with_wrong_secret_rejected(self, client, verified_user):
        bad_token = _make_token(
            {"sub": str(verified_user.id), "ver": verified_user.token_version},
            secret="totally-wrong-secret",
        )
        client.cookies.set("access_token", bad_token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_expired_token_rejected(self, client, verified_user):
        expired_token = _make_token(
            {"sub": str(verified_user.id), "ver": verified_user.token_version},
            exp_delta=dt.timedelta(minutes=-1),
        )
        client.cookies.set("access_token", expired_token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401
        assert "expired" in resp.json()["detail"].lower()

    def test_refresh_token_type_rejected_as_access_token(self, client, verified_user):
        """A stolen/misused refresh-typed JWT must not work where an
        access token is expected."""
        wrong_type_token = _make_token(
            {"sub": str(verified_user.id), "ver": verified_user.token_version, "type": "refresh"}
        )
        client.cookies.set("access_token", wrong_type_token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_missing_issuer_claim_rejected(self, client, verified_user):
        token = _make_token({"sub": str(verified_user.id), "ver": verified_user.token_version})
        # Re-encode without iss entirely to simulate a malformed/forged token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_iss": False})
        payload.pop("iss", None)
        malformed = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        client.cookies.set("access_token", malformed)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_malformed_user_id_rejected(self, client):
        token = _make_token({"sub": "not-a-valid-uuid", "ver": 1})
        client.cookies.set("access_token", token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_nonexistent_user_id_rejected(self, client):
        token = _make_token({"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "ver": 1})
        client.cookies.set("access_token", token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_stale_token_version_rejected(self, client, verified_user):
        """Simulates a token issued BEFORE a security reset bumped
        token_version — the kill-switch must catch this."""
        stale_token = _make_token(
            {"sub": str(verified_user.id), "ver": verified_user.token_version - 1}
        )
        client.cookies.set("access_token", stale_token)
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_completely_garbage_token_rejected(self, client):
        client.cookies.set("access_token", "not.a.real.jwt.at.all")
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401

    def test_no_cookie_at_all_rejected(self, client):
        resp = client.get("/api/auth/session-check")
        assert resp.status_code == 401