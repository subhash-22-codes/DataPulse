# In app/models/notification.py

import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # The user who this notification is for
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # The workspace this notification is about (optional)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    
    ai_insight = Column(Text, nullable=True)
    
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, server_default='false')
    created_at = Column(DateTime, default=datetime.utcnow)