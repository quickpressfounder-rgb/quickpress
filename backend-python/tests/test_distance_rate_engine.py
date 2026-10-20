import pytest
from app.services.distance_rate_engine import DistanceRateEngine, distance_rate_engine


def test_base_distance_calculation():
    """Test trips within base distance (<= 2.0 km) charge exactly base fare."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 35.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 8.0,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "surgeEnabled": False,
        "lateNightEnabled": False,
        "waitingEnabled": False,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "expressBonus": 25.0,
        "cityOverrides": {},
    }

    # 1.2 km is within 2.0 km base
    result = engine.calculate_trip_fare(distance_km=1.2, is_rain=False)
    assert result.baseFare == 35.0
    assert result.distanceKm == 1.2
    assert result.extraDistanceKm == 0.0
    assert result.distanceFare == 0.0
    assert result.totalFare == 35.0
    assert "Base ₹35" in result.breakdownText


def test_extra_km_calculation():
    """Test trips extending beyond base distance charge extraKmRate per km."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 35.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 8.0,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "surgeEnabled": False,
        "lateNightEnabled": False,
        "waitingEnabled": False,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "expressBonus": 25.0,
        "cityOverrides": {},
    }

    # 5.0 km trip: 2.0 km base (₹35) + 3.0 km extra @ ₹8/km (₹24) = ₹59
    result = engine.calculate_trip_fare(distance_km=5.0)
    assert result.baseFare == 35.0
    assert result.extraDistanceKm == 3.0
    assert result.distanceFare == 24.0
    assert result.totalFare == 59.0
    assert "Base ₹35" in result.breakdownText
    assert "Extra 3.0km (+₹24)" in result.breakdownText


def test_late_night_surcharge():
    """Test night surcharge is applied during night hours (22:00 to 06:00)."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 35.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 8.0,
        "lateNightEnabled": True,
        "lateNightFee": 25.0,
        "lateNightMultiplier": 1.0,
        "lateNightStartTime": "22:00",
        "lateNightEndTime": "06:00",
        "surgeEnabled": False,
        "waitingEnabled": False,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "expressBonus": 25.0,
        "cityOverrides": {},
    }

    # Test night time 23:30 -> Night surcharge applies
    result_night = engine.calculate_trip_fare(distance_km=2.0, current_time_str="23:30")
    assert result_night.isNight is True
    assert result_night.nightFee == 25.0
    assert result_night.totalFare == 60.0  # 35 + 25

    # Test daytime 14:00 -> Night surcharge does NOT apply
    result_day = engine.calculate_trip_fare(distance_km=2.0, current_time_str="14:00")
    assert result_day.isNight is False
    assert result_day.nightFee == 0.0
    assert result_day.totalFare == 35.0


def test_monsoon_rain_surge():
    """Test rain surge applies when is_rain=True and surge is enabled."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 35.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 8.0,
        "surgeEnabled": True,
        "rainSurgeFee": 20.0,
        "surgeMultiplier": 1.0,
        "peakHours": [],
        "lateNightEnabled": False,
        "waitingEnabled": False,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "expressBonus": 25.0,
        "cityOverrides": {},
    }

    result = engine.calculate_trip_fare(distance_km=2.0, is_rain=True)
    assert result.isSurge is True
    assert result.surgeFee == 20.0
    assert "Monsoon Rain Surge" in result.surgeReason
    assert result.totalFare == 55.0  # 35 + 20


def test_waiting_charges():
    """Test waiting charges: 5 min free grace period, remaining billable."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 35.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 8.0,
        "waitingEnabled": True,
        "freeWaitingMinutes": 5,
        "waitingFeePerMinute": 2.0,
        "surgeEnabled": False,
        "lateNightEnabled": False,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "expressBonus": 25.0,
        "cityOverrides": {},
    }

    # 4 mins waiting -> within 5 min grace -> 0 waiting fee
    result_free = engine.calculate_trip_fare(distance_km=2.0, waiting_minutes=4)
    assert result_free.waitingFare == 0.0
    assert result_free.billableWaitingMinutes == 0
    assert result_free.totalFare == 35.0

    # 15 mins waiting -> 10 mins billable @ ₹2/min = ₹20
    result_billed = engine.calculate_trip_fare(distance_km=2.0, waiting_minutes=15)
    assert result_billed.billableWaitingMinutes == 10
    assert result_billed.waitingFare == 20.0
    assert result_billed.totalFare == 55.0  # 35 + 20


def test_express_order_bonus():
    """Test express order adds priority bonus to rider earnings."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 35.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 8.0,
        "expressBonus": 25.0,
        "surgeEnabled": False,
        "lateNightEnabled": False,
        "waitingEnabled": False,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "cityOverrides": {},
    }

    result = engine.calculate_trip_fare(distance_km=2.0, is_express=True)
    assert result.expressBonus == 25.0
    assert result.totalFare == 60.0  # 35 + 25


def test_minimum_floor_clamp():
    """Test that total fare cannot drop below minimumFare floor."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 20.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 5.0,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "surgeEnabled": False,
        "lateNightEnabled": False,
        "waitingEnabled": False,
        "vehicleTypeMultipliers": {"bike": 1.0},
        "cityOverrides": {},
    }

    result = engine.calculate_trip_fare(distance_km=0.5)
    assert result.isClampedMin is True
    assert result.totalFare == 30.0


def test_vehicle_multipliers():
    """Test vehicle type multipliers apply proportionally to base & distance."""
    engine = DistanceRateEngine()
    engine._cached_config = {
        "baseFare": 40.0,
        "baseDistanceKm": 2.0,
        "extraKmRate": 10.0,
        "vehicleTypeMultipliers": {"bike": 1.0, "auto": 1.25, "cargo": 1.5},
        "surgeEnabled": False,
        "lateNightEnabled": False,
        "waitingEnabled": False,
        "minimumFare": 30.0,
        "maximumFareCap": 600.0,
        "cityOverrides": {},
    }

    # 4.0 km trip: 40 base + 2.0 km extra * 10 = 60
    # Auto: 60 * 1.25 = 75
    result_auto = engine.calculate_trip_fare(distance_km=4.0, vehicle_type="auto")
    assert result_auto.vehicleMultiplier == 1.25
    assert result_auto.totalFare == 75.0

    # Cargo: 60 * 1.50 = 90
    result_cargo = engine.calculate_trip_fare(distance_km=4.0, vehicle_type="cargo")
    assert result_cargo.vehicleMultiplier == 1.50
    assert result_cargo.totalFare == 90.0
