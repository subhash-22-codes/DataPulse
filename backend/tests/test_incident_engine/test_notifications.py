from app.services.incident_engine import incident_engine
from app.models.incidents import Incident
from app.models.notification import Notification


def test_incident_created_sends_notification(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=previous,
        analysis_results={
            "previous_row_count": 1000, "row_count": 550,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    notifications = db.query(Notification).filter(Notification.workspace_id == ws.id).all()
    assert len(notifications) == 1
    assert notifications[0].priority == "high"


def test_incident_update_does_not_spam_notification(db, make_workspace, make_upload):
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

    # Same incident gets updated, NOT a fresh "created" event
    u3 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u3, previous_upload=u2,
        analysis_results={
            "previous_row_count": 700, "row_count": 690,  # still dropping, updates not creates
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    notifications = db.query(Notification).filter(Notification.workspace_id == ws.id).all()
    assert len(notifications) == 1  # NOT 2 — update should not notify again