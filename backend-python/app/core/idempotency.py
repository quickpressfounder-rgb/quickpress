"""Distributed Payment & Order Idempotency Engine for QuickPress.

Prevents double deductions, duplicate order creation, and concurrent race
conditions across distributed API instances using atomic Redis locking
and in-memory fallback.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from app.core.redis_limiter import _get_upstash_client, _upstash_command

logger = logging.getLogger("quickpress.idempotency")

_PREFIX = "qp:idemp:"
_STATUS_PROCESSING = "PROCESSING"
_STATUS_COMPLETED = "COMPLETED"


@dataclass
class IdempotencyResult:
    is_duplicate: bool
    is_processing: bool
    cached_data: Optional[Dict[str, Any]] = None


class IdempotencyEngine:
    """Atomic multi-tier idempotency manager."""

    def __init__(self) -> None:
        # In-memory fallback: key -> (expire_time, status, payload_dict)
        self._local_store: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    def _format_key(self, scope: str, key: str) -> str:
        return f"{_PREFIX}{scope}:{key}"

    async def get(self, scope: str, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves cached idempotency data if previously completed."""
        full_key = self._format_key(scope, key)
        now = time.time()

        # 1. Local Memory Check
        entry = self._local_store.get(full_key)
        if entry:
            if entry.get("expires_at", 0) > now:
                if entry.get("status") == _STATUS_COMPLETED:
                    return entry.get("payload")
            else:
                self._local_store.pop(full_key, None)

        # 2. Redis Check
        client = _get_upstash_client()
        if client is not None:
            try:
                raw = await _upstash_command("GET", full_key)
                if raw:
                    data = json.loads(raw) if isinstance(raw, str) else raw
                    if isinstance(data, dict) and data.get("status") == _STATUS_COMPLETED:
                        return data.get("payload")
            except Exception as exc:
                logger.debug("Idempotency Redis get failed: %s", exc)

        return None

    async def acquire(
        self, scope: str, key: str, processing_ttl: int = 60
    ) -> IdempotencyResult:
        """Atomically acquires an idempotency lock for processing.

        Returns:
            IdempotencyResult:
                - is_duplicate=False: Lock acquired, caller is the first to process.
                - is_duplicate=True, is_processing=True: Another request is currently executing.
                - is_duplicate=True, is_processing=False, cached_data=...: Request was already completed.
        """
        full_key = self._format_key(scope, key)
        now = time.time()
        client = _get_upstash_client()

        # Distributed Redis Path
        if client is not None:
            try:
                # Check existing status first
                raw = await _upstash_command("GET", full_key)
                if raw:
                    data = json.loads(raw) if isinstance(raw, str) else raw
                    if isinstance(data, dict):
                        if data.get("status") == _STATUS_COMPLETED:
                            return IdempotencyResult(
                                is_duplicate=True,
                                is_processing=False,
                                cached_data=data.get("payload"),
                            )
                        elif data.get("status") == _STATUS_PROCESSING:
                            return IdempotencyResult(
                                is_duplicate=True,
                                is_processing=True,
                                cached_data=None,
                            )

                # Attempt atomic lock acquisition (SET NX EX)
                processing_payload = json.dumps({
                    "status": _STATUS_PROCESSING,
                    "started_at": now,
                })
                res = await _upstash_command("SET", full_key, processing_payload, "EX", processing_ttl, "NX")
                if res == "OK":
                    return IdempotencyResult(is_duplicate=False, is_processing=False)
                else:
                    # Concurrently set by another thread
                    return IdempotencyResult(is_duplicate=True, is_processing=True)
            except Exception as exc:
                logger.warning("Upstash Redis idempotency check failed: %s. Using local fallback.", exc)

        # In-Memory Local Fallback
        async with self._lock:
            entry = self._local_store.get(full_key)
            if entry:
                if entry.get("expires_at", 0) > now:
                    if entry.get("status") == _STATUS_COMPLETED:
                        return IdempotencyResult(
                            is_duplicate=True,
                            is_processing=False,
                            cached_data=entry.get("payload"),
                        )
                    elif entry.get("status") == _STATUS_PROCESSING:
                        return IdempotencyResult(
                            is_duplicate=True,
                            is_processing=True,
                            cached_data=None,
                        )
                else:
                    self._local_store.pop(full_key, None)

            # Mark as processing locally
            self._local_store[full_key] = {
                "status": _STATUS_PROCESSING,
                "started_at": now,
                "expires_at": now + processing_ttl,
                "payload": None,
            }
            return IdempotencyResult(is_duplicate=False, is_processing=False)

    async def complete(
        self, scope: str, key: str, payload: Dict[str, Any], ttl_seconds: int = 86400
    ) -> None:
        """Marks the operation as completed and stores the cached response for replay."""
        full_key = self._format_key(scope, key)
        now = time.time()
        record = {
            "status": _STATUS_COMPLETED,
            "completed_at": now,
            "payload": payload,
        }

        # Save to local store
        self._local_store[full_key] = {
            "status": _STATUS_COMPLETED,
            "expires_at": now + ttl_seconds,
            "payload": payload,
        }

        # Save to Redis
        client = _get_upstash_client()
        if client is not None:
            try:
                serialized = json.dumps(record)
                await _upstash_command("SET", full_key, serialized, "EX", ttl_seconds)
            except Exception as exc:
                logger.debug("Idempotency Redis complete failed: %s", exc)

    async def release(self, scope: str, key: str) -> None:
        """Releases the lock on failure so the client can safely retry."""
        full_key = self._format_key(scope, key)
        self._local_store.pop(full_key, None)

        client = _get_upstash_client()
        if client is not None:
            try:
                await _upstash_command("DEL", full_key)
            except Exception as exc:
                logger.debug("Idempotency Redis release failed: %s", exc)


# Singleton instance
idempotency_engine = IdempotencyEngine()
