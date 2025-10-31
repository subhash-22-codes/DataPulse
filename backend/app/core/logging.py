import logging
import sys

def setup_logging():
    """
    Configures a professional, consistent logging format for the entire application.
    """
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO) # Set the minimum level of messages to show

    # Create a handler to print logs to the console (stdout)
    handler = logging.StreamHandler(sys.stdout)
    
    # Create a formatter that defines the log message's structure
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(name)s] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    handler.setFormatter(formatter)
    
    # Add the handler to the root logger
    if not root_logger.handlers:
        root_logger.addHandler(handler)

    print("✅ Professional logging configured.")
