from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.requests import Request
from app.api.dependencies import limiter
from app.core.logging import setup_logging
# Import all your API routers
from app.api import auth, workspaces, notifications, uploads, alerts, chat

# Import all your models so Alembic can see them
from app.models import user, workspace, data_upload, notification, alert_rule

# --- NEW: Set up logging right at the start ---
setup_logging()
app = FastAPI()

# --- NEW: "Hire" the bouncer by adding it to the app's state and exception handler ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


origins = [
    "http://localhost:5173",
]

# --- CORS ---
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
    return {"msg": "DataPulse backend is running 🔥"}