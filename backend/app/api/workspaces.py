from sqlalchemy.orm import joinedload
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, WebSocket, WebSocketDisconnect, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator
import asyncio
from .dependencies import get_current_user
from app.core.database import get_db
from app.models.workspace import Workspace
from app.models.user import User
import uuid
import jwt
import os
from datetime import datetime
from app.models.data_upload import DataUpload
from app.models.alert_rule import AlertRule
from app.api.alerts import AlertRuleResponse 
import shutil 
from pathlib import Path
import logging 
from app.core.connection_manager import manager

APP_MODE = os.getenv("APP_MODE")

if APP_MODE == "production":
    # In PRODUCTION, we import the lightweight "recipes" from tasks.py
    logger = logging.getLogger(__name__)
    logger.info("Workspaces running in PRODUCTION mode.")
    from app.services.tasks import process_csv_task
else:
    # In DEVELOPMENT, we import the "Monster Truck" (Celery and Redis)
    logger = logging.getLogger(__name__)
    logger.info("Workspaces running in DEVELOPMENT mode.")
    import redis.asyncio as aioredis
    from app.services.celery_worker import celery_app
# --- END OF "SMART SWITCH" ---


router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

# ==========================
#  Schemas (with standardized Pydantic V2 Config)
# ==========================
class WorkspaceCreate(BaseModel):
    name: str

class UserResponse(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    email: EmailStr
    class Config:
        from_attributes = True
        
class OwnerResponse(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    class Config:
        from_attributes = True

class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    data_source: Optional[str] = None
    created_at: datetime
    owner_id: uuid.UUID
    owner: OwnerResponse
    team_members: List[UserResponse] = []
    api_url: Optional[str] = None
    polling_interval: Optional[str] = None
    is_polling_active: Optional[bool] = None
    tracked_column: Optional[str] = None
    description_last_updated_at: Optional[datetime] = None
    
    db_type: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_user: Optional[str] = None
    db_name: Optional[str] = None
    db_query: Optional[str] = None
    
    class Config:
        from_attributes = True

class WorkspaceUpdate(BaseModel):
    description: Optional[str] = None
    team_member_emails: Optional[List[EmailStr]] = None
    data_source: Optional[str] = None
    api_url: Optional[str] = None
    polling_interval: Optional[str] = None
    is_polling_active: Optional[bool] = None 
    tracked_column: Optional[str] = None
    
    db_type: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_user: Optional[str] = None
    db_password: Optional[str] = None
    db_name: Optional[str] = None
    db_query: Optional[str] = None
    
    @field_validator('team_member_emails')
    def validate_email_count(cls, v):
        if v is not None and len(v) > 2:
            raise ValueError('You can add up to 2 team members only.')
        return v
    
    @field_validator('description')
    def description_length(cls, v):
        if v is not None and len(v) > 500: # You wanted 300, let's make it 500 for more flexibility
            raise ValueError('Description cannot be longer than 500 characters.')
        return v
            
class DataUploadResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    file_path: str
    uploaded_at: datetime
    upload_type: str 
    schema_info: Optional[dict] = None
    analysis_results: Optional[dict] = None
    schema_changed_from_previous: bool = False
    class Config:
        from_attributes = True
    
class TaskResponse(BaseModel):
    task_id: str
    message: str
    
class TrendDataPoint(BaseModel):
    date: datetime
    value: Optional[float] = None

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
    workspace_count = db.query(Workspace).filter(Workspace.owner_id == current_user.id).count()
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
    # --- ADD THE .options() part to this query ---
    workspaces = db.query(Workspace).options(joinedload(Workspace.team_members)).filter(Workspace.owner_id == current_user.id).all()
    return workspaces

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    is_owner = workspace.owner_id == current_user.id
    is_member = current_user in workspace.team_members
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
    return workspace

@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: str, workspace_update: WorkspaceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
    
    # --- ADDED: This is your brilliant "Smart GPS" logic ---
    if 'data_source' in update_data:
        new_source = update_data['data_source']
        if new_source == 'API':
            db_workspace.db_host = None; db_workspace.db_port = None; db_workspace.db_user = None; db_workspace.db_password = None; db_workspace.db_name = None; db_workspace.db_query = None
        elif new_source == 'DB':
            db_workspace.api_url = None
        elif new_source == 'CSV':
            db_workspace.api_url = None; db_workspace.db_host = None; db_workspace.db_port = None; db_workspace.db_user = None; db_workspace.db_password = None; db_workspace.db_name = None; db_workspace.db_query = None
            db_workspace.is_polling_active = False

    if "description" in update_data:
        db_workspace.description_last_updated_at = datetime.utcnow()

    if "team_member_emails" in update_data:
        emails: list[str] = update_data.pop("team_member_emails")
        db_workspace.team_members.clear()
        for email in emails:
            user = db.query(User).filter(User.email == email).first()
            if user and user.id != current_user.id:
                db_workspace.team_members.append(user)
    
    for key, value in update_data.items():
        setattr(db_workspace, key, value)
    
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

@router.get("/team/", response_model=List[WorkspaceResponse])
def get_team_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all workspaces the current user is a team member of."""
    # --- ADD THE .options() part to this query ---
    return db.query(Workspace).options(joinedload(Workspace.team_members)).filter(Workspace.team_members.any(User.id == current_user.id)).all()


# --- THIS IS THE NEW, UPGRADED "Digital Scanner" FUNCTION ---
@router.post("/{workspace_id}/upload-csv", response_model=TaskResponse)
async def upload_csv_for_workspace(
    workspace_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID format")
    
    db_workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can upload files")

    # Read the file content into memory as text
    file_content_bytes = await file.read()
    file_content_text = file_content_bytes.decode('utf-8')
    
    # Create the new database record with the file content
    new_upload = DataUpload(
        workspace_id=db_workspace.id,
        file_path=file.filename,  # Store the original filename for display
        file_content=file_content_text, # Store the actual file content in the database
        upload_type='manual'
    )
    db.add(new_upload)
    db_workspace.data_source = 'CSV'
    db.commit()
    db.refresh(new_upload)

    if APP_MODE == "production":
        logger.info("Running in PROD mode. Calling task directly.")
        process_csv_task(str(new_upload.id))
        return {"task_id": "production_task", "message": "File upload successful, processing has started."}
    else:
        logger.info("Running in DEV mode. Sending task to Celery.")
        task = celery_app.send_task('process_csv_task', args=[str(new_upload.id)])
        return {"task_id": task.id, "message": "File upload successful, processing has started."}
    



# --- UPDATED: Endpoint to get a workspace's upload history ---
@router.get("/{workspace_id}/uploads", response_model=List[DataUploadResponse])
def get_workspace_uploads(
    workspace_id: str,
    upload_type: Optional[str] = None, # <-- CHANGE: Add optional filter
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace = get_workspace(workspace_id, current_user, db)

    # --- CHANGE: Query now filters by upload_type if provided ---
    query = db.query(DataUpload).filter(DataUpload.workspace_id == workspace.id)
    if upload_type:
        query = query.filter(DataUpload.upload_type == upload_type)
    
    uploads = query.order_by(DataUpload.uploaded_at.desc()).all()
    return uploads

# ===================================================
#  NEW: Endpoint for Trend Analysis Data
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
    """
    # Reuse our existing function to get the workspace and check permissions
    workspace = get_workspace(workspace_id, current_user, db)

    # Fetch all uploads of a specific type for this workspace, oldest first
    uploads = db.query(DataUpload).filter(
        DataUpload.workspace_id == workspace.id,
        DataUpload.upload_type == upload_type
    ).order_by(DataUpload.uploaded_at.asc()).all()

    trend_data = []
    for upload in uploads:
        value = None
        try:
            # Safely access the nested dictionary to get the 'mean' value
            value = upload.analysis_results["summary_stats"][column_name]["mean"]
        except (TypeError, KeyError):
            # If analysis_results, summary_stats, or the column doesn't exist, value remains None
            pass
        
        trend_data.append(TrendDataPoint(date=upload.uploaded_at, value=value))

    return TrendResponse(column_name=column_name, data=trend_data)
# ===================================================
#  NEW: WebSocket Endpoint for Real-time Updates
# ===================================================
@router.websocket("/{workspace_id}/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str, client_id: str):
    # Use the central manager to handle the connection
    # It now correctly uses workspace_id as the key
    await manager.connect(workspace_id, websocket)
    
    if APP_MODE == "production":
        # In PROD mode, we just keep the connection alive.
        # The 'manager' will be used by the task worker to send messages.
        logger.info(f"WebSocket {client_id} connected to {workspace_id} in PROD mode.")
        try:
            while True:
                await websocket.receive_text() # Just wait for messages (e.g., chat)
        except WebSocketDisconnect:
            manager.disconnect(workspace_id, websocket)
            logger.info(f"Client {client_id} disconnected from {workspace_id} (PROD)")
        except Exception as e:
            manager.disconnect(workspace_id, websocket)
            logger.error(f"WebSocket error (PROD) for {client_id}: {e}", exc_info=True)
    else:
        # In DEV mode, we still subscribe to Redis for Celery.
        logger.info(f"WebSocket {client_id} connected to {workspace_id} in DEV mode. Subscribing to Redis...")
        redis_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
        try:
            r = await aioredis.from_url(redis_url, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(f"workspace:{workspace_id}")
            
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=None)
                if message:
                    # Use the manager's broadcast to send to all clients in this workspace
                    await manager.broadcast_to_workspace(workspace_id, message['data'])
        
        except WebSocketDisconnect:
            manager.disconnect(workspace_id, websocket)
            logger.info(f"Client {client_id} disconnected from {workspace_id} (DEV)")
        except Exception as e:
            manager.disconnect(workspace_id, websocket)
            logger.error(f"WebSocket error (DEV) for {client_id}: {e}", exc_info=True)
        
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

    # Find the workspace
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # CRITICAL: Only the owner can delete the workspace
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this workspace")

    # Delete the workspace from the database
    # ON DELETE CASCADE will handle associated uploads, notifications, etc.
    db.delete(workspace)
    db.commit()
    
    print(f"✅ Successfully deleted workspace {workspace.id} from database.")
    
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
    The user must be the owner or a team member to view.
    """
    # Reuse our existing function to get the workspace and check permissions
    workspace = get_workspace(workspace_id, current_user, db)

    # If the above line passes, the user has permission. Now fetch the rules.
    rules = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id
    ).all()

    return rules