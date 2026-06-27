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


def _severity_for_missing(missing_percent: int) -> str:
    if missing_percent < 70:
        return "medium"
    return "high"


def _severity_for_schema_change(change_size: int) -> str:
    if change_size <= 6:
        return "medium"
    return "high"


def _get_open_incident(
    db: Session,
    workspace_id,
    issue_type: str,
    column_name: Optional[str] = None,
) -> Optional[Incident]:
    """
    Dedup key is (workspace_id, issue_type, column_name) - NOT upload_id.
    upload_id changes every run, so filtering on it meant we'd never find
    the "same" ongoing incident across uploads. workspace+type+column is
    the actual identity of an incident.
    """
    q = db.query(Incident).filter(
        Incident.workspace_id == workspace_id,
        Incident.issue_type == issue_type,
        Incident.status == "open",
    )

    if column_name is not None:
        q = q.filter(Incident.column_name == column_name)
    else:
        q = q.filter(Incident.column_name.is_(None))

    return q.order_by(Incident.last_seen.desc()).first()


def _create_incident(
    db: Session,
    current_upload: DataUpload,
    issue_type: str,
    severity: str,
    column_name: Optional[str] = None,
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
        column_name=column_name,
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
        open_row_incident = _get_open_incident(db, workspace_id, "row_drop")

        if drop_percent >= 20:
            if open_row_incident:
                open_row_incident.last_seen = _now_utc()
                open_row_incident.row_drop_percent = drop_percent
                open_row_incident.severity = _severity_for_drop(drop_percent)
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

        open_schema_incident = _get_open_incident(db, workspace_id, "schema_breaking_change")

        if change_size > 3:
            if open_schema_incident:
                open_schema_incident.last_seen = _now_utc()
                open_schema_incident.schema_change_size = change_size
                open_schema_incident.affected_columns = changed_cols
                open_schema_incident.severity = _severity_for_schema_change(change_size)
            else:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="schema_breaking_change",
                    severity=_severity_for_schema_change(change_size),
                    affected_columns=changed_cols,
                    schema_change_size=change_size,
                )
        elif change_size == 0 and open_schema_incident:
            _resolve_incident(db, open_schema_incident)

    # 3) HIGH MISSING COLUMN (per-column tracking)
    quality = analysis_results.get("quality_report", {})
    missing_map = quality.get("missing_percent_by_column", {})

    for col, pct in missing_map.items():
        pct = int(round(pct))
        existing = _get_open_incident(db, workspace_id, "high_missing_column", column_name=col)

        if pct >= 50:
            if existing:
                existing.last_seen = _now_utc()
                existing.missing_percent = pct
                existing.severity = _severity_for_missing(pct)
            else:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="high_missing_column",
                    severity=_severity_for_missing(pct),
                    column_name=col,
                    affected_columns=[col],
                    missing_percent=pct,
                )
        elif pct < 20 and existing:
            _resolve_incident(db, existing)

    # 4) ALL-ZERO NUMERIC COLUMN (per-column tracking)
    zero_map = quality.get("zero_percent_by_column", {})

    for col, zero_pct in zero_map.items():
        existing = _get_open_incident(db, workspace_id, "all_zero_numeric", column_name=col)

        if zero_pct >= 95:
            if existing:
                existing.last_seen = _now_utc()
            else:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="all_zero_numeric",
                    severity="low",
                    column_name=col,
                    affected_columns=[col],
                )
        elif zero_pct < 80 and existing:
            _resolve_incident(db, existing)