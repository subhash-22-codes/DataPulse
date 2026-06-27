from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, UUID, Integer, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )

    upload_id = Column(
        UUID(as_uuid=True),
        ForeignKey("data_uploads.id", ondelete="CASCADE"),
        nullable=False,
    )

    trigger_file_name = Column(String, nullable=False)
    upload_type = Column(String, nullable=False)  # csv | api | db

    issue_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)     # low | medium | high
    status = Column(String, nullable=False)       # open | resolved | ignored

    first_seen = Column(DateTime(timezone=True), nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    column_name = Column(String, nullable=True)
    row_drop_percent = Column(Integer, nullable=True)
    schema_change_size = Column(Integer, nullable=True)
    missing_percent = Column(Integer, nullable=True)

    affected_columns = Column(JSON, nullable=True)
    failure_reason = Column(String, nullable=True)

    workspace = relationship("Workspace")
    upload = relationship("DataUpload")
