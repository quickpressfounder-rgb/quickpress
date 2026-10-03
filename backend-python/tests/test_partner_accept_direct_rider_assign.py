"""Test Direct Auto-Assignment of Ride 1 upon Partner Acceptance.

Verifies:
1. When Partner accepts order, the engine locates nearest online Captain.
2. The ride and order are directly assigned immediately to that Captain.
3. Order transitions to pickup_rider_accepted with riderId populated.
4. Notification is recorded for the assigned rider.
"""

import pytest
from app.db.client import database
from app.services import order_lifecycle as lifecycle
from app.services.smart_2ride_engine import (
    smart_2ride_engine,
    ORDERS_COLLECTION,
    RIDES_COLLECTION,
    RIDERS_COLLECTION,
    NOTIFICATIONS_COLLECTION,
)


@pytest.fixture(autouse=True)
async def clean_test_collections():
    await database.collection(ORDERS_COLLECTION).delete_many({"_id": {"$regex": "^test-autoassign-"}})
    await database.collection(RIDES_COLLECTION).delete_many({"orderId": {"$regex": "^test-autoassign-"}})
    await database.collection(RIDERS_COLLECTION).delete_many({"_id": {"$regex": "^rdr-autoassign-"}})
    await database.collection(NOTIFICATIONS_COLLECTION).delete_many({"riderId": {"$regex": "^rdr-autoassign-"}})
    yield
    await database.collection(ORDERS_COLLECTION).delete_many({"_id": {"$regex": "^test-autoassign-"}})
    await database.collection(RIDES_COLLECTION).delete_many({"orderId": {"$regex": "^test-autoassign-"}})
    await database.collection(RIDERS_COLLECTION).delete_many({"_id": {"$regex": "^rdr-autoassign-"}})
    await database.collection(NOTIFICATIONS_COLLECTION).delete_many({"riderId": {"$regex": "^rdr-autoassign-"}})


@pytest.mark.asyncio
async def test_partner_accept_auto_assigns_nearest_rider():
    order_id = "test-autoassign-ord-909"
    partner_id = "prt-kasganj-hub"
    rider_id = "rdr-autoassign-cap-1"

    now = lifecycle.now_iso()

    # 1. Create an Online Rider in Kasganj
    rider_doc = {
        "_id": rider_id,
        "riderId": rider_id,
        "fullName": "Amit Kumar (Super Captain)",
        "phone": "+91 9988776655",
        "city": "Kasganj",
        "isOnline": True,
        "status": "active",
        "lat": 27.8120,
        "lng": 78.6480,
        "vehicleType": "Hero Splendor Bike",
        "vehicleNumber": "UP-87-AK-5500",
        "totalTrips": 210,
        "rating": 4.95,
        "createdAt": now,
        "updatedAt": now,
    }
    await database.collection(RIDERS_COLLECTION).insert_one(rider_doc)

    # 2. Customer places order
    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": "QP909AUTO",
        "status": lifecycle.PLACED,
        "partner": {
            "id": partner_id,
            "name": "Kasganj Hub Store",
            "address": "Main Market, Kasganj",
            "city": "Kasganj",
            "latitude": 27.8118,
            "longitude": 78.6477,
        },
        "customer": {"id": "usr-909", "name": "Deepak Sharma", "phone": "9876543219"},
        "address": {
            "address": "Awas Vikas Colony, Kasganj",
            "city": "Kasganj",
            "latitude": 27.8130,
            "longitude": 78.6490,
        },
        "pickupLegPayout": 45.0,
        "fare": 90.0,
        "createdAt": now,
        "updatedAt": now,
    }
    await database.collection(ORDERS_COLLECTION).insert_one(order_doc)

    # 3. Partner Accepts the Order
    updated_accept = await lifecycle.transition(
        order_id,
        lifecycle.PARTNER_ACCEPTED,
        actor_id=partner_id,
        actor_role="partner",
    )
    assert updated_accept["status"] == lifecycle.PARTNER_ACCEPTED

    # 4. Engine creates Ride 1 and auto-assigns directly to Amit Kumar
    ride_1 = await smart_2ride_engine.create_ride_1_pickup(order_id)
    assert ride_1 is not None

    # Verify Ride is directly ACCEPTED and assigned to Amit Kumar
    assert ride_1["riderId"] == rider_id
    assert ride_1["status"] == "ACCEPTED"
    assert ride_1["rider"]["name"] == "Amit Kumar (Super Captain)"

    # Verify Order is updated to pickup_rider_accepted with Amit Kumar assigned
    updated_order = await database.find_one(ORDERS_COLLECTION, {"_id": order_id})
    assert updated_order["status"] == lifecycle.PICKUP_RIDER_ACCEPTED
    assert updated_order["riderId"] == rider_id
    assert updated_order["rider"]["id"] == rider_id

    # Verify notification created for Amit Kumar
    notifs = await database.find_many(NOTIFICATIONS_COLLECTION, {"riderId": rider_id})
    assert len(notifs) >= 1
    assert "Trip Assign" in notifs[0]["title"] or "Assign" in notifs[0]["title"]
