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
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict

# Database & Auth
from sqlalchemy.orm import Session
from passlib.hash import bcrypt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# App Modules
from app.models.user import User
from app.core.database import get_db
from .dependencies import limiter

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
    token: str # <--- CHANGED BACK TO 'token' TO FIX FRONTEND
    user: dict 
    
class OtpResponse(BaseModel):
    msg: str

# ==========================
#  Routes
# ==========================

@router.post("/google", response_model=AuthResponse)
@limiter.limit("5/minute")
def google_login(request: Request, req: GoogleLoginRequest, db: Session = Depends(get_db)):
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

        # Use UTC for token expiration
        expiration = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
        payload = {"user_id": str(user.id), "email": user.email, "auth_type": user.auth_type, "exp": expiration}
        token_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        # --- FIX: Return 'token' instead of 'access_token' ---
        return {"token": token_jwt, "user": {"id": str(user.id), "email": user.email, "name": user.name}}

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
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
def login_email(request: Request, req: LoginEmailRequest, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for {req.email}")
    user = db.query(User).filter(User.email == req.email).first()
    
    auth_error = HTTPException(status_code=401, detail="Invalid email or password")

    if not user: raise auth_error
    if not user.is_verified: raise HTTPException(status_code=403, detail="Email not verified.")
    if not user.password_hash or not bcrypt.verify(req.password, user.password_hash): raise auth_error

    expiration = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    payload = {"user_id": str(user.id), "email": user.email, "auth_type": "email", "exp": expiration}
    token_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    logger.info(f"✅ User {req.email} logged in successfully.")
    
    # --- FIX: Return 'token' instead of 'access_token' ---
    return {"token": token_jwt, "user": {"id": str(user.id), "email": user.email, "name": user.name}}

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
    db.commit()
    return {"msg": "Password has been reset successfully"}