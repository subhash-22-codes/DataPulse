import os
import uuid
import logging
from datetime import datetime
from typing import List, Optional
import asyncio
# FastAPI & Pydantic
from fastapi import (
    APIRouter, Depends, HTTPException, Header, UploadFile, 
    File, WebSocket, WebSocketDisconnect, Query, Response, 
    BackgroundTasks
)
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict, HttpUrl

# Database & Models
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import func, or_
from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.alert_rule import AlertRule

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
        Workspace.owner_id == current_user.id
    ).all()
    
    return workspaces

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
        Workspace.id == ws_uuid
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
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    
    # 1. Fetch Workspace
    # We need the object to update it, so fetching full object is okay here.
    db_workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # 2. Authorization Check
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workspace")
    
    update_data = workspace_update.model_dump(exclude_unset=True)
    
    # 3. Optimized "Smart GPS" Logic (Clear incompatible fields)
    if 'data_source' in update_data:
        new_source = update_data['data_source']
        
        # Helper list of fields to clear for each type
        # (This is cleaner than the massive if/elif block)
        db_fields = ['db_host', 'db_port', 'db_user', 'db_password', 'db_name', 'db_query']
        api_fields = ['api_url', 'api_header_name', 'api_header_value']
        
        if new_source == 'API':
            for field in db_fields: setattr(db_workspace, field, None)
            
        elif new_source == 'DB':
            for field in api_fields: setattr(db_workspace, field, None)
            
        elif new_source == 'CSV':
            # Clear ALL remote connection fields
            for field in db_fields + api_fields: setattr(db_workspace, field, None)
            db_workspace.is_polling_active = False

    if "description" in update_data:
        db_workspace.description_last_updated_at = datetime.utcnow()

    # 4. Optimized Team Member Update (Batch Query)
    if "team_member_emails" in update_data:
        emails: list[str] = update_data.pop("team_member_emails")
        
        # Fetch ALL valid users in ONE query (No loop!)
        valid_users = db.query(User).filter(User.email.in_(emails)).all()
        valid_emails = {user.email for user in valid_users}
        
        # Check for missing users
        for email in emails:
            if email not in valid_emails:
                 raise HTTPException(status_code=400, detail=f"User with email '{email}' is not a registered user on DataPulse.")

        # Update the relationship
        new_team_members = [u for u in valid_users if u.id != current_user.id]
        
        db_workspace.team_members.clear()
        db_workspace.team_members.extend(new_team_members)

    # 5. Apply generic updates
    for key, value in update_data.items():
        # FIX: Convert Pydantic HttpUrl objects to strings for the database
        if key == 'api_url' and value is not None:
            value = str(value)
            
        setattr(db_workspace, key, value)
    
    db.commit()
    db.refresh(db_workspace)
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
        Workspace.team_members.any(User.id == current_user.id)
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
@router.websocket("/{workspace_id}/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str, client_id: str):
    """
    Handles real-time WebSocket connections.
    Optimized with keep-alive heartbeat and robust disconnect handling.
    """
    await manager.connect(workspace_id, websocket)
    
    try:
        if APP_MODE == "production":
            logger.info(f"WS Connected: {client_id} -> {workspace_id} (PROD)")
            
            # Optimization: Simple Keep-Alive Loop
            # This prevents Render/Load Balancers from killing idle connections.
            while True:
                # Wait for a message (like a ping from client)
                # If no message comes, we just wait.
                # Ideally, the client should send a 'ping' every 30s to keep this active.
                data = await websocket.receive_text()
                
                # Optional: Respond to pings
                if data == "ping":
                    await websocket.send_text("pong")
                    
        else:
            # DEV Mode: Redis Subscription
            logger.info(f"WS Connected: {client_id} -> {workspace_id} (DEV - Redis)")
            redis_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
            
            r = await aioredis.from_url(redis_url, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(f"workspace:{workspace_id}")
            
            # We use a task to listen to Redis so we can also listen for client disconnects
            async def redis_listener():
                async for message in pubsub.listen():
                    if message['type'] == 'message':
                        await manager.broadcast_to_workspace(workspace_id, message['data'])

            # Run listener in background
            listener_task = asyncio.create_task(redis_listener())
            
            try:
                while True:
                    # Keep main loop alive to detect client disconnect
                    data = await websocket.receive_text()
                    if data == "ping":
                        await websocket.send_text("pong")
            finally:
                # Clean up Redis listener when client disconnects
                listener_task.cancel()
                await pubsub.unsubscribe(f"workspace:{workspace_id}")
                await r.close()

    except WebSocketDisconnect:
        logger.info(f"WS Disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WS Error {client_id}: {e}", exc_info=True)
    finally:
        # Guaranteed cleanup
        manager.disconnect(workspace_id, websocket)
        
@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a workspace and all associated data.
    Only the owner of the workspace can perform this action.
    """
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")

    # 1. Optimization: Lean Query + Security in ONE step
    # We query for the workspace AND check ownership at the same time.
    # This prevents us from even loading the object if the user isn't the owner.
    workspace = db.query(Workspace).filter(
        Workspace.id == ws_uuid,
        Workspace.owner_id == current_user.id
    ).first()

    if not workspace:
        # 2. Security: Ambiguous Error
        # If the workspace doesn't exist OR the user isn't the owner, return 404.
        # This prevents attackers from fishing for valid workspace IDs.
        raise HTTPException(status_code=404, detail="Workspace not found or access denied.")

    # 3. Delete
    # ON DELETE CASCADE in your database models handles the cleanup of
    # uploads, notifications, and team members automatically.
    db.delete(workspace)
    db.commit()
    
    logger.info(f"🗑️ Deleted workspace {workspace_id} (Owner: {current_user.email})")
    
    return Response(status_code=204)
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