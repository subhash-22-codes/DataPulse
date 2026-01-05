from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse # Added for CSRF rejection
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware 
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.requests import Request
from app.api.dependencies import limiter
from app.core.logging import setup_logging
import logging
import os
import asyncio 
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.api import auth, workspaces, notifications, uploads, alerts, chat, user_action
from app.models import user, workspace, data_upload, notification, alert_rule, token
from app.core.guard import send_telegram_alert 

setup_logging()
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")

@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("APP_MODE") == "production":
        logger.info("Application starting in PRODUCTION mode.")
        asyncio.create_task(send_telegram_alert("🚀 System Online: DataPulse (Production)"))
        try:
            from app.services.tasks import schedule_data_fetches
            scheduler.add_job(
                schedule_data_fetches, 
                "interval", 
                minutes=5, 
                id="schedule_data_fetches_job"
            )
            scheduler.start()
            logger.info("✅ [APScheduler] 'Smart Watch' has started.")
        except Exception as e:
            logger.error(f"❌ [APScheduler] Failed to start: {e}", exc_info=True)
    else:
        logger.info("Application starting in DEVELOPMENT mode.")
    
    yield
    
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[APScheduler] 'Smart Watch' shut down.")

app = FastAPI(lifespan=lifespan)

# --- THE GUARDIAN MIDDLEWARE ---
@app.middleware("http")
async def guardian_middleware(request: Request, call_next):

    # 1. Always allow health check
    if request.url.path == "/ping":
        return await call_next(request)

    # 2. Always allow CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)

    # 3. CSRF protection for unsafe methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")

        # Routes that MUST work before CSRF cookie exists
        CSRF_EXEMPT_PATHS = {
            "/api/auth/login-email",
            "/api/auth/google",
            "/api/auth/github/callback",
        }

        if request.url.path not in CSRF_EXEMPT_PATHS:
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF validation failed"}
                )

    # 4. Continue request
    try:
        response = await call_next(request)

        # Optional: alert only for API 404s
        if response.status_code == 404 and request.url.path.startswith("/api"):
            asyncio.create_task(
                send_telegram_alert(
                    f"🟡 404 Warning\n"
                    f"Path: `{request.url.path}`\n"
                    f"Method: {request.method}"
                )
            )

        return response

    except HTTPException:
        raise

    except Exception as e:
        asyncio.create_task(
            send_telegram_alert(
                f"🚨 CRITICAL ERROR\n"
                f"Endpoint: `{request.method} {request.url.path}`\n"
                f"Error: `{str(e)}`"
            )
        )
        raise
 
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("JWT_SECRET"), 
    session_cookie="dp_session",
    same_site="none", 
    https_only=True 
)

# --- Rate Limiting Middleware ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS Middleware ---
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

origins = [
    frontend_url,
    "http://localhost:5173",
    "https://data-pulse-eight.vercel.app" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(user_action.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(chat.router, prefix="/api")



@app.get("/ping", tags=["Health"])
async def ping():
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/")
def root():
    return {"msg": "DataPulse backend is running 🔥", "mode": os.getenv("APP_MODE", "dev")}