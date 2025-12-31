import io
import zipfile
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.data_upload import DataUpload
from app.models.workspace import Workspace

router = APIRouter(prefix="/user", tags=["User Actions"])

@router.get("/export-data")
async def export_user_data(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):

    zip_buffer = io.BytesIO()
    
    added_paths = set()

    try:
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            
            export_metadata = {
                "exported_by": current_user.email,
                "user_id": str(current_user.id),
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "workspaces": []
            }
            workspaces = db.query(Workspace).filter(Workspace.owner_id == current_user.id).all()

            for ws in workspaces:
                ws_entry = {
                    "workspace_id": str(ws.id),
                    "workspace_name": ws.name,
                    "data_source": ws.data_source,
                    "created_at": ws.created_at.isoformat() if ws.created_at else None,
                    "config": {
                        "api_url": ws.api_url,
                        "db_type": ws.db_type,
                        "db_host": ws.db_host,
                        "db_name": ws.db_name,
                        "is_polling_active": ws.is_polling_active
                    }
                }
                export_metadata["workspaces"].append(ws_entry)

                uploads = db.query(DataUpload).filter(DataUpload.workspace_id == ws.id).all()
                
                for upload in uploads:
                    if not upload.file_content:
                        continue
                        
                    folder_name = ws.name.replace(" ", "_")
                    base_filename = upload.file_path or f"upload_{str(upload.id)[:8]}.csv"
                    
                    target_path = f"{folder_name}/{base_filename}"
                    
                    if target_path in added_paths:
                        short_id = str(upload.id)[:6]
                        name_parts = base_filename.rsplit('.', 1)
                        if len(name_parts) > 1:
                            target_path = f"{folder_name}/{name_parts[0]}_{short_id}.{name_parts[1]}"
                        else:
                            target_path = f"{folder_name}/{base_filename}_{short_id}"

                    zip_file.writestr(target_path, upload.file_content)
                    added_paths.add(target_path)

            zip_file.writestr("DataPulse_Configuration.json", json.dumps(export_metadata, indent=4))

        # 2. Finalize the stream
        zip_buffer.seek(0)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M')
        filename = f"DataPulse_Export_{timestamp}.zip"
        
        return StreamingResponse(
            zip_buffer, 
            media_type="application/x-zip-compressed",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    except Exception as e:
        print(f"❌ Critical Export Failure: {str(e)}")
        raise HTTPException(status_code=500, detail="Data packaging failed.")