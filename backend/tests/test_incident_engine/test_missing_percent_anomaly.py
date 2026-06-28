from app.services.incident_engine import incident_engine
from app.models.incidents import Incident


def test_anomaly_skipped_when_not_enough_history(db, make_workspace, make_upload, make_column_history):
    ws = make_workspace()
    current = make_upload(ws)

    # only 3 historical points — below MIN_BASELINE_POINTS (5)
    for i in range(3):
        make_column_history(ws, make_upload(ws), "email", missing_percent=5.0, days_ago=i + 1)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 40}},
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "missing_percent_anomaly"
    ).first()

    assert incident is None  # not enough baseline history to judge


def test_anomaly_fires_on_significant_deviation(db, make_workspace, make_upload, make_column_history):
    ws = make_workspace()
    current = make_upload(ws)

    # 6 points, stable around 5% missing -> low mean, low stddev
    for i in range(6):
        make_column_history(ws, make_upload(ws), "email", missing_percent=5.0, days_ago=i + 1)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 40}},  # huge jump from 5% baseline
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "missing_percent_anomaly"
    ).first()

    assert incident is not None
    assert incident.column_name == "email"


def test_anomaly_does_not_fire_within_normal_range(db, make_workspace, make_upload, make_column_history):
    ws = make_workspace()
    current = make_upload(ws)

    # 6 points, naturally noisy around 40-50%
    for i, pct in enumerate([40, 45, 42, 48, 44, 46]):
        make_column_history(ws, make_upload(ws), "email", missing_percent=pct, days_ago=i + 1)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 47}},  # well within normal noise
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "missing_percent_anomaly"
    ).first()

    assert incident is None  # not anomalous for THIS column's own pattern


def test_anomaly_does_not_fire_on_improvement(db, make_workspace, make_upload, make_column_history):
    ws = make_workspace()
    current = make_upload(ws)

    # 6 points, stable around 50% missing
    for i in range(6):
        make_column_history(ws, make_upload(ws), "email", missing_percent=50.0, days_ago=i + 1)

    incident_engine(
        db=db, current_upload=current, previous_upload=None,
        analysis_results={
            "schema_changes": {},
            "quality_report": {"missing_percent_by_column": {"email": 5}},  # huge IMPROVEMENT
        },
    )
    db.flush()

    incident = db.query(Incident).filter(
        Incident.workspace_id == ws.id, Incident.issue_type == "missing_percent_anomaly"
    ).first()

    assert incident is None  # only flags getting WORSE, not better — by design