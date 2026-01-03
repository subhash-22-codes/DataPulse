import logging
import sys

def setup_logging():

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO) 

    # A handler to print logs to the console (stdout)
    handler = logging.StreamHandler(sys.stdout)
    
    # A formatter that defines the log message's structure
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(name)s] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    handler.setFormatter(formatter)
    
    # The handler to the root logger
    if not root_logger.handlers:
        root_logger.addHandler(handler)
        
    logging.getLogger("httpx").setLevel(logging.WARNING)

    print("✅ Professional logging configured.")
