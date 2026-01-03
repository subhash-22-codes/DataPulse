import httpx
import os
import logging

logger = logging.getLogger(__name__)

_client = httpx.AsyncClient(timeout=10.0) 

async def send_telegram_alert(message: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    admin_id = os.getenv("TELEGRAM_ADMIN_ID")
    
    if not token or not admin_id:
        logger.warning("🛡️ Telegram Guard: Credentials missing. Alert skipped.")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    payload = {
        "chat_id": admin_id,
        "text": f"🛡️ DataPulse Guard\n{message}"
    }
    
    try:
        response = await _client.post(url, json=payload)
        
        if response.status_code != 200:
            logger.error(
                "🛡️ Telegram Guard Error | status=%s | body=%s",
                response.status_code,
                response.text
            )
    except Exception as e:
        logger.error("🛡️ Telegram Guard Connection Failed | error=%s", repr(e))