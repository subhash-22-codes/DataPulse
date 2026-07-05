from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import jwt
import uuid
import os
import logging
from app.core.database import get_db
from app.models.user import User
import datetime as dt

WS_TICKET_EXPIRE_SECONDS = 30

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_current_user(
    request: Request, 
    db: Session = Depends(get_db),
    raise_error: bool = True 
) -> Optional[User]:
    token = request.cookies.get("access_token")
    if not token:
        logger.debug("No access_token cookie found in request")
        if not raise_error: return None
        raise HTTPException(status_code=401, detail="Not authenticated")

    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    try:
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
        
        user_id = payload.get("sub")
        token_version = payload.get("ver")
        token_type = payload.get("type")

        if token_version is None:
            raise HTTPException(status_code=401, detail="Missing security version")

        if token_type != "access":
            logger.warning(f"Rejected token: Expected 'access', got '{token_type}'")
            raise HTTPException(status_code=401, detail="Invalid token type")
        
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
                f"Security Reset Kick: User {user.email} "
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
    
def create_ws_ticket(user: User) -> str:
    """
    A short-lived, single-purpose token used ONLY to open a WebSocket
    connection. Valid for 30 seconds — just long enough for the browser
    to fetch it and immediately use it to connect. This exists because
    cookies set on vercel.app can never be sent to onrender.com — they're
    different domains, no exception. This ticket travels in the WS URL
    itself instead of as a cookie.
    """
    payload = {
        "sub": str(user.id),
        "type": "ws_ticket",
        "ver": user.token_version,
        "iss": "datapulse-auth",
        "iat": dt.datetime.now(dt.timezone.utc),
        "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=WS_TICKET_EXPIRE_SECONDS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_ws_ticket(ticket: str, db: Session) -> User:
    """
    Validates a ws_ticket (NOT a normal access_token — the 'type' claim
    is checked to make sure a real access token can't be reused here,
    and vice versa). Raises ValueError on any failure; the WebSocket
    route catches this and closes the connection.
    """
    try:
        payload = jwt.decode(
            ticket,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer="datapulse-auth",
            options={"require": ["exp", "iss", "sub"], "verify_iss": True},
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Ticket expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid ticket")

    if payload.get("type") != "ws_ticket":
        raise ValueError("Wrong token type")

    user_id = payload.get("sub")
    token_version = payload.get("ver")

    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError, AttributeError):
        raise ValueError("Invalid user identifier")

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise ValueError("User not found")

    if user.token_version != token_version:
        raise ValueError("Session invalidated")

    return user