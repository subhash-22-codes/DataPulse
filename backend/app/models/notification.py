import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, func
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    ai_insight = Column(Text, nullable=True)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, server_default='false')
    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc), 
        server_default=func.now()
    )
    idempotency_key = Column(String, nullable=True, index=True)
    notification_type = Column(String, nullable=False, default="alert", server_default="alert")
    priority = Column(String, nullable=False, default="info", server_default="info")
    action_url = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False, server_default='false')