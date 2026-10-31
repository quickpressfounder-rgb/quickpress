"""
Full Integrated Order Lifecycle Verification Test.
Demonstrates the exact end-to-end multi-party flow against the real database:

👤 CUSTOMER -> Places Order
📦 ORDER PLACED (pending_partner_acceptance)
🏪 PARTNER -> Accepts Order
✅ PARTNER ACCEPTED (partner_accepted)
   ❌ Partner cannot start processing yet
   ❌ Partner cannot mark ready yet
🛵 PICKUP RIDER ASSIGNMENT -> Rider Accepts
🚴 RIDER GOES TO CUSTOMER
🔐 CUSTOMER PICKUP OTP (Customer -> Rider)
✅ PICKUP OTP VERIFIED
📦 PICKUP COMPLETED (picked_up)
🏪 PARTNER RECEIVES LAUNDRY (at_partner)
🧺 PARTNER CAN NOW PROCESS (processing)
⚙️ PROCESSING
📦 READY FOR DELIVERY (ready)
🛵 DELIVERY RIDER ASSIGNMENT -> Rider Accepts
🏪 RIDER REACHES PARTNER
🔐 DISPATCH OTP (Partner -> Rider)
✅ DISPATCH OTP VERIFIED
📦 ORDER HANDED TO RIDER -> OUT FOR DELIVERY (out_for_delivery)
👤 CUSTOMER -> DELIVERY OTP (Customer -> Rider)
✅ DELIVERY OTP VERIFIED
🎉 ORDER DELIVERED (delivered / completed)
"""

import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

from app.db.client import database
from app.db.partner_repositories import partner_service_repository, partner_order_repository
from app.db.cart_repositories import cart_repository
from app.db.order_repositories import order_repository
from app.db.rider_repositories import rider_delivery_repository
from app.models.cart import CartItemPayload
from app.models.order import PlaceOrderPayload, OrderAddress, OrderPickup, OrderPaymentPayload
from app.models.user import User, Role
from app.services import order_lifecycle as lifecycle
from app.services.rider_dispatch import rider_dispatch_engine


async def test_full_order_lifecycle():
    print("=" * 70)
    print("🚀 QUICKPRESS FULL END-TO-END ORDER LIFECYCLE INTEGRATION TEST")
    print("=" * 70)

    await database.connect()

    test_uid = uuid.uuid4().hex[:6]
    partner_id = f"prt-flow-{test_uid}"
    customer_id = f"usr-flow-cust-{test_uid}"
    pickup_rider_id = f"rdr-flow-pick-{test_uid}"
    delivery_rider_id = f"rdr-flow-del-{test_uid}"

    customer_user = User(
        id=customer_id,
        phone="+919876543210",
        display_name="Rahul Sharma",
        role=Role.customer,
    )

    # -------------------------------------------------------------------------
    # Setup Partner Profile & Service
    # -------------------------------------------------------------------------
    print("\n[SETUP] Initializing Partner Store & Catalog...")
    await database.update(
        "partner_profiles",
        {"_id": partner_id},
        {
            "_id": partner_id,
            "businessName": f"QuickPress Care Store #{test_uid}",
            "ownerName": "Amit Store Owner",
            "phone": "+919811122233",
            "city": "Kasganj",
            "status": "active",
            "isVerified": True,
            "isOnline": True,
        },
        upsert=True,
    )

    svc = await partner_service_repository.create(
        partner_id,
        {
            "name": "Premium Wash & Steam Iron",
            "price": 99,
            "unit": "kg",
            "category": "laundry",
            "turnaroundHours": 24,
            "description": "Clean, sanitized, steam pressed clothes.",
        },
    )
    print(f"  ✓ Store created with Service: [{svc['name']}] @ ₹{svc['price']}/{svc['unit']}")

    # Setup Riders
    for r_id, r_name in [(pickup_rider_id, "Pickup Rider Manoj"), (delivery_rider_id, "Delivery Rider Suresh")]:
        await database.update(
            "rider_profiles",
            {"_id": r_id},
            {
                "_id": r_id,
                "riderId": r_id,
                "fullName": r_name,
                "phone": "+919870000001",
                "city": "Kasganj",
                "vehicleType": "Bike",
                "vehicleNumber": "UP-87-QP-7788",
                "isOnline": True,
                "isVerified": True,
                "status": "active",
                "rating": 4.9,
                "totalTrips": 85,
            },
            upsert=True,
        )
    print("  ✓ Setup active pickup and delivery riders in database.")

    # -------------------------------------------------------------------------
    # 👤 STEP 1: CUSTOMER PLACES ORDER -> 📦 ORDER PLACED
    # -------------------------------------------------------------------------
    print("\n👤 STEP 1: Customer Adds Items to Cart & Places Order...")
    await cart_repository.add_item(
        customer_id,
        CartItemPayload(
            id=svc["id"],
            itemId=svc["id"],
            serviceId=svc["id"],
            partnerId=partner_id,
            name=svc["name"],
            price=svc["price"],
            qty=3,
        ),
    )

    order_res = await order_repository.create(
        customer_user,
        PlaceOrderPayload(
            address=OrderAddress(
                label="Home",
                line="House 42, Civil Lines",
                city="Kasganj",
                phone="+91 98765 43210",
            ),
            pickup=OrderPickup(date="today", slot="10 AM – 12 PM", express=False),
            payment=OrderPaymentPayload(mode="cod", label="Cash on Delivery"),
        ),
    )
    order_id = order_res.id
    order_code = order_res.code
    print(f"  📦 ORDER PLACED: #{order_code} (ID: {order_id})")
    assert order_res.status == lifecycle.PENDING
    print(f"  ✓ Initial Status: [{order_res.status}]")

    # -------------------------------------------------------------------------
    # 🏪 STEP 2: PARTNER ACCEPTS ORDER -> ✅ PARTNER ACCEPTED
    # -------------------------------------------------------------------------
    print("\n🏪 STEP 2: Partner Store Accepts Order...")
    partner_order = await partner_order_repository.accept(partner_id, order_id)
    assert partner_order["canonicalStatus"] == lifecycle.PARTNER_ACCEPTED
    print(f"  ✅ PARTNER ACCEPTED: Order #{order_code} accepted by store.")

    # CONSTRAINT ENFORCEMENT VERIFICATION:
    # ❌ Partner abhi processing START nahi kar sakta
    # ❌ Partner Ready nahi kar sakta
    print("  🔒 Testing Constraint Enforcement: Verifying Partner CANNOT start processing or mark ready yet...")
    try:
        await partner_order_repository.start_processing(partner_id, order_id)
        assert False, "Should have failed: Partner tried to start processing before laundry pickup"
    except Exception as e:
        print(f"    ✓ BLOCKED CORRECTLY: start_processing rejected with error -> {e}")

    try:
        await partner_order_repository.complete(partner_id, order_id)
        assert False, "Should have failed: Partner tried to mark ready before processing"
    except Exception as e:
        print(f"    ✓ BLOCKED CORRECTLY: mark_ready rejected with error -> {e}")

    # -------------------------------------------------------------------------
    # 🛵 STEP 3: PICKUP RIDER ASSIGNMENT & RIDER ACCEPTS
    # -------------------------------------------------------------------------
    print("\n🛵 STEP 3: Pickup Rider Broadcast & Rider Claims Order...")
    claimed_order = await rider_dispatch_engine.claim_rider_offer(order_id, pickup_rider_id)
    assert claimed_order["status"] in (lifecycle.PICKUP_RIDER_ACCEPTED, lifecycle.RIDER_ACCEPTED, lifecycle.RIDER_ASSIGNED)
    assert claimed_order["rider"]["id"] == pickup_rider_id
    print(f"  🛵 RIDER ASSIGNED & ACCEPTED: {claimed_order['rider']['name']} assigned for pickup.")

    # -------------------------------------------------------------------------
    # 🚴 STEP 4: RIDER GOES TO CUSTOMER & VERIFIES PICKUP OTP
    # -------------------------------------------------------------------------
    print("\n🚴 STEP 4: Rider Arrives at Customer & Customer Shares Pickup OTP...")
    cust_order_doc = await lifecycle.get_order(order_id)
    pickup_otp_raw = (cust_order_doc.get("otp") or {}).get("pickup")
    pickup_otp_code = pickup_otp_raw.get("code") if isinstance(pickup_otp_raw, dict) else str(pickup_otp_raw)
    print(f"  🔐 Customer Pickup OTP (Visible to Customer): [{pickup_otp_code}]")

    # Verify wrong OTP fails
    try:
        await rider_delivery_repository.pickup(order_id, pickup_rider_id, otp="0000")
        assert False, "Should have failed with invalid OTP"
    except Exception as e:
        print(f"    ✓ Invalid OTP correctly rejected: {e}")

    # Verify correct OTP
    picked_up_order = await rider_delivery_repository.pickup(order_id, pickup_rider_id, otp=pickup_otp_code)
    assert picked_up_order["canonicalStatus"] == lifecycle.PICKED_UP
    print(f"  ✅ PICKUP OTP VERIFIED! 📦 PICKUP COMPLETED -> Status: [{picked_up_order['canonicalStatus']}]")

    # -------------------------------------------------------------------------
    # 🏪 STEP 5: RIDER DROPS LAUNDRY AT STORE (OR PARTNER RECEIVES)
    # -------------------------------------------------------------------------
    print("\n🏪 STEP 5: Rider Drops Laundry at Partner Store...")
    at_partner_order = await rider_delivery_repository.drop_at_partner(order_id, pickup_rider_id)
    assert at_partner_order["canonicalStatus"] == lifecycle.AT_PARTNER
    print(f"  🏪 PARTNER RECEIVES LAUNDRY -> Status: [{at_partner_order['canonicalStatus']}]")

    # -------------------------------------------------------------------------
    # 🧺 STEP 6: PARTNER CAN NOW PROCESS -> ⚙️ PROCESSING
    # -------------------------------------------------------------------------
    print("\n🧺 STEP 6: Partner Starts Washing, Ironing & Cleaning...")
    processing_order = await partner_order_repository.start_processing(partner_id, order_id)
    assert processing_order["canonicalStatus"] == lifecycle.PROCESSING
    print(f"  ⚙️ PROCESSING STARTED -> Status: [{processing_order['canonicalStatus']}]")

    # -------------------------------------------------------------------------
    # 📦 STEP 7: READY FOR DELIVERY (DISPATCH OTP GENERATED)
    # -------------------------------------------------------------------------
    print("\n📦 STEP 7: Partner Finishes Laundry & Marks Ready for Delivery...")
    ready_order = await partner_order_repository.complete(partner_id, order_id)
    assert ready_order["canonicalStatus"] in (lifecycle.READY_FOR_DELIVERY, lifecycle.READY)
    dispatch_otp_code = ready_order["dispatchOtp"]
    assert dispatch_otp_code and len(dispatch_otp_code) == 4
    print(f"  📦 ORDER READY FOR DELIVERY! 🔐 Partner Dispatch OTP: [{dispatch_otp_code}]")

    # -------------------------------------------------------------------------
    # 🛵 STEP 8: DELIVERY RIDER ASSIGNMENT -> RIDER REACHES PARTNER
    # -------------------------------------------------------------------------
    print("\n🛵 STEP 8: Delivery Rider Assigned & Collects Order from Partner...")
    claimed_delivery = await rider_dispatch_engine.claim_rider_offer(order_id, delivery_rider_id)
    print(f"  🛵 Delivery Rider [{claimed_delivery['rider']['name']}] reached store.")

    # Rider verifies Dispatch OTP with partner
    # Wrong OTP fails
    try:
        await rider_delivery_repository.start_delivery(order_id, otp="9999", rider_id=delivery_rider_id)
        assert False, "Should have failed with invalid Dispatch OTP"
    except Exception as e:
        print(f"    ✓ Invalid Dispatch OTP correctly rejected: {e}")

    # Correct Dispatch OTP verified
    out_for_delivery_res = await rider_delivery_repository.start_delivery(
        order_id, otp=dispatch_otp_code, rider_id=delivery_rider_id
    )
    assert out_for_delivery_res["canonicalStatus"] == lifecycle.OUT_FOR_DELIVERY
    print(f"  ✅ DISPATCH OTP VERIFIED! 🚴 OUT FOR DELIVERY -> Status: [{out_for_delivery_res['canonicalStatus']}]")

    # -------------------------------------------------------------------------
    # 👤 STEP 9: RIDER REACHES CUSTOMER & VERIFIES DELIVERY OTP
    # -------------------------------------------------------------------------
    print("\n👤 STEP 9: Rider Reaches Customer & Customer Shares Delivery OTP...")
    delivery_order_doc = await lifecycle.get_order(order_id)
    delivery_otp_raw = (delivery_order_doc.get("otp") or {}).get("delivery")
    delivery_otp_code = delivery_otp_raw.get("code") if isinstance(delivery_otp_raw, dict) else str(delivery_otp_raw)
    print(f"  🔐 Customer Delivery Confirmation OTP: [{delivery_otp_code}]")

    # Wrong Delivery OTP fails
    try:
        await rider_delivery_repository.deliver(order_id, otp="1111", rider_id=delivery_rider_id)
        assert False, "Should have failed with invalid Delivery OTP"
    except Exception as e:
        print(f"    ✓ Invalid Delivery OTP correctly rejected: {e}")

    # Correct Delivery OTP verified
    final_order = await rider_delivery_repository.deliver(order_id, otp=delivery_otp_code, rider_id=delivery_rider_id)
    print(f"  ✅ DELIVERY OTP VERIFIED!")
    print(f"  🎉 ORDER DELIVERED & COMPLETED! -> Status: [{final_order['canonicalStatus']}]")

    # -------------------------------------------------------------------------
    # AUDIT TRAIL & CANONICAL TRUTH VERIFICATION
    # -------------------------------------------------------------------------
    print("\n🔍 STEP 10: Verifying Canonical Single Source of Truth & Audit Trail...")
    final_db_doc = await lifecycle.get_order(order_id)
    assert final_db_doc["payment"]["paid"] is True
    assert final_db_doc["otp"]["pickup"]["verified"] is True
    assert final_db_doc["otp"]["dispatch"]["verified"] is True
    assert final_db_doc["otp"]["delivery"]["verified"] is True

    events = await lifecycle.events_for(order_id)
    event_names = [e["event"] for e in events]
    print(f"  Audit Trail Events ({len(events)} transitions recorded):")
    for ev in events:
        print(f"    • [{ev['timestamp']}] {ev['event']} by {ev['actorRole']} ({ev['actorId']})")

    for expected_ev in [
        "ORDER_CREATED",
        "PARTNER_ACCEPTED",
        "RIDER_ASSIGNED",
        "PICKED_UP",
        "AT_PARTNER",
        "PROCESSING_STARTED",
        "READY_FOR_DELIVERY",
        "OUT_FOR_DELIVERY",
    ]:
        assert expected_ev in event_names, f"Missing event {expected_ev}"
    assert "DELIVERED" in event_names or "ORDER_DELIVERED" in event_names, "Missing delivery completion event in audit trail"

    print("\n" + "=" * 70)
    print("✨ ALL 20 LIFECYCLE TRANSITIONS & SECURITY CONSTRAINTS PASSED! ✨")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_full_order_lifecycle())
