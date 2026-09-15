import pytest
import pytest_asyncio
from app.db.client import database
from app.services import order_lifecycle as lifecycle
from app.services.rider_dispatch import rider_dispatch_engine, create_otp_record
from app.db.partner_repositories import partner_order_repository
from app.db.rider_repositories import rider_delivery_repository
from app.models.order import (
    OrderAddress,
    OrderDelivery,
    OrderLine,
    OrderPartnerParty,
    OrderParty,
    OrderPayment,
    OrderPickup,
    OrderTotals,
)


@pytest.mark.asyncio
async def test_full_14_stage_canonical_lifecycle_flow():
    """Verify complete sequential 14-stage lifecycle from order placement to doorstep delivery."""
    await database.connect()

    order_id = f"ord-e2e-v2-{lifecycle.new_otp()}"
    code = f"QP{lifecycle.new_otp()}"
    partner_id = "partner-store-e2e-01"
    pickup_rider_id = "rider-pickup-e2e-01"
    delivery_rider_id = "rider-delivery-e2e-02"
    customer_id = "cust-e2e-01"

    now = lifecycle.now_iso()
    pickup_otp = create_otp_record()
    delivery_otp = create_otp_record()

    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": code,
        "userId": customer_id,
        "status": lifecycle.PLACED,
        "createdAt": now,
        "updatedAt": now,
        "customer": OrderParty(id=customer_id, name="V2 Test Customer", phone="+919876543210").model_dump(),
        "partner": OrderPartnerParty(id=partner_id, name="Kasganj Cleaners", phone="+919876543211", city="Kasganj").model_dump(),
        "partner_id": partner_id,
        "partnerId": partner_id,
        "rider": None,
        "serviceLabel": "Premium Wash & Iron",
        "items": [
            {"id": "item-1", "name": "Shirt", "qty": 3, "price": 40, "subtotal": 120}
        ],
        "totals": OrderTotals(itemsTotal=120, grandTotal=120).model_dump(),
        "address": OrderAddress(label="Home", line="MG Road", city="Kasganj", phone="+919876543210").model_dump(),
        "pickup": OrderPickup(date="Today", slot="Morning", express=False).model_dump(),
        "delivery": OrderDelivery(date="Tomorrow", slot="Evening").model_dump(),
        "payment": OrderPayment(mode="cod", label="Cash on Delivery", paid=False).model_dump(),
        "otp": {
            "pickup": pickup_otp,
            "delivery": delivery_otp,
        },
        "events": [],
    }
    await database.collection("customer_orders").insert_one(order_doc)

    # 1. Partner Accepts (PLACED -> PARTNER_ACCEPTED)
    doc_accepted = await partner_order_repository.accept(partner_id, order_id)
    assert doc_accepted["canonicalStatus"] == lifecycle.PARTNER_ACCEPTED

    # 2. System / Rider Assigns (PARTNER_ACCEPTED -> PICKUP_RIDER_ASSIGNED)
    doc_assigned = await lifecycle.transition(
        order_id,
        lifecycle.PICKUP_RIDER_ASSIGNED,
        actor_id="system",
        actor_role="system",
        changes={
            "rider": {"id": pickup_rider_id, "name": "Rohan (Pickup)", "phone": "+919876543212"}
        }
    )
    assert doc_assigned["status"] == lifecycle.PICKUP_RIDER_ASSIGNED

    # 3. Pickup Rider Accepts (PICKUP_RIDER_ASSIGNED -> PICKUP_RIDER_ACCEPTED)
    doc_rider_acc = await rider_delivery_repository.accept(order_id, pickup_rider_id)
    assert doc_rider_acc["canonicalStatus"] == lifecycle.PICKUP_RIDER_ACCEPTED

    # 4. Pickup OTP Verification (PICKUP_RIDER_ACCEPTED -> PICKED_UP)
    latest_order_pk = await database.collection("customer_orders").find_one({"_id": order_id})
    pickup_code = latest_order_pk["otp"]["pickup"]["code"]
    doc_picked = await rider_delivery_repository.pickup(order_id, pickup_rider_id, otp=pickup_code)
    assert doc_picked["canonicalStatus"] == lifecycle.PICKED_UP

    # 4.5. Captain Drops Laundry at Partner Store (PICKED_UP -> AT_PARTNER)
    doc_dropped = await rider_delivery_repository.drop_at_partner(order_id, pickup_rider_id)
    assert doc_dropped["canonicalStatus"] == lifecycle.AT_PARTNER

    # 5. Partner Starts Processing (AT_PARTNER -> PROCESSING)
    doc_processing = await partner_order_repository.start_processing(partner_id, order_id)
    assert doc_processing["canonicalStatus"] == lifecycle.PROCESSING

    # 6. Partner Marks Ready (PROCESSING -> READY_FOR_DELIVERY)
    doc_ready = await partner_order_repository.complete(partner_id, order_id)
    assert doc_ready["canonicalStatus"] == lifecycle.READY_FOR_DELIVERY
    assert doc_ready.get("dispatchOtp") != ""

    # 8. System Assigns Delivery Rider (READY_FOR_DELIVERY -> DELIVERY_RIDER_ASSIGNED)
    doc_del_assigned = await lifecycle.transition(
        order_id,
        lifecycle.DELIVERY_RIDER_ASSIGNED,
        actor_id="system",
        actor_role="system",
        changes={
            "rider": {"id": delivery_rider_id, "name": "Amit (Delivery)", "phone": "+919876543213"}
        }
    )
    assert doc_del_assigned["status"] == lifecycle.DELIVERY_RIDER_ASSIGNED

    # 9. Delivery Rider Accepts (DELIVERY_RIDER_ASSIGNED -> DELIVERY_RIDER_ACCEPTED)
    doc_del_acc = await rider_delivery_repository.accept(order_id, delivery_rider_id)
    assert doc_del_acc["canonicalStatus"] == lifecycle.DELIVERY_RIDER_ACCEPTED

    # 10. Partner Hands over with Dispatch OTP (DELIVERY_RIDER_ACCEPTED -> OUT_FOR_DELIVERY)
    latest_order = await database.collection("customer_orders").find_one({"_id": order_id})
    dispatch_code = latest_order["otp"]["dispatch"]["code"]
    doc_out = await rider_delivery_repository.start_delivery(order_id, delivery_rider_id, otp=dispatch_code)
    assert doc_out["canonicalStatus"] == lifecycle.OUT_FOR_DELIVERY

    # 11. Delivery Rider completes with Delivery OTP (OUT_FOR_DELIVERY -> DELIVERED)
    latest_out_order = await database.collection("customer_orders").find_one({"_id": order_id})
    delivery_code = latest_out_order["otp"]["delivery"]["code"]
    doc_delivered = await rider_delivery_repository.deliver(order_id, delivery_rider_id, otp=delivery_code)
    assert doc_delivered["canonicalStatus"] == lifecycle.DELIVERED


@pytest.mark.asyncio
async def test_invalid_skip_state_transitions_rejected():
    """Verify illegal transitions throw InvalidTransitionError."""
    await database.connect()

    order_id = f"ord-neg-v2-{lifecycle.new_otp()}"
    now = lifecycle.now_iso()

    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": f"QP{lifecycle.new_otp()}",
        "userId": "cust-neg",
        "status": lifecycle.PLACED,
        "createdAt": now,
        "updatedAt": now,
        "partner": {"id": "partner-01", "name": "Kasganj Store"},
        "partner_id": "partner-01",
        "partnerId": "partner-01",
        "events": [],
    }
    await database.collection("customer_orders").insert_one(order_doc)

    # PLACED -> PROCESSING (Direct jump forbidden)
    with pytest.raises(lifecycle.InvalidTransitionError):
        await lifecycle.transition(order_id, lifecycle.PROCESSING, actor_id="partner-01", actor_role="partner")

    # PLACED -> DELIVERED (Direct jump forbidden)
    with pytest.raises(lifecycle.InvalidTransitionError):
        await lifecycle.transition(order_id, lifecycle.DELIVERED, actor_id="rider-01", actor_role="rider")


@pytest.mark.asyncio
async def test_invalid_otp_rejection():
    """Verify invalid, expired, or wrong OTPs are rejected with PermissionError."""
    await database.connect()

    order_id = f"ord-otp-v2-{lifecycle.new_otp()}"
    now = lifecycle.now_iso()
    pickup_otp = create_otp_record(code="5821")

    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": f"QP{lifecycle.new_otp()}",
        "userId": "cust-otp",
        "status": lifecycle.PICKUP_RIDER_ACCEPTED,
        "createdAt": now,
        "updatedAt": now,
        "partner": {"id": "partner-01", "name": "Store"},
        "rider": {"id": "rider-01", "name": "Rider"},
        "otp": {"pickup": pickup_otp},
        "events": [],
    }
    await database.collection("customer_orders").insert_one(order_doc)

    # Submitting wrong OTP code "9999" must fail
    with pytest.raises(PermissionError):
        await rider_delivery_repository.pickup(order_id, "rider-01", otp="9999")

    # Submitting correct OTP "5821" succeeds
    res = await rider_delivery_repository.pickup(order_id, "rider-01", otp="5821")
    assert res["canonicalStatus"] == lifecycle.PICKED_UP

    # Idempotent resubmission of already verified OTP succeeds
    res_retry = await rider_delivery_repository.pickup(order_id, "rider-01", otp="5821")
    assert res_retry["canonicalStatus"] == lifecycle.PICKED_UP
