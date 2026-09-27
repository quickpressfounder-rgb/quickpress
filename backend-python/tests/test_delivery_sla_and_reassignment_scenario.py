import pytest
import pytest_asyncio
from app.db.client import database
from app.services import order_lifecycle as lifecycle
from app.services.smart_2ride_engine import smart_2ride_engine
from app.db.rider_earnings_ledger import rider_earnings_ledger
from app.services.rider_dispatch import create_otp_record
from app.models.order import (
    OrderAddress,
    OrderDelivery,
    OrderPartnerParty,
    OrderPayment,
    OrderPickup,
    OrderTotals,
)


@pytest.mark.asyncio
async def test_delivery_sla_2min_timeout_and_rider2_reassignment():
    """Test Scenario:
    1. Rider 1 completes pickup leg and drops clothes at store -> Full pickup fare credited with 0 deduction.
    2. Store marks order ready -> Delivery leg offered to Rider 1.
    3. Rider 1 fails to accept/report to store within 2 minutes -> handle_store_arrival_timeout triggers:
       - 20% deducted strictly from delivery fare -> Diverted to reassignment pool.
       - Rider 1 pickup earning remains 100% protected.
       - Order status transitions to DELIVERY_FAILED -> DELIVERY_RIDER_REASSIGNING.
    4. Rider 2 is assigned (DELIVERY_RIDER_2_ASSIGNED) with base delivery fare + 20% bonus pool.
    5. Rider 2 delivers to customer with OTP.
    6. Rider 2 receives base fare + reassignment pool transfer.
    7. Zero-sum balancing verification in rider_earnings_ledger.
    """
    await database.connect()

    order_id = f"ord-sla-test-{lifecycle.new_otp()}"
    code = f"QP{lifecycle.new_otp()}"
    partner_id = "partner-sla-store"
    rider_1_id = "rider-1-pickup"
    rider_2_id = "rider-2-delivery"
    customer_id = "cust-sla-01"

    now = lifecycle.now_iso()
    pickup_otp = create_otp_record()
    delivery_otp = create_otp_record()

    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": code,
        "userId": customer_id,
        "status": lifecycle.STORE_DROP_CONFIRMED,
        "createdAt": now,
        "updatedAt": now,
        "customer": {"id": customer_id, "name": "SLA Test Cust", "phone": "+919876543210"},
        "partner": OrderPartnerParty(id=partner_id, name="SLA Partner", phone="+919876543211", city="Kasganj").model_dump(),
        "partner_id": partner_id,
        "partnerId": partner_id,
        "serviceLabel": "Express Wash",
        "items": [{"id": "item-1", "name": "Suit", "qty": 1, "price": 200, "subtotal": 200}],
        "totals": OrderTotals(itemsTotal=200, grandTotal=200).model_dump(),
        "address": OrderAddress(label="Home", line="Civil Lines", city="Kasganj", phone="+919876543210").model_dump(),
        "pickup": OrderPickup(date="Today", slot="Morning", express=True).model_dump(),
        "delivery": OrderDelivery(date="Tomorrow", slot="Evening").model_dump(),
        "payment": OrderPayment(mode="cod", label="Cash on Delivery", paid=False).model_dump(),
        "otp": {
            "pickup": pickup_otp,
            "delivery": delivery_otp,
        },
        "pickupRiderId": rider_1_id,
    }

    # Insert test order
    await database.collection("customer_orders").delete_many({"_id": order_id})
    await database.collection("customer_orders").insert_one(order_doc)

    # 1. Simulate Leg 1 (Pickup) settlement: Rider 1 gets full pickup fare (e.g. ₹50) with 0 deduction
    pickup_base = 50.0
    await rider_earnings_ledger.record_entry(
        order_id=order_id,
        rider_id=rider_1_id,
        trip_type="PICKUP",
        base_earning=pickup_base,
        deduction=0.0,
        deduction_percentage=0.0,
        transfer_amount=0.0,
        final_earning=pickup_base,
        reason="Pickup Leg completed successfully",
        status="SETTLED",
    )

    # Insert delivery ride document with base delivery fare = ₹100.00
    base_delivery_fare = 100.0
    await database.collection("rides").delete_many({"orderId": order_id})
    await database.collection("rides").insert_one({
        "_id": f"ride-del-{order_id}",
        "orderId": order_id,
        "rideType": "delivery",
        "riderId": rider_1_id,
        "status": "assigned",
        "fare": base_delivery_fare,
        "estimatedEarning": base_delivery_fare,
        "createdAt": now,
    })

    # 2. Trigger 2-Minute SLA Timeout for Rider 1
    # Rider 1 failed to report to partner store within 2 minutes
    result = await smart_2ride_engine.handle_store_arrival_timeout(order_id, rider_1_id)
    assert result.get("ok") is True
    assert result.get("reassignmentPool") == 20.0  # 20% of ₹100 = ₹20.00

    # 3. Check Order State after SLA Timeout
    updated_order = await database.collection("customer_orders").find_one({"_id": order_id})
    assert updated_order["reassignmentPool"] == 20.0
    assert updated_order["deliveryFailedReason"] == "Store arrival SLA (2 mins) breached"
    assert updated_order["originalRiderId"] == rider_1_id

    # 4. Check Rider 1 Ledger: Pickup earning is 100% safe (₹50), Delivery fare deducted by 20% (₹20)
    entries = await rider_earnings_ledger.get_ledger_for_order(order_id)
    r1_pickup = next((e for e in entries if e["rider_id"] == rider_1_id and e["trip_type"] == "PICKUP"), None)
    assert r1_pickup is not None
    assert r1_pickup["final_earning"] == 50.0
    assert r1_pickup["deduction"] == 0.0

    r1_delivery = next((e for e in entries if e["rider_id"] == rider_1_id and e["trip_type"] == "DELIVERY"), None)
    assert r1_delivery is not None
    assert r1_delivery["base_earning"] == 100.0
    assert r1_delivery["deduction"] == 20.0
    assert r1_delivery["final_earning"] == 80.0
    assert r1_delivery["status"] == "DEDUCTED"

    # 5. Assign Rider 2 to the delivery leg
    await database.collection("rides").update_one(
        {"orderId": order_id, "rideType": "delivery"},
        {
            "$set": {
                "riderId": rider_2_id,
                "isReassigned": True,
                "extraBonusAmount": 20.0,
                "reassignmentPool": 20.0,
                "fare": 120.0,
            }
        },
    )
    await database.collection("customer_orders").update_one(
        {"_id": order_id},
        {
            "$set": {
                "status": lifecycle.DELIVERY_RIDER_2_ASSIGNED,
                "deliveryRiderId": rider_2_id,
                "assignedRiderId": rider_2_id,
            }
        },
    )

    # 6. Rider 2 verifies delivery OTP and completes delivery
    delivery_code = delivery_otp["code"]
    verify_res = await smart_2ride_engine.verify_delivery_otp(order_id, delivery_code, rider_2_id)
    assert verify_res.get("ok") is True

    # 7. Check Rider 2 Earning in Ledger: Base (100) + Reassignment Pool (20) = ₹120.00
    updated_entries = await rider_earnings_ledger.get_ledger_for_order(order_id)
    r2_entry = next((e for e in updated_entries if e["rider_id"] == rider_2_id and e["trip_type"] == "DELIVERY"), None)
    assert r2_entry is not None
    assert r2_entry["base_earning"] == 100.0
    assert r2_entry["transfer_amount"] == 20.0
    assert r2_entry["final_earning"] == 120.0
    assert r2_entry["status"] == "SETTLED"

    # 8. Zero-sum verification
    # Rider 1 delivery deduction: -20
    # Rider 2 bonus transfer: +20
    # Sum of transfers & deductions across delivery leg = 0
    total_deductions = sum(float(e.get("deduction") or 0.0) for e in updated_entries)
    total_transfers = sum(float(e.get("transfer_amount") or 0.0) for e in updated_entries)
    assert total_deductions == 20.0
    assert total_transfers == 20.0
    assert round(total_deductions - total_transfers, 2) == 0.0
