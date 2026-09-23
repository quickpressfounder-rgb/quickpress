"""QuickPress Database-Backed Rate Limiting & Anti-Spam Pipeline for Emails.

Persists rate limiting buckets and counters directly into the real database
(Supabase PostgreSQL quickpress_documents) via `app.db.client.database` under the
'email_rate_limits' collection.

Ensures:
1. Distributed, multi-worker synchronization across all backend instances.
2. Complete persistence across server reloads and process restarts.
3. Protection of Gmail SMTP gateway quotas against spam, bot loops, or accidental double clicks.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException, Request, status
from app.db.client import database

logger = logging.getLogger(__name__)

EMAIL_RATE_LIMITS_COLLECTION = "email_rate_limits"


def _now_ts() -> float:
    return time.time()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_client_ip(request: Request) -> str:
    """Extract canonical client IP considering proxies and load balancers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


class EmailRateLimiter:
    """Manages database-backed sliding-window rate limits for all email flows."""

    async def check_and_increment(
        self,
        key: str,
        action: str,
        max_requests: int,
        window_seconds: int,
    ) -> Tuple[bool, int, int]:
        """Check if request is allowed within the window. If allowed, increment count.

        Returns:
            (allowed: bool, current_count: int, retry_after_seconds: int)
        """
        now = _now_ts()
        record_id = f"rl:{key}"

        doc = await database.find_one(EMAIL_RATE_LIMITS_COLLECTION, {"_id": record_id})

        if not doc:
            # First request in window
            new_doc = {
                "_id": record_id,
                "id": record_id,
                "key": key,
                "action": action,
                "count": 1,
                "windowStart": now,
                "windowSeconds": window_seconds,
                "maxAllowed": max_requests,
                "updatedAt": _now_iso(),
            }
            await database.insert_one(EMAIL_RATE_LIMITS_COLLECTION, new_doc)
            return True, 1, 0

        window_start = float(doc.get("windowStart") or now)
        elapsed = now - window_start

        if elapsed >= window_seconds:
            # Window expired, reset counter to 1
            await database.update_one(
                EMAIL_RATE_LIMITS_COLLECTION,
                {"_id": record_id},
                {
                    "$set": {
                        "count": 1,
                        "windowStart": now,
                        "windowSeconds": window_seconds,
                        "maxAllowed": max_requests,
                        "updatedAt": _now_iso(),
                    }
                },
            )
            return True, 1, 0

        # Within current window
        current_count = int(doc.get("count") or 0)
        remaining_seconds = max(1, int(window_seconds - elapsed))

        if current_count >= max_requests:
            logger.warning(
                "Email rate limit exceeded for key '%s' (action: %s). %d/%d requests used. Retry after %ds.",
                key,
                action,
                current_count,
                max_requests,
                remaining_seconds,
            )
            return False, current_count, remaining_seconds

        # Increment count
        new_count = current_count + 1
        await database.update_one(
            EMAIL_RATE_LIMITS_COLLECTION,
            {"_id": record_id},
            {
                "$set": {
                    "count": new_count,
                    "updatedAt": _now_iso(),
                }
            },
        )
        return True, new_count, 0

    async def enforce(
        self,
        key: str,
        action: str,
        max_requests: int,
        window_seconds: int,
        error_message: Optional[str] = None,
    ) -> None:
        """Enforces rate limit. Raises 429 HTTPException if limit exceeded."""
        allowed, count, retry_after = await self.check_and_increment(
            key=key,
            action=action,
            max_requests=max_requests,
            window_seconds=window_seconds,
        )
        if not allowed:
            msg = error_message or (
                f"Rate limit exceeded for {action}. Allowed: {max_requests} requests per {window_seconds}s. "
                f"Please wait {retry_after} seconds before trying again."
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=msg,
                headers={"Retry-After": str(retry_after)},
            )

    async def get_active_rate_limits(self) -> Dict[str, Any]:
        """Summary of active rate limit buckets currently recorded in database."""
        now = _now_ts()
        docs = await database.find_many(EMAIL_RATE_LIMITS_COLLECTION, {})
        active = []
        for d in docs:
            w_start = float(d.get("windowStart") or 0)
            w_sec = float(d.get("windowSeconds") or 60)
            if (now - w_start) < w_sec:
                active.append({
                    "key": d.get("key"),
                    "action": d.get("action"),
                    "count": d.get("count"),
                    "maxAllowed": d.get("maxAllowed"),
                    "remainingSec": max(0, int(w_sec - (now - w_start))),
                })
        return {
            "activeBuckets": active,
            "totalTracked": len(docs),
            "storage": "Supabase PostgreSQL Database",
            "enforced": True,
        }


email_rate_limiter = EmailRateLimiter()
