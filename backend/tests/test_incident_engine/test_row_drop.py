from app.services.incident_engine import incident_engine
from app.models.incidents import Incident


def test_row_drop_creates_incident_with_high_severity(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db,
        current_upload=current,
        previous_upload=previous,
        analysis_results={
            "previous_row_count": 1000,
            "row_count": 550,  # 45% drop -> high (>=40%)
            "schema_changes": {},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "row_drop"
    ).first()

    assert incident is not None
    assert incident.status == "open"
    assert incident.severity == "high"
    assert incident.row_drop_percent == 45


def test_row_drop_creates_incident_with_medium_severity(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db,
        current_upload=current,
        previous_upload=previous,
        analysis_results={
            "previous_row_count": 1000,
            "row_count": 700,  # 30% drop -> medium (<40%)
            "schema_changes": {},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "row_drop"
    ).first()

    assert incident is not None
    assert incident.severity == "medium"


def test_row_drop_skipped_when_baseline_too_small(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db,
        current_upload=current,
        previous_upload=previous,
        analysis_results={
            "previous_row_count": 50,  # below the 100 floor
            "row_count": 10,
            "schema_changes": {},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "row_drop"
    ).first()

    assert incident is None


def test_row_drop_reopens_same_incident_not_duplicate(db, make_workspace, make_upload):
    ws = make_workspace()

    # Upload 1 -> Upload 2: triggers the incident
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
    original_id = incident.id

    # Upload 2 -> Upload 3: recovers fully -> auto-resolves
    u3 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u3, previous_upload=u2,
        analysis_results={
            "previous_row_count": 700, "row_count": 1000,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()
    db.refresh(incident)
    assert incident.status == "resolved"

    # Upload 3 -> Upload 4: drops again -> must REOPEN same row, not create a new one
    u4 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u4, previous_upload=u3,
        analysis_results={
            "previous_row_count": 1000, "row_count": 600,
            "schema_changes": {}, "quality_report": {},
        },
    )
    db.flush()

    all_incidents = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "row_drop"
    ).all()

    assert len(all_incidents) == 1
    assert all_incidents[0].id == original_id
    assert all_incidents[0].status == "open"