import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from datetime import datetime, timezone
from app.core.database import Base
from sqlalchemy.orm import relationship 

class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(20), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc), # Python-side
        server_default=func.now()                  # DB-side backup
    )
    # Back-reference to the user
    user = relationship("User", back_populates="login_history")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    
    google_id = Column(String(100), unique=True, nullable=True)
    github_id = Column(String(100), unique=True, nullable=True)
    signup_method = Column(String(20), default="email")

    auth_type = Column(String(20), default="email")
    is_verified = Column(Boolean, default=False)
    otp_code = Column(String(6), nullable=True)
    otp_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc), 
        server_default=func.now()                 
    )
    delete_confirmation_otp = Column(String(6), nullable=True)
    delete_confirmation_expiry = Column(DateTime(timezone=True), nullable=True)
    token_version = Column(Integer, default=1, nullable=False)

    # --- Relationships ---
    workspaces = relationship(
        "Workspace",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    joined_workspaces = relationship(
        "Workspace",
        secondary="workspace_team",
        back_populates="team_members"
    )
    
    refresh_tokens = relationship(
        "RefreshToken", 
        back_populates="user", 
        cascade="all, delete-orphan"
    )

    # Link to the login history
    login_history = relationship(
        "LoginHistory",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(LoginHistory.created_at)"
    )