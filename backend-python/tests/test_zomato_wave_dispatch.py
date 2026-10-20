"""Tests for Zomato Micro-Zone (Pod) and Concentric Wave Dispatch System.

Validates:
1. Haversine spatial distance calculations.
2. Zomato composite ranking score (Distance + Idle Time Fairness + Rating).
3. Micro-Zone concentric wave classification (Wave 1: 0-1.8km, Wave 2: 1.8-4.0km, Wave 3: 4.0-8.0km).
4. Auto-promotion if Wave 1 is empty.
5. In-flight task cancellation upon ride acceptance.
6. Admin config GET/PATCH and live-waves endpoints.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import pytest

from app.services.zomato_dispatch_engine import (
    ZomatoDispatchEngine,
    zomato_dispatch_engine,
    haversine_km,
)


def test_haversine_distance():
    # Connaught Place, New Delhi to India Gate, New Delhi (~2.2 km)
    cp_lat, cp_lon = 28.6315, 77.2167
    ig_lat, ig_lon = 28.6129, 77.2295
    dist = haversine_km(cp_lat, cp_lon, ig_lat, ig_lon)
    assert 2.0 <= dist <= 2.6


def test_zomato_rider_priority_score_fairness():
    engine = ZomatoDispatchEngine()
    now = datetime.now(timezone.utc)

    # Rider A: 1.0 km away, idle for 50 minutes, rating 4.8
    rider_a = {
        "_id": "rdr-fair-1",
        "rating": 4.8,
        "lastCompletedTripAt": (now - timedelta(minutes=50)).isoformat(),
    }
    score_a = engine.compute_rider_priority_score(rider_a, distance_km=1.0, now_dt=now)

    # Rider B: 1.0 km away, idle for only 2 minutes (just finished a ride), rating 4.8
    rider_b = {
        "_id": "rdr-fair-2",
        "rating": 4.8,
        "lastCompletedTripAt": (now - timedelta(minutes=2)).isoformat(),
    }
    score_b = engine.compute_rider_priority_score(rider_b, distance_km=1.0, now_dt=now)

    # Rider A waited longer, so composite score must be lower (higher priority) than Rider B
    assert score_a < score_b


def test_zomato_rider_priority_score_rating():
    engine = ZomatoDispatchEngine()
    now = datetime.now(timezone.utc)

    # Rider High Rating (4.9), distance 1.0 km, same idle time
    rider_high = {
        "_id": "rdr-high",
        "rating": 4.9,
        "lastCompletedTripAt": (now - timedelta(minutes=20)).isoformat(),
    }
    score_high = engine.compute_rider_priority_score(rider_high, distance_km=1.0, now_dt=now)

    # Rider Lower Rating (4.1), distance 1.0 km, same idle time
    rider_low = {
        "_id": "rdr-low",
        "rating": 4.1,
        "lastCompletedTripAt": (now - timedelta(minutes=20)).isoformat(),
    }
    score_low = engine.compute_rider_priority_score(rider_low, distance_km=1.0, now_dt=now)

    # High rating gets a better score
    assert score_high < score_low


def test_classify_riders_into_concentric_waves():
    engine = ZomatoDispatchEngine()

    rider_w1 = {"_id": "rdr-pod-w1", "rating": 4.8}  # 0.9 km -> Wave 1
    rider_w2 = {"_id": "rdr-pod-w2", "rating": 4.5}  # 2.8 km -> Wave 2
    rider_w3 = {"_id": "rdr-pod-w3", "rating": 4.9}  # 5.5 km -> Wave 3
    rider_out = {"_id": "rdr-pod-out", "rating": 4.0}  # 12.0 km -> Beyond Wave 3

    candidates = [
        (rider_w3, 5.5),
        (rider_w1, 0.9),
        (rider_out, 12.0),
        (rider_w2, 2.8),
    ]

    classified = engine.classify_riders_into_waves(candidates)

    # Wave 1 (0 to 1.8 km)
    assert len(classified["wave_1"]) == 1
    assert classified["wave_1"][0][0]["_id"] == "rdr-pod-w1"
    assert classified["wave_1"][0][1] == 0.9

    # Wave 2 (1.8 to 4.0 km)
    assert len(classified["wave_2"]) == 1
    assert classified["wave_2"][0][0]["_id"] == "rdr-pod-w2"
    assert classified["wave_2"][0][1] == 2.8

    # Wave 3 (4.0 to 8.0 km)
    assert len(classified["wave_3"]) == 1
    assert classified["wave_3"][0][0]["_id"] == "rdr-pod-w3"
    assert classified["wave_3"][0][1] == 5.5


def test_dispatch_config_lifecycle():
    engine = ZomatoDispatchEngine()
    initial = engine.get_config()
    assert initial["wave1RadiusKm"] == 1.8
    assert initial["wave2RadiusKm"] == 4.0
    assert initial["wave3RadiusKm"] == 8.0
    assert initial["wave1TimeoutSec"] == 15

    updated = engine.update_config({
        "wave1RadiusKm": 2.2,
        "wave1TimeoutSec": 20,
        "wave2RadiusKm": 5.0,
    })
    assert updated["wave1RadiusKm"] == 2.2
    assert updated["wave1TimeoutSec"] == 20
    assert updated["wave2RadiusKm"] == 5.0

    # Clean up back to defaults
    engine.update_config({
        "wave1RadiusKm": 1.8,
        "wave1TimeoutSec": 15,
        "wave2RadiusKm": 4.0,
    })


@pytest.mark.asyncio
async def test_concentric_wave_dispatch_and_cancellation():
    engine = ZomatoDispatchEngine()
    ride_id = "test-ride-wave-cancel-01"
    order_id = "test-ord-wave-cancel-01"

    rider_w1 = {"_id": "rdr-c1", "rating": 5.0}
    rider_w2 = {"_id": "rdr-c2", "rating": 4.8}

    ride_doc = {
        "_id": ride_id,
        "orderCode": "QPTSTWAVE",
        "fare": 65,
        "pickupLocation": {"address": "Test Pickup Point", "contactName": "Customer"},
        "dropLocation": {"address": "Test Drop Point", "contactName": "Store"},
    }

    candidates = [(rider_w1, 1.2), (rider_w2, 3.1)]

    # Start dispatch
    await engine.start_concentric_wave_dispatch(
        ride_id=ride_id,
        order_id=order_id,
        ride=ride_doc,
        ranked_riders=candidates,
    )

    # Verify task is tracking in-flight
    assert ride_id in engine._active_wave_tasks
    live = engine.get_live_waves()
    assert live["activeCount"] >= 1
    found = any(item["rideId"] == ride_id for item in live["liveWaves"])
    assert found

    # Cancel dispatch (simulate acceptance by a rider)
    engine.cancel_dispatch(ride_id)
    assert ride_id not in engine._active_wave_tasks
    assert ride_id not in engine._active_wave_metadata


@pytest.mark.asyncio
async def test_auto_promotion_when_wave_1_empty():
    engine = ZomatoDispatchEngine()
    ride_id = "test-ride-auto-promote"
    order_id = "test-ord-auto-promote"

    # Only Wave 2 candidate (no nearby captain in Wave 1)
    rider_w2 = {"_id": "rdr-w2-only", "rating": 4.9}
    candidates = [(rider_w2, 3.2)]

    ride_doc = {
        "_id": ride_id,
        "orderCode": "QPPROMOT",
        "fare": 50,
        "pickupLocation": {"address": "Store Pickup"},
        "dropLocation": {"address": "Customer Drop"},
    }

    await engine.start_concentric_wave_dispatch(
        ride_id=ride_id,
        order_id=order_id,
        ride=ride_doc,
        ranked_riders=candidates,
    )

    # Verify metadata immediately shows Wave 2 (no waiting for Wave 1)
    meta = engine._active_wave_metadata.get(ride_id)
    assert meta is not None
    assert meta["currentWave"] == 2
    assert meta["tierLabel"] == "nearby_zone"

    engine.cancel_dispatch(ride_id)
