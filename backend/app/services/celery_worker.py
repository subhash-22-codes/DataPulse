import os
import pandas as pd
import asyncio
import redis
import requests
import logging
import datetime as dt
import json
import re 
from celery import Celery
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text  
from pathlib import Path
from datetime import datetime, timedelta, timezone
# import google.generativeai as genai
# import markdown2
import pytz
from urllib.parse import quote_plus
from io import StringIO 
import numpy as np
import operator
from typing import Coroutine, Any 


from app.core.database import SessionLocal
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.user import User
from app.models.notification import Notification
from app.models.alert_rule import AlertRule
from app.services.email_service import send_detailed_alert_email, send_threshold_alert_email, send_otp_email
from app.core.connection_manager import manager
from app.models.token import RefreshToken
from app.models.feedback import Feedback

# Setup & Safety Config
logger = logging.getLogger(__name__)
redis_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
APP_MODE = os.getenv("APP_MODE", "development") 


# Define the Celery app
celery_app = Celery("tasks", broker=redis_url, backend=redis_url)

celery_app.conf.update(
    task_track_started=True,
    timezone='UTC',
    task_serializer='json',
    accept_content=['json'],  # content type for safety
    result_serializer='json',
    task_time_limit=300,      # Hard limit: tasks can't run forever (Survival)
    task_soft_time_limit=240  # Soft limit: allows cleanup before being killed
)

celery_app.conf.beat_schedule = {
    "trigger-smart-watch-every-minute": {
        "task": "schedule_data_fetches",
        "schedule": 60.0,
    },
}
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# Utility function to convert UTC to IST string (for email contexts, etc)
def convert_utc_to_ist_str(utc_dt):
    if not utc_dt: return "N/A"
    try:
        ist_zone = pytz.timezone('Asia/Kolkata')
        aware_utc_dt = pytz.utc.localize(utc_dt) if utc_dt.tzinfo is None else utc_dt
        ist_dt = aware_utc_dt.astimezone(ist_zone)
        return ist_dt.strftime("%B %d, %Y, %I:%M %p %Z")
    except Exception:
        return "Invalid Date"


# TASKS 

@celery_app.task(name="schedule_data_fetches")
def schedule_data_fetches():
    logger.info("⏰ [BEAT] Checking for due data fetches (Mirroring Cloud Logic)...")
    
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        workspaces = db.query(
            Workspace.id,
            Workspace.name,
            Workspace.polling_interval,
            Workspace.last_polled_at,
            Workspace.data_source
        ).filter(
            Workspace.is_polling_active == True
        ).all()

        if not workspaces:
            logger.info("-> No active workspaces found.")
            return
        
        buffer = timedelta(seconds=150)
        triggered_count = 0

        for ws in workspaces:
            try:
                is_due = False
                last_polled = ws.last_polled_at
                interval = ws.polling_interval

                if not last_polled:
                    is_due = True
                elif interval == '15min':
                    if (now - last_polled) >= (timedelta(minutes=15) - buffer): 
                        is_due = True
                elif interval == 'hourly':
                    if (now - last_polled) >= (timedelta(hours=1) - buffer): 
                        is_due = True
                elif interval == '3hours':
                    if (now - last_polled) >= (timedelta(hours=3) - buffer): 
                        is_due = True
                elif interval == '12hours':
                    if (now - last_polled) >= (timedelta(hours=12) - buffer): 
                        is_due = True
                elif interval == 'daily':
                    if (now - last_polled) >= (timedelta(days=1) - buffer): 
                        is_due = True
                elif interval == 'every_minute': # Keeping your local dev interval too
                    if (now - last_polled) > timedelta(minutes=1): 
                        is_due = True

                if is_due:
                    if ws.data_source == 'API':
                        fetch_api_data.delay(str(ws.id))
                        triggered_count += 1
                    elif ws.data_source == 'DB':
                        fetch_db_data.delay(str(ws.id))
                        triggered_count += 1
                        
            except Exception as e:
                logger.error(f"Error analyzing workspace {ws.id}: {e}")
                continue
        
        if triggered_count > 0:
            logger.info(f"Offloaded {triggered_count} jobs to Celery workers.")

    except Exception as e:
        logger.error(f"Critical Scheduler Failure: {e}", exc_info=True)
    finally:
        db.close()

# HELPER FOR ASYNC BROADCASTS IN CELERY WORKERS ---
def run_sync(coro):

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)

# Kill Poller Helper (for API & DB fetchers)
def kill_poller(db: Session, workspace_id: str, user_message: str, internal_reason: str, is_hard_fail: bool = True):
    try:
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws: return

        now = datetime.now(timezone.utc)

        if is_hard_fail:
            if ws.is_polling_active:
                ws.is_polling_active = False
                ws.last_failure_reason = user_message   
                ws.auto_disabled_at = now
                ws.failure_count = 0
                db.commit()
                logger.warning(f"🛑 [HARD KILL] '{ws.name}': {internal_reason}")
        else:
            ws.failure_count += 1
            ws.last_failure_reason = user_message
            if ws.failure_count >= 3:
                ws.is_polling_active = False
                ws.auto_disabled_at = now
                logger.error(f"🚨 [SOFT KILL] '{ws.name}' | {internal_reason}")
            db.commit()

        # Broadcast to UI
        payload = {
            "type": "job_error", 
            "workspace_id": str(workspace_id),
            "error": user_message,
            "is_hard_fail": is_hard_fail
        }
        
        # We use run_sync to bridge Celery -> WebSockets
        redis_client.publish("workspace_updates", json.dumps(payload))
        logger.info(f"📡 Published 'job_error' to Redis for {workspace_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"[KILL_POLLER] DB Update Failed: {e}")


@celery_app.task(name="fetch_api_data")
def fetch_api_data(workspace_id: str):
    logger.info(f"🤖 [API FETCHER] Starting API fetch: {workspace_id}")
    db: Session = SessionLocal()
    MAX_BYTES = 5 * 1024 * 1024
    
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace or not workspace.is_polling_active:
            return
            
        header_name = workspace.api_header_name
        header_value = workspace.api_header_value

        if header_name == "Authorization":
            if not header_value or not header_value.startswith(("Bearer ", "Basic ")):
                kill_poller(db, workspace_id, user_message="The Authorization header is missing or invalid. Please provide a valid Bearer or Basic token.", internal_reason="Hard Fail: Malformed Authorization header", is_hard_fail=True)
                return
        
        if not workspace.api_url or not workspace.api_url.startswith("http"):
            kill_poller(db, workspace_id, user_message="The API URL is missing or invalid. Please provide a valid HTTP or HTTPS endpoint.", internal_reason="Hard Fail: Invalid API URL", is_hard_fail=True)
            return

        headers = {header_name: header_value} if header_name and header_value else {}
        
        try:
            response = requests.get(workspace.api_url, headers=headers, timeout=(10, 30), stream=True)
            
            cl = response.headers.get('Content-Length')
            if cl and int(cl) > MAX_BYTES:
                kill_poller(db, workspace_id, user_message="The data source is too large (>5MB). Please reduce the payload size.", internal_reason="Hard Fail: Payload exceeds 5MB limit", is_hard_fail=True)
                return
            
            if response.status_code in [401, 403]:
                kill_poller(db, workspace_id, user_message="The API rejected the request due to invalid or missing credentials. Please verify your API key or token.", internal_reason=f"API Auth Failed ({response.status_code})", is_hard_fail=True)
                return

            response.raise_for_status()
            
            content = b""
            for chunk in response.iter_content(chunk_size=8192):
                content += chunk
                if len(content) > MAX_BYTES:
                    kill_poller(db, workspace_id, user_message="Data stream exceeds the 5MB limit allowed on this plan.", internal_reason="Hard Fail: Stream exceeded 5MB limit", is_hard_fail=True)
                    return

        except requests.exceptions.HTTPError as http_err:
            kill_poller(db, workspace_id, user_message="The API responded with an error while processing the request. We'll retry automatically.", internal_reason=f"HTTP Error: {http_err}", is_hard_fail=False)
            return
        except requests.Timeout:
            kill_poller(db, workspace_id, user_message="The API took too long to respond. We'll retry automatically.", internal_reason="Network Timeout while calling API", is_hard_fail=False)
            return
        except requests.RequestException as req_err:
            kill_poller(db, workspace_id, user_message="We couldn't reach the API due to a network issue. We'll retry automatically.", internal_reason=f"Request error: {str(req_err)[:120]}", is_hard_fail=False)
            return

        data = json.loads(content)
        del content
        if not data:
            kill_poller(db, workspace_id, user_message="The API request succeeded but returned no data. Please check filters or response format.", internal_reason="Soft Fail: API returned empty response", is_hard_fail=False)
            return

        df = pd.json_normalize(data)
        csv_content = df.to_csv(index=False)
        del data     
        del df
        
        new_upload = DataUpload(
            workspace_id=workspace.id, 
            file_path=f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_api.csv",
            file_content=csv_content,
            upload_type='api_poll'
        )
        db.add(new_upload)

        workspace.last_polled_at = datetime.now(timezone.utc)
        workspace.failure_count = 0 
        
        db.commit()
        db.refresh(new_upload)
        
        process_csv_task.delay(str(new_upload.id))

    except Exception as e:
        logger.error(f"[API FETCHER] Unexpected Engine Crash: {e}", exc_info=True)
        kill_poller(db, workspace_id, user_message="Something went wrong while fetching data from the API. We've stopped this task to prevent further issues.", internal_reason=f"API Fetcher Crash: {str(e)[:120]}", is_hard_fail=False)
    finally:
        db.close()


@celery_app.task(name="fetch_db_data")
def fetch_db_data(workspace_id: str):
    MAX_ROWS = 25000
    logger.info(f"[DB FETCHER] Starting DB fetch for workspace: {workspace_id}")
    db: Session = SessionLocal()
    engine = None
    
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        
        if not workspace:
            logger.warning(f"-> [DB FETCHER] Workspace {workspace_id} not found.")
            return

        if not workspace.is_polling_active:
            logger.warning(f"-> [DB FETCHER] Polling disabled for {workspace.name}. Aborting.")
            return

        if not all([workspace.db_host, workspace.db_user, workspace.db_password, workspace.db_name, workspace.db_query]):
            kill_poller(db, workspace_id, user_message="Database connection details are missing or incomplete. Please review your database settings.", internal_reason="Hard Fail: Incomplete DB configuration", is_hard_fail=True)
            return

        raw_query = workspace.db_query.strip()
        clean_query = raw_query.rstrip(';')
        query_no_comments = re.sub(r'(--.*)|(/\*[\s\S]*?\*/)', ' ', clean_query)
        lower_query = query_no_comments.lower()

        if not lower_query.strip().startswith("select"):
            kill_poller(db, workspace_id, user_message="Only read-only SELECT queries are allowed.", internal_reason="Security: Non-SELECT start", is_hard_fail=True)
            return

        if ";" in clean_query:
            kill_poller(db, workspace_id, user_message="Multiple statements are not permitted.", internal_reason="Security: Semicolon detected", is_hard_fail=True)
            return

        forbidden_keywords = {
            'insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create', 
            'grant', 'revoke', 'vacuum', 'copy', 'pg_read_file', 'pg_write_file', 
            'lo_export', 'lo_import', 'dblink', 'program', 'pg_sleep'
        }
        query_words = set(lower_query.replace('(', ' ').replace(')', ' ').replace(',', ' ').split())
        found_forbidden = query_words.intersection(forbidden_keywords)

        if found_forbidden:
            kill_poller(db, workspace_id, user_message=f"Restricted keywords detected: {', '.join(found_forbidden)}", internal_reason="Security: Forbidden keywords", is_hard_fail=True)
            return

        try:
            encoded_password = quote_plus(workspace.db_password)
            port = workspace.db_port or 5432 
            connection_url = f"postgresql://{workspace.db_user}:{encoded_password}@{workspace.db_host}:{port}/{workspace.db_name}"
            
            engine = create_engine(
                connection_url, 
                pool_pre_ping=True,
                connect_args={"options": "-c statement_timeout=30000"} 
            )
            
            with engine.connect() as connection:
                #  Sandbox Logic
                connection.execute(text("SET work_mem = '4MB';"))
                connection.execute(text("SET temp_buffers = '2MB';"))
                
                #  Row-Limit Logic
                safe_query = f"SELECT * FROM ({clean_query}) AS user_query LIMIT {MAX_ROWS + 1}"
                df = pd.read_sql(text(safe_query), connection)

            if len(df) > MAX_ROWS:
                kill_poller(db, workspace_id, user_message=f"Query result too large (Max {MAX_ROWS} rows).", internal_reason="Hard Fail: SQL row limit exceeded", is_hard_fail=True)
                return

        except Exception as conn_err:
            err_msg = str(conn_err).lower()
            # error parsing
            auth_patterns = ["authentication failed", "login failed", "password"]
            if any(p in err_msg for p in auth_patterns):
                kill_poller(db, workspace_id, user_message="We couldn't connect to your database. Please verify the username and password.", internal_reason="Auth failure", is_hard_fail=True)
            else:
                kill_poller(db, workspace_id, user_message="We're having trouble reaching your database right now.", internal_reason="Temporary DB issue", is_hard_fail=False)
            return

        if df.empty:
            kill_poller(db, workspace_id, user_message="Your query ran successfully but didn't return any data.", internal_reason="Soft Fail: Query returned 0 rows", is_hard_fail=False)
            return

        csv_content = df.to_csv(index=False)
        new_upload = DataUpload(
            workspace_id=workspace.id, 
            file_path=f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_db.csv",
            file_content=csv_content,
            upload_type='db_query'
        )
        db.add(new_upload)
        workspace.last_polled_at = datetime.now(timezone.utc)
        workspace.failure_count = 0
        db.commit()
        db.refresh(new_upload)

        process_csv_task.delay(str(new_upload.id))

    except Exception as e:
        logger.error(f"[DB FETCHER] Critical Engine Crash: {e}", exc_info=True)
        kill_poller(db, workspace_id, user_message="Something went wrong while processing your data.", internal_reason=f"Engine Crash: {str(e)[:120]}", is_hard_fail=False)
        
    finally:
        if engine: engine.dispose()
        db.close()


def check_alert_rules(
    db: Session, 
    workspace: Workspace, 
    current_upload: DataUpload, 
    analysis_results: dict
) -> None:

    logger.info(f"[ENGINE] Scanning rules for Workspace: {workspace.name}...")


    rules = db.query(AlertRule).filter(
        AlertRule.workspace_id == workspace.id, 
        AlertRule.is_active == True
    ).all()
    
    if not rules:
        logger.info("-> No active alert rules found.")
        return

    stats = analysis_results.get("summary_stats", {})
    if not stats:
        logger.warning("-> Engine aborted: No statistics found in upload.")
        return

    execution_fingerprint = f"upload_{current_upload.id}_ws_{workspace.id}"
    already_processed = db.query(Notification).filter(
        Notification.workspace_id == workspace.id,
        Notification.idempotency_key == execution_fingerprint
    ).first()

    if already_processed:
        logger.info(f"[GUARD] Already processed {execution_fingerprint}. Skipping.")
        return

    ops = {
        'greater_than': operator.gt,
        'less_than': operator.lt,
        'equals': operator.eq,
        'not_equals': operator.ne
    }

    triggered_alerts = []
    users_to_notify = list(set(workspace.team_members + [workspace.owner]))

    for rule in rules:
        try:
            col_stats = stats.get(rule.column_name)
            if not col_stats:
                continue 
            
            actual_value_raw = col_stats.get(rule.metric)
            if actual_value_raw is None:
                continue

            actual_value = round(float(actual_value_raw), 4)
            threshold_value = round(float(rule.value), 4)

            compare_func = ops.get(rule.condition)
            if not compare_func or not compare_func(actual_value, threshold_value):
                continue

            triggered_alerts.append({
                "rule_id": str(rule.id),
                "column_name": rule.column_name,
                "metric": rule.metric.replace('50%', 'median').upper(),
                "condition": rule.condition.replace('_', ' '),
                "threshold": threshold_value,
                "actual": actual_value
            })

        except Exception as e:
            logger.error(f"[ENGINE] Error evaluating rule {rule.id}: {e}")
            continue
        
    if triggered_alerts:
        try:
            summary_msg = f"Alert: {len(triggered_alerts)} violations detected in '{workspace.name}'."
            
            # Create DB notifications for all users
            for user in users_to_notify:
                new_notif = Notification(
                    user_id=user.id,
                    workspace_id=workspace.id,
                    message=summary_msg,
                    idempotency_key=execution_fingerprint 
                )
                db.add(new_notif)
            
            db.commit()
            logger.info(f"[DB] Records committed for fingerprint: {execution_fingerprint}")

        except Exception as e:
            db.rollback()
            logger.error(f"[DB] Database error, aborting alerts: {e}")
            return

        recipients = [user.email for user in users_to_notify]
        timestamp_to_use = current_upload.uploaded_at or datetime.now(timezone.utc)
        email_context = { 
            "workspace_name": workspace.name, 
            "triggered_alerts": triggered_alerts, 
            "file_name": current_upload.file_path,
            "upload_time": convert_utc_to_ist_str(timestamp_to_use),
            "workspace_id": str(workspace.id),
            "idempotency_key": execution_fingerprint
        }

        for user in users_to_notify:
            run_sync(
                manager.push_to_user(
                    user_id=str(user.id),
                    message={"type": "NEW_NOTIFICATION_ALERT", "count": len(triggered_alerts)}
                )
            )

        # Batch Email: One email with ALL violations (avoids spamming inboxes if multiple rules are broken)
        run_sync(send_threshold_alert_email(recipients, email_context))
        
        logger.info(f"[WORKER] Side effects sent for {len(triggered_alerts)} alerts.")
    else:
        logger.info(f"[WORKER] Scan complete: No violations found.")
            
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
    logger.info(f"[WORKER] Starting REAL processing for upload ID: {upload_id}...")
    db: Session = SessionLocal()
    workspace_id_str = None
    status_message = "job_error"
    new_notifications_created = False
    
    MAX_ROWS = 25000 
    
    try:
        current_upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
        if not current_upload: 
            logger.warning(f"[WORKER] Upload ID {upload_id} not found.")
            return
        
        workspace_id_str = str(current_upload.workspace_id)
        csv_content = current_upload.file_content
        if not csv_content: 
            logger.warning(f"[WORKER] No content for upload {upload_id}.")
            return

        is_truncated = False
        try:
            df = pd.read_csv(StringIO(csv_content), nrows=MAX_ROWS + 1)
            original_row_count = len(df)
            
            if original_row_count > MAX_ROWS:
                is_truncated = True
                logger.warning(f"⚠️ [WORKER] Truncating file {upload_id} to {MAX_ROWS} rows for RAM safety.")
                df = df.head(MAX_ROWS)

            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='ignore')
                
        except Exception as e:
            logger.error(f"❌ Failed to parse CSV: {e}")
            status_message = "job_error"
            return {"status": "error"}

        new_schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
        new_row_count = len(df)

        previous_upload = db.query(DataUpload).filter(
            DataUpload.workspace_id == current_upload.workspace_id, 
            DataUpload.upload_type == current_upload.upload_type, 
            DataUpload.id != current_upload.id
        ).order_by(DataUpload.uploaded_at.desc()).first()
        
        schema_has_changed, row_count_has_changed = False, False
        new_cols, old_cols = set(new_schema.keys()), set()
        old_row_count = 0
        
        if previous_upload and previous_upload.analysis_results:
            old_schema = previous_upload.schema_info or {}
            old_cols = set(old_schema.keys())
            if old_cols != new_cols: schema_has_changed = True
            
            old_row_count = previous_upload.analysis_results.get("row_count", 0)
            if old_row_count != new_row_count: row_count_has_changed = True

        stats_df = df.describe(include='all')
        raw_summary = stats_df.to_dict()
        summary_stats = clean_nan(raw_summary) 
        
        analysis_results = {
            "row_count": new_row_count, 
            "column_count": len(df.columns), 
            "summary_stats": summary_stats,
            "is_truncated": is_truncated
        }
        
        current_upload.schema_info = new_schema
        current_upload.analysis_results = analysis_results
        current_upload.schema_changed_from_previous = schema_has_changed
        
        del df
        del stats_df

        workspace = db.query(Workspace).filter(Workspace.id == current_upload.workspace_id).first()
        if workspace:
            if schema_has_changed or row_count_has_changed:
                ai_insight_text = None
                schema_changes_dict = {}
                
                if schema_has_changed:
                    schema_changes_dict = {'added': list(new_cols - old_cols), 'removed': list(old_cols - new_cols)}
                    ai_insight_text = None
                
                notification_message = f"Structural change detected in workspace '{workspace.name}'."
                users_to_notify = list(set(workspace.team_members + [workspace.owner]))
                
                for user in users_to_notify:
                    db.add(Notification(
                        user_id=user.id, 
                        workspace_id=workspace.id, 
                        message=notification_message, 
                        ai_insight=ai_insight_text
                    ))
                    new_notifications_created = True
    
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
                    "metric_changes": {'old_rows': old_row_count, 'new_rows': new_row_count, 'percent_change': percent_change} if row_count_has_changed else {} 
                }
                
                recipients = [user.email for user in users_to_notify]
                run_sync(send_detailed_alert_email(recipients, email_context))

            check_alert_rules(db, workspace, current_upload, analysis_results)
            
        db.commit()
        status_message = "job_complete"

        if new_notifications_created:
            for user in users_to_notify:
                run_sync(manager.push_to_user(str(user.id), {"type": "NEW_NOTIFICATION_ALERT"}))

        return {"status": "success"}

    except Exception as e:
        logger.error(f"[WORKER] Error: {e}", exc_info=True)
        status_message = "job_error"
        return {"status": "error", "message": str(e)}
    
    finally:
        if workspace_id_str:
            payload = {"type": status_message, "workspace_id": workspace_id_str}
            redis_client.publish("workspace_updates", json.dumps(payload))
            logger.info(f"[WORKER] Published '{status_message}' to Redis for {workspace_id_str}")
        
        db.close()


@celery_app.task(name="send_otp_email_task")
def send_otp_email_task(to_email: str, otp: str, subject_type: str) -> None:

    logger.info(f"[WORKER] Sending {subject_type} email to {to_email}...")
    try:
        asyncio.run(send_otp_email(to_email, otp, subject_type))
        logger.info(f"[WORKER] Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"[WORKER] Failed to send OTP email: {e}", exc_info=True)