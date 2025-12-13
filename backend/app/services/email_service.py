import os
import logging
import pytz
import datetime
import uuid
from typing import List, Dict
from fastapi import HTTPException
from pydantic import EmailStr
# --- NEW BREVO SDK IMPORTS ---
from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api.transactional_emails_api import TransactionalEmailsApi
from sib_api_v3_sdk.models import SendSmtpEmail
from sib_api_v3_sdk.rest import ApiException

import atexit
import anyio # For wrapping blocking SDK calls

logger = logging.getLogger(__name__)

# --- Configuration (Reads from Render Environment Variables) ---
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL") # Your verified sender email
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "DataPulse")

# --- Initialize Brevo Client ---
email_api = None
api_client = None
# The client is initialized once at startup.
if BREVO_API_KEY and MAIL_FROM_EMAIL:
    configuration = Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY
    api_client = ApiClient(configuration)
    email_api = TransactionalEmailsApi(api_client)
    logger.info("Brevo API client initialized successfully.")
    
    
else:
    logger.error("BREVO_API_KEY or MAIL_FROM_EMAIL is missing. Email service disabled.")


# --- Helper Functions (Copied from your existing file - UNCHANGED) ---
def convert_utc_to_ist_str(utc_dt):
    if not utc_dt: return "N/A"
    try:
        ist_zone = pytz.timezone('Asia/Kolkata')
        aware_utc_dt = pytz.utc.localize(utc_dt) if utc_dt.tzinfo is None else utc_dt
        ist_dt = aware_utc_dt.astimezone(ist_zone)
        return ist_dt.strftime("%B %d, %Y, %I:%M %p %Z")
    except Exception:
        return "Invalid Date"

def format_team_list(owner: Dict, team: List[Dict]) -> str:
    owner_name = owner.get('name') or owner.get('email')
    html = f'<li><strong>Owner:</strong> {owner_name} ({owner.get("email")})</li>'
    for member in team:
        member_name = member.get('name') or member.get('email')
        html += f'<li><strong>Member:</strong> {member_name} ({member.get("email")})</li>'
    return html


# --- CORE SENDING LOGIC (NEW BREVO API CALL) ---
async def _send_brevo_message(recipients: List[EmailStr], subject: str, html_content: str) -> None:
    """Internal function to handle the Brevo API call, safely wrapped for async."""
    
    # 🟡 3. DEFENSIVE CHECK: Ensure the client is initialized before using it
    if email_api is None:
        logger.error("Brevo email_api not initialized. Email skipped.")
        return 

    try:
        to_list = [{"email": r} for r in recipients]
        
        email_to_send = SendSmtpEmail(
            sender={"name": MAIL_FROM_NAME, "email": MAIL_FROM_EMAIL},
            to=to_list,
            subject=subject,
            html_content=html_content
        )

        # 🟡 1. THE MAIN FIX: Wrap the synchronous SDK call in anyio.to_thread.run_sync
        await anyio.to_thread.run_sync(email_api.send_transac_email, email_to_send)
        
        logger.info(f"✅ Brevo API: Email sent successfully to {recipients}.")
        
    except ApiException as api_err:
        logger.error(f"❌ Brevo API Error sending email: {api_err.status} - {api_err.reason}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Brevo API failed to send email: {api_err.reason}") from api_err

    except Exception as e:
        logger.error(f"❌ General error sending email via Brevo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unknown error in email service.") from e


# --- Public Email Functions (OTP/Verification) ---
async def send_otp_email(to_email: str, otp: str, subject_type="verification") -> None:
    """Sends the OTP/Password Reset email."""
    now_utc = datetime.datetime.utcnow()
    # Ensure this returns a string like "12:30:45 PM"
    timestamp_ist = convert_utc_to_ist_str(now_utc) 
    unique_id = str(uuid.uuid4())
    
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png"
    
    # --- 1. DEFINE PREVIEW TEXT ---
    if subject_type == "password_reset":
        preview_text = "Use this code to reset your DataPulse password. Valid for 10 minutes."
    else:
        preview_text = "Welcome to DataPulse! Use this code to verify your email address."

    # --- 2. PREHEADER HTML BLOCK ---
    preheader_html = f"""
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    """

    # --- 3. GENERATE HTML CONTENT ---
    if subject_type == "password_reset":
        subject = f"{otp} is your password reset code"
        
        # STYLE: Clean Modern Security + Dark Mode Protection
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <style>
                /* FORCE LIGHT MODE */
                :root {{
                    color-scheme: light;
                    supported-color-schemes: light;
                }}
                body {{ font-family: 'Roboto', Helvetica, Arial, sans-serif; background-color: #f2f4f8; margin: 0; padding: 0; }}
                .container {{ max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 4px; border: 1px solid #dcdcdc; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); overflow: hidden; }}
                .content {{ padding: 40px 48px; }}
                .otp-box {{ background: #f8f9fa; border: 1px solid #dadce0; border-radius: 4px; padding: 15px; text-align: center; margin: 25px 0; }}
                .otp-code {{ font-family: 'Google Sans', 'Helvetica Neue', sans-serif; font-size: 32px; font-weight: 700; color: #202124; letter-spacing: 6px; }}
                .footer {{ padding: 20px 48px; background-color: #f8f9fa; border-top: 1px solid #eeeeee; font-size: 12px; color: #5f6368; line-height: 1.5; }}
                @media only screen and (max-width: 600px) {{
                    .container {{ width: 100% !important; margin: 0 !important; border-radius: 0 !important; border: none !important; }}
                    .content {{ padding: 30px 20px !important; }}
                }}
            </style>
        </head>
        <body>
            {preheader_html}
            <div class="container">
                <div class="content">
                    <img src="{logo_url}" width="120" alt="DataPulse" style="display: block; margin-bottom: 30px;">
                    
                    <h1 style="margin: 0 0 10px 0; font-size: 22px; color: #202124; font-weight: 500;">Password reset verification</h1>
                    
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #3c4043; line-height: 1.5;">
                       We received a request at <strong>{timestamp_ist}</strong> to reset the password for your <strong>DataPulse</strong> account. To proceed, please enter the following verification code:
                    </p>
                    
                    <div class="otp-box">
                        <span class="otp-code">{otp}</span>
                    </div>
                    
                    <p style="margin: 0; font-size: 14px; color: #5f6368;">
                        This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.
                    </p>
                </div>
                
                <div class="footer">
                    Security ID: {unique_id}<br>
                    DataPulse Inc. • Secure Automated System
                </div>
            </div>
        </body>
        </html>
        """

    else:
        subject = f"{otp} is your DataPulse verification code"
        
        # STYLE: Google Workspace / Stripe Welcome + Dark Mode Protection
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <style>
                /* FORCE LIGHT MODE */
                :root {{
                    color-scheme: light;
                    supported-color-schemes: light;
                }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; color: #333; }}
                .wrapper {{ padding: 40px 20px; background-color: #F6F9FC; }}
                .card {{ max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #eaebed; }}
                .header {{ padding: 32px 40px; border-bottom: 1px solid #f0f0f0; }}
                .body-content {{ padding: 40px 40px 30px 40px; }}
                .otp-display {{ font-family: monospace; font-size: 36px; font-weight: 600; color: #1a73e8; letter-spacing: 4px; text-align: center; margin: 30px 0; }}
                .fine-print {{ font-size: 13px; color: #5f6368; line-height: 1.6; }}
                @media only screen and (max-width: 600px) {{
                    .wrapper {{ padding: 0; }}
                    .card {{ border: none; box-shadow: none; border-radius: 0; }}
                    .header, .body-content {{ padding: 30px 20px; }}
                }}
            </style>
        </head>
        <body>
            {preheader_html}
            <div class="wrapper">
                <table class="card" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="header">
                            <img src="{logo_url}" height="32" alt="DataPulse" style="display: block;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td class="body-content">
                            <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #202124; font-weight: 500;">Verify your email address</h2>
                            
                            <p style="margin: 0 0 10px 0; font-size: 16px; color: #3c4043; line-height: 1.5;">
                                Thanks for starting your journey with DataPulse. We want to make sure it's really you.
                            </p>
                            
                            <p style="margin: 0; font-size: 16px; color: #3c4043; line-height: 1.5;">
                                Please enter the following code to finish setting up your account:
                            </p>

                            <div class="otp-display">
                                {otp}
                            </div>

                            <p class="fine-print">
                                This code expires in 5 minutes. If you didn't create an account with DataPulse, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #fafafa; padding: 20px 40px; border-top: 1px solid #f0f0f0; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                            <p style="margin: 0; font-size: 11px; color: #9aa0a6;">
                                &copy; {datetime.datetime.now().year} DataPulse • Sent at {timestamp_ist} <span style="font-family: monospace;">ID: {unique_id}</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        """

    # Call the core Brevo sender
    await _send_brevo_message([to_email], subject, html_content)
    
    

async def send_detailed_alert_email(recipients: List[EmailStr], context: dict) -> None:
    """
    Sends a SaaS-grade responsive alert email for schema/metric changes.
    Modelled after Datadog/AWS CloudWatch alerts.
    """
    
    # --- 1. SETUP & VARIABLE EXTRACTION ---
    workspace_id = context.get("workspace_id","")
    workspace_name = context.get("workspace_name", "your workspace")
    upload_time = context.get("upload_time_str", "now")
    upload_type = context.get("upload_type", "data")
    schema_changes = context.get("schema_changes", {})
    metric_changes = context.get("metric_changes", {})
    owner_info = context.get("owner_info", {}) 
    team_info = context.get("team_info", []) 
    ai_insight = context.get("ai_insight")
    new_file_name = context.get("new_file_name", "N/A")
    
    # Assets
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png"
    if workspace_id:
        dashboard_url = f"https://data-pulse-eight.vercel.app/workspace/{workspace_id}"
    else:
        dashboard_url = "https://data-pulse-eight.vercel.app/home"

    # Context Generation
    unique_id = str(uuid.uuid4())
    short_id = unique_id[:4]
    now_utc = datetime.datetime.utcnow()
    timestamp_ist = convert_utc_to_ist_str(now_utc)
    
    source_title = "Manual Upload" if upload_type == 'manual' else "Automated API Poll"

    # --- 2. SMART LOGIC ---
    
    # A. Dynamic Preheader
    change_summary = []
    if metric_changes.get("percent_change"):
        change_summary.append(f"Rows changed by {metric_changes['percent_change']}")
    if schema_changes.get("added"):
        change_summary.append(f"{len(schema_changes['added'])} columns added")
    
    preview_text = f"Update in {workspace_name}: {', '.join(change_summary)}." if change_summary else f"New data synced to {workspace_name}."

    preheader_html = f"""
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    """

    # B. Subject Line (Anti-Threading)
    subject = f"Alert: {workspace_name} - {source_title} Update [{short_id}]"

    # --- 3. HTML COMPONENT BUILDERS ---

    # A. AI Insight (Mobile Safe - Solid Background)
    ai_html = ""
    if ai_insight:
        ai_html = f"""
        <div style="margin-top: 24px; background-color: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td valign="top" width="24" style="padding-right: 12px; font-size: 18px;">✨</td>
                    <td valign="top">
                        <strong style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #5B21B6; display: block; margin-bottom: 6px;">AI Analysis</strong>
                        <div style="font-size: 14px; line-height: 1.6; color: #1F2937;">{ai_insight}</div>
                    </td>
                </tr>
            </table>
        </div>
        """

    # B. Schema Badges (The "Datadog" look)
    schema_html = ""
    if schema_changes:
        added_html = ""
        removed_html = ""
        badge_container_style = "display: block; line-height: 1.8;"
        
        if schema_changes.get("added"):
            badges = []
            for col in schema_changes["added"]:
                badges.append(f'<span style="display: inline-block; background-color: #DEF7EC; color: #03543F; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: monospace; border: 1px solid #BCF0DA; margin-right: 6px; margin-bottom: 6px;">+ {col}</span>')
            
            added_html = f"""
            <div style="margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #046C4E; text-transform: uppercase; letter-spacing: 0.5px;">Added Fields</p>
                <div style="{badge_container_style}">{"".join(badges)}</div>
            </div>
            """
        
        if schema_changes.get("removed"):
            badges = []
            for col in schema_changes["removed"]:
                badges.append(f'<span style="display: inline-block; background-color: #FDE8E8; color: #9B1C1C; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: monospace; border: 1px solid #F8B4B4; margin-right: 6px; margin-bottom: 6px;">- {col}</span>')
            
            removed_html = f"""
            <div>
                <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #C81E1E; text-transform: uppercase; letter-spacing: 0.5px;">Removed Fields</p>
                <div style="{badge_container_style}">{"".join(badges)}</div>
            </div>
            """
            
        schema_html = f"""
        <div style="margin-top: 32px; padding: 24px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <h3 style="margin: 0 0 20px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; border-bottom: 1px solid #F3F4F6; padding-bottom: 12px;">Schema Changes</h3>
            {added_html}
            {removed_html}
        </div>
        """

    # C. Metrics Section (Smart Coloring)
    metrics_html = ""
    if metric_changes:
        change_val = metric_changes.get("percent_change", "0%")
        
        # Smart Logic: Green for +, Red for -, Blue for 0
        if "+" in change_val:
            change_color = "#059669" # Growth (Green)
        elif "-" in change_val:
            change_color = "#DC2626" # Loss (Red)
        else:
            change_color = "#2563EB" # Neutral (Blue)
        
        metrics_html = f"""
        <div style="margin-top: 32px;">
            <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280;">Data Health</h3>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                <tr>
                    <td width="33%" style="padding: 16px; background-color: #FFFFFF; border-right: 1px solid #E5E7EB;">
                        <p style="margin:0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Previous Rows</p>
                        <p style="margin:4px 0 0 0; font-size: 16px; font-weight: 600; color: #111827;">{metric_changes.get("old_rows", "-")}</p>
                    </td>
                    <td width="33%" style="padding: 16px; background-color: #FFFFFF; border-right: 1px solid #E5E7EB;">
                        <p style="margin:0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Current Rows</p>
                        <p style="margin:4px 0 0 0; font-size: 16px; font-weight: 600; color: #111827;">{metric_changes.get("new_rows", "-")}</p>
                    </td>
                    <td width="33%" style="padding: 16px; background-color: #F9FAFB;">
                        <p style="margin:0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Net Change</p>
                        <p style="margin:4px 0 0 0; font-size: 16px; font-weight: 700; color: {change_color};">{change_val}</p>
                    </td>
                </tr>
            </table>
        </div>
        """

    # D. Team Section
    team_section_html = ""
    try:
        team_list_content = format_team_list(owner_info, team_info)
        team_section_html = f"""
        <tr>
            <td style="padding: 24px 48px; background-color: #FAFAFA; border-top: 1px solid #E5E7EB;">
                <h3 style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF;">
                    Workspace Team
                </h3>
                <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px; color: #4B5563;">
                    {team_list_content}
                </ul>
            </td>
        </tr>
        """
    except Exception:
        team_section_html = ""

    # --- 4. MASTER TEMPLATE ---
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
            :root {{ color-scheme: light; supported-color-schemes: light; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0; color: #111827; }}
            table {{ border-collapse: collapse; }}
            .btn:hover {{ background-color: #1F2937 !important; }}
            @media only screen and (max-width: 600px) {{
                .container {{ width: 100% !important; border-radius: 0 !important; }}
                .content-padding {{ padding: 24px 20px !important; }}
                .mobile-stack {{ display: block !important; width: 100% !important; margin-bottom: 12px; }}
            }}
        </style>
    </head>
    <body style="background-color: #F3F4F6;">
        {preheader_html}
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #E5E7EB;">
                        
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="left" valign="middle">
                                            <img src="{logo_url}" height="28" alt="DataPulse" style="display: block;">
                                        </td>
                                        <td align="right" valign="middle">
                                            <span style="font-size: 11px; font-weight: 700; color: #6B7280; letter-spacing: 1px; text-transform: uppercase;">
                                                Data Monitor
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td class="content-padding" style="padding: 24px 48px 40px 48px;">
                                
                                <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                                    <tr>
                                        <td style="background-color: #EFF6FF; color: #1D4ED8; padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                                            {source_title}
                                        </td>
                                    </tr>
                                </table>

                                <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px; line-height: 1.2;">
                                    Update detected in {workspace_name}
                                </h1>
                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #4B5563;">
                                    A new sync event was triggered. Here is the summary of changes affecting your dataset.
                                </p>

                                {ai_html}

                                <div style="margin-top: 32px; padding: 20px; background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td class="mobile-stack" width="60%" valign="top" style="padding-right: 16px;">
                                                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">File Source</p>
                                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827; font-family: 'SF Mono', Consolas, monospace; word-break: break-all;">
                                                    {new_file_name}
                                                </p>
                                            </td>
                                            <td class="mobile-stack" width="40%" valign="top">
                                                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Sync Timestamp</p>
                                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827;">{timestamp_ist}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                {schema_html}
                                {metrics_html}

                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px;">
                                    <tr>
                                        <td align="center">
                                            <a href="{dashboard_url}" target="_blank" class="btn" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                                                Open Dashboard &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                            </td>
                        </tr>

                        {team_section_html}

                    </table>

                    <div style="margin-top: 32px; text-align: center; width: 600px; max-width: 100%;">
                        <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                            &copy; 2025 DataPulse Systems. All rights reserved.
                        </p>
                        <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 10px; color: #D1D5DB;">
                            Ref: {short_id}
                        </p>
                    </div>

                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    # --- 5. SEND VIA BREVO ---
    await _send_brevo_message(recipients, subject, html_content)
    

async def send_threshold_alert_email(recipients: List[EmailStr], context: dict) -> None:
    """Sends the threshold alert email (Enterprise Grade)."""
    
    # --- 1. SETUP ---
    workspace_id = context.get("workspace_id", "")
    workspace_name = context.get("workspace_name", "your workspace")
    rule = context.get("rule", {})
    timestamp_ist = convert_utc_to_ist_str(datetime.datetime.utcnow())
    
    # Generate ID for threading
    unique_id = str(uuid.uuid4())
    short_id = unique_id[:4]
    
    col_name = rule.get('column_name', 'Column')
    
    # Format actual value
    actual_val = context.get('actual_value', 'N/A')
    if isinstance(actual_val, float):
        actual_val = f"{actual_val:.2f}"
        
    # Format threshold value
    threshold_val = rule.get('value', 'N/A')
    
    # Clean up condition (e.g., "greater_than" -> "greater than")
    condition_str = rule.get('condition', 'is').replace('_', ' ')
    
    # [YOUR REQUEST]: Natural Language Sentence Construction
    # Ex: "revenue is less than 5000"
    trigger_sentence = f"<strong>{col_name}</strong> is {condition_str} <strong>{threshold_val}</strong>"
    
    # Branding
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png"
    dashboard_url = "https://data-pulse-eight.vercel.app/home"
    
    if workspace_id:
        dashboard_url = f"https://data-pulse-eight.vercel.app/workspace/{workspace_id}"
    else:
        dashboard_url = "https://data-pulse-eight.vercel.app/home"

    # --- 2. SUBJECT & PREHEADER ---
    subject = f"Smart Alert: {col_name} triggered in {workspace_name} [{short_id}]"
    preview_text = f"Monitor Alert: {col_name} is {condition_str} {threshold_val}. Actual value detected: {actual_val}."
    
    preheader_html = f"""
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    """

    # --- 3. HTML CONTENT ---
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
            :root {{ color-scheme: light; supported-color-schemes: light; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0; color: #111827; }}
            table {{ border-collapse: collapse; }}
            .btn:hover {{ background-color: #B45309 !important; }}
            @media only screen and (max-width: 600px) {{
                .container {{ width: 100% !important; border-radius: 0 !important; }}
                .content {{ padding: 24px 20px !important; }}
            }}
        </style>
    </head>
    <body style="background-color: #F3F4F6;">
        {preheader_html}
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E5E7EB;">
                        
                        <tr>
                            <td style="padding: 32px 40px 0 40px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="left" valign="middle">
                                            <img src="{logo_url}" height="26" alt="DataPulse" style="display: block;">
                                        </td>
                                        <td align="right" valign="middle">
                                            <span style="font-size: 11px; font-weight: 700; color: #D97706; letter-spacing: 1px; text-transform: uppercase;">
                                                Monitor Alert
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td class="content" style="padding: 24px 40px 40px 40px;">
                                
                                <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                                    Threshold triggered in {workspace_name}
                                </h1>
                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #4B5563;">
                                    Your monitoring rule detected a value outside your defined range.
                                </p>

                                <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                                    
                                    <div style="margin-bottom: 20px; font-size: 15px; color: #92400E; border-bottom: 1px solid #FDE68A; padding-bottom: 16px;">
                                        Condition: {trigger_sentence}
                                    </div>
                                    
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="40%" style="font-size: 12px; color: #92400E; font-weight: 700; text-transform: uppercase; padding-bottom: 4px;">Actual Value</td>
                                            <td style="font-size: 20px; font-weight: 700; color: #B45309;">
                                                {actual_val}
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="border-top: 1px solid #F3F4F6; padding-top: 20px; margin-bottom: 32px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td valign="top">
                                                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">Event Source</p>
                                                <p style="margin: 0; font-size: 14px; color: #374151;">
                                                    File: <span style="font-family: monospace;">{context.get("file_name", "N/A")}</span>
                                                </p>
                                            </td>
                                            <td align="right" valign="top">
                                                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">Detected At</p>
                                                <p style="margin: 0; font-size: 14px; color: #374151;">
                                                    {timestamp_ist}
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{dashboard_url}" target="_blank" class="btn" style="display: inline-block; background-color: #D97706; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                                                Investigate Issue &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 32px; text-align: center; color: #9CA3AF; font-size: 12px;">
                        <p style="margin: 0 0 8px 0;">
                            &copy; 2025 DataPulse Systems.
                        </p>
                        <p style="margin: 0 0 8px 0;">
                            <a href="{dashboard_url}" style="color: #9CA3AF; text-decoration: underline;">Manage Rules in Dashboard</a> 
                            &nbsp;•&nbsp; 
                            <span style="font-family: monospace;">ID: {short_id}</span>
                        </p>
                    </div>

                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    await _send_brevo_message(recipients, subject, html_content)
    
    
# --- 2. DELETE OTP FUNCTION (Enterprise Grade) ---
async def send_delete_otp_email(to_email: str, otp_code: str, workspace_name: str):
    """
    Sends the 6-digit OTP for workspace deletion with security audit details.
    """
    # 1. GENERATE SECURITY CONTEXT
    now_utc = datetime.datetime.utcnow()
    timestamp_ist = convert_utc_to_ist_str(now_utc)
    unique_id = str(uuid.uuid4())
    
    # 2. BRANDING
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png"
    
    # 3. SUBJECT & PREHEADER
    subject = f"{otp_code} is your code to delete '{workspace_name}'"
    preview_text = f"Security Check: You requested to move {workspace_name} to Trash at {timestamp_ist}. Use this code to confirm."

    preheader_html = f"""
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    """

    # 4. HTML CONTENT
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
            :root {{ color-scheme: light; supported-color-schemes: light; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0; color: #111827; }}
            @media only screen and (max-width: 600px) {{
                .container {{ width: 100% !important; border-radius: 0 !important; }}
                .content {{ padding: 24px 20px !important; }}
                .mobile-stack {{ display: block !important; width: 100% !important; margin-bottom: 8px; }}
            }}
        </style>
    </head>
    <body style="background-color: #F3F4F6;">
        {preheader_html}
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table class="container" border="0" cellpadding="0" cellspacing="0" width="560" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E5E7EB; overflow: hidden;">
                        
                        <tr>
                            <td style="padding: 32px 40px 0 40px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="left" valign="middle">
                                            <img src="{logo_url}" height="26" alt="DataPulse" style="display: block;">
                                        </td>
                                        <td align="right" valign="middle">
                                            <span style="font-size: 11px; font-weight: 700; color: #9CA3AF; letter-spacing: 1px; text-transform: uppercase;">
                                                Security Check
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td class="content" style="padding: 24px 40px 40px 40px;">
                                
                                <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 600; line-height: 1.3;">
                                    Confirm move to Trash
                                </h1>

                                <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 15px; line-height: 1.6;">
                                    A request was made to move a workspace to the Trash. Please review the details below.
                                </p>
                                
                                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td class="mobile-stack" width="50%" valign="top">
                                                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Workspace</p>
                                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827; font-weight: 600;">{workspace_name}</p>
                                            </td>
                                            <td class="mobile-stack" width="50%" valign="top">
                                                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Request Time</p>
                                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827;">{timestamp_ist}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 12px 16px;">
                                            <p style="margin: 0; font-size: 13px; color: #1E40AF; line-height: 1.5;">
                                                <strong>Policy:</strong> This workspace will be retained for <strong>30 days</strong>. You can restore it anytime during this period.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 16px 0; color: #4B5563; font-size: 15px; line-height: 1.6;">
                                    Enter the code below to confirm this action:
                                </p>

                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F3F4F6; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 24px;">
                                    <tr>
                                        <td align="center" style="padding: 24px;">
                                            <span style="font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace; font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 8px; display: block;">
                                                {otp_code}
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0; color: #6B7280; font-size: 13px; text-align: center;">
                                    This code is valid for <strong>10 minutes</strong>.
                                </p>

                                <div style="border-top: 1px solid #F3F4F6; margin: 32px 0 24px 0;"></div>

                                <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5; text-align: center;">
                                    If you didn't request this, you can safely ignore this email. Your workspace will remain active.
                                </p>

                            </td>
                        </tr>

                    </table>
                    
                    <div style="margin-top: 24px; color: #9CA3AF; font-size: 12px; text-align: center;">
                        &copy; 2025 DataPulse. <span style="font-family: monospace;">Ref: {unique_id}</span>
                    </div>

                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    await _send_brevo_message([to_email], subject, html_content)