from app.services.incident_engine import incident_engine
from app.models.incidents import Incident


def test_high_missing_creates_per_column_incident(db, make_workspace, make_upload):
    ws = make_workspace()
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {
                "missing_percent_by_column": {"customer_email": 65},
            },
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id,
        Incident.issue_type == "high_missing_column",
        Incident.column_name == "customer_email",
    ).first()

    assert incident is not None
    assert incident.severity == "medium"  # 65% < 70% threshold
    assert incident.missing_percent == 65


def test_high_missing_high_severity_above_70(db, make_workspace, make_upload):
    ws = make_workspace()
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {
                "missing_percent_by_column": {"customer_email": 85},
            },
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id,
        Incident.issue_type == "high_missing_column",
        Incident.column_name == "customer_email",
    ).first()

    assert incident.severity == "high"


def test_high_missing_tracks_multiple_columns_independently(db, make_workspace, make_upload):
    ws = make_workspace()
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {
                "missing_percent_by_column": {
                    "email": 60,
                    "phone": 55,
                },
            },
        },
    )
    db.flush()

    incidents = db.query(Incident).filter(
        Incident.workspace_id == ws.id,
        Incident.issue_type == "high_missing_column",
    ).all()

    columns_flagged = {i.column_name for i in incidents}
    assert columns_flagged == {"email", "phone"}  # neither column drops the other


def test_high_missing_resolves_below_20_percent(db, make_workspace, make_upload):
    ws = make_workspace()

    u1 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u1, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 70}},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id,
        Incident.issue_type == "high_missing_column",
        Incident.column_name == "email",
    ).first()
    assert incident.status == "open"

    u2 = make_upload(ws)
    incident_engine(
        db=db, current_upload=u2, previous_upload=u1,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 10}},
        },
    )
    db.flush()
    db.refresh(incident)

    assert incident.status == "resolved"


def test_high_missing_does_not_fire_below_50_percent(db, make_workspace, make_upload):
    ws = make_workspace()
    current = make_upload(ws)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 35}},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id,
        Incident.issue_type == "high_missing_column",
        Incident.column_name == "email",
    ).first()

    assert incident is None