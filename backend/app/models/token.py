from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base 

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    revoked = Column(Boolean, default=False)
    
    # Foreign Key to User
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    # Relationship
    user = relationship("User", back_populates="refresh_tokens")