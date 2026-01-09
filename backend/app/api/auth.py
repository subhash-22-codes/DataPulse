import os
import jwt
import logging
import uuid
import datetime as dt
import secrets
import string
import re
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID
# FastAPI & Pydantic
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from fastapi.responses import RedirectResponse

# Database & Auth
from sqlalchemy.orm import Session
from passlib.hash import bcrypt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from authlib.integrations.starlette_client import OAuth
# App Modules
from app.models.user import User
from app.models.token import RefreshToken 
from app.core.database import get_db
from .dependencies import limiter
from app.api.dependencies import get_current_user
from app.models.user import LoginHistory 
from app.services.email_service import send_farewell_email
from app.models.workspace import workspace_team
from app.core.guard import send_telegram_alert
from app.core.database import SessionLocal
import time

t0 = time.perf_counter()
def log(step):
    elapsed = time.perf_counter() - t0
    logger.info(f"[LOGIN TIMING] {step}: +{elapsed:.3f}s")

    

DUMMY_HASH = bcrypt.hash("dummy-password-for-timing-attack")

logger = logging.getLogger(__name__)

APP_MODE = os.getenv("APP_MODE", "development")


if APP_MODE == "production":
    logger.info("🚀 Auth running in PRODUCTION mode. Using asyncio background tasks.")
    from app.services.tasks import send_otp_email_task_async
else:
    logger.info("🚚 Auth running in DEVELOPMENT mode. Using Celery.")
    try:
        from app.services.celery_worker import send_otp_email_task
    except ImportError as e:
        logger.warning(f"⚠️ Dev dependencies missing: {e}")
        send_otp_email_task = None
        
# Credentials
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/api/auth/github/callback")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
MAX_LOGIN_HISTORY = 10
        
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),       
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"), 
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
oauth.register(
    name='github',
    client_id=GITHUB_CLIENT_ID,
    client_secret=GITHUB_CLIENT_SECRET,
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def generate_otp(length=6):
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def record_login_history_task(
    user_id: int, 
    provider: str, 
    ip_address: str, 
    user_agent: str
):
    db = SessionLocal() # 🛡️ Independent session
    try:
        new_log = LoginHistory(
            user_id=user_id,
            provider=provider,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=dt.datetime.now(dt.timezone.utc)
        )
        db.add(new_log)
        
        old_logs_query = db.query(LoginHistory.id).filter(
            LoginHistory.user_id == user_id
        ).order_by(LoginHistory.created_at.desc()).offset(MAX_LOGIN_HISTORY)
        
        db.query(LoginHistory).filter(
            LoginHistory.id.in_(old_logs_query)
        ).delete(synchronize_session=False)

        db.commit() 
        logger.info(f"🛡️ Security audit completed for User ID: {user_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"⚠️ Background Audit Failed: {str(e)}")
    finally:
        db.close() # 🛡️ Always close the background connection

def create_tokens_and_set_cookies(
    request: Request, 
    response: Response, 
    user: User, 
    db: Session, 
    provider: str,
    background_tasks: BackgroundTasks 
):
    background_tasks.add_task(
        record_login_history_task,
        user.id,
        provider,
        request.client.host if request.client else "unknown",
        request.headers.get("user-agent", "unknown")
    )

    access_token = jwt.encode({
        "sub": str(user.id), 
        "type": "access",
        "ver": user.token_version,
        "iss": "datapulse-auth", 
        "iat": dt.datetime.now(dt.timezone.utc),
        "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    refresh_token_str = str(uuid.uuid4())
    db.add(RefreshToken(
        token=refresh_token_str,
        user_id=user.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))

    cookie_params = {
        "secure": True, 
        "samesite": "none", 
        "httponly": True,
    }

    response.set_cookie(
        key="access_token", 
        value=access_token, 
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60, 
        **cookie_params
    )

    response.set_cookie(
        key="refresh_token", 
        value=refresh_token_str, 
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        **cookie_params
    )


def get_or_create_social_user(
    db: Session, 
    email: str, 
    name: str, 
    provider: str, 
    provider_id: str,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = None
):
    
    provider_map = {
        "google": "google_id",
        "github": "github_id"
    }
    
    # Now field_attr will be "google_id" (a string)
    field_attr = provider_map.get(provider) 
    
    if not field_attr:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    
    # ✅ Now getattr(User, "google_id") will work perfectly
    existing_social_owner = db.query(User).filter(
        getattr(User, field_attr) == provider_id 
    ).with_for_update().first()

    if current_user:
        if existing_social_owner and existing_social_owner.id != current_user.id:
            logger.error(f"❌ Conflict: {provider} ID {provider_id} belongs to another user.")
            raise HTTPException(
                status_code=409,
                detail=f"This {provider} account is already linked to a different DataPulse user."
            )

        if current_user.email != email:
            logger.error(f"❌ Identity Mismatch: {current_user.id} tried linking {email}")
            raise HTTPException(
                status_code=400, 
                detail=f"Email mismatch. Use the {provider} account associated with {current_user.email}."
            )

        setattr(current_user, field_attr, provider_id)
        logger.info(f"✅ Linked {provider} to User ID: {current_user.id}")
        return current_user

    if existing_social_owner:
        if existing_social_owner.email != email:
             logger.warning(f"⚠️ Provider email changed for {existing_social_owner.id}. Updating logs.")
        
        return existing_social_owner

    user_by_email = db.query(User).filter(User.email == email).with_for_update().first()
    
    if user_by_email:
        if user_by_email.is_verified:     
            if current_user:
                if current_user.id == user_by_email.id:
                    setattr(user_by_email, field_attr, provider_id)
                    return user_by_email
                else:
                    raise HTTPException(status_code=400, detail="This email is associated with another account.")

            logger.warning(f"🛡️ Security Block: {email} exists via {user_by_email.signup_method}. Denying {provider}.")
            raise HTTPException(
                status_code=400,
                detail=f"An active account with this email already exists. Please login and link {provider} in Settings."
            )

        # If existing account is UNVERIFIED, claim it
        setattr(user_by_email, field_attr, provider_id)
        user_by_email.is_verified = True
        return user_by_email


    logger.info(f"✨ Creating new identity via {provider}: {email}")
    if background_tasks:
        # This is the safe, non-crashing way to send the alert
        background_tasks.add_task(
            send_telegram_alert, 
            f"✨ **NEW USER JOINED!**\nVia: {provider}\nEmail: {email}"
        )
    new_user = User(
        email=email, 
        name=name, 
        is_verified=True, 
        signup_method=provider, 
        auth_type=provider
    )
    setattr(new_user, field_attr, provider_id)
    
    db.add(new_user)
    db.flush()
    return new_user

# ==========================
#   SCHEMAS
# ==========================
class LoginHistorySchema(BaseModel):
    id: Union[UUID, str]
    provider: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime 
    model_config = ConfigDict(from_attributes=True)

class LoginHistoryListResponse(BaseModel):
    status: str = "success"
    history: List[LoginHistorySchema]

class UserResponse(BaseModel):
    id: Union[UUID, str]
    email: EmailStr
    name: Optional[str] = None
    google_id: Optional[str] = None
    github_id: Optional[str] = None
    signup_method: str = "email" 
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    
class GoogleLoginRequest(BaseModel): token: str
class SendOtpRequest(BaseModel): 
    email: EmailStr

    @field_validator('email')
    def normalize_email(cls, v):
        return v.lower().strip()

class VerifyOtpRequest(BaseModel):
    name: str
    email: EmailStr
    otp: str
    password: str

    @field_validator('email', mode='before')
    @classmethod
    def normalize_email(cls, v):
        return v.lower().strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")

        return v

    
class LoginEmailRequest(BaseModel):
    email: EmailStr; password: str
    @field_validator('password')
    def val_pass_len(cls, v):
        if len(v) > 72: raise ValueError('Password too long')
        return v
class SendPasswordResetRequest(BaseModel): email: EmailStr
class ResetPasswordRequest(BaseModel):
    email: EmailStr; reset_code: str; new_password: str
    @field_validator('new_password')
    def val_new_p(cls, v):
        if len(v) < 8: raise ValueError('Password too short')
        return v

class OtpResponse(BaseModel): msg: str


@router.get("/google/link")
@limiter.limit("5/minute")
async def google_link_redirect(request: Request, return_to: str = "/home"):
    if not return_to.startswith("/"):
        return_to = "/home"
        
    logger.info(f"🔗 [GOOGLE] Initiating link. Target: {return_to}")
    request.session["post_oauth_redirect"] = return_to
    
    return await oauth.google.authorize_redirect(
        request, 
        GOOGLE_REDIRECT_URI,
        prompt="select_account" 
    )

@router.get("/google/callback")
@limiter.limit("5/minute")
async def google_callback(
    request: Request, 
    background_tasks: BackgroundTasks, # ⬅️ 1. Moved here and removed '= None'
    db: Session = Depends(get_db)
):
    try:
        destination = request.session.pop("post_oauth_redirect", "/home")
        current_user = None
        try:
            current_user = get_current_user(request, db)
        except HTTPException:
            current_user = None

        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info or not user_info.get("email_verified"):
            logger.warning("⚠️ [GOOGLE] Auth failed: Email not verified.")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=email_not_verified")

        email = user_info['email']
        google_id = str(user_info['sub'])

        try:
            user = get_or_create_social_user(
                db, 
                email=email, 
                name=user_info.get('name', 'User'), 
                provider="google", 
                provider_id=google_id,
                current_user=current_user,
                background_tasks=background_tasks
            )
        except HTTPException as e:
            logger.warning(f"⚠️ Google Link Blocked: {e.detail}")
            return RedirectResponse(url=f"{FRONTEND_URL}/account?error={e.detail.replace(' ', '_')}")

        response = RedirectResponse(url=f"{FRONTEND_URL}{destination}")

        create_tokens_and_set_cookies(request, response, user, db, 'google', background_tasks)       
        
        logger.info(f"🚀 [GOOGLE] Success: {user.email} landed at {destination}")
        
        db.commit()      
        return response

    except Exception as e:
        logger.error(f"❌ [GOOGLE] Callback Critical Failure: {str(e)}", exc_info=True)
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

@router.get("/github/link")
@limiter.limit("5/minute")
async def github_link(request: Request, return_to: str = "/home"):
    if not return_to.startswith("/"):
        return_to = "/home"
        
    logger.info(f"🔗 [GITHUB] Initiating link. Target: {return_to}")
    request.session["post_oauth_redirect"] = return_to 
    
    return await oauth.github.authorize_redirect(
        request, 
        GITHUB_REDIRECT_URI,
        prompt="login"
    )

@router.get("/github/callback")
@limiter.limit("5/minute")
async def github_callback( request: Request, background_tasks: BackgroundTasks,  db: Session = Depends(get_db)):
    destination = request.session.pop("post_oauth_redirect", "/home")
    
    current_user = None
    try:
        current_user = get_current_user(request, db)
    except HTTPException:
        current_user = None 

    error_redirect_path = "/account" if current_user else "/login"

    try:
        token = await oauth.github.authorize_access_token(request)
        if not token:
            return RedirectResponse(url=f"{FRONTEND_URL}{error_redirect_path}?error=token_exchange_failed")

        email_res = await oauth.github.get('user/emails', token=token)
        primary_email = next((e['email'] for e in email_res.json() if e['primary'] and e['verified']), None)
        
        if not primary_email:
            return RedirectResponse(url=f"{FRONTEND_URL}{error_redirect_path}?error=email_not_verified")

        profile_res = await oauth.github.get('user', token=token)
        profile = profile_res.json()
        gh_id = str(profile.get("id"))

        try:
            user = get_or_create_social_user(
                db, 
                email=primary_email, 
                name=profile.get("name") or profile.get("login"), 
                provider="github", 
                provider_id=gh_id,
                current_user=current_user,
                background_tasks=background_tasks
            )
            
        except HTTPException as e:
            error_msg = e.detail.replace(' ', '_')
            return RedirectResponse(url=f"{FRONTEND_URL}{error_redirect_path}?error={error_msg}")

        response = RedirectResponse(url=f"{FRONTEND_URL}{destination}")
        
        # 🛡️ Audit happens in background before redirect
        create_tokens_and_set_cookies(request, response, user, db, 'github', background_tasks)
        
        db.commit()      
        return response

    except Exception as e:
        logger.error(f"❌ GitHub Callback Failed: {str(e)}", exc_info=True)
        return RedirectResponse(url=f"{FRONTEND_URL}{error_redirect_path}?error=github_auth_failed")

@router.post("/google", response_model=AuthResponse)
@limiter.limit("5/minute")
def google_login(
    request: Request, 
    response: Response, 
    req: GoogleLoginRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        try:
            idinfo = id_token.verify_oauth2_token(req.token, google_requests.Request(), GOOGLE_CLIENT_ID)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid or expired Google token")

        email = idinfo.get('email')
        if not email or not idinfo.get('email_verified'):
            raise HTTPException(status_code=400, detail="Verified Google account required.")

        user = get_or_create_social_user(
            db, email, idinfo.get('name', 'User'), "google", idinfo.get('sub'), background_tasks
        )
        logger.info(f"✅ Google login success: {user.email}")
     
        create_tokens_and_set_cookies(request, response, user, db, 'google', background_tasks)

        db.commit()
        db.refresh(user) 

        return {
            "message": "Login successful", 
            "user": {
                "id": str(user.id), 
                "email": user.email, 
                "name": user.name,
                "google_id": user.google_id,
                "github_id": user.github_id,
                "signup_method": user.signup_method,
                "created_at": user.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Google Auth Critical Failure: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal authentication server error")
    
    
@router.post("/login-email", response_model=AuthResponse)
@limiter.limit("5/minute")
def login_email(
    request: Request,
    response: Response,
    req: LoginEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    auth_err = HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )

    log("start")
    email = req.email.lower()
    user = db.query(User).filter(User.email == email).first()
    log("after db user lookup")
    
    if not user:
        bcrypt.verify(req.password, DUMMY_HASH)
        raise auth_err

    if not user.is_verified:
        raise auth_err

    if not user.password_hash:
        provider = user.signup_method or "social provider"
        raise HTTPException(
            status_code=400,
            detail=f"Account exists via {provider}. Please login using that."
        )

    if not bcrypt.verify(req.password, user.password_hash):
        log("after bcrypt verify (fail)")
        raise auth_err
    log("after bcrypt verify (success)")

    if bcrypt.needs_update(user.password_hash):
        user.password_hash = bcrypt.hash(req.password)

    logger.info(f"✅ Email login success: {user.email}")

    create_tokens_and_set_cookies(request, response, user, db, 'email', background_tasks)
    log("after token creation")

    db.commit()
    log("after db commit")
    db.refresh(user)
    log("after db refresh")

    return {
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "google_id": user.google_id,
            "github_id": user.github_id,
            "signup_method": user.signup_method,
            "created_at": user.created_at
        }
    }


    
@router.post("/send-otp", response_model=OtpResponse)
@limiter.limit("5/minute")
def send_otp(request: Request, req: SendOtpRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email_normalized = req.email.lower().strip()
    
    user = db.query(User).filter(User.email == email_normalized).with_for_update().first()

    if user and user.is_verified and user.password_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already active. Please login.")
    
    now = dt.datetime.now(dt.timezone.utc)
    if user and user.last_otp_requested_at:
        if now < user.last_otp_requested_at + dt.timedelta(seconds=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                detail="Please wait 60 seconds before requesting another OTP."
            )

    if not user:
        user = User(email=email_normalized, signup_method="email", auth_type="email", is_verified=False)
        db.add(user)

    raw_otp = generate_otp()
    hashed_otp = bcrypt.hash(raw_otp) 
    
    expiry = now + dt.timedelta(minutes=5)
    
    user.otp_code = hashed_otp
    user.otp_expiry = expiry
    user.otp_attempts = 0 
    user.last_otp_requested_at = now
    
    db.commit()
    
    if APP_MODE == "production":
        background_tasks.add_task(send_otp_email_task_async, email_normalized, raw_otp, "verification")
    elif send_otp_email_task:
        send_otp_email_task.delay(email_normalized, raw_otp, "verification")
            
    return {"msg": "OTP sent to your email"}


@router.post("/verify-otp")
@limiter.limit("5/minute")
def verify_otp(request: Request, req: VerifyOtpRequest, background_tasks: BackgroundTasks ,db: Session = Depends(get_db)):
    logger.info("✅ verify_otp endpoint HIT")
    email_normalized = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_normalized).with_for_update().first()
    
    generic_err = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP request")

    if not user or not user.otp_code:
        raise generic_err

    if user.otp_attempts >= 5:
        user.otp_code = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Too many failed attempts. Request a new OTP.")

    if not user.otp_expiry or dt.datetime.now(dt.timezone.utc) >= user.otp_expiry:
        raise generic_err

    if not bcrypt.verify(req.otp, user.otp_code):
        user.otp_attempts += 1
        db.commit()
        raise generic_err

    user.otp_code = None 
    user.otp_expiry = None
    user.otp_attempts = 0
    user.last_otp_requested_at = None
    db.flush() # Push changes to DB but keep transaction open

    user.name = req.name
    user.password_hash = bcrypt.hash(req.password)
    user.is_verified = True
    
    db.commit()

    if background_tasks:
        background_tasks.add_task(
            send_telegram_alert, 
            f"✨ **NEW USER VERIFIED!**\nName: {req.name}\nEmail: {email_normalized}"
        )
    
    return {"msg": "Email verified & password set successfully"}


# ==========================
#   PASSWORD RESET
# ==========================
@router.post("/send-password-reset")
@limiter.limit("3/minute")
def send_password_reset(request: Request, req: SendPasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        
        otp = generate_otp()
        expiry = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=10)
        
        user.otp_code = otp
        user.otp_expiry = expiry 
        db.commit()
        
        if APP_MODE == "production":
            background_tasks.add_task(send_otp_email_task_async, req.email, otp, "password_reset")
        elif send_otp_email_task:
            send_otp_email_task.delay(req.email, otp, "password_reset")
    
    return {"msg": "If an account exists, a reset code has been sent."}

@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user or user.otp_code != req.reset_code:
        raise HTTPException(status_code=400, detail="Invalid reset code.")

    now = dt.datetime.now(dt.timezone.utc)
    
    if not user.otp_expiry or now > user.otp_expiry:
        raise HTTPException(status_code=400, detail="Code expired.")

    user.password_hash = bcrypt.hash(req.new_password)
    user.otp_code = None
    user.otp_expiry = None
    user.is_verified = True
    
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.commit()
    
    return {"msg": "Password updated successfully."}

#   SESSION MANAGEMENT
@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    rt = request.cookies.get("refresh_token")
    if rt:
        db.query(RefreshToken).filter(
            RefreshToken.token == rt
        ).delete(synchronize_session=False)
        db.commit()

    # Clear cookies 
    cookie_params = {
        "samesite": "none",
        "secure": True,
        "httponly": True,
        "path": "/" # Adding path is safer to ensure it clears everywhere
    }

    response.delete_cookie("access_token", **cookie_params)
    response.delete_cookie("refresh_token", **cookie_params)

    # CRITICAL: Do NOT return a new JSONResponse. 
    # Just return a dict or update the response object.
    return {"message": "Logged out successfully"}


@router.get("/session-check", response_model=AuthResponse)
def check_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return {
        "message": "Session active",
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.name,
            "google_id": current_user.google_id,
            "github_id": current_user.github_id,
            "signup_method": current_user.signup_method,
            "created_at": current_user.created_at
        }
    }
    
@router.get("/security/login-history")
def get_login_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    try:
        recent_logs = (
            db.query(LoginHistory)
            .filter(LoginHistory.user_id == current_user.id)
            .order_by(LoginHistory.created_at.desc())
            .limit(10) 
            .all()
        )

        history = [
            {
                "id": str(log.id),
                "provider": log.provider,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at
            }
            for log in recent_logs
        ]

        return {
            "status": "success",
            "history": history
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch login history for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve security activity.")

@router.post("/refresh")
@limiter.limit('10/minute')
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    old_rt_value = request.cookies.get("refresh_token")
    if not old_rt_value:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    db_token = db.query(RefreshToken).filter(RefreshToken.token == old_rt_value).with_for_update().first()
    
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh session")

    if db_token.revoked:
        # Security Action: Revoke every single token this user has
        db.query(RefreshToken).filter(RefreshToken.user_id == db_token.user_id).delete()
        # Increment token version to invalidate existing Access Tokens (JWTs)
        db_token.user.token_version += 1
        db.commit()
        raise HTTPException(status_code=401, detail="Security breach detected. Please login again.")

    now = dt.datetime.now(dt.timezone.utc)
    if db_token.expires_at < now:
        db_token.revoked = True # Clean up DB state
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh session expired")

    user = db_token.user
    new_rt_value = str(uuid.uuid4())
    
    new_refresh_token = RefreshToken(
        token=new_rt_value,
        user_id=user.id,
        expires_at=now + dt.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_refresh_token)
    db_token.revoked = True
    db_token.last_used_at = now
    db_token.replaced_by_token = new_rt_value
    

    access_exp = now + dt.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),  
        "type": "access", 
        "ver": user.token_version,
        "iss": "datapulse-auth",
        "iat": now,
        "exp": access_exp
    }
    new_at = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    db.commit()

    cookie_params = {
        "httponly": True,
        "secure": True,
        "samesite": "none",
    }
    
    response.set_cookie(
        key="access_token", 
        value=f"{new_at}", 
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **cookie_params
    )
    
    response.set_cookie(
        key="refresh_token", 
        value=new_rt_value, 
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        **cookie_params
    )

    return {"message": "Tokens rotated successfully"}


@router.delete("/me")
@limiter.limit("5/minute")
async def delete_account(
    request: Request,
    background_tasks: BackgroundTasks,
    response: Response, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    user_email = current_user.email
    user_name = current_user.name

    try:
        logger.warning(f"🚨 SCRUB INITIATED: User {user_email}")

        db.execute(workspace_team.delete().where(workspace_team.c.user_id == current_user.id))

        db.delete(current_user)
        db.commit()

        # Clear Cookies
        cookie_params = {
            "samesite": "none",
            "secure": True,
            "httponly": True,
            "path": "/"
        }
        response.delete_cookie("access_token", **cookie_params)
        response.delete_cookie("refresh_token", **cookie_params)

        background_tasks.add_task(send_farewell_email, user_email, user_name)
        background_tasks.add_task(
            send_telegram_alert, 
            f"RED ALERT: USER DELETED ACCOUNT\n"
            f"Name: {user_name}\n"
            f"Email: {user_email}\n"
            f"Status: Data Scrubbed"
        )

        return {"message": "Identity scrubbed. We hope to see you again!"}

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Scrub failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Account deletion failed.")
    

@router.post("/unlink/{provider}")
def unlink_provider(
    provider: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):

    logger.info(f"🛡️ Unlink request for {provider} from user: {current_user.email}")
    has_password = current_user.password_hash is not None
    has_google = current_user.google_id is not None
    has_github = current_user.github_id is not None

    if provider == "google":
        if not (has_password or has_github):
            logger.warning(f"🚫 Blocked unlink: {current_user.email} tried to remove their only login (Google)")
            raise HTTPException(
                status_code=400, 
                detail="Security Alert: You cannot remove your only login method. Please link GitHub or set a password first."
            )
    
    elif provider == "github":
        if not (has_password or has_google):
            logger.warning(f"🚫 Blocked unlink: {current_user.email} tried to remove their only login (GitHub)")
            raise HTTPException(
                status_code=400, 
                detail="Security Alert: You cannot remove your only login method. Please link Google or set a password first."
            )
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider requested for unlinking.")

    try:
        if provider == "google":
            current_user.google_id = None
        elif provider == "github":
            current_user.github_id = None
        
        db.commit()
        logger.info(f"✅ Successfully unlinked {provider} for {current_user.email}")
        
        return {
            "status": "success",
            "message": f"Successfully disconnected {provider} from your DataPulse identity.",
            "user": {
                "google_id": current_user.google_id,
                "github_id": current_user.github_id
            }
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Database error during unlink: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during account disconnection.")
    
@router.post("/logout-all")
def logout_from_all_devices(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        current_user.token_version += 1
    
        db.query(RefreshToken).filter(
            RefreshToken.user_id == current_user.id
        ).delete(synchronize_session=False)
        

        from app.models.user import LoginHistory
        reset_event = LoginHistory(
            user_id=current_user.id,
            provider="security_reset",
            ip_address="system",
            user_agent="Global Security Reset (All sessions terminated)"
        )
        db.add(reset_event)
        
        old_logs = db.query(LoginHistory.id).filter(
            LoginHistory.user_id == current_user.id
        ).order_by(LoginHistory.created_at.desc()).offset(10).all()
        
        if old_logs:
            ids_to_del = [log.id for log in old_logs]
            db.query(LoginHistory).filter(LoginHistory.id.in_(ids_to_del)).delete(synchronize_session=False)

        # Commit all changes
        db.commit()

        response = JSONResponse(content={"message": "Global identity reset successful"})

        cookie_settings = {
            "samesite": "none",
            "secure": True,
            "httponly": True
        }
        
        response.delete_cookie(key="access_token", **cookie_settings)
        response.delete_cookie(key="refresh_token", **cookie_settings)
        
        return response

    except Exception as e:
        db.rollback()
        logger.error(f"🚨 Global logout failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to perform security reset")
    
@router.get("/test-crash-guard")
async def test_crash_guard():
    result = 1 / 0 
    return {"msg": result}