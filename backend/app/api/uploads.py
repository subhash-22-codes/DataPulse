from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import StreamingResponse 
from sqlalchemy.orm import Session
import uuid
import io 
from app.core.database import get_db
from app.models.data_upload import DataUpload
from app.models.workspace import Workspace
from app.models.user import User
from .dependencies import get_current_user, limiter

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.delete("/{upload_id}", status_code=204)
@limiter.limit("5/minute")
def delete_upload(
    request: Request,
    upload_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
 
    upload_record = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload_record:
        return Response(status_code=204)

    workspace = db.query(Workspace).filter(Workspace.id == upload_record.workspace_id).first()
    if not workspace or not (workspace.owner_id == current_user.id or current_user in workspace.team_members):
        raise HTTPException(status_code=403, detail="Not authorized to delete this upload")

    db.delete(upload_record)
    db.commit()

    return Response(status_code=204)

@router.get("/{upload_id}/content")
def get_upload_content(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    upload_record = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload_record:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Permission Check
    workspace = db.query(Workspace).filter(Workspace.id == upload_record.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Parent workspace not found")
    is_owner = workspace.owner_id == current_user.id
    is_member = current_user in workspace.team_members
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this content")
    
    file_content = upload_record.file_content
    if not file_content:
        raise HTTPException(status_code=404, detail="File content not found in database")

    return StreamingResponse(
        io.StringIO(file_content),
        media_type='text/csv',
        headers={"Content-Disposition": f"attachment; filename={upload_record.file_path}"}
    )