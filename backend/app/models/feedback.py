import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from datetime import datetime, timezone
from app.core.database import Base
from sqlalchemy.orm import relationship 

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True,
        index=True  
    )
    
    message = Column(Text, nullable=False)
    page = Column(String(512), nullable=True)

    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc), 
        server_default=func.now()
    )
    user = relationship("User", back_populates="feedbacks")