from app.services.incident_engine import incident_engine
from app.models.incidents import Incident


def test_schema_change_removal_is_high_severity(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=previous,
        analysis_results={
            "schema_changes": {"added": [], "removed": ["customer_email"]},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "schema_breaking_change"
    ).first()

    assert incident is not None
    assert incident.severity == "high"
    assert incident.affected_columns == ["customer_email"]


def test_schema_change_small_addition_is_low_severity(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=previous,
        analysis_results={
            "schema_changes": {"added": ["new_col_1"], "removed": []},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "schema_breaking_change"
    ).first()

    assert incident is not None
    assert incident.severity == "low"


def test_schema_change_large_addition_is_medium_severity(db, make_workspace, make_upload):
    ws = make_workspace()
    previous = make_upload(ws)
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=previous,
        analysis_results={
            "schema_changes": {"added": ["c1", "c2", "c3", "c4"], "removed": []},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "schema_breaking_change"
    ).first()

    assert incident is not None
    assert incident.severity == "medium"


def test_schema_change_resolves_when_stable(db, make_workspace, make_upload):
    ws = make_workspace()

    u1 = make_upload(ws)
    u2 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u2, previous_upload=u1,
        analysis_results={
            "schema_changes": {"added": [], "removed": ["col_x"]},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "schema_breaking_change"
    ).first()
    assert incident.status == "open"

    u3 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u3, previous_upload=u2,
        analysis_results={
            "schema_changes": {"added": [], "removed": []},  # no changes now
            "quality_report": {},
        },
    )
    db.flush()
    db.refresh(incident)

    assert incident.status == "resolved"


def test_schema_change_skipped_when_no_previous_upload(db, make_workspace, make_upload):
    ws = make_workspace()
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {"added": [], "removed": ["col_x"]},
            "quality_report": {},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "schema_breaking_change"
    ).first()

    assert incident is None  # rule requires a previous upload to compare against