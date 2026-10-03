"""Distributed Real-Time Event Bus & Pub/Sub Hub.

Enables seamless real-time event distribution across Socket.IO and
Server-Sent Events (SSE), eliminating client polling loops and synchronizing
order status transitions across Customer, Partner, Rider, and Admin dashboards.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, AsyncGenerator, Dict, List, Optional, Set

logger = logging.getLogger("quickpress.realtime_bus")


class RealtimeEventBus:
    """In-memory and distributed Pub/Sub event dispatcher for Socket.IO + SSE."""

    def __init__(self) -> None:
        # room -> set of asyncio.Queue instances for active SSE listeners
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()
        self._total_dispatched = 0

    @property
    def total_dispatched(self) -> int:
        return self._total_dispatched

    async def subscribe(self, rooms: List[str]) -> asyncio.Queue:
        """Subscribes an SSE or WebSocket client queue to one or more rooms."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            for room in rooms:
                clean_room = room.strip()
                if not clean_room:
                    continue
                if clean_room not in self._subscribers:
                    self._subscribers[clean_room] = set()
                self._subscribers[clean_room].add(queue)
        return queue

    async def unsubscribe(self, rooms: List[str], queue: asyncio.Queue) -> None:
        """Removes a client queue from rooms."""
        async with self._lock:
            for room in rooms:
                clean_room = room.strip()
                if clean_room in self._subscribers:
                    self._subscribers[clean_room].discard(queue)
                    if not self._subscribers[clean_room]:
                        del self._subscribers[clean_room]

    async def broadcast(
        self,
        event_name: str,
        payload: Dict[str, Any],
        rooms: List[str],
    ) -> int:
        """Broadcasts an event to all subscribers in the designated rooms."""
        self._total_dispatched += 1
        msg = {
            "event": event_name,
            "data": payload,
            "timestamp": time.time(),
        }

        notified_queues: Set[asyncio.Queue] = set()
        async with self._lock:
            for room in rooms:
                clean_room = room.strip()
                if clean_room in self._subscribers:
                    notified_queues.update(self._subscribers[clean_room])

        for q in notified_queues:
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                logger.debug("Subscriber queue full, skipping drop-in message")
            except Exception as exc:
                logger.debug("Error delivering to subscriber queue: %s", exc)

        return len(notified_queues)

    def stats(self) -> Dict[str, Any]:
        """Returns active rooms and subscriber counts."""
        active_subscribers = sum(len(s) for s in self._subscribers.values())
        return {
            "active_rooms_count": len(self._subscribers),
            "active_subscribers_count": active_subscribers,
            "total_dispatched": self._total_dispatched,
            "rooms": list(self._subscribers.keys()),
        }


# Singleton instance
realtime_bus = RealtimeEventBus()
