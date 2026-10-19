"""End-to-End Verification Test for Dynamic Surge Engine.

Tests:
1. Baseline: Surge disabled in Admin Settings -> ₹0 surge fee in customer calculation & rider zones inactive.
2. Surge Enabled by Admin -> Live rules reflect surge, normal customer charged rainSurgeFee.
3. VIP Club "Zero Surge Guarantee" -> Surge waived to ₹0 with waivedSurgeAmount recorded.
4. Rider Hotspots & Location Checking -> Active hotspots with flame bonuses and geofence detection.
5. Order Ledger Integration -> surgeFee recorded in single order financial object.
6. Restoration -> Turning surge OFF in Admin restores normal operations instantly.
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.client import database
from app.db.admin_repositories import admin_settings_repository
from app.services.unified_finance_service import unified_finance_service
from app.services.surge_engine import surge_engine


@pytest.fixture(autouse=True)
async def reset_surge_state():
    """Ensure clean baseline before and after each test."""
    await admin_settings_repository.update({
        "surge": {
            "enabled": False,
            "rainSurgeFee": 25.0,
            "peakSurgeFee": 15.0,
            "etaDelayMinutes": 20,
            "surgeReason": "Monsoon / High Demand Surge",
        }
    })
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0
    yield
    await admin_settings_repository.update({
        "surge": {
            "enabled": False,
            "rainSurgeFee": 25.0,
            "peakSurgeFee": 15.0,
            "etaDelayMinutes": 20,
            "surgeReason": "Monsoon / High Demand Surge",
        }
    })
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0


@pytest.mark.asyncio
async def test_surge_full_lifecycle_e2e():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # -------------------------------------------------------------
        # STEP 1: VERIFY BASELINE (SURGE DISABLED)
        # -------------------------------------------------------------
        rules_res = await client.get("/api/finance-engine/rules")
        assert rules_res.status_code == 200
        rules = rules_res.json()["rules"]
        assert rules["surge"]["enabled"] is False

        # Calculate checkout price without surge
        calc_payload = {
            "items": [{"name": "Shirt Wash & Fold", "price": 100.0, "quantity": 2}],
            "distanceKm": 2.5,
            "isMember": False,
        }
        calc_res = await client.post("/api/finance-engine/price/calculate", json=calc_payload)
        assert calc_res.status_code == 200
        calc_data = calc_res.json()
        assert calc_data["surgeFee"] == 0.0
        assert calc_data["surgeEnabled"] is False
        assert calc_data["surgeWaived"] is False
        baseline_payable = calc_data["customerPayable"]

        # Rider surge zones should be inactive
        rider_zones_res = await client.get("/api/rider/surge/zones?lat=27.8080&lng=78.6450")
        assert rider_zones_res.status_code == 200
        rider_zones = rider_zones_res.json()
        assert rider_zones["isSurgeActive"] is False
        assert len(rider_zones["zones"]) == 0

        # Rider check location
        loc_res = await client.get("/api/rider/surge/check-location?lat=27.8080&lng=78.6450")
        assert loc_res.status_code == 200
        loc_data = loc_res.json()
        assert loc_data["hasSurge"] is False
        assert loc_data["bonus"] == 0.0

        # -------------------------------------------------------------
        # STEP 2: ACTIVATE SURGE VIA ADMIN
        # -------------------------------------------------------------
        await admin_settings_repository.update({
            "surge": {
                "enabled": True,
                "rainSurgeFee": 30.0,
                "peakSurgeFee": 20.0,
                "etaDelayMinutes": 25,
                "surgeReason": "Kasganj Monsoon Heavy Rain",
            }
        })
        unified_finance_service._rules_cache = None
        unified_finance_service._cache_time = 0.0

        # Verify active rules immediately sync
        rules_res_after = await client.get("/api/finance-engine/rules")
        assert rules_res_after.status_code == 200
        active_surge_rule = rules_res_after.json()["rules"]["surge"]
        assert active_surge_rule["enabled"] is True
        assert active_surge_rule["rainSurgeFee"] == 30.0

        # -------------------------------------------------------------
        # STEP 3: CUSTOMER CHECKOUT WITH ACTIVE SURGE (NON-VIP)
        # -------------------------------------------------------------
        surge_calc_res = await client.post("/api/finance-engine/price/calculate", json=calc_payload)
        assert surge_calc_res.status_code == 200
        surge_calc = surge_calc_res.json()
        assert surge_calc["surgeFee"] == 30.0
        assert surge_calc["surgeEnabled"] is True
        assert surge_calc["surgeWaived"] is False
        assert "Kasganj Monsoon Heavy Rain" in surge_calc["surgeReason"]
        # Customer payable should increase by 30 + 18% GST on 30 (= 35.4 -> rounded 35)
        assert surge_calc["customerPayable"] > baseline_payable

        # -------------------------------------------------------------
        # STEP 4: VIP MEMBER ZERO-SURGE GUARANTEE
        # -------------------------------------------------------------
        vip_calc_payload = {**calc_payload, "isMember": True}
        vip_calc_res = await client.post("/api/finance-engine/price/calculate", json=vip_calc_payload)
        assert vip_calc_res.status_code == 200
        vip_calc = vip_calc_res.json()
        assert vip_calc["surgeFee"] == 0.0  # ZERO SURGE GUARANTEE
        assert vip_calc["surgeEnabled"] is True
        assert vip_calc["surgeWaived"] is True
        assert vip_calc["waivedSurgeAmount"] == 30.0

        # -------------------------------------------------------------
        # STEP 5: RIDER APP SURGE HOTSPOTS & LOCATION DETECTION
        # -------------------------------------------------------------
        rider_active_zones_res = await client.get("/api/rider/surge/zones?lat=27.8080&lng=78.6450")
        assert rider_active_zones_res.status_code == 200
        rider_active_zones = rider_active_zones_res.json()
        assert rider_active_zones["isSurgeActive"] is True
        assert len(rider_active_zones["zones"]) > 0
        assert rider_active_zones["activeSurgeBonus"] >= 30.0

        # Check location inside hotspot (Soron Gate: 27.8080, 78.6450)
        rider_loc_res = await client.get("/api/rider/surge/check-location?lat=27.8080&lng=78.6450")
        assert rider_loc_res.status_code == 200
        rider_loc_data = rider_loc_res.json()
        assert rider_loc_data["hasSurge"] is True
        assert rider_loc_data["bonus"] >= 30.0
        assert "Kasganj Monsoon Heavy Rain" in rider_loc_data["reason"]

        # -------------------------------------------------------------
        # STEP 6: FINANCIAL LEDGER & ORDER INITIALIZATION
        # -------------------------------------------------------------
        test_order_id = f"test-surge-order-{uuid.uuid4().hex[:6]}"
        init_res = await client.post(
            f"/api/finance-engine/orders/{test_order_id}/initialize",
            json={
                "customerId": "cust-test-123",
                "pricingData": surge_calc,
            },
        )
        assert init_res.status_code == 200
        fin_obj = init_res.json()["financials"]
        assert fin_obj["surgeFee"] == 30.0
        assert fin_obj["customerPayable"] == surge_calc["customerPayable"]

        # -------------------------------------------------------------
        # STEP 7: RESTORE SURGE OFF (NORMALCY RESTORED)
        # -------------------------------------------------------------
        await admin_settings_repository.update({
            "surge": {
                "enabled": False,
                "rainSurgeFee": 25.0,
            }
        })
        unified_finance_service._rules_cache = None
        unified_finance_service._cache_time = 0.0

        final_calc_res = await client.post("/api/finance-engine/price/calculate", json=calc_payload)
        assert final_calc_res.status_code == 200
        assert final_calc_res.json()["surgeFee"] == 0.0
        assert final_calc_res.json()["surgeEnabled"] is False
