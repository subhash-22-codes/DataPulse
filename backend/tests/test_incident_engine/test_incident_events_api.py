from app.main import app
from app.api.dependencies import get_current_user
from app.services.incident_engine import incident_engine


def _as_user(user):
    """Helper: override get_current_user to return this specific fake user."""
    app.dependency_overrides[get_current_user] = lambda: user


def test_owner_can_view_incident_events(client, db, make_user, make_workspace, make_upload):
    owner = make_user()
    ws = make_workspace(owner=owner)

    u1 = make_upload(ws)
    u2 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u2, previous_upload=u1,
        analysis_results={
            "previous_row_count": 1000, "row_count": 700,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    from app.models.incidents import Incident
    incident = db.query(Incident).filter(Incident.workspace_id == ws.id).first()

    _as_user(owner)
    response = client.get(f"/api/workspaces/{ws.id}/incidents/{incident.id}/events")

    assert response.status_code == 200
    events = response.json()
    assert len(events) == 1
    assert events[0]["event_type"] == "created"


def test_non_member_cannot_view_incident_events(client, db, make_user, make_workspace, make_upload):
    owner = make_user()
    ws = make_workspace(owner=owner)
    stranger = make_user()  # not the owner, not a team member

    u1 = make_upload(ws)
    u2 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u2, previous_upload=u1,
        analysis_results={
            "previous_row_count": 1000, "row_count": 700,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    from app.models.incidents import Incident
    incident = db.query(Incident).filter(Incident.workspace_id == ws.id).first()

    _as_user(stranger)
    response = client.get(f"/api/workspaces/{ws.id}/incidents/{incident.id}/events")

    assert response.status_code == 403


def test_incident_from_different_workspace_returns_404(client, db, make_user, make_workspace, make_upload):
    owner_a = make_user()
    ws_a = make_workspace(owner=owner_a)
    owner_b = make_user()
    ws_b = make_workspace(owner=owner_b)

    u1 = make_upload(ws_a)
    u2 = make_upload(ws_a)
    incident_engine(
        db=db, current_upload=u2, previous_upload=u1,
        analysis_results={
            "previous_row_count": 1000, "row_count": 700,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    from app.models.incidents import Incident
    incident_in_ws_a = db.query(Incident).filter(Incident.workspace_id == ws_a.id).first()

    # owner_b is authorized for ws_b, but tries to read an incident from ws_a
    _as_user(owner_b)
    response = client.get(f"/api/workspaces/{ws_b.id}/incidents/{incident_in_ws_a.id}/events")

    assert response.status_code == 404  # this is the cross-tenant leak check
    
def test_manual_resolve_logs_event(client, db, make_user, make_workspace, make_upload):
    from app.models.incidents import Incident
    from app.models.incident_events import IncidentEvent
    from app.services.incident_engine import incident_engine

    owner = make_user(name="Test Owner")
    ws = make_workspace(owner=owner)

    u1 = make_upload(ws)
    u2 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u2, previous_upload=u1,
        analysis_results={
            "previous_row_count": 1000, "row_count": 700,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(Incident.workspace_id == ws.id).first()

    _as_user(owner)
    response = client.post(
        f"/api/workspaces/{ws.id}/incidents/{incident.id}/resolve",
        headers={"X-CSRF-Token": "test-token"},
    )
    assert response.status_code == 200

    event = (
        db.query(IncidentEvent)
        .filter(IncidentEvent.incident_id == incident.id, IncidentEvent.event_type == "ignored")
        .first()
    )

    assert event is not None
    assert event.metrics["resolved_by_name"] == "Test Owner"