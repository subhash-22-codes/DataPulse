import os
import uuid
import random
from datetime import datetime, timedelta
import logging
from datetime import datetime
from typing import List, Optional
import asyncio
# FastAPI & Pydantic
from fastapi import (
    APIRouter, Depends, HTTPException, Header, UploadFile, 
    File, WebSocket, WebSocketDisconnect, Query, Response, 
    BackgroundTasks, status
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

# Services & Managers
from app.api.alerts import AlertRuleResponse 
from app.api.dependencies import get_current_user
from app.core.connection_manager import manager


# --- Setup ---
logger = logging.getLogger(__name__)
APP_MODE = os.getenv("APP_MODE", "development") # Default to dev for safety

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

# --- SMART SWITCH: Task Dispatcher ---
if APP_MODE == "production":
    logger.info("🚀 Workspaces running in PRODUCTION mode (BackgroundTasks).")
    # In PROD, we import the python function directly
    from app.services.tasks import process_csv_task
else:
    logger.info("🚚 Workspaces running in DEVELOPMENT mode (Celery).")
    # In DEV, we use Celery. We wrap imports to avoid crashes if libs are missing.
    try:
        import redis.asyncio as aioredis
        from app.services.celery_worker import celery_app
    except ImportError as e:
        logger.warning(f"⚠️ Dev dependencies missing: {e}. Celery tasks may fail.")
        celery_app = None



# ==========================
#  Schemas (Optimized Pydantic V2)
# ==========================
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
    created_at: datetime
    owner_id: uuid.UUID
    owner: OwnerResponse
    team_members: List[UserResponse] = []
    
    api_url: str | None = None # Returned as string for flexibility
    polling_interval: str | None = None
    is_polling_active: bool | None = None
    tracked_column: str | None = None
    description_last_updated_at: datetime | None = None
    
    # Security: Only return the NAME of the header, never the value
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
    
    # Validate that the URL is valid (e.g., http://...)
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
        # Allow clearing the URL by sending empty string
        if v == "": return None
        return v

class DataUploadResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    file_path: str
    uploaded_at: datetime
    upload_type: str 
    schema_info: dict | None = None
    analysis_results: dict | None = None
    schema_changed_from_previous: bool = False
    
    model_config = ConfigDict(from_attributes=True)
    
class TaskResponse(BaseModel):
    task_id: str
    message: str
    
class TrendDataPoint(BaseModel):
    date: datetime
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
def create_workspace(
    workspace: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workspace for the logged-in user, with a limit of 3."""
    # 1. Optimization: Use func.count() for a lighter query
    workspace_count = db.query(func.count(Workspace.id)).filter(
        Workspace.owner_id == current_user.id
    ).scalar()
    
    if workspace_count >= 3:
        raise HTTPException(status_code=400, detail="You can create a maximum of 3 workspaces.")

    new_ws = Workspace(name=workspace.name, owner_id=current_user.id)
    db.add(new_ws)
    db.commit()
    db.refresh(new_ws)
    return new_ws

@router.get("/", response_model=List[WorkspaceResponse])
def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all workspaces belonging to the logged-in user"""
    # Optimization: Use joinedload to fetch team_members in ONE query (prevents N+1)
    # Removed .unique() to fix the crash
    workspaces = db.query(Workspace).options(
        joinedload(Workspace.team_members),
        joinedload(Workspace.owner)
    ).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).all()
    
    return workspaces

@router.get("/trash", response_model=List[WorkspaceResponse]) # Ensure response_model matches your schema
def get_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch only the workspaces that have been soft-deleted.
    """
    return db.query(Workspace).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True  # <--- Only fetch deleted ones
    ).all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    
    # Optimization: Eager load team_members because we check permissions against them.
    # Removed .unique() to fix the crash
    workspace = db.query(Workspace).options(
        joinedload(Workspace.team_members),
        joinedload(Workspace.owner)
    ).filter(
        Workspace.id == ws_uuid,
        Workspace.is_deleted == False
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Permission Check (Python side is fine here since we eager loaded)
    is_owner = workspace.owner_id == current_user.id
    
    # Efficient membership check
    is_member = current_user in workspace.team_members
    
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
        
    return workspace

@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
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
    
    # 1. Fetch Workspace
    db_workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # 2. Authorization Check
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workspace")
    
    # Extract only the fields that were set by the client
    update_data = workspace_update.model_dump(exclude_unset=True)
    
    # --- ⭐ NEW: CONFIG CHANGE TRACKING ---
    # Define fields that, if changed, warrant an immediate data fetch/connection test.
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
    
    # Check if any data source configuration field is present in the update payload
    config_changed = any(field in update_data for field in data_source_fields)
    # --- END NEW LOGIC ---

    # 3. Optimized "Smart GPS" Logic (Clear incompatible fields)
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
        db_workspace.description_last_updated_at = datetime.utcnow()

    # 4. Optimized Team Member Update (Logic remains the same)
    if "team_member_emails" in update_data:
        emails: list[str] = update_data.pop("team_member_emails")
        valid_users = db.query(User).filter(User.email.in_(emails)).all()
        valid_emails = {user.email for user in valid_users}
        
        for email in emails:
            if email not in valid_emails:
                raise HTTPException(status_code=400, detail=f"User '{email}' is not registered.")

        new_team_members = [u for u in valid_users if u.id != current_user.id]
        db_workspace.team_members.clear()
        db_workspace.team_members.extend(new_team_members)

    # 5. Apply generic updates
    for key, value in update_data.items():
        if key == 'api_url' and value is not None:
            value = str(value)
        setattr(db_workspace, key, value)
    
    db.commit()
    db.refresh(db_workspace)

    
    # 6. ✅ CONNECT-ON-DEMAND TRIGGER (FIXED LOGIC)
    # Trigger fetch ONLY if config changed, and it's an API/DB source with active polling.
    
    should_trigger_fetch = (
        config_changed and # <--- NEW CRITICAL CONDITION
        db_workspace.data_source in ["API", "DB"] and 
        db_workspace.is_polling_active is True 
    )

    if should_trigger_fetch:
        # We assume APP_MODE check matches your logic
        if APP_MODE == "production":
            # Import inside function to avoid circular dependency
            from app.services.tasks import process_data_fetch_task 
            
            loop = asyncio.get_event_loop()
            
            # Pass the ID and the Loop
            background_tasks.add_task(process_data_fetch_task, str(db_workspace.id), loop)

    return db_workspace


@router.get("/team/", response_model=List[WorkspaceResponse])
def get_team_workspaces(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    List all workspaces where the current user is a team member.
    Optimized with joinedload to fetch team data efficiently.
    """
    # Removed .unique() to fix the crash
    return db.query(Workspace).options(
        joinedload(Workspace.team_members),
        joinedload(Workspace.owner)
    ).filter(
        Workspace.team_members.any(User.id == current_user.id),
        Workspace.is_deleted == False
    ).all()


# --- THIS IS THE NEW, UPGRADED "Digital Scanner" FUNCTION ---
@router.post("/{workspace_id}/upload-csv", response_model=TaskResponse)
async def upload_csv_for_workspace(
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
    
    # 1. Optimization: Lean Query (Fetch only ID and Owner)
    # We don't need the full object just to check ID and permissions.
    workspace = db.query(Workspace.id, Workspace.owner_id).filter(Workspace.id == ws_uuid).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # 2. Authorization Check
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can upload files")

    # 3. Read & Decode (Memory Intensive)
    # We catch decoding errors to fail gracefully if they upload a binary file by mistake.
    try:
        file_content_bytes = await file.read()
        file_content_text = file_content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a valid UTF-8 CSV.")
    
    # 4. Create Data Record
    new_upload = DataUpload(
        workspace_id=workspace.id,
        file_path=file.filename,
        file_content=file_content_text,
        upload_type='manual'
    )
    db.add(new_upload)
    
    # 5. Optimization: Direct SQL Update
    # Much faster than loading the object, modifying it, and flushing it.
    db.query(Workspace).filter(Workspace.id == ws_uuid).update(
        {"data_source": "CSV"}
    )
    
    db.commit()
    db.refresh(new_upload)

    task_id_to_return = str(new_upload.id)
    message = "File upload successful, processing has started."

    # 6. Task Dispatch
    if APP_MODE == "production":
        logger.info("Running in PROD mode. Adding task to background.")
        
        loop = asyncio.get_event_loop()
        
        # Import locally to ensure no circular dependency issues at module level
        from app.services.tasks import process_csv_task
        
        # Pass loop for safe signaling
        background_tasks.add_task(process_csv_task, str(new_upload.id), loop) 

    else:
        logger.info("Running in DEV mode. Sending task to Celery.")
        if celery_app:
            task = celery_app.send_task('process_csv_task', args=[str(new_upload.id)])
            task_id_to_return = task.id
        else:
            logger.warning("Celery app not loaded. Task not sent.")
    
    return {"task_id": task_id_to_return, "message": message}

# --- UPDATED: Endpoint to get a workspace's upload history ---
@router.get("/{workspace_id}/uploads", response_model=List[DataUploadResponse])
def get_workspace_uploads(
    workspace_id: str,
    upload_type: Optional[str] = None,
    limit: int = 50, # <-- Optimization: Default limit prevents UI lag
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Security Check (Lean)
    workspace = get_workspace(workspace_id, current_user, db)

    # 2. Optimization: Defer 'file_content'
    # We don't need the raw CSV text for the history list.
    # This saves massive amounts of RAM and network bandwidth.
    query = db.query(DataUpload).options(
        defer(DataUpload.file_content)
    ).filter(
        DataUpload.workspace_id == workspace.id
    )

    # 3. Optional Filtering
    if upload_type:
        query = query.filter(DataUpload.upload_type == upload_type)
    
    # 4. Sorting and Limiting
    uploads = query.order_by(DataUpload.uploaded_at.desc()).limit(limit).all()
    
    return uploads

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
    """
    Gets the historical trend for a single metric (column) over time.
    Optimized: Fetches ONLY timestamp and JSON stats, avoiding heavy CSV file content.
    """
    # 1. Security Check (Uses our optimized get_workspace)
    workspace = get_workspace(workspace_id, current_user, db)

    # 2. Optimized Query: Select ONLY specific columns
    # This returns a lightweight list of tuples, NOT full objects.
    # We skip the 'file_content' column entirely, making this query 100x faster.
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
    # unpacking the tuple (uploaded_at, analysis_results)
    for uploaded_at, stats in results:
        value = None
        
        if stats:
            try:
                # Safely access nested keys using .get() to avoid KeyErrors
                # Structure: stats -> summary_stats -> column_name -> mean
                summary = stats.get("summary_stats", {})
                col_stats = summary.get(column_name, {})
                value = col_stats.get("mean")
            except (AttributeError, TypeError):
                # Handle cases where stats might be malformed
                pass
        
        trend_data.append(TrendDataPoint(date=uploaded_at, value=value))

    return TrendResponse(column_name=column_name, data=trend_data)
# ===================================================
#  NEW: WebSocket Endpoint for Real-time Updates
# ===================================================
# REMOVE 'db: Session = Depends(get_db)' from here 
@router.websocket("/{workspace_id}/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    workspace_id: str, 
    client_id: str
):
    """
    Handles real-time WebSocket connections with 'Auth & Release' pattern
    to prevents DB connection leaks.
    """
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
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        # Ensure DB is closed even on auth failure
        db.close()
        return

    # 🟢 CRITICAL: Close the DB connection NOW.
    # We are done with the DB. We don't need it for the long-running loop.
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
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info(f"WS Disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WS Error {client_id}: {e}", exc_info=True)
    finally:
        # 4. Cleanup
        if user_id_str:
            manager.disconnect('workspace', workspace_id, websocket)
            manager.disconnect('user', user_id_str, websocket)
        
# --- ENDPOINT 1: Request the Code ---
# ... existing imports ...
# Ensure you have HTTPException imported with status_code 429
# from fastapi import HTTPException, status

@router.post("/{workspace_id}/request-delete-otp", status_code=200)
async def request_delete_otp(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1: Verify ownership, check rate limit, generate OTP, and send email.
    """
    # --- 1. NEW: RATE LIMIT CHECK (Prevent Spam) ---
    OTP_DURATION_MINUTES = 10
    COOLDOWN_SECONDS = 60

    if current_user.delete_confirmation_expiry:
        time_until_expiry = (current_user.delete_confirmation_expiry - datetime.utcnow()).total_seconds()

        # If expiry > 9 minutes left => sent within last 60 seconds
        if time_until_expiry > (OTP_DURATION_MINUTES * 60 - COOLDOWN_SECONDS):
            retry_after = int(time_until_expiry - (OTP_DURATION_MINUTES * 60 - COOLDOWN_SECONDS))
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {retry_after} seconds before requesting a new code."
            )


    ws_uuid = uuid.UUID(workspace_id)
    
    # 2. Find Workspace (Ensure it's not already deleted)
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied.")

    # 3. Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    
    # 4. Save to User Model
    current_user.delete_confirmation_otp = otp
    # IMPORTANT: Keep this consistent with the OTP_DURATION_MINUTES above
    current_user.delete_confirmation_expiry = datetime.utcnow() + timedelta(minutes=OTP_DURATION_MINUTES)
    db.commit()

    # 5. Send Email (Async)
    await send_delete_otp_email(current_user.email, otp, workspace.name)
    
    return {"message": "OTP sent to your email."}


# --- ENDPOINT 2: Confirm and Delete ---
@router.delete("/{workspace_id}/confirm", status_code=204)
async def confirm_delete_workspace(
    workspace_id: str,
    payload: DeleteConfirmation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # --- 1. VERIFY OTP (Updated to use NEW columns) ---
    # We explicitly check delete_confirmation_otp, IGNORING the password otp_code
    if not current_user.delete_confirmation_otp or current_user.delete_confirmation_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    if not current_user.delete_confirmation_expiry or datetime.utcnow() > current_user.delete_confirmation_expiry:
        raise HTTPException(status_code=400, detail="Verification code has expired.")

    # 2. Find Workspace (Logic Unchanged)
    ws_uuid = uuid.UUID(workspace_id)
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # 3. SOFT DELETE (Logic Unchanged)
    workspace.is_deleted = True
    workspace.deleted_at = datetime.utcnow()
    
    # --- BROADCAST NOTIFICATIONS (Your Logic - Unchanged) ---
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
    
    # 4. CLEANUP (Updated)
    # Clear the DELETE otp, leaving the password OTP untouched
    current_user.delete_confirmation_otp = None
    current_user.delete_confirmation_expiry = None
    
    db.commit()
    
    return

# --- ENDPOINT 4: Restore Workspace ---
@router.post("/{workspace_id}/restore", status_code=200)
def restore_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Restores a soft-deleted workspace.
    """
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    # Find the workspace (even if it is deleted)
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True # Ensure we are restoring a deleted one
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found in trash.")

    # RESTORE ACTION
    workspace.is_deleted = False
    workspace.deleted_at = None
    
    db.commit()
    
    return {"message": "Workspace restored successfully"}

# --- ENDPOINT 5: Hard Delete (Forever) ---
@router.delete("/{workspace_id}/permanently", status_code=204)
def delete_workspace_permanently(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    PERMANENTLY deletes a workspace. This action cannot be undone.
    """
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    # 1. Find the workspace in the trash
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == True  # <--- MUST be in trash to delete forever
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found in trash")

    # 2. HARD DELETE (The actual SQL DELETE)
    # Since you set ondelete="CASCADE" in your models, this will automatically
    # remove related Notifications, Uploads, and Team Members.
    db.delete(workspace)
    db.commit()
    
    return # 204 No Content
# ===================================================
#  NEW: Endpoint to get a workspace's alert rules
# ===================================================
@router.get("/{workspace_id}/alerts", response_model=List[AlertRuleResponse])
def get_workspace_alerts(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gets the list of all alert rules for a given workspace.
    Optimized to fetch only necessary columns.
    """
    # 1. Security Check (Uses our optimized get_workspace)
    workspace = get_workspace(workspace_id, current_user, db)

    # 2. Optimized Query: Filter by workspace and active status
    # Note: If your AlertRuleResponse model matches the DB columns exactly, 
    # fetching the full object is fine. If it's a subset, you could use db.query(AlertRule.id, ...)
    # But for typical use cases, this standard query is efficient enough for small lists like alerts.
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


# --- NEW: Trigger Manual Poll (For Render Sleep Fix) ---
# This allows the frontend to run the poll on demand
@router.post("/{workspace_id}/trigger-poll")
async def trigger_manual_poll(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually triggers the data polling logic for a specific workspace.
    Optimized: Removes unused event loop logic and ensures safe local imports.
    """
    logger.info(f"Manual poll triggered for workspace {workspace_id}")
    
    # 1. Security & Existence Check
    # Uses the optimized get_workspace to ensure user owns/has access
    workspace = get_workspace(workspace_id, current_user, db)
    
    # 2. Validation
    if not workspace.is_polling_active:
        return {"message": "Polling is not active for this workspace."}
        
    # 3. Task Dispatch
    # We use local imports to guarantee no circular dependency conflicts
    if workspace.data_source == 'API' and workspace.api_url:
        from app.services.tasks import fetch_api_data
        
        # Optimization: BackgroundTasks runs this sync function in a threadpool.
        # We do NOT need to pass the event loop here because 'fetch_api_data' 
        # manages its own internal hand-off to 'process_csv_task'.
        background_tasks.add_task(fetch_api_data, str(workspace.id))
        return {"message": "Polling triggered successfully (API)."}
        
    elif workspace.data_source == 'DB' and workspace.db_host:
        from app.services.tasks import fetch_db_data
        
        background_tasks.add_task(fetch_db_data, str(workspace.id))
        return {"message": "Polling triggered successfully (DB)."}
        
    return {"message": "No valid data source configured for polling."}