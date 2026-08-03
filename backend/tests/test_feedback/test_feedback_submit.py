"""
tests/test_feedback/test_feedback_submit.py

Happy path + core submission tests for POST /api/feedback/
"""
import pytest
from app.api.dependencies import get_current_user


# ── Helpers ──────────────────────────────────────────────────────────────

def _auth(client, app, user):
    """Wire a user as the authenticated principal for this test."""
    app.dependency_overrides[get_current_user] = lambda: user


def post_feedback(client, payload):
    return client.post(
        "/api/feedback",
        json=payload,
        headers={"X-CSRF-Token": "test", "Origin": "http://localhost:5173"},
    )


# ── Tests ─────────────────────────────────────────────────────────────────

class TestFeedbackSubmitSuccess:

    def test_general_feedback_returns_201(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "Great product overall.", "feedback_type": "general"})

        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "success"
        assert "id" in body

    def test_bug_report_returns_201(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "CSV upload fails on row 500.",
            "feedback_type": "bug",
        })

        assert resp.status_code == 201

    def test_feature_request_returns_201(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Would love a dark mode option.",
            "feedback_type": "feature",
        })

        assert resp.status_code == 201

    def test_praise_returns_201(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "The pipeline monitor is exactly what we needed.",
            "feedback_type": "praise",
        })

        assert resp.status_code == 201

    def test_feedback_with_mood_returns_201(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Really enjoying the product so far.",
            "feedback_type": "praise",
            "mood": 1,
        })

        assert resp.status_code == 201

    def test_all_five_mood_values_accepted(self, client, make_user, app_instance):
        """Each mood value 1–5 must be accepted without error."""
        for mood_val in range(1, 6):
            user = make_user()
            _auth(client, app_instance, user)

            resp = post_feedback(client, {
                "message": "Testing mood submission.",
                "feedback_type": "general",
                "mood": mood_val,
            })

            assert resp.status_code == 201, f"mood={mood_val} rejected unexpectedly"

    def test_mood_is_optional(self, client, make_user, app_instance):
        """Omitting mood entirely is valid."""
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "No mood provided here.",
            "feedback_type": "general",
        })

        assert resp.status_code == 201

    def test_last_feedback_at_stamped_after_submit(self, client, make_user, app_instance, db):
        """After submission, last_feedback_at must be set on the user row."""
        user = make_user()
        _auth(client, app_instance, user)

        assert user.last_feedback_at is None

        post_feedback(client, {"message": "Checking timestamp stamp.", "feedback_type": "general"})
        db.refresh(user)

        assert user.last_feedback_at is not None

    def test_message_at_max_length_accepted(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "x" * 500,
            "feedback_type": "general",
        })

        assert resp.status_code == 201

    def test_message_at_min_length_accepted(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "x" * 5,
            "feedback_type": "general",
        })

        assert resp.status_code == 201