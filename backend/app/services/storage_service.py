import os
from typing import Optional

from supabase import create_client


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "uploads")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def upload_csv_bytes(storage_path: str, content_bytes: bytes) -> str:
    supabase.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
        path=storage_path,
        file=content_bytes,
        file_options={
            "content-type": "text/csv",
            "upsert": "true",
        },
    )
    return storage_path


def download_file_bytes(storage_path: str) -> bytes:
    res = supabase.storage.from_(SUPABASE_STORAGE_BUCKET).download(storage_path)
    return res


def create_signed_download_url(storage_path: str, expires_in_seconds: int = 600) -> str:
    res = supabase.storage.from_(SUPABASE_STORAGE_BUCKET).create_signed_url(
        storage_path, expires_in_seconds
    )
    return res.get("signedURL")
  
def delete_files(paths: list[str]) -> None:
    if not paths:
        return
    supabase.storage.from_(SUPABASE_STORAGE_BUCKET).remove(paths)


def delete_file(storage_path: str) -> None:
    delete_files([storage_path])

