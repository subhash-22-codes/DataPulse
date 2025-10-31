from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from .workspaces import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationResponse(BaseModel):
    id: uuid.UUID
    workspace_id: Optional[uuid.UUID] = None
    ai_insight: Optional[str] = None
    message: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    return notifications

@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(notification_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not notification.is_read:
      notification.is_read = True
      db.commit()
      db.refresh(notification)
    return notification

# --- NEW: Endpoint to mark all notifications as read ---
@router.post("/read-all", status_code=204)
def mark_all_as_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return Response(status_code=204)

# --- NEW: Endpoint to delete a notification ---
@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notification:
        db.delete(notification)
        db.commit()
    return Response(status_code=204)