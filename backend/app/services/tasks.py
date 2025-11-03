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
from urllib.parse import quote_plus
from io import StringIO

# --- All Celery/Redis imports are REMOVED ---

from app.core.database import SessionLocal
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.user import User
from app.models.notification import Notification
from app.models.alert_rule import AlertRule
# --- We now import our email functions directly ---
from app.services.email_service import send_detailed_alert_email, send_threshold_alert_email, send_otp_email

# --- Setup ---
logger = logging.getLogger(__name__)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- All Celery/Redis app definitions are REMOVED ---


def convert_utc_to_ist_str(utc_dt):
    if not utc_dt:
        return "N/A"
    try:
        ist_zone = pytz.timezone('Asia/Kolkata')
        aware_utc_dt = pytz.utc.localize(utc_dt) if utc_dt.tzinfo is None else utc_dt
        ist_dt = aware_utc_dt.astimezone(ist_zone)
        return ist_dt.strftime("%B %d, %Y, %I:%M %p %Z")
    except Exception:
        return "Invalid Date"

# ====================================================================
#  The "Universal Alarm Clock" Job
# ====================================================================
# --- NOTE: This is now a NORMAL function, not a Celery task ---
def schedule_data_fetches():
    logger.info("⏰ [SCHEDULER] 'Smart Watch' alarm rang. Checking for scheduled data fetches...")
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        workspaces_to_check = db.query(Workspace).filter(Workspace.is_polling_active == True).all()
        logger.info(f"-> Found {len(workspaces_to_check)} workspace(s) with active polling.")

        for ws in workspaces_to_check:
            is_due = False
            # ... (All your time-checking logic is 100% correct and unchanged) ...
            if ws.polling_interval == 'every_minute':
                 if not ws.last_polled_at or (now - ws.last_polled_at) > timedelta(minutes=1):
                    is_due = True
            elif ws.polling_interval == 'hourly':
                 if not ws.last_polled_at or (now - ws.last_polled_at) > timedelta(hours=1):
                    is_due = True
            elif ws.polling_interval == 'daily':
                 if not ws.last_polled_at or (now - ws.last_polled_at) > timedelta(days=1):
                    is_due = True

            if is_due:
                # --- THIS IS THE KEY ---
                # Instead of .delay(), we just CALL the function directly.
                # This all runs inside the main API process.
                if ws.data_source == 'API' and ws.api_url:
                    logger.info(f"✅ API DUE! Running API fetch for '{ws.name}'.")
                    fetch_api_data(str(ws.id))
                elif ws.data_source == 'DB' and ws.db_host and ws.db_query:
                    logger.info(f"✅ DB DUE! Running DB fetch for '{ws.name}'.")
                    fetch_db_data(str(ws.id))
    finally:
        db.close()

# ====================================================================
#  The "API Fetcher Robot"
# ====================================================================
def fetch_api_data(workspace_id: str):
    logger.info(f"🤖 [API FETCHER] Starting API fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not (workspace and workspace.api_url):
            logger.warning(f"-> [API FETCHER] Workspace or API URL not found for {workspace_id}. Aborting.")
            return
        
        # ... (Fetching logic is unchanged) ...
        response = requests.get(workspace.api_url)
        response.raise_for_status()
        data = response.json()
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
        workspace.last_polled_at = datetime.utcnow()
        db.commit()
        db.refresh(new_upload)

        logger.info("-> [API FETCHER] Handing off to the analyzer task...")
        # --- THE KEY CHANGE: Call the function directly, no .delay() ---
        process_csv_task(str(new_upload.id))

    except Exception as e:
        logger.error(f"❌ [API FETCHER] An error occurred: {e}", exc_info=True)
    finally:
        db.close()

# ====================================================================
#  The "Database Robot"
# ====================================================================
def fetch_db_data(workspace_id: str):
    logger.info(f"🤖 [DB FETCHER] Starting DB fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not (workspace and workspace.db_host and workspace.db_user and workspace.db_password and workspace.db_name and workspace.db_query):
            logger.warning(f"-> [DB FETCHER] Incomplete DB config for {workspace_id}. Aborting.")
            return
        
        # ... (DB connection logic is unchanged) ...
        encoded_password = quote_plus(workspace.db_password)
        connection_url = f"postgresql://{workspace.db_user}:{encoded_password}@{workspace.db_host}:{workspace.db_port}/{workspace.db_name}"
        engine = create_engine(connection_url)
        with engine.connect() as connection:
            df = pd.read_sql(workspace.db_query, connection)

        csv_content = df.to_csv(index=False)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{timestamp}_db_query.csv"

        new_upload = DataUpload(
            workspace_id=workspace.id, 
            file_path=file_name,
            file_content=csv_content,
            upload_type='db_query'
        )
        db.add(new_upload)
        workspace.last_polled_at = datetime.utcnow()
        db.commit()
        db.refresh(new_upload)

        logger.info("-> [DB FETCHER] Handing off to the analyzer task...")
        # --- THE KEY CHANGE: Call the function directly, no .delay() ---
        process_csv_task(str(new_upload.id))

    except Exception as e:
        logger.error(f"❌ [DB FETCHER] An error occurred: {e}", exc_info=True)
    finally:
        db.close()
        
# ====================================================================
#  The "AI Business Analyst"
# ====================================================================
def get_ai_insight(schema_changes: dict) -> str | None:
    # ... (This function is 100% unchanged and correct)
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not found. Skipping AI insight.")
        return None
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        added = schema_changes.get('added', [])
        removed = schema_changes.get('removed', [])
        prompt = f"As a business analyst for DataPulse, analyze the following schema change: Columns Added: {', '.join(added) if added else 'None'}. Columns Removed: {', '.join(removed) if removed else 'None'}. Provide a concise, professional insight in well-formatted Markdown, including a brief summary and a bulleted list of 2-3 new business questions the user can now answer."
        logger.info("🧠 [AI] Generating formatted insight from Gemini...")
        response = model.generate_content(prompt)
        insight_html = markdown2.markdown(response.text.strip())
        logger.info("✨ [AI] Insight generated and converted to HTML successfully.")
        return insight_html
    except Exception as e:
        logger.error(f"❌ [AI] Error generating insight: {e}", exc_info=True)
        return "<p>AI analysis could not be performed for this change.</p>"
        
# ====================================================================
#  The "Rule Checker"
# ====================================================================
def check_alert_rules(db: Session, workspace: Workspace, current_upload: DataUpload, analysis_results: dict):
    # ... (This function is 100% unchanged and correct)
    rules = db.query(AlertRule).filter(AlertRule.workspace_id == workspace.id, AlertRule.is_active == True).all()
    if not rules: return
    users_to_notify = list(set(workspace.team_members + [workspace.owner]))
    recipients = [user.email for user in users_to_notify]
    for rule in rules:
        try:
            actual_value = analysis_results["summary_stats"][rule.column_name][rule.metric]
            triggered = False
            if rule.condition == 'greater_than' and actual_value > rule.value: triggered = True
            elif rule.condition == 'less_than' and actual_value < rule.value: triggered = True
            if triggered:
                message = f"Smart Alert: '{rule.column_name}' {rule.metric} was {actual_value:.2f}, triggering rule '{rule.condition.replace('_', ' ')} {rule.value}'."
                logger.info(f"🚨 [WORKER] Alert Triggered: {message}")
                for user in users_to_notify:
                    notification = Notification(user_id=user.id, workspace_id=workspace.id, message=message)
                    db.add(notification)
                email_context = { "workspace_name": workspace.name, "rule": { "column_name": rule.column_name, "metric": rule.metric, "condition": rule.condition, "value": rule.value }, "actual_value": actual_value, "file_name": current_upload.file_path, "upload_time": convert_utc_to_ist_str(current_upload.uploaded_at), }
                asyncio.run(send_threshold_alert_email(recipients, email_context))
        except (KeyError, TypeError):
            continue

# ====================================================================
#  The "Analyzer Robot"
# ====================================================================
def process_csv_task(upload_id: str):
    logger.info(f"🚀 [WORKER] Starting REAL processing for upload ID: {upload_id}...")
    db: Session = SessionLocal()
    try:
        # ... (This entire function's logic is 100% unchanged, we just removed the 'redis_client.publish' at the end) ...
        current_upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
        if not current_upload: return
        csv_content = current_upload.file_content
        if not csv_content: return
        df = pd.read_csv(StringIO(csv_content))
        new_schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
        new_row_count = len(df)
        workspace_id = current_upload.workspace_id
        previous_upload = db.query(DataUpload).filter(DataUpload.workspace_id == workspace_id, DataUpload.upload_type == current_upload.upload_type, DataUpload.id != current_upload.id).order_by(DataUpload.uploaded_at.desc()).first()
        schema_has_changed, row_count_has_changed = False, False
        new_cols, old_cols = set(new_schema.keys()), set()
        if previous_upload and previous_upload.analysis_results:
            if previous_upload.upload_type == current_upload.upload_type:
                old_schema = previous_upload.schema_info or {}
                old_cols = set(old_schema.keys())
                if old_cols != new_cols: schema_has_changed = True
                old_row_count = previous_upload.analysis_results.get("row_count")
                if old_row_count is not None and old_row_count != new_row_count: row_count_has_changed = True
        
        analysis_results = {"row_count": new_row_count, "column_count": len(df.columns), "summary_stats": df.describe().to_dict()}
        current_upload.schema_info = new_schema
        current_upload.analysis_results = analysis_results
        current_upload.schema_changed_from_previous = schema_has_changed
        
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace:
            if schema_has_changed or row_count_has_changed:
                ai_insight_text = None
                schema_changes_dict = {}
                if schema_has_changed:
                    schema_changes_dict = {'added': list(new_cols - old_cols), 'removed': list(old_cols - new_cols)}
                    ai_insight_text = get_ai_insight(schema_changes_dict)
                notification_message = f"Structural change detected in workspace '{workspace.name}'."
                users_to_notify = list(set(workspace.team_members + [workspace.owner]))
                for user in users_to_notify:
                    new_notification = Notification(user_id=user.id, workspace_id=workspace.id, message=notification_message, ai_insight=ai_insight_text)
                    db.add(new_notification)
                logger.info(f"🔔 [WORKER] Created {len(users_to_notify)} notifications for structural change.")
                email_context = { "workspace_name": workspace.name, "upload_type": current_upload.upload_type, "new_file_name": current_upload.file_path, "old_file_name": previous_upload.file_path if previous_upload else "N/A", "upload_time_str": convert_utc_to_ist_str(current_upload.uploaded_at), "owner_info": {"name": workspace.owner.name, "email": workspace.owner.email}, "team_info": [{"name": member.name, "email": member.email} for member in workspace.team_members], "ai_insight": ai_insight_text, "schema_changes": schema_changes_dict, "metric_changes": {'old_rows': old_row_count, 'new_rows': new_row_count, 'percent_change': f"{((new_row_count - old_row_count) / old_row_count) * 100 if old_row_count != 0 else 0:+.1f}%"} if row_count_has_changed else {} }
                recipients = [user.email for user in users_to_notify]
                asyncio.run(send_detailed_alert_email(recipients, email_context))
            check_alert_rules(db, workspace, current_upload, analysis_results)
        
        db.commit()
        logger.info(f"💾 [WORKER] All database changes committed for upload {upload_id}.")
        return {"status": "success"}

    except Exception as e:
        logger.error(f"❌ [WORKER] An error occurred during processing for upload {upload_id}: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
        
# ====================================================================
#  The "OTP Email Chef" - Now a simple helper
# ====================================================================
async def send_otp_email_task_async(to_email: str, otp: str, subject_type: str):
    """
    This is a new helper function that our auth.py will call.
    It runs the async email function in the background.
    """
    logger.info(f"📨 [WORKER] Preparing to send OTP email to {to_email}...")
    await send_otp_email(to_email, otp, subject_type)

