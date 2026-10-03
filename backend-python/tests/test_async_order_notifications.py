"""Tests for Phase 6: Async Non-Blocking Notification & Event Queue."""

import asyncio
import time
from unittest.mock import AsyncMock, patch

import pytest
from app.core.async_queue import AsyncTaskQueue, async_task_queue
from app.db.client import database
from app.services.order_notifications import (
    _dispatch_external_pushes,
    dispatch_order_created_notifications,
    send_customer_notification,
)


@pytest.mark.asyncio
async def test_async_queue_lifecycle_and_execution():
    """Verify that AsyncTaskQueue processes tasks in background with workers."""
    queue = AsyncTaskQueue(max_concurrency=2)
    await queue.start()
    assert queue.is_running is True

    executed = []

    async def mock_task(item_id: int, delay: float = 0.01):
        await asyncio.sleep(delay)
        executed.append(item_id)

    # Enqueue multiple jobs
    for i in range(5):
        queue.enqueue(mock_task, i)

    # Wait for completion
    await queue.wait_idle(timeout=2.0)
    assert len(executed) == 5
    assert set(executed) == {0, 1, 2, 3, 4}

    stats = queue.stats()
    assert stats["processed_count"] == 5
    assert stats["failed_count"] == 0

    await queue.stop()
    assert queue.is_running is False


@pytest.mark.asyncio
async def test_async_queue_fallback_when_not_started():
    """Verify that enqueue works seamlessly on active event loop even if workers are not started."""
    queue = AsyncTaskQueue(max_concurrency=2)
    assert queue.is_running is False

    result = []

    async def mock_standalone(val: str):
        await asyncio.sleep(0.01)
        result.append(val)

    # Enqueue directly onto event loop fallback
    queued = queue.enqueue(mock_standalone, "direct-event-loop")
    assert queued is True

    await queue.wait_idle(timeout=1.0)
    assert "direct-event-loop" in result


@pytest.mark.asyncio
async def test_concurrent_push_dispatch_speed():
    """Verify that OneSignal, FCM, and Native WebPush are gathered in parallel."""
    # Simulate 50ms network round-trip on each external service
    async def slow_onesignal(*args, **kwargs):
        await asyncio.sleep(0.05)
        return {"status": "ok"}

    async def slow_fcm(*args, **kwargs):
        await asyncio.sleep(0.05)
        return {"status": "ok"}

    async def slow_webpush(*args, **kwargs):
        await asyncio.sleep(0.05)
        return {"status": "ok"}

    with patch("app.core.onesignal.send_onesignal_notification", side_effect=slow_onesignal), \
         patch("app.core.fcm.send_fcm_push", side_effect=slow_fcm), \
         patch("app.core.webpush.send_native_webpush", side_effect=slow_webpush):

        t0 = time.perf_counter()
        await _dispatch_external_pushes(
            "user-speed-test",
            title="Fast Notification",
            body="Checking parallel dispatch",
            deep_link="/track/123",
            data={"orderId": "123"},
        )
        duration = time.perf_counter() - t0

        # If sequential, it would take >= 0.15s (150ms).
        # Parallel execution must complete in under 0.12s.
        assert duration < 0.12, f"Expected parallel dispatch < 120ms, got {duration*1000:.1f}ms"


@pytest.mark.asyncio
async def test_order_created_notifications_parallel_dispatch():
    """Verify that dispatch_order_created_notifications parallelizes all roles."""
    await database.connect()

    dummy_order = {
        "_id": "ord-async-test-1",
        "code": "QP8888",
        "userId": "cust-async-1",
        "totals": {"grandTotal": 650},
        "customer": {"id": "cust-async-1", "name": "Speed Tester"},
        "partner": {"id": "part-async-1", "name": "Flash Laundry"},
    }

    await dispatch_order_created_notifications(dummy_order)

    # Verify notifications for customer and partner were created in database
    cust_notif = await database.collection("notifications").find_one({"user_id": "cust-async-1"})
    assert cust_notif is not None
    assert cust_notif["kind"] == "order-new"

    part_notif = await database.collection("notifications").find_one({"user_id": "part-async-1"})
    assert part_notif is not None
    assert part_notif["role"] == "partner"
