import os
import jwt
import logging
import datetime
import random
import uuid
import secrets
import string
from typing import Optional

# FastAPI & Pydantic
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Response, status
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict

# Database & Auth
from sqlalchemy.orm import Session
from passlib.hash import bcrypt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# App Modules
from app.models.user import User
from app.models.token import RefreshToken 
from app.core.database import get_db
from .dependencies import limiter
from app.api.dependencies import get_current_user 


DUMMY_HASH = "$2b$12$R.Sj9u7W9mD1jK3pI5oE3tY4n0X8zV6vB4aM7hL2cO0fP1qA3rI7l"
# --- Setup ---
logger = logging.getLogger(__name__)
APP_MODE = os.getenv("APP_MODE", "development")

# --- SMART SWITCH: Task Dispatcher ---
if APP_MODE == "production":
    logger.info("🚀 Auth running in PRODUCTION mode. Using asyncio tasks.")
    from app.services.tasks import send_otp_email_task_async
else:
    logger.info("🚚 Auth running in DEVELOPMENT mode. Using Celery.")
    try:
        from app.services.celery_worker import send_otp_email_task
    except ImportError as e:
        logger.warning(f"⚠️ Dev dependencies (Celery/Redis) missing: {e}")
        send_otp_email_task = None

router = APIRouter(prefix="/auth", tags=["Auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Security Standard
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Convenience Standard

# --- Helper: Secure OTP Generation ---
def generate_otp(length=6):
    return ''.join(secrets.choice(string.digits) for _ in range(length))

# --- Schemas ---
class GoogleLoginRequest(BaseModel):
    token: str

class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    name: str
    email: EmailStr
    otp: str
    password: str
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8: raise ValueError('Password must be at least 8 characters long')
        return v

class LoginEmailRequest(BaseModel):
    email: EmailStr
    password: str
    @field_validator('password')
    def validate_password_length(cls, v):
        if len(v) > 72: raise ValueError('Password cannot be longer than 72 characters')
        return v

class SendPasswordResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str
    @field_validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8: raise ValueError('Password must be at least 8 characters long')
        return v

# --- Response Schemas ---
class AuthResponse(BaseModel):
    message: str
    user: dict 
    # NOTICE: No 'token' here anymore! It's in the cookie.
    
class OtpResponse(BaseModel):
    msg: str

# ==========================
#   INTERNAL HELPER (DRY)
# ==========================
def create_tokens_and_set_cookies(response: Response, user: User, db: Session):
    """
    Generates Access/Refresh tokens, saves Refresh to DB, and sets HttpOnly cookies.
    Used by both Login and Google Auth.
    """
    # 1. Access Token (JWT) - Short Lived
    expiration = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_payload = {
        "sub": str(user.id), 
        "user_id": str(user.id),
        "email": user.email, 
        "auth_type": user.auth_type, 
        "type": "access",
        "exp": expiration
    }
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # 2. Refresh Token (UUID) - Long Lived
    refresh_token_str = str(uuid.uuid4())

    # 3. Save Refresh Token to DB
    new_refresh_token = RefreshToken(
        token=refresh_token_str,
        user_id=user.id,
        expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_refresh_token)
    db.commit()

    # 4. Set HttpOnly Cookies
    # Note: samesite="lax" works because we use the Vercel/Vite Proxy.
    
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=True, 
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

# ==========================
#   Routes
# ==========================

@router.post("/google", response_model=AuthResponse)
@limiter.limit("5/minute")
def google_login(response: Response, request: Request, req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(req.token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Invalid Google token: Email missing")
        name = idinfo.get('name', 'Google User')
        logger.info(f"Google login attempt: {email}")
        
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            if user.auth_type != "google":
                raise HTTPException(status_code=400, detail="This email is already registered using Email/Password.")
        else:
            user = User(email=email, name=name, auth_type="google", is_verified=True)
            db.add(user); db.commit(); db.refresh(user)

        # --- CHANGED: Use Helper to set Cookies ---
        create_tokens_and_set_cookies(response, user, db)
        
        return {
            "message": "Login successful",
            "user": {"id": str(user.id), "email": user.email, "name": user.name}
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Google login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/send-otp", response_model=OtpResponse)
@limiter.limit("5/minute")
def send_otp(request: Request, req: SendOtpRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = req.email
    logger.info(f"📩 Received OTP request for email: {email}")
    user = db.query(User).filter(User.email == email).first()

    if user:
        logger.info(f"🔍 Found existing user: {email}")
        if user.auth_type == "google":
            raise HTTPException(status_code=400, detail="This email is registered via Google. Use Google Login.")
        if user.is_verified:
            raise HTTPException(status_code=400, detail="This email is already verified. Please login instead.")
    else:
        logger.info(f"🆕 Creating new user: {email}")
        user = User(email=email, auth_type="email", is_verified=False)
        db.add(user)

    otp = generate_otp()
    expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)
    user.otp_code = otp
    user.otp_expiry = expiry
    db.commit()
    
    if APP_MODE == "production":
        background_tasks.add_task(send_otp_email_task_async, email, otp, "verification")
    else:
        if send_otp_email_task:
            send_otp_email_task.delay(email, otp, "verification")
            
    return {"msg": "OTP sent to your email"}

@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    logger.info(f"🔐 Verifying OTP for {req.email}")
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if not user.otp_code or not user.otp_expiry: raise HTTPException(status_code=400, detail="No pending OTP found.")
        
    now = datetime.datetime.now(datetime.timezone.utc)
    expiry = user.otp_expiry.replace(tzinfo=datetime.timezone.utc) if user.otp_expiry.tzinfo is None else user.otp_expiry
    
    if now >= expiry: raise HTTPException(status_code=400, detail="OTP has expired.")
    if user.otp_code != req.otp: raise HTTPException(status_code=400, detail="Invalid OTP code.")

    user.name = req.name
    user.password_hash = bcrypt.hash(req.password)
    user.is_verified = True
    user.auth_type = "email"
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    return {"msg": "Email verified & password set successfully"}

@router.post("/login-email", response_model=AuthResponse)
@limiter.limit("10/minute") 
def login_email(response: Response, request: Request, req: LoginEmailRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for {req.email}")
    
    # Define the generic authentication error response
    auth_error = HTTPException(status_code=401, detail="Invalid email or password")
    
    # 1. Look up the user
    user = db.query(User).filter(User.email == req.email).first()
    
    # 2. Handle User Not Found (Timing Attack Prevention)
    if not user:
        # NOTE: This block is crucial. If user is None, you must stop execution here.
        # Dummy check to simulate time taken for security (using your valid DUMMY_HASH)
        try:
            bcrypt.verify("fake", DUMMY_HASH) 
        except Exception:
            pass # Ignore errors, the purpose is time consumption
        
        raise auth_error  # <-- CRITICAL FIX: Raise the error and exit the function

    # --- Execution continues only if 'user' is NOT None ---

    # 3. Handle Unverified User (Optional, but recommended)
    if not user.is_verified: 
        raise HTTPException(status_code=403, detail="Email not verified.")
        
    # 4. Handle Password Verification
    if not user.password_hash or not bcrypt.verify(req.password, bcrypt.normhash(user.password_hash)): 
        raise auth_error

    logger.info(f"✅ User {req.email} logged in successfully.")
    
    # ... rest of your successful login logic ...
    create_tokens_and_set_cookies(response, user, db)
    
    return {
        "message": "Login successful",
        "user": {"id": str(user.id), "email": user.email, "name": user.name}
    }
#Check session for refresh token
@router.get("/session-check")
def check_session(current_user: User = Depends(get_current_user)):
    """
    Checks for a valid access_token cookie using the dependency.
    If valid, returns the user object (HTTP 200 OK).
    If invalid, the dependency raises a 401 error.
    """
    # The 'current_user' is guaranteed to be a valid, authenticated user object here.
    return {"user": current_user}

# --- NEW: Refresh Endpoint ---
@router.post("/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token_str = request.cookies.get("refresh_token")
    if not refresh_token_str:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token_str,
        RefreshToken.revoked == False
    ).first()

    if not db_token:
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Invalid token")

    if db_token.expires_at < datetime.datetime.now():
        raise HTTPException(status_code=401, detail="Token expired")

    # Issue NEW Access Token
    user = db_token.user
    expiration = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id), 
        "user_id": str(user.id),
        "email": user.email, 
        "auth_type": user.auth_type, 
        "type": "access",
        "exp": expiration
    }
    new_access_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    response.set_cookie(
        key="access_token",
        value=f"Bearer {new_access_token}",
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"message": "Token refreshed"}

# --- NEW: Logout Endpoint ---
@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token_str = request.cookies.get("refresh_token")
    
    if refresh_token_str:
        db_token = db.query(RefreshToken).filter(RefreshToken.token == refresh_token_str).first()
        if db_token:
            db.delete(db_token)
            db.commit()
    
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    
    return {"message": "Logged out"}


@router.post("/send-password-reset")
@limiter.limit("5/minute")
def send_password_reset_code(request: Request, req: SendPasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = req.email
    logger.info(f"Password reset requested for email: {email}")
    user = db.query(User).filter(User.email == email).first()

    if user and user.auth_type == "email":
        otp = generate_otp()
        expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)
        user.otp_code = otp
        user.otp_expiry = expiry
        db.commit()
        
        if APP_MODE == "production":
            background_tasks.add_task(send_otp_email_task_async, email, otp, "password_reset")
        else:
            if send_otp_email_task:
                send_otp_email_task.delay(email, otp, "password_reset")
    
    return {"msg": "If an account with that email exists, a password reset code has been sent."}

@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    logger.info(f"🔐 Password reset verification for email: {req.email}")
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user: raise HTTPException(status_code=404, detail="Invalid reset request")
    if user.auth_type == "google": raise HTTPException(status_code=400, detail="Use Google sign-in.")
    if not user.otp_code or not user.otp_expiry: raise HTTPException(status_code=400, detail="Invalid/expired code.")
        
    now = datetime.datetime.now(datetime.timezone.utc)
    expiry = user.otp_expiry.replace(tzinfo=datetime.timezone.utc) if user.otp_expiry.tzinfo is None else user.otp_expiry
    
    if now > expiry:
        user.otp_code = None; user.otp_expiry = None; db.commit()
        raise HTTPException(status_code=400, detail="Reset code has expired.")
        
    if user.otp_code != req.reset_code: raise HTTPException(status_code=400, detail="Invalid reset code")

    user.password_hash = bcrypt.hash(req.new_password)
    user.otp_code = None; user.otp_expiry = None; user.is_verified = True
    
    # --- SECURITY UPGRADE: Kill all active sessions ---
    # Since they reset the password, we should force logout everywhere.
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    
    db.commit()
    return {"msg": "Password has been reset successfully. Please login again."}