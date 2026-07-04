from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware 
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.requests import Request
from app.core.limiter import limiter
from app.core.logging import setup_logging
import logging
import os
import asyncio 
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json 
from app.core.connection_manager import manager 
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.api import auth, workspaces, notifications, uploads, alerts, chat, user_action, feedbacks
from app.models import user, workspace, data_upload, notification, alert_rule, token, feedback, workspace_user_settings, table_daily_metrics, column_daily_metrics, incidents, incident_events
from app.core.guard import send_telegram_alert

# Load environment variables
load_dotenv()

# logging setup
setup_logging()
logger = logging.getLogger(__name__)

APP_MODE_LOCAL = os.getenv("MODE_LOCAL")
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")


# CORS Origins
origins = [
    frontend_url,
    "http://localhost:5173",
    "https://data-pulse-eight.vercel.app" 
]

# Scheduler Setup
scheduler = AsyncIOScheduler(timezone="UTC")

# Redis Listener for UI Sync (Local Development)
async def redis_listener(): 
    import redis.asyncio as aioredis
    r = aioredis.from_url("redis://redis:6379/0", decode_responses=True) 
    pubsub = r.pubsub() 
    
    try: 
        await pubsub.subscribe("workspace_updates") 
        logger.info("[LOCAL] API Redis Listener subscribed and active.") 
        
        while True: 
            try: 
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                
                if message is not None: 
                    data = json.loads(message["data"]) 
                    workspace_id = data.get("workspace_id") 
                    
                    await manager.broadcast_to_workspace(str(workspace_id), json.dumps(data)) 
                    logger.info(f"[RELAY] Signal sent to UI: {data['type']} for {workspace_id}") 
                
                await asyncio.sleep(0.1) 
                
            except Exception as e: 
                logger.error(f"[REDIS-LOOP] Error: {e}") 
                await asyncio.sleep(1) 
                
    except asyncio.CancelledError: 
        logger.info("[LOCAL] Redis Listener shutting down.") 
    finally: 
        await pubsub.unsubscribe("workspace_updates") 
        await r.close() 

# Lifespan function to manage startup and shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("APP_MODE") != "production": 
        app.state.redis_listener_task = asyncio.create_task(redis_listener()) 
        logger.info("[LOCAL] Starting Redis Listener for UI Sync.") 

    if os.getenv("APP_MODE") == "production":
        logger.info("Application starting in PRODUCTION mode.")
        if not APP_MODE_LOCAL:
            asyncio.create_task(send_telegram_alert("System Online: DataPulse (Production)"))

        enable_scheduler = os.getenv("ENABLE_SCHEDULER", "false").lower() == "true"

        if enable_scheduler:
            try:
                from app.services.tasks import schedule_data_fetches

                scheduler.add_job(
                    schedule_data_fetches,
                    "interval",
                    minutes=10,
                    id="schedule_data_fetches_job",
                    max_instances=1,
                    coalesce=True,
                    misfire_grace_time=300,
                )

                scheduler.start()
                logger.info("[APScheduler] 'Smart Watch' has started.")
            except Exception as e:
                logger.error(f"[APScheduler] Failed to start: {e}", exc_info=True)
        else:
            logger.warning("[APScheduler] DISABLED (ENABLE_SCHEDULER=false)")

    yield
  
    if hasattr(app.state, "redis_listener_task"): 
        app.state.redis_listener_task.cancel()
        
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[APScheduler] 'Smart Watch' shut down.")

# FastAPI Application Setup
app = FastAPI(lifespan=lifespan, redirect_slashes=False)


# Guardian Middleware - CSRF Protection & Error Alerting
@app.middleware("http")
async def guardian_middleware(request: Request, call_next):
    if request.url.path in {"/ping"}:
        return await call_next(request)

    path = request.url.path
    method = request.method

    CSRF_EXEMPT_PATHS = {
        "/api/auth/login-email",
        "/api/auth/send-otp",
        "/api/auth/verify-otp",
        "/api/auth/google",
        "/api/auth/github/callback",
        "/api/auth/google/callback",
        "/",
    }

    if method in {"POST", "PUT", "PATCH", "DELETE"}:
        if path not in CSRF_EXEMPT_PATHS:
            origin = request.headers.get("Origin")
            csrf_header = request.headers.get("X-CSRF-Token")

            if origin and origin not in origins:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF blocked: Invalid Origin"},
                )

            if not csrf_header:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF blocked: Missing X-CSRF-Token"},
                )

    try:
        response = await call_next(request)

        if response.status_code == 404:
            asyncio.create_task(
                send_telegram_alert(
                    f"404 Not Found\nPath: {path}\nMethod: {method}"
                )
            )

        return response

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        asyncio.create_task(
            send_telegram_alert(
                f"CRITICAL ERROR\n"
                f"Type: {type(e).__name__}\n"
                f"Endpoint: {method} {path}\n"
                f"Error: {str(e)}"
            )
        )
        raise e

    
# Middlewares for sessions, CORS, and rate limiting 
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("JWT_SECRET"), 
    session_cookie="dp_session",
    same_site="none", 
    https_only=True 
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(user_action.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(feedbacks.router, prefix="/api")


# Health Check Endpoint
@app.get("/ping", tags=["Health"])
async def ping():
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
# Root Endpoint
@app.get("/")
def root():
    return {"msg": "DataPulse backend is running", "mode": os.getenv("APP_MODE", "dev")}