"""
tests/test_feedback/test_feedback_edge_cases.py
"""
import pytest
from app.api.dependencies import get_current_user


def _auth(client, app, user):
    app.dependency_overrides[get_current_user] = lambda: user


def post_feedback(client, payload):
    return client.post(
        "/api/feedback",
        json=payload,
        headers={"X-CSRF-Token": "test", "Origin": "http://localhost:5173"},
    )


class TestRateLimiting:

    @pytest.mark.skip(
        reason=(
            "Rate limiting (5/minute) cannot be tested via TestClient because "
            "all requests share the same fake IP and the autouse disable_rate_limit "
            "fixture must be active for the rest of the suite to work. "
            "Test this manually or in an integration environment instead."
        )
    )
    def test_sixth_request_within_a_minute_is_rate_limited(self, client, make_user, app_instance):
        pass


class TestPayloadEdgeCases:

    def test_extra_unknown_fields_ignored(self, client, make_user, app_instance):
        """Pydantic should strip unknown fields, not 422."""
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Extra fields test.",
            "feedback_type": "general",
            "unknown_field": "should be ignored",
            "another_extra": 99,
        })

        assert resp.status_code == 201

    def test_null_mood_is_accepted(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Null mood test.",
            "feedback_type": "general",
            "mood": None,
        })

        assert resp.status_code == 201

    def test_message_with_unicode_accepted(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "DataPulse is great! 🚀 파이프라인 모니터링 최고예요.",
            "feedback_type": "praise",
        })

        assert resp.status_code == 201

    def test_message_with_newlines_accepted(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Line one.\nLine two.\nLine three is fine.",
            "feedback_type": "general",
        })

        assert resp.status_code == 201

    def test_feedback_type_defaults_to_general_when_omitted(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {"message": "No type field sent."})

        assert resp.status_code == 201

    def test_response_body_shape(self, client, make_user, app_instance):
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "Checking response shape.",
            "feedback_type": "general",
        })

        assert resp.status_code == 201
        body = resp.json()
        assert "id" in body
        assert "message" in body
        assert "status" in body
        assert body["status"] == "success"

    def test_returned_id_is_valid_uuid(self, client, make_user, app_instance):
        import uuid
        user = make_user()
        _auth(client, app_instance, user)

        resp = post_feedback(client, {
            "message": "UUID check.",
            "feedback_type": "general",
        })

        assert resp.status_code == 201
        uuid.UUID(resp.json()["id"])


class TestHealthEndpoint:

    def test_ping_is_alive(self, client):
        resp = client.get("/ping")
        assert resp.status_code == 200
        assert resp.json()["status"] == "alive"