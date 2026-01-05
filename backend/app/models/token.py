from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base 
from datetime import datetime, timezone

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc), 
        server_default=func.now()                  
    )
    revoked = Column(Boolean, default=False)
    replaced_by_token = Column(String, nullable=True) 
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    user = relationship("User", back_populates="refresh_tokens")