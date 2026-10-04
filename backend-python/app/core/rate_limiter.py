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
        self._last_cleanup: float = time.time()

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
        allowed, _, _ = self.check_limit_with_info(key, max_requests, window_seconds)
        return allowed

    def check_limit_with_info(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        """Atomic sliding window check. Returns (is_allowed, remaining_requests, reset_seconds)."""
        now = time.time()
        cutoff = now - window_seconds
        timestamps = [ts for ts in self._requests[key] if ts > cutoff]

        # Housekeeping: prune old keys every 120 seconds
        if now - self._last_cleanup > 120.0:
            self._cleanup_stale(now)

        if len(timestamps) >= max_requests:
            self._requests[key] = timestamps
            oldest = timestamps[0]
            reset_sec = max(1, int(oldest + window_seconds - now))
            return False, 0, reset_sec

        timestamps.append(now)
        self._requests[key] = timestamps
        remaining = max(0, max_requests - len(timestamps))
        reset_sec = max(1, int(cutoff + window_seconds - now)) if timestamps else window_seconds
        return True, remaining, reset_sec

    def _cleanup_stale(self, now: float) -> None:
        self._last_cleanup = now
        stale_cutoff = now - 300.0
        stale_keys = [k for k, v in self._requests.items() if not v or v[-1] < stale_cutoff]
        for k in stale_keys:
            del self._requests[k]
        stale_lockouts = [k for k, exp in self._lockouts.items() if exp <= now]
        for k in stale_lockouts:
            del self._lockouts[k]

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
    """Sub-microsecond Sliding-Window Rate Limiter & Anti-Abuse Shield.
    
    Protects both server CPU and Supabase database from excessive polling,
    brute force authentication attacks, and accidental client loops.
    """

    # Quotas: (max_requests, window_seconds)
    AUTH_LIMIT = (12, 60)       # 12 requests / minute (OTP & Login)
    POLLING_LIMIT = (80, 60)    # 80 requests / minute (Rider/Partner live heartbeat)
    MUTATION_LIMIT = (40, 60)   # 40 requests / minute (Orders & Checkout)
    GLOBAL_LIMIT = (150, 60)    # 150 requests / minute (General APIs)

    async def dispatch(self, request: Request, call_next):
        # 1. Skip static assets, health probes, and API documentation
        path = request.url.path
        if (
            path.startswith("/api/health")
            or path.startswith("/docs")
            or path.startswith("/openapi.json")
            or path.startswith("/redoc")
            or path.startswith("/favicon")
        ):
            return await call_next(request)

        # 2. Extract Client IP
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

        # Allow internal automated test client (e.g. pytest TestClient)
        if client_ip in ("testclient", "testserver"):
            return await call_next(request)

        # 3. Route-specific Rate Limit Policy
        if path.startswith("/api/auth"):
            tier_name = "auth"
            max_req, win_sec = self.AUTH_LIMIT
        elif (
            path.startswith("/api/rider/offers")
            or path.startswith("/api/partner/orders")
            or path.startswith("/api/notifications")
            or path.startswith("/api/live_locations")
        ):
            tier_name = "poll"
            max_req, win_sec = self.POLLING_LIMIT
        elif request.method in ("POST", "PUT", "PATCH", "DELETE"):
            tier_name = "mut"
            max_req, win_sec = self.MUTATION_LIMIT
        else:
            tier_name = "api"
            max_req, win_sec = self.GLOBAL_LIMIT

        rate_key = f"{tier_name}:{client_ip}"
        allowed, remaining, reset_sec = rate_limiter.check_limit_with_info(rate_key, max_req, win_sec)

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down and try again.",
                    "retry_after": reset_sec,
                    "tier": tier_name,
                },
                headers={
                    "Retry-After": str(reset_sec),
                    "X-RateLimit-Limit": str(max_req),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_sec),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_req)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_sec)
        return response
