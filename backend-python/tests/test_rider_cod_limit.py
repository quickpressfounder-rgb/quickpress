import pytest
from app.db.client import database
from app.services.smart_2ride_engine import smart_2ride_engine


@pytest.mark.asyncio
async def test_rider_cod_limit_dispatch_exclusion():
    """Riders exceeding COD floating cash limit (₹3,000) are excluded from assignment."""
    # Setup test rider with ₹3,500 floating cash (exceeds default limit ₹3,000)
    rider_id = "test-rider-cod-exceeded"
    await database.update(
        "rider_profiles",
        {"_id": rider_id},
        {
            "_id": rider_id,
            "riderId": rider_id,
            "name": "High Cash Rider",
            "isOnline": True,
            "status": "online",
            "city": "Kasganj",
            "lat": 27.8118,
            "lng": 78.6477,
            "floatingCash": 3500.0,
            "maxCodLimit": 3000.0,
        },
        upsert=True,
    )

    # Setup normal rider with ₹500 floating cash
    normal_rider_id = "test-rider-cod-ok"
    await database.update(
        "rider_profiles",
        {"_id": normal_rider_id},
        {
            "_id": normal_rider_id,
            "riderId": normal_rider_id,
            "name": "Normal Cash Rider",
            "isOnline": True,
            "status": "online",
            "city": "Kasganj",
            "lat": 27.8119,
            "lng": 78.6478,
            "floatingCash": 500.0,
            "maxCodLimit": 3000.0,
        },
        upsert=True,
    )

    # Find eligible captains
    candidates = await smart_2ride_engine.find_ranked_eligible_riders(
        target_lat=27.8120,
        target_lng=78.6480,
        radius_km=10.0,
        city="Kasganj",
        excluded_rider_ids=[],
    )

    candidate_ids = [str(c[0].get("_id") or c[0].get("riderId")) for c in candidates]
    # Rider with ₹3,500 must be excluded
    assert rider_id not in candidate_ids, "Rider with exceeded COD floating cash was not excluded"
    # Normal rider must be included
    assert normal_rider_id in candidate_ids, "Normal rider with valid floating cash was not found"


@pytest.mark.asyncio
async def test_cod_delivery_increments_floating_cash():
    """When a COD order is delivered, rider floating cash accumulates the collected amount."""
    rider_id = "test-rider-cod-accumulate"
    await database.update(
        "rider_profiles",
        {"_id": rider_id},
        {
            "_id": rider_id,
            "riderId": rider_id,
            "name": "COD Delivery Rider",
            "isOnline": True,
            "status": "online",
            "floatingCash": 1000.0,
        },
        upsert=True,
    )

    # Simulate delivering a COD order of ₹450 with OTP
    cod_order = {
        "_id": "test-order-cod-deliv",
        "id": "test-order-cod-deliv",
        "status": "out_for_delivery",
        "dispatchOtpVerified": True,
        "deliveryOtp": "4321",
        "paymentMode": "cod",
        "payment": {"mode": "cod"},
        "totals": {"grandTotal": 450.0},
        "rider": {"id": rider_id, "name": "COD Delivery Rider"},
    }
    await database.update("customer_orders", {"_id": "test-order-cod-deliv"}, cod_order, upsert=True)
    await database.update("rides", {"orderId": "test-order-cod-deliv", "rideType": "delivery"}, {"status": "ACTIVE"}, upsert=True)

    res = await smart_2ride_engine.verify_delivery_otp(
        order_id="test-order-cod-deliv",
        otp="4321",
        rider_id=rider_id,
    )
    assert res.get("ok") is True

    # Verify rider floating cash increased by ₹450 -> ₹1450
    updated_profile = await database.find_one("rider_profiles", {"_id": rider_id})
    assert updated_profile["floatingCash"] == 1450.0
