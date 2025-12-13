# In app/api/dependencies.py

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import jwt
import uuid
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.models.user import User

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

limiter = Limiter(key_func=get_remote_address)

def get_current_user(
    request: Request,  # <--- CHANGED: We need the whole Request to access Cookies
    db: Session = Depends(get_db)
) -> User:
    # 1. Get the token from the HttpOnly Cookie
    token = request.cookies.get("access_token")
    
    if not token:
        # If no cookie, they are not logged in.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Not authenticated"
        )

    # 2. Remove 'Bearer ' prefix
    # We saved it as "Bearer <token>" in auth.py, so we clean it here.
    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    try:
        # 3. Decode the JWT
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # 4. Extract User ID (Changed 'user_id' to 'sub' to match auth.py)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token claims")
            
        # 5. Find User in DB
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return user

    except jwt.ExpiredSignatureError:
        # This is where the Frontend Interceptor will catch the 401
        # and trigger the /refresh endpoint automatically.
        raise HTTPException(status_code=401, detail="Token expired")
        
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")