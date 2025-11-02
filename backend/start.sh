#!/bin/bash
# Final Render production startup script for free tier.
# Runs API (FastAPI), Scheduler, and Celery worker in one container.

set -m

# 1. Start the Uvicorn server (the "Waiter") in the background.
echo "Starting Uvicorn API server..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT &

# 2. Start our "Alarm Clock" (the scheduler) in the background.
echo "Starting the 'Poor Man's Cron' scheduler..."
python -m app.scheduler &

# 3. Start the Celery worker (the "Chef") in the foreground.
echo "Starting Celery worker... This is the main process."
celery -A app.services.celery_worker.celery_app worker --loglevel=info
