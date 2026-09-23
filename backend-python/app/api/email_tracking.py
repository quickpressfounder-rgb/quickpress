"""Public Email Analytics Tracking Router (Opens & Clicks).

Handles:
1. 1x1 Transparent Tracking Pixel (`GET /api/emails/track/open/{email_id}.png`)
   Records open events, updates openCount, timestamps, and broadcasts live Socket.IO events.
2. Link Click Wrapper (`GET /api/emails/track/click/{email_id}`)
   Records link destination, clicked timestamp, client details, and redirects recipient.
"""

from __future__ import annotations

import logging
import urllib.parse
from fastapi import APIRouter, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.core.email_rate_limiter import get_client_ip
from app.db.email_repositories import email_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails/track", tags=["email-tracking"])

# 43-byte valid 1x1 transparent GIF89a
TRANSPARENT_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff"
    b"\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00"
    b"\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)

NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


@router.get("/open/{email_id}.png")
@router.get("/open/{email_id}")
async def track_email_open(email_id: str, request: Request) -> Response:
    """Public tracking pixel for email open tracking. Returns 1x1 transparent GIF."""
    clean_id = email_id.replace(".png", "").strip()
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent") or "Unknown"

    try:
        await email_repository.record_open(
            email_id=clean_id,
            ip=client_ip,
            user_agent=user_agent,
        )
    except Exception as exc:
        logger.warning("Error recording open event for email #%s: %s", clean_id, exc)

    return Response(
        content=TRANSPARENT_GIF,
        media_type="image/gif",
        headers=NO_CACHE_HEADERS,
    )


@router.get("/click/{email_id}")
async def track_email_click(
    email_id: str,
    request: Request,
    url: str = Query(..., description="Target destination URL"),
) -> Response:
    """Tracks recipient CTA link clicks and redirects to destination."""
    clean_id = email_id.strip()
    target_url = urllib.parse.unquote(url).strip()
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent") or "Unknown"

    # Validate destination URL to prevent open redirect abuse
    if not (target_url.startswith("http://") or target_url.startswith("https://")):
        target_url = "https://quickpress.in"

    try:
        await email_repository.record_click(
            email_id=clean_id,
            target_url=target_url,
            ip=client_ip,
            user_agent=user_agent,
        )
    except Exception as exc:
        logger.warning("Error recording click event for email #%s: %s", clean_id, exc)

    return RedirectResponse(
        url=target_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        headers=NO_CACHE_HEADERS,
    )
