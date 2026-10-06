import pytest
from datetime import datetime, timezone
from app.db.client import database
from app.services.settlement_engine import settlement_engine


@pytest.mark.asyncio
async def test_rider_settlement_zero_rides_pure_real():
    """Verify that when a captain has zero rides, zero mock records or fake earnings are created."""
    breakdown = await settlement_engine.compute_rider_cycle_breakdown(
        rider_id="RDR-ZERO-TEST-999",
        cycle_id="current",
    )

    assert breakdown["totalTrips"] == 0
    assert breakdown["netPayout"] == 0.0
    assert breakdown["trips"] == []
    assert breakdown["breakdown"]["tripFares"] == 0.0
    assert breakdown["breakdown"]["questBonuses"] == 0.0
    assert breakdown["breakdown"]["platformFee"] == 0.0


@pytest.mark.asyncio
async def test_rider_settlement_with_real_ride():
    """Verify that real completed rides in the cycle are correctly mapped with full financial precision."""
    test_rid = "RDR-REAL-TEST-001"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Insert a real completed ride
    await database.collection("rides").insert_one({
        "_id": "ride-test-stl-1",
        "riderId": test_rid,
        "orderId": "ord-test-stl-100",
        "orderCode": "QP-TEST-77",
        "rideType": "delivery",
        "pickupAddress": "Sector 14 Laundromat",
        "dropAddress": "Flat 402, Green Valley",
        "distanceKm": 4.5,
        "estimatedEarning": 65.0,
        "status": "completed",
        "createdAt": now_iso,
        "completedAt": now_iso,
    })

    try:
        overview = await settlement_engine.get_rider_settlement_overview(test_rid)
        assert overview["currentCycle"]["cycleId"] == "current"
        assert overview["currentCycle"]["tripCount"] == 1
        assert overview["currentCycle"]["estPayout"] == 65.0

        breakdown = await settlement_engine.compute_rider_cycle_breakdown(test_rid, "current")
        assert breakdown["totalTrips"] == 1
        assert breakdown["netPayout"] == 65.0
        assert len(breakdown["trips"]) == 1
        trip = breakdown["trips"][0]
        assert trip["tripId"] == "ride-test-stl-1"
        assert trip["orderCode"] == "QP-TEST-77"
        assert trip["fare"] == 65.0
        assert trip["status"] == "COMPLETED"
    finally:
        await database.collection("rides").delete_one({"_id": "ride-test-stl-1"})
