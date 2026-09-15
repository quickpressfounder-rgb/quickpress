"""QuickPress Captain "My Route Booking" Engine.

Real-world Rapido / Uber / Zomato style Destination Mode for delivery captains.
Allows Captains to set a destination (e.g., Home, Station, Market) when finishing
shifts or traveling across the city. The engine ensures incoming dispatch offers
align with the Captain's travel corridor and destination trajectory.

Backed by Supabase PostgreSQL (quickpress_documents).
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger(__name__)

ROUTE_BOOKINGS_COLLECTION = "rider_route_bookings"
RIDERS_COLLECTION = "rider_profiles"
DEFAULT_MAX_PASSES_PER_DAY = 3

# Pre-seeded reference landmarks for Kasganj city
KASGANJ_LANDMARKS = [
    {
        "id": "loc-home-default",
        "name": "Home",
        "type": "home",
        "address": "Soron Gate, Near Chamunda Mandir, Kasganj",
        "lat": 27.8150,
        "lng": 78.6490,
    },
    {
        "id": "loc-hub-ksj",
        "name": "QuickPress Express Hub",
        "type": "hub",
        "address": "Soron Gate Commercial Complex, Kasganj",
        "lat": 27.8118,
        "lng": 78.6477,
    },
    {
        "id": "loc-railway-ksj",
        "name": "Kasganj Railway Junction",
        "type": "station",
        "address": "Station Road, Railway Colony, Kasganj",
        "lat": 27.8035,
        "lng": 78.6420,
    },
    {
        "id": "loc-bilram-ksj",
        "name": "Bilram Gate Market",
        "type": "market",
        "address": "Bilram Gate Main Road, Kasganj",
        "lat": 27.8080,
        "lng": 78.6530,
    },
    {
        "id": "loc-nadrai-ksj",
        "name": "Nadrai Gate & Aqueduct",
        "type": "landmark",
        "address": "Nadrai Gate, Kasganj",
        "lat": 27.8220,
        "lng": 78.6380,
    },
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    try:
        r = 6371.0  # Earth radius in km
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_phi = math.radians(float(lat2) - float(lat1))
        delta_lambda = math.radians(float(lon2) - float(lon1))

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(r * c, 2)
    except Exception:
        return 999.0


class RouteBookingEngine:
    """Manages Captain Route Bookings, corridor tolerances, and order suitability."""

    async def get_rider_route_state(self, rider_id: str) -> Dict[str, Any]:
        """Fetch or initialize the route booking state for a rider."""
        now_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        doc = await database.find_one(ROUTE_BOOKINGS_COLLECTION, {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})
        if not doc:
            # Initialize with default Home route in Kasganj
            default_dest = KASGANJ_LANDMARKS[0]
            doc = {
                "_id": rider_id,
                "riderId": rider_id,
                "isActive": False,
                "destination": default_dest,
                "maxDetourKm": 2.0,  # Max allowed corridor detour
                "passesUsedToday": 0,
                "passesRemaining": DEFAULT_MAX_PASSES_PER_DAY,
                "maxPassesPerDay": DEFAULT_MAX_PASSES_PER_DAY,
                "lastResetDate": now_date_str,
                "savedAddresses": KASGANJ_LANDMARKS[:3],
                "activatedAt": None,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
            await database.insert(ROUTE_BOOKINGS_COLLECTION, doc)
            return doc

        # Check if daily passes need to be reset (new calendar day)
        if doc.get("lastResetDate") != now_date_str:
            doc["lastResetDate"] = now_date_str
            doc["passesUsedToday"] = 0
            doc["passesRemaining"] = doc.get("maxPassesPerDay", DEFAULT_MAX_PASSES_PER_DAY)
            await database.update(
                ROUTE_BOOKINGS_COLLECTION,
                {"_id": doc["_id"]},
                {
                    "lastResetDate": now_date_str,
                    "passesUsedToday": 0,
                    "passesRemaining": doc.get("maxPassesPerDay", DEFAULT_MAX_PASSES_PER_DAY),
                },
            )

        return doc

    async def toggle_route_booking(self, rider_id: str, enable: bool) -> Dict[str, Any]:
        """Activate or deactivate Route Booking."""
        state = await self.get_rider_route_state(rider_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        if enable:
            # Check passes
            passes_rem = int(state.get("passesRemaining", DEFAULT_MAX_PASSES_PER_DAY))
            if passes_rem <= 0 and not state.get("isActive"):
                return {
                    "ok": False,
                    "error": "No daily route passes left. Passes reset at 12:00 AM midnight.",
                    "state": state,
                }

            dest = state.get("destination")
            if not dest or not dest.get("lat") or not dest.get("lng"):
                return {
                    "ok": False,
                    "error": "Please configure your destination address first.",
                    "state": state,
                }

            # Deduct pass only on initial activation
            new_passes_rem = max(0, passes_rem - 1)
            new_passes_used = int(state.get("passesUsedToday", 0)) + 1

            updates = {
                "isActive": True,
                "activatedAt": now_iso,
                "passesRemaining": new_passes_rem,
                "passesUsedToday": new_passes_used,
                "updatedAt": now_iso,
            }
            await database.update(ROUTE_BOOKINGS_COLLECTION, {"_id": state["_id"]}, updates)

            # Sync with rider profile
            await database.update(
                RIDERS_COLLECTION,
                {"$or": [{"_id": rider_id}, {"riderId": rider_id}]},
                {"routeBookingActive": True, "routeDestination": dest},
            )

            state.update(updates)
            return {"ok": True, "isActive": True, "state": state}
        else:
            updates = {
                "isActive": False,
                "updatedAt": now_iso,
            }
            await database.update(ROUTE_BOOKINGS_COLLECTION, {"_id": state["_id"]}, updates)

            # Sync with rider profile
            await database.update(
                RIDERS_COLLECTION,
                {"$or": [{"_id": rider_id}, {"riderId": rider_id}]},
                {"routeBookingActive": False},
            )

            state.update(updates)
            return {"ok": True, "isActive": False, "state": state}

    async def update_destination(
        self,
        rider_id: str,
        name: str,
        address: str,
        lat: float,
        lng: float,
        max_detour_km: float = 2.0,
        dest_type: str = "custom",
    ) -> Dict[str, Any]:
        """Set the active route destination and detour tolerance."""
        state = await self.get_rider_route_state(rider_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        dest_obj = {
            "id": f"dest-{int(datetime.now(timezone.utc).timestamp())}",
            "name": name.strip() or "Custom Destination",
            "type": dest_type,
            "address": address.strip() or f"{lat:.4f}, {lng:.4f}",
            "lat": float(lat),
            "lng": float(lng),
        }

        detour_val = max(0.5, min(float(max_detour_km), 10.0))

        updates = {
            "destination": dest_obj,
            "maxDetourKm": detour_val,
            "updatedAt": now_iso,
        }
        await database.update(ROUTE_BOOKINGS_COLLECTION, {"_id": state["_id"]}, updates)

        # Sync with rider profile
        await database.update(
            RIDERS_COLLECTION,
            {"$or": [{"_id": rider_id}, {"riderId": rider_id}]},
            {"routeDestination": dest_obj, "routeMaxDetourKm": detour_val},
        )

        state.update(updates)
        return {"ok": True, "destination": dest_obj, "state": state}

    async def save_address_preset(
        self, rider_id: str, name: str, address: str, lat: float, lng: float, dest_type: str = "saved"
    ) -> List[Dict[str, Any]]:
        """Add an address to the captain's saved presets list."""
        state = await self.get_rider_route_state(rider_id)
        saved = list(state.get("savedAddresses") or [])

        new_item = {
            "id": f"preset-{len(saved)+1}-{int(datetime.now(timezone.utc).timestamp())}",
            "name": name.strip(),
            "type": dest_type,
            "address": address.strip(),
            "lat": float(lat),
            "lng": float(lng),
        }
        saved.append(new_item)

        await database.update(ROUTE_BOOKINGS_COLLECTION, {"_id": state["_id"]}, {"savedAddresses": saved})
        return saved

    async def delete_address_preset(self, rider_id: str, preset_id: str) -> List[Dict[str, Any]]:
        """Remove a saved preset address."""
        state = await self.get_rider_route_state(rider_id)
        saved = [s for s in (state.get("savedAddresses") or []) if s.get("id") != preset_id]

        await database.update(ROUTE_BOOKINGS_COLLECTION, {"_id": state["_id"]}, {"savedAddresses": saved})
        return saved

    def evaluate_order_route_alignment(
        self,
        rider_lat: float,
        rider_lng: float,
        dest_lat: float,
        dest_lng: float,
        pickup_lat: float,
        pickup_lng: float,
        drop_lat: float,
        drop_lng: float,
        max_detour_km: float = 2.0,
    ) -> Dict[str, Any]:
        """
        Calculates if an order's pickup & drop locations lie on the Captain's travel corridor.

        Geometric Corridor Logic:
        1. D_direct = Distance from Captain's current position to destination.
        2. D_trip = Distance (Captain -> Pickup) + (Pickup -> Drop) + (Drop -> Destination).
        3. Detour = D_trip - D_direct.
        4. Drop proximity = Distance from Drop to Destination.
        """
        d_direct = haversine_distance_km(rider_lat, rider_lng, dest_lat, dest_lng)
        d_rider_to_pickup = haversine_distance_km(rider_lat, rider_lng, pickup_lat, pickup_lng)
        d_pickup_to_drop = haversine_distance_km(pickup_lat, pickup_lng, drop_lat, drop_lng)
        d_drop_to_dest = haversine_distance_km(drop_lat, drop_lng, dest_lat, dest_lng)

        d_total_route = round(d_rider_to_pickup + d_pickup_to_drop + d_drop_to_dest, 2)
        detour_km = round(max(0.0, d_total_route - d_direct), 2)

        # An order matches the route if:
        # a) The extra detour is within the captain's specified max detour corridor, OR
        # b) The delivery drop gets the captain closer to their destination than their current spot!
        is_heading_towards_dest = d_drop_to_dest < d_direct
        is_detour_acceptable = detour_km <= max_detour_km
        is_drop_near_dest = d_drop_to_dest <= max_detour_km

        is_match = (is_detour_acceptable and is_heading_towards_dest) or is_drop_near_dest or (detour_km <= 1.0)

        # Savings score (higher = better alignment)
        alignment_score = max(0, int(round((1.0 - (detour_km / (max_detour_km + 1.0))) * 100)))

        return {
            "isMatch": is_match,
            "detourKm": detour_km,
            "totalRouteKm": d_total_route,
            "directDistanceKm": d_direct,
            "distanceToPickupKm": d_rider_to_pickup,
            "distanceFromDropToDestKm": d_drop_to_dest,
            "alignmentScore": alignment_score,
            "isHeadingTowardsDest": is_heading_towards_dest,
        }


route_booking_engine = RouteBookingEngine()
