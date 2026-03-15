import os
import uuid
import random
from datetime import datetime, timedelta, timezone
import logging
import datetime as dt
from typing import List, Optional
import asyncio
from fastapi import Query, HTTPException
from io import BytesIO
import pandas as pd
import math
import traceback
import numpy as np
import time
from fastapi.concurrency import run_in_threadpool
# FastAPI & Pydantic
from fastapi import (
    APIRouter, Depends, HTTPException, Header, UploadFile, 
    File, WebSocket, WebSocketDisconnect, Query, Response, 
    BackgroundTasks, status, Request, Path
)
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict, HttpUrl

# Database & Models
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import func, or_
from app.core.database import get_db, SessionLocal
from app.models.user import User
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.alert_rule import AlertRule
from app.services.email_service import send_delete_otp_email
from app.models.notification import Notification
from app.models.workspace_user_settings import WorkspaceUserSettings
from app.models.incidents import Incident
from app.models.table_daily_metrics import TableDailyMetrics
from app.models.column_daily_metrics import ColumnDailyMetrics
from app.services.tasks import executor
from app.services.tasks import process_csv_task
from app.services.storage_service import upload_csv_bytes
from app.services.storage_service import delete_files
from app.services.storage_service import download_file_bytes
from app.api.alerts import AlertRuleResponse 
from app.api.dependencies import get_current_user
from app.core.limiter import limiter
from app.core.connection_manager import manager
from app.services.tasks import process_data_fetch_task
from app.core.guard import send_telegram_alert
from app.services.upload_limits import enforce_upload_limit_or_raise
# --- Setup ---
logger = logging.getLogger(__name__)
APP_MODE = os.getenv("APP_MODE", "development")
MODE_LOCAL = os.getenv("MODE_LOCAL", "false").lower()

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

if APP_MODE == "production":
    logger.info("🚀 Workspaces running in PRODUCTION mode (BackgroundTasks).")
    from app.services.tasks import process_csv_task
else:
    logger.info("🚚 Workspaces running in DEVELOPMENT mode (Celery).")
    # In DEV
    try:
        import redis.asyncio as aioredis
        from app.services.celery_worker import celery_app
    except ImportError as e:
        logger.warning(f"⚠️ Dev dependencies missing: {e}. Celery tasks may fail.")
        celery_app = None


# =========
#  Schemas 
# =========
class WorkspaceCreate(BaseModel):
    name: str

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str | None = None
    email: EmailStr
    
    model_config = ConfigDict(from_attributes=True)
        
class OwnerResponse(BaseModel):
    name: str | None = None
    email: EmailStr
    
    model_config = ConfigDict(from_attributes=True)

class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    data_source: str | None = None
    created_at: Optional[datetime] = None
    owner_id: uuid.UUID
    owner: OwnerResponse
    team_members: List[UserResponse] = []
    
    api_url: str | None = None 
    polling_interval: str | None = None
    is_polling_active: bool | None = None
    tracked_column: str | None = None
    description_last_updated_at: datetime | None = None
    
    api_header_name: str | None = None
    
    db_type: str | None = None
    db_host: str | None = None
    db_port: int | None = None
    db_user: str | None = None
    db_name: str | None = None
    db_query: str | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class WorkspaceUpdate(BaseModel):
    description: str | None = None
    team_member_emails: List[EmailStr] | None = None
    data_source: str | None = None
    
    api_url: HttpUrl | None = None 
    
    polling_interval: str | None = None
    is_polling_active: bool | None = None 
    tracked_column: str | None = None
    
    # Auth Fields
    api_header_name: str | None = None
    api_header_value: str | None = None
    
    db_type: str | None = None
    db_host: str | None = None
    db_port: int | None = None
    db_user: str | None = None
    db_password: str | None = None
    db_name: str | None = None
    db_query: str | None = None
    
    @field_validator('team_member_emails')
    def validate_email_count(cls, v):
        if v is not None and len(v) > 2:
            raise ValueError('You can add up to 2 team members only.')
        return v
    
    @field_validator('description')
    def description_length(cls, v):
        if v is not None and len(v) > 500:
            raise ValueError('Description cannot be longer than 500 characters.')
        return v
    
    @field_validator('api_url', mode='before')
    def parse_url_to_str(cls, v):
        if v == "": return None
        return v
    
class WorkspaceNotificationSettingOut(BaseModel):
    used_id: uuid.UUID
    name: str
    email: EmailStr
    email_notifications_enabled: bool


class NotificationUpdate(BaseModel):
    email_notifications_enabled: bool

class DataUploadResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    file_path: str
    uploaded_at: Optional[datetime] = None
    upload_type: str 
    schema_info: dict | None = None
    analysis_results: dict | None = None
    schema_changed_from_previous: bool = False
    
    model_config = ConfigDict(from_attributes=True)
    
class TaskResponse(BaseModel):
    task_id: str
    message: str
    
class TrendDataPoint(BaseModel):
    date: Optional[datetime] = None
    value: float | None = None

class TrendResponse(BaseModel):
    column_name: str
    data: List[TrendDataPoint]
    
class DeleteConfirmation(BaseModel):
    otp: str
# ==========================
#  Routes
# ==========================
@router.post("/", response_model=WorkspaceResponse)
@limiter.limit("5/minute")
def create_workspace(
    request: Request,
    workspace: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    existing_name = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id,
        Workspace.name == workspace.name,
        Workspace.is_deleted == False
    ).first()

    if existing_name:
        raise HTTPException(
            status_code=400, 
            detail=f"You already have a workspace named '{workspace.name}'."
            )
 
    active_workspace_count = db.query(func.count(Workspace.id)).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False  
    ).scalar()
    
    if active_workspace_count >= 3:
        raise HTTPException(
            status_code=429,
            detail="Active workspace limit reached. Delete or archive an existing workspace to create a new one."
        )

    new_ws = Workspace(name=workspace.name, owner_id=current_user.id)
    db.add(new_ws)
    db.commit()
    db.refresh(new_ws)
    return new_ws

@router.get("/", response_model=List[WorkspaceResponse])
def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspaces = db.query(Workspace).options(
        joinedload(Workspace.team_members),
        joinedload(Workspace.owner)
    ).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).all()
    
    return workspaces

@router.get("/trash", response_model=List[WorkspaceResponse]) 
def get_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Workspace).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True  
    ).all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    workspace = db.query(Workspace).options(
        joinedload(Workspace.team_members),
        joinedload(Workspace.owner)
    ).filter(
        Workspace.id == ws_uuid,
        Workspace.is_deleted == False
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    is_owner = workspace.owner_id == current_user.id
    
    is_member = current_user in workspace.team_members
    
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
        
    return workspace

@router.put("/{workspace_id}", response_model=WorkspaceResponse)
@limiter.limit("10/minute")
async def update_workspace(
    request: Request,
    workspace_id: str,
    workspace_update: WorkspaceUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    db_workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if db_workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = workspace_update.model_dump(exclude_unset=True)
    logger.info(
        f"[WS UPDATE] Incoming update | ws={workspace_id} | fields={list(update_data.keys())}"
    )


    data_source_fields = {
        "data_source",
        "api_url",
        "api_header_name",
        "api_header_value",
        "db_host",
        "db_port",
        "db_user",
        "db_password",
        "db_name",
        "db_query",
        "polling_interval",
    }

    SENSITIVE_FIELDS = {
        "db_password",
        "api_header_value",
    }


    config_changed = False

    for field in data_source_fields:
        if field not in update_data:
            continue

        if field in SENSITIVE_FIELDS:
            if update_data[field]:
                config_changed = True
                break
            else:
                continue

        old_value = getattr(db_workspace, field)
        new_value = update_data[field]

        if old_value != new_value:
            config_changed = True
            break
    logger.info(
        f"[WS UPDATE] Config change detected={config_changed} | ws={workspace_id}"
    )

    if "data_source" in update_data:
        new_source = update_data["data_source"]

        db_fields = ["db_host", "db_port", "db_user", "db_password", "db_name", "db_query"]
        api_fields = ["api_url", "api_header_name", "api_header_value"]

        if new_source == "API":
            for f in db_fields:
                setattr(db_workspace, f, None)

        elif new_source == "DB":
            for f in api_fields:
                setattr(db_workspace, f, None)

        elif new_source == "CSV":
            for f in db_fields + api_fields:
                setattr(db_workspace, f, None)
            db_workspace.is_polling_active = False

    if "description" in update_data:
        db_workspace.description_last_updated_at = dt.datetime.now(dt.timezone.utc)

    if "team_member_emails" in update_data:
        emails: list[str] = update_data.pop("team_member_emails")

        valid_users = db.query(User).filter(
            User.email.in_(emails),
            User.is_verified == True,
        ).all()

        verified_emails = {u.email for u in valid_users}

        for email in emails:
            if email == current_user.email:
                raise HTTPException(status_code=400, detail="Owner already included")

            if email not in verified_emails:
                user_record = db.query(User).filter(User.email == email).first()
                if not user_record:
                    raise HTTPException(status_code=404, detail=f"User '{email}' not found")
                raise HTTPException(status_code=403, detail=f"User '{email}' not verified")

        final_members = [u for u in valid_users if u.id != current_user.id]

        old_members = {u.id for u in db_workspace.team_members}
        new_members = {u.id for u in final_members}
        
        db_workspace.team_members = final_members
        
        added_user_ids = new_members - old_members
        removed_user_ids = old_members - new_members

        actor_name = current_user.name or current_user.email
        ws_name = db_workspace.name

        try:
            # Build lookup map from already-loaded objects (ZERO extra DB queries)
            final_members_map = {u.id: u for u in final_members}

            # Notify ADDED users (no extra DB hit)
            for user_id in added_user_ids:
                user = final_members_map.get(user_id)
                if not user or user.id == current_user.id:
                    continue

                notif = Notification(
                    user_id=user.id,
                    workspace_id=db_workspace.id,
                    message=f"You’ve been added to the workspace \"{ws_name}\" by {actor_name}.",
                    notification_type="team_update",
                    priority="info",
                    action_url=f"/workspaces/{db_workspace.id}",
                    payload={
                        "event": "team_added",
                        "workspace_name": ws_name,
                        "added_by": actor_name,
                    },
                    idempotency_key=f"team_added:{db_workspace.id}:{user.id}",
                )
                db.add(notif)

            # Notify REMOVED users (one clean query, acceptable)
            if removed_user_ids:
                removed_users = db.query(User).filter(User.id.in_(removed_user_ids)).all()

                for user in removed_users:
                    if user.id == current_user.id:
                        continue

                    notif = Notification(
                        user_id=user.id,
                        workspace_id=db_workspace.id,
                        message=f"You’ve been removed from \"{ws_name}\" by {actor_name}.",
                        notification_type="team_update",
                        priority="info",
                        payload={
                            "event": "team_removed",
                            "workspace_name": ws_name,
                            "removed_by": actor_name,
                        },
                        idempotency_key=f"team_removed:{db_workspace.id}:{user.id}",
                    )
                    db.add(notif)

        except Exception as notif_err:
            logger.error(f"[TEAM NOTIFY] Failed: {notif_err}", exc_info=True)

        # Reuse computed diff (cleaner)
        for user_id in added_user_ids:
            db.add(
                WorkspaceUserSettings(
                    workspace_id=db_workspace.id,
                    user_id=user_id,
                )
            )

        if removed_user_ids:
            db.query(WorkspaceUserSettings).filter(
                WorkspaceUserSettings.workspace_id == db_workspace.id,
                WorkspaceUserSettings.user_id.in_(removed_user_ids),
            ).delete(synchronize_session=False)

    for key, value in update_data.items():
        if key == "is_polling_active":
            continue 
        if key == "api_url" and value is not None:
            value = str(value)
        setattr(db_workspace, key, value)


    user_toggled_on = update_data.get("is_polling_active") is True

    if "is_polling_active" in update_data:
        db_workspace.is_polling_active = update_data["is_polling_active"]
    logger.info(
        f"[WS UPDATE] Toggle intent={update_data.get('is_polling_active', 'NOT_SENT')} "
        f"| final_is_polling_active={db_workspace.is_polling_active} "
        f"| ws={workspace_id}"
    )

    if config_changed:
        db_workspace.failure_count = 0
        db_workspace.last_failure_reason = None
        db_workspace.auto_disabled_at = None


    owner_settings = db.query(WorkspaceUserSettings).filter(
        WorkspaceUserSettings.workspace_id == db_workspace.id,
        WorkspaceUserSettings.user_id == db_workspace.owner_id,
    ).first()

    if not owner_settings:
        db.add(
            WorkspaceUserSettings(
                workspace_id=db_workspace.id,
                user_id=db_workspace.owner_id,
            )
        )

    db.commit()
    db.refresh(db_workspace)


    explicit_toggle_on = user_toggled_on
    should_run_now = (
        db_workspace.is_polling_active
        and (
            explicit_toggle_on  
            or config_changed  
            or db_workspace.last_polled_at is None 
        )
    )
    logger.info(
        f"[WS UPDATE] Decision | ws={workspace_id} | "
        f"should_run_now={should_run_now} | "
        f"explicit_toggle_on={explicit_toggle_on} | "
        f"config_changed={config_changed} | "
        f"last_polled_at={db_workspace.last_polled_at} | "
        f"polling_active={db_workspace.is_polling_active}"
    )

    if should_run_now:
        logger.info(f"[WS UPDATE] 🚀 Triggering immediate validation run | ws={workspace_id}")
        current_loop = asyncio.get_running_loop()
        executor.submit(process_data_fetch_task, str(db_workspace.id), current_loop)
    
    if user_toggled_on and background_tasks:
        background_tasks.add_task(
            send_telegram_alert,
            f"BLUE ALERT: Workspace Updated\n"
            f"Name: {db_workspace.name}\n"
            f"User: {current_user.email}\n"
            f"Config Changed: {config_changed}",
        )

    return db_workspace


@router.get("/{workspace_id}/notification-settings")
@limiter.limit("60/minute")
async def get_notification_settings(
    request: Request,
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(400, "Invalid workspace ID")

    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid
    ).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    # --- membership check ---
    is_member = (
        current_user.id == workspace.owner_id
        or current_user in workspace.team_members
    )

    if not is_member:
        raise HTTPException(403, "Not part of this workspace")

    members = workspace.team_members + [workspace.owner]

    settings = db.query(WorkspaceUserSettings).filter(
        WorkspaceUserSettings.workspace_id == ws_uuid
    ).all()

    settings_map = {s.user_id: s for s in settings}

    result = []

    for user in members:
        setting = settings_map.get(user.id)

        result.append({
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "email_notifications_enabled":
                setting.email_notifications_enabled if setting else True,
        })

    return result


@router.patch("/{workspace_id}/notification-settings")
@limiter.limit("20/minute")
async def update_notification_setting(
    request: Request,
    workspace_id: str,
    payload: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(400, "Invalid workspace ID")

    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid
    ).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    # --- membership check ---
    is_member = (
        current_user.id == workspace.owner_id
        or current_user in workspace.team_members
    )

    if not is_member:
        raise HTTPException(403, "Not part of this workspace")

    setting = db.query(WorkspaceUserSettings).filter(
        WorkspaceUserSettings.workspace_id == ws_uuid,
        WorkspaceUserSettings.user_id == current_user.id,
    ).first()

    if not setting:
        setting = WorkspaceUserSettings(
            workspace_id=ws_uuid,
            user_id=current_user.id,
        )
        db.add(setting)

    setting.email_notifications_enabled = payload.email_notifications_enabled

    db.commit()

    return {"status": "updated"}


@router.get("/team/", response_model=List[WorkspaceResponse])
def get_team_workspaces(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return db.query(Workspace).options(
        joinedload(Workspace.team_members),
        joinedload(Workspace.owner)
    ).filter(
        Workspace.team_members.any(User.id == current_user.id),
        Workspace.is_deleted == False
    ).all()


@router.post("/{workspace_id}/upload-csv", response_model=TaskResponse)
@limiter.limit("5/minute")
async def upload_csv_for_workspace(
    request: Request,
    workspace_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    start_time = time.time()
    logger.info(f"[CSV_UPLOAD] Request received | workspace_id={workspace_id} | filename={file.filename}")

    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        logger.warning(f"[CSV_UPLOAD] Invalid workspace ID format | workspace_id={workspace_id}")
        raise HTTPException(status_code=400, detail="Invalid workspace ID format")

    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        logger.warning(f"[CSV_UPLOAD] Workspace not found | workspace_id={workspace_id}")
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.owner_id != current_user.id:
        logger.warning(
            f"[CSV_UPLOAD] Unauthorized upload attempt | workspace_id={workspace_id} | user_id={current_user.id}"
        )
        raise HTTPException(status_code=403, detail="Only the workspace owner can upload files")

    enforce_upload_limit_or_raise(db, workspace.id)

    if MODE_LOCAL == "true":
        MAX_FILE_SIZE = 50 * 1024 * 1024
    else:
        MAX_FILE_SIZE = 15 * 1024 * 1024

    read_start = time.time()

    try:
        file_bytes = await file.read(MAX_FILE_SIZE + 1)

        if len(file_bytes) > MAX_FILE_SIZE:
            await file.close()
            logger.warning(
                f"[CSV_UPLOAD] File too large | workspace_id={workspace_id} | size={len(file_bytes)}"
            )
            raise HTTPException(status_code=413, detail="File too large. Maximum limit is 15MB.")

    except Exception as e:
        logger.error(f"[CSV_UPLOAD] Failed to read uploaded file | error={str(e)}")
        raise HTTPException(status_code=400, detail="Could not read uploaded file")

    logger.info(
        f"[CSV_UPLOAD] File received | size_bytes={len(file_bytes)} | read_time={time.time() - read_start:.2f}s"
    )

    new_upload = DataUpload(
        workspace_id=workspace.id,
        file_path=file.filename,
        file_content=None,
        upload_type="manual",
        file_size_bytes=len(file_bytes),
    )

    db.add(new_upload)
    db.flush()

    storage_path = f"workspaces/{workspace.id}/uploads/{new_upload.id}.csv"

    upload_start = time.time()

    try:
        # This runs the blocking Supabase upload in a threadpool
        await run_in_threadpool(upload_csv_bytes, storage_path, file_bytes)

    except Exception as e:
        traceback.print_exc()
        logger.error(
            f"[CSV_UPLOAD] Storage upload failed | upload_id={new_upload.id} | error={str(e)}"
        )
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    logger.info(
        f"[CSV_UPLOAD] Storage upload completed | upload_id={new_upload.id} | duration={time.time() - upload_start:.2f}s"
    )

    new_upload.storage_path = storage_path
    new_upload.file_url = None

    workspace.data_source = "CSV"
    workspace.is_polling_active = False

    db.commit()
    db.refresh(new_upload)

    logger.info(
        f"[CSV_UPLOAD] Upload record committed | upload_id={new_upload.id} | workspace_id={workspace.id}"
    )

    task_id = str(new_upload.id)

    if APP_MODE == "production":
        loop = asyncio.get_event_loop()
        background_tasks.add_task(process_csv_task, task_id, loop)
        logger.info(f"[CSV_UPLOAD] Background task scheduled | upload_id={task_id}")
    else:
        if celery_app:
            task = celery_app.send_task("process_csv_task", args=[task_id])
            task_id = task.id
            logger.info(f"[CSV_UPLOAD] Celery task dispatched | celery_task_id={task_id}")

    logger.info(
        f"[CSV_UPLOAD] Pipeline finished | upload_id={new_upload.id} | total_time={time.time() - start_time:.2f}s"
    )

    return {
        "task_id": task_id,
        "message": "File upload successful, processing started."
    }


@router.get("/{workspace_id}/uploads", response_model=List[DataUploadResponse])
def get_workspace_uploads(
    workspace_id: str,
    upload_type: Optional[str] = None,
    limit: int = 50, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace = get_workspace(workspace_id, current_user, db)
    limit = min(limit, 100)
    query = db.query(DataUpload).options(
        defer(DataUpload.file_content)
    ).filter(
        DataUpload.workspace_id == workspace.id
    )
    if upload_type:
        query = query.filter(DataUpload.upload_type == upload_type)

    uploads = query.order_by(DataUpload.uploaded_at.desc()).limit(limit).all()
    
    return uploads

@router.get("/{workspace_id}/schema")
def get_workspace_schema(
    workspace_id: str, 
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    ws = get_workspace(workspace_id, user, db)


    schema_data = db.query(DataUpload.schema_info).filter(
        DataUpload.workspace_id == ws.id
    ).order_by(DataUpload.uploaded_at.desc()).first()

    if not schema_data or not schema_data[0]:
        return {"schema": {}, "has_data": False}

    return {"schema": schema_data[0], "has_data": True}


@router.get("/{workspace_id}/uploads/count")
def get_workspace_upload_count(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace = get_workspace(workspace_id, current_user, db)

    upload_count = db.query(DataUpload).filter(
        DataUpload.workspace_id == workspace.id
    ).count()

    return {
        "count": upload_count
    }


@router.get("/{workspace_id}/trend", response_model=TrendResponse)
def get_trend_data(
    workspace_id: str,
    column_name: str = Query(..., description="The name of the column to get trend data for"),
    upload_type: str = Query(..., description="The type of upload to analyze ('manual' or 'api_poll')"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    workspace = get_workspace(workspace_id, current_user, db)

    results = db.query(
        DataUpload.uploaded_at, 
        DataUpload.analysis_results
    ).filter(
        DataUpload.workspace_id == workspace.id,
        DataUpload.upload_type == upload_type
    ).order_by(
        DataUpload.uploaded_at.asc()
    ).all()

    trend_data = []
    
    for uploaded_at, stats in results:
        if uploaded_at is None:
            continue

        value = None
        if stats:
            try:
                summary = stats.get("summary_stats", {})
                col_stats = summary.get(column_name, {})
                
                raw_value = col_stats.get("mean")
                
                if raw_value is not None:
                    value = float(raw_value)
                    
            except (AttributeError, TypeError, ValueError):
                pass

        if value is not None:
            trend_data.append(TrendDataPoint(date=uploaded_at, value=value))

    return TrendResponse(column_name=column_name, data=trend_data)


@router.websocket("/{workspace_id}/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    workspace_id: str, 
    client_id: str
):
    db = SessionLocal() 
    user_id_str = None

    try:
        # Mock request for auth
        mock_scope = websocket.scope.copy()
        mock_scope["type"] = "http"
        mock_scope["method"] = "GET"
        
        from fastapi import Request
        mock_request = Request(mock_scope)
        
        # Authenticate
        from app.api.dependencies import get_current_user
        user = get_current_user(mock_request, db)
        user_id_str = str(user.id)
        
    except Exception as e:
        logger.warning(f"WS authentication failed: {e}")
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass 
        db.close()
        return
    db.close() 

    await websocket.accept()
    await manager.connect('workspace', workspace_id, websocket)
    await manager.connect('user', user_id_str, websocket)
    
    logger.info(f"WS Connected: User {user_id_str} -> Workspace {workspace_id} (Client {client_id})")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info(f"WS Disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WS Error {client_id}: {e}", exc_info=True)
    finally:
        if user_id_str:
            manager.disconnect('workspace', workspace_id, websocket)
            manager.disconnect('user', user_id_str, websocket)
            


@router.post("/{workspace_id}/request-delete-otp", status_code=200)
@limiter.limit("3/minute")
async def request_delete_otp(
    request: Request,
    workspace_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
  
    OTP_DURATION_MINUTES = 10
    COOLDOWN_SECONDS = 60
    
    now = datetime.now(timezone.utc)
    
    if current_user.delete_confirmation_expiry:
        time_until_expiry = (current_user.delete_confirmation_expiry - now).total_seconds()

        if time_until_expiry > (OTP_DURATION_MINUTES * 60 - COOLDOWN_SECONDS):
            retry_after = int(time_until_expiry - (OTP_DURATION_MINUTES * 60 - COOLDOWN_SECONDS))
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {retry_after} seconds before requesting a new code."
            )

    ws_uuid = uuid.UUID(workspace_id)
    
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied.")

    otp = f"{random.randint(100000, 999999)}"
    
    current_user.delete_confirmation_otp = otp
    current_user.delete_confirmation_expiry = now + timedelta(minutes=OTP_DURATION_MINUTES)
    db.commit()

    await send_delete_otp_email(current_user.email, otp, workspace.name)
    
    return {"message": "OTP sent to your email."}


@router.delete("/{workspace_id}/confirm", status_code=204)
@limiter.limit("5/minute")
async def confirm_delete_workspace(
    request: Request,
    workspace_id: str,
    payload: DeleteConfirmation,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)

    # OTP validation
    if (
        not current_user.delete_confirmation_otp
        or current_user.delete_confirmation_otp != payload.otp
    ):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    if (
        not current_user.delete_confirmation_expiry
        or now > current_user.delete_confirmation_expiry
    ):
        raise HTTPException(status_code=400, detail="Verification code has expired.")

    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    members = list(workspace.team_members) if workspace.team_members else []
    owner_email = current_user.email
    ws_name = workspace.name

    workspace.is_deleted = True
    workspace.deleted_at = now

    for member in members:
        team_note = Notification(
            user_id=member.id,
            workspace_id=workspace.id,
            message=f"Workspace \"{ws_name}\" was deleted by the workspace owner {current_user.name} ({owner_email}). Access to this workspace is no longer available.",
            ai_insight="All datasets, uploads, and analytics access under this workspace are now unavailable.",
            notification_type="system",
            priority="info",
            idempotency_key=f"workspace_deleted:{workspace.id}:{member.id}",
            payload={
                "event": "workspace_deleted",
                "workspace_id": str(workspace.id),
                "workspace_name": ws_name,
                "actor_email": owner_email,
                "members_affected": len(members)
            }
        )
        db.add(team_note)

    owner_note = Notification(
        user_id=current_user.id,
        workspace_id=workspace.id,
        message=f"You deleted the workspace \"{ws_name}\". It has been moved to Trash and can be restored within 30 days.",
        ai_insight="The workspace has been moved to Trash and can be restored within 30 days before permanent deletion.",
        notification_type="system",
        priority="info",
        action_url="/trash",
        idempotency_key=f"workspace_delete_owner:{workspace.id}:{current_user.id}",
        payload={
            "event": "workspace_deleted",
            "workspace_id": str(workspace.id),
            "workspace_name": ws_name,
            "deleted_at": now.isoformat(),
            "members_affected": len(members)
        }
    )
    db.add(owner_note)

    current_user.delete_confirmation_otp = None
    current_user.delete_confirmation_expiry = None

    db.commit()

    background_tasks.add_task(
        send_telegram_alert,
        f"WORKSPACE SOFT DELETE\n"
        f"Owner: {owner_email}\n"
        f"Workspace: {ws_name}\n"
        f"Workspace ID: {workspace_id}\n"
        f"Members Affected: {len(members)}\n"
        f"Deleted At (UTC): {now.isoformat()}"
    )

    return

@router.post("/{workspace_id}/restore", status_code=200)
@limiter.limit("3/minute")
def restore_workspace(
    request: Request,
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found in trash.")

    active_count = db.query(func.count(Workspace.id)).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).scalar()

    if active_count >= 3:
        raise HTTPException(
            status_code=429,
            detail="Cannot restore. You already have 3 active workspaces. Delete one permanently to free up a slot."
        )

    members = list(workspace.team_members) if workspace.team_members else []
    ws_name = workspace.name
    owner_email = current_user.email
    now = datetime.now(timezone.utc)

    workspace.is_deleted = False
    workspace.deleted_at = None

    for member in members:
        team_note = Notification(
            user_id=member.id,
            workspace_id=workspace.id,
            message=f"Workspace \"{ws_name}\" has been restored by the workspace owner ({owner_email}).",
            ai_insight="Access to datasets and analytics in this workspace is now available again.",
            notification_type="system",
            priority="info",
            action_url=f"/workspace/{workspace.id}",
            idempotency_key=f"workspace_restored:{workspace.id}:{member.id}",
            payload={
                "event": "workspace_restored",
                "workspace_id": str(workspace.id),
                "workspace_name": ws_name,
                "actor_email": owner_email,
                "members_restored": len(members),
                "restored_at": now.isoformat()
            }
        )
        db.add(team_note)

    owner_note = Notification(
        user_id=current_user.id,
        workspace_id=workspace.id,
        message=f"You restored the workspace \"{ws_name}\".",
        ai_insight="The workspace and all team access have been reinstated.",
        notification_type="system",
        priority="info",
        action_url=f"/workspace/{workspace.id}",
        idempotency_key=f"workspace_restored_owner:{workspace.id}:{current_user.id}",
        payload={
            "event": "workspace_restored",
            "workspace_id": str(workspace.id),
            "workspace_name": ws_name,
            "restored_at": now.isoformat(),
            "members_restored": len(members)
        }
    )
    db.add(owner_note)

    db.commit()

    return {"message": "Workspace restored successfully"}


@router.delete("/{workspace_id}/permanently", status_code=204)
def delete_workspace_permanently(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found in trash")

    uploads = db.query(DataUpload).filter(DataUpload.workspace_id == workspace.id).all()
    paths = [u.storage_path for u in uploads if u.storage_path]

    try:
        delete_files(paths)
    except Exception:
        pass

    db.delete(workspace)
    db.commit()

    return  #204

@router.get("/{workspace_id}/alerts", response_model=List[AlertRuleResponse])
def get_workspace_alerts(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Security Check (Uses our optimized get_workspace)
    workspace = get_workspace(workspace_id, current_user, db)

    # 2. Optimized Query: Filter by workspace and active status
    rules = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id
    ).all()

    return rules

@router.get("/{workspace_id}/alerts/count")
def get_workspace_alert_count(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security: ensure user has access to workspace
    workspace = get_workspace(workspace_id, current_user, db)

    # Efficient aggregate query
    alert_count = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id
    ).count()

    return {
        "count": alert_count
    }


# --- NEW: Trigger Manual Poll ---
@router.post("/{workspace_id}/trigger-poll")
async def trigger_manual_poll(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    logger.info(f"Manual poll triggered for workspace {workspace_id}")
    
    # 1. Security & Existence Check
    workspace = get_workspace(workspace_id, current_user, db)
    
    # 2. Validation
    if not workspace.is_polling_active:
        return {"message": "Polling is not active for this workspace."}
        
    # 3. Task Dispatch
    if workspace.data_source == 'API' and workspace.api_url:
        from app.services.tasks import fetch_api_data
        
        background_tasks.add_task(fetch_api_data, str(workspace.id))
        return {"message": "Polling triggered successfully (API)."}
        
    elif workspace.data_source == 'DB' and workspace.db_host:
        from app.services.tasks import fetch_db_data
        
        background_tasks.add_task(fetch_db_data, str(workspace.id))
        return {"message": "Polling triggered successfully (DB)."}
        
    return {"message": "No valid data source configured for polling."}

@router.post("/{workspace_id}/incidents/{incident_id}/resolve")
def manual_resolve_incident(
    workspace_id: str = Path(...),
    incident_id: str = Path(...),
    db: Session = Depends(get_db),
):
    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id,
            Incident.workspace_id == workspace_id,
        )
        .first()
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "ignored"
    incident.resolved_at = datetime.now(timezone.utc)
    incident.last_seen = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    return {
        "id": str(incident.id),
        "status": incident.status,
        "resolved_at": incident.resolved_at,
    }

@router.get("/{workspace_id}/incidents")
def list_incidents(workspace_id: str, db: Session = Depends(get_db)):
    incidents = (
        db.query(Incident)
        .filter(Incident.workspace_id == workspace_id)
        .order_by(Incident.last_seen.desc())
        .all()
    )

    return [
        {
            "id": str(i.id),
            "issue_type": i.issue_type,
            "severity": i.severity,
            "status": i.status,
            "trigger_file_name": i.trigger_file_name,
            "upload_type": i.upload_type,
            "first_seen": i.first_seen,
            "last_seen": i.last_seen,
            "resolved_at": i.resolved_at,
            "row_drop_percent": i.row_drop_percent,
            "schema_change_size": i.schema_change_size,
            "missing_percent": i.missing_percent,
            "affected_columns": i.affected_columns,
            "failure_reason": i.failure_reason,
        }
        for i in incidents
    ]


@router.get("/{workspace_id}/column-metrics")
def get_column_metrics(
    workspace_id: str,
    column_name: str,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ColumnDailyMetrics)
        .filter(
            ColumnDailyMetrics.workspace_id == workspace_id,
            ColumnDailyMetrics.column_name == column_name,
        )
        .order_by(ColumnDailyMetrics.metric_date.asc())
        .all()
    )

    return [
        {
            "date": r.created_at,
            "column": r.column_name,
            "missing_percent": r.missing_percent,
            "unique_percent": r.unique_percent,
        }
        for r in rows
    ]

@router.get("/{workspace_id}/table-metrics")
def get_table_metrics(workspace_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(TableDailyMetrics)
        .filter(TableDailyMetrics.workspace_id == workspace_id)
        .order_by(TableDailyMetrics.metric_date.asc())
        .all()
    )

    return [
        {
            "metric_date": r.created_at,
            "row_count": r.row_count,
            "column_count": r.column_count,
        }
        for r in rows
    ]

@router.get("/{workspace_id}/columns")
def list_columns(workspace_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(ColumnDailyMetrics.column_name)
        .filter(ColumnDailyMetrics.workspace_id == workspace_id)
        .distinct()
        .all()
    )

    return [r[0] for r in rows]

def _load_upload_dataframe(
    workspace_id: str,
    upload_id: str,
    current_user: User,
    db: Session,
) -> pd.DataFrame:

    workspace = get_workspace(workspace_id, current_user, db)

    upload = (
        db.query(DataUpload)
        .filter(
            DataUpload.id == upload_id,
            DataUpload.workspace_id == workspace.id,
        )
        .first()
    )

    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    if not upload.storage_path:
        raise HTTPException(status_code=400, detail="No stored file available")

    try:
        csv_bytes = download_file_bytes(upload.storage_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to download file")

    MAX_ROWS = 1000000

    try:
        df = pd.read_csv(BytesIO(csv_bytes), nrows=MAX_ROWS + 1)
        if len(df) > MAX_ROWS:
            df = df.head(MAX_ROWS)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse CSV")

    return df

def _sanitize_value(value):
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    if isinstance(value, (np.floating, np.integer)):
        return value.item()
    return value


def _paginate_dataframe(df: pd.DataFrame, limit: int, offset: int):
    total = len(df)
    paginated = df.iloc[offset: offset + limit]

    rows = []
    for idx, row in paginated.iterrows():
        clean_row = {}
        for key, value in row.to_dict().items():
            clean_row[key] = _sanitize_value(value)

        clean_row["row_index"] = int(idx)
        rows.append(clean_row)

    return total, rows

@router.get("/{workspace_id}/uploads/{upload_id}/issues/missing")
@limiter.limit("20/minute")
def get_missing_rows(
    request: Request,
    workspace_id: str,
    upload_id: str,
    column: str = Query(...),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    df = _load_upload_dataframe(workspace_id, upload_id, current_user, db)

    if column not in df.columns:
        raise HTTPException(status_code=400, detail="Invalid column name")

    missing_df = df[df[column].isna()]

    total, rows = _paginate_dataframe(missing_df, limit, offset)

    return {
        "column": column,
        "total_missing_rows": total,
        "limit": limit,
        "offset": offset,
        "rows": rows,
    }

@router.get("/{workspace_id}/uploads/{upload_id}/issues/duplicates")
@limiter.limit("20/minute")
def get_duplicate_rows(
    request: Request,
    workspace_id: str,
    upload_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    df = _load_upload_dataframe(workspace_id, upload_id, current_user, db)

    duplicate_mask = df.duplicated(keep=False)
    duplicates_df = df[duplicate_mask]

    total, rows = _paginate_dataframe(duplicates_df, limit, offset)

    return {
        "total_duplicate_rows": total,
        "limit": limit,
        "offset": offset,
        "rows": rows,
    }
