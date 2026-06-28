"""
tests/test_feedback/conftest.py
"""
import pytest
from app.main import app as _app
from app.core.limiter import limiter


@pytest.fixture
def app_instance():
    yield _app
    _app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def disable_rate_limit():
    limiter.enabled = False
    yield
    limiter.enabled = True