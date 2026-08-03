"""
tests/test_feedback/test_feedback_cooldown.py

30-day cooldown enforcement tests.
All time manipulation uses freezegun so we never touch the system clock.
"""
import pytest
from datetime import datetime, timezone, timedelta
from freezegun import freeze_time
from app.api.dependencies import get_current_user


def _auth(client, app, user):
    app.dependency_overrides[get_current_user] = lambda: user


def post_feedback(client, payload):
    return client.post(
        "/api/feedback",
        json=payload,
        headers={"X-CSRF-Token": "test", "Origin": "http://localhost:5173"},
    )


GOOD_PAYLOAD = {"message": "Cooldown test message.", "feedback_type": "general"}


class TestCooldownEnforcement:

    def test_second_submission_within_30_days_blocked(self, client, make_user, app_instance, db):
        """User submits once, then immediately tries again — must be 429."""
        user = make_user()
        _auth(client, app_instance, user)

        post_feedback(client, GOOD_PAYLOAD)
        db.refresh(user)

        resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 429

    def test_cooldown_detail_contains_days_remaining(self, client, make_user, app_instance, db):
        """The 429 detail must start with COOLDOWN: so the frontend can parse days."""
        user = make_user()
        _auth(client, app_instance, user)

        post_feedback(client, GOOD_PAYLOAD)
        db.refresh(user)

        resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 429
        detail = resp.json().get("detail", "")
        assert detail.startswith("COOLDOWN:"), f"Unexpected detail: {detail}"
        days = int(detail.split(":")[1])
        assert 1 <= days <= 30

    def test_submission_allowed_exactly_at_30_day_mark(self, client, make_user, app_instance, db):
        """At T+30 days the cooldown has expired — submission must succeed."""
        user = make_user()
        _auth(client, app_instance, user)

        # First submission at T=0
        t0 = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        with freeze_time(t0):
            post_feedback(client, GOOD_PAYLOAD)
            db.refresh(user)

        # Second submission exactly 30 days later
        t30 = t0 + timedelta(days=30)
        with freeze_time(t30):
            resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 201

    def test_submission_blocked_one_day_before_cooldown_expires(self, client, make_user, app_instance, db):
        user = make_user()
        _auth(client, app_instance, user)

        t0 = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        with freeze_time(t0):
            post_feedback(client, GOOD_PAYLOAD)
            db.refresh(user)

        t29 = t0 + timedelta(days=29)
        with freeze_time(t29):
            resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 429

    def test_fresh_user_with_no_history_can_submit(self, client, make_user, app_instance):
        """User with last_feedback_at=None has no cooldown — must be 201."""
        user = make_user()
        assert user.last_feedback_at is None
        _auth(client, app_instance, user)

        resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 201

    def test_cooldown_is_per_user_not_global(self, client, make_user, app_instance, db):
        """User A being on cooldown must not affect User B."""
        user_a = make_user()
        user_b = make_user()

        # User A submits and goes into cooldown
        _auth(client, app_instance, user_a)
        post_feedback(client, GOOD_PAYLOAD)
        db.refresh(user_a)

        # User B should still be able to submit
        _auth(client, app_instance, user_b)
        resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 201

    def test_days_remaining_is_accurate(self, client, make_user, app_instance, db):
        """
        If user submitted 10 days ago, the COOLDOWN detail must report ~20 days left.
        Allow ±1 day tolerance for time boundary edge cases.
        """
        user = make_user()
        _auth(client, app_instance, user)

        t0 = datetime(2025, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
        with freeze_time(t0):
            post_feedback(client, GOOD_PAYLOAD)
            db.refresh(user)

        t10 = t0 + timedelta(days=10)
        with freeze_time(t10):
            resp = post_feedback(client, GOOD_PAYLOAD)

        assert resp.status_code == 429
        detail = resp.json()["detail"]
        days_left = int(detail.split(":")[1])
        assert 19 <= days_left <= 21, f"Expected ~20 days left, got {days_left}"