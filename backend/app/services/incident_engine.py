import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.data_upload import DataUpload

# Re-exported so every existing import path keeps working unchanged,
# e.g. `from app.services.incident_engine import _check_ingestion_failure`.
from app.services.incident.writers import (
    _now_utc,
    _get_latest_incident,
    _notify_incident,
    _log_event,
    _create_incident,
    _update_incident,
    _reopen_incident,
    _resolve_incident,
)
from app.services.incident.severity import (
    _severity_for_anomaly,
    _severity_for_drop,
    _severity_for_missing,
    _severity_for_schema_change,
)
from app.services.incident.rules import (
    _check_ingestion_failure,
    _check_row_drop,
    _check_schema_change,
    _check_high_missing,
    _check_missing_percent_anomaly,
)

logger = logging.getLogger(__name__)


def incident_engine(
    db: Session,
    current_upload: DataUpload,
    previous_upload: Optional[DataUpload],
    analysis_results: dict,
) -> None:
    """
    Orchestrator. Runs all detection rules in sequence.
    Each rule is independent — one failing does not block the others.
    Does NOT commit — caller commits after all rules complete.
    """
    workspace_id = current_upload.workspace_id
    logger.info(
        f"[INCIDENT] Running engine | "
        f"workspace={workspace_id} | "
        f"upload={current_upload.id} | "
        f"upload_type={current_upload.upload_type}"
    )

    latest_ingestion_failure = _get_latest_incident(db, workspace_id, "ingestion_failure")
    if latest_ingestion_failure and latest_ingestion_failure.status == "open":
        _resolve_incident(
            db, latest_ingestion_failure, current_upload,
            reason="Subsequent upload succeeded",
        )

    rules = [
        ("row_drop",                lambda: _check_row_drop(db, current_upload, previous_upload, analysis_results)),
        ("schema_change",           lambda: _check_schema_change(db, current_upload, previous_upload, analysis_results)),
        ("high_missing",            lambda: _check_high_missing(db, current_upload, analysis_results)),
        ("missing_percent_anomaly", lambda: _check_missing_percent_anomaly(db, current_upload, analysis_results)),
    ]

    for rule_name, rule_fn in rules:
        try:
            rule_fn()
        except Exception as e:
            logger.error(
                f"[INCIDENT] Rule '{rule_name}' failed — skipping | "
                f"error={e} | workspace={workspace_id}",
                exc_info=True,
            )

    logger.info(f"[INCIDENT] Engine complete | workspace={workspace_id}")