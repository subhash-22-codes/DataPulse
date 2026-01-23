import json
import logging
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.dependencies import get_current_user, limiter
from app.models.data_upload import DataUpload
from app.models.workspace import Workspace
from app.services.storage_service import create_signed_download_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User Actions"])


@router.get("/export-list", response_model=List[dict])
async def get_export_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    workspaces = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).all()

    summary = []
    for ws in workspaces:
        total_size_bytes = db.query(func.sum(DataUpload.file_size_bytes)) \
            .filter(DataUpload.workspace_id == ws.id) \
            .scalar() or 0

        file_count = db.query(DataUpload).filter(DataUpload.workspace_id == ws.id).count()

        summary.append({
            "workspace_id": str(ws.id),
            "name": ws.name,
            "data_source": ws.data_source,
            "total_size_bytes": int(total_size_bytes),
            "file_count": file_count
        })

    return summary


@router.get("/export-workspace/{workspace_id}")
@limiter.limit("5/minute")
async def export_workspace_data(
    request: Request,
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    uploads = db.query(DataUpload).filter(DataUpload.workspace_id == workspace.id).all()

    files = []
    for upload in uploads:
        if not upload.storage_path:
            continue

        signed_url = create_signed_download_url(upload.storage_path, expires_in_seconds=600)

        filename = upload.file_path or f"upload_{str(upload.id)[:8]}.csv"

        files.append({
            "upload_id": str(upload.id),
            "file_name": filename,
            "upload_type": upload.upload_type,
            "uploaded_at": upload.uploaded_at.isoformat() if upload.uploaded_at else None,
            "size_bytes": upload.file_size_bytes or 0,
            "download_url": signed_url
        })

    metadata = {
        "workspace_id": str(workspace.id),
        "workspace_name": workspace.name,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data_source": workspace.data_source,
        "file_count": len(files),
        "files": files
    }

    logger.info(f"✅ Workspace export links created: {workspace.name} ({len(files)} files)")
    return metadata
