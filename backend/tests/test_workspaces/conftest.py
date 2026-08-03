import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def csrf_headers():
    """Same as test_auth's — duplicated here since pytest conftest fixtures
    don't cross folder boundaries. See test_auth/conftest.py for context."""
    return {
        "Origin": "http://localhost:5173",
        "X-CSRF-Token": "test-client",
    }


@pytest.fixture
def client_allow_500(client):
    """
    Starlette's default TestClient (used by the top-level `client` fixture)
    has raise_server_exceptions=True — meaning an unhandled exception in an
    endpoint crashes the TEST ITSELF with that exception, rather than
    returning a real 500 response.

    That's unhelpful here: we want ONE stable assertion (status_code == 400)
    that fails now (proving the bug — currently a crash) and passes after
    the fix (clean 400), without having to write two different assertion
    shapes for "before" and "after".

    This fixture depends on `client` purely to ensure the get_db override
    is already registered on the shared `app` object before we build a
    second TestClient pointed at the same app.
    """
    return TestClient(app, base_url="https://testserver", raise_server_exceptions=False)


@pytest.fixture
def authed(client_allow_500, make_user):
    """
    Bypasses the cookie/login flow entirely by directly overriding
    get_current_user — simplest way to get an authenticated request when
    the thing under test has nothing to do with auth itself (these bug
    tests are about UUID handling, not login).
    """
    from app.api.dependencies import get_current_user

    user = make_user(email="bugcheck@test.com")
    app.dependency_overrides[get_current_user] = lambda: user
    yield client_allow_500, user
    app.dependency_overrides.pop(get_current_user, None)