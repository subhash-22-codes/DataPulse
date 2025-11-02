#!/bin/bash
# Final Render production startup script for free tier.
# Runs API (FastAPI), Scheduler, and Celery worker in one container.

set -m  # Exit immediately if any command fails

# 1. Start the FastAPI app (API server) in the background
echo "Starting FastAPI app..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT &

# 2. Start the 'Poor Man’s Cron' scheduler in the background
echo "Starting the 'Poor Man's Cron' scheduler..."
python app/scheduler.py &

# 3. Start the Celery worker (main process)
echo "Starting Celery worker... This is the main process."
celery -A app.services.celery_worker.celery_app worker --loglevel=info
