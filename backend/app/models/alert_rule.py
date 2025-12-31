import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, ForeignKey, Boolean, Float
from app.core.database import Base

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)   
    column_name = Column(String, nullable=False)
    metric = Column(String, nullable=False)
    condition = Column(String, nullable=False) 
    value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, server_default='true')

    def to_dict(self):
        """Returns a dictionary representation of the alert rule for email context."""
        return {
            "id": str(self.id),
            "workspace_id": str(self.workspace_id),
            "column_name": self.column_name,
            "metric": self.metric,
            "condition": self.condition,
            "value": self.value,
            "is_active": self.is_active
        }
