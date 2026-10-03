"""Tests for Phase 8: Real-Time Event Bus and SSE Streaming."""

import asyncio
import json

import pytest
from app.core.realtime_bus import RealtimeEventBus, realtime_bus
from app.main import fastapi_app
from app.services.socket_service import EVENT_ORDER_CREATED, broadcast_order_event
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_realtime_bus_subscribe_broadcast_unsubscribe():
    """Verify pub/sub delivery across specific rooms with clean unsubscription."""
    bus = RealtimeEventBus()

    # Subscriber 1: listens to customer:c1 and order:o1
    q1 = await bus.subscribe(["customer:c1", "order:o1"])

    # Subscriber 2: listens only to partner:p1
    q2 = await bus.subscribe(["partner:p1"])

    # Broadcast event to order:o1
    delivered_count = await bus.broadcast(
        "order.partner_accepted",
        {"orderId": "o1", "status": "partner_accepted"},
        rooms=["order:o1"],
    )
    assert delivered_count == 1

    # q1 should receive the event
    msg1 = await asyncio.wait_for(q1.get(), timeout=1.0)
    assert msg1["event"] == "order.partner_accepted"
    assert msg1["data"]["orderId"] == "o1"

    # q2 should have no messages
    assert q2.empty()

    # Broadcast event to partner:p1
    await bus.broadcast("order.new", {"orderId": "o2"}, rooms=["partner:p1"])
    msg2 = await asyncio.wait_for(q2.get(), timeout=1.0)
    assert msg2["event"] == "order.new"

    # Clean up
    await bus.unsubscribe(["customer:c1", "order:o1"], q1)
    await bus.unsubscribe(["partner:p1"], q2)

    stats = bus.stats()
    assert stats["active_subscribers_count"] == 0
    assert stats["active_rooms_count"] == 0


@pytest.mark.asyncio
async def test_realtime_stats_endpoint():
    """Verify /api/realtime/stats endpoint returns valid metric payload."""
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/realtime/stats")
        assert res.status_code == 200
        data = res.json()
        assert "active_rooms_count" in data
        assert "total_dispatched" in data


@pytest.mark.asyncio
async def test_socket_broadcast_synchronizes_with_realtime_bus():
    """Verify broadcast_order_event publishes to realtime_bus simultaneously."""
    test_order_id = "test-ord-live-sync-88"
    q = await realtime_bus.subscribe([f"order:{test_order_id}"])

    dummy_order = {
        "_id": test_order_id,
        "code": "QP8888",
        "status": "processing",
        "userId": "cust-88",
        "partner": {"id": "p-88"},
    }

    try:
        await broadcast_order_event(EVENT_ORDER_CREATED, dummy_order)
        msg = await asyncio.wait_for(q.get(), timeout=2.0)
        assert msg["event"] == EVENT_ORDER_CREATED
        assert msg["data"]["orderId"] == test_order_id
        assert msg["data"]["status"] == "processing"
    finally:
        await realtime_bus.unsubscribe([f"order:{test_order_id}"], q)
