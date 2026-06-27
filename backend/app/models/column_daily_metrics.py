from datetime import date, datetime, timezone
import uuid

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, String, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ColumnDailyMetrics(Base):
    __tablename__ = "column_daily_metrics"

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

    column_name = Column(String, nullable=False)
    metric_date = Column(Date, nullable=False)

    missing_percent = Column(Float, nullable=False)
    unique_percent = Column(Float, nullable=False)
    health_score = Column(Float, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    workspace = relationship("Workspace")
    upload = relationship("DataUpload")
