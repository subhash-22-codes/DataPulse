from app.services.incident_engine import _check_ingestion_failure, incident_engine
from app.models.incidents import Incident


def test_ingestion_failure_creates_incident(db, make_workspace, make_upload):
    ws = make_workspace()
    upload = make_upload(ws)

    _check_ingestion_failure(db, upload, failure_reason="Storage download failed")
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "ingestion_failure"
    ).first()

    assert incident is not None
    assert incident.severity == "high"
    assert incident.failure_reason == "Storage download failed"


def test_ingestion_failure_dedupes_instead_of_duplicating(db, make_workspace, make_upload):
    ws = make_workspace()

    upload1 = make_upload(ws)
    _check_ingestion_failure(db, upload1, failure_reason="Storage download failed")
    db.flush()

    upload2 = make_upload(ws)
    _check_ingestion_failure(db, upload2, failure_reason="Storage download failed")
    db.flush()

    all_incidents = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "ingestion_failure"
    ).all()

    assert len(all_incidents) == 1  # NOT 2 — this is the bug we just fixed


def test_ingestion_failure_clears_on_next_successful_upload(db, make_workspace, make_upload):
    ws = make_workspace()

    failed_upload = make_upload(ws)
    _check_ingestion_failure(db, failed_upload, failure_reason="CSV parse error")
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "ingestion_failure"
    ).first()
    assert incident.status == "open"

    # Next upload succeeds and runs the full engine normally
    success_upload = make_upload(ws)
    incident_engine(
        db=db, current_upload=success_upload, previous_upload=failed_upload,
        analysis_results={"schema_changes": {}, "quality_report": {}},
    )
    db.flush()
    db.refresh(incident)

    assert incident.status == "resolved"