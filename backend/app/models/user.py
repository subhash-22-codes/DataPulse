import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.core.database import Base
from sqlalchemy.orm import relationship 

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=True)  # Optional for Google Auth
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Null for Google Auth
    auth_type = Column(String(20), default="email")  # 'email' or 'google'
    is_verified = Column(Boolean, default=False)
    otp_code = Column(String(6), nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspaces = relationship(
        "Workspace",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    # NEW: Many-to-Many for team memberships
    joined_workspaces = relationship(
        "Workspace",
        secondary="workspace_team",
        back_populates="team_members"
    )
