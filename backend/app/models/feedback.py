import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, DateTime, ForeignKey, Text, SmallInteger, String, func
from app.core.database import Base
from sqlalchemy.orm import relationship


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # "bug" | "feature" | "general" | "praise"
    feedback_type = Column(String(20), nullable=False, default="general")

    # 1 = 😍  2 = 😊  3 = 😐  4 = 😕  5 = 😤  (nullable — user can skip mood)
    mood = Column(SmallInteger, nullable=True)

    message = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="feedbacks")