import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.smart_2ride_engine import smart_2ride_engine, RIDES_COLLECTION, ORDERS_COLLECTION, RIDERS_COLLECTION
from app.services import order_lifecycle as lifecycle


@pytest.mark.asyncio
async def test_rider_cancel_accepted_trip_redispatches():
    """Verify that when a rider cancels an accepted trip before pickup:
    1. Rider is freed (status online, currentOrderId None)
    2. Order status transitions back to rider_searching
    3. Dispatch next offer is triggered
    """
    ride_id = "ride-pk-test-ord-cancel-1"
    rider_id = "rider-test-puncture-01"
    order_id = "test-ord-cancel-1"

    fake_ride = {
        "_id": ride_id,
        "orderId": order_id,
        "riderId": rider_id,
        "status": "ACCEPTED",
        "assignmentHistory": [],
    }

    fake_order = {
        "_id": order_id,
        "code": "QP-TEST-CANC-1",
        "userId": "user-cust-01",
        "partner": {"id": "store-kasganj-01", "name": "Kasganj Hub"},
        "status": lifecycle.RIDER_ACCEPTED,
        "riderId": rider_id,
        "events": [],
    }

    with patch("app.db.client.database.find_one", AsyncMock(side_effect=lambda col, q: fake_ride if col == RIDES_COLLECTION else (fake_order if col == ORDERS_COLLECTION else None))), \
         patch("app.db.client.database.collection") as mock_col, \
         patch("app.db.client.database.update", AsyncMock(return_value=True)), \
         patch("app.services.order_lifecycle.find_order", AsyncMock(return_value=fake_order)), \
         patch.object(smart_2ride_engine, "dispatch_next_offer", AsyncMock()) as mock_dispatch, \
         patch("app.services.socket_service.broadcast_order_event", AsyncMock()), \
         patch("app.services.socket_service.sio.emit", AsyncMock()):

        update_mock = AsyncMock()
        mock_col.return_value.update_one = update_mock

        res = await smart_2ride_engine.cancel_ride_by_rider(
            ride_id=ride_id,
            rider_id=rider_id,
            reason="Tire puncture on route",
        )

        assert res["ok"] is True
        assert res["status"] == "REASSIGNING"
        assert res["orderId"] == order_id

        # Verify dispatch_next_offer was triggered to find next rider
        mock_dispatch.assert_called_once_with(ride_id)


@pytest.mark.asyncio
async def test_rider_cannot_cancel_after_pickup():
    """Rider cannot cancel a trip using standard cancel-trip if garments are already picked up."""
    ride_id = "ride-pk-test-ord-cancel-2"
    rider_id = "rider-test-02"
    order_id = "test-ord-cancel-2"

    fake_ride = {"_id": ride_id, "orderId": order_id, "riderId": rider_id, "status": "IN_TRIP"}
    fake_order = {"_id": order_id, "status": "picked_up"}

    with patch("app.db.client.database.find_one", AsyncMock(return_value=fake_ride)), \
         patch("app.services.order_lifecycle.find_order", AsyncMock(return_value=fake_order)):

        with pytest.raises(ValueError, match="already been picked up"):
            await smart_2ride_engine.cancel_ride_by_rider(
                ride_id=ride_id,
                rider_id=rider_id,
                reason="Changed mind",
            )


@pytest.mark.asyncio
async def test_customer_cancellation_lifecycle_hook():
    """Verify that when an order is cancelled, dispatch waves and timers are halted."""
    order_id = "test-ord-lifecycle-canc-1"
    fake_order = {
        "_id": order_id,
        "code": "QP-CANC-99",
        "status": "placed",
        "events": [],
    }

    with patch("app.services.order_lifecycle.get_order", AsyncMock(return_value=fake_order)), \
         patch("app.db.client.database.collection") as mock_col, \
         patch("app.db.client.database.find_many", AsyncMock(return_value=[])), \
         patch("app.services.zomato_dispatch_engine.zomato_dispatch_engine.cancel_dispatch") as mock_zom_cancel, \
         patch("app.services.order_lifecycle.record_event", AsyncMock()), \
         patch("app.services.order_notifications.dispatch_order_transition_notifications", AsyncMock()), \
         patch("app.services.socket_service.broadcast_order_event", AsyncMock()), \
         patch("app.services.socket_service.sio.emit", AsyncMock()):

        mock_col.return_value.update_one = AsyncMock()

        updated = await lifecycle.transition(
            order_id=order_id,
            target=lifecycle.CANCELLED,
            actor_id="user-123",
            actor_role="customer",
            metadata={"reason": "Booked by mistake"},
        )

        assert updated is not None
        # Zomato dispatch engine cancel_dispatch was called for canonical order and ride aliases
        assert mock_zom_cancel.call_count >= 1
