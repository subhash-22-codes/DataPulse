import os
import pandas as pd
import asyncio
import requests
import logging
import datetime as dt
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from pathlib import Path
from datetime import datetime, timedelta, timezone
import google.generativeai as genai
import pytz
import operator 
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
from app.services.email_service import send_detailed_alert_email, send_threshold_alert_email, send_otp_email
from app.core.connection_manager import manager
import concurrent.futures
import json
import re
from sqlalchemy.exc import OperationalError, InterfaceError

# Create a ThreadPool at the module level to reuse threads
executor = concurrent.futures.ThreadPoolExecutor(max_workers=5)
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

def convert_utc_to_ist_str(utc_dt):
    if not utc_dt: return "N/A"
    try:
        ist_zone = pytz.timezone('Asia/Kolkata')
        aware_utc_dt = pytz.utc.localize(utc_dt) if utc_dt.tzinfo is None else utc_dt
        ist_dt = aware_utc_dt.astimezone(ist_zone)
        return ist_dt.strftime("%B %d, %Y, %I:%M %p %Z")
    except Exception:
        return "Invalid Date"


AI_SYSTEM_PROMPT = """
SYSTEM PROMPT (DO NOT CHANGE OUTPUT FORMAT):
You are a Senior Data Analyst generating insights for a production SaaS dashboard.

CRITICAL OUTPUT RULES:
- Output ONLY plain Markdown
- NO HTML tags (<p>, <ul>, etc.)
- NO code blocks (no ``` or ` )
- NO emojis or headings
- NO assumptions beyond the provided data

REQUIRED STRUCTURE:
1. Exactly ONE paragraph (1-2 sentences) summarizing the impact.
2. Exactly TWO bullet points using - (dash + space), each a business question.

FAILURE HANDLING:
If no meaningful insight can be derived, output a single plain sentence explaining that clearly.
""".strip()

def get_ai_insight(schema_changes: dict) -> str | None:
    if not gemini_model:
        logger.warning("Gemini model not available. Skipping AI insight.")
        return None

    added = schema_changes.get('added', [])
    removed = schema_changes.get('removed', [])
    
    if not added and not removed:
        return "No significant schema changes were detected to analyze."

    # Construct the User Query
    user_query = (
        f"Analyze these schema changes:\n"
        f"Added Columns: {', '.join(added) if added else 'None'}\n"
        f"Removed Columns: {', '.join(removed) if removed else 'None'}"
    )

    try:
        logger.info("🧠 [AI] Requesting strict markdown insight...")
        
        full_prompt = f"{AI_SYSTEM_PROMPT}\n\nUSER INPUT:\n{user_query}"
        
        response = gemini_model.generate_content(full_prompt)
        raw_text = response.text.strip()
        clean_text = raw_text.replace("```markdown", "").replace("```", "").strip()
        
        logger.info("✨ [AI] Insight generated successfully.")
        return clean_text

    except Exception as e:
        logger.error(f"❌ [AI] Error generating insight: {e}", exc_info=True)
        return "AI analysis is currently unavailable due to a technical error."
    

def run_async_safely(coro: Coroutine[Any, Any, Any], loop: asyncio.AbstractEventLoop = None) -> None:
   
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, loop)
        return

    try:
        asyncio.run(coro)
    except RuntimeError as e:
        logger.warning(f"[WORKER] Standard asyncio.run failed ({e}). Attempting fallback loop.")
        try:
            fallback_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(fallback_loop)
            fallback_loop.run_until_complete(coro)
            fallback_loop.close()
        except Exception as final_error:
             logger.error(f"🔥 [WORKER] Async execution completely failed: {final_error}")

def check_alert_rules(
    db: Session, 
    workspace: Workspace, 
    current_upload: DataUpload, 
    analysis_results: dict, 
    loop: asyncio.AbstractEventLoop = None
) -> None:

    logger.info(f"🔍 [ENGINE] Scanning rules for Workspace: {workspace.name}...")

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
        logger.info(f"🛡️ [GUARD] Already processed {execution_fingerprint}. Skipping.")
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
            logger.error(f"⚠️ Error evaluating rule {rule.id}: {e}")
            continue
        
    if triggered_alerts:
        try:
            summary_msg = f"Alert: {len(triggered_alerts)} violations detected in '{workspace.name}'."
            
            for user in users_to_notify:
                new_notif = Notification(
                    user_id=user.id,
                    workspace_id=workspace.id,
                    message=summary_msg,
                    idempotency_key=execution_fingerprint 
                )
                db.add(new_notif)
            db.commit()
            logger.info(f"💾 Records committed for fingerprint: {execution_fingerprint}")

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Database error, aborting: {e}")
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
            run_async_safely(
                manager.push_to_user(
                    user_id=str(user.id),
                    message={"type": "NEW_NOTIFICATION_ALERT", "count": len(triggered_alerts)}
                ),
                loop
            )

        run_async_safely(send_threshold_alert_email(recipients, email_context), loop)
        
        logger.info(f"✅ Side effects sent for {len(triggered_alerts)} alerts.")
    else:
        logger.info("✅ Scan complete: No violations found.")


def kill_poller(db: Session, workspace_id: str, user_message: str, internal_reason: str, is_hard_fail: bool = True, loop: asyncio.AbstractEventLoop = None):
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
                logger.warning(f"🛑 [HARD KILL]  '{ws.name}': {internal_reason}")
        else:
            ws.failure_count += 1
            ws.last_failure_reason = user_message
            if ws.failure_count >= 3:
                ws.is_polling_active = False
                ws.auto_disabled_at = now
                logger.error(f"🚨 [SOFT KILL] '{ws.name}' | {internal_reason}")
            db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"🔥 [KILL_POLLER] DB Update Failed: {e}")

    # --- THE CORRECT BROADCAST LOGIC ---
    if loop and loop.is_running():
        payload = {
            "type": "job_error", 
            "workspace_id": str(workspace_id),
            "error": user_message,
            "is_hard_fail": is_hard_fail
        }

        try:
            # We use the explicitly passed loop to jump back to the main thread
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_to_workspace(str(workspace_id), json.dumps(payload)), 
                loop
            )
            logger.info(f"📡 Broadcasted 'job_error' to UI for {workspace_id}")
        except Exception as e:
            logger.error(f"❌ WebSocket Broadcast Failed: {e}")
    else:
        logger.warning(f"⚠️ No active loop provided to kill_poller. UI will not update automatically.")
        

def fetch_api_data(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    logger.info(f"🤖 [API FETCHER] Starting API fetch: {workspace_id}")

    MAX_BYTES = 5 * 1024 * 1024

    # 1) DB: read workspace config fast, then CLOSE DB
    db: Session = SessionLocal()
    try:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == workspace_id)
            .first()
        )

        if not workspace or not workspace.is_polling_active:
            return

        api_url = workspace.api_url
        header_name = workspace.api_header_name
        header_value = workspace.api_header_value

    except Exception as e:
        logger.error(f"🔥 [API FETCHER] Failed to read workspace: {e}", exc_info=True)
        return
    finally:
        db.close()

    # Validation (no DB needed)
    if not api_url or not api_url.startswith("http"):
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="The API URL is missing or invalid. Please provide a valid HTTP or HTTPS endpoint.",
                internal_reason="Hard Fail: Invalid API URL",
                is_hard_fail=True,
                loop=loop,
            )
        finally:
            db2.close()
        return

    if header_name == "Authorization":
        if not header_value or not header_value.startswith(("Bearer ", "Basic ")):
            db2: Session = SessionLocal()
            try:
                kill_poller(
                    db2,
                    workspace_id,
                    user_message="The Authorization header is missing or invalid. Please provide a valid Bearer or Basic token.",
                    internal_reason="Hard Fail: Malformed Authorization header",
                    is_hard_fail=True,
                    loop=loop,
                )
            finally:
                db2.close()
            return

    headers = {header_name: header_value} if header_name and header_value else {}

    # 2) NETWORK: do the slow API call WITHOUT holding DB session
    try:
        response = requests.get(api_url, headers=headers, timeout=(10, 30), stream=True)

        cl = response.headers.get("Content-Length")
        if cl and int(cl) > MAX_BYTES:
            db2: Session = SessionLocal()
            try:
                kill_poller(
                    db2,
                    workspace_id,
                    user_message="The data source is too large (>5MB). Please reduce the payload size.",
                    internal_reason="Hard Fail: Payload exceeds 5MB limit",
                    is_hard_fail=True,
                    loop=loop,
                )
            finally:
                db2.close()
            return

        if response.status_code in (401, 403):
            db2: Session = SessionLocal()
            try:
                kill_poller(
                    db2,
                    workspace_id,
                    user_message="The API rejected the request due to invalid or missing credentials. Please verify your API key or token.",
                    internal_reason=f"API Auth Failed ({response.status_code})",
                    is_hard_fail=True,
                    loop=loop,
                )
            finally:
                db2.close()
            return

        response.raise_for_status()

        content = b""
        for chunk in response.iter_content(chunk_size=8192):
            if not chunk:
                continue
            content += chunk
            if len(content) > MAX_BYTES:
                db2: Session = SessionLocal()
                try:
                    kill_poller(
                        db2,
                        workspace_id,
                        user_message="Data stream exceeds the 5MB limit allowed on this plan.",
                        internal_reason="Hard Fail: Stream exceeded 5MB limit",
                        is_hard_fail=True,
                        loop=loop,
                    )
                finally:
                    db2.close()
                return

    except requests.exceptions.HTTPError as http_err:
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="The API responded with an error while processing the request. We'll retry automatically.",
                internal_reason=f"HTTP Error: {str(http_err)[:120]}",
                is_hard_fail=False,
                loop=loop,
            )
        finally:
            db2.close()
        return

    except requests.Timeout:
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="The API took too long to respond. We'll retry automatically.",
                internal_reason="Network Timeout while calling API",
                is_hard_fail=False,
                loop=loop,
            )
        finally:
            db2.close()
        return

    except requests.RequestException as req_err:
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="We couldn't reach the API due to a network issue. We'll retry automatically.",
                internal_reason=f"Request error: {str(req_err)[:120]}",
                is_hard_fail=False,
                loop=loop,
            )
        finally:
            db2.close()
        return

    # 3) PARSE: still no DB needed
    try:
        data = json.loads(content)
    except Exception as e:
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="The API returned invalid JSON. Please verify the API response format.",
                internal_reason=f"Hard Fail: JSON parse error: {str(e)[:120]}",
                is_hard_fail=True,
                loop=loop,
            )
        finally:
            db2.close()
        return

    if not data:
        logger.warning(f"-> [API FETCHER] Empty data for {workspace_id}")
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="The API request succeeded but returned no data. Please check filters or response format.",
                internal_reason="Soft Fail: API returned empty response",
                is_hard_fail=False,
                loop=loop,
            )
        finally:
            db2.close()
        return

    # 4) BUILD CSV: still no DB
    try:
        df = pd.json_normalize(data)
        csv_content = df.to_csv(index=False)
    except Exception as e:
        logger.error(f"🔥 [API FETCHER] CSV build failed: {e}", exc_info=True)
        db2: Session = SessionLocal()
        try:
            kill_poller(
                db2,
                workspace_id,
                user_message="We got data from the API but failed to convert it into CSV.",
                internal_reason=f"CSV convert crash: {str(e)[:120]}",
                is_hard_fail=False,
                loop=loop,
            )
        finally:
            db2.close()
        return

    # 5) DB: write upload + update workspace fast, then CLOSE DB
    db3: Session = SessionLocal()
    try:
        workspace2 = (
            db3.query(Workspace)
            .filter(Workspace.id == workspace_id)
            .first()
        )

        if not workspace2 or not workspace2.is_polling_active:
            return

        new_upload = DataUpload(
            workspace_id=workspace2.id,
            file_path=f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_api.csv",
            file_content=csv_content,
            upload_type="api_poll",
        )
        db3.add(new_upload)

        workspace2.last_polled_at = datetime.now(timezone.utc)
        workspace2.failure_count = 0

        db3.commit()
        db3.refresh(new_upload)

        if loop is None:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = None

    except Exception as e:
        logger.error(f"🔥 [API FETCHER] DB write crash: {e}", exc_info=True)
        try:
            db3.rollback()
        except Exception:
            pass

        db4: Session = SessionLocal()
        try:
            kill_poller(
                db4,
                workspace_id,
                user_message="Something went wrong while saving the API data. We'll retry automatically.",
                internal_reason=f"DB write crash: {str(e)[:120]}",
                is_hard_fail=False,
                loop=loop,
            )
        finally:
            db4.close()
        return

    finally:
        db3.close()

    # 6) Kick CSV processing AFTER DB is closed
    try:
        process_csv_task(str(new_upload.id), loop)
    except Exception as e:
        logger.error(f"🔥 [API FETCHER] process_csv_task failed: {e}", exc_info=True)

        

def fetch_db_data(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    """
    DB Poller:
    - Validates user query is read-only SELECT
    - Connects to the user's DB with hard timeouts
    - Enforces row limits
    - Writes result as CSV into DataUpload
    - Updates workspace polling metadata
    """

    MAX_ROWS = 25000
    logger.info(f"🤖 [DB FETCHER] Starting DB fetch for workspace: {workspace_id}")

    db: Session = SessionLocal()
    user_engine = None

    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()

        if not workspace:
            logger.warning(f"-> [DB FETCHER] Workspace {workspace_id} not found.")
            return

        if not workspace.is_polling_active:
            logger.warning(f"-> [DB FETCHER] Polling disabled for {workspace.name}. Aborting.")
            return

        # ✅ Basic config sanity
        required = [workspace.db_host, workspace.db_user, workspace.db_password, workspace.db_name, workspace.db_query]
        if not all(required):
            kill_poller(
                db,
                workspace_id,
                user_message="Database connection details are missing or incomplete. Please review your database settings.",
                internal_reason="Hard Fail: Incomplete DB configuration",
                is_hard_fail=True,
                loop=loop,
            )
            return

        # ✅ Clean and validate query
        raw_query = (workspace.db_query or "").strip()
        clean_query = raw_query.rstrip(";").strip()

        # Strip comments to prevent keyword bypass
        query_no_comments = re.sub(r"(--.*)|(/\*[\s\S]*?\*/)", " ", clean_query)
        lower_query = query_no_comments.lower().strip()

        # Must be SELECT
        if not lower_query.startswith("select"):
            kill_poller(
                db,
                workspace_id,
                user_message="Only read-only SELECT queries are allowed.",
                internal_reason="Security: Non-SELECT start",
                is_hard_fail=True,
                loop=loop,
            )
            return

        # Block multi-statement
        if ";" in clean_query:
            kill_poller(
                db,
                workspace_id,
                user_message="Multiple statements are not permitted.",
                internal_reason="Security: Semicolon detected",
                is_hard_fail=True,
                loop=loop,
            )
            return

        # Forbidden keywords
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
                db,
                workspace_id,
                user_message=f"Restricted keywords detected: {', '.join(sorted(found_forbidden))}",
                internal_reason="Security: Forbidden keywords",
                is_hard_fail=True,
                loop=loop,
            )
            return

        # ✅ Build connection URL for user's DB
        try:
            encoded_password = quote_plus(workspace.db_password)
            port = int(workspace.db_port or 5432)

            # keep it strict: no empty host, no weird protocol
            host = str(workspace.db_host).strip()
            user = str(workspace.db_user).strip()
            dbname = str(workspace.db_name).strip()

            connection_url = f"postgresql://{user}:{encoded_password}@{host}:{port}/{dbname}"

            # ✅ User DB engine must NOT keep pooled connections forever
            # This prevents "connection hoarding" when multiple jobs run.
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
                    # hard kill slow queries at postgres side
                    "options": "-c statement_timeout=30000",
                },
            )

            # ✅ Run the query safely (LIMIT enforced outside)
            safe_query = f"SELECT * FROM ({clean_query}) AS user_query LIMIT {MAX_ROWS + 1}"

            with user_engine.connect() as connection:
                # resource sandboxing
                try:
                    connection.execute(text("SET work_mem = '4MB';"))
                    connection.execute(text("SET temp_buffers = '2MB';"))
                except Exception:
                    # Not all DBs allow these (permissions). Don't kill job for this.
                    pass

                df = pd.read_sql(text(safe_query), connection)

            if len(df) > MAX_ROWS:
                kill_poller(
                    db,
                    workspace_id,
                    user_message=f"Query result too large (Max {MAX_ROWS} rows).",
                    internal_reason="Hard Fail: SQL row limit exceeded",
                    is_hard_fail=True,
                    loop=loop,
                )
                return

        except Exception as conn_err:
            # classify error -> hard fail vs soft fail
            err_msg = str(conn_err).lower()

            auth_patterns = ["authentication failed", "login failed", "password", "no pg_hba.conf"]
            permission_patterns = ["permission denied", "privileges", "access denied"]
            query_patterns = ["syntax error", "undefined_table", "invalid input", "does not exist"]
            timeout_patterns = ["timeout", "timed out", "could not connect", "connection refused", "server closed"]

            if any(p in err_msg for p in auth_patterns):
                kill_poller(
                    db,
                    workspace_id,
                    user_message="We couldn't connect to your database. Please verify the username and password.",
                    internal_reason=f"Auth failure: {str(conn_err)[:160]}",
                    is_hard_fail=True,
                    loop=loop,
                )
            elif any(p in err_msg for p in permission_patterns):
                kill_poller(
                    db,
                    workspace_id,
                    user_message="The database user does not have permission to run this query.",
                    internal_reason=f"Permission denied: {str(conn_err)[:160]}",
                    is_hard_fail=True,
                    loop=loop,
                )
            elif any(p in err_msg for p in query_patterns):
                kill_poller(
                    db,
                    workspace_id,
                    user_message="Your query couldn't be executed. Please review the query and try again.",
                    internal_reason=f"Query error: {str(conn_err)[:160]}",
                    is_hard_fail=True,
                    loop=loop,
                )
            elif any(p in err_msg for p in timeout_patterns):
                kill_poller(
                    db,
                    workspace_id,
                    user_message="We're having trouble reaching your database right now. We'll retry automatically.",
                    internal_reason=f"Temporary DB connectivity issue: {str(conn_err)[:160]}",
                    is_hard_fail=False,
                    loop=loop,
                )
            else:
                kill_poller(
                    db,
                    workspace_id,
                    user_message="We're having trouble reaching your database right now. We'll retry automatically.",
                    internal_reason=f"Unknown DB error: {str(conn_err)[:160]}",
                    is_hard_fail=False,
                    loop=loop,
                )
            return

        # ✅ Empty result
        if df.empty:
            logger.warning(f"-> [DB FETCHER] Query returned 0 rows for {workspace.name}")
            kill_poller(
                db,
                workspace_id,
                user_message="Your query ran successfully but didn't return any data. Try adjusting filters or date ranges.",
                internal_reason="Soft Fail: Query returned 0 rows",
                is_hard_fail=False,
                loop=loop,
            )
            return

        # ✅ Store as CSV upload
        csv_content = df.to_csv(index=False)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{timestamp}_db_query.csv"

        new_upload = DataUpload(
            workspace_id=workspace.id,
            file_path=file_name,
            file_content=csv_content,
            upload_type="db_query",
        )

        db.add(new_upload)

        workspace.last_polled_at = datetime.now(timezone.utc)
        workspace.failure_count = 0

        db.commit()
        db.refresh(new_upload)

        if loop is None:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = None

        process_csv_task(str(new_upload.id), loop)

    except Exception as e:
        logger.error(f"🔥 [DB FETCHER] Critical Engine Crash: {e}", exc_info=True)
        try:
            kill_poller(
                db,
                workspace_id,
                user_message="Something went wrong while processing your data. We've stopped this task to prevent further issues.",
                internal_reason=f"Engine Crash: {str(e)[:160]}",
                is_hard_fail=False,
                loop=loop,
            )
        except Exception:
            pass

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

        

def schedule_data_fetches() -> None:
    logger.info("⏰ [SCHEDULER] Checking for due data fetches...")

    try:
        db: Session = SessionLocal()
    except Exception as e:
        logger.error(f"🔥 DB Session creation failed: {e}")
        return

    try:
        now = datetime.now(timezone.utc)

        try:
            workspaces = db.query(
                Workspace.id,
                Workspace.name,
                Workspace.polling_interval,
                Workspace.last_polled_at,
                Workspace.data_source
            ).filter(
                Workspace.is_polling_active == True
            ).all()

        except (OperationalError, InterfaceError) as e:
            logger.error(f"🛑 DB unreachable. Skipping scheduler run: {e}")
            return

        if not workspaces:
            logger.info("-> No active workspaces found.")
            return

        triggered_count = 0
        buffer = timedelta(seconds=150)

        for ws in workspaces:
            try:
                is_due = False
                last_polled = ws.last_polled_at
                interval = ws.polling_interval

                if not last_polled:
                    is_due = True
                elif interval == "15min":
                    if (now - last_polled) >= (timedelta(minutes=15) - buffer):
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

                if is_due:
                    logger.info(f"🎯 SIGNAL: Offloading '{ws.name}' ({ws.id}) to ThreadPool...")

                    from app.services.tasks import process_data_fetch_task

                    executor.submit(
                        process_data_fetch_task,
                        str(ws.id),
                        None
                    )
                    triggered_count += 1

            except Exception as e:
                logger.error(f"⚠️ Error analyzing workspace {ws.id}: {e}")
                continue

        if triggered_count > 0:
            logger.info(f"🚀 Offloaded {triggered_count} jobs to background threads.")

    except Exception as e:
        logger.error(f"🔥 Critical Scheduler Failure: {e}", exc_info=True)

    finally:
        try:
            db.close()
        except Exception:
            pass

        
def process_data_fetch_task(workspace_id: str, loop: asyncio.AbstractEventLoop = None):
    logger.info(f"🛡️ [GATE] Validating execution request for workspace: {workspace_id}")

    if loop is None:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop_policy().get_event_loop()
            except Exception:
                loop = None

    db = SessionLocal()
    try:
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        
        if not ws or not ws.is_polling_active:
            logger.warning(f"-> [GATE] Aborting. Workspace {workspace_id} is gone or inactive.")
            return

        if ws.data_source == 'API':
            logger.info(f"-> [GATE] Launching API Fetcher for '{ws.name}'...")
            fetch_api_data(str(ws.id), loop) # Passes the (potentially None) loop
            
        elif ws.data_source == 'DB':
            logger.info(f"-> [GATE] Launching DB Fetcher for '{ws.name}'...")
            fetch_db_data(str(ws.id), loop)
            
    except Exception as e:
        logger.error(f"🔥 [GATE] Internal Gate Failure: {e}")
    finally:
        db.close()
        
# ======================
#  The "Analyzer Robot" 
# ======================
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
    return obj

def process_csv_task(upload_id: str, loop: asyncio.AbstractEventLoop = None):

    logger.info(f"🚀 [WORKER] Starting REAL processing for upload ID: {upload_id}...")
    db: Session = SessionLocal()
    workspace_id_str = None
    status_message = "job_error"
    new_notifications_created = False
    
    # SAFE LIMIT: Prevent OOM on Render Free Tier (512MB)
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

        original_row_count = 0
        is_truncated = False
        try:
            # 🛡️ THE ROW BOUNCER: Only read first 25k rows to protect RAM
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
            if previous_upload.upload_type == current_upload.upload_type:
                old_schema = previous_upload.schema_info or {}
                old_cols = set(old_schema.keys())
                
                if old_cols != new_cols: 
                    schema_has_changed = True
                
                old_row_count = previous_upload.analysis_results.get("row_count", 0)
                if old_row_count != new_row_count: 
                    row_count_has_changed = True

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
        
        # RELEASE RAM: Immediately free the dataframe objects before heavy logic
        del df
        del stats_df

        # Notifications & Insights
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

            # Check Alerts
            check_alert_rules(db, workspace, current_upload, analysis_results, loop)
            
        db.commit()
        logger.info(f"💾 [WORKER] Success. Upload {upload_id} committed.")
        
        if APP_MODE == "production" and new_notifications_created:
                for user in users_to_notify:
                    user_id_str = str(user.id)

                    run_async_safely(
                        manager.push_to_user(
                            user_id=user_id_str,
                            message={"type": "NEW_NOTIFICATION_ALERT"}
                        ),
                        loop
                    )
                logger.info("📡 [WORKER] Pushed NEW_NOTIFICATION_ALERT signal to affected users.")

        status_message = "job_complete"
        return {"status": "success"}

    except Exception as e:
        logger.error(f"❌ [WORKER] Processing Error: {e}", exc_info=True)
        status_message = "job_error"
        return {"status": "error", "message": str(e)}
    
    finally:
        if APP_MODE == "production" and workspace_id_str:
            # Uses status_message dynamically (job_complete OR job_error)
            payload = {
                "type": status_message, 
                "workspace_id": workspace_id_str
            }
            json_message = json.dumps(payload)

            logger.info(f"📡 [WORKER] Signaling final state {status_message} for {workspace_id_str}...")
            
            run_async_safely(
                manager.broadcast_to_workspace(workspace_id_str, json_message),
                loop
            )
        
        db.close()
# =====================
#  The "OTP Email Chef" 
# =====================
async def send_otp_email_task_async(to_email: str, otp: str, subject_type: str) -> None:
    logger.info(f"📨 [WORKER] Preparing to send OTP email to {to_email}...")
    await send_otp_email(to_email, otp, subject_type)