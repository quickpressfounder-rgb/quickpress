"""Tests for Order Notification Engine."""

import pytest
from app.db.client import database
from app.db.notification_repositories import notification_repository
from app.services import order_lifecycle as lifecycle
from app.services.order_notifications import (
    dispatch_order_created_notifications,
    dispatch_order_transition_notifications,
)


@pytest.mark.asyncio
async def test_order_created_and_lifecycle_notifications():
    await database.connect()

    test_user_id = "test-notif-cust-99"
    test_order_id = "ord-test-notif-99"
    test_code = "QP9999"

    # Clean old test notifs if any
    await database.collection("notifications").delete_many({"user_id": test_user_id})

    dummy_order = {
        "_id": test_order_id,
        "code": test_code,
        "userId": test_user_id,
        "status": "pending",
        "totals": {"grandTotal": 499},
        "customer": {"id": test_user_id, "name": "Test Customer"},
        "partner": {"id": "p-kasganj", "name": "QuickPress Express"},
        "rider": {"id": "r-1", "name": "Rohan"},
        "otp": {"pickup": "1234", "delivery": "5678"},
    }

    # 1. Order Placed
    await dispatch_order_created_notifications(dummy_order)

    # 2. Partner Accepted
    await dispatch_order_transition_notifications(
        dummy_order,
        lifecycle.PARTNER_ACCEPTED,
        actor_id="p-kasganj",
        actor_role="partner",
    )

    # 3. Rider Assigned
    await dispatch_order_transition_notifications(
        dummy_order,
        lifecycle.RIDER_ASSIGNED,
        actor_id="admin-1",
        actor_role="admin",
    )

    # 4. Out for Delivery
    await dispatch_order_transition_notifications(
        dummy_order,
        lifecycle.OUT_FOR_DELIVERY,
        actor_id="r-1",
        actor_role="rider",
    )

    # 5. Delivered
    await dispatch_order_transition_notifications(
        dummy_order,
        lifecycle.DELIVERED,
        actor_id="r-1",
        actor_role="rider",
    )

    # 6. Cancelled
    await dispatch_order_transition_notifications(
        dummy_order,
        lifecycle.CANCELLED,
        actor_id=test_user_id,
        actor_role="customer",
        metadata={"reason": "Need to change pickup time"},
    )

    # Verify notifications in feed
    result = await notification_repository.list(test_user_id)
    kinds = [item.kind for item in result.items]

    assert "order-new" in kinds
    assert "partner-accepted" in kinds
    assert "rider-assigned" in kinds
    assert "out-for-delivery" in kinds
    assert "delivered" in kinds
    assert "order-cancelled" in kinds

    # Verify unread count
    unread = await notification_repository.unread_count(test_user_id)
    assert unread >= 6

    # Verify marking read
    await notification_repository.mark_all_read(test_user_id)
    unread_after = await notification_repository.unread_count(test_user_id)
    assert unread_after == 0
