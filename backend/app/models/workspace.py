import uuid
import os
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, DateTime, ForeignKey, Table, Boolean, TypeDecorator, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from cryptography.fernet import Fernet

# --- NEW: Securely handle encrypted fields ---
# Load the encryption key from the environment
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY not set in the environment!")
fernet = Fernet(ENCRYPTION_KEY.encode())

class EncryptedString(TypeDecorator):
    """A custom SQLAlchemy type to encrypt/decrypt data on the fly."""
    impl = String

    def process_bind_param(self, value, dialect):
        if value is not None:
            return fernet.encrypt(value.encode()).decode()
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return fernet.decrypt(value.encode()).decode()
        return value

# (The workspace_team association table is unchanged)
workspace_team = Table(
    "workspace_team",
    Base.metadata,
    Column(
        "workspace_id", 
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"), 
        primary_key=True
    ),
    Column(
        "user_id", 
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        primary_key=True
    ),
)

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    data_source = Column(String(50), nullable=True)
    description_last_updated_at = Column(DateTime, nullable=True)
    
    api_url = Column(String(255), nullable=True)
    polling_interval = Column(String(50), nullable=True)
    last_polled_at = Column(DateTime, nullable=True)
    api_header_name = Column(String(100), nullable=True) # e.g., 'Authorization', 'X-API-Key'
    api_header_value = Column(EncryptedString, nullable=True) # The secret key, encrypted at rest

    # --- ADD THIS LINE for the On/Off switch ---
    is_polling_active = Column(Boolean, default=False, nullable=False, server_default='false')
    
    tracked_column = Column(String(100), nullable=True)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    
    # --- NEW: Fields for the Database Connector ---
    db_type = Column(String(50), nullable=True) # e.g., 'postgresql', 'mysql'
    db_host = Column(String(255), nullable=True)
    db_port = Column(Integer, nullable=True)
    db_user = Column(String(100), nullable=True)
    db_password = Column(EncryptedString, nullable=True) # Uses our secure type
    db_name = Column(String(100), nullable=True)
    db_query = Column(Text, nullable=True)
    # ----------------------------------------------

    # (relationships are unchanged)
    owner = relationship("User", back_populates="workspaces")
    team_members = relationship(
        "User",
        secondary=workspace_team,
        back_populates="joined_workspaces"
    )