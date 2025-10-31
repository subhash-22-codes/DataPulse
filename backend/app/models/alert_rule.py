import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, ForeignKey, Boolean, Float
from app.core.database import Base

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    
    column_name = Column(String, nullable=False)
    metric = Column(String, nullable=False) # e.g., 'mean', 'row_count'
    condition = Column(String, nullable=False) # e.g., 'greater_than', 'less_than'
    value = Column(Float, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False, server_default='true')