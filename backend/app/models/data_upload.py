# In app/models/data_upload.py

import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text # <-- NEW: Import Text

from app.core.database import Base

class DataUpload(Base):
    __tablename__ = "data_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    
    upload_type = Column(String(50), nullable=False)

    # --- CHANGE: This will now store the ORIGINAL filename, not a server path ---
    file_path = Column(String, nullable=False)
    
    # --- NEW: This column will store the entire content of the CSV file ---
    file_content = Column(Text, nullable=True) # Making it nullable for a smooth migration

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    schema_info = Column(JSON, nullable=True)
    schema_changed_from_previous = Column(Boolean, default=False)
    analysis_results = Column(JSON, nullable=True)