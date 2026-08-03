import hashlib
from fastapi import Request

def hash_ua(request: Request) -> str:
    ua = request.headers.get("user-agent", "unknown")
    lang = request.headers.get("accept-language", "unknown")
    fingerprint = f"{ua}|{lang}"
    return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()