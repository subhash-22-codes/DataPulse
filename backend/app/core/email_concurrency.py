import threading

# Shared across the whole app — caps total concurrent email-sending
# threads regardless of which feature triggered them (data updates,
# incident alerts, etc.), so nothing accidentally floods email volume.
EMAIL_SEM = threading.BoundedSemaphore(3)