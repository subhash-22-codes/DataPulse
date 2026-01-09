from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import jwt
import uuid
import os
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

limiter = Limiter(key_func=get_remote_address)


def get_current_user(
    request: Request, 
    db: Session = Depends(get_db),
    raise_error: bool = True 
) -> Optional[User]:
    # 1. Extraction
    token = request.cookies.get("access_token")
    if not token:
        logger.debug("❌ No access_token cookie found in request")
        if not raise_error: return None
        raise HTTPException(status_code=401, detail="Not authenticated")

    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    try:
        # 2. Decode
        payload = jwt.decode(
            token, 
            JWT_SECRET, 
            algorithms=[JWT_ALGORITHM],
            issuer="datapulse-auth",
            options={
                "require": ["exp", "iss", "sub"],
                "verify_iss": True           
            }
        )
        
        # 3. STRICT CLAIMS VALIDATION 
        user_id = payload.get("sub")
        token_version = payload.get("ver")
        token_type = payload.get("type")

        if token_version is None:
            raise HTTPException(status_code=401, detail="Missing security version")

        if token_type != "access":
            logger.warning(f"❌ Rejected token: Expected 'access', got '{token_type}'")
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        # Ensure user_id is present
        if not user_id:
            raise HTTPException(status_code=401, detail="Missing user identifier")

        try:
            user_uuid = uuid.UUID(user_id)
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(status_code=401, detail="Invalid user identifier")
            
        user = db.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")

        if user.token_version != token_version:
            logger.warning(
                f"🛡️ Security Reset Kick: User {user.email} "
                f"(Token v{token_version} vs DB v{user.token_version})"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Session invalidated due to security reset"
            )
            
        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")