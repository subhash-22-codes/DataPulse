import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.feedback import Feedback
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["Feedback"])

class FeedbackCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=5000)

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
    # 1. One-Time Check: Use the new User column
    if current_user.is_feedback_submitted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have already submitted feedback. Thank you!"
        )

    try:
        # 2. Save the feedback
        new_feedback = Feedback(
            user_id=current_user.id,
            message=payload.message,
        )
        db.add(new_feedback)
        
        # 3. Flip the switch: Lock the user out forever
        current_user.is_feedback_submitted = True
        
        db.commit()
        db.refresh(new_feedback)
        
        logger.info(f"Feedback {new_feedback.id} created by user {current_user.id}")
        
        return FeedbackResponse(
            id=new_feedback.id,
            message="Feedback submitted successfully"
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System error. Please try again later."
        )