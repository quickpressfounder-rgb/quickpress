"""Server-Sent Events (SSE) Streaming API for Real-Time Order & Location Updates.

Provides a lightweight, zero-dependency HTTP streaming connection (/api/realtime/stream)
for web and mobile clients, eliminating polling loops and receiving live order
events instantly.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.core.deps import optional_user
from app.core.realtime_bus import realtime_bus
from app.models.user import User

logger = logging.getLogger("quickpress.realtime_sse")

router = APIRouter(tags=["realtime"])


@router.get("/realtime/stats")
async def realtime_stats() -> dict:
    """Returns active real-time rooms and connected subscriber metrics."""
    return realtime_bus.stats()


@router.get("/realtime/stream")
async def realtime_stream(
    request: Request,
    rooms: Optional[str] = Query(default=None, description="Comma-separated rooms to subscribe to"),
    user: Optional[User] = Depends(optional_user),
) -> StreamingResponse:
    """Streams real-time events over HTTP SSE (Server-Sent Events)."""
    subscribed_rooms: List[str] = []

    # 1. Automatic role and identity room subscriptions
    if user:
        subscribed_rooms.append(f"user:{user.id}")
        subscribed_rooms.append(f"customer:{user.id}")
        subscribed_rooms.append(f"role:{user.role}")
        if user.role == "admin":
            subscribed_rooms.append("admins")
        elif user.role == "partner":
            subscribed_rooms.append(f"partner:{user.id}")
            subscribed_rooms.append("partners")
        elif user.role == "rider":
            subscribed_rooms.append(f"rider:{user.id}")
            subscribed_rooms.append("riders")

    # 2. Additional explicitly requested rooms
    if rooms:
        for r in rooms.split(","):
            clean = r.strip()
            if clean and clean not in subscribed_rooms:
                subscribed_rooms.append(clean)

    # If no specific rooms, listen to general public announcements
    if not subscribed_rooms:
        subscribed_rooms.append("public")

    queue = await realtime_bus.subscribe(subscribed_rooms)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Send initial connected handshake
            connect_msg = {
                "status": "connected",
                "rooms": subscribed_rooms,
                "userId": user.id if user else None,
            }
            yield f"event: connected\ndata: {json.dumps(connect_msg)}\n\n"

            while True:
                # Disconnect check
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next event or send heartbeat every 15s
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    evt_name = msg.get("event", "message")
                    evt_data = json.dumps(msg.get("data", {}))
                    yield f"event: {evt_name}\ndata: {evt_data}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep connection active through Nginx / CDN
                    yield ": heartbeat\n\n"
                except asyncio.CancelledError:
                    break
        finally:
            await realtime_bus.unsubscribe(subscribed_rooms, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
