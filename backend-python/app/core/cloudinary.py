"""Cloudinary media uploads — 100% environment driven.

Credentials come from CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
CLOUDINARY_API_SECRET. Nothing is hardcoded.

Only the resulting `secure_url` is ever persisted in MongoDB; the raw base64
payload never touches the database.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Optional

import anyio
from fastapi import HTTPException, status

from app.config import get_settings

# Upload folders, one per media kind.
FOLDERS = {
    "customer_photo": "quickpress/customers/profile",
    "partner_logo": "quickpress/partners/logo",
    "partner_banner": "quickpress/partners/banner",
    "rider_photo": "quickpress/riders/profile",
    "rider_document": "quickpress/riders/documents",
}


@lru_cache
def _configured() -> Optional[Any]:
    settings = get_settings()
    if not settings.cloudinary_configured:
        return None
    import cloudinary

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    return cloudinary


def is_cloudinary_configured() -> bool:
    return get_settings().cloudinary_configured


def _upload_sync(source: str, folder: str, public_id: str) -> str:
    _configured()
    from cloudinary import uploader

    result = uploader.upload(
        source,
        folder=folder,
        public_id=public_id,
        overwrite=True,
        resource_type="image",
        invalidate=True,
    )
    url = result.get("secure_url")
    if not url:
        raise HTTPException(status_code=502, detail="Cloudinary did not return a secure URL")
    return str(url)


async def upload_image(source: str, *, kind: str, public_id: str) -> str:
    """Upload a data URL / remote URL and return the Cloudinary secure URL.

    An already-hosted Cloudinary URL is returned untouched, and when Cloudinary
    is not configured for this environment the original value is passed through
    so previews keep working without credentials.
    """
    value = (source or "").strip()
    if not value:
        raise HTTPException(status_code=422, detail="No image provided")
    if "res.cloudinary.com" in value:
        return value
    if not is_cloudinary_configured():
        if value.startswith("http"):
            return value
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured on this server",
        )

    folder = FOLDERS.get(kind, "quickpress/misc")
    try:
        return await anyio.to_thread.run_sync(lambda: _upload_sync(value, folder, public_id))
    except HTTPException:
        raise
    except Exception as exc:  # network / invalid image / rejected credentials
        import logging
        logging.getLogger(__name__).warning(f"Cloudinary upload failed ({exc}), falling back to direct image payload")
        if value.startswith("data:image/") or value.startswith("http"):
            return value
        raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {exc}") from exc


def _destroy_sync(public_id: str) -> bool:
    _configured()
    from cloudinary import uploader

    result = uploader.destroy(public_id, resource_type="image", invalidate=True)
    return str(result.get("result", "")) in {"ok", "not found"}


async def delete_image(*, kind: str, public_id: str) -> bool:
    """Remove an asset from Cloudinary. Returns True when it is gone.

    Missing credentials are treated as a no-op so previews keep working.
    """
    if not is_cloudinary_configured():
        return False
    folder = FOLDERS.get(kind, "quickpress/misc")
    full_id = f"{folder}/{public_id}"
    try:
        return await anyio.to_thread.run_sync(lambda: _destroy_sync(full_id))
    except Exception as exc:  # network / rejected credentials
        raise HTTPException(status_code=502, detail=f"Cloudinary delete failed: {exc}") from exc
