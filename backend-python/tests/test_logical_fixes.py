"""Tests for Production Logical Bug Fixes.

Validates:
1. FIRSTFREE (₹75) and QUICK50 (₹50) coupons are validated server-side.
2. Intra-state GST normalization for Kasganj, UP orders (CGST + SGST split, IGST = 0).
3. Suspended or offline delivery riders cannot accept trips.
"""

from __future__ import annotations

import pytest
from app.db.order_repositories import order_repository
from app.services.unified_finance_service import unified_finance_service
from app.services.smart_2ride_engine import smart_2ride_engine, RIDES_COLLECTION, RIDERS_COLLECTION
from app.db.client import database


class DummyItem:
    def __init__(self, price: float, qty: int):
        self.price = price
        self.qty = qty


@pytest.mark.asyncio
async def test_firstfree_and_quick50_coupons_validated():
    """Ensure FIRSTFREE gives ₹75 and QUICK50 gives ₹50 server-side."""
    items = [DummyItem(price=100.0, qty=2)]  # Subtotal = ₹200

    # FIRSTFREE
    disc_ff, code_ff = await order_repository._validate_and_compute_coupon("FIRSTFREE", 75, items)
    assert code_ff == "FIRSTFREE"
    assert disc_ff == 75

    # QUICK50
    disc_q50, code_q50 = await order_repository._validate_and_compute_coupon("QUICK50", 50, items)
    assert code_q50 == "QUICK50"
    assert disc_q50 == 50


@pytest.mark.asyncio
async def test_kasganj_up_gst_is_intra_state_cgst_sgst():
    """Ensure Kasganj, UP address is normalized to intra-state (CGST + SGST), never IGST."""
    pricing = await unified_finance_service.calculate_checkout_price(
        items=[{"name": "Dry Clean", "price": 200.0, "quantity": 1}],
        customer_state="Kasganj, Uttar Pradesh 207123",
        partner_state="Uttar Pradesh",
    )
    # Intra-state: CGST and SGST must be > 0, IGST must be 0
    assert pricing["igst"] == 0.0
    assert pricing["cgst"] > 0.0
    assert pricing["sgst"] > 0.0
    assert pricing["cgst"] == pricing["sgst"]


@pytest.mark.asyncio
async def test_suspended_or_offline_rider_cannot_claim_ride():
    """Ensure a suspended or offline rider is blocked with descriptive error upon accept."""
    ride_id = "test-ride-susp-001"
    rider_susp_id = "rider-susp-test"
    rider_off_id = "rider-off-test"

    # Seed test ride
    await database.collection(RIDES_COLLECTION).update_one(
        {"_id": ride_id},
        {"$set": {"_id": ride_id, "status": "OFFER_SENT", "orderId": "ord-test-01", "city": "Kasganj"}},
        upsert=True,
    )

    # Seed suspended rider
    await database.collection(RIDERS_COLLECTION).update_one(
        {"_id": rider_susp_id},
        {"$set": {"_id": rider_susp_id, "status": "suspended", "city": "Kasganj", "isOnline": True}},
        upsert=True,
    )

    # Seed offline rider
    await database.collection(RIDERS_COLLECTION).update_one(
        {"_id": rider_off_id},
        {"$set": {"_id": rider_off_id, "status": "approved", "city": "Kasganj", "isOnline": False, "dutyStatus": "OFF DUTY"}},
        upsert=True,
    )

    # 1. Suspended rider must be rejected
    with pytest.raises(ValueError) as exc1:
        await smart_2ride_engine.handle_rider_accept(ride_id, rider_susp_id)
    assert "ACCOUNT_SUSPENDED" in str(exc1.value)

    # 2. Offline rider must be rejected
    with pytest.raises(ValueError) as exc2:
        await smart_2ride_engine.handle_rider_accept(ride_id, rider_off_id)
    assert "RIDER_OFFLINE" in str(exc2.value)
