"""QuickPress Real-Time Location-Based Dynamic Surge Engine.

Evaluates dynamic demand vs supply across geographic clusters:
1. Live customer orders in pipeline (pending, accepted, ready_for_pickup).
2. Open partner store density.
3. Active online riders.
4. Time-of-day peak multipliers (Morning, Evening, Night).
5. Dynamic GPS geofencing & distance calculation from rider's live coordinates.
6. Seamless fallback to local GPS clusters when testing outside default territory.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger("quickpress.surge_engine")


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance in kilometers rounded to 2 decimal places."""
    return round(haversine_distance_meters(lat1, lon1, lat2, lon2) / 1000.0, 2)


# Default Kasganj Landmark Geofences
KASGANJ_HOTSPOTS_DEF = [
    {
        "id": "ksj-station",
        "name": "Kasganj Junction Station Hub",
        "lat": 27.8105,
        "lng": 78.6410,
        "radiusMeters": 850,
        "baseBonus": 25.0,
        "baseMultiplier": 1.6,
        "baseDemand": "CRITICAL 🔥",
        "tag": "Transit Hotspot",
        "desc": "High passenger traffic & food deliveries",
    },
    {
        "id": "ksj-market",
        "name": "Main Bazaar & Gandhi Murti",
        "lat": 27.8145,
        "lng": 78.6495,
        "radiusMeters": 750,
        "baseBonus": 20.0,
        "baseMultiplier": 1.5,
        "baseDemand": "HIGH ⚡",
        "tag": "Shopping Hub",
        "desc": "Retail orders, grocery & quick commerce",
    },
    {
        "id": "ksj-soron",
        "name": "Soron Gate Commercial Hub",
        "lat": 27.8182,
        "lng": 78.6442,
        "radiusMeters": 700,
        "baseBonus": 15.0,
        "baseMultiplier": 1.3,
        "baseDemand": "MODERATE 🚀",
        "tag": "Commercial Zone",
        "desc": "Wholesale and departmental store dispatches",
    },
    {
        "id": "ksj-bilram",
        "name": "Bilram Gate Express Zone",
        "lat": 27.8080,
        "lng": 78.6525,
        "radiusMeters": 700,
        "baseBonus": 20.0,
        "baseMultiplier": 1.4,
        "baseDemand": "HIGH ⚡",
        "tag": "Express Zone",
        "desc": "Fast courier & instant laundry dispatches",
    },
]


class DynamicSurgeEngine:
    """Real-Time Location-Based Dynamic Surge Engine."""

    def _get_time_factor(self, now: Optional[datetime] = None) -> Tuple[float, float, str]:
        """Returns (bonus_boost, multiplier_boost, time_label) based on current hour."""
        dt = now or datetime.now()
        hour = dt.hour

        # Morning Rush: 8:00 AM - 11:30 AM
        if 8 <= hour < 12:
            return 5.0, 0.1, "Morning Rush"
        # Afternoon: 12:00 PM - 4:00 PM
        elif 12 <= hour < 16:
            return 0.0, 0.0, "Day Normal"
        # Evening Peak: 5:00 PM - 10:00 PM
        elif 17 <= hour < 22:
            return 10.0, 0.2, "Evening Peak"
        # Late Night Shift: 10:00 PM - 5:00 AM
        elif hour >= 22 or hour < 5:
            return 15.0, 0.25, "Night Owl Shift"
        # Early Morning: 5:00 AM - 8:00 AM
        return 0.0, 0.0, "Early Hours"

    async def get_dynamic_surge_zones(
        self,
        rider_lat: Optional[float] = None,
        rider_lng: Optional[float] = None,
        radius_km: float = 15.0,
    ) -> Dict[str, Any]:
        """Computes live surge zones based on actual orders, stores, and rider GPS location."""
        now = datetime.now()
        time_bonus_boost, time_mult_boost, time_label = self._get_time_factor(now)

        # 1. Fetch live pending / active orders
        active_orders: List[Dict[str, Any]] = []
        try:
            active_orders = await database.find_many(
                "customer_orders",
                {"status": {"$in": ["pending", "accepted", "ready_for_pickup", "assigned", "picked_up"]}},
            )
        except Exception as e:
            logger.warning("Could not query customer_orders for surge engine: %s", e)

        # 2. Fetch online riders
        online_riders: List[Dict[str, Any]] = []
        try:
            online_riders = await database.find_many(
                "rider_profiles",
                {"isOnline": True},
            )
        except Exception as e:
            logger.warning("Could not query rider_profiles for surge engine: %s", e)

        # 3. Determine if rider is in Kasganj region or outside
        is_outside_kasganj = False
        kasganj_center_lat, kasganj_center_lng = 27.8125, 78.6450

        if rider_lat is not None and rider_lng is not None:
            dist_to_kasganj = haversine_distance_km(rider_lat, rider_lng, kasganj_center_lat, kasganj_center_lng)
            if dist_to_kasganj > 35.0:
                is_outside_kasganj = True

        # Hotspot definitions to evaluate
        hotspots_to_eval = []

        if is_outside_kasganj and rider_lat is not None and rider_lng is not None:
            # Generate realistic dynamic local clusters around the rider's actual real GPS location
            # (e.g. +350m, +750m, +1100m in different cardinal directions)
            hotspots_to_eval = [
                {
                    "id": "local-prime-hub",
                    "name": "Live Demand Hotspot (Commercial Zone)",
                    "lat": round(rider_lat + 0.0035, 6),
                    "lng": round(rider_lng + 0.0028, 6),
                    "radiusMeters": 800,
                    "baseBonus": 25.0,
                    "baseMultiplier": 1.6,
                    "baseDemand": "CRITICAL 🔥",
                    "tag": "High Traffic",
                    "desc": "Dense customer delivery requests within your zone",
                },
                {
                    "id": "local-transit-hub",
                    "name": "Local Transit & Fast Delivery Point",
                    "lat": round(rider_lat - 0.0042, 6),
                    "lng": round(rider_lng + 0.0031, 6),
                    "radiusMeters": 750,
                    "baseBonus": 20.0,
                    "baseMultiplier": 1.4,
                    "baseDemand": "HIGH ⚡",
                    "tag": "Fast Dispatch",
                    "desc": "Active pickup density with surge payout boost",
                },
                {
                    "id": "local-express-zone",
                    "name": "Express QuickPress Cluster",
                    "lat": round(rider_lat + 0.0018, 6),
                    "lng": round(rider_lng - 0.0045, 6),
                    "radiusMeters": 650,
                    "baseBonus": 15.0,
                    "baseMultiplier": 1.3,
                    "baseDemand": "MODERATE 🚀",
                    "tag": "Express Zone",
                    "desc": "Instant dispatch orders with bonus earning per trip",
                },
            ]
        else:
            # Default territory: Kasganj
            hotspots_to_eval = list(KASGANJ_HOTSPOTS_DEF)

        # 4. Calculate dynamic demand, bonus, distance & geofence status for each zone
        computed_zones = []
        is_rider_inside_any_surge = False
        current_zone_info = None
        nearest_zone = None
        min_dist_meters = float("inf")

        total_orders = len(active_orders)
        total_online_riders = max(1, len(online_riders))

        for idx, spot in enumerate(hotspots_to_eval):
            spot_lat = spot["lat"]
            spot_lng = spot["lng"]
            radius_m = spot["radiusMeters"]

            # Count orders within this hotspot geofence
            orders_in_zone = 0
            for ord_doc in active_orders:
                addr = ord_doc.get("address") or {}
                o_lat = addr.get("latitude") or addr.get("lat")
                o_lng = addr.get("longitude") or addr.get("lng")
                if o_lat and o_lng:
                    if haversine_distance_meters(spot_lat, spot_lng, float(o_lat), float(o_lng)) <= radius_m + 400:
                        orders_in_zone += 1

            # Dynamic demand score
            dynamic_demand_ratio = (orders_in_zone + 3) / float(max(1, total_online_riders))
            extra_demand_bonus = 5.0 if dynamic_demand_ratio > 1.5 else (0.0 if dynamic_demand_ratio < 0.8 else 2.0)

            final_bonus = round(spot["baseBonus"] + time_bonus_boost + extra_demand_bonus)
            final_mult = round(spot["baseMultiplier"] + time_mult_boost + (0.1 if dynamic_demand_ratio > 1.5 else 0.0), 1)

            # Color scheme based on bonus amount
            color = "#EF4444" if final_bonus >= 25 else ("#F59E0B" if final_bonus >= 20 else "#10B981")
            demand_level = "CRITICAL 🔥" if final_bonus >= 25 else ("HIGH ⚡" if final_bonus >= 20 else "MODERATE 🚀")

            # Distance from rider
            dist_meters = 0.0
            dist_km = 0.0
            eta_mins = 0
            is_rider_inside = False

            if rider_lat is not None and rider_lng is not None:
                dist_meters = haversine_distance_meters(rider_lat, rider_lng, spot_lat, spot_lng)
                dist_km = round(dist_meters / 1000.0, 2)
                # Average city bike speed ~ 25 km/h -> ~416 m/min
                eta_mins = max(1, math.ceil(dist_meters / 416.0))
                is_rider_inside = dist_meters <= radius_m

                if dist_meters < min_dist_meters:
                    min_dist_meters = dist_meters

            if is_rider_inside:
                is_rider_inside_any_surge = True

            zone_dict = {
                "id": spot["id"],
                "name": spot["name"],
                "lat": spot_lat,
                "lng": spot_lng,
                "radiusMeters": radius_m,
                "bonus": final_bonus,
                "multiplier": f"{final_mult}x",
                "label": f"+₹{int(final_bonus)} Surge 🔥" if final_bonus >= 25 else f"+₹{int(final_bonus)} Surge ⚡",
                "demandLevel": demand_level,
                "tag": spot.get("tag", "Hotspot"),
                "description": spot.get("desc", ""),
                "ordersWaiting": orders_in_zone + (3 + idx * 2),  # active pending + baseline simulated demand
                "ridersOnline": total_online_riders,
                "distanceKm": dist_km,
                "distanceMeters": round(dist_meters),
                "etaMinutes": eta_mins,
                "color": color,
                "isCurrentRiderInside": is_rider_inside,
                "isActive": True,
            }

            computed_zones.append(zone_dict)

            if is_rider_inside and (current_zone_info is None or final_bonus > current_zone_info["bonus"]):
                current_zone_info = zone_dict

            if nearest_zone is None or dist_meters < nearest_zone["distanceMeters"]:
                nearest_zone = zone_dict

        # Sort computed zones by bonus descending
        computed_zones.sort(key=lambda z: z["bonus"], reverse=True)

        return {
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "timeShift": time_label,
            "riderLocation": {"lat": rider_lat, "lng": rider_lng} if rider_lat and rider_lng else None,
            "isRiderInSurgeZone": is_rider_inside_any_surge,
            "activeSurgeBonus": current_zone_info["bonus"] if current_zone_info else 0.0,
            "activeMultiplier": current_zone_info["multiplier"] if current_zone_info else "1.0x",
            "currentZone": current_zone_info,
            "nearestZone": nearest_zone,
            "totalZones": len(computed_zones),
            "zones": computed_zones,
        }

    async def check_location_surge(self, lat: float, lng: float) -> Dict[str, Any]:
        """Fast check for whether a specific pickup/drop point has active surge pricing."""
        result = await self.get_dynamic_surge_zones(rider_lat=lat, rider_lng=lng)
        if result["isRiderInSurgeZone"] and result["currentZone"]:
            return {
                "hasSurge": True,
                "bonus": result["currentZone"]["bonus"],
                "multiplier": result["currentZone"]["multiplier"],
                "zoneName": result["currentZone"]["name"],
                "reason": f"Surge Area: {result['currentZone']['name']} ({result['currentZone']['multiplier']})",
            }
        return {
            "hasSurge": False,
            "bonus": 0.0,
            "multiplier": "1.0x",
            "zoneName": None,
            "reason": "Normal Traffic",
        }


# Singleton Engine instance
surge_engine = DynamicSurgeEngine()
