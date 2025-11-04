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

# Import all your API routers
from app.api import auth, workspaces, notifications, uploads, alerts, chat

# Import all your models so Alembic can see them
from app.models import user, workspace, data_upload, notification, alert_rule

# --- Set up logging right at the start ---
setup_logging()
logger = logging.getLogger(__name__)

# --- This is the "Smart Watch" Lifespan Function ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This code runs ONCE, when your app starts up.
    
    # --- THIS IS THE "SMART SWITCH" ---
    if os.getenv("APP_MODE") == "production":
        logger.info("Application starting in PRODUCTION mode.")
        logger.info("Starting the 'FastAPI-Scheduler' (Smart Watch)...")
        
        try:
            # We import the "Smart Watch" library
            from fastapi_scheduler import Scheduler, ASYNC
            
            # We import the "job" we want to run
            # This is the line that is likely failing
            from app.services.tasks import schedule_data_fetches
            
            # Create the "Alarm Clock"
            scheduler = Scheduler(policy=ASYNC)
            # Set the alarm: run this job every 60 seconds
            scheduler.add_job(schedule_data_fetches, "interval", seconds=60, max_instances=1)
            # Turn the alarm clock ON
            scheduler.start()
            logger.info("✅ [FastAPI] 'Smart Watch' scheduler has started.")

        # --- THIS IS THE DEBUG FIX ---
        except ImportError:
            # This will log the *entire* error traceback,
            # showing us the real problem.
            logger.error(
                "❌ [FastAPI] A CRITICAL IMPORT FAILED. Production tasks will not run.",
                exc_info=True  
            )
        # --- END FIX ---
            
    else:
        logger.info("Application starting in DEVELOPMENT mode. (Celery Beat is expected to run in a separate container).")
    
    yield
    
    logger.info("Application shutting down.")

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
