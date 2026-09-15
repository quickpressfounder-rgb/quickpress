import pytest
import asyncio
from app.services.unified_finance_service import unified_finance_service, DEFAULT_UNIFIED_RULES

@pytest.mark.asyncio
async def test_express_pickup_price_calculation_and_split():
    # 1. Standard Order (is_express=False)
    std_calc = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 100.0, "quantity": 1, "name": "Shirt Wash & Iron"}],
        distance_km=2.0,
        is_express=False,
    )
    assert std_calc["isExpress"] is False
    assert std_calc["expressFee"] == 0.0
    assert std_calc["partnerExpressBonus"] == 0.0
    assert std_calc["riderExpressBonus"] == 0.0

    # 2. Express Order (is_express=True) with default 40 fee and 20% / 80% split
    exp_calc = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 100.0, "quantity": 1, "name": "Shirt Wash & Iron"}],
        distance_km=2.0,
        is_express=True,
    )
    assert exp_calc["isExpress"] is True
    assert exp_calc["expressFee"] == 40.0
    assert exp_calc["expressPartnerSharePercent"] == 20.0
    assert exp_calc["expressRiderSharePercent"] == 80.0
    assert exp_calc["partnerExpressBonus"] == 8.0   # 20% of 40 = 8.0
    assert exp_calc["riderExpressBonus"] == 32.0   # 80% of 40 = 32.0
    # Customer payable includes express fee and 18% GST on fees
    assert exp_calc["customerPayable"] > std_calc["customerPayable"]

@pytest.mark.asyncio
async def test_admin_custom_express_split_ratio():
    # Admin customizes to 50 fee, 30% Partner, 70% Rider
    custom_rules = {
        "expressPickup": {
            "enabled": True,
            "fee": 50.0,
            "partnerSharePercent": 30.0,
            "riderSharePercent": 70.0,
        }
    }
    await unified_finance_service.update_rules(custom_rules, admin_id="test_admin")

    exp_calc = await unified_finance_service.calculate_checkout_price(
        items=[{"price": 100.0, "quantity": 1, "name": "Suit Dry Clean"}],
        distance_km=2.0,
        is_express=True,
    )
    assert exp_calc["expressFee"] == 50.0
    assert exp_calc["expressPartnerSharePercent"] == 30.0
    assert exp_calc["expressRiderSharePercent"] == 70.0
    assert exp_calc["partnerExpressBonus"] == 15.0  # 30% of 50 = 15.0
    assert exp_calc["riderExpressBonus"] == 35.0    # 70% of 50 = 35.0

    # Restore default 40 / 20 / 80 for normal operations
    await unified_finance_service.update_rules({
        "expressPickup": {
            "enabled": True,
            "fee": 40.0,
            "partnerSharePercent": 20.0,
            "riderSharePercent": 80.0,
        }
    }, admin_id="test_admin")
