import os
import pandas as pd
import asyncio
import requests
import logging
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from pathlib import Path
from datetime import datetime, timedelta
import google.generativeai as genai
import markdown2
import pytz
import operator 
from urllib.parse import quote_plus
from io import StringIO
import numpy as np # Ensure numpy is imported for NaN check
from typing import Coroutine, Any
from app.core.database import SessionLocal
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.user import User
from app.models.notification import Notification
from app.models.alert_rule import AlertRule
from app.services.email_service import send_detailed_alert_email, send_threshold_alert_email, send_otp_email

# --- (FIX 1) IMPORT THE NEW CENTRAL MANAGER ---
from app.core.connection_manager import manager
# --- (END FIX 1) ---

# --- Setup ---
logger = logging.getLogger(__name__)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
APP_MODE = os.getenv("APP_MODE")

gemini_model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        logger.info("✅ Gemini AI model initialized globally.")
    except Exception as e:
        logger.error(f"⚠️ Failed to initialize Gemini AI: {e}")

# ====================================================================
#  Helper Functions
# ====================================================================

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
    
# --- (FIX 2) CREATE A HELPER TO RUN ASYNC CODE SAFELY ---
def run_async_safely(coro: Coroutine[Any, Any, Any], loop: asyncio.AbstractEventLoop = None) -> None:
    """
    Executes an async coroutine from a synchronous context with maximum safety.
    
    Strategy:
    1. If a main event loop is provided (FastAPI context), schedule it there thread-safely.
    2. If no loop provided (APScheduler context), run it synchronously via asyncio.run().
    """
    if loop and loop.is_running():
        # Scenario A: We have a running loop (e.g., main web server thread)
        # Use threadsafe submission to avoid blocking the main loop
        asyncio.run_coroutine_threadsafe(coro, loop)
        return

    # Scenario B: We are in a background thread with no loop (e.g., APScheduler)
    try:
        # Standard, optimized way to run async code in a sync thread
        asyncio.run(coro)
    except RuntimeError as e:
        # Edge Case: A loop exists but is not running or is effectively dead.
        # This is a "Hail Mary" to try and force execution.
        logger.warning(f"[WORKER] Standard asyncio.run failed ({e}). Attempting fallback loop.")
        try:
            # Only create a new loop as a last resort
            fallback_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(fallback_loop)
            fallback_loop.run_until_complete(coro)
            fallback_loop.close()
        except Exception as final_error:
             logger.error(f"🔥 [WORKER] Async execution completely failed: {final_error}")

# --- The Optimized Function ---
def check_alert_rules(
    db: Session, 
    workspace: Workspace, 
    current_upload: DataUpload, 
    analysis_results: dict, 
    loop: asyncio.AbstractEventLoop = None
) -> None:
    
    logger.info(f"🔍 [WORKER] Checking alert rules for Workspace {workspace.id}...")
    
    # 1. Fast Exit: Check rules existence first to save DB query time on users
    rules = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id, 
        AlertRule.is_active == True
    ).all()
    
    if not rules:
        logger.info("No active alert rules found.")
        return

    # 2. Pre-calculate Context: Do this once, not inside the loop
    stats = analysis_results.get("summary_stats", {})
    if not stats:
        logger.warning("Skipping alerts: No summary statistics available.")
        return

    # Define operators map for cleaner logic (faster than if/else chain)
    ops = {
        'greater_than': operator.gt,
        'less_than': operator.lt,
        'equals': operator.eq
    }

    # Prepare recipients list once
    users_to_notify = list(set(workspace.team_members + [workspace.owner]))
    recipients = [user.email for user in users_to_notify]
    
    alerts_triggered_count = 0

    for rule in rules:
        try:
            # 3. Safe Data Access: LBYL (Look Before You Leap) is safer here than try/catch
            col_stats = stats.get(rule.column_name)
            if not col_stats:
                continue # Column not found in this dataset
            
            actual_value = col_stats.get(rule.metric)
            
            logger.info(f"🧐 Rule Check: {rule.column_name} {rule.metric} | Actual: {actual_value} | Threshold: {rule.value} | Op: {rule.condition}")
            
            # 4. Logic Check: Skip if value is None (NaN) or rule metric missing
            if actual_value is None:
                continue

            # 5. Comparison Logic
            compare_func = ops.get(rule.condition)
            if not compare_func:
                logger.warning(f"Unknown condition '{rule.condition}' in rule {rule.id}")
                continue

            if compare_func(actual_value, rule.value):
                # --- ALERT TRIGGERED ---
                alerts_triggered_count += 1
                
                # Create Notification
                message = (
                    f"Smart Alert: '{rule.column_name}' {rule.metric} was {actual_value:.2f}, "
                    f"triggering rule '{rule.condition.replace('_', ' ')} {rule.value}'."
                )
                
                logger.info(f"🚨 [WORKER] Triggered: {message}")
                
                notification = Notification(
                    user_id=workspace.owner_id, # Default to owner, or loop users if needed
                    workspace_id=workspace.id, 
                    message=message
                )
                # Note: If you want separate notifications for every team member, 
                # loop over users_to_notify here. For now, we notify the system/owner.
                db.add(notification)

                # Prepare Email Context
                email_context = { 
                    "workspace_name": workspace.name, 
                    "rule": rule.to_dict(), 
                    "actual_value": actual_value,
                    "file_name": current_upload.file_path,
                    "upload_time": convert_utc_to_ist_str(current_upload.uploaded_at),
                    "workspace_id": workspace.id,
                }
                
                # 6. Async Email Dispatch (Optimized)
                logger.info(f"📧 Scheduling alert email for rule {rule.id}")
                run_async_safely(
                    send_threshold_alert_email(recipients, email_context), 
                    loop
                )
                
        except Exception as e:
            # Catch unexpected errors per rule so one bad rule doesn't stop others
            logger.error(f"⚠️ Error processing rule {rule.id}: {e}", exc_info=True)
            continue

    if alerts_triggered_count > 0:
        logger.info(f"✅ Processed alerts. Total triggered: {alerts_triggered_count}")

# ====================================================================
#  Scheduled Tasks (Called by APScheduler)
# ====================================================================
# --- The Optimized Function ---
def schedule_data_fetches() -> None:
    logger.info("⏰ [SCHEDULER] Checking for due data fetches...")
    
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # 1. Optimized Query: Select ONLY necessary columns to reduce memory load.
        # We fetch tuples instead of full ORM objects for speed.
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
            # 2. Error Isolation: Protect the loop so one bad workspace doesn't crash the scheduler
            try:
                is_due = False
                last_polled = ws.last_polled_at
                interval = ws.polling_interval

                # 3. Logic Check: Determine if due
                if not last_polled:
                    is_due = True # Never polled? Do it now.
                elif interval == 'every_minute':
                    if (now - last_polled) > timedelta(minutes=1): is_due = True
                elif interval == 'hourly':
                    if (now - last_polled) > timedelta(hours=1): is_due = True
                elif interval == 'daily':
                    if (now - last_polled) > timedelta(days=1): is_due = True
                    

                if is_due:
                    # 4. Dispatch: Trigger the specific fetcher
                    if ws.data_source == 'API' and ws.api_url:
                        logger.info(f"✅ API DUE! Triggering fetch for '{ws.name}' ({ws.id})")
                        fetch_api_data(str(ws.id))
                        triggered_count += 1
                        
                    elif ws.data_source == 'DB' and ws.db_host and ws.db_query:
                        logger.info(f"✅ DB DUE! Triggering fetch for '{ws.name}' ({ws.id})")
                        fetch_db_data(str(ws.id))
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
        
def process_data_fetch_task(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    """
    Router task that determines whether to fetch API or DB data based on workspace config.
    Triggered by 'Save Configuration' in frontend via workspaces.py.
    """
    logger.info(f"🤖 [ROUTER] Routing data fetch for workspace {workspace_id}...")
    db = SessionLocal()
    try:
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws:
            logger.warning(f"Workspace {workspace_id} not found.")
            return

        if ws.data_source == 'API':
            # Pass the loop so the WebSocket message can be sent back to the main thread
            fetch_api_data(str(ws.id), loop)
        elif ws.data_source == 'DB':
            fetch_db_data(str(ws.id), loop)
        else:
            logger.info(f"Workspace {ws.id} is not configured for remote polling.")
    finally:
        db.close()

def fetch_api_data(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    logger.info(f"🤖 [API FETCHER] Starting API fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    try:
        # 1. Optimization: Fetch ONLY the columns we need.
        # This is faster and uses less memory than loading the full object.
        # SQLAlchemy still handles the decryption of 'api_header_value' automatically.
        workspace_data = db.query(
            Workspace.id,
            Workspace.api_url, 
            Workspace.api_header_name, 
            Workspace.api_header_value
        ).filter(Workspace.id == workspace_id).first()

        if not workspace_data or not workspace_data.api_url:
            logger.warning(f"-> [API FETCHER] Workspace or API URL not found. Aborting.")
            return
        
        # --- Keyring Logic ---
        headers = {}
        if workspace_data.api_header_name and workspace_data.api_header_value:
            headers[workspace_data.api_header_name] = workspace_data.api_header_value
            logger.info(f"🔑 Using API Key Header: {workspace_data.api_header_name}")
        
        # 2. Optimization: Add TIMEOUT.
        # (10 seconds to connect, 30 seconds to read data).
        # Without this, your worker could hang forever if the external API crashes.
        response = requests.get(
            workspace_data.api_url, 
            headers=headers, 
            timeout=(10, 30)
        )
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

        # We still need a simple insert, so we create the object
        new_upload = DataUpload(
            workspace_id=workspace_data.id, 
            file_path=file_name,
            file_content=csv_content,
            upload_type='api_poll'
        )
        db.add(new_upload)
        
        # Update the last_polled_at timestamp on the workspace
        # Since we didn't load the full Workspace object, we run a quick update query
        db.query(Workspace).filter(Workspace.id == workspace_id).update(
            {"last_polled_at": datetime.utcnow()}
        )
        
        db.commit()
        db.refresh(new_upload)

        logger.info("-> [API FETCHER] Handing off to the analyzer task...")
        
        # Note: This uses the synchronous fallback of process_csv_task, which is correct here.
        process_csv_task(str(new_upload.id), loop)

    except requests.Timeout:
        logger.error(f"❌ [API FETCHER] Timeout connecting to {workspace_data.api_url}")
    except Exception as e:
        logger.error(f"❌ [API FETCHER] An error occurred: {e}", exc_info=True)
    finally:
        db.close()

def fetch_db_data(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    logger.info(f"🤖 [DB FETCHER] Starting DB fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    try:
        # 1. Optimization: Fetch ONLY necessary config columns
        # Using a tuple result saves memory over full ORM objects
        ws_config = db.query(
            Workspace.id,
            Workspace.db_host,
            Workspace.db_user,
            Workspace.db_password,
            Workspace.db_name,
            Workspace.db_port,
            Workspace.db_query
        ).filter(Workspace.id == workspace_id).first()

        if not ws_config or not all([ws_config.db_host, ws_config.db_user, ws_config.db_password, ws_config.db_name, ws_config.db_query]):
            logger.warning(f"-> [DB FETCHER] Incomplete DB config for {workspace_id}. Aborting.")
            return
        
        # 2. Safe Connection String Construction
        encoded_password = quote_plus(ws_config.db_password)
        port = ws_config.db_port or 5432 # Default to 5432 if None
        connection_url = f"postgresql://{ws_config.db_user}:{encoded_password}@{ws_config.db_host}:{port}/{ws_config.db_name}"
        
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
        # Call the analyzer (synchronous fallback is correct here)
        process_csv_task(str(new_upload.id), loop)

    except Exception as e:
        logger.error(f"❌ [DB FETCHER] An error occurred: {e}", exc_info=True)
    finally:
        # Dispose the temporary engine to free up the connection pool immediately
        # (Since we create a new engine per task for dynamic remote DBs)
        if 'engine' in locals():
            engine.dispose()
        db.close()
# ====================================================================
#  The "Analyzer Robot" (The fully corrected function)
# ====================================================================
# --- Ensure this helper is present in the file ---
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
    return obj
# -------------------------------------------------

def process_csv_task(upload_id: str, loop: asyncio.AbstractEventLoop = None):
    """
    Analyzes a CSV file.
    'loop' is the main event loop passed from the FastAPI endpoint.
    It is None when called from the synchronous APScheduler.
    """
    logger.info(f"🚀 [WORKER] Starting REAL processing for upload ID: {upload_id}...")
    db: Session = SessionLocal()
    workspace_id_str = None
    status_message = "job_error"
    new_notifications_created = False
    
    try:
        # 1. Fetch Metadata (Fast)
        current_upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
        if not current_upload: 
            logger.warning(f"[WORKER] Upload ID {upload_id} not found.")
            return
        
        workspace_id_str = str(current_upload.workspace_id)
        
        csv_content = current_upload.file_content
        if not csv_content: 
            logger.warning(f"[WORKER] No content for upload {upload_id}.")
            return

        # 2. Load Data (Memory Intensive Step)
        try:
            df = pd.read_csv(StringIO(csv_content))
            
            # 3. Optimization: Force Numeric Conversion
            # This fixes the "0 stats" bug if numbers are formatted as text strings
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='ignore')
                
        except Exception as e:
            logger.error(f"❌ Failed to parse CSV: {e}")
            return

        new_schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
        new_row_count = len(df)
        
        # 4. Fetch Previous Upload (for comparison)
        previous_upload = db.query(DataUpload).filter(
            DataUpload.workspace_id == current_upload.workspace_id, 
            DataUpload.upload_type == current_upload.upload_type, 
            DataUpload.id != current_upload.id
        ).order_by(DataUpload.uploaded_at.desc()).first()
        
        schema_has_changed, row_count_has_changed = False, False
        new_cols, old_cols = set(new_schema.keys()), set()
        old_row_count = 0
        
        if previous_upload and previous_upload.analysis_results:
            if previous_upload.upload_type == current_upload.upload_type:
                old_schema = previous_upload.schema_info or {}
                old_cols = set(old_schema.keys())
                
                # Compare Sets (Fast)
                if old_cols != new_cols: 
                    schema_has_changed = True
                
                old_row_count = previous_upload.analysis_results.get("row_count", 0)
                if old_row_count != new_row_count: 
                    row_count_has_changed = True
        
        # 5. Generate Stats & Sanitize (Critical for Postgres)
        # include='all' gets stats for text columns too (count, unique, top)
        stats_df = df.describe(include='all')
        raw_summary = stats_df.to_dict()
        summary_stats = clean_nan(raw_summary) # <--- Prevents JSON crash
        
        analysis_results = {
            "row_count": new_row_count, 
            "column_count": len(df.columns), 
            "summary_stats": summary_stats
        }
        
        # Update Record
        current_upload.schema_info = new_schema
        current_upload.analysis_results = analysis_results
        current_upload.schema_changed_from_previous = schema_has_changed
        
        # 6. Notifications & Insights
        workspace = db.query(Workspace).filter(Workspace.id == current_upload.workspace_id).first()
        if workspace:
            if schema_has_changed or row_count_has_changed:
                ai_insight_text = None
                schema_changes_dict = {}
                
                if schema_has_changed:
                    schema_changes_dict = {'added': list(new_cols - old_cols), 'removed': list(old_cols - new_cols)}
                    ai_insight_text = get_ai_insight(schema_changes_dict)
                
                notification_message = f"Structural change detected in workspace '{workspace.name}'."
                
                # Notify all team members
                users_to_notify = list(set(workspace.team_members + [workspace.owner]))
                for user in users_to_notify:
                    new_notification = Notification(
                        user_id=user.id, 
                        workspace_id=workspace.id, 
                        message=notification_message, 
                        ai_insight=ai_insight_text
                    )
                    db.add(new_notification)
                    new_notifications_created = True
                
                logger.info(f"🔔 [WORKER] Created {len(users_to_notify)} notifications.")
                
                # Prepare Email
                percent_change = "0%"
                if old_row_count > 0:
                    percent_change = f"{((new_row_count - old_row_count) / old_row_count) * 100:+.1f}%"
                
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
                        'old_rows': old_row_count, 
                        'new_rows': new_row_count, 
                        'percent_change': percent_change
                    } if row_count_has_changed else {} 
                }
                
                recipients = [user.email for user in users_to_notify]
                
                logger.info("[WORKER] Scheduling detailed alert email...")
                # Safe async call
                run_async_safely(send_detailed_alert_email(recipients, email_context), loop)

            # 7. Check Alerts (Passing Loop is Critical)
            check_alert_rules(db, workspace, current_upload, analysis_results, loop)
            
        db.commit()
        logger.info(f"💾 [WORKER] Success. Upload {upload_id} committed.")
        
        if APP_MODE == "production" and new_notifications_created:
                # If notifications were created, push a signal to every relevant user
                for user in users_to_notify:
                    user_id_str = str(user.id)
                    
                    # Call the manager to send a signal to the user's global notification channel
                    run_async_safely(
                        manager.push_to_user(
                            user_id=user_id_str,
                            message={"type": "NEW_NOTIFICATION_ALERT"}
                        ),
                        loop
                    )
                logger.info("📡 [WORKER] Pushed NEW_NOTIFICATION_ALERT signal to affected users.")
            # ------------------------------------------------------------------

        status_message = "job_complete"
        return {"status": "success"}

    except Exception as e:
        logger.error(f"❌ [WORKER] Processing Error: {e}", exc_info=True)
        status_message = "job_error"
        return {"status": "error", "message": str(e)}
    
    finally:
        # 8. Signal Frontend (The "Stuck Spinner" Fix)
        if APP_MODE == "production" and workspace_id_str:
            logger.info(f"📡 [WORKER] Signaling '{status_message}' for {workspace_id_str}...")
            # Safe async broadcast
            run_async_safely(
                manager.broadcast_to_workspace(workspace_id_str, status_message),
                loop
            )
        
        db.close()
# ====================================================================
#  The "OTP Email Chef" - Helper for auth.py
# ====================================================================
async def send_otp_email_task_async(to_email: str, otp: str, subject_type: str) -> None:
    """
    This is the helper function that auth.py calls.
    It runs the async email function in the background.
    """
    logger.info(f"📨 [WORKER] Preparing to send OTP email to {to_email}...")
    # This calls the *real* email sending function from email_service.py
    await send_otp_email(to_email, otp, subject_type)