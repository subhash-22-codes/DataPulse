import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, func, BigInteger

from app.core.database import Base

class DataUpload(Base):
    __tablename__ = "data_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    upload_type = Column(String(50), nullable=False)

    file_path = Column(String, nullable=False)
    file_content = Column(Text, nullable=True)

    storage_path = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)

    uploaded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    schema_info = Column(JSON, nullable=True)
    schema_changed_from_previous = Column(Boolean, default=False)
    analysis_results = Column(JSON, nullable=True)
