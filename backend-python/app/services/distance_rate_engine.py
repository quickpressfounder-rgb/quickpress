"""Master Distance Rate & Dynamic Fare Calculation Engine for QuickPress.

Full Admin-Controlled Pricing Engine featuring:
1. Base Distance & Extra KM Slabs (Base Fare covering first X km + incremental rate/km).
2. Dynamic Surge Pricing (Demand/Supply multiplier, Monsoon/Rain surge, Peak Rush hours).
3. Late Night Charges Model (Configurable time-window e.g. 22:00 - 06:00, flat fee or multiplier).
4. Waiting Charges Model (Free grace minutes at pickup/drop, per-minute waiting compensation).
5. Vehicle & Service Multipliers (Bike, EV, Bicycle, Auto, Cargo).
6. Absolute Minimum Floor Guarantee & Safety Ceiling Cap.
7. Seamless Live Updates via Supabase / MongoDB database backing (zero server restart needed).
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database

logger = logging.getLogger("quickpress.distance_rate_engine")

FARE_SETTINGS_COLLECTION = "fare_rate_settings"
SETTINGS_DOC_ID = "global_distance_rate_config"

DEFAULT_DISTANCE_RATE_CONFIG: Dict[str, Any] = {
    # 1. Base Distance & Extra KM Slabs
    "baseFare": 35.0,             # Base price in ₹
    "baseDistanceKm": 2.0,        # Initial distance covered in base fare
    "extraKmRate": 8.0,           # Price per km beyond base distance (₹/km)
    "minimumFare": 30.0,          # Absolute floor guarantee
    "maximumFareCap": 600.0,      # Runaway ceiling protection

    # 2. Dynamic Surge Model
    "surgeEnabled": True,         # Master toggle
    "surgeMultiplier": 1.0,       # Dynamic multiplier (1.0x to 3.0x)
    "rainSurgeFee": 20.0,         # Flat bonus during bad weather/monsoon (₹)
    "peakHourSurgeFee": 15.0,     # Flat bonus during peak rush hour (₹)
    "peakHours": [
        {"start": "08:00", "end": "11:00"},
        {"start": "18:00", "end": "22:00"},
    ],

    # 3. Late Night Charges Model
    "lateNightEnabled": True,     # Master toggle
    "lateNightFee": 25.0,         # Flat night surcharge (₹)
    "lateNightMultiplier": 1.0,   # Optional night multiplier (e.g. 1.2x)
    "lateNightStartTime": "22:00",# 10:00 PM
    "lateNightEndTime": "06:00",  # 06:00 AM

    # 4. Waiting Charges Model
    "waitingEnabled": True,       # Master toggle
    "freeWaitingMinutes": 5,      # Grace period at door/store before charging
    "waitingFeePerMinute": 2.0,   # Waiting charge per minute after grace period (₹/min)

    # 5. Vehicle Modifiers
    "vehicleTypeMultipliers": {
        "bike": 1.0,
        "electric_bike": 1.0,
        "bicycle": 0.85,
        "auto": 1.25,
        "cargo": 1.50,
    },

    # 6. Service Extras
    "expressBonus": 25.0,         # Flat extra bonus for 24-hr express priority

    # 7. City / Regional Overrides (Optional)
    "cityOverrides": {},
}


@dataclass
class FareBreakdown:
    baseFare: float
    baseDistanceKm: float
    distanceKm: float
    extraDistanceKm: float
    extraKmRate: float
    distanceFare: float
    isNight: bool
    nightFee: float
    isSurge: bool
    surgeMultiplier: float
    surgeFee: float
    surgeReason: str
    waitingMinutes: int
    freeWaitingMinutes: int
    billableWaitingMinutes: int
    waitingFare: float
    expressBonus: float
    vehicleType: str
    vehicleMultiplier: float
    rawTotal: float
    totalFare: float
    isClampedMin: bool
    isClampedMax: bool
    breakdownText: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DistanceRateEngine:
    """Enterprise dynamic fare calculator and rate manager."""

    def __init__(self) -> None:
        self._cached_config: Dict[str, Any] = dict(DEFAULT_DISTANCE_RATE_CONFIG)
        self._initialized: bool = False

    async def initialize(self) -> None:
        """Loads fare configuration from the database on startup."""
        try:
            doc = await database.find_one(FARE_SETTINGS_COLLECTION, {"_id": SETTINGS_DOC_ID})
            if doc:
                # Merge saved preferences over defaults
                merged = dict(DEFAULT_DISTANCE_RATE_CONFIG)
                for k, v in doc.items():
                    if k not in ("_id", "updatedAt"):
                        merged[k] = v
                self._cached_config = merged
                logger.info("⚡ [DistanceRateEngine] Loaded custom fare configuration from database.")
            else:
                # Seed defaults
                await database.collection(FARE_SETTINGS_COLLECTION).update_one(
                    {"_id": SETTINGS_DOC_ID},
                    {"$set": {**DEFAULT_DISTANCE_RATE_CONFIG, "updatedAt": datetime.now(timezone.utc).isoformat()}},
                    upsert=True,
                )
                logger.info("⚡ [DistanceRateEngine] Seeded default fare configuration.")
            self._initialized = True
        except Exception as err:
            logger.warning("⚡ [DistanceRateEngine] DB init warning (using in-memory defaults): %s", err)
            self._initialized = True

    def get_config(self) -> Dict[str, Any]:
        """Returns active fare rate configuration."""
        return dict(self._cached_config)

    async def update_config(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Updates fare rate parameters dynamically and persists to database."""
        current = dict(self._cached_config)

        # 1. Base Distance & Extra KM
        if "baseFare" in payload:
            current["baseFare"] = max(0.0, float(payload["baseFare"]))
        if "baseDistanceKm" in payload:
            current["baseDistanceKm"] = max(0.1, float(payload["baseDistanceKm"]))
        if "extraKmRate" in payload:
            current["extraKmRate"] = max(0.0, float(payload["extraKmRate"]))
        if "minimumFare" in payload:
            current["minimumFare"] = max(0.0, float(payload["minimumFare"]))
        if "maximumFareCap" in payload:
            current["maximumFareCap"] = max(current["minimumFare"], float(payload["maximumFareCap"]))

        # 2. Surge Pricing
        if "surgeEnabled" in payload:
            current["surgeEnabled"] = bool(payload["surgeEnabled"])
        if "surgeMultiplier" in payload:
            current["surgeMultiplier"] = max(1.0, float(payload["surgeMultiplier"]))
        if "rainSurgeFee" in payload:
            current["rainSurgeFee"] = max(0.0, float(payload["rainSurgeFee"]))
        if "peakHourSurgeFee" in payload:
            current["peakHourSurgeFee"] = max(0.0, float(payload["peakHourSurgeFee"]))
        if "peakHours" in payload and isinstance(payload["peakHours"], list):
            current["peakHours"] = payload["peakHours"]

        # 3. Late Night Charges
        if "lateNightEnabled" in payload:
            current["lateNightEnabled"] = bool(payload["lateNightEnabled"])
        if "lateNightFee" in payload:
            current["lateNightFee"] = max(0.0, float(payload["lateNightFee"]))
        if "lateNightMultiplier" in payload:
            current["lateNightMultiplier"] = max(1.0, float(payload["lateNightMultiplier"]))
        if "lateNightStartTime" in payload:
            current["lateNightStartTime"] = str(payload["lateNightStartTime"])
        if "lateNightEndTime" in payload:
            current["lateNightEndTime"] = str(payload["lateNightEndTime"])

        # 4. Waiting Charges
        if "waitingEnabled" in payload:
            current["waitingEnabled"] = bool(payload["waitingEnabled"])
        if "freeWaitingMinutes" in payload:
            current["freeWaitingMinutes"] = max(0, int(payload["freeWaitingMinutes"]))
        if "waitingFeePerMinute" in payload:
            current["waitingFeePerMinute"] = max(0.0, float(payload["waitingFeePerMinute"]))

        # 5. Vehicle Modifiers
        if "vehicleTypeMultipliers" in payload and isinstance(payload["vehicleTypeMultipliers"], dict):
            current["vehicleTypeMultipliers"] = {
                **current.get("vehicleTypeMultipliers", {}),
                **payload["vehicleTypeMultipliers"],
            }

        # 6. Service Extras
        if "expressBonus" in payload:
            current["expressBonus"] = max(0.0, float(payload["expressBonus"]))

        # 7. City Overrides
        if "cityOverrides" in payload and isinstance(payload["cityOverrides"], dict):
            current["cityOverrides"] = payload["cityOverrides"]

        self._cached_config = current

        # Persist to database
        try:
            await database.collection(FARE_SETTINGS_COLLECTION).update_one(
                {"_id": SETTINGS_DOC_ID},
                {"$set": {**current, "updatedAt": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
        except Exception as db_err:
            logger.error("⚡ [DistanceRateEngine] DB update error: %s", db_err)

        return self.get_config()

    async def reset_defaults(self) -> Dict[str, Any]:
        """Restores factory default fare configuration."""
        self._cached_config = dict(DEFAULT_DISTANCE_RATE_CONFIG)
        try:
            await database.collection(FARE_SETTINGS_COLLECTION).update_one(
                {"_id": SETTINGS_DOC_ID},
                {"$set": {**DEFAULT_DISTANCE_RATE_CONFIG, "updatedAt": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
        except Exception as err:
            logger.error("⚡ [DistanceRateEngine] DB reset error: %s", err)
        return self.get_config()

    def _is_within_time_window(self, target_time: time, start_str: str, end_str: str) -> bool:
        """Determines if a target time falls within a given start/end string window."""
        try:
            s_h, s_m = map(int, start_str.split(":"))
            e_h, e_m = map(int, end_str.split(":"))
            s_time = time(s_h, s_m)
            e_time = time(e_h, e_m)

            if s_time <= e_time:
                # Same day window (e.g. 08:00 to 11:00)
                return s_time <= target_time <= e_time
            else:
                # Overnight window crossing midnight (e.g. 22:00 to 06:00)
                return target_time >= s_time or target_time <= e_time
        except Exception:
            return False

    def calculate_trip_fare(
        self,
        distance_km: float,
        timestamp: Optional[datetime] = None,
        is_rain: bool = False,
        is_express: bool = False,
        waiting_minutes: int = 0,
        vehicle_type: str = "bike",
        city: Optional[str] = None,
        current_time_str: Optional[str] = None,
    ) -> FareBreakdown:
        """Calculates precise trip fare with complete mathematical breakdown."""
        cfg = self.get_config()

        # Apply city overrides if configured
        if city and city in cfg.get("cityOverrides", {}):
            cfg = {**cfg, **cfg["cityOverrides"][city]}

        if current_time_str:
            try:
                h, m = map(int, current_time_str.split(":"))
                target_local_time = time(h, m)
            except Exception:
                target_local_time = (timestamp or datetime.now(timezone.utc)).time()
        else:
            dt = timestamp or datetime.now(timezone.utc)
            target_local_time = dt.time()

        # 1. Base Distance & Extra KM Component
        base_fare = float(cfg["baseFare"])
        base_dist = float(cfg["baseDistanceKm"])
        extra_rate = float(cfg["extraKmRate"])
        dist = max(0.1, round(float(distance_km), 2))

        extra_km = max(0.0, round(dist - base_dist, 2))
        distance_fare = round(extra_km * extra_rate, 2)

        # 2. Late Night Component
        is_night = False
        night_fee = 0.0
        if cfg.get("lateNightEnabled", True):
            if self._is_within_time_window(
                target_local_time,
                cfg.get("lateNightStartTime", "22:00"),
                cfg.get("lateNightEndTime", "06:00"),
            ):
                is_night = True
                night_fee = float(cfg.get("lateNightFee", 25.0))

        # 3. Surge Component
        is_surge = False
        surge_fee = 0.0
        surge_reasons: List[str] = []
        surge_multiplier = float(cfg.get("surgeMultiplier", 1.0))

        if cfg.get("surgeEnabled", True):
            # Weather Surge
            if is_rain:
                is_surge = True
                rain_fee = float(cfg.get("rainSurgeFee", 20.0))
                surge_fee += rain_fee
                surge_reasons.append("Monsoon Rain Surge")

            # Peak Rush Hours Surge
            for window in cfg.get("peakHours", []):
                if self._is_within_time_window(target_local_time, window.get("start", ""), window.get("end", "")):
                    is_surge = True
                    peak_fee = float(cfg.get("peakHourSurgeFee", 15.0))
                    surge_fee += peak_fee
                    surge_reasons.append(f"Peak Rush Hour ({window.get('start')}-{window.get('end')})")
                    break

            # Dynamic demand multiplier on distance subtotal
            if surge_multiplier > 1.0:
                is_surge = True
                multiplier_fee = round((base_fare + distance_fare) * (surge_multiplier - 1.0), 2)
                surge_fee += multiplier_fee
                surge_reasons.append(f"Demand Surge ({surge_multiplier}x)")

        # 4. Waiting Component
        waiting_fare = 0.0
        free_waiting = int(cfg.get("freeWaitingMinutes", 5))
        billable_waiting = 0
        if cfg.get("waitingEnabled", True) and waiting_minutes > free_waiting:
            billable_waiting = waiting_minutes - free_waiting
            rate_per_min = float(cfg.get("waitingFeePerMinute", 2.0))
            waiting_fare = round(billable_waiting * rate_per_min, 2)

        # 5. Express Priority Bonus
        express_bonus = float(cfg.get("expressBonus", 25.0)) if is_express else 0.0

        # 6. Vehicle Type Multiplier
        v_type = (vehicle_type or "bike").lower()
        v_multiplier = float(cfg.get("vehicleTypeMultipliers", {}).get(v_type, 1.0))

        # 7. Total Sum
        subtotal_before_vehicle = (
            base_fare
            + distance_fare
            + night_fee
            + surge_fee
            + waiting_fare
            + express_bonus
        )
        raw_total = round(subtotal_before_vehicle * v_multiplier, 2)

        # 8. Clamp Minimum Floor & Maximum Cap
        min_floor = float(cfg.get("minimumFare", 30.0))
        max_cap = float(cfg.get("maximumFareCap", 600.0))

        is_clamped_min = False
        is_clamped_max = False
        final_total = raw_total

        if final_total < min_floor:
            final_total = min_floor
            is_clamped_min = True
        elif final_total > max_cap:
            final_total = max_cap
            is_clamped_max = True

        final_total = round(final_total, 2)

        # Build human-readable breakdown text
        parts: List[str] = [f"Base ₹{int(base_fare)}"]
        if extra_km > 0:
            parts.append(f"Extra {extra_km}km (+₹{int(round(distance_fare))})")
        if is_night:
            parts.append(f"Night (+₹{int(round(night_fee))})")
        if is_surge:
            parts.append(f"Surge (+₹{int(round(surge_fee))})")
        if waiting_fare > 0:
            parts.append(f"Wait {billable_waiting}m (+₹{int(round(waiting_fare))})")
        if express_bonus > 0:
            parts.append(f"Express (+₹{int(round(express_bonus))})")

        breakdown_text = " • ".join(parts)

        return FareBreakdown(
            baseFare=base_fare,
            baseDistanceKm=base_dist,
            distanceKm=dist,
            extraDistanceKm=extra_km,
            extraKmRate=extra_rate,
            distanceFare=distance_fare,
            isNight=is_night,
            nightFee=night_fee,
            isSurge=is_surge,
            surgeMultiplier=surge_multiplier,
            surgeFee=surge_fee,
            surgeReason=", ".join(surge_reasons) if surge_reasons else "Normal Traffic",
            waitingMinutes=waiting_minutes,
            freeWaitingMinutes=free_waiting,
            billableWaitingMinutes=billable_waiting,
            waitingFare=waiting_fare,
            expressBonus=express_bonus,
            vehicleType=v_type,
            vehicleMultiplier=v_multiplier,
            rawTotal=raw_total,
            totalFare=final_total,
            isClampedMin=is_clamped_min,
            isClampedMax=is_clamped_max,
            breakdownText=breakdown_text,
        )

    def simulate_fare(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Simulation tool for Admin Console interactive calculator."""
        dist = float(params.get("distanceKm", 3.0))
        is_rain = bool(params.get("isRain", False))
        is_express = bool(params.get("isExpress", False))
        waiting_mins = int(params.get("waitingMinutes", 0))
        vehicle = str(params.get("vehicleType", "bike"))
        city = params.get("city")

        # Optional time simulation
        simulated_time_str = params.get("timeOfDay")  # "HH:MM" e.g. "23:30"
        sim_dt = datetime.now(timezone.utc)
        if simulated_time_str:
            try:
                sh, sm = map(int, simulated_time_str.split(":"))
                sim_dt = sim_dt.replace(hour=sh, minute=sm, second=0)
            except Exception:
                pass

        result = self.calculate_trip_fare(
            distance_km=dist,
            timestamp=sim_dt,
            is_rain=is_rain,
            is_express=is_express,
            waiting_minutes=waiting_mins,
            vehicle_type=vehicle,
            city=city,
        )
        return result.to_dict()


distance_rate_engine = DistanceRateEngine()
