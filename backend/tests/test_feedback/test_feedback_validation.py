"""
tests/test_feedback/test_feedback_validation.py

Input validation — everything the API must reject with 4xx.
"""
import pytest
from app.api.dependencies import get_current_user


def _auth(client, app, user):
    app.dependency_overrides[get_current_user] = lambda: user


def post_feedback(client, payload):
    return client.post(
        "/api/feedback/",
        json=payload,
        headers={"X-CSRF-Token": "test", "Origin": "http://localhost:5173"},
    )


class TestMessageValidation:

    def test_message_too_short_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "hi", "feedback_type": "general"})

        assert resp.status_code == 422

    def test_empty_message_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "", "feedback_type": "general"})

        assert resp.status_code == 422

    def test_message_too_long_rejected(self, client, make_user, app_instance):
        """501 chars — one over the 500 cap."""
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "x" * 501, "feedback_type": "general"})

        assert resp.status_code == 422

    def test_missing_message_field_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"feedback_type": "general"})

        assert resp.status_code == 422

    def test_whitespace_only_message_behaviour(self, client, make_user, app_instance):
        """
        5 spaces passes Pydantic's min_length=5 check (length=5).
        The route handler trims it and returns 422 from its own guard.
        We assert it is NOT accepted as a successful submission.
        """
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "     ", "feedback_type": "general"})

        # Must not be 201 — either Pydantic (422) or handler guard (422) rejects it
        assert resp.status_code != 201


class TestFeedbackTypeValidation:

    def test_invalid_type_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "Valid message here.", "feedback_type": "rant"})

        assert resp.status_code == 422

    def test_empty_type_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "Valid message here.", "feedback_type": ""})

        assert resp.status_code == 422

    def test_all_valid_types_accepted(self, client, make_user, app_instance):
        """bug / feature / general / praise must all pass."""
        for ftype in ("bug", "feature", "general", "praise"):
            user = make_user()
            _auth(client, app_instance, user)

            resp = post_feedback(client, {
                "message": f"Testing type {ftype}.",
                "feedback_type": ftype,
            })

            assert resp.status_code == 201, f"type '{ftype}' unexpectedly rejected"

    def test_type_case_insensitive(self, client, make_user, app_instance):
        """'BUG' should normalise to 'bug' via the validator and be accepted."""
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "Upper case type test.", "feedback_type": "BUG"})

        assert resp.status_code == 201


class TestMoodValidation:

    def test_mood_zero_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Mood boundary test.",
            "feedback_type": "general",
            "mood": 0,
        })

        assert resp.status_code == 422

    def test_mood_six_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Mood boundary test.",
            "feedback_type": "general",
            "mood": 6,
        })

        assert resp.status_code == 422

    def test_mood_negative_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Negative mood test.",
            "feedback_type": "general",
            "mood": -1,
        })

        assert resp.status_code == 422

    def test_mood_string_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "String mood test.",
            "feedback_type": "general",
            "mood": "happy",
        })

        assert resp.status_code == 422


class TestAuthValidation:

    def test_unauthenticated_request_rejected(self, client, app_instance):
        """No user override — dependency raises 401."""
        app_instance.dependency_overrides.pop(get_current_user, None)

        resp = client.post(
            "/api/feedback/",
            json={"message": "No auth test.", "feedback_type": "general"},
            headers={"X-CSRF-Token": "test", "Origin": "http://localhost:5173"},
        )

        assert resp.status_code == 401

    def test_missing_csrf_token_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = client.post(
            "/api/feedback/",
            json={"message": "No CSRF header.", "feedback_type": "general"},
            headers={"Origin": "http://localhost:5173"},
        )

        assert resp.status_code == 403

    def test_invalid_origin_rejected(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = client.post(
            "/api/feedback/",
            json={"message": "Bad origin test.", "feedback_type": "general"},
            headers={"X-CSRF-Token": "test", "Origin": "https://evil.com"},
        )

        assert resp.status_code == 403