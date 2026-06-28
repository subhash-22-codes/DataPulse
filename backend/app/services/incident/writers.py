import logging
import threading
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.incidents import Incident
from app.models.incident_events import IncidentEvent
from app.models.data_upload import DataUpload
from app.models.notification import Notification
from app.models.workspace import Workspace
from app.models.workspace_user_settings import WorkspaceUserSettings

from app.core.email_concurrency import EMAIL_SEM
from app.services.email_service import send_incident_alert_email, convert_utc_to_ist_str

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# INCIDENT LOOKUP
# ─────────────────────────────────────────────────────────────────────────────

def _get_latest_incident(
    db: Session,
    workspace_id,
    issue_type: str,
    column_name: Optional[str] = None,
) -> Optional[Incident]:
    """
    Finds the most recent incident for this identity (workspace_id, issue_type,
    column_name) REGARDLESS of status.

    Identity is permanent; status is not. The caller decides what to do based
    on the status it finds: open -> update, resolved/ignored -> reopen,
    not found -> create.
    """
    q = db.query(Incident).filter(
        Incident.workspace_id == workspace_id,
        Incident.issue_type == issue_type,
    )

    if column_name is not None:
        q = q.filter(Incident.column_name == column_name)
    else:
        q = q.filter(Incident.column_name.is_(None))

    return q.order_by(Incident.last_seen.desc()).first()


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

def _run_incident_email_in_background(recipients: List[str], email_context: dict) -> None:
    if not EMAIL_SEM.acquire(blocking=False):
        logger.warning("[EMAIL] Skipping incident email: too many concurrent email jobs")
        return

    loop = None
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send_incident_alert_email(recipients, email_context))
    except Exception as e:
        logger.error(f"[EMAIL] Incident email failed: {e}", exc_info=True)
    finally:
        if loop:
            try:
                loop.close()
            except Exception:
                pass
        EMAIL_SEM.release()


def _notify_incident(
    db: Session,
    incident: Incident,
    current_upload: DataUpload,
    event_type: str,
) -> None:
    """
    Notifies the workspace owner + team when an incident is CREATED or
    REOPENED. Deliberately does NOT notify on "updated" (an already-open
    incident just got fresh numbers) or "resolved" (good news, low urgency,
    avoids spamming on every upload that happens to fix something).

    In-app notification is always created for created/reopened events.
    Email is sent ONLY for high severity, and only to users who have
    email_notifications_enabled for this workspace.

    Uses idempotency_key = incident_id + event_type so even if this
    accidentally runs twice for the same event, only one notification
    is created (DB-level dedup, not just in-memory).
    """
    if event_type not in ("created", "reopened"):
        return

    workspace = db.query(Workspace).filter(Workspace.id == incident.workspace_id).first()
    if not workspace:
        return

    recipients = list(workspace.team_members) + [workspace.owner]
    recipients = list({u.id: u for u in recipients}.values())  # dedupe

    ISSUE_DESCRIPTIONS = {
        "row_drop": "a significant drop in row count",
        "schema_breaking_change": "a schema change",
        "high_missing_column": "high missing values",
        "missing_percent_anomaly": "unusual missing-value activity",
        "ingestion_failure": "a failed data upload",
    }

    issue_desc = ISSUE_DESCRIPTIONS.get(incident.issue_type, incident.issue_type.replace("_", " "))
    column_part = f" in column '{incident.column_name}'" if incident.column_name else ""
    verb = "We detected" if event_type == "created" else "This issue has come back —"

    message = f"{verb} {issue_desc}{column_part} in '{workspace.name}'."
    idempotency_key = f"incident:{incident.id}:{event_type}:{current_upload.id}"

    # ── IN-APP NOTIFICATION (always, for created/reopened) ──────────────────
    for user in recipients:
        db.add(Notification(
            user_id=user.id,
            workspace_id=workspace.id,
            message=message,
            notification_type="incident",
            priority=incident.severity,
            action_url=f"/workspace/{workspace.id}/incidents",
            idempotency_key=idempotency_key,
            payload={
                "incident_id": str(incident.id),
                "issue_type": incident.issue_type,
                "column_name": incident.column_name,
                "event_type": event_type,
                "workspace_name": workspace.name,
            },
        ))

    # ── EMAIL (only HIGH severity, only opted-in users) ─────────────────────
    if incident.severity == "high":
        user_ids = [u.id for u in recipients]
        enabled_settings = db.query(WorkspaceUserSettings).filter(
            WorkspaceUserSettings.workspace_id == workspace.id,
            WorkspaceUserSettings.user_id.in_(user_ids),
            WorkspaceUserSettings.email_notifications_enabled == True,
        ).all()
        enabled_user_ids = {s.user_id for s in enabled_settings}
        email_recipients = [u.email for u in recipients if u.id in enabled_user_ids]

        if email_recipients:
            context = {
                "workspace_id": str(workspace.id),
                "workspace_name": workspace.name,
                "issue_description": issue_desc,
                "column_name": incident.column_name,
                "event_type": event_type,
                "file_name": current_upload.file_path,
                "timestamp_str": convert_utc_to_ist_str(_now_utc()),
                "row_drop_percent": incident.row_drop_percent,
                "schema_change_size": incident.schema_change_size,
                "missing_percent": incident.missing_percent,
                "affected_columns": incident.affected_columns,
            }
            threading.Thread(
                target=_run_incident_email_in_background,
                args=(email_recipients, context),
                daemon=True,
            ).start()
            logger.info(f"[INCIDENT] Email thread started for {len(email_recipients)} recipients.")


# ─────────────────────────────────────────────────────────────────────────────
# INCIDENT WRITERS — each writer also logs an IncidentEvent
# ─────────────────────────────────────────────────────────────────────────────

def _log_event(
    db: Session,
    incident: Incident,
    upload_id,
    event_type: str,
    severity: str,
    metrics: Optional[dict] = None,
) -> None:
    db.add(IncidentEvent(
        incident_id=incident.id,
        upload_id=upload_id,
        event_type=event_type,
        severity=severity,
        metrics=metrics or {},
    ))


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
) -> Incident:
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
    db.flush()  # need incident.id before logging the event

    _log_event(
        db, incident, current_upload.id, "created", severity,
        metrics={
            "row_drop_percent": row_drop_percent,
            "schema_change_size": schema_change_size,
            "missing_percent": missing_percent,
            "affected_columns": affected_columns,
        },
    )
    _notify_incident(db, incident, current_upload, "created")

    logger.info(
        f"[INCIDENT] Created | type={issue_type} | severity={severity} | "
        f"col={column_name or 'N/A'} | workspace={current_upload.workspace_id}"
    )
    return incident


def _update_incident(
    db: Session,
    incident: Incident,
    current_upload: DataUpload,
    severity: str,
    row_drop_percent: Optional[int] = None,
    schema_change_size: Optional[int] = None,
    affected_columns: Optional[List[str]] = None,
    missing_percent: Optional[int] = None,
) -> None:
    """Updates an existing open incident with fresh data from the latest upload."""
    incident.last_seen = _now_utc()
    incident.severity = severity

    if row_drop_percent is not None:
        incident.row_drop_percent = row_drop_percent
    if schema_change_size is not None:
        incident.schema_change_size = schema_change_size
    if affected_columns is not None:
        incident.affected_columns = affected_columns
    if missing_percent is not None:
        incident.missing_percent = missing_percent

    _log_event(
        db, incident, current_upload.id, "updated", severity,
        metrics={
            "row_drop_percent": row_drop_percent,
            "schema_change_size": schema_change_size,
            "missing_percent": missing_percent,
            "affected_columns": affected_columns,
        },
    )

    logger.info(
        f"[INCIDENT] Updated | type={incident.issue_type} | "
        f"severity={severity} | id={incident.id}"
    )


def _reopen_incident(
    db: Session,
    incident: Incident,
    current_upload: DataUpload,
    severity: str,
    row_drop_percent: Optional[int] = None,
    schema_change_size: Optional[int] = None,
    affected_columns: Optional[List[str]] = None,
    missing_percent: Optional[int] = None,
) -> None:
    """
    Same identity (workspace + issue_type + column), problem came back after
    it was resolved/ignored. Reopens the SAME incident row instead of
    creating a duplicate.
    """
    was_status = incident.status

    incident.status = "open"
    incident.resolved_at = None
    incident.last_seen = _now_utc()
    incident.severity = severity
    incident.upload_id = current_upload.id
    incident.trigger_file_name = current_upload.file_path

    if row_drop_percent is not None:
        incident.row_drop_percent = row_drop_percent
    if schema_change_size is not None:
        incident.schema_change_size = schema_change_size
    if affected_columns is not None:
        incident.affected_columns = affected_columns
    if missing_percent is not None:
        incident.missing_percent = missing_percent

    _log_event(
        db, incident, current_upload.id, "reopened", severity,
        metrics={
            "previous_status": was_status,
            "row_drop_percent": row_drop_percent,
            "schema_change_size": schema_change_size,
            "missing_percent": missing_percent,
            "affected_columns": affected_columns,
        },
    )
    _notify_incident(db, incident, current_upload, "reopened")

    logger.info(
        f"[INCIDENT] Reopened | type={incident.issue_type} | "
        f"id={incident.id} | was={was_status}"
    )


def _resolve_incident(
    db: Session,
    incident: Incident,
    current_upload: DataUpload,
    reason: str = "",
) -> None:
    """Auto-resolves an incident when the triggering condition is no longer met."""
    incident.status = "resolved"
    incident.resolved_at = _now_utc()
    incident.last_seen = _now_utc()

    _log_event(
        db, incident, current_upload.id, "resolved", incident.severity,
        metrics={"reason": reason},
    )

    logger.info(
        f"[INCIDENT] Auto-resolved | type={incident.issue_type} | "
        f"id={incident.id} | reason={reason}"
    )