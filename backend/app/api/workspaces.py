import os
import uuid
import random
from datetime import datetime, timedelta, timezone
import logging
import datetime as dt
from typing import List, Optional
import asyncio
# FastAPI & Pydantic
from fastapi import (
    APIRouter, Depends, HTTPException, Header, UploadFile, 
    File, WebSocket, WebSocketDisconnect, Query, Response, 
    BackgroundTasks, status, Request
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
from app.services.tasks import executor
from app.services.tasks import process_csv_task
from app.services.storage_service import upload_csv_bytes
from app.services.storage_service import delete_files
from app.api.alerts import AlertRuleResponse 
from app.api.dependencies import get_current_user, limiter
from app.core.connection_manager import manager
from app.services.tasks import process_data_fetch_task
from app.core.guard import send_telegram_alert

# --- Setup ---
logger = logging.getLogger(__name__)
APP_MODE = os.getenv("APP_MODE", "development")

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
    
    # Permission Check 
    is_owner = workspace.owner_id == current_user.id
    
    # Efficient membership check
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
    current_user: User = Depends(get_current_user)
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    
    db_workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workspace")
    
    update_data = workspace_update.model_dump(exclude_unset=True)
    
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
    
    config_changed = any(field in update_data for field in data_source_fields)

    if 'data_source' in update_data:
        new_source = update_data['data_source']
        
        db_fields = ['db_host', 'db_port', 'db_user', 'db_password', 'db_name', 'db_query']
        api_fields = ['api_url', 'api_header_name', 'api_header_value']
        
        if new_source == 'API':
            for field in db_fields: setattr(db_workspace, field, None)
            
        elif new_source == 'DB':
            for field in api_fields: setattr(db_workspace, field, None)
            
        elif new_source == 'CSV':
            for field in db_fields + api_fields: setattr(db_workspace, field, None)
            db_workspace.is_polling_active = False

    if "description" in update_data:
        db_workspace.description_last_updated_at = dt.datetime.now(dt.timezone.utc)

    if "team_member_emails" in update_data:
        emails: list[str] = update_data.pop("team_member_emails")

        valid_users = db.query(User).filter(
            User.email.in_(emails),
            User.is_verified == True
        ).all()
        
        verified_emails = {u.email for u in valid_users}
        
        for email in emails:
            if email == current_user.email:
                raise HTTPException(
                    status_code=400, 
                    detail="You are the owner of this workspace. You don't need to add yourself to the team."
                )
            if email not in verified_emails:
                user_record = db.query(User).filter(User.email == email).first()
                if not user_record:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"User '{email}' does not have a DataPulse account."
                    )
                else:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"User '{email}' needs to verify their account before joining teams."
                    )

        final_members = [u for u in valid_users if u.id != current_user.id]

        db_workspace.team_members = final_members


    for key, value in update_data.items():
        if key == 'api_url' and value is not None:
            value = str(value)
        setattr(db_workspace, key, value)
        
    user_toggled_on = update_data.get('is_polling_active') is True
    
    if config_changed:
        db_workspace.failure_count = 0
        db_workspace.last_failure_reason = None
        db_workspace.auto_disabled_at = None
        db_workspace.is_polling_active = False
        
        if user_toggled_on:
            db_workspace.is_polling_active = True
            logger.info(f"🚀 Manual re-enable detected for '{db_workspace.name}'. Resetting failures.")
        else:
            db_workspace.is_polling_active = False
            logger.info(f"🛡️ Config updated for '{db_workspace.name}'. Polling stays OFF.")
    
    db.commit()
    db.refresh(db_workspace)
    user_toggled_on = update_data.get("is_polling_active") is True

    if user_toggled_on and db_workspace.is_polling_active:
        current_loop = asyncio.get_running_loop()
        logger.info(f"⚡ [UX KICKSTART] Triggering instant fetch for '{db_workspace.name}'")
        executor.submit(process_data_fetch_task, str(db_workspace.id), current_loop)
    
    if user_toggled_on:   
        if background_tasks:
            background_tasks.add_task(
                send_telegram_alert,
                f"BLUE ALERT: Workspace Updated\n"
                f"Name: {db_workspace.name}\n"
                f"User: {current_user.email}\n"
                f"Config Changed: {config_changed}"
            )
        
    return db_workspace


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


# --- THIS IS THE NEW, UPGRADED "Digital Scanner" FUNCTION ---
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
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID format")

    # 1. Fetch full ORM Workspace (not partial columns)
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can upload files")

    # 2. Read CSV bytes (RAM Protection)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB Limit
    try:
        file_bytes = await file.read(MAX_FILE_SIZE + 1)
        if len(file_bytes) > MAX_FILE_SIZE:
            await file.close()
            raise HTTPException(status_code=413, detail="File too large. Maximum limit is 5MB.")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file")

    # Validate UTF-8 without storing huge string in DB
    try:
        _ = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid UTF-8 CSV file")

    # 3. Create DataUpload row first (so we have upload_id)
    new_upload = DataUpload(
        workspace_id=workspace.id,
        file_path=file.filename,
        file_content=None,  # ✅ don't store raw CSV in Postgres anymore
        upload_type="manual",
        file_size_bytes=len(file_bytes),
    )

    db.add(new_upload)
    db.flush()  # ensures new_upload.id exists

    # 4. Upload file to Supabase Storage
    storage_path = f"workspaces/{workspace.id}/uploads/{new_upload.id}.csv"

    try:
        upload_csv_bytes(storage_path, file_bytes)
    except Exception as e:
        # rollback upload creation if storage fails
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # save storage path in DB
    new_upload.storage_path = storage_path
    new_upload.file_url = None  # private bucket, so no public url

    # 5. ORM-safe workspace update
    workspace.data_source = "CSV"
    workspace.is_polling_active = False

    db.commit()
    db.refresh(new_upload)

    task_id = str(new_upload.id)

    # 6. Background task dispatch
    if APP_MODE == "production":
        loop = asyncio.get_event_loop()
        background_tasks.add_task(process_csv_task, task_id, loop)
    else:
        if celery_app:
            task = celery_app.send_task("process_csv_task", args=[task_id])
            task_id = task.id

    return {
        "task_id": task_id,
        "message": "File upload successful, processing started."
    }

#  Endpoint to get a workspace's upload history ---
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
    # 1. Reuse security logic
    ws = get_workspace(workspace_id, user, db)

    # 2. Fetch ONLY the schema_info from the latest record
    schema_data = db.query(DataUpload.schema_info).filter(
        DataUpload.workspace_id == ws.id
    ).order_by(DataUpload.uploaded_at.desc()).first()

    # 3. Clean Response
    if not schema_data or not schema_data[0]:
        return {"schema": {}, "has_data": False}

    return {"schema": schema_data[0], "has_data": True}


@router.get("/{workspace_id}/uploads/count")
def get_workspace_upload_count(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security: ensure user has access to workspace
    workspace = get_workspace(workspace_id, current_user, db)

    # Efficient aggregate query
    upload_count = db.query(DataUpload).filter(
        DataUpload.workspace_id == workspace.id
    ).count()

    return {
        "count": upload_count
    }


# ===================================================
# Endpoint for Trend Analysis Data
# ===================================================
@router.get("/{workspace_id}/trend", response_model=TrendResponse)
def get_trend_data(
    workspace_id: str,
    column_name: str = Query(..., description="The name of the column to get trend data for"),
    upload_type: str = Query(..., description="The type of upload to analyze ('manual' or 'api_poll')"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Security Check (Uses optimized get_workspace)
    workspace = get_workspace(workspace_id, current_user, db)

    # 2. Optimized Query: Select ONLY specific columns
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
    
    # 3. Processing Loop
    for uploaded_at, stats in results:
        # If the date is missing, skip this point entirely. 
        if uploaded_at is None:
            continue

        value = None
        if stats:
            try:
                summary = stats.get("summary_stats", {})
                col_stats = summary.get(column_name, {})
                
                # Extract value
                raw_value = col_stats.get("mean")
                
                # Ensure it's a float, otherwise the frontend might break
                if raw_value is not None:
                    value = float(raw_value)
                    
            except (AttributeError, TypeError, ValueError):
                pass
        
        # Only add to the list if we actually found a value. 
        if value is not None:
            trend_data.append(TrendDataPoint(date=uploaded_at, value=value))

    return TrendResponse(column_name=column_name, data=trend_data)
# ===================================================
#  NEW: WebSocket Endpoint for Real-time Updates
# ===================================================
@router.websocket("/{workspace_id}/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    workspace_id: str, 
    client_id: str
):
    # 1. Manually Open Session
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
            # Code 1008 is for Policy Violation (Auth failure)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass # Connection might already be closed
        # Ensure DB is closed even on auth failure
        db.close()
        return

    # Close the DB connection NOW. 
    # This is excellent for Render stability as it keeps connection pools open.
    db.close() 

    # 2. Accept connection (Zero DB usage from here on)
    await websocket.accept()
    
    # We register using the ID string we saved, not the DB object
    await manager.connect('workspace', workspace_id, websocket)
    await manager.connect('user', user_id_str, websocket)
    
    logger.info(f"WS Connected: User {user_id_str} -> Workspace {workspace_id} (Client {client_id})")

    # 3. Keep-alive loop
    try:
        while True:
            # This line keeps the connection open by waiting for data
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        # Normal disconnect (user closed tab or navigated away)
        logger.info(f"WS Disconnected: {client_id}")
    except Exception as e:
        # Unexpected error (network flicker or server issue)
        logger.error(f"WS Error {client_id}: {e}", exc_info=True)
    finally:
        # 4. Cleanup
        # Ensure we always remove the connection from our manager to prevent memory leaks
        if user_id_str:
            manager.disconnect('workspace', workspace_id, websocket)
            manager.disconnect('user', user_id_str, websocket)
            

# ----Endpoint: Request Delete OTP Endpoint
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
    
    if not current_user.delete_confirmation_otp or current_user.delete_confirmation_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    
    if not current_user.delete_confirmation_expiry or now > current_user.delete_confirmation_expiry:
        raise HTTPException(status_code=400, detail="Verification code has expired.")

    ws_uuid = uuid.UUID(workspace_id)
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")


    workspace.is_deleted = True
    workspace.deleted_at = now
    
    for member in workspace.team_members:
        team_note = Notification(
            user_id=member.id,
            workspace_id=workspace.id,
            message=f"The workspace '{workspace.name}' has been deleted by the owner.",
            ai_insight="Access to this workspace is no longer available."
        )
        db.add(team_note)

    owner_note = Notification(
        user_id=current_user.id,
        workspace_id=workspace.id,
        message=f"You successfully deleted '{workspace.name}'.",
        ai_insight="You can restore this from the Trash Bin within 30 days."
    )
    db.add(owner_note)
    
    current_user.delete_confirmation_otp = None
    current_user.delete_confirmation_expiry = None
    
    db.commit()
    background_tasks.add_task(
        send_telegram_alert,
        f"BLUE ALERT: Workspace Deleted Successfully\n"
        f"Owner: {current_user.email}\n"
        f"Workspace ID: {workspace_id}"
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

    # 1. Find the target workspace in trash
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found in trash.")

    # 2. QUOTA CHECK: Can they afford to bring this back?
    active_count = db.query(func.count(Workspace.id)).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).scalar()

    if active_count >= 3:
        raise HTTPException(
            status_code=429, 
            detail="Cannot restore. You already have 3 active workspaces. Delete one permanently to free up a slot."
        )

    # 3. RESTORE ACTION
    workspace.is_deleted = False
    workspace.deleted_at = None
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