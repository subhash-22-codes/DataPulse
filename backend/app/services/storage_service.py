import os
from typing import Optional
import logging
from supabase import create_client

logger = logging.getLogger(__name__)
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
def create_signed_upload_url(storage_path: str) -> dict:
    try:
        res = supabase.storage.from_(SUPABASE_STORAGE_BUCKET).create_signed_upload_url(
            storage_path
            # add expires_in=60 if supported
        )

        if not res:
            logger.error("[SIGNED_URL] Empty response from Supabase")
            raise RuntimeError("Empty response from Supabase")

        upload_url = (
            res.get("signedURL") or
            res.get("signedUrl") or
            res.get("signed_url")
        )

        if not upload_url:
            logger.error(f"[SIGNED_URL] Invalid response | res={res}")
            raise RuntimeError(f"Invalid Supabase response: {res}")

        logger.info(f"[SIGNED_URL] Generated | path={storage_path}")

        return {
            "signedURL": upload_url
        }

    except Exception as e:
        logger.error(f"[SIGNED_URL] Failed | path={storage_path} | error={str(e)}", exc_info=True)
        raise
    
def delete_files(paths: list[str]) -> None:
    if not paths:
        return
    supabase.storage.from_(SUPABASE_STORAGE_BUCKET).remove(paths)


def delete_file(storage_path: str) -> None:
    delete_files([storage_path])

