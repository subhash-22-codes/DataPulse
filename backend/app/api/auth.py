from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.database import get_db
from google.oauth2 import id_token
from google.auth.transport import requests
from passlib.hash import bcrypt
import os, jwt, datetime, random
from pydantic import BaseModel, EmailStr, field_validator
from .dependencies import limiter
from app.services.celery_worker import send_otp_email_task
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# =========================
# Utility: Generate OTP
# =========================
def generate_otp():
    return str(random.randint(100000, 999999))


# =========================
# 1. Google Login
# =========================
class GoogleLoginRequest(BaseModel):
    token: str


@router.post("/google")
@limiter.limit("5/minute")
def google_login(request: Request, req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        print("🔐 Verifying Google token...")
        idinfo = id_token.verify_oauth2_token(req.token, requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']
        name = idinfo.get('name', 'Google User')

        print(f"📧 Google login attempt: {email}")

        user = db.query(User).filter(User.email == email).first()

        if user:
            print(f"👤 Existing user found: {user.email} | Auth type: {user.auth_type}")
            if user.auth_type != "google":
                print("🚫 Auth type mismatch: trying Google on non-Google account")
                raise HTTPException(
                    status_code=400,
                    detail="This email is already registered using. Please login using Email."
                )
        else:
            print("✅ No existing user, creating new one via Google...")
            user = User(email=email, name=name, auth_type="google", is_verified=True)
            db.add(user)
            db.commit()
            db.refresh(user)

        payload = {
            "user_id": str(user.id),
            "email": user.email,
            "auth_type": user.auth_type,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }
        token_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        print("🎉 Google login successful, returning token")
        return {
            "token": token_jwt,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name
            }
        }

    except HTTPException as http_exc:
        raise http_exc  # Let FastAPI handle our manual 400s

    except ValueError:
        print("❌ Invalid Google token")
        raise HTTPException(status_code=401, detail="Invalid Google token")

    except Exception as e:
        print(f"🔥 Unhandled exception: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# =========================
# 2. Send OTP for Email Login/Registration  
# =========================

class SendOtpRequest(BaseModel):
    email: EmailStr


@router.post("/send-otp")
@limiter.limit("5/minute")
def send_otp(request: Request, req: SendOtpRequest, db: Session = Depends(get_db)):
    email = req.email
    logger.info(f"📩 Received OTP request for email: {email}")
    
    user = db.query(User).filter(User.email == email).first()

    if user:
        logger.info(f"🔍 Found existing user with email: {email}, auth_type: {user.auth_type}, verified: {user.is_verified}")
        
        if user.auth_type == "google":
            logger.warning("🚫 This email is registered with Google. Aborting.")
            raise HTTPException(status_code=400, detail="This email is registered via Google. Use Google Login.")
        
        elif user.auth_type == "email":
            if user.is_verified:
                logger.warning("🚫 This email is already verified. Asking user to login.")
                raise HTTPException(status_code=400, detail="This email is already verified. Please login instead.")
            
            # Unverified → resend OTP
            otp = generate_otp()
            expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
            user.otp_code = otp
            user.otp_expiry = expiry
            db.commit()
            logger.info(f"🔁 OTP re-generated and stored for {email}. Sending email...")
            send_otp_email_task.delay(email, otp, "verification")
            return {"msg": "OTP re-sent to your email"}
    
    else:
        logger.info(f"🆕 No user found with email: {email}. Creating new user with unverified status.")
        # New registration
        otp = generate_otp()
        expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        user = User(email=email, auth_type="email", is_verified=False, otp_code=otp, otp_expiry=expiry)
        db.add(user)
        db.commit()
        logger.info(f"✅ User created and OTP generated for {email}. Sending email...")
        send_otp_email_task.delay(email, otp, "verification")
        return {"msg": "OTP sent to your email"}


# =========================
# 3. Verify OTP and Set Password
# =========================
class VerifyOtpRequest(BaseModel):
    name: str  # <-- ADD THIS LINE
    email: EmailStr
    otp: str
    password: str

    @field_validator('password')
    def password_length(cls, v):
        if len(v) > 72:
            raise ValueError('Password cannot be longer than 72 characters')
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    name = req.name      # <-- ADD THIS LINE
    email = req.email
    otp = req.otp
    password = req.password
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.otp_code or not user.otp_expiry:
        raise HTTPException(status_code=400, detail="No OTP found. Request OTP again.")
    if datetime.datetime.utcnow() >= user.otp_expiry:
        raise HTTPException(status_code=400, detail="OTP expired")
    if user.otp_code != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Save name, password & mark verified
    user.name = name
    user.password_hash = bcrypt.hash(password)
    user.is_verified = True
    user.auth_type = "email"
    user.otp_code = None
    user.otp_expiry = None

    db.commit()

    return {"msg": "Email verified & password set successfully"}

# =========================
# 4. Email Login
# =========================
class LoginEmailRequest(BaseModel):
    email: EmailStr
    password: str

    # ADD THIS VALIDATOR FOR CONSISTENCY
    @field_validator('password')
    def password_length(cls, v):
        if len(v) > 72:
            raise ValueError('Password cannot be longer than 72 characters')
        return v


@router.post("/login-email")
@limiter.limit("10/minute") 
def login_email(request: Request, req: LoginEmailRequest, db: Session = Depends(get_db)):
    # THIS FUNCTION REMAINS EXACTLY THE SAME
    email = req.email
    password = req.password
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify before login.")

    if not user.password_hash or not bcrypt.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    payload = {
        "user_id": str(user.id),
        "email": user.email,
        "auth_type": "email",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    token_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "token": token_jwt,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name
        }
    }

class SendPasswordResetRequest(BaseModel):
    email: EmailStr
    
@router.post("/send-password-reset")
@limiter.limit("5/minute")
def send_password_reset_code(request: Request, req: SendPasswordResetRequest, db: Session = Depends(get_db)):
    email = req.email
    logger.info(f"Password reset requested for email: {email}")
    user = db.query(User).filter(User.email == email).first()

    # Only process if the user exists and uses email/password auth
    if user and user.auth_type == "email":
        otp = generate_otp()
        user.otp_code = otp
        user.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        db.commit()
        # Call our professional email service
        send_otp_email_task.delay(email, otp, "password_reset")
    
    # IMPORTANT: We always return a success message, even if the user doesn't exist.
    # This is a security best practice to prevent "email enumeration" attacks,
    # where hackers could guess which emails are registered.
    return {"msg": "If an account with that email exists, a password reset code has been sent."}



# =========================
# 6. Reset Password
# =========================
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str

    # ADD THIS VALIDATOR
    @field_validator('new_password')
    def password_length(cls, v):
        if len(v) > 72:
            raise ValueError('Password cannot be longer than 72 characters')
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = req.email
    reset_code = req.reset_code
    new_password = req.new_password
    logger.info(f"🔐 Password reset verification for email: {email}")
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        logger.warning(f"❌ Password reset attempt for non-existent email: {email}")
        raise HTTPException(status_code=404, detail="Invalid reset request")
    
    if user.auth_type == "google":
        logger.warning(f"🚫 Password reset attempt for Google account: {email}")
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in. Please use Google to sign in."
        )
    
    if not user.otp_code or not user.otp_expiry:
        logger.warning(f"❌ No reset code found for {email}")
        raise HTTPException(status_code=400, detail="Invalid or expired reset code. Please request a new one.")
    
    if datetime.datetime.utcnow() > user.otp_expiry:
        logger.warning(f"⏰ Expired reset code for {email}")
        user.otp_code = None
        user.otp_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")
    
    if user.otp_code != reset_code:
        logger.error(f"❌ Invalid reset code for {email}")
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    # Update password
    user.password_hash = bcrypt.hash(new_password)
    user.otp_code = None
    user.otp_expiry = None
    user.is_verified = True
    db.commit()
    
    logger.info(f"✅ Password successfully reset for {email}")
    return {"msg": "Password has been reset successfully"}