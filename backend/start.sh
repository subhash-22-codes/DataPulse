#!/bin/bash
# This script is the new "production engine"
# It starts both the Gunicorn API server AND the Celery worker in the same container.

# 1. Start the Gunicorn server (the "Waiter") in the background.
echo "Starting Gunicorn API server..."
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:$PORT &

# 2. Start the Celery worker (the "Chef") in the foreground.
# This is the main process Render will monitor.
echo "Starting Celery worker..."
celery -A app.services.celery_worker.celery_app worker --loglevel=info
```

#### **Step 2: Make the Script Executable (A Critical Git Step)**

We have to tell Git that this new file is an "executable" file, not just a text file.

**Action:**
1.  In your `backend` terminal, run this one, simple Git command:
    ```bash
    git update-index --chmod=+x start.sh
    ```
2.  Now, add, commit, and push this one new file to GitHub:
    ```bash
    git add start.sh
    git commit -m "Add production start script for Render"
    git push
    ```

#### **Step 3: Update Your API's "Start Command" on Render**

Now, let's go back to your Render dashboard and tell your `datapulse-api` service (the "Front Desk" we already built) to use this new, 2-in-1 "Super-Waiter" command.

**Action:**
1.  Go to your Render Dashboard.
2.  Click on your **`datapulse-api`** service (the "Web Service" you already deployed).
3.  Go to the **"Settings"** tab.
4.  Find the **"Start Command"** box.
5.  **Delete** the old `gunicorn ...` command.
6.  **Replace it** with this new command:
    ```
    bash start.sh
    
