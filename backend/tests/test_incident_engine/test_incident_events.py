from app.services.incident_engine import incident_engine
from app.models.incidents import Incident
from app.models.incident_events import IncidentEvent


def test_full_lifecycle_logs_correct_event_sequence(db, make_workspace, make_upload):
    ws = make_workspace()

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

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "row_drop"
    ).first()

    u3 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u3, previous_upload=u2,
        analysis_results={
            "previous_row_count": 700, "row_count": 1000,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    u4 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u4, previous_upload=u3,
        analysis_results={
            "previous_row_count": 1000, "row_count": 600,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    events = (
        db.query(IncidentEvent)
        .filter(IncidentEvent.incident_id == incident.id)
        .order_by(IncidentEvent.created_at.asc())
        .all()
    )

    event_types = [e.event_type for e in events]
    assert event_types == ["created", "resolved", "reopened"]