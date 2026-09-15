"""Integration and Unit Tests for Unified Finance Engine, Dynamic Rules, and Admin P&L Ledger.

Tests:
1. Fetch and update dynamic finance rules with validation and audit logging.
2. Verify pricing calculations immediately reflect admin-updated rules.
3. Order lifecycle financial initialization and immutable ledger recording.
4. Comprehensive order simulation checking mathematical reconciliation:
   Customer Payable + Subsidies == Partner Net + Rider Payout + Platform Margin + Total Tax + Gateway Cost
5. Dynamic cancellation fee and refund computation based on configured stage policies.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.client import database
from app.services.unified_finance_service import unified_finance_service


@pytest.fixture(autouse=True)
async def clean_test_finance_data():
    yield
    await database.collection("financial_rules").delete_many({})
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0
    await database.collection("financial_audit_logs").delete_many({"adminId": "test-admin"})


@pytest.mark.asyncio
async def test_finance_rules_lifecycle_and_audit():
    """Test getting, updating, and auditing dynamic finance rules."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Get current active rules
        res = await client.get("/api/finance-engine/rules")
        assert res.status_code == 200
        body = res.json()
        assert body["ok"] is True
        rules = body["rules"]
        assert "pricing" in rules
        assert "gst" in rules
        assert "commission" in rules
        assert "delivery" in rules
        assert "riderPayout" in rules
        assert "cancellation" in rules

        # 2. Update rules (e.g. adjust platformFee and handlingFee)
        update_payload = {
            "rules": {
                "pricing": {
                    **rules["pricing"],
                    "platformFee": 12.0,
                    "handlingFee": 18.0,
                    "minimumOrderValue": 199.0,
                },
                "gst": {
                    **rules["gst"],
                    "laundryGstRate": 0.05,
                    "platformGstRate": 0.18,
                },
            },
            "authorId": "test-admin",
            "reason": "Annual tariff adjustment",
        }
        put_res = await client.put("/api/finance-engine/rules", json=update_payload)
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["ok"] is True
        assert updated["rules"]["pricing"]["platformFee"] == 12.0
        assert updated["rules"]["pricing"]["handlingFee"] == 18.0

        # 3. Check audit log
        audit_res = await client.get("/api/finance-engine/audit-logs")
        assert audit_res.status_code == 200
        logs_data = audit_res.json()
        assert logs_data["ok"] is True
        logs = logs_data["logs"]
        assert isinstance(logs, list)
        assert any(l.get("adminId") == "test-admin" for l in logs)


@pytest.mark.asyncio
async def test_checkout_pricing_reflects_updated_rules():
    """Test that calculate_checkout_price uses the dynamic rules."""
    # Temporarily set specific platform fee
    await unified_finance_service.update_rules(
        new_rules={
            "pricing": {
                "baseServiceRate": 0.0,
                "platformFee": 15.0,
                "handlingFee": 20.0,
                "minimumOrderValue": 150.0,
            },
            "delivery": {
                "freeDeliveryThreshold": 500.0,
                "baseFee": 35.0,
                "slabs": [
                    {"minKm": 0, "maxKm": 3, "fee": 35.0},
                    {"minKm": 3, "maxKm": 6, "fee": 50.0},
                ],
            },
            "gst": {
                "laundryGstRate": 0.05,
                "platformGstRate": 0.18,
                "tcsRate": 0.01,
            },
        },
        admin_id="test-admin",
        reason="Unit test rule override",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        calc_payload = {
            "items": [
                {"price": 100.0, "quantity": 2, "name": "Shirt Iron"},  # 200
                {"price": 50.0, "quantity": 1, "name": "Pant Steam"},   # 50 -> subtotal 250
            ],
            "distanceKm": 2.0,  # Slab 0-3km: 35.0
            "couponDiscount": 20.0,
            "customerState": "Uttar Pradesh",
            "partnerState": "Uttar Pradesh",
        }
        res = await client.post("/api/finance-engine/price/calculate", json=calc_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True

        assert data["itemsSubtotal"] == 250.0
        assert data["customerDeliveryFee"] == 35.0
        assert data["handlingFee"] == 20.0
        assert data["platformFee"] == 15.0

        # Laundry GST: 5% of (250 - 20) = 11.50
        assert data["taxableLaundry"] == 230.0
        assert data["laundryGst"] == 11.50

        # Service GST: 18% of (35 + 20 + 15) = 18% of 70 = 12.60
        assert data["serviceGst"] == 12.60
        assert data["totalGst"] == 24.10

        # Total customer payable: 250 - 20 + 35 + 20 + 15 + 24.10 = 324.10
        assert data["customerPayable"] == 324.10


@pytest.mark.asyncio
async def test_order_financial_simulation_and_reconciliation():
    """Verify that simulated order reconciles with mathematical exactness."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        sim_payload = {
            "items": [
                {"name": "Suit Dry Clean", "price": 350.0, "quantity": 2},
            ],
            "distanceKm": 4.0,
            "couponDiscount": 50.0,
            "partnerMonthlyOrders": 120,  # Silver tier
            "customerState": "Uttar Pradesh",
            "partnerState": "Uttar Pradesh",
        }
        res = await client.post("/api/finance-engine/simulate", json=sim_payload)
        assert res.status_code == 200
        sim = res.json()

        assert sim["ok"] is True
        econ = sim["economics"]
        assert econ["mathematicallyReconciled"] is True
        assert econ["unreconciledDifference"] == 0.0

        # Verify components
        partner = sim["partner"]
        assert partner["commissionTier"] in ("Silver", "Gold", "Bronze", "Platinum")
        assert partner["commissionRatePct"] > 0
        assert partner["netPayable"] > 0
        assert partner["tcsDeduction"] > 0

        rider = sim["rider"]
        assert rider["totalPayout"] > 0

        platform = sim["platform"]
        assert "netMargin" in platform
        assert "grossRevenue" in platform


@pytest.mark.asyncio
async def test_cancellation_calculation_endpoint():
    """Verify stage-aware cancellation charges and refund calculation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Stage 1: PENDING (Free cancellation)
        res_pending = await client.post("/api/finance-engine/orders/test-order/cancellation-calc", params={"stage": "pending"})
        assert res_pending.status_code == 200
        data_pending = res_pending.json()
        assert data_pending["ok"] is True
        assert data_pending["cancellationFee"] == 0.0
        assert data_pending["refundPercentage"] == 100.0

        # Stage 2: PICKUP_ASSIGNED
        res_pickup = await client.post("/api/finance-engine/orders/test-order/cancellation-calc", params={"stage": "pickup_assigned"})
        assert res_pickup.status_code == 200
        data_pickup = res_pickup.json()
        assert data_pickup["ok"] is True
        assert data_pickup["cancellationFee"] > 0.0
        assert data_pickup["refundPercentage"] < 100.0
