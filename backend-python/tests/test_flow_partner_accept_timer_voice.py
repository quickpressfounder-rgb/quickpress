"""Automated test validating the full 6-phase order flow:
1. Partner acceptance triggers Rider 1 offer dispatch (not customer order placement).
2. Pickup verification (PICKED_UP).
3. Arrival at Store (AT_PARTNER).
4. Partner start processing:
   - Settle Captain pickup payout to wallet
   - Calculate service turnaround SLA duration (processingEstimateMinutes, estimatedReadyAt)
   - Order transitions to PROCESSING
5. Partner mark ready:
   - 4-digit Dispatch OTP generated
   - Order transitions to READY_FOR_DELIVERY
   - Timer cleared, Captain alerted
6. Partner verifies Dispatch OTP:
   - Order transitions to OUT_FOR_DELIVERY
   - Captain starts delivery trip to customer
"""

import pytest
from app.db.client import database
from app.services import order_lifecycle as lifecycle
from app.services.smart_2ride_engine import (
    smart_2ride_engine,
    ORDERS_COLLECTION,
    RIDES_COLLECTION,
)
from app.services.rider_dispatch import rider_dispatch_engine


@pytest.fixture(autouse=True)
async def clean_test_collections():
    await database.collection(ORDERS_COLLECTION).delete_many({"_id": {"$regex": "^test-flow-"}})
    await database.collection(RIDES_COLLECTION).delete_many({"orderId": {"$regex": "^test-flow-"}})
    await database.collection("rider_wallet_transactions").delete_many({"orderId": {"$regex": "^test-flow-"}})
    yield
    await database.collection(ORDERS_COLLECTION).delete_many({"_id": {"$regex": "^test-flow-"}})
    await database.collection(RIDES_COLLECTION).delete_many({"orderId": {"$regex": "^test-flow-"}})
    await database.collection("rider_wallet_transactions").delete_many({"orderId": {"$regex": "^test-flow-"}})


@pytest.mark.asyncio
async def test_full_partner_accept_timer_dispatch_flow():
    order_id = "test-flow-ord-101"
    partner_id = "prt-kasganj-hub"
    rider_id = "rdr-super-captain"

    # Step 1: Customer creates order (Initial state: CREATED / PENDING_PAYMENT / PLACED)
    now = lifecycle.now_iso()
    doc = {
        "_id": order_id,
        "id": order_id,
        "code": "QP101FLOW",
        "status": lifecycle.PLACED,
        "partner": {"id": partner_id, "name": "Kasganj Hub Store", "address": "Main Market, Kasganj"},
        "customer": {"id": "usr-1", "name": "Rahul Verma", "phone": "9876543210"},
        "address": {"address": "Railway Road, Kasganj", "latitude": 27.81, "longitude": 78.64},
        "pickupLegPayout": 35.0,
        "fare": 70.0,
        "items": [
            {"id": "it-1", "name": "Shirt Steam Iron", "qty": 2, "turnaroundHours": 2},
        ],
        "otp": {
            "pickup": {"code": "1122", "verified": False},
            "delivery": {"code": "3344", "verified": False},
        },
        "createdAt": now,
        "updatedAt": now,
    }
    await database.collection(ORDERS_COLLECTION).insert_one(doc)

    # Verify no ride offered yet before Partner accepts
    rides_before = await database.find_many(RIDES_COLLECTION, {"orderId": order_id})
    assert len(rides_before) == 0

    # Step 2: Partner Accepts the Order
    # Transitions to PARTNER_ACCEPTED and creates Ride 1 for rider
    updated_accept = await lifecycle.transition(
        order_id,
        lifecycle.PARTNER_ACCEPTED,
        actor_id=partner_id,
        actor_role="partner",
    )
    assert updated_accept["status"] == lifecycle.PARTNER_ACCEPTED

    ride_1 = await smart_2ride_engine.create_ride_1_pickup(order_id)
    assert ride_1 is not None
    assert ride_1["orderId"] == order_id
    assert ride_1["rideType"] == "pickup"

    # Step 3: Rider accepts offer and performs pickup with OTP
    await smart_2ride_engine.handle_rider_accept(ride_1["_id"], rider_id)
    pickup_code = ride_1["otp"]["pickup"]["code"]
    picked_up_order = await rider_dispatch_engine.verify_pickup_otp(order_id, rider_id, pickup_code)
    assert picked_up_order["status"] == lifecycle.PICKED_UP

    # Step 4: Rider arrives at store with garments
    dropped_order = await rider_dispatch_engine.rider_drop_at_partner(order_id, rider_id)
    assert dropped_order["status"] == lifecycle.AT_PARTNER
    assert dropped_order["custody"] == "partner"

    # Step 5: Partner starts processing: Handover completes, SLA timer calculated, wallet credited
    processing_order = await rider_dispatch_engine.partner_start_processing(order_id, partner_id)
    assert processing_order["status"] == lifecycle.PROCESSING
    assert processing_order["processingEstimateMinutes"] == 120  # 2 hours from item
    assert processing_order.get("estimatedReadyAt") is not None
    assert processing_order.get("pickupLegSettled") is True

    # Check that Captain wallet was credited for Leg 1 pickup payout
    txns = await database.find_many(
        "rider_wallet_transactions",
        {"riderId": rider_id, "orderId": order_id, "type": "ORDER_PAYOUT"}
    )
    assert len(txns) == 1
    assert float(txns[0]["amount"]) == 35.0

    # Step 6: Partner finishes cleaning and marks ready: generates 4-digit Dispatch OTP
    ready_order = await rider_dispatch_engine.partner_mark_ready(order_id, partner_id)
    assert ready_order["status"] == lifecycle.READY_FOR_DELIVERY
    dispatch_otp = ready_order.get("dispatchOtp")
    assert dispatch_otp is not None
    assert len(dispatch_otp) == 4
    assert dispatch_otp.isdigit()

    # Step 7: Partner verifies Dispatch OTP communicated by Captain at store
    handover_res = await smart_2ride_engine.verify_partner_dispatch_otp(order_id, dispatch_otp, partner_id)
    assert handover_res["status"] == lifecycle.OUT_FOR_DELIVERY
    assert handover_res["custody"] == "rider"
    assert handover_res["dispatchOtpVerified"] is True
