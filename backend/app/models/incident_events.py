import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    incident_id = Column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
    )

    upload_id = Column(
        UUID(as_uuid=True),
        ForeignKey("data_uploads.id", ondelete="CASCADE"),
        nullable=False,
    )

    event_type = Column(String, nullable=False)  # created | updated | resolved | reopened
    severity = Column(String, nullable=False)
    metrics = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    incident = relationship("Incident", backref="events")
    upload = relationship("DataUpload")