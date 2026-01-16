import uuid
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.feedback import Feedback
from app.models.user import User

# Configure logger for production visibility
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Feedback"])

# Constants
COOLDOWN_PERIOD = timedelta(hours=24)

class FeedbackCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=5000)
    page: Optional[str] = Field(None, description="The URL path where feedback was sent")

class FeedbackResponse(BaseModel):
    id: uuid.UUID
    message: str
    status: str = "success"

@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)

    # 1. Improved Query Logic
    last_feedback = db.query(Feedback).filter(
        Feedback.user_id == current_user.id
    ).order_by(desc(Feedback.created_at)).first()

    if last_feedback:
        # Normalize to UTC to avoid "offset-naive vs offset-aware" crashes
        last_created = last_feedback.created_at.replace(tzinfo=timezone.utc) if last_feedback.created_at.tzinfo is None else last_feedback.created_at
        
        time_since_last = now - last_created
        
        if time_since_last < COOLDOWN_PERIOD:
            remaining = COOLDOWN_PERIOD - time_since_last
            
            # Fix: Use math.ceil so "5 minutes left" shows as "1 hour" instead of "0 hours"
            # Or better yet, show minutes if under an hour.
            hours_left = math.ceil(remaining.total_seconds() / 3600)
            
            time_msg = f"{hours_left} hours" if hours_left > 1 else "1 hour"
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Feedback already received. Please wait {time_msg} before submitting again."
            )

    try:
        # 2. Hardened Creation
        new_feedback = Feedback(
            id=uuid.uuid4(),
            user_id=current_user.id,
            message=payload.message,
            page=payload.page or "unknown"
        )
        
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback) # Useful to ensure the object is bound to the session
        
        logger.info(f"Feedback {new_feedback.id} created by user {current_user.id}")
        
        return FeedbackResponse(
            id=new_feedback.id,
            message="Feedback submitted successfully"
        )
        
    except Exception as e:
        db.rollback()
        # 3. Log the actual error for the dev, but keep the response generic for the user
        logger.error(f"Failed to create feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System error. Please try again later."
        )