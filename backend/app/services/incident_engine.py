from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.incidents import Incident
from app.models.data_upload import DataUpload


def _now_utc():
    return datetime.now(timezone.utc)


def _severity_for_drop(drop_percent: int) -> str:
    if drop_percent < 20:
        return "low"
    elif drop_percent <= 40:
        return "medium"
    return "high"


def _get_open_incident(
    db: Session,
    workspace_id,
    issue_type: str,
    upload_id=None,
) -> Optional[Incident]:
    q = (
        db.query(Incident)
        .filter(
            Incident.workspace_id == workspace_id,
            Incident.issue_type == issue_type,
            Incident.status == "open",
        )
    )

    if upload_id:
        q = q.filter(Incident.upload_id == upload_id)

    return q.order_by(Incident.last_seen.desc()).first()


def _create_incident(
    db: Session,
    current_upload: DataUpload,
    issue_type: str,
    severity: str,
    affected_columns: Optional[List[str]] = None,
    row_drop_percent: Optional[int] = None,
    schema_change_size: Optional[int] = None,
    missing_percent: Optional[int] = None,
    failure_reason: Optional[str] = None,
):
    now = _now_utc()

    incident = Incident(
        workspace_id=current_upload.workspace_id,
        upload_id=current_upload.id,
        trigger_file_name=current_upload.file_path,
        upload_type=current_upload.upload_type,
        issue_type=issue_type,
        severity=severity,
        status="open",
        first_seen=now,
        last_seen=now,
        row_drop_percent=row_drop_percent,
        schema_change_size=schema_change_size,
        missing_percent=missing_percent,
        affected_columns=affected_columns,
        failure_reason=failure_reason,
    )

    db.add(incident)
    return incident


def _resolve_incident(db: Session, incident: Incident):
    incident.status = "resolved"
    incident.resolved_at = _now_utc()
    incident.last_seen = _now_utc()


def incident_engine(
    db: Session,
    current_upload: DataUpload,
    previous_upload: Optional[DataUpload],
    analysis_results: dict,
):
    workspace_id = current_upload.workspace_id

    # 1) ROW DROP INCIDENT
    old_rows = analysis_results.get("previous_row_count", 0)
    new_rows = analysis_results.get("row_count", 0)

    if previous_upload and old_rows >= 100:
        drop_percent = int(round(((old_rows - new_rows) / old_rows) * 100))

        open_row_incident = _get_open_incident(
            db, workspace_id, "row_drop"
        )

        if drop_percent >= 20:
            if open_row_incident:
                open_row_incident.last_seen = _now_utc()
                open_row_incident.row_drop_percent = drop_percent
            else:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="row_drop",
                    severity=_severity_for_drop(drop_percent),
                    row_drop_percent=drop_percent,
                )

        elif drop_percent < 5 and open_row_incident:
            _resolve_incident(db, open_row_incident)

    # 2) BIG SCHEMA CHANGE
    if previous_upload is not None:
        schema_changes = analysis_results.get("schema_changes", {})
        added = schema_changes.get("added", [])
        removed = schema_changes.get("removed", [])

        changed_cols = list(set(added + removed))
        change_size = len(changed_cols)

        if change_size > 3:
            existing = _get_open_incident(
                db, workspace_id, "schema_breaking_change", current_upload.id
            )

            if not existing:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="schema_breaking_change",
                    severity="medium",
                    affected_columns=changed_cols,
                    schema_change_size=change_size,
                )

    # 3) HIGH MISSING COLUMN
    quality = analysis_results.get("quality_report", {})
    missing_map = quality.get("missing_percent_by_column", {})

    for col, pct in missing_map.items():
        if pct >= 50:
            existing = _get_open_incident(
                db, workspace_id, "high_missing_column", current_upload.id
            )

            if not existing:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="high_missing_column",
                    severity="medium",
                    affected_columns=[col],
                    missing_percent=int(round(pct)),
                )

    # 4) ALL-ZERO NUMERIC COLUMN
    zero_map = quality.get("zero_percent_by_column", {})

    for col, zero_pct in zero_map.items():
        if zero_pct >= 95:
            existing = _get_open_incident(
                db, workspace_id, "all_zero_numeric", current_upload.id
            )

            if not existing:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="all_zero_numeric",
                    severity="low",
                    affected_columns=[col],
                )
