import pytest
from app.db.client import database
from app.services.unified_finance_service import unified_finance_service
from app.services.financial_engine import financial_engine
from app.services.settlement_engine import settlement_engine
from app.db.cart_repositories import CartRepository
from app.db.payment_repositories import rider_incentives


@pytest.fixture(autouse=True)
async def clean_cross_sync_test_data():
    await database.collection("financial_rules").delete_many({})
    await database.collection("customer_orders").delete_many({"_id": "ord_sync_test"})
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0
    yield
    await database.collection("financial_rules").delete_many({})
    await database.collection("customer_orders").delete_many({"_id": "ord_sync_test"})
    unified_finance_service._rules_cache = None
    unified_finance_service._cache_time = 0.0


@pytest.mark.asyncio
async def test_cross_project_finance_engine_synchronization():
    """
    Validates that updating financial rules via Admin triggers immediate,
    zero-restart synchronization across:
    1. Cart Repository & Customer Cart charges
    2. Financial Engine config & Partner tier commission rates
    3. Settlement Engine GST & TCS computation
    4. Rider Daily / Streak Incentives
    5. In-memory caches and legacy collections (admin_settings, cart_settings)
    """

    # 1. Update rules to custom values from Admin
    custom_rules = {
        "pricing": {
            "platformFee": 25.0,
            "handlingFee": 30.0,
            "minimumOrderValue": 150.0,
            "expressMultiplier": 1.5,
            "surgeMultiplier": 1.2,
        },
        "gst": {
            "laundryGstRate": 0.05,
            "platformGstRate": 0.18,
            "deliveryGstRate": 0.18,
            "tcsRate": 0.02,  # 2% TCS
            "quickpressGstin": "09TESTGSTIN1234",
            "defaultState": "Uttar Pradesh",
        },
        "commission": {
            "standardRate": 0.20,  # 20% standard
            "silverRate": 0.16,    # 16% silver
            "goldRate": 0.10,      # 10% gold
            "silverThreshold": 50, # lowered to 50
            "goldThreshold": 150,  # lowered to 150
            "captainCommissionRate": 0.0,
        },
        "delivery": {
            "baseFee": 40.0,
            "baseDistanceKm": 2.5,
            "perKmRate": 10.0,
            "slabs": [
                {"minKm": 0, "maxKm": 3, "fee": 40.0},
                {"minKm": 3, "maxKm": 6, "fee": 60.0},
                {"minKm": 6, "maxKm": 999, "fee": 90.0},
            ],
            "freeDeliveryThreshold": 800.0,
            "subsidyFundingSource": "QUICKPRESS_FUNDED",
            "nightSurge": 30.0,
            "rainSurge": 25.0,
        },
        "incentives": {
            "riderDaily": [
                {"trips": 8, "reward": 250},
                {"trips": 16, "reward": 600},
            ],
            "riderWeeklyStreak": {
                "trips": 60,
                "reward": 1200,
            },
            "partnerVolume": [
                {"orders": 30, "reward": 500},
            ],
        },
        "cancellation": {
            "REQUESTED": {"cancellationFee": 0, "refundPct": 100, "allowCancel": True},
        },
        "penalties": {
            "merchantLateDispatch": 75.0,
        },
        "settlement": {
            "cycle": "WEEKLY",
            "payoutDay": "FRIDAY",
            "autoApproveMaxAmount": 75000,
        },
    }

    updated_result = await unified_finance_service.update_rules(
        new_rules=custom_rules,
        admin_id="admin_test_001",
        reason="Testing full project synchronization",
    )

    assert updated_result["ok"] is True
    rules = updated_result["rules"]
    assert rules["pricing"]["platformFee"] == 25.0
    assert rules["delivery"]["freeDeliveryThreshold"] == 800.0
    assert rules["settlement"]["payoutDay"] == "FRIDAY"

    # Verify mirrored admin_settings & cart_settings collections
    admin_setting = await database.collection("admin_settings").find_one({"_id": "platform"})
    assert admin_setting is not None
    assert admin_setting["platformFee"] == 25.0
    assert admin_setting["deliveryFee"] == 40.0

    cart_setting = await database.collection("cart_settings").find_one({"_id": "default"})
    assert cart_setting is not None
    assert cart_setting["freeDeliveryAbove"] == 800.0

    # 2. Check Cart Charges dynamic lookup
    cart_repo = CartRepository()
    charges = await cart_repo.charges()
    assert charges.delivery == 40
    assert charges.handling == 30
    assert charges.gstRate == 0.05

    # Check free delivery threshold dynamically applied via checkout pricing calculation
    calc_500 = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 500.0, "quantity": 1}],
        distance_km=1.0,
    )
    assert calc_500["customerDeliveryFee"] == 40.0
    assert calc_500["isFreeDelivery"] is False

    calc_850 = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 850.0, "quantity": 1}],
        distance_km=1.0,
    )
    assert calc_850["customerDeliveryFee"] == 0.0
    assert calc_850["isFreeDelivery"] is True

    # 3. Check financial_engine.config immediately synced
    engine_config = financial_engine.config
    assert engine_config["platformFee"] == 25.0
    assert engine_config["handlingFee"] == 30.0
    assert engine_config["silverCommissionThreshold"] == 50
    assert engine_config["goldCommissionThreshold"] == 150

    # 4. Check Commission Tier calculations with new thresholds
    # 40 orders should be Standard (< 50) => 0.20
    assert financial_engine.get_commission_rate(order_count=40) == 0.20
    # 60 orders should be Silver (50 to 149) => 0.16
    assert financial_engine.get_commission_rate(order_count=60) == 0.16
    # 160 orders should be Gold (>= 150) => 0.10
    assert financial_engine.get_commission_rate(order_count=160) == 0.10

    # 5. Check Settlement Engine GST and TCS dynamic calculation
    await database.collection("customer_orders").insert_one({
        "_id": "ord_sync_test",
        "partnerId": "partner_test_sync",
        "total": 1000.0,
        "status": "delivered",
        "createdAt": "2026-09-10T12:00:00Z",
    })

    breakdown = await settlement_engine.compute_cycle_breakdown(
        partner_id="partner_test_sync",
        cycle_id="current",
    )

    # laundry_gst_rate is 0.05 => customer_gst on 1000 is 50.0
    assert breakdown["netOrderValueA"]["totalGstCollected"] == 50.0
    # Net order value is 1050.0
    # Commission rate for 1 order (< 50) is 20% standard rate => platform_commission is 210.0
    # 18% platform GST on 210.0 is 37.8
    assert breakdown["taxDeductionsD"]["gstOnServiceFees18"] == 37.8
    # 2% TCS on 1050.0 is 21.0
    assert breakdown["taxDeductionsD"]["tds194o"] == 21.0

    # 6. Check Rider Incentives reflect new rules
    r_inc = rider_incentives()
    assert r_inc["items"][0]["target"] == 8
    assert r_inc["items"][0]["reward"] == 250
    assert r_inc["items"][1]["target"] == 16
    assert r_inc["items"][1]["reward"] == 600
    assert r_inc["items"][2]["target"] == 60
    assert r_inc["items"][2]["reward"] == 1200
