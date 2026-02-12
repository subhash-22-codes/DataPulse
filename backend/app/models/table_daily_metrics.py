from datetime import date, datetime, timezone
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class TableDailyMetrics(Base):
    __tablename__ = "table_daily_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    upload_id = Column(UUID(as_uuid=True), ForeignKey("data_uploads.id", ondelete="CASCADE"), nullable=False)

    metric_date = Column(Date, nullable=False)
    row_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    workspace = relationship("Workspace")
    upload = relationship("DataUpload")
