from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.requests import Request
from app.api.dependencies import limiter
from app.core.logging import setup_logging
import logging
import os
from contextlib import asynccontextmanager

# --- NEW APSCHEDULER IMPORT ---
# We now import the real library, not the broken wrapper
from apscheduler.schedulers.asyncio import AsyncIOScheduler
# --- END NEW IMPORT ---

# Import all your API routers
from app.api import auth, workspaces, notifications, uploads, alerts, chat

# Import all your models so Alembic can see them
from app.models import user, workspace, data_upload, notification, alert_rule

# --- Set up logging right at the start ---
setup_logging()
logger = logging.getLogger(__name__)

# --- THIS IS THE NEW "Smart Watch" (APScheduler) ---
# We create the scheduler instance here
scheduler = AsyncIOScheduler(timezone="UTC")

# --- LIFESPAN FUNCTION (UPDATED) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This code runs ONCE, when your app starts up.
    
    if os.getenv("APP_MODE") == "production":
        logger.info("Application starting in PRODUCTION mode.")
        logger.info("Starting the 'APScheduler' (Smart Watch)...")
        
        try:
            # We import the "job" we want to run
            from app.services.tasks import schedule_data_fetches
            
            # Add the job to the scheduler
            scheduler.add_job(
                schedule_data_fetches, 
                "interval", 
                seconds=60, 
                id="schedule_data_fetches_job"
            )
            
            # Start the scheduler
            scheduler.start()
            logger.info("✅ [APScheduler] 'Smart Watch' has started.")
            
        except ImportError:
            # This will now correctly catch if 'schedule_data_fetches' is broken
            logger.error(
                "❌ [APScheduler] A CRITICAL IMPORT FAILED. Production tasks will not run.",
                exc_info=True  
            )
        except Exception as e:
            logger.error(f"❌ [APScheduler] Failed to start: {e}", exc_info=True)
            
    else:
        logger.info("Application starting in DEVELOPMENT mode. (Celery Beat is expected to run in a separate container).")
    
    yield
    
    # This code runs ONCE, when your app shuts down.
    logger.info("Application shutting down...")
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[APScheduler] 'Smart Watch' shut down.")

# --- We pass the new 'lifespan' function to our app ---
app = FastAPI(lifespan=lifespan)

# "Hire" the bouncer
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    "http://localhost:5173",
    "https://data-pulse-eight.vercel.app" # <-- Your production frontend
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
app.include_router(workspaces.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/")
def root():
    logger.info("Root endpoint was hit.")
    return {"msg": "DataPulse backend is running 🔥"}

