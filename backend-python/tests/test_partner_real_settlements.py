import pytest
from datetime import datetime, timezone
from app.db.client import database
from app.services.settlement_engine import settlement_engine


@pytest.mark.asyncio
async def test_partner_settlement_zero_orders_strictly_real():
    """Verify that when a partner has no orders in a cycle, zero mock data is injected."""
    breakdown = await settlement_engine.compute_cycle_breakdown(
        partner_id="PRT-NON-EXISTENT-999",
        cycle_id="cycle-20260824",
    )

    assert breakdown["totalOrders"] == 0
    assert breakdown["estNetPayout"] == 0.0
    assert breakdown["orders"] == []
    assert breakdown["netOrderValueA"]["total"] == 0.0
    assert breakdown["netOrderValueA"]["itemSubtotal"] == 0.0
    assert breakdown["orderLevelDeductionsC"]["total"] == 0.0
    assert breakdown["taxDeductionsD"]["total"] == 0.0
    assert breakdown["bankDetails"]["utr"] is None


@pytest.mark.asyncio
async def test_partner_settlement_with_real_order():
    """Verify that real orders in the cycle are correctly mapped without demo fallbacks."""
    test_pid = "PRT-TEST-REAL-001"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Insert a real delivered order
    await database.collection("customer_orders").insert_one({
        "_id": "ord-test-real-1",
        "orderNumber": "QP-REAL-99",
        "partnerId": test_pid,
        "customer": {"name": "Test Real Customer", "phone": "9876543210"},
        "items": [{"name": "Dry Clean Suit", "qty": 2, "price": 250.0}],
        "financialSnapshot": {
            "itemsSubtotal": 500.0,
            "platformEstimatedCommission": 75.0,
            "partnerEstimatedEarnings": 420.0,
        },
        "total": 500.0,
        "status": "delivered",
        "createdAt": now_iso,
        "deliveredAt": now_iso,
    })

    try:
        breakdown = await settlement_engine.compute_cycle_breakdown(
            partner_id=test_pid,
            cycle_id="current",
        )

        assert breakdown["totalOrders"] == 1
        assert len(breakdown["orders"]) == 1
        ord_entry = breakdown["orders"][0]
        assert ord_entry["orderId"] == "ord-test-real-1"
        assert ord_entry["orderCode"] == "QP-REAL-99"
        assert ord_entry["customerName"] == "Test Real Customer"
        assert ord_entry["grossValue"] == 500.0
        assert ord_entry["commission"] == 75.0
        assert ord_entry["netEarning"] == 420.0
        assert ord_entry["status"] == "DELIVERED"
        assert breakdown["estNetPayout"] > 0.0
    finally:
        await database.collection("customer_orders").delete_one({"_id": "ord-test-real-1"})


@pytest.mark.asyncio
async def test_partner_overview_cycles_bounded_to_join_date():
    """Verify that cycles before partner joined are never returned in overview."""
    test_pid = "PRT-JOIN-TEST-001"
    await database.collection("partner_profiles").insert_one({
        "_id": test_pid,
        "partnerId": test_pid,
        "createdAt": "2026-09-06T11:00:00Z",
        "businessName": "Test Join Laundry",
    })

    try:
        overview = await settlement_engine.get_overview(test_pid)
        # Current cycle is present
        assert overview["currentCycle"]["cycleId"] == "current"
        # Since partner joined on 2026-09-06 and had 0 past orders, pastCycles is empty
        assert overview["pastCycles"] == []
        assert overview["filterOptions"] == []
    finally:
        await database.collection("partner_profiles").delete_one({"_id": test_pid})

