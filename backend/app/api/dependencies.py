# In app/api/dependencies.py

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
import jwt
import uuid
import os
from slowapi import Limiter # <-- NEW IMPORT
from slowapi.util import get_remote_address # <-- NEW IMPORT

from app.core.database import get_db
from app.models.user import User

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

limiter = Limiter(key_func=get_remote_address)

def get_current_user(
    authorization: str = Header(..., description="Authorization header with Bearer token"),
    db: Session = Depends(get_db)
) -> User:
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")