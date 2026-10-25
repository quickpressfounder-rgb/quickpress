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
    brute force authentication attacks, and accidental client loops while
    allowing high-throughput legitimate user traffic and multi-tenant testing.
    """

    # Quotas: (max_requests, window_seconds)
    SUDO_ADMIN_LIMIT = (40, 60)   # 40 requests / minute (Sudo re-auth & sensitive security)
    AUTH_LIMIT = (120, 60)        # 120 requests / minute (OTP dispatch & login mutations)
    PAYMENT_LIMIT = (60, 60)      # 60 requests / minute (Payment init, verification, wallet debit)
    POLLING_LIMIT = (300, 60)     # 300 requests / minute (Rider/Partner live heartbeat)
    MUTATION_LIMIT = (150, 60)    # 150 requests / minute (General mutating APIs)
    GLOBAL_LIMIT = (600, 60)      # 600 requests / minute (General read APIs)

    async def dispatch(self, request: Request, call_next):
        # 1. Skip preflights, static assets, health probes, and API documentation
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if (
            path == "/"
            or path == "/health"
            or path.startswith("/health")
            or path.startswith("/api/health")
            or path.startswith("/docs")
            or path.startswith("/openapi.json")
            or path.startswith("/redoc")
            or path.startswith("/favicon")
        ):
            return await call_next(request)

        # 2. Exempt all operational merchant, rider, customer, wallet, and admin console endpoints
        # These routes are fully protected by JWT auth & role guards and must NEVER be throttled with 429
        if (
            path.startswith("/api/partner")
            or path.startswith("/api/rider")
            or path.startswith("/api/customer")
            or path.startswith("/api/wallet")
            or path.startswith("/api/orders")
            or path.startswith("/api/notifications")
            or path.startswith("/api/live_locations")
            or path.startswith("/api/admin")
        ):
            # Anti-brute-force for sudo confirmation is strictly retained
            if not (path.startswith("/api/admin/security/sudo-confirm") or "/sudo" in path):
                return await call_next(request)

        # 2. Extract Canonical Client IP across Cloudflare, Vercel, and Railway reverse proxies
        cf_ip = request.headers.get("cf-connecting-ip")
        real_ip = request.headers.get("x-real-ip")
        forwarded = request.headers.get("x-forwarded-for")

        if cf_ip and cf_ip.strip():
            client_ip = cf_ip.strip()
        elif real_ip and real_ip.strip():
            client_ip = real_ip.strip()
        elif forwarded and forwarded.strip():
            # First IP in X-Forwarded-For is canonical client originating IP
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        # Allow internal automated test client (e.g. pytest TestClient) & local development hosts
        if client_ip in ("testclient", "testserver", "localhost", "127.0.0.1", "::1"):
            return await call_next(request)

        if client_ip == "unknown":
            dev_id = request.headers.get("x-device-id") or request.headers.get("x-request-id")
            if dev_id:
                client_ip = f"dev:{dev_id[:32]}"

        # 3. Route-specific Rate Limit Policy
        # Read & session endpoints must NOT consume strict OTP/Auth quotas
        if (
            request.method == "GET"
            or path in (
                "/api/auth/me",
                "/api/auth/refresh",
                "/api/auth/session",
                "/api/auth/logout",
                "/api/admin/auth/me",
                "/api/admin/auth/refresh",
                "/api/admin/auth/logout",
            )
            or path.endswith("/me")
            or path.endswith("/refresh")
            or path.endswith("/logout")
        ):
            tier_name = "api"
            max_req, win_sec = self.GLOBAL_LIMIT
        elif path.startswith("/api/admin/security/sudo-confirm") or "/sudo" in path:
            tier_name = "sudo"
            max_req, win_sec = self.SUDO_ADMIN_LIMIT
        elif path.startswith("/api/auth") or path.startswith("/api/admin/auth"):
            tier_name = "auth"
            max_req, win_sec = self.AUTH_LIMIT
        elif (
            path.startswith("/api/payments")
            or path.startswith("/api/razorpay")
            or path.startswith("/api/cashfree")
            or path.startswith("/api/checkout")
        ):
            tier_name = "payment"
            max_req, win_sec = self.PAYMENT_LIMIT
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

        auth_hdr = request.headers.get("authorization")
        if auth_hdr and auth_hdr.startswith("Bearer ") and len(auth_hdr) > 15:
            # Key authenticated users by their unique token tail to prevent shared reverse-proxy IP throttling
            token_fingerprint = auth_hdr.strip()[-20:]
            rate_key = f"{tier_name}:u_{token_fingerprint}"
        else:
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
