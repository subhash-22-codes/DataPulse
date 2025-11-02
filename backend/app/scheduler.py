import time
import importlib
import logging
import os
import sys

# --- Professional Logging Setup ---
# This ensures its logs look the same as your main app
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("DataPulseScheduler")

def main():
    """
    This is our "Poor Man's Cron." It's a simple, infinite loop
    that acts as our 100% free alarm clock, replacing the 'beat' service.
    """
    logger.info("⏰ [SCHEDULER] Starting the self-waking alarm clock...")
    
    # We must wait for the main app and Celery worker to be ready.
    # This is a safe delay to prevent it from running before the app is live.
    start_delay = int(os.getenv("SCHEDULER_DELAY", "20"))
    logger.info(f"-> Waiting {start_delay} seconds for services to boot...")
    time.sleep(start_delay)
    
    try:
        # We dynamically import the task *inside* the function.
        # This is a professional trick to make sure Celery is fully loaded.
        m = importlib.import_module("app.services.celery_worker")
        schedule_data_fetches = getattr(m, "schedule_data_fetches")
        
        logger.info("✅ [SCHEDULER] Found the 'schedule_data_fetches' job. Starting the 60-second loop...")
        
        while True:
            try:
                logger.info("🔔 [SCHEDULER] Ringing the bell! Sending job to Celery...")
                # This sends the "ticket" to your Celery worker ("the chef")
                schedule_data_fetches.delay()
            except Exception as e:
                logger.error(f"❌ [SCHEDULER] Error sending job to Celery: {e}", exc_info=True)
            
            # Wait 60 seconds before ringing the bell again
            time.sleep(60)
            
    except Exception as e:
        logger.error(f"💥 [SCHEDULER] A fatal error occurred: {e}", exc_info=True)
        # Wait a bit before retrying to prevent a fast crash loop
        time.sleep(60)

if __name__ == "__main__":
    main()

