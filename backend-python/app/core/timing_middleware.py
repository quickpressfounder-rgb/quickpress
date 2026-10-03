"""High-precision Server-Timing and Latency APM Middleware for QuickPress.

Injects:
- Server-Timing: total;dur=4.20
- X-Response-Time: 4.20ms

Allows frontend developers, Chrome DevTools, and performance monitoring probes
to track exact microsecond and millisecond backend execution times.
"""

from __future__ import annotations

import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class ServerTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        # Inject Server-Timing header (Standard W3C Server Timing API)
        response.headers["Server-Timing"] = f"total;dur={duration_ms:.2f}"
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        return response
