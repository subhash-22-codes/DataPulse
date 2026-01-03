import io
import zipfile
import json
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.dependencies import get_current_user, limiter
from app.models.data_upload import DataUpload
from app.models.workspace import Workspace

# Initialize Logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User Actions"])

# --- 📋 1. EXPORT SUMMARY (For Frontend Modal) ---
@router.get("/export-list", response_model=List[dict])
async def get_export_summary(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Returns a list of workspaces with total data size.
    Lightweight: Calculates size in DB without loading CSV content into RAM.
    """
    workspaces = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).all()

    summary = []
    for ws in workspaces:
        # Sum length of file_content strings at DB level
        total_size_bytes = db.query(func.sum(func.length(DataUpload.file_content)))\
            .filter(DataUpload.workspace_id == ws.id).scalar() or 0

        summary.append({
            "workspace_id": str(ws.id),
            "name": ws.name,
            "data_source": ws.data_source,
            "total_size_bytes": total_size_bytes,
            "file_count": db.query(DataUpload).filter(DataUpload.workspace_id == ws.id).count()
        })

    return summary

# --- 📦 2. SELECTIVE EXPORT (Per Workspace) ---
@router.get("/export-workspace/{workspace_id}")
@limiter.limit("2/minute")
async def export_workspace_data(
    request: Request,
    workspace_id: str,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Zips and downloads data for a single specific workspace.
    Safe for Render Free Tier (512MB RAM).
    """
    # 🛡️ Hard Caps
    MAX_WS_EXPORT_SIZE = 30 * 1024 * 1024  # 30MB per workspace
    
    # 1. Verify Workspace
    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.owner_id == current_user.id,
        Workspace.is_deleted == False
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    zip_buffer = io.BytesIO()
    added_paths = set()
    total_size_accumulated = 0
    is_truncated = False

    try:
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            
            # Workspace Metadata
            ws_metadata = {
                "workspace_name": workspace.name,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "config": {
                    "data_source": workspace.data_source,
                    "api_url": workspace.api_url,
                    "db_name": workspace.db_name
                },
                "truncated_due_to_size": False
            }

            # Fetch Uploads
            uploads = db.query(DataUpload).filter(DataUpload.workspace_id == workspace.id).all()
            
            for upload in uploads:
                if not upload.file_content:
                    continue
                
                # Size Check
                content_bytes = upload.file_content.encode('utf-8')
                if total_size_accumulated + len(content_bytes) > MAX_WS_EXPORT_SIZE:
                    is_truncated = True
                    ws_metadata["truncated_due_to_size"] = True
                    break

                filename = upload.file_path or f"upload_{str(upload.id)[:8]}.csv"
                if filename in added_paths:
                    filename = f"{str(upload.id)[:6]}_{filename}"

                zip_file.writestr(filename, upload.file_content)
                added_paths.add(filename)
                total_size_accumulated += len(content_bytes)

            zip_file.writestr("workspace_info.json", json.dumps(ws_metadata, indent=4))

        zip_buffer.seek(0)
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')
        safe_name = workspace.name.replace(" ", "_")
        final_filename = f"DataPulse_{safe_name}_{timestamp}.zip"

        logger.info(f"✅ Workspace export: {workspace.name} ({total_size_accumulated} bytes)")

        return StreamingResponse(
            zip_buffer, 
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={final_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    except Exception as e:
        logger.error(f"🚨 Workspace Export Failure: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to package workspace data.")