import os
import logging
import pytz
import datetime
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
    
    # Ensure the API client is properly closed on shutdown
    atexit.register(lambda: api_client.close() if api_client else None)
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

async def send_otp_email(to_email: str, otp: str, subject_type="verification")-> None:
    """Sends the OTP/Password Reset email."""
    now_utc = datetime.datetime.utcnow()
    timestamp_ist = convert_utc_to_ist_str(now_utc)
    
    # --- Subject and Message Logic (Copied from your original file) ---
    if subject_type == "password_reset":
        subject = f"Your DataPulse Password Reset Code - {timestamp_ist}"
        greeting = "Password Reset Request"
        message = "You requested to reset your password. Use the secure code below:"
        note = "If you did not request this, you can safely ignore this email."
    else:
        subject = f"Your DataPulse Verification Code - {timestamp_ist}"
        greeting = "Welcome to DataPulse!"
        message = "Here is your verification code to get started:"
        note = "If you did not request this verification, please ignore this email."
    
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png"
    
    # --- PASTE YOUR OTP/VERIFICATION HTML TEMPLATE HERE ---
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>{subject}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                margin: 0;
                padding: 40px 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
            }}
            .email-wrapper {{
                max-width: 600px;
                margin: 0 auto;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 30px rgba(0, 0, 0, 0.08);
            }}
            .logo-img {{
                max-width: 180px;
                height: auto;
                display: block;
                margin: 0 auto 12px auto;
            }}
            .content {{
                padding: 48px 40px;
            }}
            .greeting {{
                font-size: 24px;
                font-weight: 600;
                color: #1a202c;
                margin: 0 0 16px 0;
                letter-spacing: -0.3px;
            }}
            .message {{
                font-size: 16px;
                color: #4a5568;
                line-height: 1.7;
                margin: 0 0 32px 0;
            }}
            .otp-container {{
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 32px 24px;
                margin: 32px 0;
                text-align: center;
                position: relative;
            }}
            .otp-label {{
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #64748b;
                font-weight: 600;
                margin-bottom: 12px;
            }}
            .otp-code {{
                font-size: 42px;
                font-weight: 700;
                letter-spacing: 8px;
                color: #2563eb;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', Courier, monospace;
                margin: 8px 0;
                text-shadow: 0 1px 2px rgba(37, 99, 235, 0.1);
            }}
            .expiry-text {{
                font-size: 14px;
                color: #64748b;
                margin: 24px 0 0 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }}
            .expiry-icon {{
                width: 16px;
                height: 16px;
                display: inline-block;
            }}
            .note {{
                font-size: 13px;
                color: #718096;
                margin: 32px 0 0 0;
                padding: 16px;
                background-color: #f7fafc;
                border-left: 3px solid #cbd5e0;
                border-radius: 4px;
                line-height: 1.6;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 32px 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            .footer-text {{
                font-size: 13px;
                color: #94a3b8;
                margin: 0;
            }}
            .footer-links {{
                margin-top: 12px;
            }}
            .footer-link {{
                color: #2563eb;
                text-decoration: none;
                font-size: 12px;
                margin: 0 8px;
            }}
            .footer-link:hover {{
                text-decoration: underline;
            }}
            @media only screen and (max-width: 600px) {{
                body {{
                    padding: 20px 10px;
                }}
                .header {{
                    padding: 32px 24px 28px 24px;
                }}
                .logo-img {{
                    max-width: 150px;
                }}
                .content {{
                    padding: 32px 24px;
                }}
                .greeting {{
                    font-size: 20px;
                }}
                .message {{
                    font-size: 15px;
                }}
                .otp-code {{
                    font-size: 36px;
                    letter-spacing: 6px;
                }}
                .footer {{
                    padding: 24px 20px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="container">
                    <img src="{logo_url}" alt="DataPulse Logo" class="logo-img">
                <div class="content">
                    <h2 class="greeting">{greeting}</h2>
                    <p class="message">{message}</p>

                    <div class="otp-container">
                        <div class="otp-label">Your Verification Code</div>
                        <div class="otp-code">{otp}</div>
                        <p class="expiry-text">
                            <svg class="expiry-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            This code will expire in 5 minutes
                        </p>
                    </div>

                    <div class="note">{note}</div>
                </div>
                <div class="footer">
                    <p class="footer-text">&copy; {datetime.datetime.now().year} DataPulse. All rights reserved.</p>
                    <div class="footer-links">
                        <a href="#" class="footer-link">Privacy Policy</a>
                        <span style="color: #cbd5e0;">•</span>
                        <a href="#" class="footer-link">Terms of Service</a>
                        <span style="color: #cbd5e0;">•</span>
                        <a href="#" class="footer-link">Contact Support</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    # Call the core Brevo sender
    await _send_brevo_message([to_email], subject, html_content)


# --- Public Email Functions (Alerts/Notifications) ---

async def send_detailed_alert_email(recipients: List[EmailStr], context: dict)-> None:
    """Sends the detailed alert email for schema/metric changes."""
    workspace_name = context.get("workspace_name", "your workspace")
    upload_time = context.get("upload_time_str", "now")
    upload_type = context.get("upload_type", "data")
    schema_changes = context.get("schema_changes", {})
    metric_changes = context.get("metric_changes", {})
    owner_info = context.get("owner_info", {})
    team_info = context.get("team_info", [])
    ai_insight = context.get("ai_insight")
    source_title = "Manual Upload" if upload_type == 'manual' else "Automated API Poll"
    timestamp_ist = convert_utc_to_ist_str(datetime.datetime.utcnow())
    subject = f"🚨 DataPulse Alert: Structural Change in {workspace_name} at {timestamp_ist}"
    
    # --- PASTE YOUR DETAILED ALERT HTML TEMPLATE HERE ---
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #1f2937;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
          }}
          .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }}
          .header {{
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            padding: 32px 24px;
            text-align: center;
          }}
          .header h1 {{
            margin: 0;
            color: #ffffff;
            font-size: 26px;
            font-weight: 600;
            letter-spacing: -0.3px;
          }}
          .header .icon {{
            font-size: 40px;
            margin-bottom: 12px;
            display: block;
          }}
          .content {{
            padding: 32px 24px;
          }}
          .intro {{
            font-size: 15px;
            color: #374151;
            margin-bottom: 24px;
            line-height: 1.6;
          }}
          .card {{
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 20px;
          }}
          .card h3 {{
            margin: 0 0 14px 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
          }}
          .card p {{
            margin: 8px 0;
            color: #4b5563;
            font-size: 14px;
          }}
          .card strong {{
            color: #1f2937;
            font-weight: 600;
          }}
          .ai-insight {{
            background-color: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            margin: 20px 0;
            overflow: hidden;
          }}
          .ai-insight-header {{
            padding: 14px 18px;
            background-color: #f3f4f6;
            cursor: pointer;
            border-bottom: 1px solid #d1d5db;
          }}
          .ai-insight-header h4 {{
            margin: 0;
            color: #374151;
            font-size: 14px;
            font-weight: 600;
          }}
          .ai-insight-body {{
            padding: 18px;
            background-color: #fafafa;
          }}
          .ai-insight-body p {{
            margin: 0 0 10px 0;
            color: #374151;
            line-height: 1.6;
            font-size: 14px;
          }}
          .ai-insight-body ul {{
            margin: 8px 0;
            padding-left: 20px;
            color: #4b5563;
          }}
          .ai-insight-body li {{
            margin: 5px 0;
          }}
          .ai-insight-body strong {{
            color: #1f2937;
            font-weight: 600;
          }}
          .ai-insight-body code {{
            background-color: #f3f4f6;
            color: #1f2937;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
          }}
          .schema-changes {{
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 20px;
          }}
          .schema-changes h3 {{
            margin: 0 0 14px 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
          }}
          .change-item {{
            padding: 10px 14px;
            border-radius: 6px;
            margin: 8px 0;
            font-size: 14px;
          }}
          .added {{
            color: #065f46;
            background-color: #f0fdf4;
            border-left: 3px solid #10b981;
          }}
          .removed {{
            color: #991b1b;
            background-color: #fef2f2;
            border-left: 3px solid #ef4444;
          }}
          .metrics {{
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 20px;
          }}
          .metrics h3 {{
            margin: 0 0 14px 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
          }}
          .metrics p {{
            margin: 0;
            color: #4b5563;
            font-size: 14px;
          }}
          .team {{
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 20px;
          }}
          .team h3 {{
            margin: 0 0 14px 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
          }}
          .team ul {{
            list-style: none;
            padding: 0;
            margin: 0;
          }}
          .team li {{
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
            color: #4b5563;
            font-size: 14px;
          }}
          .team li:last-child {{
            border-bottom: none;
          }}
          .footer {{
            background-color: #f9fafb;
            padding: 20px 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }}
          .footer p {{
            margin: 0;
            color: #6b7280;
            font-size: 13px;
          }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DataPulse Alert</h1>
          </div>
          
          <div class="content">
            <p class="intro">
              A significant change was detected from a <strong>{source_title}</strong> in your workspace '<strong>{workspace_name}</strong>'.
            </p>
            
            <div class="card">
              <h3>📁 Event Details</h3>
              <p><strong>New File Uploaded:</strong> {context.get("new_file_name", "N/A")}</p>
              <p><strong>Upload Time:</strong> {upload_time}</p>
              <p><strong>Compared Against:</strong> {context.get("old_file_name", "N/A")}</p>
            </div>
            
            {f'''
            <details class="ai-insight">
              <summary class="ai-insight-header">
                <h4>💡 AI Analyst Bot Insight</h4>
              </summary>
              <div class="ai-insight-body">
                {ai_insight}
              </div>
            </details>
            ''' if ai_insight else ''}
            
            {f'''
            <div class="schema-changes">
              <h3>🔄 Schema Changes</h3>
              {f'<div class="change-item added"><strong>Columns Added:</strong> {", ".join(schema_changes.get("added", []))}</div>' if schema_changes.get("added") else ''}
              {f'<div class="change-item removed"><strong>Columns Removed:</strong> {", ".join(schema_changes.get("removed", []))}</div>' if schema_changes.get("removed") else ''}
            </div>
            ''' if schema_changes else ''}
            
            {f'''
            <div class="metrics">
              <h3>📈 Data Metrics</h3>
              <p><strong>Row Count:</strong> Changed from <strong>{metric_changes.get("old_rows")}</strong> to <strong>{metric_changes.get("new_rows")}</strong> <strong>({metric_changes.get("percent_change")})</strong></p>
            </div>
            ''' if metric_changes else ''}
            
            <div class="team">
              <h3>👥 Workspace Team</h3>
              <ul>{format_team_list(owner_info, team_info)}</ul>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated alert from DataPulse. Please review the changes in your workspace.</p>
            <p style="margin-top: 8px; font-size: 12px;">© 2025 DataPulse. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    """
    
    # Call the core Brevo sender
    await _send_brevo_message(recipients, subject, html_content)


async def send_threshold_alert_email(recipients: List[EmailStr], context: dict)-> None:
    """Sends the threshold alert email."""
    workspace_name = context.get("workspace_name", "your workspace")
    rule = context.get("rule", {})
    timestamp_ist = convert_utc_to_ist_str(datetime.datetime.utcnow())
    subject = f"🔥 DataPulse Smart Alert: '{rule.get('column_name')}' triggered in {workspace_name} at {timestamp_ist}"
    
    # --- PASTE YOUR THRESHOLD ALERT HTML TEMPLATE HERE ---
    html_content = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; line-height: 1.5;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9;">
          <h2 style="color: #ff9800; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">DataPulse Smart Alert</h2>
          <p>Your rule for the workspace '<strong>{workspace_name}</strong>' has been triggered by a new data upload.</p>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; border: 1px solid #ffe0b2; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333;">Rule Details</h3>
            <p><strong>Metric:</strong> {rule.get('metric', 'N/A')} of {rule.get('column_name', 'N/A')}</p>
            <p><strong>Condition:</strong> is {rule.get('condition', 'N/A').replace('_', ' ')} {rule.get('value', 'N/A')}</p>
            <p style="font-weight: bold;"><strong>Actual Value Found:</strong> {context.get('actual_value', 'N/A'):.2f}</p>
          </div>

          <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333;">Event Details</h3>
            <p><strong>File Name:</strong> {context.get("file_name", "N/A")}</p>
            <p><strong>Upload Time:</strong> {context.get("upload_time", "N/A")}</p>
          </div>
          
          <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">
            Please review the latest upload in your DataPulse dashboard.
          </p>
        </div>
      </body>
    </html>
    """
    
    # Call the core Brevo sender
    await _send_brevo_message(recipients, subject, html_content)