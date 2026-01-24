import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.data_upload import DataUpload


DEFAULT_MAX_UPLOADS_PER_WORKSPACE = 50


def get_upload_count(db: Session, workspace_id: uuid.UUID) -> int:
    return (
        db.query(DataUpload)
        .filter(DataUpload.workspace_id == workspace_id)
        .count()
    )


def enforce_upload_limit_or_raise(
    db: Session,
    workspace_id: uuid.UUID,
    limit: int = DEFAULT_MAX_UPLOADS_PER_WORKSPACE
) -> None:
    """
    Used for manual uploads (API endpoint).
    Raises HTTPException if limit is reached.
    """
    count = get_upload_count(db, workspace_id)
    if count >= limit:
        raise HTTPException(
            status_code=400,
            detail=f"Upload limit reached ({limit} files). Delete old files to add new."
        )


def is_workspace_upload_limit_reached(
    db: Session,
    workspace_id: uuid.UUID,
    limit: int = DEFAULT_MAX_UPLOADS_PER_WORKSPACE
) -> bool:
    """
    Used for polling workers. Lets caller decide what to do (kill poller, auto-disable, etc).
    """
    return get_upload_count(db, workspace_id) >= limit
