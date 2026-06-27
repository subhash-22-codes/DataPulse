import os
import pandas as pd
import asyncio
import requests
import logging
import datetime as dt
import time
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from pathlib import Path
from datetime import datetime, timedelta, timezone, date
from io import BytesIO
# import google.generativeai as genai
import pytz
import operator 
import threading
from urllib.parse import quote_plus
from io import StringIO
import numpy as np 
from typing import Coroutine, Any
from app.core.database import SessionLocal
from app.models.workspace import Workspace
from app.models.data_upload import DataUpload
from app.models.user import User
from app.models.notification import Notification
from app.models.alert_rule import AlertRule
from app.models.feedback import Feedback
from app.models.workspace_user_settings import WorkspaceUserSettings
from app.models.table_daily_metrics import TableDailyMetrics
from app.models.column_daily_metrics import ColumnDailyMetrics
from app.models.incidents import Incident
from app.services.email_service import send_detailed_alert_email, send_threshold_alert_email, send_otp_email
from app.core.connection_manager import manager
import concurrent.futures
import json
import re
from sqlalchemy.exc import OperationalError, InterfaceError
from app.services.incident_engine import incident_engine
from app.services.incident_engine import _create_incident
from app.services.data_quality import analyze_dataframe_quality
from app.services.storage_service import download_file_bytes
from app.services.storage_service import upload_csv_bytes
from app.services.upload_limits import is_workspace_upload_limit_reached

# Create a ThreadPool at the module level to reuse threads
executor = concurrent.futures.ThreadPoolExecutor(max_workers=3)
logger = logging.getLogger(__name__)
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
APP_MODE = os.getenv("APP_MODE")
MODE_LOCAL = os.getenv("MODE_LOCAL", "false").lower()

#--------------------------------------------------------------------------
# gemini_model = None
# if GEMINI_API_KEY:
#     try:
#         genai.configure(api_key=GEMINI_API_KEY)
#         gemini_model = genai.GenerativeModel('gemini-2.5-flash')
#         logger.info("Gemini AI model initialized globally.")
#     except Exception as e:
#         logger.error(f"Failed to initialize Gemini AI: {e}")
#---------------------------------------------------------------------------
def convert_utc_to_ist_str(utc_dt):
    if not utc_dt: return "N/A"
    try:
        ist_zone = pytz.timezone('Asia/Kolkata')
        aware_utc_dt = pytz.utc.localize(utc_dt) if utc_dt.tzinfo is None else utc_dt
        ist_dt = aware_utc_dt.astimezone(ist_zone)
        return ist_dt.strftime("%B %d, %Y, %I:%M %p %Z")
    except Exception:
        return "Invalid Date"

#---------------------------------------------------------------------------------------------------
# AI_SYSTEM_PROMPT = """
# SYSTEM PROMPT (DO NOT CHANGE OUTPUT FORMAT):
# You are a Senior Data Analyst generating insights for a production SaaS dashboard.

# CRITICAL OUTPUT RULES:
# - Output ONLY plain Markdown
# - NO HTML tags (<p>, <ul>, etc.)
# - NO code blocks (no ``` or ` )
# - NO emojis or headings
# - NO assumptions beyond the provided data

# REQUIRED STRUCTURE:
# 1. Exactly ONE paragraph (1-2 sentences) summarizing the impact.
# 2. Exactly TWO bullet points using - (dash + space), each a business question.

# FAILURE HANDLING:
# If no meaningful insight can be derived, output a single plain sentence explaining that clearly.
# """.strip()

# def get_ai_insight(schema_changes: dict) -> str | None:
#     if not gemini_model:
#         logger.warning("Gemini model not available. Skipping AI insight.")
#         return None

#     added = schema_changes.get('added', [])
#     removed = schema_changes.get('removed', [])
    
#     if not added and not removed:
#         return "No significant schema changes were detected to analyze."

#     # Construct the User Query
#     user_query = (
#         f"Analyze these schema changes:\n"
#         f"Added Columns: {', '.join(added) if added else 'None'}\n"
#         f"Removed Columns: {', '.join(removed) if removed else 'None'}"
#     )

#     try:
#         logger.info("[AI] Requesting strict markdown insight...")
        
#         full_prompt = f"{AI_SYSTEM_PROMPT}\n\nUSER INPUT:\n{user_query}"
        
#         response = gemini_model.generate_content(full_prompt)
#         raw_text = response.text.strip()
#         clean_text = raw_text.replace("```markdown", "").replace("```", "").strip()
        
#         logger.info(" [AI] Insight generated successfully.")
#         return clean_text

#     except Exception as e:
#         logger.error(f" [AI] Error generating insight: {e}", exc_info=True)
#         return "AI analysis is currently unavailable due to a technical error."
#------------------------------------------------------------------------------------------------------    

def run_async_safely(coro: Coroutine[Any, Any, Any], loop: asyncio.AbstractEventLoop = None) -> None:

    # PATH 1: Running loop passed in (standard case from scheduler/API)
    # Non-blocking + exceptions logged via callback. Best of both worlds.
    if loop and loop.is_running():
        future = asyncio.run_coroutine_threadsafe(coro, loop)

        def _log_result(f: concurrent.futures.Future) -> None:
            try:
                f.result()
            except Exception as e:
                logger.error(f"[ASYNC] WebSocket coroutine failed: {e}", exc_info=True)

        future.add_done_callback(_log_result)
        return

    # PATH 2: No loop provided (direct/manual call)
    try:
        asyncio.run(coro)
    except RuntimeError as e:
        logger.warning(f"[ASYNC] asyncio.run failed ({e}). Attempting fallback loop.")
        fallback_loop = None
        try:
            fallback_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(fallback_loop)
            fallback_loop.run_until_complete(coro)
        except Exception as final_error:
            logger.error(f"[ASYNC] Fallback loop also failed: {final_error}", exc_info=True)
        finally:
            if fallback_loop:
                try:
                    fallback_loop.close()
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"[ASYNC] Unexpected error: {e}", exc_info=True)

def check_alert_rules(
    db: Session, 
    workspace: Workspace, 
    current_upload: DataUpload, 
    analysis_results: dict, 
    loop: asyncio.AbstractEventLoop = None
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
        logger.info(f" [GUARD] Already processed {execution_fingerprint}. Skipping.")
        return

    ops = {
        'greater_than': operator.gt,
        'less_than': operator.lt,
        'equals': operator.eq,
        'not_equals': operator.ne
    }

    triggered_alerts = []
    users_map = {str(u.id): u for u in (workspace.team_members + [workspace.owner])}
    users_to_notify = list(users_map.values())


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
            payload = {
                "workspace_name": workspace.name,
                "event": "data_violation",
                "violations_count": len(triggered_alerts),
                "rules_triggered": triggered_alerts,  
            }

            for user in users_to_notify:
                new_notif = Notification(
                    user_id=user.id,
                    workspace_id=workspace.id,
                    message=summary_msg,
                    idempotency_key=execution_fingerprint,
                    payload=payload,
                )
                db.add(new_notif)

            db.commit()
            logger.info(f"[ENGINE] Records committed for fingerprint: {execution_fingerprint}")

        except Exception as e:
            db.rollback()
            logger.error(f"[ENGINE] Database error, aborting: {e}")
            return

        user_ids = [u.id for u in users_to_notify]

        enabled_settings = db.query(WorkspaceUserSettings).filter(
            WorkspaceUserSettings.workspace_id == workspace.id,
            WorkspaceUserSettings.user_id.in_(user_ids),
            WorkspaceUserSettings.email_notifications_enabled == True,
        ).all()

        enabled_user_ids = {s.user_id for s in enabled_settings}

        recipients = [
            user.email for user in users_to_notify
            if user.id in enabled_user_ids
        ]

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
            run_async_safely(
                manager.push_to_user(
                    user_id=str(user.id),
                    message={"type": "NEW_NOTIFICATION_ALERT", "count": len(triggered_alerts)}
                ),
                loop
            )

        if recipients:
            run_async_safely(send_threshold_alert_email(recipients, email_context), loop)

        
        logger.info(f"[ENGINE] Side effects sent for {len(triggered_alerts)} alerts.")
    else:
        logger.info(f"[ENGINE] Scan complete: No violations found.")


def kill_poller(
    db: Session,
    workspace_id: str,
    user_message: str,
    internal_reason: str,
    is_hard_fail: bool = True,
    loop: asyncio.AbstractEventLoop = None,
):
    terminal = False
    ws = None

    try:
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws:
            return

        now = datetime.now(timezone.utc)

        if is_hard_fail:
            if ws.is_polling_active:
                ws.is_polling_active = False
                ws.last_failure_reason = user_message
                ws.auto_disabled_at = now
                ws.failure_count = 0
                terminal = True
                db.commit()
                logger.warning(f"[HARD KILL] '{ws.name}': {internal_reason}")
        else:
            ws.failure_count += 1
            ws.last_failure_reason = user_message

            if ws.failure_count >= 3:
                ws.is_polling_active = False
                ws.auto_disabled_at = now
                terminal = True
                logger.error(f"[SOFT KILL] '{ws.name}' | {internal_reason}")

            db.commit()

        try:
            # Notify owner + team (deduped)
            all_users = list(ws.team_members) + [ws.owner]
            users_map = {str(u.id): u for u in all_users}
            users_to_notify = list(users_map.values())

            if terminal:
                # Hard fail (polling stopped)
                notif_message = f"Polling stopped for '{ws.name}': {user_message}"
                priority = "critical"
                notif_type = "polling_error"
                idempotency_key = f"poll_hard_fail:{ws.id}:{user_message}"
            else:
                # Soft fail (retrying)
                notif_message = f"Polling issue in '{ws.name}': {user_message}"
                priority = "warning"
                notif_type = "polling_error"
                idempotency_key = f"poll_soft_fail:{ws.id}:{user_message}:{ws.failure_count}"

            # Prevent duplicate spam notifications
            existing = (
                db.query(Notification)
                .filter(Notification.idempotency_key == idempotency_key)
                .first()
            )

            if not existing and users_to_notify:
                payload = {
                    "event": "polling_failure",
                    "workspace_name": ws.name,
                    "reason": user_message,
                    "is_hard_fail": is_hard_fail,
                    "auto_disabled": terminal,
                    "failure_count": ws.failure_count,
                }

                for user in users_to_notify:
                    notif = Notification(
                        user_id=user.id,
                        workspace_id=ws.id,
                        message=notif_message,
                        notification_type=notif_type,
                        priority=priority,
                        action_url=f"/workspace/{ws.id}",
                        payload=payload,
                    )
                    db.add(notif)

                db.commit()
                logger.info(
                    f"[KILL_POLLER] Created polling notification for {len(users_to_notify)} users | ws={ws.id}"
                )

        except Exception as notif_err:
            db.rollback()
            logger.error(f"[KILL_POLLER] Notification creation failed: {notif_err}", exc_info=True)

    except Exception as e:
        db.rollback()
        logger.error(f"[KILL_POLLER] DB Update Failed: {e}", exc_info=True)
        return

    if not loop or not loop.is_running():
        logger.warning("No active loop provided to kill_poller. UI will not update automatically.")
        return

    if terminal:
        payload = {
            "type": "job_complete",
            "workspace_id": str(workspace_id),
            "status": "failed",
            "error": user_message,
            "is_polling_active": False,
        }
    else:
        payload = {
            "type": "job_error",
            "workspace_id": str(workspace_id),
            "error": user_message,
            "is_hard_fail": is_hard_fail,
        }

    try:
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_to_workspace(str(workspace_id), payload),
            loop,
        )
        logger.info(f"Broadcasted {payload['type']} to UI for {workspace_id}")
    except Exception as e:
        logger.error(f"WebSocket Broadcast Failed: {e}", exc_info=True)


def fetch_api_data(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    logger.info(f"[API FETCHER] Starting API fetch: {workspace_id}")

    MAX_BYTES = 30 * 1024 * 1024

    # ── PHASE 1: READ ─────────────────────────────────────────────────────────
    # Open a session, read what we need, close it immediately.
    # We must not hold a DB connection open during the HTTP request below.
    db: Session = SessionLocal()
    try:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == workspace_id)
            .first()
        )

        if not workspace or not workspace.is_polling_active:
            logger.warning(f"[API FETCHER] Workspace {workspace_id} not found or inactive. Aborting.")
            return

        api_url = workspace.api_url
        header_name = workspace.api_header_name
        header_value = workspace.api_header_value

    except Exception as e:
        logger.error(f"[API FETCHER] Failed to read workspace: {e}", exc_info=True)
        return
    finally:
        db.close()  # ← always closed before HTTP starts

    # ── PHASE 1.5: PRE-FLIGHT VALIDATION ──────────────────────────────────────
    # Validate config before opening any network connection or DB session.
    # These are hard fails — no point opening a session to write, just kill.
    if not api_url or not api_url.startswith("http"):
        db: Session = SessionLocal()
        try:
            kill_poller(
                db, workspace_id,
                user_message="The API URL is missing or invalid. Please provide a valid HTTP or HTTPS endpoint.",
                internal_reason="Hard Fail: Invalid API URL",
                is_hard_fail=True, loop=loop,
            )
        finally:
            db.close()
        return

    if header_name == "Authorization":
        if not header_value or not header_value.startswith(("Bearer ", "Basic ")):
            db: Session = SessionLocal()
            try:
                kill_poller(
                    db, workspace_id,
                    user_message="The Authorization header is missing or invalid. Please provide a valid Bearer or Basic token.",
                    internal_reason="Hard Fail: Malformed Authorization header",
                    is_hard_fail=True, loop=loop,
                )
            finally:
                db.close()
            return

    # ── PHASE 2: HTTP REQUEST ─────────────────────────────────────────────────
    # No DB session open here. This can take up to 30 seconds.
    headers = {header_name: header_value} if header_name and header_value else {}
    content: bytes | None = None
    http_kill_args: dict | None = None  # capture failure args, handle after

    try:
        response = requests.get(api_url, headers=headers, timeout=(10, 30), stream=True)

        cl = response.headers.get("Content-Length")
        if cl and int(cl) > MAX_BYTES:
            http_kill_args = dict(
                user_message="The data source is too large (>30MB). Please reduce the payload size.",
                internal_reason="Hard Fail: Payload exceeds 30MB limit",
                is_hard_fail=True,
            )
        elif response.status_code in (401, 403):
            http_kill_args = dict(
                user_message="The API rejected the request due to invalid or missing credentials. Please verify your API key or token.",
                internal_reason=f"API Auth Failed ({response.status_code})",
                is_hard_fail=True,
            )
        else:
            response.raise_for_status()

            chunks = []
            total_size = 0

            for chunk in response.iter_content(chunk_size=8192):
                if not chunk:
                    continue
                chunks.append(chunk)
                total_size += len(chunk)

                if total_size > MAX_BYTES:
                    http_kill_args = dict(
                        user_message="Data stream exceeds the 30MB limit allowed on this plan.",
                        internal_reason="Hard Fail: Stream exceeded 30MB limit",
                        is_hard_fail=True,
                    )
                    break

            if http_kill_args is None:
                content = b"".join(chunks)

    except requests.exceptions.HTTPError as http_err:
        http_kill_args = dict(
            user_message="The API responded with an error. We'll retry automatically.",
            internal_reason=f"HTTP Error: {str(http_err)[:120]}",
            is_hard_fail=False,
        )
    except requests.Timeout:
        http_kill_args = dict(
            user_message="The API took too long to respond. We'll retry automatically.",
            internal_reason="Network Timeout while calling API",
            is_hard_fail=False,
        )
    except requests.RequestException as req_err:
        http_kill_args = dict(
            user_message="We couldn't reach the API due to a network issue. We'll retry automatically.",
            internal_reason=f"Request error: {str(req_err)[:120]}",
            is_hard_fail=False,
        )

    # ── PHASE 3: WRITE ────────────────────────────────────────────────────────
    # ONE session from here to the end.
    # Every failure path — kill_poller, DB write crash — uses this same session.
    db: Session = SessionLocal()
    try:
        # Handle any HTTP-phase failure captured above
        if http_kill_args:
            kill_poller(db, workspace_id, loop=loop, **http_kill_args)
            return

        # Parse JSON
        try:
            data = json.loads(content)
        except Exception as e:
            kill_poller(
                db, workspace_id,
                user_message="The API returned invalid JSON. Please verify the API response format.",
                internal_reason=f"Hard Fail: JSON parse error: {str(e)[:120]}",
                is_hard_fail=True, loop=loop,
            )
            return

        if not data:
            logger.warning(f"[API FETCHER] Empty data for {workspace_id}")
            kill_poller(
                db, workspace_id,
                user_message="The API request succeeded but returned no data. Please check filters or response format.",
                internal_reason="Soft Fail: API returned empty response",
                is_hard_fail=False, loop=loop,
            )
            return

        # Build DataFrame + CSV
        try:
            df = pd.json_normalize(data)
            csv_bytes = df.to_csv(index=False).encode("utf-8")
        except Exception as e:
            logger.error(f"[API FETCHER] CSV build failed: {e}", exc_info=True)
            kill_poller(
                db, workspace_id,
                user_message="We got data from the API but failed to convert it into CSV.",
                internal_reason=f"CSV convert crash: {str(e)[:120]}",
                is_hard_fail=False, loop=loop,
            )
            return

        # Re-check workspace is still active before writing
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace or not workspace.is_polling_active:
            logger.warning(f"[API FETCHER] Workspace {workspace_id} deactivated mid-flight. Aborting write.")
            return

        # Check upload limit
        if is_workspace_upload_limit_reached(db, workspace.id):
            kill_poller(
                db, workspace_id,
                user_message="Upload limit reached (50 files). Please delete old files to continue polling.",
                internal_reason="Hard Fail: Upload limit reached (50)",
                is_hard_fail=True, loop=loop,
            )
            return

        # Write upload record
        new_upload = DataUpload(
            workspace_id=workspace.id,
            file_path=f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_api.csv",
            file_content=None,
            upload_type="api_poll",
            file_size_bytes=len(csv_bytes),
        )
        db.add(new_upload)
        db.flush()  # get new_upload.id before storage write

        storage_path = f"workspaces/{workspace.id}/uploads/{new_upload.id}.csv"

        try:
            upload_csv_bytes(storage_path, csv_bytes)
        except Exception as e:
            logger.error(f"[API FETCHER] Storage upload failed: {e}", exc_info=True)
            kill_poller(
                db, workspace_id,
                user_message="Something went wrong while saving the API data. We'll retry automatically.",
                internal_reason=f"Storage upload crash: {str(e)[:120]}",
                is_hard_fail=False, loop=loop,
            )
            return

        new_upload.storage_path = storage_path
        new_upload.file_url = None  # private bucket

        workspace.last_polled_at = datetime.now(timezone.utc)
        workspace.failure_count = 0

        db.commit()
        db.refresh(new_upload)

    except Exception as e:
        logger.error(f"[API FETCHER] Unexpected crash in write phase: {e}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        kill_poller(
            db, workspace_id,
            user_message="Something went wrong while saving the API data. We'll retry automatically.",
            internal_reason=f"Write phase crash: {str(e)[:120]}",
            is_hard_fail=False, loop=loop,
        )
        return

    finally:
        db.close()

    # ── PHASE 4: PROCESS ──────────────────────────────────────────────────────
    # DB is closed. Hand off to CSV processor.
    try:
        process_csv_task(str(new_upload.id), loop, df=df)
    except Exception as e:
        logger.error(f"[API FETCHER] process_csv_task failed: {e}", exc_info=True)

        
def fetch_db_data(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    MAX_ROWS = 500000
    logger.info(f"[DB FETCHER] Starting DB fetch for workspace: {workspace_id}")

    db: Session = SessionLocal()
    user_engine = None
    df = None

    try:
        # ── PHASE 1: READ + VALIDATE ──────────────────────────────────────────
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()

        if not workspace:
            logger.warning(f"[DB FETCHER] Workspace {workspace_id} not found.")
            return

        if not workspace.is_polling_active:
            logger.warning(f"[DB FETCHER] Polling disabled for '{workspace.name}'. Aborting.")
            return

        required = [
            workspace.db_host,
            workspace.db_user,
            workspace.db_password,
            workspace.db_name,
            workspace.db_query,
        ]
        if not all(required):
            kill_poller(
                db, workspace_id,
                user_message="Database connection details are missing or incomplete. Please review your database settings.",
                internal_reason="Hard Fail: Incomplete DB configuration",
                is_hard_fail=True, loop=loop,
            )
            return

        # ── PHASE 2: QUERY SECURITY VALIDATION ───────────────────────────────
        raw_query = (workspace.db_query or "").strip()
        clean_query = raw_query.rstrip(";").strip()
        query_no_comments = re.sub(r"(--.*)|(/\*[\s\S]*?\*/)", " ", clean_query)
        lower_query = query_no_comments.lower().strip()

        if not lower_query.startswith("select"):
            kill_poller(
                db, workspace_id,
                user_message="Only read-only SELECT queries are allowed.",
                internal_reason="Security: Non-SELECT start",
                is_hard_fail=True, loop=loop,
            )
            return

        if ";" in clean_query:
            kill_poller(
                db, workspace_id,
                user_message="Multiple statements are not permitted.",
                internal_reason="Security: Semicolon detected",
                is_hard_fail=True, loop=loop,
            )
            return

        forbidden_keywords = {
            "insert", "update", "delete", "drop", "truncate", "alter", "create",
            "grant", "revoke", "vacuum", "copy", "pg_read_file", "pg_write_file",
            "lo_export", "lo_import", "dblink", "program", "pg_sleep",
        }
        query_words = set(
            lower_query.replace("(", " ")
            .replace(")", " ")
            .replace(",", " ")
            .replace("\n", " ")
            .split()
        )
        found_forbidden = query_words.intersection(forbidden_keywords)
        if found_forbidden:
            kill_poller(
                db, workspace_id,
                user_message=f"Restricted keywords detected: {', '.join(sorted(found_forbidden))}",
                internal_reason="Security: Forbidden keywords",
                is_hard_fail=True, loop=loop,
            )
            return

        # ── PHASE 3: USER DB QUERY ────────────────────────────────────────────
        # Separate engine for user's DB — disposed in finally, never pooled long-term.
        try:
            encoded_password = quote_plus(workspace.db_password)
            port = int(workspace.db_port or 5432)
            host = str(workspace.db_host).strip()
            user = str(workspace.db_user).strip()
            dbname = str(workspace.db_name).strip()

            connection_url = f"postgresql://{user}:{encoded_password}@{host}:{port}/{dbname}"

            user_engine = create_engine(
                connection_url,
                future=True,
                pool_pre_ping=True,
                pool_recycle=60,
                pool_size=1,
                max_overflow=0,
                pool_timeout=10,
                connect_args={
                    "connect_timeout": 10,
                    "options": "-c statement_timeout=30000",
                },
            )

            safe_query = f"SELECT * FROM ({clean_query}) AS user_query LIMIT {MAX_ROWS + 1}"

            with user_engine.connect() as connection:
                try:
                    connection.execute(text("SET work_mem = '4MB';"))
                    connection.execute(text("SET temp_buffers = '2MB';"))
                except Exception:
                    pass
                df = pd.read_sql(text(safe_query), connection)

        except Exception as conn_err:
            err_msg = str(conn_err).lower()

            auth_patterns = ["authentication failed", "login failed", "password", "no pg_hba.conf"]
            permission_patterns = ["permission denied", "privileges", "access denied"]
            query_patterns = ["syntax error", "undefined_table", "invalid input", "does not exist"]
            timeout_patterns = ["timeout", "timed out", "could not connect", "connection refused", "server closed"]

            if any(p in err_msg for p in auth_patterns):
                kill_poller(db, workspace_id,
                    user_message="We couldn't connect to your database. Please verify the username and password.",
                    internal_reason=f"Auth failure: {str(conn_err)[:160]}",
                    is_hard_fail=True, loop=loop)
            elif any(p in err_msg for p in permission_patterns):
                kill_poller(db, workspace_id,
                    user_message="The database user does not have permission to run this query.",
                    internal_reason=f"Permission denied: {str(conn_err)[:160]}",
                    is_hard_fail=True, loop=loop)
            elif any(p in err_msg for p in query_patterns):
                kill_poller(db, workspace_id,
                    user_message="Your query couldn't be executed. Please review the query and try again.",
                    internal_reason=f"Query error: {str(conn_err)[:160]}",
                    is_hard_fail=True, loop=loop)
            elif any(p in err_msg for p in timeout_patterns):
                kill_poller(db, workspace_id,
                    user_message="We're having trouble reaching your database right now. We'll retry automatically.",
                    internal_reason=f"Temporary DB connectivity issue: {str(conn_err)[:160]}",
                    is_hard_fail=False, loop=loop)
            else:
                kill_poller(db, workspace_id,
                    user_message="We're having trouble reaching your database right now. We'll retry automatically.",
                    internal_reason=f"Unknown DB error: {str(conn_err)[:160]}",
                    is_hard_fail=False, loop=loop)
            return

        # Dispose user engine as soon as query is done — don't hold the connection
        if user_engine:
            try:
                user_engine.dispose()
            except Exception:
                pass
            user_engine = None

        if len(df) > MAX_ROWS:
            kill_poller(
                db, workspace_id,
                user_message=f"Query result too large (Max {MAX_ROWS} rows).",
                internal_reason="Hard Fail: SQL row limit exceeded",
                is_hard_fail=True, loop=loop,
            )
            return

        if df.empty:
            logger.warning(f"[DB FETCHER] Query returned 0 rows for '{workspace.name}'")
            kill_poller(
                db, workspace_id,
                user_message="Your query ran successfully but didn't return any data. Try adjusting filters or date ranges.",
                internal_reason="Soft Fail: Query returned 0 rows",
                is_hard_fail=False, loop=loop,
            )
            return

        # ── PHASE 4: WRITE ────────────────────────────────────────────────────
        if is_workspace_upload_limit_reached(db, workspace.id):
            kill_poller(
                db, workspace_id,
                user_message="Upload limit reached (50 files). Please delete old files to continue polling.",
                internal_reason="Hard Fail: Upload limit reached (50)",
                is_hard_fail=True, loop=loop,
            )
            return

        csv_bytes = df.to_csv(index=False).encode("utf-8")
        file_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_db_query.csv"

        new_upload = DataUpload(
            workspace_id=workspace.id,
            file_path=file_name,
            file_content=None,
            upload_type="db_query",
            file_size_bytes=len(csv_bytes),
        )
        db.add(new_upload)
        db.flush()  # get new_upload.id before storage write

        storage_path = f"workspaces/{workspace.id}/uploads/{new_upload.id}.csv"

        # Storage write isolated — failure kills the upload record cleanly
        try:
            upload_csv_bytes(storage_path, csv_bytes)
        except Exception as e:
            logger.error(f"[DB FETCHER] Storage upload failed: {e}", exc_info=True)
            kill_poller(
                db, workspace_id,
                user_message="Something went wrong while saving the query results. We'll retry automatically.",
                internal_reason=f"Storage upload crash: {str(e)[:120]}",
                is_hard_fail=False, loop=loop,
            )
            return

        new_upload.storage_path = storage_path
        new_upload.file_url = None

        workspace.last_polled_at = datetime.now(timezone.utc)
        workspace.failure_count = 0

        db.commit()
        db.refresh(new_upload)

    except Exception as e:
        logger.error(f"[DB FETCHER] Critical Engine Crash: {e}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
        try:
            kill_poller(
                db, workspace_id,
                user_message="Something went wrong while processing your data. We've stopped this task to prevent further issues.",
                internal_reason=f"Engine Crash: {str(e)[:160]}",
                is_hard_fail=False, loop=loop,
            )
        except Exception:
            pass
        return

    finally:
        if user_engine:
            try:
                user_engine.dispose()
            except Exception:
                pass
        try:
            db.close()
        except Exception:
            pass

    # ── PHASE 5: PROCESS ──────────────────────────────────────────────────────
    # DB closed. Hand off to CSV processor then free RAM.
    try:
        process_csv_task(str(new_upload.id), loop, df=df)
    except Exception as e:
        logger.error(f"[DB FETCHER] process_csv_task failed: {e}", exc_info=True)
    finally:
        if df is not None:
            del df
        
def schedule_data_fetches() -> None:
    logger.info("[SCHEDULER] Checking for due data fetches...")

    try:
        db: Session = SessionLocal()
    except Exception as e:
        logger.error(f"[SCHEDULER] DB Session creation failed: {e}")
        return

    try:
        try:
            has_active = (
                db.query(Workspace.id)
                .filter(Workspace.is_polling_active == True)
                .limit(1)
                .first()
            )
        except (OperationalError, InterfaceError) as e:
            logger.error(f"[SCHEDULER] DB unreachable during existence check. Skipping scheduler run: {e}")
            return

        if not has_active:
            logger.debug("[SCHEDULER] No active polling workspaces. Skipping cycle.")
            return

        now = datetime.now(timezone.utc)

        try:
            workspaces = db.query(
                Workspace.id,
                Workspace.name,
                Workspace.polling_interval,
                Workspace.last_polled_at,
                Workspace.data_source,
            ).filter(
                Workspace.is_polling_active == True
            ).all()
        except (OperationalError, InterfaceError) as e:
            logger.error(f"[SCHEDULER] DB unreachable. Skipping scheduler run: {e}")
            return

        if not workspaces:
            logger.debug("[SCHEDULER] Active flag flipped during run. Nothing to process.")
            return

        triggered_count = 0
        buffer = timedelta(seconds=180)

        # Capture event loop once before submitting to threads
        try:
            current_loop = asyncio.get_event_loop()
        except RuntimeError:
            current_loop = None

        for ws in workspaces:
            try:
                is_due = False
                last_polled = ws.last_polled_at
                interval = ws.polling_interval

                if not last_polled:
                    is_due = True
                elif interval == "30min":
                    if (now - last_polled) >= (timedelta(minutes=30) - buffer):
                        is_due = True
                elif interval == "hourly":
                    if (now - last_polled) >= (timedelta(hours=1) - buffer):
                        is_due = True
                elif interval == "3hours":
                    if (now - last_polled) >= (timedelta(hours=3) - buffer):
                        is_due = True
                elif interval == "12hours":
                    if (now - last_polled) >= (timedelta(hours=12) - buffer):
                        is_due = True
                elif interval == "daily":
                    if (now - last_polled) >= (timedelta(days=1) - buffer):
                        is_due = True
                else:
                    if interval:
                        logger.warning(
                            f"[SCHEDULER] Unknown interval '{interval}' "
                            f"for workspace '{ws.name}' ({ws.id}). Skipping."
                        )
                    continue

                if is_due:
                    logger.info(
                        f"[SCHEDULER] Offloading '{ws.name}' ({ws.id}) to ThreadPool..."
                    )
                    executor.submit(
                        process_data_fetch_task,
                        str(ws.id),
                        current_loop,
                    )
                    triggered_count += 1

            except Exception as e:
                logger.error(f"[SCHEDULER] Error analyzing workspace {ws.id}: {e}")
                continue

        if triggered_count > 0:
            logger.info(f"[SCHEDULER] Offloaded {triggered_count} jobs to background threads.")
        else:
            logger.debug("[SCHEDULER] No workspaces due this cycle.")

    except Exception as e:
        logger.error(f"[SCHEDULER] Critical Scheduler Failure: {e}", exc_info=True)

    finally:
        try:
            db.close()
        except Exception:
            pass

     
def process_data_fetch_task(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    logger.info(f"[GATE] Validating execution request for workspace: {workspace_id}")

    # Loop is expected to be passed in from caller.
    # Fallback only exists for direct/manual calls.
    if loop is None:
        logger.warning(
            f"[GATE] No event loop passed for workspace {workspace_id}. "
            "WebSocket broadcasts may not work."
        )

    db = SessionLocal()
    try:
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()

        if not ws or not ws.is_polling_active:
            logger.warning(f"[GATE] Aborting. Workspace {workspace_id} is gone or inactive.")
            return

        if ws.data_source == 'API':
            logger.info(f"[GATE] Launching API Fetcher for '{ws.name}'...")
            fetch_api_data(str(ws.id), loop)

        elif ws.data_source == 'DB':
            logger.info(f"[GATE] Launching DB Fetcher for '{ws.name}'...")
            fetch_db_data(str(ws.id), loop)

        else:
            logger.warning(
                f"[GATE] Unknown data_source '{ws.data_source}' "
                f"for workspace '{ws.name}' ({workspace_id}). Skipping."
            )

    except Exception as e:
        logger.error(f"[GATE] Internal Gate Failure: {e}", exc_info=True)
    finally:
        db.close()
        
        
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
    return obj

EMAIL_SEM = threading.BoundedSemaphore(3)

def _run_email_in_background(recipients, email_context):
    if not EMAIL_SEM.acquire(blocking=False):
        logger.warning("[EMAIL] Skipping email: too many concurrent email jobs")
        return

    loop = None
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send_detailed_alert_email(recipients, email_context))
    except Exception as e:
        logger.error(f"[EMAIL] Failed: {e}", exc_info=True)
    finally:
        if loop:
            try:
                loop.close()
            except Exception:
                pass
        EMAIL_SEM.release()


# ─────────────────────────────────────────────────────────────────────────────
# PROCESS CSV TASK — ORCHESTRATOR + PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _load_dataframe(
    current_upload: DataUpload,
    db: Session,
    MAX_ROWS: int,
    df: pd.DataFrame = None,
) -> tuple[pd.DataFrame | None, bool]:
    """
    Phase 1 + 2: Download CSV from storage (or use provided df) and parse it.
    Returns (df, is_truncated) or (None, False) on failure.
    """
    if df is not None:
        logger.info(f"[LOAD] Using provided DataFrame for upload {current_upload.id}.")
        return df, False

    csv_bytes: bytes | None = None

    # Download from storage
    if current_upload.storage_path:
        t = time.perf_counter()
        try:
            csv_bytes = download_file_bytes(current_upload.storage_path)
            logger.info(f"[LOAD] Storage download: {time.perf_counter() - t:.2f}s")
        except Exception as e:
            logger.error(f"[LOAD] Storage download failed: {e}", exc_info=True)
            try:
                _create_incident(
                    db=db,
                    current_upload=current_upload,
                    issue_type="ingestion_failure",
                    severity="high",
                    failure_reason="Storage download failed",
                    affected_columns=None,
                )
                db.commit()
            except Exception as inc_err:
                logger.error(f"[LOAD] Incident creation failed: {inc_err}", exc_info=True)
            return None, False

    # Fallback: old uploads stored directly in DB
    if csv_bytes is None and current_upload.file_content:
        try:
            csv_bytes = current_upload.file_content.encode("utf-8")
            logger.info(f"[LOAD] Using DB-stored CSV content for upload {current_upload.id}.")
        except Exception as e:
            logger.error(f"[LOAD] Failed to encode DB CSV content: {e}", exc_info=True)
            return None, False

    if not csv_bytes:
        logger.warning(f"[LOAD] No CSV content found for upload {current_upload.id}.")
        return None, False

    # Parse CSV in chunks for RAM safety
    is_truncated = False
    try:
        t_total = time.perf_counter()
        dfs = []
        total_rows = 0

        for chunk in pd.read_csv(BytesIO(csv_bytes), chunksize=50000):
            total_rows += len(chunk)

            for col in chunk.columns:
                if chunk[col].dtype == "object":
                    chunk[col] = pd.to_numeric(chunk[col], errors="ignore")

            if total_rows > MAX_ROWS:
                is_truncated = True
                remaining = MAX_ROWS - (total_rows - len(chunk))
                dfs.append(chunk.head(remaining))
                break

            dfs.append(chunk)

        del csv_bytes

        df = pd.concat(dfs, ignore_index=True)
        del dfs

        logger.info(f"[LOAD] Parsed {len(df)} rows x {len(df.columns)} cols in {time.perf_counter() - t_total:.2f}s")
        if is_truncated:
            logger.warning(f"[LOAD] File truncated to {MAX_ROWS} rows for RAM safety.")

        return df, is_truncated

    except Exception as e:
        logger.error(f"[LOAD] CSV parse failed: {e}", exc_info=True)
        try:
            _create_incident(
                db=db,
                current_upload=current_upload,
                issue_type="ingestion_failure",
                severity="high",
                failure_reason="CSV parse error",
                affected_columns=None,
            )
            db.commit()
        except Exception as inc_err:
            logger.error(f"[LOAD] Incident creation failed: {inc_err}", exc_info=True)
        return None, False


def _compute_analysis(
    df: pd.DataFrame,
    current_upload: DataUpload,
    previous_upload: DataUpload | None,
    is_truncated: bool,
) -> dict:
    """
    Phase 3 + 4: Schema diff, stats, quality analysis.
    Pure computation — no DB writes.
    Returns analysis_results dict.
    """

    # Schema + row/col counts
    new_schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
    new_row_count = int(len(df))
    new_col_count = int(len(df.columns))

    new_cols = set(new_schema.keys())
    old_cols = set()
    old_row_count = 0
    old_col_count = 0
    schema_has_changed = False
    row_count_has_changed = False
    col_count_has_changed = False

    if previous_upload:
        old_schema = previous_upload.schema_info or {}
        old_cols = set(old_schema.keys())

        if old_cols != new_cols:
            schema_has_changed = True

        try:
            old_row_count = int((previous_upload.analysis_results or {}).get("row_count", 0))
        except Exception:
            old_row_count = 0

        try:
            old_col_count = int((previous_upload.analysis_results or {}).get("column_count", 0))
        except Exception:
            old_col_count = 0

        if old_row_count != new_row_count:
            row_count_has_changed = True

        if old_col_count != new_col_count:
            col_count_has_changed = True

    schema_changes_dict = {
        "added": sorted(list(new_cols - old_cols)),
        "removed": sorted(list(old_cols - new_cols)),
    }

    # Stats (numeric columns only, sampled for speed)
    num_df = df.select_dtypes(include="number")
    if num_df.shape[1] > 0:
        sample_df = num_df.sample(n=10000) if len(num_df) > 10000 else num_df
        t = time.perf_counter()
        summary_stats = clean_nan(sample_df.describe().to_dict())
        logger.info(f"[ANALYZE] Stats computed in {time.perf_counter() - t:.2f}s")
    else:
        summary_stats = {}
    del num_df

    # Quality analysis (sampled for speed)
    quality_df = df.sample(n=50000) if len(df) > 50000 else df
    t = time.perf_counter()
    quality_report, insights = analyze_dataframe_quality(quality_df)
    logger.info(f"[ANALYZE] Quality analysis completed in {time.perf_counter() - t:.2f}s")

    return {
        # Schema
        "new_schema": new_schema,
        "schema_has_changed": schema_has_changed,
        "schema_changes": schema_changes_dict,
        # Counts
        "row_count": new_row_count,
        "column_count": new_col_count,
        "previous_row_count": old_row_count,
        "previous_column_count": old_col_count,
        "row_count_changed": row_count_has_changed,
        "column_count_changed": col_count_has_changed,
        # Stats + Quality
        "summary_stats": summary_stats,
        "quality_report": quality_report,
        "insights": insights,
        "is_truncated": is_truncated,
    }


def _save_results(
    db: Session,
    current_upload: DataUpload,
    previous_upload: DataUpload | None,
    analysis: dict,
) -> None:
    # Update upload record
    current_upload.schema_info = analysis["new_schema"]
    current_upload.schema_changed_from_previous = analysis["schema_has_changed"]

    analysis_results = {k: v for k, v in analysis.items() if k != "new_schema"}
    current_upload.analysis_results = analysis_results

    # Column-level daily metrics
    quality_report = analysis["quality_report"]
    metrics = [
        ColumnDailyMetrics(
            workspace_id=current_upload.workspace_id,
            upload_id=current_upload.id,
            column_name=col,
            metric_date=date.today(),
            missing_percent=float(missing_pct),
            unique_percent=float(quality_report["unique_percent_by_column"].get(col, 0.0)),
            health_score=float(quality_report["column_health_score"].get(col, 100.0)),
        )
        for col, missing_pct in quality_report["missing_percent_by_column"].items()
    ]

    t = time.perf_counter()
    db.bulk_save_objects(metrics)
    logger.info(f"[SAVE] Column metrics saved in {time.perf_counter() - t:.2f}s")

    # Table-level daily metrics
    db.add(TableDailyMetrics(
        workspace_id=current_upload.workspace_id,
        upload_id=current_upload.id,
        metric_date=date.today(),
        row_count=analysis["row_count"],
        column_count=analysis["column_count"],
    ))

    logger.info(
        f"[SAVE] TableDailyMetrics staged | "
        f"rows={analysis['row_count']} | "
        f"cols={analysis['column_count']} | "
        f"date={date.today()}"
    )

    # Incident engine
    incident_engine(
        db=db,
        current_upload=current_upload,
        previous_upload=previous_upload,
        analysis_results=analysis_results,
    )
    

    logger.info(f"[SAVE] Results staged for upload {current_upload.id}.")


def _notify_and_alert(
    db: Session,
    workspace: Workspace,
    current_upload: DataUpload,
    previous_upload: DataUpload | None,
    analysis: dict,
    loop: asyncio.AbstractEventLoop | None,
) -> list:
    """
    Phase 5b: Notifications, email, alert rules, WebSocket pings.
    Failures here are logged but never raise — data is already saved.
    Returns list of users notified (for WebSocket ping after commit).
    """
    users_to_notify = []

    try:
        schema_has_changed = analysis["schema_has_changed"]
        row_count_has_changed = analysis["row_count_changed"]
        col_count_has_changed = analysis["column_count_changed"]
        schema_changes_dict = analysis["schema_changes"]
        old_row_count = analysis["previous_row_count"]
        new_row_count = analysis["row_count"]
        old_col_count = analysis["previous_column_count"]
        new_col_count = analysis["column_count"]

        if schema_has_changed or row_count_has_changed or col_count_has_changed:

            # Build notification message
            change_parts = []
            if schema_has_changed:
                added = len(schema_changes_dict.get("added", []))
                removed = len(schema_changes_dict.get("removed", []))
                if added or removed:
                    change_parts.append(f"schema updated (+{added} / -{removed})")
            if row_count_has_changed:
                change_parts.append(f"rows {old_row_count} → {new_row_count}")
            if col_count_has_changed:
                change_parts.append(f"columns {old_col_count} → {new_col_count}")

            notification_message = f"Data updated in '{workspace.name}': {', '.join(change_parts)}"

            # Priority classification
            priority = "info"
            if schema_has_changed:
                priority = "critical" if len(schema_changes_dict.get("removed", [])) > 0 else "warning"
            elif row_count_has_changed:
                if old_row_count and new_row_count < old_row_count:
                    drop_pct = ((old_row_count - new_row_count) / old_row_count) * 100
                    priority = "critical" if drop_pct >= 40 else "warning"
            elif col_count_has_changed:
                priority = "warning" if new_col_count < old_col_count else "info"

            # Dedupe users
            all_users = list(workspace.team_members) + [workspace.owner]
            users_map = {str(u.id): u for u in all_users}
            users_to_notify = list(users_map.values())

            payload = {
                "workspace_name": workspace.name,
                "event": "dataset_update",
                "rows_from": old_row_count if row_count_has_changed else None,
                "rows_to": new_row_count if row_count_has_changed else None,
                "cols_from": old_col_count if col_count_has_changed else None,
                "cols_to": new_col_count if col_count_has_changed else None,
                "schema_added": schema_changes_dict.get("added") if schema_has_changed else None,
                "schema_removed": schema_changes_dict.get("removed") if schema_has_changed else None,
            }

            # Write notifications
            t = time.perf_counter()
            for user in users_to_notify:
                db.add(Notification(
                    user_id=user.id,
                    workspace_id=workspace.id,
                    message=notification_message,
                    ai_insight=None,
                    payload=payload,
                    notification_type="data_update",
                    priority=priority,
                    action_url=f"/workspace/{workspace.id}",
                ))
            logger.info(f"[NOTIFY] {len(users_to_notify)} notifications staged in {time.perf_counter() - t:.2f}s")

            # Email (non-blocking thread)
            user_ids = [u.id for u in users_to_notify]
            enabled_settings = db.query(WorkspaceUserSettings).filter(
                WorkspaceUserSettings.workspace_id == workspace.id,
                WorkspaceUserSettings.user_id.in_(user_ids),
                WorkspaceUserSettings.email_notifications_enabled == True,
            ).all()
            enabled_user_ids = {s.user_id for s in enabled_settings}
            recipients = [u.email for u in users_to_notify if u.id in enabled_user_ids]

            if recipients:
                percent_change = "0%"
                if old_row_count > 0:
                    percent_change = f"{((new_row_count - old_row_count) / old_row_count) * 100:+.1f}%"
                t_ctx = time.perf_counter()
                email_context = {
                    "workspace_name": workspace.name,
                    "upload_type": current_upload.upload_type,
                    "new_file_name": current_upload.file_path,
                    "old_file_name": previous_upload.file_path if previous_upload else "N/A",
                    "upload_time_str": convert_utc_to_ist_str(current_upload.uploaded_at),
                    "owner_info": {"name": workspace.owner.name, "email": workspace.owner.email},
                    "team_info": [{"name": m.name, "email": m.email} for m in workspace.team_members],
                    "ai_insight": None,
                    "schema_changes": schema_changes_dict,
                    "metric_changes": {
                        "old_rows": old_row_count,
                        "new_rows": new_row_count,
                        "percent_change": percent_change,
                        "old_cols": old_col_count,
                        "new_cols": new_col_count,
                    },
                }
                logger.info(f"[NOTIFY] Email context built in {time.perf_counter() - t_ctx:.2f}s")

                threading.Thread(
                    target=_run_email_in_background,
                    args=(recipients, email_context),
                    daemon=True,
                ).start()
                logger.info(f"[NOTIFY] Email thread started for {len(recipients)} recipients.")

        # Alert rules (always runs regardless of change detection)
        t = time.perf_counter()
        analysis_results = {k: v for k, v in analysis.items() if k != "new_schema"}
        check_alert_rules(db, workspace, current_upload, analysis_results, loop)
        logger.info(f"[NOTIFY] Alert rules evaluated in {time.perf_counter() - t:.2f}s")

    except Exception as e:
        # Notification failure must never crash the job
        logger.error(f"[NOTIFY] Non-fatal error in notify/alert phase: {e}", exc_info=True)

    return users_to_notify


def process_csv_task(
    upload_id: str,
    loop: asyncio.AbstractEventLoop = None,
    df: pd.DataFrame = None,
):
    """
    Orchestrator. Calls private helpers in sequence.
    Data integrity (load → analyze → save) is protected.
    Notification failures are non-fatal.
    """
    logger.info(f"[WORKER] Starting processing for upload ID: {upload_id}...")
    start_time = time.perf_counter()

    db: Session = SessionLocal()
    workspace_id_str = None
    status_message = "job_error"
    error_msg = None
    users_to_notify = []

    MAX_ROWS = 50_000_000 if MODE_LOCAL == "true" else 500_000

    try:
        # ── FETCH UPLOAD RECORD ───────────────────────────────────────────────
        current_upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
        if not current_upload:
            logger.warning(f"[WORKER] Upload ID {upload_id} not found.")
            return

        workspace_id_str = str(current_upload.workspace_id)

        # ── PHASE 1+2: LOAD ───────────────────────────────────────────────────
        df, is_truncated = _load_dataframe(current_upload, db, MAX_ROWS, df)
        if df is None:
            logger.error(f"[WORKER] Load phase failed for upload {upload_id}. Aborting.")
            return

        # ── FETCH PREVIOUS UPLOAD FOR DIFF ───────────────────────────────────
        previous_upload = (
            db.query(DataUpload)
            .filter(
                DataUpload.workspace_id == current_upload.workspace_id,
                DataUpload.upload_type == current_upload.upload_type,
                DataUpload.id != current_upload.id,
            )
            .order_by(DataUpload.uploaded_at.desc())
            .first()
        )

        # ── PHASE 3+4: ANALYZE ────────────────────────────────────────────────
        analysis = _compute_analysis(df, current_upload, previous_upload, is_truncated)

        # Free RAM — df no longer needed after analysis
        del df
        df = None

        # ── PHASE 5a: SAVE ────────────────────────────────────────────────────
        _save_results(db, current_upload, previous_upload, analysis)

        # ── FETCH WORKSPACE FOR NOTIFICATIONS ─────────────────────────────────
        workspace = db.query(Workspace).filter(
            Workspace.id == current_upload.workspace_id
        ).first()

        # ── PHASE 5b: NOTIFY ──────────────────────────────────────────────────
        if workspace:
            users_to_notify = _notify_and_alert(
                db, workspace, current_upload, previous_upload, analysis, loop
            )

        # ── COMMIT EVERYTHING ─────────────────────────────────────────────────
        t = time.perf_counter()
        db.commit()
        logger.info(f"[WORKER] Committed in {time.perf_counter() - t:.2f}s")

        # ── WEBSOCKET PING (after commit — data is safe) ──────────────────────
        if APP_MODE == "production" and users_to_notify:
            for user in users_to_notify:
                run_async_safely(
                    manager.push_to_user(
                        user_id=str(user.id),
                        message={"type": "NEW_NOTIFICATION_ALERT"},
                    ),
                    loop,
                )
            logger.info(f"[WORKER] Pushed NEW_NOTIFICATION_ALERT to {len(users_to_notify)} users.")

        total = time.perf_counter() - start_time
        logger.info(f"[WORKER] Upload {upload_id} complete in {total:.2f}s")

        status_message = "job_complete"
        return {"status": "success"}

    except Exception as e:
        logger.error(f"[WORKER] Fatal error for upload {upload_id}: {e}", exc_info=True)
        error_msg = str(e)
        status_message = "job_error"
        try:
            db.rollback()
        except Exception:
            pass
        return {"status": "error", "message": error_msg}

    finally:
        # Always broadcast job status to UI
        if APP_MODE == "production" and workspace_id_str:
            payload = {"type": status_message, "workspace_id": workspace_id_str}
            if status_message == "job_error" and error_msg:
                payload["error"] = error_msg

            run_async_safely(
                manager.broadcast_to_workspace(workspace_id_str, payload),
                loop,
            )

        if df is not None:
            try:
                del df
            except Exception:
                pass

        try:
            db.close()
        except Exception:
            pass
        

    
    
async def send_otp_email_task_async(to_email: str, otp: str, subject_type: str) -> None:
    logger.info(f"[WORKER] Preparing to send OTP email to {to_email}...")
    await send_otp_email(to_email, otp, subject_type)