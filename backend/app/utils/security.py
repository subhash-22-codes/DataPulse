import hashlib
from fastapi import Request

def hash_ua(request: Request) -> str:
    ua = request.headers.get("user-agent", "unknown")
    return hashlib.sha256(ua.encode("utf-8")).hexdigest()
