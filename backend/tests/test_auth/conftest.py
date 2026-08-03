import pytest


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.core.limiter import limiter
    limiter.reset()
    yield


@pytest.fixture(autouse=True)
def mock_background_side_effects(monkeypatch):
    """
    create_tokens_and_set_cookies() schedules record_login_history_task as a
    BackgroundTask, and that function opens its OWN SessionLocal() — NOT the
    test db session we override via dependency_overrides. If we don't stub
    this out, tests would silently write to whatever DATABASE_URL is
    configured for production, not TEST_DATABASE_URL.

    Same story for send_telegram_alert and the OTP/farewell email tasks —
    none of these should ever fire during a test run.

    TestClient (httpx-based) executes BackgroundTasks synchronously right
    after the response, so these WILL run during a test unless mocked here.
    """
    monkeypatch.setattr("app.api.auth.record_login_history_task", lambda *a, **k: None)
    monkeypatch.setattr("app.api.auth.send_telegram_alert", lambda *a, **k: None)
    monkeypatch.setattr("app.api.auth.send_otp_email_task_async", lambda *a, **k: None)
    monkeypatch.setattr("app.api.auth.send_farewell_email", lambda *a, **k: None)


@pytest.fixture
def csrf_headers():
    """
    /api/auth/refresh, /api/auth/logout, /api/auth/logout-all, /api/auth/me
    are NOT in CSRF_EXEMPT_PATHS in main.py's guardian_middleware. Any POST/
    PUT/PATCH/DELETE to these needs a valid Origin + a non-empty
    X-CSRF-Token header, or guardian_middleware 403s before the route ever
    runs. The middleware only checks the token is PRESENT, not its value.
    """
    return {
        "Origin": "http://localhost:5173",
        "X-CSRF-Token": "test-client",
    }


@pytest.fixture
def verified_user(make_user, db):
    """A standard, email/password-verified user ready to log in."""
    from passlib.hash import bcrypt

    user = make_user(email="verified@test.com")
    user.password_hash = bcrypt.hash("CorrectHorse123!")
    user.is_verified = True
    db.flush()
    return user