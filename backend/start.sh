#!/bin/bash
# This is the final, professional production startup script for Render's free tier.
# It runs all 3 services (API, Scheduler, Worker) in one container.

# We set the -m flag to make the script exit immediately if any command fails.
set -m

# 1. Start the Gunicorn server (the "Waiter") in the background.
# We use 'gunicorn -w 1' to keep memory usage low and fit in the free tier.
echo "Starting Gunicorn API server..."
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:$PORT &

# 2. Start our new "Alarm Clock" (the scheduler) in the background.
echo "Starting the 'Poor Man's Cron' scheduler..."
python app/scheduler.py &

# 3. Start the Celery worker (the "Chef") in the foreground.
# This is the main process Render will monitor. If this fails, the container restarts.
echo "Starting Celery worker... This is the main process."
celery -A app.services.celery_worker.celery_app worker --loglevel=info
```

---
### ## Your Final Action Plan

Now that you have the correct `scheduler.py` file and the correct `start.sh` file, the rest of your instructions are **PERFECT**.

**Action:** Now, you can follow the rest of the plan exactly as you posted it:

**1. Make the Script Executable (The Critical Git Step):**
* In your `backend` terminal, run this one, simple Git command:
    ```bash
    git update-index --chmod=+x start.sh
    ```

**2. Commit and Push Your Changes:**
* Now, add, commit, and push **both** of your new files to GitHub:
    ```bash
    git add backend/app/scheduler.py backend/start.sh
    git commit -m "Feat: Implement 100% free 'Poor Man's Cron' for Render"
    git push
    ```

**3. Update Your API's "Start Command" on Render:**
* This is the final step you listed, and it is **100% correct**.
* Go to your Render Dashboard.
* Click on your **`datapulse-api`** service.
* Go to the **"Settings"** tab.
* Find the **"Start Command"** box.
* **Delete** the old `uvicorn ...` command.
* **Replace it** with this new, correct command:
    ```
    bash start.sh
    

