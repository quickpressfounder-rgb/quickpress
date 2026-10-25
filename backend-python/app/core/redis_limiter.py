"""Distributed Sliding-Window Rate Limiting & Anti-DDoS Engine for QuickPress.

Supports:
1. Upstash Redis REST API (Serverless, HTTP-based, persistent, zero socket leaks).
2. Standard Redis connection string (REDIS_URL).
3. In-Memory Sliding Window Fallback (when offline or in local development).
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, List, Optional, Tuple

import httpx
from app.config import get_settings
from app.core.rate_limiter import SlidingWindowRateLimiter

_log = logging.getLogger("quickpress.redis_limiter")

# In-memory local fallback instance
_in_memory_limiter = SlidingWindowRateLimiter()

# Shared persistent async HTTP client for Upstash REST calls
_upstash_http_client: Optional[httpx.AsyncClient] = None
_upstash_client_loop: Any = None

# Standard Redis client (REDIS_URL)
_standard_redis_client: Any = None
_standard_redis_loop: Any = None


def _get_standard_redis() -> Any:
    """Returns or creates standard redis.asyncio client if REDIS_URL is configured."""
    global _standard_redis_client, _standard_redis_loop
    try:
        settings = get_settings()
    except Exception:
        return None

    url = (getattr(settings, "redis_url", "") or "").strip()
    if not url:
        return None

    try:
        import redis.asyncio as aioredis
    except ImportError:
        return None

    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _standard_redis_client is None or _standard_redis_loop != current_loop:
        try:
            _standard_redis_client = aioredis.from_url(
                url,
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            _standard_redis_loop = current_loop
        except Exception as exc:
            _log.warning("Standard Redis connection init failed: %s", exc)
            return None
    return _standard_redis_client


def _get_upstash_client() -> Optional[httpx.AsyncClient]:
    """Returns or creates persistent httpx client for Upstash REST API."""
    global _upstash_http_client, _upstash_client_loop
    settings = get_settings()
    if not settings.upstash_redis_rest_url.strip() or not settings.upstash_redis_rest_token.strip():
        return None

    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if (
        _upstash_http_client is None
        or _upstash_http_client.is_closed
        or _upstash_client_loop != current_loop
    ):
        _upstash_http_client = httpx.AsyncClient(
            base_url=settings.upstash_redis_rest_url.rstrip("/"),
            headers={
                "Authorization": f"Bearer {settings.upstash_redis_rest_token.strip()}",
                "Content-Type": "application/json",
            },
            timeout=2.5,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
        )
        _upstash_client_loop = current_loop
    return _upstash_http_client


def _is_redis_active() -> bool:
    """True if either standard Redis or Upstash Redis is configured."""
    return _get_standard_redis() is not None or _get_upstash_client() is not None


async def _upstash_pipeline(commands: List[List[Any]]) -> Optional[List[Any]]:
    """Executes a pipeline batch of Redis commands over Standard Redis or Upstash REST API."""
    std_redis = _get_standard_redis()
    if std_redis is not None:
        try:
            pipe = std_redis.pipeline()
            for cmd in commands:
                if cmd:
                    pipe.execute_command(str(cmd[0]).upper(), *cmd[1:])
            results = await pipe.execute()
            return list(results)
        except Exception as exc:
            _log.warning("Standard Redis pipeline failed (%s). Checking Upstash/in-memory.", exc)

    client = _get_upstash_client()
    if client is None:
        return None

    try:
        resp = await client.post("/pipeline", json=commands)
        if resp.status_code == 200:
            data = resp.json()
            return [item.get("result") for item in data] if isinstance(data, list) else None
        _log.warning("Upstash REST pipeline returned %s: %s", resp.status_code, resp.text)
        return None
    except Exception as exc:
        _log.warning("Upstash REST pipeline call failed (%s). Falling back to in-memory.", exc)
        return None


async def _upstash_command(*args: Any) -> Optional[Any]:
    """Executes a single Redis command over Standard Redis or Upstash REST API."""
    std_redis = _get_standard_redis()
    if std_redis is not None:
        try:
            cmd = str(args[0]).upper()
            cmd_args = args[1:]
            return await std_redis.execute_command(cmd, *cmd_args)
        except Exception as exc:
            _log.warning("Standard Redis command failed (%s). Checking Upstash/in-memory.", exc)

    client = _get_upstash_client()
    if client is None:
        return None

    try:
        resp = await client.post("/", json=list(args))
        if resp.status_code == 200:
            data = resp.json()
            return data.get("result")
        return None
    except Exception as exc:
        _log.warning("Upstash REST command call failed (%s). Falling back to in-memory.", exc)
        return None


class DistributedRateLimiter:
    """Enterprise-grade hybrid distributed rate limiter."""

    @staticmethod
    async def is_locked(key: str) -> Tuple[bool, int]:
        """Checks whether the given IP or phone number is currently locked out."""
        client = _get_upstash_client()
        if client is not None:
            lock_key = f"qp:lockout:{key}"
            ttl = await _upstash_command("TTL", lock_key)
            if isinstance(ttl, (int, float)) and ttl > 0:
                return True, int(ttl)
            return False, 0

        return _in_memory_limiter.is_locked(key)

    @staticmethod
    async def check_limit(key: str, max_requests: int, window_seconds: int) -> bool:
        """Atomic sliding-window rate limiter using Upstash Redis sorted sets (ZSET).
        
        Returns:
            True if request is permitted under rate limit.
            False if request rate limit has been exceeded.
        """
        client = _get_upstash_client()
        if client is not None:
            now = time.time()
            cutoff = now - window_seconds
            set_key = f"qp:ratelimit:{key}"

            # Pipeline: [ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE]
            results = await _upstash_pipeline([
                ["ZREMRANGEBYSCORE", set_key, 0, cutoff],
                ["ZADD", set_key, now, str(now)],
                ["ZCARD", set_key],
                ["EXPIRE", set_key, window_seconds + 5],
            ])

            if results and len(results) >= 3 and results[2] is not None:
                count = results[2]
                return count <= max_requests

        return _in_memory_limiter.check_limit(key, max_requests, window_seconds)

    @staticmethod
    async def record_failed_attempt(
        key: str,
        max_failures: int = 5,
        lock_duration: int = 900,
    ) -> Tuple[int, Optional[int]]:
        """Records a failed authentication attempt with lockout trigger."""
        client = _get_upstash_client()
        if client is not None:
            attempt_key = f"qp:fail_attempts:{key}"
            lock_key = f"qp:lockout:{key}"

            # Increment attempt counter (sliding 10 min window)
            results = await _upstash_pipeline([
                ["INCR", attempt_key],
                ["EXPIRE", attempt_key, 600],
            ])

            if results and results[0] is not None:
                attempts = results[0]
                if attempts >= max_failures:
                    await _upstash_pipeline([
                        ["SET", lock_key, "1", "EX", lock_duration],
                        ["DEL", attempt_key],
                    ])
                    return attempts, lock_duration
                return attempts, None

        return _in_memory_limiter.record_failed_attempt(key, max_failures, lock_duration)

    @staticmethod
    async def reset_failed_attempts(key: str) -> None:
        """Resets failed attempt counters upon successful authentication."""
        client = _get_upstash_client()
        if client is not None:
            attempt_key = f"qp:fail_attempts:{key}"
            lock_key = f"qp:lockout:{key}"
            await _upstash_pipeline([
                ["DEL", attempt_key],
                ["DEL", lock_key],
            ])
            return

        _in_memory_limiter.reset_failed_attempts(key)


# Global singleton instance
distributed_limiter = DistributedRateLimiter()
