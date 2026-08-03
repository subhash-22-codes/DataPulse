import os
import uuid
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.api.dependencies import get_current_user

from app.core.database import Base

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

# ── HARD SAFETY GUARD ────────────────────────────────────────────────────
# Refuse to run if this looks anything like a production URL.
# This is the single most important check in this whole file.
if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL is not set. Refusing to run tests without an "
        "explicit, isolated test database."
    )

if "test" not in TEST_DATABASE_URL.lower():
    raise RuntimeError(
        f"TEST_DATABASE_URL does not contain 'test' in its name "
        f"({TEST_DATABASE_URL}). Refusing to run — this guard exists to "
        f"prevent ever accidentally running tests against production."
    )
# ──────────────────────────────────────────────────────────────────────────

engine = create_engine(TEST_DATABASE_URL, future=True)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _setup_test_schema():
    """Create all tables once at the start of the test session, drop at the end."""
    # Import all models so they register on Base.metadata before create_all
    from app.models import (
        user, workspace, data_upload, notification, alert_rule, token,
        feedback, workspace_user_settings, table_daily_metrics,
        column_daily_metrics, incidents, incident_events,
    )
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """
    One DB session per test, wrapped in a transaction that's ALWAYS
    rolled back at the end — no test can leak data into the next one,
    and nothing is ever permanently written even to the test DB.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def make_workspace(db, make_user):
    from app.models.workspace import Workspace

    def _make(owner=None, **kwargs):
        if owner is None:
            owner = make_user()

        ws = Workspace(
            id=uuid.uuid4(),
            name=kwargs.get("name", "Test Workspace"),
            owner_id=owner.id,
        )
        db.add(ws)
        db.flush()
        return ws

    return _make


@pytest.fixture
def make_upload(db):
    from app.models.data_upload import DataUpload

    def _make(workspace, **kwargs):
        upload = DataUpload(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            upload_type=kwargs.get("upload_type", "manual"),
            file_path=kwargs.get("file_path", "test.csv"),
        )
        db.add(upload)
        db.flush()
        return upload

    return _make


@pytest.fixture
def make_column_history(db):
    """
    Seeds N days of ColumnDailyMetrics history for a column —
    needed to test the baseline anomaly rule.
    """
    from app.models.column_daily_metrics import ColumnDailyMetrics

    def _make(workspace, upload, column_name, missing_percent, days_ago=1):
        row = ColumnDailyMetrics(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            upload_id=upload.id,
            column_name=column_name,
            metric_date=date.today() - timedelta(days=days_ago),
            missing_percent=missing_percent,
            unique_percent=50.0,
        )
        db.add(row)
        db.flush()
        return row

    return _make

@pytest.fixture
def client(db):
    """
    A FastAPI TestClient wired to use the test database and a fake
    authenticated user instead of real cookies/JWT. Override the fake
    user per-test by reassigning app.dependency_overrides[get_current_user].
    """
    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    test_client = TestClient(app, base_url="https://testserver")

    yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db):
    from app.models.user import User
    import uuid

    def _make(**kwargs):
        user = User(
            id=uuid.uuid4(),
            email=kwargs.get("email", f"{uuid.uuid4()}@test.com"),
            name=kwargs.get("name", "Test User"),
        )
        db.add(user)
        db.flush()
        return user

    return _make