import uuid
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.core.limiter import limiter
from app.models.feedback import Feedback
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["Feedback"])

FEEDBACK_COOLDOWN_DAYS = 30

VALID_TYPES = {"bug", "feature", "general", "praise"}


class FeedbackCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=500)
    feedback_type: str = Field(default="general")
    mood: int | None = Field(default=None, ge=1, le=5)

    @field_validator("feedback_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in VALID_TYPES:
            raise ValueError(f"feedback_type must be one of: {', '.join(VALID_TYPES)}")
        return v


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    message: str
    status: str = "success"


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_feedback(
    request: Request,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(payload.message.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Message must be at least 5 non-whitespace characters.",
            )
    # --- 30-day cooldown check ---
    if current_user.last_feedback_at is not None:
        cooldown_until = current_user.last_feedback_at + timedelta(days=FEEDBACK_COOLDOWN_DAYS)
        now = datetime.now(timezone.utc)

        if now < cooldown_until:
            days_left = (cooldown_until - now).days + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"COOLDOWN:{days_left}",  # frontend parses this to show days left
            )

    try:
        new_feedback = Feedback(
            user_id=current_user.id,
            message=payload.message,
            feedback_type=payload.feedback_type,
            mood=payload.mood,
        )
        db.add(new_feedback)

        # Stamp the cooldown timer on the user
        current_user.last_feedback_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(new_feedback)

        logger.info(
            f"Feedback {new_feedback.id} | type={payload.feedback_type} "
            f"| mood={payload.mood} | user={current_user.id}"
        )

        return FeedbackResponse(
            id=new_feedback.id,
            message="Feedback submitted successfully",
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DB_ERROR",
        )