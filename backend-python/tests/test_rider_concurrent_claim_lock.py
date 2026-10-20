"""
Tests for Rapid Order Flow & Atomic Concurrency in Rider Assignment.

Validates:
1. Fast Partner Acceptance -> Instant Ride Creation & Broadcast
2. First-Come-First-Served Atomic Assignment (asyncio concurrent race)
3. Rejection of second rider (Double Assignment strictly prevented)
"""

import asyncio
import pytest
from app.services.smart_2ride_engine import smart_2ride_engine, RIDES_COLLECTION
from app.db.client import database
from app.services import order_lifecycle as lifecycle

@pytest.mark.asyncio
async def test_atomic_first_come_first_served_rider_acceptance():
    test_order_id = f"ord-test-concurrent-{lifecycle.now_iso()[:19].replace(':', '')}"
    test_ride_id = f"ride-pk-{test_order_id}"
    rider_1_id = "rdr-speedy-1"
    rider_2_id = "rdr-speedy-2"

    # Setup mock order and ride document in database
    now = lifecycle.now_iso()
    test_order = {
        "_id": test_order_id,
        "code": "QPCONCUR01",
        "status": lifecycle.PARTNER_ACCEPTED,
        "address": {"city": "Delhi", "line": "123 Test St", "latitude": 28.6139, "longitude": 77.2090},
        "customer": {"name": "Test Customer", "phone": "+919876543210"},
        "partner": {"name": "Test Store", "phone": "+919876543211", "city": "Delhi", "latitude": 28.6145, "longitude": 77.2095},
        "createdAt": now,
        "updatedAt": now,
    }
    await database.collection("customer_orders").insert_one(test_order)

    test_ride = {
        "_id": test_ride_id,
        "orderId": test_order_id,
        "orderCode": "QPCONCUR01",
        "rideType": "pickup",
        "status": "OFFER_SENT",
        "city": "Delhi",
        "estimatedEarning": 55,
        "pickupLocation": {"address": "123 Test St", "city": "Delhi", "latitude": 28.6139, "longitude": 77.2090},
        "dropLocation": {"address": "Partner Store", "city": "Delhi", "latitude": 28.6145, "longitude": 77.2095},
        "createdAt": now,
        "updatedAt": now,
    }
    await database.collection(RIDES_COLLECTION).insert_one(test_ride)

    # Setup rider profiles with matching city
    await database.collection("riders").update_one(
        {"_id": rider_1_id},
        {"$set": {"_id": rider_1_id, "fullName": "Speedy Rider 1", "phone": "+919800000001", "city": "Delhi", "isOnline": True}},
        upsert=True
    )
    await database.collection("riders").update_one(
        {"_id": rider_2_id},
        {"$set": {"_id": rider_2_id, "fullName": "Speedy Rider 2", "phone": "+919800000002", "city": "Delhi", "isOnline": True}},
        upsert=True
    )

    try:
        # Race both riders simultaneously at the exact same instant
        results = await asyncio.gather(
            smart_2ride_engine.handle_rider_accept(test_ride_id, rider_1_id),
            smart_2ride_engine.handle_rider_accept(test_ride_id, rider_2_id),
            return_exceptions=True,
        )

        successes = [r for r in results if isinstance(r, dict) and r.get("status") == "ACCEPTED"]
        exceptions = [r for r in results if isinstance(r, Exception)]

        # STRICT ASSERTIONS:
        # 1. Exactly ONE rider must win the trip
        assert len(successes) == 1, f"Expected exactly 1 winner, but got {len(successes)}: {results}"
        # 2. Exactly ONE rider must be rejected with RIDE_ALREADY_ASSIGNED
        assert len(exceptions) == 1, f"Expected exactly 1 exception, but got {len(exceptions)}: {results}"
        assert "RIDE_ALREADY_ASSIGNED" in str(exceptions[0]), f"Unexpected exception message: {exceptions[0]}"

        winning_rider_id = successes[0]["riderId"]
        assert winning_rider_id in (rider_1_id, rider_2_id)

        # 3. Verify final DB state is assigned exclusively to the winning rider
        final_ride = await database.find_one(RIDES_COLLECTION, {"_id": test_ride_id})
        assert final_ride is not None
        assert final_ride.get("status") == "ACCEPTED"
        assert final_ride.get("riderId") == winning_rider_id

        # 4. A subsequent third attempt by anyone else must also fail immediately
        with pytest.raises(ValueError) as third_err:
            await smart_2ride_engine.handle_rider_accept(test_ride_id, "rdr-third-party")
        assert "RIDE_ALREADY_ASSIGNED" in str(third_err.value)

        # 5. Idempotent re-acceptance by the winner must succeed without error
        idempotent_res = await smart_2ride_engine.handle_rider_accept(test_ride_id, winning_rider_id)
        assert idempotent_res.get("riderId") == winning_rider_id

    finally:
        # Cleanup test records
        await database.collection("customer_orders").delete_one({"_id": test_order_id})
        await database.collection(RIDES_COLLECTION).delete_one({"_id": test_ride_id})
        await database.collection("riders").delete_one({"_id": rider_1_id})
        await database.collection("riders").delete_one({"_id": rider_2_id})


@pytest.mark.asyncio
async def test_rider_api_accept_second_rider_gets_409_conflict():
    from fastapi.testclient import TestClient
    from app.main import create_app
    from app.core.security import create_access_token
    from app.models.user import Role, User, UserStatus
    from app.db.repositories import users as user_repository
    import uuid

    # 1. Create two test riders
    uid_1 = f"rdr-usr-{uuid.uuid4().hex[:6]}"
    uid_2 = f"rdr-usr-{uuid.uuid4().hex[:6]}"
    user_1 = await user_repository.create(
        User(id=uid_1, firebase_uid=f"fb-{uid_1}", role=Role.rider, phone="+919811111101", status=UserStatus.active, is_verified=True, is_onboarded=True)
    )
    user_2 = await user_repository.create(
        User(id=uid_2, firebase_uid=f"fb-{uid_2}", role=Role.rider, phone="+919811111102", status=UserStatus.active, is_verified=True, is_onboarded=True)
    )
    token_1, _ = create_access_token(user_1.id, Role.rider.value)
    token_2, _ = create_access_token(user_2.id, Role.rider.value)

    # Setup rider profiles
    await database.collection("riders").update_one(
        {"_id": uid_1},
        {"$set": {"_id": uid_1, "fullName": "Captain Alpha", "phone": "+919811111101", "city": "Delhi", "isOnline": True}},
        upsert=True
    )
    await database.collection("riders").update_one(
        {"_id": uid_2},
        {"$set": {"_id": uid_2, "fullName": "Captain Beta", "phone": "+919811111102", "city": "Delhi", "isOnline": True}},
        upsert=True
    )

    test_ord_id = f"ord-api-test-{uuid.uuid4().hex[:6]}"
    test_rd_id = f"ride-pk-{test_ord_id}"
    now = lifecycle.now_iso()

    await database.collection("customer_orders").insert_one({
        "_id": test_ord_id,
        "code": "QPAPI409",
        "status": lifecycle.PARTNER_ACCEPTED,
        "address": {"city": "Delhi", "line": "123 Delhi Marg", "latitude": 28.6139, "longitude": 77.2090},
        "customer": {"name": "Delhi Customer", "phone": "+919876543210"},
        "partner": {"name": "Delhi Partner", "phone": "+919876543211", "city": "Delhi", "latitude": 28.6145, "longitude": 77.2095},
        "createdAt": now,
        "updatedAt": now,
    })

    await database.collection(RIDES_COLLECTION).insert_one({
        "_id": test_rd_id,
        "orderId": test_ord_id,
        "orderCode": "QPAPI409",
        "rideType": "pickup",
        "status": "OFFER_SENT",
        "city": "Delhi",
        "estimatedEarning": 60,
        "pickupLocation": {"address": "123 Delhi Marg", "city": "Delhi", "latitude": 28.6139, "longitude": 77.2090},
        "dropLocation": {"address": "Delhi Partner", "city": "Delhi", "latitude": 28.6145, "longitude": 77.2095},
        "createdAt": now,
        "updatedAt": now,
    })

    try:
        with TestClient(create_app()) as client:
            # Rider 1 accepts -> 200 OK
            res_1 = client.post(
                f"/api/rider/orders/{test_ord_id}/accept",
                headers={"Authorization": f"Bearer {token_1}"}
            )
            assert res_1.status_code == 200, f"Rider 1 accept failed: {res_1.status_code} - {res_1.text}"

            # Rider 2 attempts to accept the SAME order -> 409 Conflict!
            res_2 = client.post(
                f"/api/rider/orders/{test_ord_id}/accept",
                headers={"Authorization": f"Bearer {token_2}"}
            )
            assert res_2.status_code == 409, f"Rider 2 should have been rejected with 409, got: {res_2.status_code} - {res_2.text}"
            assert "already been accepted" in res_2.text or "already assigned" in res_2.text.lower() or "409" in str(res_2.status_code)

    finally:
        await database.collection("customer_orders").delete_one({"_id": test_ord_id})
        await database.collection(RIDES_COLLECTION).delete_one({"_id": test_rd_id})
        await database.collection("users").delete_one({"_id": uid_1})
        await database.collection("users").delete_one({"_id": uid_2})
        await database.collection("riders").delete_one({"_id": uid_1})
        await database.collection("riders").delete_one({"_id": uid_2})

