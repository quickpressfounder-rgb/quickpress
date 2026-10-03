"""Distributed Hybrid Caching Engine for QuickPress (L1 In-Memory + L2 Upstash Redis).

Provides sub-millisecond responses for hot, high-frequency read endpoints:
- Catalog Banners, Categories, Services, Offers
- Public FAQ lists and Help categories
- Location & Serviceable areas metadata

Architecture:
1. L1: Fast In-Memory LRU/TTL Cache (local process memory, < 0.05ms)
2. L2: Distributed Upstash Redis (shared across all workers & instances, 1-5ms)
3. Zero-Failure Fallback: If Redis is offline/unreachable, gracefully falls back to L1
4. Invalidation: Instant cache purge on updates / admin operations
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Callable, Coroutine, Dict, List, Optional, Tuple

import httpx
from app.config import get_settings
from app.core.redis_limiter import _get_upstash_client, _upstash_command

_log = logging.getLogger("quickpress.redis_cache")

_KEY_PREFIX = "qp:cache:"


class HybridCacheEngine:
    """Two-tier cache engine combining local memory and distributed Redis."""

    def __init__(self) -> None:
        # L1 In-memory cache storage: key -> (expire_timestamp, json_serialized_value)
        self._l1_store: Dict[str, Tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    def _full_key(self, key: str) -> str:
        return f"{_KEY_PREFIX}{key}"

    # -------------------------------------------------------------------------
    # Core GET / SET / DELETE
    # -------------------------------------------------------------------------

    async def get(self, key: str) -> Optional[Any]:
        """Fetch item from L1 (memory) or L2 (Upstash Redis)."""
        now = time.time()

        # 1. Check L1 Memory Cache
        if key in self._l1_store:
            exp, val = self._l1_store[key]
            if exp > now:
                return val
            # Expired: remove
            self._l1_store.pop(key, None)

        # 2. Check L2 Redis
        client = _get_upstash_client()
        if client is not None:
            full_k = self._full_key(key)
            try:
                raw = await _upstash_command("GET", full_k)
                if raw is not None and isinstance(raw, str):
                    try:
                        parsed = json.loads(raw)
                    except Exception:
                        parsed = raw
                    # Populate L1 for local speed
                    self._l1_store[key] = (now + 60.0, parsed)
                    return parsed
            except Exception as exc:
                _log.debug("Redis GET failed for %s (%s). Using L1.", key, exc)

        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Store item in L1 (memory) and L2 (Upstash Redis)."""
        now = time.time()
        expire_at = now + ttl_seconds

        # 1. Store in L1 Memory
        self._l1_store[key] = (expire_at, value)

        # 2. Store in L2 Redis
        client = _get_upstash_client()
        if client is not None:
            full_k = self._full_key(key)
            try:
                serialized = json.dumps(value, default=str)
                await _upstash_command("SET", full_k, serialized, "EX", int(ttl_seconds))
                return True
            except Exception as exc:
                _log.debug("Redis SET failed for %s (%s). Kept in L1.", key, exc)

        return True

    async def delete(self, key: str) -> bool:
        """Invalidate single key from L1 and L2."""
        self._l1_store.pop(key, None)

        client = _get_upstash_client()
        if client is not None:
            try:
                await _upstash_command("DEL", self._full_key(key))
            except Exception as exc:
                _log.debug("Redis DEL failed for %s: %s", key, exc)
        return True

    async def delete_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching prefix/pattern (e.g. 'catalog:*')."""
        # Purge from L1
        p_prefix = pattern.rstrip("*")
        to_del = [k for k in self._l1_store if k.startswith(p_prefix)]
        for k in to_del:
            self._l1_store.pop(k, None)

        count = len(to_del)

        # Purge from L2 Redis
        client = _get_upstash_client()
        if client is not None:
            try:
                redis_pattern = f"{_KEY_PREFIX}{pattern}"
                keys = await _upstash_command("KEYS", redis_pattern)
                if isinstance(keys, list) and keys:
                    for k in keys:
                        await _upstash_command("DEL", k)
                    count += len(keys)
            except Exception as exc:
                _log.debug("Redis delete_pattern failed for %s: %s", pattern, exc)

        return count

    def clear_local(self) -> None:
        """Purges local in-memory L1 cache."""
        self._l1_store.clear()

    # -------------------------------------------------------------------------
    # Convenience Wrapper
    # -------------------------------------------------------------------------

    async def get_or_set(
        self,
        key: str,
        fetcher: Callable[[], Coroutine[Any, Any, Any]],
        ttl_seconds: int = 300,
    ) -> Any:
        """Returns cached value if present; otherwise awaits fetcher(), caches result, and returns it."""
        cached = await self.get(key)
        if cached is not None:
            return cached

        # Fetch fresh data
        fresh = await fetcher()
        if fresh is not None:
            await self.set(key, fresh, ttl_seconds=ttl_seconds)
        return fresh


# Global singleton instance
hybrid_cache = HybridCacheEngine()
