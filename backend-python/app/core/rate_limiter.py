"""In-Memory Sliding Window Rate Limiting and Anti-Brute Force Engine for QuickPress API."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    def __init__(self):
        # key -> list of timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)
        # phone / ip -> lockout expiry timestamp
        self._lockouts: Dict[str, float] = {}
        # phone -> failed verification attempt timestamps
        self._failed_attempts: Dict[str, List[float]] = defaultdict(list)

    def is_locked(self, key: str) -> Tuple[bool, int]:
        """Return True and remaining seconds if key is locked out."""
        now = time.time()
        expiry = self._lockouts.get(key, 0)
        if expiry > now:
            return True, int(expiry - now)
        elif key in self._lockouts:
            del self._lockouts[key]
        return False, 0

    def check_limit(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """Return True if under limit, False if rate limit exceeded."""
        now = time.time()
        cutoff = now - window_seconds
        timestamps = [ts for ts in self._requests[key] if ts > cutoff]
        if len(timestamps) >= max_requests:
            self._requests[key] = timestamps
            return False
        timestamps.append(now)
        self._requests[key] = timestamps
        return True

    def record_failed_attempt(self, key: str, max_failures: int = 5, lock_duration: int = 900) -> Tuple[int, Optional[int]]:
        """Record a failed auth attempt. Returns (current_failures, lock_seconds_if_locked)."""
        now = time.time()
        cutoff = now - 600  # 10 min window
        attempts = [ts for ts in self._failed_attempts[key] if ts > cutoff]
        attempts.append(now)
        self._failed_attempts[key] = attempts
        if len(attempts) >= max_failures:
            self._lockouts[key] = now + lock_duration
            self._failed_attempts[key] = []
            return len(attempts), lock_duration
        return len(attempts), None

    def reset_failed_attempts(self, key: str) -> None:
        if key in self._failed_attempts:
            del self._failed_attempts[key]
        if key in self._lockouts:
            del self._lockouts[key]


rate_limiter = SlidingWindowRateLimiter()


class GlobalRateLimiterMiddleware(BaseHTTPMiddleware):
    """Protects all API endpoints from abusive traffic / DDoS."""

    async def dispatch(self, request: Request, call_next):
        # Skip health check & static assets
        path = request.url.path
        if path.startswith("/api/health") or path.startswith("/docs") or path.startswith("/openapi.json"):
            return await call_next(request)

        # Get client IP
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

        if client_ip in ("testclient", "testserver"):
            return await call_next(request)

        # Global per-IP rate limit: 180 requests per minute backed by Upstash Redis
        from app.core.redis_limiter import distributed_limiter
        if not await distributed_limiter.check_limit(f"ip:{client_ip}", max_requests=180, window_seconds=60):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please slow down and try again."},
            )

        return await call_next(request)
