import os
import pandas as pd
import asyncio
import redis
import requests
import logging
from celery import Celery
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from pathlib import Path
from datetime import datetime, timedelta
import google.generativeai as genai
import markdown2
import pytz
from urllib.parse import quote_plus
from io import StringIO 
import numpy as np
import operator
from app.core.database import SessionLocal
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.user import User
from app.models.notification import Notification
from app.models.alert_rule import AlertRule
from app.services.email_service import send_detailed_alert_email, send_threshold_alert_email, send_otp_email

# --- Setup ---
logger = logging.getLogger(__name__)
redis_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Gemini model if API key is provided
gemini_model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        logger.info("✅ Gemini AI model initialized globally.")
    except Exception as e:
        logger.error(f"⚠️ Failed to initialize Gemini AI: {e}")

# Define the Celery app
celery_app = Celery("tasks", broker=redis_url, backend=redis_url)

# --- (CRITICAL FIX) ADD THE BEAT SCHEDULE CONFIGURATION ---
# This tells the local scheduler to actually run the job
celery_app.conf.beat_schedule = {
    "trigger-smart-watch-every-minute": {
        "task": "schedule_data_fetches",  # Name of the task function below
        "schedule": 60.0,                 # Run every 60 seconds
    },
}
celery_app.conf.timezone = 'UTC'
# ---------------------------------------------------------

celery_app.conf.update(task_track_started=True)
redis_client = redis.from_url(redis_url)


def convert_utc_to_ist_str(utc_dt):
    if not utc_dt: return "N/A"
    try:
        ist_zone = pytz.timezone('Asia/Kolkata')
        aware_utc_dt = pytz.utc.localize(utc_dt) if utc_dt.tzinfo is None else utc_dt
        ist_dt = aware_utc_dt.astimezone(ist_zone)
        return ist_dt.strftime("%B %d, %Y, %I:%M %p %Z")
    except Exception:
        return "Invalid Date"

def get_ai_insight(schema_changes: dict) -> str | None:
    # 1. Fast Exit: If setup failed or key is missing, return immediately.
    if not gemini_model:
        logger.warning("Gemini model not available. Skipping AI insight.")
        return None

    added = schema_changes.get('added', [])
    removed = schema_changes.get('removed', [])
    
    # 2. Logic Check: If nothing changed, don't waste an API call.
    if not added and not removed:
        return "<p>No significant schema changes detected.</p>"

    # 3. Optimized Prompt: Explicitly asks for HTML to reduce parsing errors.
    prompt = (
        f"Act as a Data Analyst. Analyze this schema change:\n"
        f"Added Columns: {', '.join(added) if added else 'None'}\n"
        f"Removed Columns: {', '.join(removed) if removed else 'None'}\n"
        f"Output ONLY valid HTML (no markdown blocks). Include:\n"
        f"1. A 1-sentence summary of the impact.\n"
        f"2. A <ul> list of 2 key business questions this enables/disables."
    )

    try:
        logger.info("🧠 [AI] Requesting insight from Gemini...")
        
        # 4. Timeout Protection: Don't let the worker hang forever.
        # Using a simpler call structure that usually respects underlying socket timeouts,
        # but wrapping it in a standard try/except is the safest portable way without extra libs.
        response = gemini_model.generate_content(prompt)
        
        # 5. Clean Output: Strip any markdown quotes if the AI adds them
        raw_text = response.text.strip()
        if raw_text.startswith("```html"):
            raw_text = raw_text.replace("```html", "").replace("```", "")
            
        logger.info("✨ [AI] Insight generated successfully.")
        return raw_text

    except Exception as e:
        # This catches Quota limits (429), Network errors, etc.
        logger.error(f"❌ [AI] Error generating insight: {e}", exc_info=True)
        return "<p>AI analysis currently unavailable (Rate Limit or Network Error).</p>"
    

# --- TASKS ---

@celery_app.task(name="schedule_data_fetches")
def schedule_data_fetches():
    logger.info("⏰ [BEAT] Waking up to check for scheduled data fetches...")
    
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # 1. Optimization: Fetch only necessary columns as tuples
        # This is faster and uses less memory than full ORM objects
        workspaces = db.query(
            Workspace.id,
            Workspace.name,
            Workspace.polling_interval,
            Workspace.last_polled_at,
            Workspace.data_source,
            Workspace.api_url,
            Workspace.db_host,
            Workspace.db_query
        ).filter(
            Workspace.is_polling_active == True
        ).all()

        if not workspaces:
            logger.info("-> No active workspaces found.")
            return

        logger.info(f"-> Analyzing {len(workspaces)} active workspace(s)...")
        triggered_count = 0

        for ws in workspaces:
            # 2. Error Isolation: Protect the loop
            try:
                is_due = False
                last_polled = ws.last_polled_at
                interval = ws.polling_interval

                # 3. Logic Check: Determine if due
                if not last_polled:
                    is_due = True # First run
                elif interval == 'every_minute':
                    if (now - last_polled) > timedelta(minutes=1): is_due = True
                elif interval == 'hourly':
                    if (now - last_polled) > timedelta(hours=1): is_due = True
                elif interval == 'daily':
                    if (now - last_polled) > timedelta(days=1): is_due = True

                if is_due:
                    if ws.data_source == 'API' and ws.api_url:
                        logger.info(f"✅ API DUE! Triggering fetch for '{ws.name}' ({ws.id})")
                        fetch_api_data.delay(str(ws.id))
                        triggered_count += 1
                    elif ws.data_source == 'DB' and ws.db_host and ws.db_query:
                        logger.info(f"✅ DB DUE! Triggering fetch for '{ws.name}' ({ws.id})")
                        fetch_db_data.delay(str(ws.id))
                        triggered_count += 1
                        
            except Exception as e:
                logger.error(f"⚠️ Error scheduling workspace {ws.id}: {e}", exc_info=True)
                continue
        
        if triggered_count > 0:
            logger.info(f"🚀 Triggered {triggered_count} fetch jobs.")

    except Exception as e:
        logger.error(f"🔥 Critical Scheduler Failure: {e}", exc_info=True)
    finally:
        db.close()

@celery_app.task(name="fetch_api_data")
def fetch_api_data(workspace_id: str):
    logger.info(f"🤖 [API FETCHER] Starting API fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    try:
        # 1. Optimization: Fetch ONLY necessary columns
        # This saves memory. SQLAlchemy still handles the decryption automatically.
        workspace = db.query(
            Workspace.id,
            Workspace.api_url,
            Workspace.api_header_name,
            Workspace.api_header_value
        ).filter(Workspace.id == workspace_id).first()

        if not workspace or not workspace.api_url:
            logger.warning(f"-> [API FETCHER] Workspace or API URL not found for {workspace_id}. Aborting.")
            return

        # --- KEYRING LOGIC ---
        headers = {}
        if workspace.api_header_name and workspace.api_header_value:
            headers[workspace.api_header_name] = workspace.api_header_value
            logger.info(f"🔑 Using API Key Header: {workspace.api_header_name}")
        # ---------------------

        # 2. Optimization: Add TIMEOUT
        # (10s to connect, 30s to read data). Prevents infinite hangs.
        response = requests.get(workspace.api_url, headers=headers, timeout=(10, 30))
        response.raise_for_status()
        
        data = response.json()
        
        # 3. Optimization: Fail fast if data is empty
        if not data:
            logger.warning(f"-> [API FETCHER] API returned empty data for {workspace_id}.")
            return

        df = pd.json_normalize(data)
        
        csv_content = df.to_csv(index=False)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{timestamp}_api_poll.csv"

        new_upload = DataUpload(
            workspace_id=workspace.id, 
            file_path=file_name,
            file_content=csv_content,
            upload_type='api_poll'
        )
        db.add(new_upload)
        
        # Efficiently update the last_polled_at timestamp
        db.query(Workspace).filter(Workspace.id == workspace_id).update(
            {"last_polled_at": datetime.utcnow()}
        )
        
        db.commit()
        db.refresh(new_upload)

        logger.info("-> [API FETCHER] Handing off to the analyzer task...")
        process_csv_task.delay(str(new_upload.id))

    except requests.Timeout:
        logger.error(f"❌ [API FETCHER] Timeout connecting to API.")
    except Exception as e:
        logger.error(f"❌ [API FETCHER] An error occurred: {e}", exc_info=True)
    finally:
        db.close()
        
@celery_app.task(name="fetch_db_data")
def fetch_db_data(workspace_id: str):
    logger.info(f"🤖 [DB FETCHER] Starting DB fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    engine = None # Initialize engine variable for safe cleanup

    try:
        # 1. Optimization: Fetch ONLY necessary config columns as a tuple
        ws_config = db.query(
            Workspace.id,
            Workspace.db_host,
            Workspace.db_user,
            Workspace.db_password,
            Workspace.db_name,
            Workspace.db_port,
            Workspace.db_query
        ).filter(Workspace.id == workspace_id).first()

        # Check if config exists and has all required fields
        if not ws_config or not all([ws_config.db_host, ws_config.db_user, ws_config.db_password, ws_config.db_name, ws_config.db_query]):
            logger.warning(f"-> [DB FETCHER] Incomplete DB config for {workspace_id}. Aborting.")
            return
        
        # 2. Safe Connection String Construction
        encoded_password = quote_plus(ws_config.db_password)
        port = ws_config.db_port or 5432 # Default to 5432 if None
        connection_url = f"postgresql://{ws_config.db_user}:{encoded_password}@{ws_config.db_host}:{port}/{ws_config.db_name}"
        
        logger.info(f"-> [DB FETCHER] Connecting to {ws_config.db_host}...")
        
        # 3. Optimization: Create Engine with timeouts & pre-ping
        # pool_pre_ping=True checks if the connection is alive before using it
        # connect_args sets a command timeout (e.g., 30 seconds) so we don't hang forever
        engine = create_engine(
            connection_url, 
            pool_pre_ping=True,
            connect_args={"options": "-c statement_timeout=30000"} # 30s timeout
        )
        
        with engine.connect() as connection:
            # Pandas reads directly from the active connection
            df = pd.read_sql(ws_config.db_query, connection)

        # 4. Optimization: Check for empty data early
        if df.empty:
             logger.warning(f"-> [DB FETCHER] Query returned 0 rows for {workspace_id}.")
             return

        csv_content = df.to_csv(index=False)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{timestamp}_db_query.csv"

        new_upload = DataUpload(
            workspace_id=ws_config.id, 
            file_path=file_name,
            file_content=csv_content,
            upload_type='db_query'
        )
        db.add(new_upload)
        
        # Efficient update for last_polled_at
        db.query(Workspace).filter(Workspace.id == workspace_id).update(
            {"last_polled_at": datetime.utcnow()}
        )
        
        db.commit()
        db.refresh(new_upload)

        logger.info("-> [DB FETCHER] Handing off to the analyzer task...")
        process_csv_task.delay(str(new_upload.id))

    except Exception as e:
        logger.error(f"❌ [DB FETCHER] An error occurred: {e}", exc_info=True)
    finally:
        # Dispose the temporary engine to free up the connection pool immediately
        if engine:
            engine.dispose()
        db.close()

  

def check_alert_rules(db: Session, workspace: Workspace, current_upload: DataUpload, analysis_results: dict):
    # 1. Fast Exit: Fetch rules first
    rules = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id, 
        AlertRule.is_active == True
    ).all()
    
    if not rules:
        return

    # 2. Pre-calculate Context
    stats = analysis_results.get("summary_stats", {})
    if not stats:
        return

    # Operator Map for cleaner logic
    ops = {
        'greater_than': operator.gt,
        'less_than': operator.lt,
        'equals': operator.eq
    }

    users_to_notify = list(set(workspace.team_members + [workspace.owner]))
    recipients = [user.email for user in users_to_notify]

    alerts_triggered = False

    for rule in rules:
        try:
            # 3. Safe Data Access
            col_stats = stats.get(rule.column_name)
            if not col_stats:
                continue
            
            actual_value = col_stats.get(rule.metric)
            
            # 4. Logic Check (Skip None/NaN)
            if actual_value is None:
                continue

            # 5. Comparison Logic
            compare_func = ops.get(rule.condition)
            if not compare_func:
                continue

            if compare_func(actual_value, rule.value):
                alerts_triggered = True
                message = (
                    f"Smart Alert: '{rule.column_name}' {rule.metric} was {actual_value:.2f}, "
                    f"triggering rule '{rule.condition.replace('_', ' ')} {rule.value}'."
                )
                
                logger.info(f"🚨 [WORKER] Alert Triggered: {message}")
                
                # Create Notification
                # (In Celery worker, we add to session but commit happens at end of task)
                notification = Notification(
                    user_id=workspace.owner_id, 
                    workspace_id=workspace.id, 
                    message=message
                )
                db.add(notification)
                
                email_context = {
                    "workspace_name": workspace.name,
                    "rule": { 
                        "column_name": rule.column_name, 
                        "metric": rule.metric, 
                        "condition": rule.condition, 
                        "value": rule.value 
                    },
                    "actual_value": actual_value,
                    "file_name": current_upload.file_path,
                    "upload_time": convert_utc_to_ist_str(current_upload.uploaded_at),
                }
                
                # Async Email Call (Correct for Celery)
                asyncio.run(send_threshold_alert_email(recipients, email_context))
                
        except (KeyError, TypeError, Exception) as e:
            logger.warning(f"Error checking rule {rule.id}: {e}")
            continue
            
    # Note: No db.commit() here because the main task function commits everything at once.


# ------------------------------------------------------------
# Helper to clean NaN, inf, -inf recursively for PostgreSQL JSON
# ------------------------------------------------------------
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
    return obj

@celery_app.task(name="process_csv_task")
def process_csv_task(upload_id: str):
    logger.info(f"🚀 [WORKER] Starting REAL processing for upload ID: {upload_id}...")
    db: Session = SessionLocal()

    workspace_id = None  # Track early so we can publish job_error without re-querying

    try:
        # STEP 1: Fetch current upload
        logger.debug("🔍 STEP 1: Fetching current upload...")
        current_upload: DataUpload | None = (
            db.query(DataUpload)
            .filter(DataUpload.id == upload_id)
            .first()
        )

        if not current_upload:
            logger.error("❌ Upload not found in DB!")
            return {"status": "error", "message": "Upload not found"}

        workspace_id = current_upload.workspace_id

        csv_content = current_upload.file_content
        if not csv_content:
            logger.error("❌ CSV content is EMPTY! Aborting processing.")
            return {"status": "error", "message": "Empty CSV content"}

        # STEP 2: Load CSV into Pandas
        logger.debug("🔍 STEP 2: Loading CSV into Pandas...")
        try:
            # low_memory=False avoids mixed-type inference issues on large CSVs
            df = pd.read_csv(StringIO(csv_content), low_memory=False)

            # --- FIX FOR "0 0 0" STATS ---
            # Vectorized numeric conversion for better performance than looping columns
            df = df.apply(lambda col: pd.to_numeric(col, errors="ignore"))
            # -----------------------------
            logger.debug(f"📊 DataFrame loaded successfully with shape {df.shape}.")
        except Exception as e:
            logger.error(f"❌ Pandas failed to read CSV: {e}", exc_info=True)
            return {"status": "error", "message": "Failed to parse CSV"}

        # STEP 3: Schema & row count
        logger.debug("🔍 STEP 3: Extracting new schema...")
        new_schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
        new_row_count = len(df)
        logger.debug(f"📊 New schema has {len(new_schema)} columns and {new_row_count} rows.")

        # STEP 4: Find previous upload for comparison
        logger.debug("🔍 STEP 4: Looking for previous upload...")
        previous_upload: DataUpload | None = (
            db.query(DataUpload)
            .filter(
                DataUpload.workspace_id == workspace_id,
                DataUpload.upload_type == current_upload.upload_type,
                DataUpload.id != current_upload.id,
            )
            .order_by(DataUpload.uploaded_at.desc())
            .first()
        )

        schema_has_changed = False
        row_count_has_changed = False
        new_cols = set(new_schema.keys())
        old_cols: set[str] = set()
        old_row_count: int = 0

        if previous_upload and previous_upload.analysis_results:
            logger.debug("🔍 STEP 5: Comparing schema & row counts with previous upload...")
            if previous_upload.upload_type == current_upload.upload_type:
                old_schema = previous_upload.schema_info or {}
                old_cols = set(old_schema.keys())

                if old_cols != new_cols:
                    schema_has_changed = True
                    logger.debug(f"⚠ Schema change detected! Added: {new_cols - old_cols}, Removed: {old_cols - new_cols}")

                old_row_count = previous_upload.analysis_results.get("row_count", 0)
                if old_row_count != new_row_count:
                    row_count_has_changed = True
                    logger.debug(f"⚠ Row count change detected! Old: {old_row_count}, New: {new_row_count}")

        # STEP 6: Generate stats
        logger.debug("🔍 STEP 6: Generating describe() stats...")
        try:
            # include='all' => numeric + categorical stats
            stats_df = df.describe(include="all")
        except Exception as e:
            logger.error(f"❌ df.describe() failed: {e}", exc_info=True)
            return {"status": "error", "message": "Failed to generate summary stats"}

        # STEP 7: Clean NaN/Inf from stats for JSON/PG safety
        logger.debug("🔍 STEP 7: Cleaning NaN/Inf values from stats...")
        raw_summary = stats_df.to_dict()
        summary_stats = clean_nan(raw_summary)

        analysis_results = {
            "row_count": new_row_count,
            "column_count": len(df.columns),
            "summary_stats": summary_stats,
        }

        # STEP 8: Save analysis on upload
        logger.debug("🔍 STEP 8: Saving results into DB...")
        current_upload.schema_info = new_schema
        current_upload.analysis_results = analysis_results
        current_upload.schema_changed_from_previous = schema_has_changed

        # STEP 9: Workspace-level processing
        logger.debug("🔍 STEP 9: Fetching workspace...")
        workspace: Workspace | None = (
            db.query(Workspace)
            .filter(Workspace.id == workspace_id)
            .first()
        )

        if workspace:
            # Structural/row changes => notifications + email + AI insight
            if schema_has_changed or row_count_has_changed:
                logger.debug("🔔 Structural or row-count change detected — preparing notifications & email...")

                schema_changes_dict = {
                    "added": list(new_cols - old_cols),
                    "removed": list(old_cols - new_cols),
                }
                ai_insight_text = get_ai_insight(schema_changes_dict)

                users_to_notify = list(set(workspace.team_members + [workspace.owner]))
                notification_message = f"Structural change detected in workspace '{workspace.name}'."

                for user in users_to_notify:
                    db.add(
                        Notification(
                            user_id=user.id,
                            workspace_id=workspace.id,
                            message=notification_message,
                            ai_insight=ai_insight_text,
                        )
                    )

                # compute old_row_count safely (in case previous_upload was None)
                if not previous_upload or not previous_upload.analysis_results:
                    old_row_count = 0  # already defined above, but explicit

                percent_change = (
                    f"{((new_row_count - old_row_count) / old_row_count) * 100:+.1f}%"
                    if old_row_count != 0 and row_count_has_changed
                    else "0.0%"
                )

                email_context = {
                    "workspace_name": workspace.name,
                    "upload_type": current_upload.upload_type,
                    "new_file_name": current_upload.file_path,
                    "old_file_name": previous_upload.file_path if previous_upload else "N/A",
                    "upload_time_str": convert_utc_to_ist_str(current_upload.uploaded_at),
                    "owner_info": {"name": workspace.owner.name, "email": workspace.owner.email},
                    "team_info": [{"name": member.name, "email": member.email} for member in workspace.team_members],
                    "ai_insight": ai_insight_text,
                    "schema_changes": schema_changes_dict,
                    "metric_changes": {
                        "old_rows": old_row_count,
                        "new_rows": new_row_count,
                        "percent_change": percent_change,
                    }
                    if row_count_has_changed
                    else {},
                }

                recipients = [user.email for user in users_to_notify]
                # In a Celery worker, asyncio.run is fine for a one-off async function
                asyncio.run(send_detailed_alert_email(recipients, email_context))

            # STEP 10: Alert rules
            logger.debug("🔍 STEP 10: Checking alert rules...")
            check_alert_rules(db, workspace, current_upload, analysis_results)

        # STEP 11: Commit
        logger.debug("💾 STEP 11: Committing DB changes...")
        db.commit()

        logger.info(f"✅ Upload {upload_id} processed successfully.")
        if workspace_id is not None:
            redis_client.publish(f"workspace:{workspace_id}", "job_complete")

        return {"status": "success"}

    except Exception as e:
        logger.error("🔥 FATAL ERROR in process_csv_task!", exc_info=True)
        # Always rollback on exception to avoid broken transactions
        try:
            db.rollback()
        except Exception:
            pass

        if workspace_id is not None:
            redis_client.publish(f"workspace:{workspace_id}", "job_error")

        return {"status": "error", "message": str(e)}

    finally:
        logger.debug("🔚 STEP 12: Closing DB session.")
        db.close()


@celery_app.task(name="send_otp_email_task")
def send_otp_email_task(to_email: str, otp: str, subject_type: str) -> None:
    """
    Background task to send OTP/Password Reset emails.
    """
    logger.info(f"📨 [WORKER] Sending {subject_type} email to {to_email}...")
    try:
        asyncio.run(send_otp_email(to_email, otp, subject_type))
        logger.info(f"✅ [WORKER] Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"❌ [WORKER] Failed to send OTP email: {e}", exc_info=True)
        # Optional: Retry logic could go here (self.retry())