import os
import logging
import pytz
import datetime
import uuid
from typing import List, Dict
from pydantic import EmailStr
import html 
# ---BREVO SDK IMPORTS ---
from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api.transactional_emails_api import TransactionalEmailsApi
from sib_api_v3_sdk.models import SendSmtpEmail
from sib_api_v3_sdk.rest import ApiException
import anyio 


logger = logging.getLogger(__name__)

# --- Configuration ---
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL") 
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "DataPulse")

# Initialize Brevo Client
email_api = None
api_client = None
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


# SENDING LOGIC
async def _send_brevo_message(recipients: List[EmailStr],subject: str, html_content: str) -> bool:
    if email_api is None:
        logger.error("Brevo email service not initialized. Email skipped.")
        return False

    try:
        email_to_send = SendSmtpEmail(
            sender={"name": MAIL_FROM_NAME, "email": MAIL_FROM_EMAIL},
            to=[{"email": r} for r in recipients],
            subject=subject,
            html_content=html_content,
        )

        await anyio.to_thread.run_sync( email_api.send_transac_email, email_to_send)

        logger.info( "Brevo email sent successfully", extra={"recipient_count": len(recipients)} )
        return True

    except ApiException as api_err:
        logger.error( "Brevo API error while sending email",
            extra={
                "status": api_err.status,
                "reason": api_err.reason,
                "recipient_count": len(recipients),
            },
            exc_info=True,
        )
        return False

    except Exception:
        logger.exception(
            "Unexpected error while sending email",
            extra={"recipient_count": len(recipients)}
        )
        return False



# Public Email Functions
async def send_otp_email(to_email: str, otp: str, subject_type="verification") -> None:
   
    current_year = datetime.datetime.now().year
    ref_id = uuid.uuid4().hex[:6].upper()
    
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
    legal_url = "https://data-pulse-eight.vercel.app/legal"
    
    if subject_type == "password_reset":
        subject = f"Reset your DataPulse password [Ref: #{ref_id}]"
        preview_text = "Use the code inside to reset your password. Valid for 10 minutes."
    else:
        subject = f"{otp} is your DataPulse verification code"
        preview_text = "Welcome to DataPulse! Use this code to verify your email address."

    preheader_html = f"""
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    """

    if subject_type == "password_reset":
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; color: #333; }}
                
                /* Desktop Wrapper: Grey background with padding */
                .wrapper {{ padding: 40px 20px; background-color: #f2f4f8; }}
                
                /* Main Card Styles */
                .card {{ max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 4px; border: 1px solid #dcdcdc; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); overflow: hidden; border-collapse: separate; }}
                
                .content {{ padding: 40px 48px; }}
                .otp-box {{ background: #f8f9fa; border: 1px solid #dadce0; border-radius: 4px; padding: 20px; text-align: center; margin: 25px 0; }}
                .otp-code {{ font-family: ui-monospace, monospace; font-size: 32px; font-weight: 700; color: #111111; letter-spacing: 6px; }}
                
                /* THE PRO FIX: This kills the grey gap on mobile */
                @media only screen and (max-width: 600px) {{
                    body {{ background-color: #ffffff !important; }}
                    .wrapper {{ padding: 0 !important; background-color: #ffffff !important; }}
                    .card {{ border: none !important; border-radius: 0 !important; width: 100% !important; box-shadow: none !important; }}
                    .content {{ padding: 32px 24px !important; }}
                    .new-footer {{ padding: 32px 24px !important; text-align: left !important; }}
                }}
            </style>
        </head>
        <body>
            {preheader_html}
            <div class="wrapper">
                <table class="card" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="content">
                            <img src="{logo_url}" width="120" alt="DataPulse" style="display: block; margin-bottom: 30px; height: auto;">
                            <h1 style="margin: 0 0 10px 0; font-size: 22px; color: #111111; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3;">
                                Password reset verification
                            </h1>
                            <p style="margin: 0 0 20px 0; font-size: 15px; color: #3c4043; line-height: 1.5;">
                                We received a request to reset your DataPulse password. Please enter the following verification code:
                            </p>
                            <div class="otp-box"><span class="otp-code">{otp}</span></div>
                            <p style="margin: 0; font-size: 14px; color: #5f6368; line-height: 1.5;">
                                This code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td class="new-footer" style="background-color: #fafafa; padding: 48px; border-top: 1px solid #f0f0f0; text-align: left;">
                            <img src="{logo_url}" alt="DataPulse" width="90" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 24px; width: 90px; height: auto;">
                            
                            <p style="margin: 0 0 16px 0; font-size: 11px; line-height: 1.6; color: #9ca3af; word-break: break-word;">
                                This message was sent to
                                <a href="mailto:{to_email}" style="color: #6b7280; text-decoration: underline; font-weight: 500;">
                                    {to_email}
                                </a>.
                                If you have questions or complaints, please
                                <a href="mailto:datapulseapp@gmail.com" style="color: #6b7280; text-decoration: none; font-weight: 500;">
                                    contact us
                                </a>.
                            </p>

                            <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #d1d5db;">
                                <span style="display: inline-block;">
                                    <a href="{legal_url}" style="color: #d1d5db; text-decoration: none;">Terms of Use</a>
                                </span>
                                &nbsp;|&nbsp;
                                <span style="display: inline-block;">
                                    <a href="{legal_url}" style="color: #d1d5db; text-decoration: none;">Privacy Policy</a>
                                </span>
                                <br><br>
                                <span style="display: block; color: #d1d5db;">
                                    Security ID: {ref_id}<br>
                                    © {current_year} DataPulse • Hyderabad, Telangana, India
                                </span>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        """
    else:
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                /* THE PRO FIX: Syncs all backgrounds on mobile to kill the grey/blue gaps */
                @media only screen and (max-width: 600px) {{
                    body {{ 
                        background-color: #ffffff !important; 
                    }}
                    .wrapper {{ 
                        padding: 0 !important; 
                        background-color: #ffffff !important; 
                    }}
                    .card {{ 
                        border: none !important; 
                        border-radius: 0 !important; 
                        width: 100% !important; 
                        max-width: 100% !important;
                        box-shadow: none !important; 
                    }}
                    .header, .body-content {{ 
                        padding: 30px 20px !important; 
                    }}
                    .new-footer {{ 
                        padding: 32px 20px !important; 
                        text-align: left !important; 
                    }}
                    .footer-text {{ 
                        font-size: 12px !important; 
                        line-height: 1.6 !important; 
                    }}
                }}
            </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; color: #333;">
            {preheader_html}
            
            <div class="wrapper" style="padding: 40px 20px; background-color: #F6F9FC;">
                
                <table class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #eaebed; border-collapse: separate; overflow: hidden;">
                    
                    <tr>
                        <td class="header" style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
                            <img src="{logo_url}" height="32" alt="DataPulse" style="display: block; height: 32px; width: auto;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td class="body-content" style="padding: 40px 40px 30px 40px; text-align: left;">
                            <h2 style="margin: 0 0 16px 0; font-size: 21px; color: #111111; font-weight: 600; letter-spacing: -0.02em;">Verify your email address</h2>
                            <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;"> To complete your DataPulse account setup, enter the verification code below.</p>
                            
                            <div class="otp-box" style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
                                <span class="otp-code" style="font-family: ui-monospace, monospace; font-size: 36px; font-weight: 700; color: #111111; letter-spacing: 5px;">{otp}</span>
                            </div>
                            
                            <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">This code expires in 5 minutes. If you did not create a DataPulse account, no action is required.</p>
                        </td>
                    </tr>

                    <tr>
                        <td class="new-footer" style="background-color: #fafafa; padding: 48px; border-top: 1px solid #f0f0f0; text-align: left;">
                            <img src="{logo_url}" alt="DataPulse" width="90" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 24px; width: 90px; height: auto;">
                            
                            <p class="footer-text" style="margin: 0 0 16px 0; font-size: 11px; line-height: 1.6; color: #9ca3af; word-break: break-word;">
                                This message was sent to
                                <a href="mailto:{to_email}" style="color: #6b7280; text-decoration: underline; font-weight: 500;">
                                    {to_email}
                                </a>.
                                If you have questions or complaints, please
                                <a href="mailto:datapulseapp@gmail.com" style="color: #6b7280; text-decoration: none; font-weight: 500;">
                                    contact us
                                </a>.
                            </p>

                            <p class="footer-text" style="margin: 0; font-size: 11px; line-height: 1.6; color: #d1d5db;">
                                <span style="display: inline-block;">
                                    <a href="{legal_url}" style="color: #d1d5db; text-decoration: none;">Terms of Use</a>
                                </span>
                                &nbsp;|&nbsp;
                                <span style="display: inline-block;">
                                    <a href="{legal_url}" style="color: #d1d5db; text-decoration: none;">Privacy Policy</a>
                                </span>
                                <br><br>
                                <span style="display: block; color: #d1d5db;">
                                    © {current_year} DataPulse • Hyderabad, Telangana, India
                                </span>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        """

    await _send_brevo_message([to_email], subject, html_content)
    
    

async def send_detailed_alert_email(recipients: List[EmailStr], context: dict) -> None:
    current_year = datetime.datetime.now().year
    workspace_id = context.get("workspace_id","")
    workspace_name = context.get("workspace_name", "your workspace")
    upload_time = context.get("upload_time_str", "now")
    upload_type = context.get("upload_type", "data")
    schema_changes = context.get("schema_changes", {})
    metric_changes = context.get("metric_changes", {})
    owner_info = context.get("owner_info", {}) 
    team_info = context.get("team_info", []) 
    new_file_name = context.get("new_file_name", "N/A")
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
    dashboard_url = f"https://data-pulse-eight.vercel.app/workspace/{workspace_id}" if workspace_id else "https://data-pulse-eight.vercel.app/home"
    unique_id = str(uuid.uuid4()); short_id = unique_id[:4]
    now_utc = datetime.datetime.utcnow(); timestamp_ist = convert_utc_to_ist_str(now_utc)
    source_title = "Manual Upload" if upload_type == 'manual' else "Automated API Poll"

    change_summary = []
    if metric_changes.get("percent_change"): change_summary.append(f"Rows changed by {metric_changes['percent_change']}")
    if schema_changes.get("added"): change_summary.append(f"{len(schema_changes['added'])} columns added")
    preview_text = f"Update in {workspace_name}: {', '.join(change_summary)}." if change_summary else f"New data synced to {workspace_name}."
    preheader_html = f'<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">{preview_text} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>'
    subject = f"{workspace_name} · {source_title} Data Change Detected [{short_id}]"

    schema_html = ""

    added = (schema_changes or {}).get("added") or []
    removed = (schema_changes or {}).get("removed") or []

    if not added and not removed:
        schema_html = """
        <div style="margin-top: 32px; padding: 16px; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px;">
        <p style="margin: 0; font-size: 12px; color: #374151;">
            No schema changes detected. Column structure stayed the same.
        </p>
        </div>
        """
    else:
        added_html = ""
        removed_html = ""

        if added:
            badges = [
                f'<span style="display: inline-block; background-color: #DEF7EC; color: #03543F; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: ui-monospace, monospace; border: 1px solid #BCF0DA; margin-right: 6px; margin-bottom: 6px;">+ {col}</span>'
                for col in added
            ]
            added_html = f'''
            <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #046C4E; text-transform: uppercase; letter-spacing: 0.5px;">Added Fields</p>
            <div style="display: block; line-height: 1.8;">{"".join(badges)}</div>
            </div>
            '''

        if removed:
            badges = [
                f'<span style="display: inline-block; background-color: #FDE8E8; color: #9B1C1C; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: ui-monospace, monospace; border: 1px solid #F8B4B4; margin-right: 6px; margin-bottom: 6px;">- {col}</span>'
                for col in removed
            ]
            removed_html = f'''
            <div>
            <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #C81E1E; text-transform: uppercase; letter-spacing: 0.5px;">Removed Fields</p>
            <div style="display: block; line-height: 1.8;">{"".join(badges)}</div>
            </div>
            '''

        schema_html = f'''
        <div style="margin-top: 32px; padding: 24px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h3 style="margin: 0 0 20px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; border-bottom: 1px solid #F3F4F6; padding-bottom: 12px;">
            Schema Changes
        </h3>
        {added_html}{removed_html}
        </div>
        '''

    metrics_html = ""
    if metric_changes:
        change_val = metric_changes.get("percent_change", "0%")
        change_color = "#059669" if "+" in change_val else "#DC2626" if "-" in change_val else "#2563EB"
        metrics_html = f"""<div style="margin-top: 32px;"><h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280;">Data Health</h3><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; border-collapse: separate;"><tr><td width="33%" style="padding: 16px; background-color: #FFFFFF; border-right: 1px solid #E5E7EB;"><p style="margin:0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Previous</p><p style="margin:4px 0 0 0; font-size: 15px; font-weight: 600; color: #111827;">{metric_changes.get("old_rows", "-")}</p></td><td width="33%" style="padding: 16px; background-color: #FFFFFF; border-right: 1px solid #E5E7EB;"><p style="margin:0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Current</p><p style="margin:4px 0 0 0; font-size: 15px; font-weight: 600; color: #111827;">{metric_changes.get("new_rows", "-")}</p></td><td width="33%" style="padding: 16px; background-color: #F9FAFB;"><p style="margin:0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Net Change</p><p style="margin:4px 0 0 0; font-size: 15px; font-weight: 700; color: {change_color};">{change_val}</p></td></tr></table></div>"""

    team_section_html = ""
    try:
        team_list_content = format_team_list(owner_info, team_info)
        team_section_html = f'<tr><td style="padding: 24px 48px; background-color: #FAFAFA; border-top: 1px solid #E5E7EB;"><h3 style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF;">Workspace Team</h3><ul style="margin: 0; padding: 0; list-style: none; font-size: 13px; color: #4B5563;">{team_list_content}</ul></td></tr>'
    except Exception: team_section_html = ""

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {{
                body {{ background-color: #ffffff !important; }}
                .main-wrapper {{ padding: 0 !important; background-color: #ffffff !important; }}
                .container {{ width: 100% !important; border-radius: 0 !important; border: none !important; box-shadow: none !important; }}
                .content-padding {{ padding: 32px 20px !important; }}
                .mobile-stack {{ display: block !important; width: 100% !important; margin-bottom: 12px; }}
                .new-footer {{ padding: 32px 20px !important; text-align: left !important; }}
            }}
        </style>
    </head>
    <body style="font-family: -apple-system, system-ui, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0;">
        {preheader_html}
        <table class="main-wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-collapse: separate; overflow: hidden;">
                        <tr>
                            <td class="content-padding" style="padding: 32px 48px 0 48px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td><img src="{logo_url}" height="28" alt="DataPulse" style="display: block;"></td>
                                        <td align="right"><span style="font-size: 11px; font-weight: 700; color: #6B7280; letter-spacing: 1px; text-transform: uppercase;">Data Monitor</span></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="content-padding" style="padding: 24px 48px 40px 48px; text-align: left;">
                                <span style="display: inline-block; background-color: #EFF6FF; color: #1D4ED8; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px;">{source_title}</span>
                                <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; line-height: 1.2;">Update in {workspace_name}</h1>
                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">New data was received and processed. Below is a quick summary of what changed.</p>
                                <div style="margin-top: 32px; padding: 20px; background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td class="mobile-stack" width="60%" valign="top"><p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Data Source</p><p style="margin: 4px 0 0 0; font-size: 13px; color: #111827; font-family: ui-monospace, monospace; word-break: break-all;">{new_file_name}</p></td>
                                            <td class="mobile-stack" width="40%" valign="top" align="right"><p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Processed At</p><p style="margin: 4px 0 0 0; font-size: 13px; color: #111827;">{timestamp_ist}</p></td>
                                        </tr>
                                    </table>
                                </div>
                                {schema_html}
                                {metrics_html}
                                <div style="margin-top: 40px; text-align: center;">
                                    <a href="{dashboard_url}" target="_blank" style="background-color: #111827; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">Open Dashboard &rarr;</a>
                                </div>
                            </td>
                        </tr>
                        {team_section_html}
                        <tr>
                            <td class="new-footer" style="background-color: #fafafa; padding: 48px; border-top: 1px solid #f0f0f0; text-align: left;">
                                <img src="{logo_url}" alt="DataPulse" width="90" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 24px; width: 90px; height: auto;">
                                <p style="margin: 0 0 16px 0; font-size: 11px; line-height: 1.6; color: #9ca3af; word-break: break-word;">
                                    You are receiving this email because notifications are enabled for 
                                    <span style="color: #6b7280; font-weight: 500;">{workspace_name}</span>.
                                    <br><br>
                                    You can change or disable email notifications anytime from your workspace settings:
                                    <br>
                                    <a href="{dashboard_url}" style="color: #6b7280; text-decoration: none; font-weight: 500;">
                                        Manage notification preferences
                                    </a>.
                                    <br><br>
                                    Need help? Contact us at 
                                    <a href="mailto:datapulseapp@gmail.com" style="color: #6b7280; text-decoration: none; font-weight: 500;">
                                        datapulseapp@gmail.com
                                    </a>.
                                </p>
                                <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #d1d5db;">
                                    <span style="display: inline-block;"><a href="https://data-pulse-eight.vercel.app/legal" style="color: #d1d5db; text-decoration: none;">Terms of Use</a></span> &nbsp;|&nbsp; 
                                    <span style="display: inline-block;"><a href="https://data-pulse-eight.vercel.app/legal" style="color: #d1d5db; text-decoration: none;">Privacy Policy</a></span>
                                    <br><br><span style="display: block; color: #d1d5db;">Ref: {short_id}<br>© {current_year} DataPulse • Hyderabad, Telangana, India</span>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    await _send_brevo_message(recipients, subject, html_content)
    
    
async def send_threshold_alert_email(recipients: List[EmailStr], context: dict) -> None:
    ref_id = uuid.uuid4().hex[:4].upper()
    workspace_id = context.get("workspace_id", "")
    workspace_name = html.escape(context.get("workspace_name", "your workspace"))
    current_year = datetime.datetime.now().year
    triggered_alerts = context.get("triggered_alerts", [])
    alert_count = len(triggered_alerts)
    
    if alert_count == 0:
        logger.warning("Email aborted: No alerts provided in context.")
        return
    timestamp_display = context.get("upload_time", "N/A")
    raw_track_id = context.get("idempotency_key", "internal_task")
    track_id = raw_track_id.split('_')[-1] if '_' in raw_track_id else raw_track_id[:8]

    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
    base_url = "https://data-pulse-eight.vercel.app"
    dashboard_url = f"{base_url}/workspace/{workspace_id}" if workspace_id else f"{base_url}/home"
    if alert_count == 1:
        clean_col = html.escape(triggered_alerts[0]['column_name'])
        subject = f"DataPulse Alert: {clean_col} condition triggered in {workspace_name} [Ref:#{ref_id}]"
    else:
        subject = f"DataPulse Alerts: {alert_count} conditions triggered in {workspace_name} [Ref:#{ref_id}]"


    preview_text = (
        f"DataPulse detected {alert_count} threshold alerts in {workspace_name}. "
        f"Source: {context.get('file_name', 'Data')}"
    )

    alerts_html_rows = ""
    for alert in triggered_alerts:
        safe_col = html.escape(str(alert['column_name']))
        safe_metric = html.escape(str(alert['metric']))
        safe_cond = html.escape(str(alert['condition']))
        
        alerts_html_rows += f"""
        <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #F3F4F6; vertical-align: top;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827; letter-spacing: -0.01em; line-height: 1.4;">
                    {safe_col}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280; line-height: 1.4;">
                    {safe_metric} <span style="color: #9CA3AF;">{safe_cond}</span> {alert['threshold']}
                </p>
            </td>
            <td align="right" style="padding: 16px 0; border-bottom: 1px solid #F3F4F6; vertical-align: middle;">
                <span style="font-family: ui-monospace, monospace; font-size: 15px; font-weight: 700; color: #B45309; background-color: #FFFBEB; padding: 4px 8px; border-radius: 6px;">
                    {alert['actual']}
                </span>
            </td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* THE PRO FIX: This kills the grey edges/gaps on mobile forever */
            @media only screen and (max-width: 600px) {{
                body {{ 
                    background-color: #ffffff !important; 
                }}
                .main-wrapper {{ 
                    padding: 0 !important; 
                    background-color: #ffffff !important; 
                }}
                .container {{ 
                    width: 100% !important; 
                    max-width: 100% !important;
                    border: none !important; 
                    box-shadow: none !important;
                    border-radius: 0 !important;
                }}
                .inner-padding {{ 
                    padding: 30px 20px !important; 
                }}
                .new-footer {{ 
                    padding: 32px 20px !important; 
                    text-align: left !important; 
                }}
            }}
        </style>
    </head>
    <body style="font-family: -apple-system, system-ui, sans-serif; background-color: #F9FAFB; margin: 0; padding: 0;">
        <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">{preview_text}</div>
        
        <table class="main-wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-collapse: separate; overflow: hidden;">
                        
                        <tr>
                            <td class="inner-padding" style="padding: 32px 40px 0 40px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td><img src="{logo_url}" height="26" alt="DataPulse" style="display: block; height: 26px; width: auto;"></td>
                                        <td align="right">
                                            <span style="font-size: 10px; font-weight: 800; color: #D97706; text-transform: uppercase; letter-spacing: 1px; background-color: #FFFBEB; padding: 4px 8px; border-radius: 4px; border: 1px solid #FEF3C7;">Status: Alert</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td class="inner-padding" style="padding: 32px 40px 40px 40px; text-align: left;">
                                <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0 0 12px 0; letter-spacing: -0.02em;">Monitoring Report</h1>
                                <p style="font-size: 16px; color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
                                    Threshold violations detected in workspace <strong style="color: #111827;">{workspace_name}</strong>.
                                </p>

                                <div style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                                    <table width="100%" style="border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th align="left" style="font-size: 11px; font-weight: 700; color: #92400E; text-transform: uppercase; padding-bottom: 12px; border-bottom: 2px solid #FDE68A;">Metric Details</th>
                                                <th align="right" style="font-size: 11px; font-weight: 700; color: #92400E; text-transform: uppercase; padding-bottom: 12px; border-bottom: 2px solid #FDE68A;">Detected</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alerts_html_rows}
                                        </tbody>
                                    </table>
                                </div>

                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #F3F4F6; padding-top: 24px;">
                                    <tr>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">Source File</p>
                                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151; font-family: ui-monospace, monospace;">{html.escape(context.get("file_name", "N/A"))}</p>
                                        </td>
                                        <td width="50%" align="right">
                                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">Detected At</p>
                                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #374151;">{timestamp_display}</p>
                                        </td>
                                    </tr>
                                </table>

                                <div style="margin-top: 40px; text-align: center;">
                                    <a href="{dashboard_url}" style="background-color: #111827; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block;">Investigate in Dashboard &rarr;</a>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td class="new-footer" style="background-color: #fafafa; padding: 48px; border-top: 1px solid #f0f0f0; text-align: left;">
                                <img src="{logo_url}" alt="DataPulse" width="90" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 24px; width: 90px; height: auto;">
                                
                                <p style="margin: 0 0 16px 0; font-size: 11px; line-height: 1.6; color: #9ca3af; word-break: break-word;">
                                    You are receiving this email because notifications are enabled for 
                                    <span style="color: #6b7280; font-weight: 500;">{workspace_name}</span>.
                                    <br><br>
                                    You can change or disable email notifications anytime from your workspace settings:
                                    <br>
                                    <a href="{dashboard_url}" style="color: #6b7280; text-decoration: none; font-weight: 500;">
                                        Manage notification preferences
                                    </a>.
                                    <br><br>
                                    Need help? Contact us at 
                                    <a href="mailto:datapulseapp@gmail.com" style="color: #6b7280; text-decoration: none; font-weight: 500;">
                                        datapulseapp@gmail.com
                                    </a>.
                                </p>

                                <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #d1d5db;">
                                    <span style="display: inline-block;">
                                        <a href="https://data-pulse-eight.vercel.app/legal" style="color: #d1d5db; text-decoration: none;">Terms of Use</a>
                                    </span>
                                    &nbsp;|&nbsp;
                                    <span style="display: inline-block;">
                                        <a href="https://data-pulse-eight.vercel.app/legal" style="color: #d1d5db; text-decoration: none;">Privacy Policy</a>
                                    </span>
                                    <br><br>
                                    <span style="display: block; color: #d1d5db;">
                                        Event ID: {track_id}<br>
                                        © {current_year} DataPulse • Hyderabad, Telangana, India
                                    </span>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    await _send_brevo_message(recipients, subject, html_content)
    
    
async def send_delete_otp_email(to_email: str, otp_code: str, workspace_name: str):
   
    now_utc = datetime.datetime.utcnow()
    timestamp_ist = convert_utc_to_ist_str(now_utc)
    unique_id = str(uuid.uuid4())
    short_id = unique_id[:6].upper()
    current_year = datetime.datetime.now().year
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
    legal_url = "https://data-pulse-eight.vercel.app/legal"
    
    subject = f"Verify deletion of '{workspace_name}' [RefID: #{short_id}]"
    preview_text = f"Security: A deletion request for {workspace_name} was initiated at {timestamp_ist}. Use the code inside to confirm."

    preheader_html = f"""
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preview_text}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* THE PRO FIX: Kill grey edges and sync backgrounds on mobile */
            @media only screen and (max-width: 600px) {{
                body {{ background-color: #ffffff !important; }}
                .main-wrapper {{ padding: 0 !important; background-color: #ffffff !important; }}
                .container {{ width: 100% !important; border-radius: 0 !important; border: none !important; box-shadow: none !important; }}
                .inner-padding {{ padding: 32px 20px !important; }}
                .new-footer {{ padding: 32px 20px !important; text-align: left !important; }}
            }}
        </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0; color: #111827;">
        {preheader_html}
        
        <table class="main-wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table class="container" width="560" border="0" cellpadding="0" cellspacing="0" style="width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E5E7EB; border-collapse: separate; overflow: hidden;">
                        
                        <tr>
                            <td class="inner-padding" style="padding: 32px 40px 0 40px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td><img src="{logo_url}" height="26" alt="DataPulse" style="display: block; height: 26px; width: auto;"></td>
                                        <td align="right">
                                            <span style="font-size: 10px; font-weight: 800; color: #B91C1C; text-transform: uppercase; letter-spacing: 1px; background-color: #FEF2F2; padding: 4px 8px; border-radius: 4px; border: 1px solid #FEE2E2;">Security: Destruction</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td class="inner-padding" style="padding: 24px 40px 40px 40px; text-align: left;">
                                <h1 style="margin: 0 0 12px 0; color: #111827; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">
                                    Verify Deletion Request
                                </h1>
                                <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
                                    We received a request to permanently delete the workspace <strong style="color: #111827;">{workspace_name}</strong>. This action will revoke all team access and remove associated dataset configurations.
                                </p>
                                
                                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="50%" valign="top">
                                                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Target Workspace</p>
                                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827; font-weight: 600;">{workspace_name}</p>
                                            </td>
                                            <td width="50%" valign="top" align="right">
                                                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700;">Request Time</p>
                                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #111827;">{timestamp_ist}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; margin-bottom: 32px;">
                                    <tr>
                                        <td style="padding: 16px;">
                                            <p style="margin: 0; font-size: 14px; color: #1E40AF; line-height: 1.5;">
                                                <strong>Data Policy:</strong> Deletion moves the workspace to the Trash for <strong>30 days</strong>. After this period, all data will be purged. You may restore it anytime from your dashboard until the purge occurs.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 12px 0; color: #111827; font-size: 14px; font-weight: 600;">Verification Code</p>
                                <div style="background-color: #F8F9FA; border: 1px solid #D1D5DB; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                    <span style="font-family: ui-monospace, monospace; font-size: 36px; font-weight: 700; color: #111111; letter-spacing: 8px; display: block;">
                                        {otp_code}
                                    </span>
                                </div>

                                <p style="margin: 0; color: #6B7280; font-size: 13px; text-align: center; line-height: 1.5;">
                                    This security code expires in <strong>10 minutes</strong>. <br>
                                    If you did not initiate this deletion, please ignore this email; your workspace and data are safe.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td class="new-footer" style="background-color: #fafafa; padding: 48px; border-top: 1px solid #f0f0f0; text-align: left;">
                                <img src="{logo_url}" alt="DataPulse" width="90" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 24px; width: 90px; height: auto;">
                                
                                <p style="margin: 0 0 16px 0; font-size: 11px; line-height: 1.6; color: #9ca3af; word-break: break-word;">
                                    This message was sent to <span style="color: #6b7280; font-weight: 500;">{to_email}</span> regarding a sensitive account action. 
                                    If you have questions, please <a href="mailto:datapulseapp@gmail.com" style="color: #6b7280; text-decoration: none; font-weight: 500;">contact us</a>.
                                </p>

                                <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #d1d5db;">
                                    <span style="display: inline-block;">
                                        <a href="{legal_url}" style="color: #d1d5db; text-decoration: none;">Terms of Use</a>
                                    </span>
                                    &nbsp;|&nbsp;
                                    <span style="display: inline-block;">
                                        <a href="{legal_url}" style="color: #d1d5db; text-decoration: none;">Privacy Policy</a>
                                    </span>
                                    <br><br>
                                    <span style="display: block; color: #d1d5db;">
                                        Event ID: {short_id}<br>
                                        © {current_year} DataPulse • Hyderabad, Telangana, India
                                    </span>
                                </p>
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    await _send_brevo_message([to_email], subject, html_content)
    
async def send_farewell_email(email: str, name: str):
    """
    Final Farewell: Hardened Legal Confirmation.
    Includes Zero-Grey seamless mobile fix and mandatory legal footer.
    """
    current_year = datetime.datetime.now().year
    ref_id = uuid.uuid4().hex[:8].upper()
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
    return_url = "https://data-pulse-eight.vercel.app"
    
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    formatted_time = convert_utc_to_ist_str(now_utc)
    
    subject = f"Confirmation: Account Deleted [RefID: #{ref_id}]"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* THE PRO FIX: Syncs backgrounds on mobile to kill grey gaps */
            @media only screen and (max-width: 620px) {{
                body {{ background-color: #ffffff !important; }}
                .main-wrapper {{ padding: 0 !important; background-color: #ffffff !important; }}
                .container {{ width: 100% !important; border-radius: 0 !important; border: none !important; box-shadow: none !important; }}
                .content {{ padding: 32px 24px !important; }}
                .new-footer {{ padding: 32px 24px !important; text-align: left !important; }}
            }}
        </style>
    </head>
    <body style="font-family: -apple-system, system-ui, sans-serif; background-color: #ffffff; color: #1a1a1a; margin: 0; padding: 0;">
        
        <table class="main-wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff; border-collapse: separate;">
                        
                        <tr>
                            <td class="content" style="padding: 48px 48px 0 48px; text-align: left;">
                                <img src="{logo_url}" alt="DataPulse" width="140" style="display: block; width: 140px; height: auto;">
                            </td>
                        </tr>

                        <tr>
                            <td class="content" style="padding: 32px 48px; text-align: left;">
                                <h1 style="font-size: 24px; font-weight: 600; line-height: 1.3; margin: 0 0 16px 0; letter-spacing: -0.02em; color: #111111;">
                                    Account successfully closed.
                                </h1>
                                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                                    Hello {name or 'User'}, we're sorry to see you go. This email confirms that your DataPulse account and all personal information associated with <strong style="color: #111111;">{email}</strong> were permanently purged on <strong>{formatted_time}</strong>.
                                </p>
                                <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 32px 0;">
                                    If you ever need real-time data monitoring again, our doors are always open.
                                </p>

                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #f3f4f6;">
                                    <h2 style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
                                        Erasure Confirmation
                                    </h2>
                                    
                                    <p style="font-size: 13px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.6;">
                                        <strong>Confirmed:</strong> Profile identity, physical address, workspace metadata, encrypted keys, and all retained security logs have been erased from production.
                                    </p>

                                    <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
                                        <p style="font-size: 11px; color: #9ca3af; margin: 0; font-family: ui-monospace, monospace;">
                                            REFERENCE ID: <span style="color: #6b7280;">#{ref_id}</span>
                                        </p>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td class="content" style="padding: 0 48px 48px 48px; text-align: left;">
                                <a href="{return_url}" style="background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
                                    Visit DataPulse Homepage
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td class="new-footer" style="background-color: #fafafa; padding: 48px; border-top: 1px solid #e5e7eb; text-align: left;">
                                <img src="{logo_url}" alt="DataPulse" width="100" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 24px; width: 100px; height: auto;">
                                
                                <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; line-height: 1.6;">
                                    This is a service notification confirming your legal right to be forgotten. 
                                    Need help? <a href="mailto:datapulseapp@gmail.com" style="color: #6b7280; text-decoration: underline;">Contact Privacy Team</a>
                                </p>
                                
                                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                                
                                <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
                                    This email is not a marketing or promotional email. It does not contain an unsubscribe link because it is a mandatory legal confirmation of your account deletion.
                                </p>
                                <p style="font-size: 11px; color: #d1d5db; margin: 0;">
                                    © {current_year} DataPulse • Hyderabad, Telangana, India
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    await _send_brevo_message([email], subject, html_content)
    
    
async def send_feedback_request_email(
    to_email: EmailStr,
    google_form_link: str,
    app_link: str,
) -> bool:
    subject = "Quick feedback on DataPulse (2 minutes)"

    safe_form_link = html.escape(google_form_link, quote=True)
    safe_app_link = html.escape(app_link, quote=True)

    html_content = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hi,</p>

      <p>
        Thanks for trying <b>DataPulse</b>.
        We’re collecting early feedback to understand what’s working and what needs improvement.
      </p>

      <p>
        If you have 2 minutes, please share your thoughts here:
        <br/>
        <a href="{safe_form_link}" target="_blank">{safe_form_link}</a>
      </p>

      <p>
        You can also submit feedback directly inside the app:
        <br/>
        <a href="{safe_app_link}" target="_blank">{safe_app_link}</a>
      </p>

      <p>
        Your feedback directly shapes what we build next.
      </p>

      <p style="margin-top: 18px;">
        Thanks,<br/>
        <b>Subhash</b> (Founder)<br/>
        <b>Siri</b> (Co-founder)
      </p>
    </div>
    """

    return await _send_brevo_message(
        recipients=[to_email],
        subject=subject,
        html_content=html_content,
    )

async def send_incident_alert_email(recipients: List[EmailStr], context: dict) -> bool:
    """
    Sent only for HIGH severity incidents being created or reopened.
    Kept deliberately rare — this is an interruption-worthy alert,
    not a routine update (those stay as in-app notifications + the
    existing data_update email).
    """
    ref_id = uuid.uuid4().hex[:6].upper()
    current_year = datetime.datetime.now().year
    workspace_id = context.get("workspace_id", "")
    workspace_name = html.escape(context.get("workspace_name", "your workspace"))
    issue_description = html.escape(context.get("issue_description", "a data quality issue"))
    column_name = context.get("column_name")
    event_type = context.get("event_type", "created")
    file_name = html.escape(context.get("file_name", "N/A"))
    timestamp_display = context.get("timestamp_str", "N/A")

    row_drop_percent = context.get("row_drop_percent")
    missing_percent = context.get("missing_percent")
    schema_change_size = context.get("schema_change_size")
    affected_columns = context.get("affected_columns") or []

    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
    dashboard_url = (
        f"https://data-pulse-eight.vercel.app/workspace/{workspace_id}/incidents"
        if workspace_id else "https://data-pulse-eight.vercel.app/home"
    )

    is_new = event_type == "created"
    eyebrow_text = "New Incident" if is_new else "Incident Recurred"
    headline = "A high severity issue was detected" if is_new else "A previously resolved issue has returned"
    subject = f"[High Severity] {issue_description.capitalize()} — {workspace_name}"
    preview_text = f"{headline} in {workspace_name}. Review the details inside."

    # ── Primary metric — show ONE clear number, the most relevant one ───────
    metric_label = None
    metric_value = None
    metric_caption = None

    if row_drop_percent is not None:
        metric_label = "Row Count Drop"
        metric_value = f"-{row_drop_percent}%"
        metric_caption = "compared to the previous upload"
    elif missing_percent is not None:
        metric_label = "Missing Values"
        metric_value = f"{missing_percent}%"
        metric_caption = f"in column '{column_name}'" if column_name else "in this column"
    elif schema_change_size is not None:
        metric_label = "Columns Changed"
        metric_value = str(schema_change_size)
        metric_caption = "added or removed since the last upload"

    metric_block_html = ""
    if metric_label:
        metric_block_html = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;">
            <tr>
                <td style="padding: 24px 28px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.06em;">
                        {metric_label}
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 34px; font-weight: 800; color: #7F1D1D; letter-spacing: -0.02em; line-height: 1;">
                        {metric_value}
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #B91C1C;">
                        {metric_caption}
                    </p>
                </td>
            </tr>
        </table>
        """

    affected_columns_html = ""
    if affected_columns and schema_change_size is not None:
        badges = "".join(
            f'<span style="display:inline-block;background-color:#F3F4F6;color:#374151;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;font-family:ui-monospace,monospace;margin:0 6px 6px 0;border:1px solid #E5E7EB;">{html.escape(str(c))}</span>'
            for c in affected_columns[:8]
        )
        more_count = len(affected_columns) - 8
        more_html = f'<span style="font-size:12px;color:#9CA3AF;">+{more_count} more</span>' if more_count > 0 else ""
        affected_columns_html = f"""
        <div style="margin-top: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em;">
                Affected Columns
            </p>
            <div>{badges}{more_html}</div>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {{
                body {{ background-color: #ffffff !important; }}
                .main-wrapper {{ padding: 0 !important; background-color: #ffffff !important; }}
                .container {{ width: 100% !important; max-width: 100% !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; }}
                .inner-padding {{ padding: 28px 24px !important; }}
                .new-footer {{ padding: 32px 24px !important; text-align: left !important; }}
            }}
        </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F5F7; margin: 0; padding: 0;">
        <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{preview_text}</div>

        <table class="main-wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F5F7; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; background-color: #ffffff; border-radius: 10px; border: 1px solid #E5E7EB; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-collapse: separate; overflow: hidden;">

                        <!-- Header -->
                        <tr>
                            <td class="inner-padding" style="padding: 32px 40px 0 40px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td><img src="{logo_url}" height="26" alt="DataPulse" style="display: block; height: 26px; width: auto;"></td>
                                        <td align="right">
                                            <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #B91C1C; text-transform: uppercase; letter-spacing: 0.08em; background-color: #FEF2F2; padding: 5px 10px; border-radius: 100px; border: 1px solid #FECACA;">
                                                {eyebrow_text}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td class="inner-padding" style="padding: 28px 40px 40px 40px; text-align: left;">

                                <h1 style="margin: 0 0 10px 0; font-size: 21px; font-weight: 700; color: #111827; letter-spacing: -0.01em; line-height: 1.35;">
                                    {headline}
                                </h1>
                                <p style="margin: 0; font-size: 15px; color: #4B5563; line-height: 1.6;">
                                    DataPulse flagged <strong style="color: #111827;">{issue_description}</strong> in <strong style="color: #111827;">{workspace_name}</strong>. This is marked high severity and may need your attention.
                                </p>

                                {metric_block_html}

                                <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #F3F4F6; padding-top: 20px; margin-top: 4px;">
                                    <tr>
                                        <td width="50%" valign="top">
                                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em;">Source File</p>
                                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #111827; font-family: ui-monospace, monospace; word-break: break-all;">{file_name}</p>
                                        </td>
                                        <td width="50%" valign="top" align="right">
                                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em;">Detected At</p>
                                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #111827;">{timestamp_display}</p>
                                        </td>
                                    </tr>
                                </table>

                                {affected_columns_html}

                                <div style="margin-top: 36px; text-align: center;">
                                    <a href="{dashboard_url}" style="background-color: #111827; color: #ffffff; padding: 13px 30px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block; letter-spacing: -0.01em;">
                                        Review in DataPulse
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td class="new-footer" style="background-color: #FAFAFA; padding: 44px 40px; border-top: 1px solid #F0F0F0; text-align: left;">
                                <img src="{logo_url}" alt="DataPulse" width="84" style="display: block; filter: grayscale(100%); opacity: 0.4; margin-bottom: 20px; width: 84px; height: auto;">
                                <p style="margin: 0 0 14px 0; font-size: 11px; line-height: 1.6; color: #9CA3AF;">
                                    You're receiving this because high severity incident alerts are active for <span style="color: #6B7280; font-weight: 500;">{workspace_name}</span>.
                                    <br><br>
                                    Need help? Reach us at <a href="mailto:datapulseapp@gmail.com" style="color: #6B7280; text-decoration: none; font-weight: 500;">datapulseapp@gmail.com</a>.
                                </p>
                                <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #D1D5DB;">
                                    <a href="https://data-pulse-eight.vercel.app/legal" style="color: #D1D5DB; text-decoration: none;">Terms of Use</a>
                                    &nbsp;|&nbsp;
                                    <a href="https://data-pulse-eight.vercel.app/legal" style="color: #D1D5DB; text-decoration: none;">Privacy Policy</a>
                                    <br><br>
                                    <span style="display: block; color: #D1D5DB;">Ref: {ref_id}<br>© {current_year} DataPulse • Hyderabad, Telangana, India</span>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    return await _send_brevo_message(recipients, subject, html_content)