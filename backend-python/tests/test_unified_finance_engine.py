"""Automated unit and integration tests for QuickPress Unified Financial & Order Engine.

Validates:
1. Dynamic pricing and distance slabs (0-2km ₹30, 2-5km ₹40, etc.).
2. Component-level GST calculation (5% laundry, 18% services) and Intra-state (CGST+SGST) vs Inter-state (IGST).
3. Free delivery threshold and subsidy funding tracking.
4. Single Order Financial object initialization and immutable `financial_ledger` stream.
5. Payment received event recording.
6. Stage-aware cancellation charges and refund calculation.
7. Refund processing with ceiling enforcement.
8. Penalty application on partners/riders with ledger event.
9. Weekly settlement batch generation and P&L metrics.
"""

import pytest
from app.db.client import database
from app.services.unified_finance_service import unified_finance_service


@pytest.fixture(autouse=True)
async def clean_finance_test_data():
    await database.collection("financial_rules").delete_many({})
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0
    await database.collection("order_financials").delete_many({"_id": {"$regex": "^test-fin-"}})
    await database.collection("financial_ledger").delete_many({"orderId": {"$regex": "^test-fin-"}})
    await database.collection("financial_penalties").delete_many({"orderId": {"$regex": "^test-fin-"}})
    yield
    await database.collection("financial_rules").delete_many({})
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0
    await database.collection("order_financials").delete_many({"_id": {"$regex": "^test-fin-"}})
    await database.collection("financial_ledger").delete_many({"orderId": {"$regex": "^test-fin-"}})
    await database.collection("financial_penalties").delete_many({"orderId": {"$regex": "^test-fin-"}})


@pytest.mark.asyncio
async def test_checkout_pricing_and_intra_state_gst():
    """Validates distance slabs, 5% laundry GST, 18% service GST, and intra-state CGST/SGST split."""
    items = [{"price": 200.0, "quantity": 2}]  # Subtotal 400.0
    price_res = await unified_finance_service.calculate_checkout_price(
        items=items,
        distance_km=3.5,  # Matches 2-5km slab: ₹40 delivery fee
        coupon_discount=50.0,
        customer_state="Uttar Pradesh",
        partner_state="Uttar Pradesh",
    )

    assert price_res["itemsSubtotal"] == 400.0
    assert price_res["actualDeliveryFee"] == 40.0
    assert price_res["customerDeliveryFee"] == 40.0
    assert price_res["taxableLaundry"] == 350.0  # 400 - 50 coupon
    assert price_res["laundryGst"] == 17.5  # 5% of 350
    # Service fees: 40 delivery + 10 platform + 15 handling = 65. 18% of 65 = 11.7
    assert price_res["serviceGst"] == 11.7
    assert price_res["totalGst"] == 29.2  # 17.5 + 11.7
    assert price_res["cgst"] == 14.6
    assert price_res["sgst"] == 14.6
    assert price_res["igst"] == 0.0
    assert price_res["customerPayable"] == 444.2


@pytest.mark.asyncio
async def test_free_delivery_subsidy_and_inter_state_igst():
    """Validates free delivery subsidy source and inter-state IGST calculation."""
    items = [{"price": 300.0, "quantity": 2}]  # Subtotal 600.0 (> ₹499 free delivery threshold)
    price_res = await unified_finance_service.calculate_checkout_price(
        items=items,
        distance_km=6.0,  # 5-8km slab: ₹60 delivery fee
        customer_state="Delhi",
        partner_state="Uttar Pradesh",
    )

    assert price_res["grossServiceValue"] == 600.0
    assert price_res["isFreeDelivery"] is True
    assert price_res["customerDeliveryFee"] == 0.0
    assert price_res["deliverySubsidy"] == 60.0
    assert price_res["deliverySubsidySource"] == "QUICKPRESS_FUNDED"
    # Inter-state
    assert price_res["cgst"] == 0.0
    assert price_res["sgst"] == 0.0
    assert price_res["igst"] == price_res["totalGst"]


@pytest.mark.asyncio
async def test_single_order_financial_ledger_lifecycle():
    """Validates immutable financial ledger events: ORDER_CREATED -> PAYMENT_RECEIVED."""
    order_id = "test-fin-order-101"
    customer_id = "test-cust-1"
    partner_id = "test-part-1"

    pricing = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 500.0, "quantity": 1}],
        distance_km=2.0,
    )

    # 1. Initialize Order Financials
    fin = await unified_finance_service.initialize_order_financials(
        order_id=order_id,
        customer_id=customer_id,
        pricing_data=pricing,
        partner_id=partner_id,
        monthly_partner_orders=150,  # Silver Tier: 15%
    )
    assert fin["orderId"] == order_id
    assert fin["partnerTier"] == "Silver"
    assert fin["commissionRate"] == 0.15
    assert fin["paymentStatus"] == "PAYMENT_PENDING"

    # 2. Record Payment Received
    pay_res = await unified_finance_service.record_payment_received(
        order_id=order_id,
        payment_id="pay_RZP_123456",
        gateway="RAZORPAY",
        method="UPI",
    )
    assert pay_res["ok"] is True

    # 3. Inspect Full Order Financials and Ledger Stream
    full = await unified_finance_service.get_order_financials_with_ledger(order_id)
    assert full["financials"]["paymentStatus"] == "PAID"
    assert full["totalLedgerEntries"] == 2
    tx_types = [tx["transactionType"] for tx in full["ledger"]]
    assert tx_types == ["ORDER_CREATED", "PAYMENT_RECEIVED"]


@pytest.mark.asyncio
async def test_cancellation_and_refund_engine():
    """Validates stage-based cancellation charges and refund ceiling enforcement."""
    order_id = "test-fin-order-cancel-202"
    pricing = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 1000.0, "quantity": 1}],
    )

    await unified_finance_service.initialize_order_financials(
        order_id=order_id,
        customer_id="cust-202",
        pricing_data=pricing,
    )
    await unified_finance_service.record_payment_received(
        order_id=order_id,
        payment_id="pay_RZP_999",
    )

    # A. Check calculation at PICKUP_ARRIVED (Fee: ₹40, Refund: 80%)
    calc = await unified_finance_service.calculate_cancellation_refund(order_id, "PICKUP_ARRIVED")
    assert calc["cancellationFee"] == 40.0
    assert calc["refundPercentage"] == 80.0
    assert calc["refundableAmount"] > 0

    # B. Process partial refund
    ref_res = await unified_finance_service.process_refund(
        order_id=order_id,
        refund_amount=500.0,
        reason="Customer partial cancellation",
    )
    assert ref_res["ok"] is True
    assert ref_res["refundStatus"] == "PARTIALLY_REFUNDED"

    # C. Verify refund ceiling: cannot refund more than paid
    with pytest.raises(ValueError, match="Refund ceiling exceeded"):
        await unified_finance_service.process_refund(
            order_id=order_id,
            refund_amount=2000.0,  # Exceeds total
            reason="Illegal excessive refund",
        )


@pytest.mark.asyncio
async def test_penalties_and_weekly_settlements():
    """Validates penalty application and settlement batch creation."""
    order_id = "test-fin-order-penalty-303"
    pricing = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 250.0, "quantity": 2}],
    )
    await unified_finance_service.initialize_order_financials(
        order_id=order_id,
        customer_id="cust-303",
        pricing_data=pricing,
        partner_id="partner-xyz",
        rider_id="rider-abc",
    )

    # Apply penalty
    pen = await unified_finance_service.apply_penalty(
        partner_id="partner-xyz",
        rider_id="rider-abc",
        order_id=order_id,
        penalty_type="orderMishandling",
        reason="Missing buttons on shirt",
    )
    assert pen["ok"] is True
    assert pen["penalty"]["amount"] == 150.0

    # Generate settlement batch
    batch = await unified_finance_service.generate_weekly_settlements()
    assert batch["status"] == "GENERATED"
    assert "totalPartnerPayable" in batch
    assert "totalRiderPayable" in batch
