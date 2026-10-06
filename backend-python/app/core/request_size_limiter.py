"""Request Size Limiter Middleware for QuickPress Platform.

Protects FastAPI against Payload Bomb / Denial of Service attacks:
- Standard JSON API payloads: Max 2 MB (2,097,152 bytes)
- Media / File Uploads (/api/uploads, damage photos): Max 10 MB (10,485,760 bytes)
"""

from __future__ import annotations

import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_413_REQUEST_ENTITY_TOO_LARGE

logger = logging.getLogger("quickpress.security.size_limiter")

MAX_JSON_PAYLOAD_BYTES = 2 * 1024 * 1024       # 2 MB
MAX_UPLOAD_PAYLOAD_BYTES = 10 * 1024 * 1024    # 10 MB

UPLOAD_PATH_PREFIXES = (
    "/api/uploads",
    "/api/partner/damage-photos",
    "/api/rider/profile-photo",
    "/api/photos",
)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Enforces strict payload body size limits before buffering into memory."""

    async def dispatch(self, request: Request, call_next):
        # Only inspect mutating requests that carry bodies
        if request.method in ("POST", "PUT", "PATCH"):
            path = request.url.path
            is_upload = any(path.startswith(prefix) for prefix in UPLOAD_PATH_PREFIXES)
            max_allowed = MAX_UPLOAD_PAYLOAD_BYTES if is_upload else MAX_JSON_PAYLOAD_BYTES

            content_length_header = request.headers.get("content-length")
            if content_length_header:
                try:
                    content_length = int(content_length_header)
                    if content_length > max_allowed:
                        logger.warning(
                            "Payload size %d bytes exceeded limit %d bytes on %s %s from %s",
                            content_length,
                            max_allowed,
                            request.method,
                            path,
                            request.client.host if request.client else "unknown",
                        )
                        limit_mb = max_allowed // (1024 * 1024)
                        return JSONResponse(
                            status_code=HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            content={
                                "detail": f"Payload too large. Maximum allowed size is {limit_mb}MB.",
                                "maxAllowedBytes": max_allowed,
                                "receivedBytes": content_length,
                            },
                        )
                except ValueError:
                    pass

        return await call_next(request)
