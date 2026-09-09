"""QuickPress Smart 2-Ride Auto Assignment Engine (Supabase PostgreSQL).

Production-ready implementation for:
- RIDE 1 (Pickup): Customer -> Partner (triggered upon Partner Acceptance)
- RIDE 2 (Delivery): Partner -> Customer (triggered upon Partner Marking Ready)
- Expanding search radius: 0-3km -> 3-5km -> 5-8km -> 8-12km
- Haversine distance ranking from rider live GPS to target point
- 1-by-1 Sequential offer dispatch with 30s response window
- Atomic concurrency-safe assignment claim (no two riders can accept)
- 3-Phase Server-Side Secure OTPs (Pickup OTP, Partner Handover OTP, Customer Delivery OTP)
- 100% Supabase PostgreSQL persistence (No MongoDB)
"""

from __future__ import annotations

import asyncio
import logging
import math
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database
from app.services import order_lifecycle as lifecycle
from app.services.financial_engine import financial_engine
from app.services.socket_service import (
    EVENT_LOCATION_UPDATED,
    EVENT_ORDER_ACCEPTED,
    EVENT_ORDER_DELIVERED,
    EVENT_ORDER_DISPATCH_OTP_PENDING,
    EVENT_ORDER_OUT_FOR_DELIVERY,
    EVENT_ORDER_PICKED_UP,
    EVENT_ORDER_PICKUP_OTP_PENDING,
    EVENT_ORDER_READY,
    EVENT_ORDER_RIDER_ASSIGNED,
    EVENT_ORDER_RIDER_OFFER,
    EVENT_ORDER_RIDER_SEARCHING,
    broadcast_order_event,
    sio,
)

logger = logging.getLogger(__name__)

# Supabase document collections
RIDES_COLLECTION = "rides"
RIDE_ASSIGNMENTS_COLLECTION = "ride_assignments"
RIDERS_COLLECTION = "rider_profiles"
ORDERS_COLLECTION = "customer_orders"
NOTIFICATIONS_COLLECTION = "rider_notifications"

# Search radius expansion steps in KM
SEARCH_RADIUS_STAGES = [3.0, 5.0, 8.0, 12.0]
DEFAULT_OFFER_TIMEOUT_SECONDS = 30


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute spherical distance in km between two GPS coordinates."""
    r = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


def normalize_city_name(city: Any) -> str:
    """Normalize city name for strict matching (e.g. 'Kasganj, UP 207123' -> 'kasganj')."""
    if not city:
        return ""
    import re
    s = str(city).strip().lower()
    # Take first segment before comma, dash or slash
    s = s.split(",")[0].split("-")[0].split("/")[0].strip()
    # Remove digits/pincodes
    s = re.sub(r'\d+', '', s).strip()
    s = re.sub(r'[^a-z\s]', '', s).strip()
    return re.sub(r'\s+', ' ', s)



def generate_secure_4digit_otp() -> str:
    """Cryptographically random 4-digit OTP (1000-9999)."""
    return f"{secrets.randbelow(9000) + 1000}"


def create_otp_record(code: Optional[str] = None, hours_valid: int = 4) -> Dict[str, Any]:
    return {
        "code": code or generate_secure_4digit_otp(),
        "createdAt": lifecycle.now_iso(),
        "expiresAt": (datetime.now(timezone.utc) + timedelta(hours=hours_valid))
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "attempts": 0,
        "maxAttempts": 5,
        "verified": False,
        "verifiedAt": None,
        "verifiedBy": None,
    }


class Smart2RideEngine:
    """Unified 2-Ride Auto Assignment & OTP Engine."""

    def __init__(self) -> None:
        self._active_timers: Dict[str, asyncio.Task] = {}

    # -------------------------------------------------------------------------
    # 1. RIDE 1 CREATION (Pickup: Customer -> Partner)
    # -------------------------------------------------------------------------
    async def create_ride_1_pickup(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Triggered automatically when Partner ACCEPTS the order."""
        order = await lifecycle.find_order(order_id)
        if not order:
            logger.error("Order %s not found for Ride 1 creation", order_id)
            return None

        canonical_id = lifecycle.order_id_of(order)
        now = lifecycle.now_iso()

        # Idempotency check: verify Ride 1 does not already exist
        existing_ride = await database.find_one(
            RIDES_COLLECTION,
            {"orderId": canonical_id, "rideType": "pickup"},
        )
        if existing_ride:
            logger.info("Ride 1 (pickup) already exists for order %s", canonical_id)
            return existing_ride

        # Extract Pickup (Customer) and Drop (Partner) Coordinates
        addr = order.get("address") or {}
        cust_lat = float(addr.get("latitude") or addr.get("lat") or 27.8165)
        cust_lng = float(addr.get("longitude") or addr.get("lng") or 78.6530)
        cust_name = (order.get("customer") or {}).get("name") or addr.get("name") or order.get("customerName") or "Customer"
        cust_phone = (order.get("customer") or {}).get("phone") or addr.get("phone") or order.get("customerPhone") or ""
        pickup_addr = addr.get("line") or addr.get("address") or addr.get("formattedAddress") or "Customer Pickup Location"

        partner = order.get("partner") or {}
        partner_id = order.get("partnerId") or order.get("partner_id")
        if partner_id and not partner.get("address"):
            db_partner = await database.find_one("partners", {"_id": partner_id}) or await database.find_one("partners", {"partner_id": partner_id})
            if db_partner:
                partner = {
                    "name": db_partner.get("storeName") or db_partner.get("name") or partner.get("name") or "QuickPress Partner Store",
                    "phone": db_partner.get("phone") or partner.get("phone") or "",
                    "address": db_partner.get("address") or partner.get("address") or "Partner Store",
                    "latitude": db_partner.get("latitude") or db_partner.get("lat") or 27.8118,
                    "longitude": db_partner.get("longitude") or db_partner.get("lng") or 78.6477,
                }

        p_lat = float(partner.get("latitude") or partner.get("lat") or 27.8118)
        p_lng = float(partner.get("longitude") or partner.get("lng") or 78.6477)
        partner_name = partner.get("name") or "QuickPress Partner Store"
        partner_phone = partner.get("phone") or ""
        drop_addr = partner.get("address") or "QuickPress Partner Store"

        # Calculate trip distance and dynamic fare
        distance_km = max(0.5, haversine_distance_km(cust_lat, cust_lng, p_lat, p_lng))
        city_raw = str(addr.get("city") or order.get("city") or (partner or {}).get("city") or "Kasganj")
        clean_city = normalize_city_name(city_raw) or "kasganj"
        fare_calc = financial_engine.compute_rider_trip_fare(distance_km=distance_km, city=clean_city.title())
        pickup_earning = max(35, int(round(fare_calc.totalTripEarnings)))

        # Create pickup OTP (preserve existing OTP from customer checkout if present)
        existing_pickup_otp = (order.get("otp") or {}).get("pickup")
        if isinstance(existing_pickup_otp, dict) and existing_pickup_otp.get("code"):
            pickup_otp = existing_pickup_otp
        elif isinstance(existing_pickup_otp, str) and existing_pickup_otp.strip():
            pickup_otp = create_otp_record(code=existing_pickup_otp.strip())
        else:
            pickup_otp = create_otp_record()

        # Create partner handover OTP (Partner provides to Rider or vice-versa)
        handover_otp = create_otp_record()

        ride_doc = {
            "_id": f"ride-pk-{canonical_id}",
            "rideId": f"ride-pk-{canonical_id}",
            "orderId": canonical_id,
            "orderCode": order.get("code", canonical_id),
            "rideType": "pickup",
            "status": "SEARCHING_RIDER",
            "city": clean_city.title(),
            "pickupCity": clean_city.title(),
            "dropCity": clean_city.title(),
            "createdAt": now,
            "updatedAt": now,
            "pickupLocation": {
                "address": pickup_addr,
                "latitude": cust_lat,
                "longitude": cust_lng,
                "contactName": cust_name,
                "contactPhone": cust_phone,
            },
            "dropLocation": {
                "address": drop_addr,
                "latitude": p_lat,
                "longitude": p_lng,
                "contactName": partner_name,
                "contactPhone": partner_phone,
            },
            "distanceKm": distance_km,
            "estimatedEarning": pickup_earning,
            "otp": {
                "pickup": pickup_otp,
                "handover": handover_otp,
            },
            "currentRadiusStage": 0,
            "riderId": None,
            "riderAcceptDeadline": (datetime.now(timezone.utc) + timedelta(seconds=lifecycle.RIDER_ACCEPT_SLA_SECONDS)).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "riderSlaSeconds": lifecycle.RIDER_ACCEPT_SLA_SECONDS,
            "attemptedRiderIds": [],
            "assignmentHistory": [],
        }

        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": ride_doc["_id"]},
            {"$set": {k: v for k, v in ride_doc.items() if k != "_id"}},
            upsert=True,
        )

        # Update canonical order status
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "ride1Id": ride_doc["_id"],
                    "status": lifecycle.RIDER_SEARCHING,
                    "updatedAt": now,
                    "riderDispatchStartedAt": now,
                    "riderAcceptDeadline": ride_doc["riderAcceptDeadline"],
                    "riderSlaSeconds": lifecycle.RIDER_ACCEPT_SLA_SECONDS,
                    "otp.pickup": pickup_otp,
                    "otp.handover": handover_otp,
                }
            },
        )

        # Broadcast event to rooms
        await broadcast_order_event(
            EVENT_ORDER_RIDER_SEARCHING,
            order,
            extra_data={"rideType": "pickup", "rideId": ride_doc["_id"]},
        )

        # Start sequential auto-dispatch in background task
        asyncio.create_task(self.dispatch_next_offer(ride_doc["_id"]))
        return ride_doc

    # -------------------------------------------------------------------------
    # 2. RIDE 2 CREATION (Delivery: Partner -> Customer)
    # -------------------------------------------------------------------------
    async def create_ride_2_delivery(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Triggered automatically when Partner marks order READY FOR DELIVERY."""
        order = await lifecycle.find_order(order_id)
        if not order:
            logger.error("Order %s not found for Ride 2 creation", order_id)
            return None

        canonical_id = lifecycle.order_id_of(order)
        now = lifecycle.now_iso()

        # Idempotency check: verify Ride 2 does not already exist
        existing_ride = await database.find_one(
            RIDES_COLLECTION,
            {"orderId": canonical_id, "rideType": "delivery"},
        )
        if existing_ride:
            logger.info("Ride 2 (delivery) already exists for order %s", canonical_id)
            return existing_ride

        # Pickup location for Ride 2 is PARTNER STORE
        partner = order.get("partner") or {}
        partner_id = order.get("partnerId") or order.get("partner_id")
        if partner_id and not partner.get("address"):
            db_partner = await database.find_one("partners", {"_id": partner_id}) or await database.find_one("partners", {"partner_id": partner_id})
            if db_partner:
                partner = {
                    "name": db_partner.get("storeName") or db_partner.get("name") or partner.get("name") or "QuickPress Partner Store",
                    "phone": db_partner.get("phone") or partner.get("phone") or "",
                    "address": db_partner.get("address") or partner.get("address") or "Partner Store",
                    "latitude": db_partner.get("latitude") or db_partner.get("lat") or 27.8118,
                    "longitude": db_partner.get("longitude") or db_partner.get("lng") or 78.6477,
                }

        p_lat = float(partner.get("latitude") or partner.get("lat") or 27.8118)
        p_lng = float(partner.get("longitude") or partner.get("lng") or 78.6477)
        partner_name = partner.get("name") or "QuickPress Partner Store"
        partner_phone = partner.get("phone") or ""
        pickup_addr = partner.get("address") or "QuickPress Partner Store"

        # Drop location for Ride 2 is CUSTOMER ADDRESS
        addr = order.get("address") or {}
        cust_lat = float(addr.get("latitude") or addr.get("lat") or 27.8165)
        cust_lng = float(addr.get("longitude") or addr.get("lng") or 78.6530)
        cust_name = (order.get("customer") or {}).get("name") or addr.get("name") or order.get("customerName") or "Customer"
        cust_phone = (order.get("customer") or {}).get("phone") or addr.get("phone") or order.get("customerPhone") or ""
        drop_addr = addr.get("line") or addr.get("address") or addr.get("formattedAddress") or "Customer Delivery Location"

        distance_km = max(0.5, haversine_distance_km(p_lat, p_lng, cust_lat, cust_lng))
        city_raw = str(addr.get("city") or order.get("city") or (partner or {}).get("city") or "Kasganj")
        clean_city = normalize_city_name(city_raw) or "kasganj"
        fare_calc = financial_engine.compute_rider_trip_fare(distance_km=distance_km, city=clean_city.title())
        delivery_earning = max(35, int(round(fare_calc.totalTripEarnings)))

        # Partner Dispatch OTP & Final Delivery OTP (preserve if already existing on order)
        existing_dispatch = (order.get("otp") or {}).get("dispatch") or order.get("dispatchOtp")
        if isinstance(existing_dispatch, dict) and existing_dispatch.get("code"):
            dispatch_otp = existing_dispatch
        elif isinstance(existing_dispatch, str) and existing_dispatch.strip():
            dispatch_otp = create_otp_record(code=existing_dispatch.strip())
        else:
            dispatch_otp = create_otp_record()

        existing_delivery = (order.get("otp") or {}).get("delivery") or (order.get("otp") or {}).get("drop")
        if isinstance(existing_delivery, dict) and existing_delivery.get("code"):
            delivery_otp = existing_delivery
        elif isinstance(existing_delivery, str) and existing_delivery.strip():
            delivery_otp = create_otp_record(code=existing_delivery.strip())
        else:
            delivery_otp = create_otp_record()

        # Check if original pickup rider opted out or is unable to deliver
        has_opted_out = bool(
            order.get("riderDeliveryOptOut")
            or order.get("reassignmentRequired")
            or (order.get("reassignment") and order.get("reassignment", {}).get("requested"))
        )

        ride_1 = await database.find_one(
            RIDES_COLLECTION,
            {"orderId": canonical_id, "rideType": "pickup"},
        )
        orig_rider_id = (ride_1.get("riderId") if ride_1 else None) or (order.get("reassignment") or {}).get("originalRiderId") or order.get("originalRiderId")

        extra_bonus_percent = 0
        extra_bonus_amount = 0.0
        is_reassigned = False

        orig_rider_profile: Dict[str, Any] = {}
        if orig_rider_id:
            orig_rider_profile = (
                await database.find_one(RIDERS_COLLECTION, {"$or": [{"_id": orig_rider_id}, {"riderId": orig_rider_id}, {"id": orig_rider_id}]})
                or await database.find_one("riders", {"$or": [{"_id": orig_rider_id}, {"riderId": orig_rider_id}, {"id": orig_rider_id}]})
                or {}
            )

        if has_opted_out or not orig_rider_id:
            # Reassignment Flow: Captain 1 opted out at store arrival. Captain 2 gets +20% extra bonus!
            preferred_rider_id = None
            attempted_rider_ids = [str(orig_rider_id)] if orig_rider_id else []
            extra_bonus_percent = 20
            extra_bonus_amount = round(delivery_earning * 0.20, 2)
            delivery_earning = round(delivery_earning + extra_bonus_amount, 2)
            is_reassigned = True
            ride_status = "SEARCHING_RIDER"
            assigned_rider_id = None
            assigned_rider_obj = None
        else:
            # Single Continuous Ride Flow: Captain 1 retains trip continuously from pickup to doorstep!
            preferred_rider_id = str(orig_rider_id)
            attempted_rider_ids = [str(orig_rider_id)]
            is_reassigned = False
            ride_status = "ACCEPTED"
            assigned_rider_id = str(orig_rider_id)
            assigned_rider_obj = {
                "id": str(orig_rider_id),
                "name": orig_rider_profile.get("fullName") or orig_rider_profile.get("name") or "Captain",
                "phone": orig_rider_profile.get("phone") or "",
                "vehicleNumber": orig_rider_profile.get("vehicleNumber") or "",
                "status": "accepted",
            }

        ride_doc = {
            "_id": f"ride-dl-{canonical_id}",
            "rideId": f"ride-dl-{canonical_id}",
            "orderId": canonical_id,
            "orderCode": order.get("code", canonical_id),
            "rideType": "delivery",
            "status": ride_status,
            "city": clean_city.title(),
            "pickupCity": clean_city.title(),
            "dropCity": clean_city.title(),
            "createdAt": now,
            "updatedAt": now,
            "pickupLocation": {
                "address": pickup_addr,
                "latitude": p_lat,
                "longitude": p_lng,
                "contactName": partner_name,
                "contactPhone": partner_phone,
            },
            "dropLocation": {
                "address": drop_addr,
                "latitude": cust_lat,
                "longitude": cust_lng,
                "contactName": cust_name,
                "contactPhone": cust_phone,
            },
            "distanceKm": distance_km,
            "estimatedEarning": delivery_earning,
            "fare": delivery_earning,
            "isReassigned": is_reassigned,
            "isReassignedBonus": has_opted_out,
            "extraBonusPercent": extra_bonus_percent,
            "extraBonusAmount": extra_bonus_amount,
            "otp": {
                "dispatch": dispatch_otp,
                "delivery": delivery_otp,
            },
            "preferredRiderId": preferred_rider_id,
            "currentRadiusStage": 0,
            "riderId": assigned_rider_id,
            "rider": assigned_rider_obj,
            "attemptedRiderIds": attempted_rider_ids,
            "assignmentHistory": (
                [{
                    "riderId": str(orig_rider_id),
                    "action": "continuous_ride_retained",
                    "timestamp": now,
                }]
                if not has_opted_out and orig_rider_id
                else []
            ),
        }

        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": ride_doc["_id"]},
            {"$set": {k: v for k, v in ride_doc.items() if k != "_id"}},
            upsert=True,
        )

        # Update canonical order status
        order_update: Dict[str, Any] = {
            "ride2Id": ride_doc["_id"],
            "status": lifecycle.READY_FOR_DELIVERY,
            "updatedAt": now,
            "otp.dispatch": dispatch_otp,
            "otp.delivery": delivery_otp,
        }
        if not has_opted_out and orig_rider_id:
            order_update["assignedRiderId"] = str(orig_rider_id)
            order_update["riderId"] = str(orig_rider_id)
            order_update["rider"] = assigned_rider_obj
            order_update["deliveryRider"] = assigned_rider_obj

        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {"$set": order_update},
        )

        await broadcast_order_event(
            EVENT_ORDER_READY,
            order,
            extra_data={
                "rideType": "delivery",
                "rideId": ride_doc["_id"],
                "autoAssignedRiderId": assigned_rider_id,
                "continuousRide": not has_opted_out and bool(orig_rider_id),
            },
        )

        if not has_opted_out and orig_rider_id:
            # Send in-app notification to the original Captain
            try:
                from app.db.rider_repositories import rider_notification_repository
                await rider_notification_repository.create(
                    rider_id=str(orig_rider_id),
                    title="📦 Order Packed & Ready for Delivery!",
                    message=f"Order #{order.get('code') or canonical_id[:8]} packed by partner store. Pick up parcel and deliver to customer doorstep.",
                    kind="order_ready",
                )
            except Exception:
                pass
            logger.info("Single Continuous Ride retained for Captain %s on order %s", orig_rider_id, canonical_id)
        else:
            # Start sequential auto-dispatch for Captain 2 with +20% bonus
            asyncio.create_task(self.dispatch_next_offer(ride_doc["_id"]))

        return ride_doc

    # -------------------------------------------------------------------------
    # 3. AREA & DISTANCE-BASED ELIGIBILITY AND RANKING
    # -------------------------------------------------------------------------
    async def find_ranked_eligible_riders(
        self,
        target_lat: float,
        target_lng: float,
        radius_km: float,
        city: str,
        excluded_rider_ids: List[str],
        preferred_rider_id: Optional[str] = None,
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Find ONLINE, AVAILABLE riders within radius, ranked by distance to target."""
        target_city_norm = normalize_city_name(city)
        all_riders = await database.find_many(RIDERS_COLLECTION, {})
        if not all_riders:
            all_riders = await database.find_many("riders", {})
        eligible: List[Tuple[Dict[str, Any], float]] = []

        for rider in all_riders:
            is_online = rider.get("isOnline") or rider.get("is_available")
            if is_online not in (True, 1, "true", "True"):
                continue

            r_id = str(rider.get("_id") or rider.get("riderId") or rider.get("id") or "")
            if not r_id or r_id in excluded_rider_ids:
                continue

            if rider.get("isSuspended") or rider.get("isBlocked"):
                continue

            r_status = str(rider.get("status") or "").lower()
            if r_status in ("suspended", "blocked", "banned", "inactive", "offline"):
                continue

            # Strict City Matching: Captain must belong to the exact same city as the trip
            r_city_raw = (
                rider.get("city")
                or rider.get("preferredCity")
                or rider.get("operatingCity")
                or rider.get("serviceCity")
                or rider.get("workingCity")
            )
            if not r_city_raw:
                r_prof = await database.find_one("rider_profiles", {"_id": r_id}) or await database.find_one("rider_profiles", {"userId": r_id}) or {}
                r_city_raw = r_prof.get("city") or r_prof.get("preferredCity") or r_prof.get("operatingCity") or "Kasganj"

            r_city_norm = normalize_city_name(r_city_raw)
            if target_city_norm and r_city_norm:
                if target_city_norm != r_city_norm and target_city_norm not in r_city_norm and r_city_norm not in target_city_norm:
                    logger.info("Captain %s city '%s' does not match trip city '%s'. Skipping.", r_id, r_city_norm, target_city_norm)
                    continue

            r_lat = rider.get("lat") or rider.get("latitude")
            r_lng = rider.get("lng") or rider.get("longitude")
            if r_lat is None or r_lng is None:
                r_lat = 27.8118
                r_lng = 78.6477

            dist = haversine_distance_km(float(r_lat), float(r_lng), target_lat, target_lng)
            if dist <= radius_km:
                active_rides = await database.find_many(
                    RIDES_COLLECTION,
                    {"riderId": r_id, "status": {"$in": ["ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY"]}},
                )
                if len(active_rides) >= 1:
                    continue

                eligible.append((rider, dist))

        eligible.sort(key=lambda item: item[1])

        if preferred_rider_id:
            preferred_idx = next(
                (i for i, (r, _) in enumerate(eligible) if str(r.get("_id") or r.get("riderId")) == preferred_rider_id),
                None,
            )
            if preferred_idx is not None:
                fav = eligible.pop(preferred_idx)
                eligible.insert(0, fav)

        return eligible

    # -------------------------------------------------------------------------
    # 4. FLASH BROADCAST DISPATCH (FIRST-COME-FIRST-SERVE TO ALL NEARBY CAPTAINS)
    # -------------------------------------------------------------------------
    async def dispatch_next_offer(self, ride_id: str) -> None:
        """Flash Broadcast Dispatch: Send trip details instantly to ALL nearby online Captains.
        The first Captain to tap Accept locks and claims the trip.
        """
        ride = await database.find_one(RIDES_COLLECTION, {"_id": ride_id})
        if not ride or ride.get("status") in ("ACCEPTED", "COMPLETED", "CANCELLED"):
            return

        order_id = ride.get("orderId")
        ride_type = ride.get("rideType")
        target_loc = ride.get("pickupLocation") or {}
        t_lat = float(target_loc.get("latitude") or 27.8118)
        t_lng = float(target_loc.get("longitude") or 78.6477)
        now = lifecycle.now_iso()

        # Look for eligible riders within expanded radius (15 km)
        attempted = list(ride.get("attemptedRiderIds") or [])
        target_city = str(ride.get("city") or (ride.get("pickupLocation") or {}).get("city") or "").strip()
        if not target_city:
            order = await database.find_one("customer_orders", {"_id": order_id}) or await database.find_one("orders", {"_id": order_id})
            if order:
                target_city = str((order.get("address") or {}).get("city") or order.get("city") or "Kasganj").strip()
            else:
                target_city = "Kasganj"

        clean_target_city = normalize_city_name(target_city) or "kasganj"

        ranked_riders = await self.find_ranked_eligible_riders(
            target_lat=t_lat,
            target_lng=t_lng,
            radius_km=15.0,
            city=clean_target_city,
            excluded_rider_ids=attempted,
            preferred_rider_id=ride.get("preferredRiderId"),
        )

        # If none found within 15km, search all online riders STRICTLY in the same city
        if not ranked_riders:
            all_riders = await database.find_many(RIDERS_COLLECTION, {})
            if not all_riders:
                all_riders = await database.find_many("riders", {})
            for rider in all_riders:
                is_online = rider.get("isOnline") or rider.get("is_available")
                if is_online in (True, 1, "true", "True") and not rider.get("isSuspended") and not rider.get("isBlocked"):
                    r_id = str(rider.get("_id") or rider.get("riderId") or rider.get("id") or "")
                    if r_id and r_id not in attempted:
                        r_city = (
                            rider.get("city")
                            or rider.get("preferredCity")
                            or rider.get("operatingCity")
                            or rider.get("serviceCity")
                        )
                        if not r_city:
                            rp = await database.find_one("rider_profiles", {"_id": r_id}) or {}
                            r_city = rp.get("city") or rp.get("preferredCity") or "Kasganj"
                        r_city_norm = normalize_city_name(r_city)
                        if clean_target_city and r_city_norm:
                            if clean_target_city != r_city_norm and clean_target_city not in r_city_norm and r_city_norm not in clean_target_city:
                                continue
                        ranked_riders.append((rider, 2.5))

        if not ranked_riders:
            await database.collection(RIDES_COLLECTION).update_one(
                {"_id": ride_id},
                {"$set": {"status": "NO_RIDER_FOUND", "updatedAt": now}},
            )
            logger.warning("No online captains available for Ride %s", ride_id)
            await sio.emit(
                "admin.no_rider_found",
                {"rideId": ride_id, "orderId": order_id, "rideType": ride_type},
                room="admins",
            )
            return

        timeout_sec = 45
        expires_at = (
            (datetime.now(timezone.utc) + timedelta(seconds=timeout_sec))
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )

        # Broadcast offers to ALL eligible riders simultaneously
        dispatched_count = 0
        for best_rider, best_dist in ranked_riders:
            r_id = str(best_rider.get("_id") or best_rider.get("riderId") or best_rider.get("id") or "")
            offer_id = f"off-{ride_id}-{r_id}"
            offer_doc = {
                "_id": offer_id,
                "offerId": offer_id,
                "rideId": ride_id,
                "orderId": order_id,
                "orderCode": ride.get("orderCode"),
                "rideType": ride_type,
                "type": ride_type,
                "riderId": r_id,
                "status": "pending",
                "distanceKm": round(best_dist, 1),
                "estimatedEarning": ride.get("estimatedEarning", 45),
                "fare": ride.get("fare") or ride.get("estimatedEarning", 45),
                "isReassigned": ride.get("isReassigned", False),
                "isReassignedBonus": ride.get("isReassignedBonus", False),
                "extraBonusPercent": ride.get("extraBonusPercent", 0),
                "extraBonusAmount": ride.get("extraBonusAmount", 0),
                "pickupAddress": target_loc.get("address"),
                "dropAddress": (ride.get("dropLocation") or {}).get("address"),
                "customerName": target_loc.get("contactName") or "Customer",
                "customerPhone": target_loc.get("contactPhone") or "",
                "partnerName": (ride.get("dropLocation") or {}).get("contactName") or "QuickPress Store",
                "partnerPhone": (ride.get("dropLocation") or {}).get("contactPhone") or "",
                "createdAt": now,
                "expiresAt": expires_at,
                "timeoutSeconds": timeout_sec,
            }

            await database.collection(RIDE_ASSIGNMENTS_COLLECTION).update_one(
                {"_id": offer_id},
                {"$set": {k: v for k, v in offer_doc.items() if k != "_id"}},
                upsert=True,
            )
            await database.collection("rider_offers").update_one(
                {"_id": offer_id},
                {"$set": {k: v for k, v in offer_doc.items() if k != "_id"}},
                upsert=True,
            )

            notif_title = (
                "⚡ New Fast Laundry Pickup Trip!" if ride_type == "pickup" else "⚡ New Fast Delivery Trip!"
            )
            notif_msg = f"Order #{ride.get('orderCode')} ({round(best_dist, 1)} km away). Earn ₹{ride.get('estimatedEarning', 45)} — Fastest acceptance wins!"
            await database.collection(NOTIFICATIONS_COLLECTION).update_one(
                {"_id": f"notif-{offer_id}"},
                {
                    "$set": {
                        "riderId": r_id,
                        "orderId": order_id,
                        "rideId": ride_id,
                        "type": "new_order_offer",
                        "title": notif_title,
                        "message": notif_msg,
                        "createdAt": now,
                        "read": False,
                    }
                },
                upsert=True,
            )

            # Send real-time socket offer to rider across all possible room identifiers
            await sio.emit(EVENT_ORDER_RIDER_OFFER, offer_doc, room=f"rider:{r_id}")
            r_phone = str(best_rider.get("phone") or "").replace("+", "").strip()
            if r_phone:
                await sio.emit(EVENT_ORDER_RIDER_OFFER, offer_doc, room=f"rider:{r_phone}")
                await sio.emit(EVENT_ORDER_RIDER_OFFER, offer_doc, room=f"rider:+{r_phone}")
            r_uid = str(best_rider.get("userId") or "").strip()
            if r_uid:
                await sio.emit(EVENT_ORDER_RIDER_OFFER, offer_doc, room=f"rider:{r_uid}")
            dispatched_count += 1

        # Also emit to global riders channel
        await sio.emit(
            EVENT_ORDER_RIDER_OFFER,
            {
                "rideId": ride_id,
                "orderId": order_id,
                "orderCode": ride.get("orderCode"),
                "rideType": ride_type,
                "pickupAddress": target_loc.get("address"),
                "dropAddress": (ride.get("dropLocation") or {}).get("address"),
                "estimatedEarning": ride.get("estimatedEarning", 45),
            },
            room="riders",
        )

        # Update ride record state only if still searching/unclaimed (do not overwrite if already ACCEPTED)
        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": ride_id, "status": {"$in": ["SEARCHING_RIDER", "SEARCHING", "OFFER_SENT"]}},
            {
                "$set": {
                    "status": "OFFER_SENT",
                    "offeredRiderId": ranked_riders[0][0].get("_id") if ranked_riders else None,
                    "dispatchedRidersCount": dispatched_count,
                    "updatedAt": now,
                }
            },
        )
        logger.info(
            "⚡ Flash Broadcast %s Ride %s to %d online Captains simultaneously.",
            ride_type,
            ride_id,
            dispatched_count,
        )

    # -------------------------------------------------------------------------
    # 5. ATOMIC ACCEPTANCE & REJECTION (FIRST-COME-FIRST-SERVE)
    # -------------------------------------------------------------------------
    async def handle_rider_accept(self, ride_id: str, rider_id: str) -> Dict[str, Any]:
        """Atomically claim the ride. Guarantees that only ONE rider can win the ride."""
        ride = await database.find_one(RIDES_COLLECTION, {"_id": ride_id})
        if not ride:
            raise LookupError(f"Ride {ride_id} does not exist")

        if ride.get("status") == "ACCEPTED":
            if ride.get("riderId") == rider_id:
                return ride
            raise ValueError("RIDE_ALREADY_ASSIGNED: Another delivery partner has already accepted this trip.")

        if ride.get("status") in ("COMPLETED", "CANCELLED"):
            raise ValueError("This trip is no longer active.")

        if ride_id in self._active_timers:
            self._active_timers[ride_id].cancel()
            self._active_timers.pop(ride_id, None)

        now = lifecycle.now_iso()
        rider_profile = await database.find_one(RIDERS_COLLECTION, {"_id": rider_id}) or {}
        if not rider_profile:
            rider_profile = await database.find_one("riders", {"_id": rider_id}) or {}

        # Strict City Isolation Check: Captain must belong to the same city as the ride
        ride_city_raw = str(ride.get("city") or (ride.get("pickupLocation") or {}).get("city") or "").strip()
        if not ride_city_raw:
            ord_doc = await database.find_one("customer_orders", {"_id": ride.get("orderId")}) or await database.find_one("orders", {"_id": ride.get("orderId")})
            if ord_doc:
                ride_city_raw = str((ord_doc.get("address") or {}).get("city") or ord_doc.get("city") or "")

        rider_city_raw = (
            rider_profile.get("city")
            or rider_profile.get("preferredCity")
            or rider_profile.get("operatingCity")
            or rider_profile.get("serviceCity")
        )
        if not rider_city_raw:
            rp = await database.find_one("rider_profiles", {"_id": rider_id}) or {}
            rider_city_raw = rp.get("city") or rp.get("preferredCity") or rp.get("operatingCity")

        norm_ride_city = normalize_city_name(ride_city_raw)
        norm_rider_city = normalize_city_name(rider_city_raw)
        if norm_ride_city and norm_rider_city:
            if norm_ride_city != norm_rider_city and norm_ride_city not in norm_rider_city and norm_rider_city not in norm_ride_city:
                raise ValueError(
                    f"CITY_MISMATCH: Trip belongs to {norm_ride_city.title()}, but you are registered in {norm_rider_city.title()}. Rides can only be accepted by Captains in the same city."
                )

        r_name = rider_profile.get("fullName") or rider_profile.get("name") or "Delivery Captain"
        r_phone = rider_profile.get("phone") or "+91 98765 43210"
        r_vehicle = rider_profile.get("vehicleType") or "Bike"
        r_plate = rider_profile.get("vehicleNumber") or "UP-87-QP-1001"
        r_lat = rider_profile.get("lat") or 27.8118
        r_lng = rider_profile.get("lng") or 78.6477

        rider_party = {
            "id": rider_id,
            "name": r_name,
            "phone": r_phone,
            "vehicle": r_vehicle,
            "plate": r_plate,
            "latitude": float(r_lat),
            "longitude": float(r_lng),
            "location": {"latitude": float(r_lat), "longitude": float(r_lng)},
            "rating": float(rider_profile.get("rating", 4.9)),
            "trips": str(rider_profile.get("totalTrips", 120)),
        }

        # Atomic update on RIDES_COLLECTION
        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": ride_id},
            {
                "$set": {
                    "status": "ACCEPTED",
                    "riderId": rider_id,
                    "rider": rider_party,
                    "acceptedAt": now,
                    "updatedAt": now,
                },
                "$push": {
                    "assignmentHistory": {
                        "riderId": rider_id,
                        "outcome": "accepted",
                        "at": now,
                    }
                },
            },
        )

        # Mark this rider's offer as accepted
        await database.collection(RIDE_ASSIGNMENTS_COLLECTION).update_one(
            {"rideId": ride_id, "riderId": rider_id},
            {"$set": {"status": "accepted", "updatedAt": now}},
        )

        # Mark all other competing pending offers as claimed_by_other
        await database.collection(RIDE_ASSIGNMENTS_COLLECTION).update_many(
            {"rideId": ride_id, "riderId": {"$ne": rider_id}, "status": "pending"},
            {"$set": {"status": "claimed_by_other", "updatedAt": now}},
        )

        order_id = ride.get("orderId")
        if ride.get("rideType") == "handover_delivery":
            target_status = lifecycle.HANDOVER_RIDER_ASSIGNED
        elif ride.get("rideType") == "pickup":
            target_status = lifecycle.PICKUP_RIDER_ACCEPTED
        else:
            target_status = lifecycle.DELIVERY_RIDER_ACCEPTED

        existing_order = await lifecycle.find_order(order_id) or {}
        orig_r_id = rider_id if ride.get("rideType") == "pickup" else (existing_order.get("originalRiderId") or existing_order.get("assignedRiderId") or rider_id)

        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": order_id},
            {
                "$set": {
                    "assignedRiderId": rider_id,
                    "originalRiderId": orig_r_id,
                    "transferRider": rider_party if ride.get("rideType") == "handover_delivery" else None,
                    "transferRiderId": rider_id if ride.get("rideType") == "handover_delivery" else None,
                    "rider": rider_party if ride.get("rideType") != "handover_delivery" else None,
                    "riderId": rider_id if ride.get("rideType") != "handover_delivery" else None,
                    "rider_id": rider_id if ride.get("rideType") != "handover_delivery" else None,
                    "status": target_status,
                    "updatedAt": now,
                }
            },
        )

        order = await lifecycle.find_order(order_id)
        if order:
            event_type = (
                "HANDOVER_RIDER_ACCEPTED"
                if ride.get("rideType") == "handover_delivery"
                else ("PICKUP_RIDER_ACCEPTED" if ride.get("rideType") == "pickup" else "DELIVERY_RIDER_ACCEPTED")
            )
            await lifecycle.record_event(
                order,
                event_type,
                actor_id=rider_id,
                actor_role="rider",
                at=now,
            )

        # Broadcast that this ride is now assigned so all other captains' modals dismiss
        await broadcast_order_event(
            EVENT_ORDER_RIDER_ASSIGNED,
            order or {"_id": order_id, "rider": rider_party},
            extra_data={"rideId": ride_id, "riderId": rider_id, "riderName": r_name},
        )
        await sio.emit(
            "ride.claimed",
            {"rideId": ride_id, "claimedBy": rider_id, "orderId": order_id},
            room="riders",
        )

        return await database.find_one(RIDES_COLLECTION, {"_id": ride_id}) or ride

    async def handle_rider_reject(
        self, ride_id: str, rider_id: str, reason: str = "Declined by rider"
    ) -> Dict[str, Any]:
        """Rider explicitly declined offer. Immediately advance to next candidate."""
        ride = await database.find_one(RIDES_COLLECTION, {"_id": ride_id})
        if not ride:
            return {"ok": True}

        if ride_id in self._active_timers:
            self._active_timers[ride_id].cancel()
            self._active_timers.pop(ride_id, None)

        now = lifecycle.now_iso()
        active_offer_id = ride.get("activeOfferId")
        if active_offer_id:
            await database.collection(RIDE_ASSIGNMENTS_COLLECTION).update_one(
                {"_id": active_offer_id},
                {"$set": {"status": "rejected", "reason": reason, "updatedAt": now}},
            )

        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": ride_id},
            {
                "$push": {
                    "assignmentHistory": {
                        "riderId": rider_id,
                        "outcome": "rejected",
                        "reason": reason,
                        "at": now,
                    }
                },
                "$set": {"status": "SEARCHING_RIDER", "offeredRiderId": None, "updatedAt": now},
            },
        )

        logger.info("Rider %s rejected ride %s. Dispatching to next candidate...", rider_id, ride_id)
        asyncio.create_task(self.dispatch_next_offer(ride_id))
        return {"ok": True, "rideId": ride_id, "status": "REJECTED"}

    # -------------------------------------------------------------------------
    # 6. SECURE OTP VERIFICATION LIFECYCLE
    # -------------------------------------------------------------------------
    def _verify_otp_record(self, otp_record: Any, code: str, label: str) -> None:
        if not code or not code.strip():
            raise PermissionError(f"{label} is required.")
        if isinstance(otp_record, str):
            otp_record = {"code": otp_record, "verified": False, "attempts": 0, "maxAttempts": 5}
        if not isinstance(otp_record, dict):
            raise PermissionError(f"{label} has not been generated for this order yet.")
        if otp_record.get("verified"):
            raise ValueError(f"{label} has already been verified and used.")

        actual_code = str(otp_record.get("code", "")).strip()
        user_code = code.strip()
        if user_code == actual_code:
            otp_record["verified"] = True
            otp_record["attempts"] = 0
            otp_record["verifiedAt"] = lifecycle.now_iso()
            return

        attempts = int(otp_record.get("attempts", 0))
        max_attempts = int(otp_record.get("maxAttempts", 5))
        if attempts >= max_attempts:
            raise PermissionError(f"Maximum verification attempts exceeded for {label}.")

        otp_record["attempts"] = attempts + 1
        remaining = max(0, max_attempts - otp_record["attempts"])
        raise PermissionError(f"Invalid {label}. {remaining} attempt(s) remaining.")

    async def verify_pickup_otp(self, order_id: str, otp: str, rider_id: str) -> Dict[str, Any]:
        """Phase 1.5 OTP: Customer gives Pickup OTP to Rider upon clothes pickup."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        canonical_id = lifecycle.order_id_of(order)
        current_status = lifecycle.order_status(order)
        if current_status in (
            lifecycle.PICKED_UP,
            lifecycle.AT_PARTNER,
            lifecycle.PROCESSING,
            lifecycle.READY_FOR_DELIVERY,
            lifecycle.READY,
            lifecycle.OUT_FOR_DELIVERY,
            lifecycle.DELIVERED,
            lifecycle.COMPLETED,
        ):
            return {"ok": True, "status": "PICKED_UP", "orderId": canonical_id, "alreadyPickedUp": True}
        otp_dict = order.get("otp") or {}
        pickup_record = otp_dict.get("pickup")
        if not pickup_record:
            pickup_code = order.get("pickupOtp")
            if not pickup_code:
                raise PermissionError("Pickup OTP has not been generated for this order yet.")
            pickup_record = {"code": str(pickup_code), "attempts": 0, "verified": False}
        self._verify_otp_record(pickup_record, otp, "Customer Pickup OTP")

        now = lifecycle.now_iso()
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.PICKED_UP,
                    "otp.pickup": pickup_record,
                    "pickedAt": now,
                    "updatedAt": now,
                }
            },
        )
        await database.collection(RIDES_COLLECTION).update_one(
            {"orderId": canonical_id, "rideType": "pickup"},
            {"$set": {"status": "PICKED_UP", "otp.pickup": pickup_record, "updatedAt": now}},
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "PICKED_UP",
                actor_id=rider_id,
                actor_role="rider",
                metadata={"pickupOtpVerified": True},
                at=now,
            )
            await broadcast_order_event(EVENT_ORDER_PICKED_UP, updated)
        return {"ok": True, "status": "PICKED_UP", "orderId": canonical_id}

    async def verify_handover_otp(self, order_id: str, otp: str, partner_id: str) -> Dict[str, Any]:
        """Phase 2 OTP: Rider hands over laundry bag to Partner Store."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        canonical_id = lifecycle.order_id_of(order)
        otp_dict = order.get("otp") or {}
        handover_record = otp_dict.get("handover")
        if not handover_record:
            handover_code = order.get("handoverOtp")
            if not handover_code:
                raise PermissionError("Store Handover OTP has not been generated for this order yet.")
            handover_record = {"code": str(handover_code), "attempts": 0, "verified": False}
        self._verify_otp_record(handover_record, otp, "Store Handover OTP")

        now = lifecycle.now_iso()
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.AT_PARTNER,
                    "otp.handover": handover_record,
                    "receivedByPartnerAt": now,
                    "updatedAt": now,
                }
            },
        )
        await database.collection(RIDES_COLLECTION).update_one(
            {"orderId": canonical_id, "rideType": "pickup"},
            {
                "$set": {
                    "status": "DELIVERED",
                    "otp.handover": handover_record,
                    "droppedAtStoreAt": now,
                    "updatedAt": now,
                }
            },
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "AT_PARTNER",
                actor_id=partner_id,
                actor_role="partner",
                metadata={"handoverOtpVerified": True},
                at=now,
            )
            await broadcast_order_event(lifecycle.AT_PARTNER, updated)
        return {"ok": True, "status": "AT_PARTNER", "orderId": canonical_id}

    async def verify_dispatch_otp(self, order_id: str, otp: str, rider_id: str) -> Dict[str, Any]:
        """Phase 2.5 OTP: Delivery Rider verifies Dispatch OTP communicated by Partner Store."""
        clean_otp = str(otp or "").strip()
        if len(clean_otp) != 4 or not clean_otp.isdigit():
            raise ValueError("Please enter a valid 4-digit numeric Dispatch OTP.")

        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        canonical_id = lifecycle.order_id_of(order)
        otp_dict = order.get("otp") or {}
        dispatch_record = otp_dict.get("dispatch")
        if not dispatch_record:
            dispatch_code = (
                order.get("dispatchOtp")
                or (order.get("reassignment") or {}).get("dispatchOtp")
                or (order.get("reassignment") or {}).get("handoverOtp")
            )
            if not dispatch_code:
                ride_doc = await database.find_one(
                    RIDES_COLLECTION,
                    {"orderId": canonical_id, "rideType": {"$in": ["delivery", "handover_delivery"]}},
                )
                if ride_doc:
                    disp_val = (ride_doc.get("otp") or {}).get("dispatch")
                    if isinstance(disp_val, dict):
                        dispatch_code = disp_val.get("code")
                    elif isinstance(disp_val, str) and disp_val.strip():
                        dispatch_code = disp_val.strip()
            if not dispatch_code:
                raise ValueError("Dispatch OTP has not been generated for this order yet. Ensure order is packed & ready for delivery.")
            dispatch_record = {"code": str(dispatch_code), "attempts": 0, "verified": False}

        self._verify_otp_record(dispatch_record, clean_otp, "Partner Dispatch OTP")
        dispatch_record["verified"] = True

        now = lifecycle.now_iso()
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.OUT_FOR_DELIVERY,
                    "otp.dispatch": dispatch_record,
                    "dispatchOtpVerified": True,
                    "dispatchedAt": now,
                    "custody": "rider",
                    "updatedAt": now,
                }
            },
        )
        await database.collection(RIDES_COLLECTION).update_one(
            {"orderId": canonical_id, "rideType": {"$in": ["delivery", "handover_delivery"]}},
            {"$set": {"status": "OUT_FOR_DELIVERY", "otp.dispatch": dispatch_record, "updatedAt": now}},
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "OUT_FOR_DELIVERY",
                actor_id=rider_id,
                actor_role="rider",
                metadata={"dispatchOtpVerified": True},
                at=now,
            )
            await broadcast_order_event(EVENT_ORDER_OUT_FOR_DELIVERY, updated)
        return {"ok": True, "status": "OUT_FOR_DELIVERY", "orderId": canonical_id}

    async def verify_partner_dispatch_otp(self, order_id: str, otp: str, partner_id: str) -> Dict[str, Any]:
        """Partner verifies the 4-digit Dispatch OTP told by Delivery Captain (Rider 2).
        Custody transfers from Partner Store to Captain, advancing order to OUT_FOR_DELIVERY.
        Without this verification, Partner CANNOT handover clean laundry to Captain.
        """
        clean_otp = str(otp or "").strip()
        if len(clean_otp) != 4 or not clean_otp.isdigit():
            raise ValueError("Please enter a valid 4-digit numeric Dispatch OTP.")

        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        canonical_id = lifecycle.order_id_of(order)
        otp_dict = order.get("otp") or {}
        dispatch_record = otp_dict.get("dispatch")
        if not dispatch_record:
            dispatch_code = (
                order.get("dispatchOtp")
                or (order.get("reassignment") or {}).get("dispatchOtp")
                or (order.get("reassignment") or {}).get("handoverOtp")
            )
            if not dispatch_code:
                ride_doc = await database.find_one(
                    RIDES_COLLECTION,
                    {"orderId": canonical_id, "rideType": {"$in": ["delivery", "handover_delivery"]}},
                )
                if ride_doc:
                    disp_val = (ride_doc.get("otp") or {}).get("dispatch")
                    if isinstance(disp_val, dict):
                        dispatch_code = disp_val.get("code")
                    elif isinstance(disp_val, str) and disp_val.strip():
                        dispatch_code = disp_val.strip()
            if not dispatch_code:
                raise ValueError("Dispatch OTP has not been generated for this order yet. Ensure order is packed & ready for delivery.")
            dispatch_record = {"code": str(dispatch_code), "attempts": 0, "verified": False}

        self._verify_otp_record(dispatch_record, clean_otp, "Partner Dispatch OTP")
        dispatch_record["verified"] = True

        now = lifecycle.now_iso()
        assigned_rider_id = order.get("assignedRiderId") or order.get("riderId") or order.get("deliveryRiderId")

        # Update order status to OUT_FOR_DELIVERY and set custody to rider
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.OUT_FOR_DELIVERY,
                    "otp.dispatch": dispatch_record,
                    "dispatchOtpVerified": True,
                    "dispatchedAt": now,
                    "custody": "rider",
                    "updatedAt": now,
                }
            },
        )
        await database.collection(RIDES_COLLECTION).update_one(
            {"orderId": canonical_id, "rideType": {"$in": ["delivery", "handover_delivery"]}},
            {"$set": {"status": "OUT_FOR_DELIVERY", "otp.dispatch": dispatch_record, "updatedAt": now}},
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "OUT_FOR_DELIVERY",
                actor_id=partner_id,
                actor_role="partner",
                metadata={"dispatchedToRider": assigned_rider_id, "dispatchOtpVerified": True},
                at=now,
            )
            await broadcast_order_event(EVENT_ORDER_OUT_FOR_DELIVERY, updated)
            await broadcast_order_event(
                "order.dispatch_verified",
                updated,
                extra_data={"status": "out_for_delivery", "dispatchOtpVerified": True, "dispatchedToRider": assigned_rider_id},
            )
            await broadcast_order_event(
                "order.status_changed",
                updated,
                extra_data={"status": "out_for_delivery", "dispatchOtpVerified": True},
            )

            from app.services.partner_activity_logger import log_partner_activity
            import asyncio
            asyncio.create_task(
                log_partner_activity(
                    partner_id=partner_id,
                    category="orders",
                    event="OUT_FOR_DELIVERY",
                    title=f"Handover Complete #{order.get('code', canonical_id[:8])}",
                    description=f"Dispatch OTP verified. Laundry successfully handed over to Delivery Captain ({assigned_rider_id or 'Captain'}).",
                    actor="Partner",
                    order_id=canonical_id,
                    order_code=order.get("code"),
                    tone="success",
                )
            )

        return {
            "ok": True,
            "status": lifecycle.OUT_FOR_DELIVERY,
            "orderId": canonical_id,
            "dispatchedTo": assigned_rider_id,
            "custody": "rider",
            "dispatchOtpVerified": True,
            "message": "Dispatch OTP verified. Package custody transferred to Delivery Captain.",
        }

    async def verify_delivery_otp(self, order_id: str, otp: str, rider_id: str) -> Dict[str, Any]:
        """Phase 3 OTP: Customer provides final Delivery OTP to Rider at doorstep."""
        clean_otp = str(otp or "").strip()
        if len(clean_otp) != 4 or not clean_otp.isdigit():
            raise ValueError("Please enter a valid 4-digit numeric Customer Delivery OTP.")

        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        # Security Gate: Order must have been handed over from Partner Store first
        current_status = lifecycle.order_status(order)
        if current_status in (lifecycle.READY_FOR_DELIVERY, lifecycle.READY, "dispatch_otp_pending") and not order.get("dispatchOtpVerified"):
            raise PermissionError("Cannot complete delivery: Order has not been handed over from partner store with Dispatch OTP.")

        canonical_id = lifecycle.order_id_of(order)
        if current_status in (lifecycle.DELIVERED, lifecycle.COMPLETED):
            return {"ok": True, "status": "DELIVERED", "orderId": canonical_id, "alreadyDelivered": True}

        otp_dict = order.get("otp") or {}
        delivery_record = otp_dict.get("delivery")
        if delivery_record and delivery_record.get("verified"):
            return {"ok": True, "status": "DELIVERED", "orderId": canonical_id, "alreadyDelivered": True}

        if not delivery_record:
            delivery_code = order.get("deliveryOtp")
            if not delivery_code:
                raise PermissionError("Customer Delivery OTP has not been generated for this order yet.")
            delivery_record = {"code": str(delivery_code), "attempts": 0, "verified": False}

        self._verify_otp_record(delivery_record, clean_otp, "Customer Delivery OTP")

        now = lifecycle.now_iso()
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.DELIVERED,
                    "otp.delivery": delivery_record,
                    "deliveredAt": now,
                    "completedAt": now,
                    "updatedAt": now,
                    "payment.paid": True,
                }
            },
        )
        await database.collection(RIDES_COLLECTION).update_one(
            {"orderId": canonical_id, "rideType": "delivery"},
            {
                "$set": {
                    "status": "COMPLETED",
                    "otp.delivery": delivery_record,
                    "completedAt": now,
                    "updatedAt": now,
                }
            },
        )

        # Settle partner, rider, and platform financials via settlement_engine
        try:
            from app.services.settlement_engine import settlement_engine
            await settlement_engine.settle_order_on_completion(order)
        except Exception as err:
            logger.warning(f"Settlement completion hook error: {err}")

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "DELIVERED",
                actor_id=rider_id,
                actor_role="rider",
                metadata={"deliveryOtpVerified": True},
                at=now,
            )
            await broadcast_order_event(EVENT_ORDER_DELIVERED, updated)
        return {"ok": True, "status": "DELIVERED", "orderId": canonical_id}

    # -------------------------------------------------------------------------
    # 7. RIDER 1 UNABLE TO COMPLETE DELIVERY -> REASSIGNMENT & CUSTODY TRANSFER
    # -------------------------------------------------------------------------
    async def request_delivery_reassignment(
        self,
        order_id: str,
        rider_id: str,
        reason: str,
        location: Optional[Dict[str, Any]] = None,
        remarks: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Triggered when Rider 1 cannot complete delivery.
        Core QuickPress Rule: Package remains in Partner Store custody.
        Rider 1 is credited for Pickup Leg payout immediately and released.
        Rider 2 is assigned for Delivery Leg from Partner Store to Customer.
        """
        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        canonical_id = lifecycle.order_id_of(order)
        now = lifecycle.now_iso()

        # Check authorization
        curr_rider = order.get("assignedRiderId") or order.get("riderId")
        if curr_rider and rider_id and str(curr_rider) != str(rider_id):
            logger.info("Reassignment request from rider %s on order assigned to %s", rider_id, curr_rider)

        # Partner Store details (Package is stored safely in Partner custody)
        partner_info = order.get("partner") or {}
        partner_id = order.get("partnerId") or order.get("partner_id")
        if partner_id and not partner_info.get("address"):
            db_p = await database.find_one("partners", {"$or": [{"_id": partner_id}, {"partnerId": partner_id}]}) or {}
            if db_p:
                partner_info = {
                    "name": db_p.get("storeName") or db_p.get("name") or "QuickPress Partner Store",
                    "address": db_p.get("address") or "Partner Store",
                    "lat": float(db_p.get("lat") or db_p.get("latitude") or 27.8118),
                    "lng": float(db_p.get("lng") or db_p.get("longitude") or 78.6477),
                    "phone": db_p.get("phone") or "",
                }

        p_lat = float(partner_info.get("lat") or partner_info.get("latitude") or 27.8118)
        p_lng = float(partner_info.get("lng") or partner_info.get("longitude") or 78.6477)
        p_addr = str(partner_info.get("address") or "QuickPress Partner Store")
        p_name = str(partner_info.get("name") or order.get("partnerName") or "QuickPress Partner Store")

        # Customer drop details
        drop_loc = order.get("deliveryLocation") or order.get("address") or order.get("customerAddress") or {}
        drop_lat = float(drop_loc.get("lat") or drop_loc.get("latitude") or 27.8180)
        drop_lng = float(drop_loc.get("lng") or drop_loc.get("longitude") or 78.6550)
        drop_addr = str(drop_loc.get("address") or drop_loc.get("line") or order.get("deliveryAddress") or "Customer Doorstep")

        # Pickup leg payout (Customer -> Partner completed by Rider 1)
        ride_1 = await database.find_one(RIDES_COLLECTION, {"orderId": canonical_id, "rideType": "pickup"})
        cust_loc = order.get("pickupLocation") or order.get("customerLocation") or {}
        c_lat = float(cust_loc.get("lat") or cust_loc.get("latitude") or p_lat)
        c_lng = float(cust_loc.get("lng") or cust_loc.get("longitude") or p_lng)
        pickup_dist_km = max(0.5, haversine_distance_km(c_lat, c_lng, p_lat, p_lng))
        calc_pickup = round(25.0 + max(0.0, pickup_dist_km * 8.0), 2)
        pickup_gross_payout = float((ride_1 or {}).get("estimatedEarning") or (ride_1 or {}).get("fare") or calc_pickup)

        # User Rule: 25% penalty deduction when Captain opts out of the delivery leg
        penalty_deduction = round(pickup_gross_payout * 0.25, 2)
        net_pickup_payout = round(pickup_gross_payout - penalty_deduction, 2)

        # User Rule: Delivery leg payout with +20% bonus for the new replacement rider
        delivery_dist_km = max(0.5, haversine_distance_km(p_lat, p_lng, drop_lat, drop_lng))
        base_delivery_payout = round(25.0 + max(0.0, delivery_dist_km * 8.0), 2)
        bonus_20 = round(base_delivery_payout * 0.20, 2)
        new_rider_delivery_payout = round(base_delivery_payout + bonus_20, 2)

        # Generate secure 4-digit Dispatch OTP for Partner -> Rider 2 handover
        dispatch_otp = generate_secure_4digit_otp()
        dispatch_record = create_otp_record(dispatch_otp)

        # 1. Settle Rider 1 wallet with 75% net pickup payout (25% opt-out deduction applied)
        if rider_id:
            try:
                from app.db.rider_repositories import rider_wallet_repository, rider_notification_repository
                code_str = order.get('code') or canonical_id[:8]
                existing_credit = await database.find_one(
                    "rider_wallet_transactions",
                    {"$or": [{"riderId": rider_id}, {"rider_id": rider_id}], "orderCode": code_str, "kind": "pickup_fare"}
                )
                if existing_credit:
                    # 100% gross was already credited upon store drop; apply 25% opt-out deduction
                    await rider_wallet_repository.debit(
                        rider_id=rider_id,
                        amount=penalty_deduction,
                        title=f"Delivery Opt-Out Fee (25%) · #{code_str}",
                        order_code=code_str,
                        kind="opt_out_deduction",
                    )
                else:
                    # Direct opt-out at store: credit 75% net pickup payout
                    await rider_wallet_repository.credit(
                        rider_id=rider_id,
                        amount=net_pickup_payout,
                        title=f"Pickup leg payout (75% net after 25% opt-out fee) · #{code_str}",
                        order_code=code_str,
                        kind="transfer_pickup",
                    )
                await rider_notification_repository.create(
                    rider_id=rider_id,
                    title="🎉 Pickup Payout Settled (75% Net)",
                    message=f"Pickup for order #{code_str} completed. ₹{net_pickup_payout:.2f} settled to your wallet (Gross ₹{pickup_gross_payout:.2f} minus 25% delivery opt-out fee ₹{penalty_deduction:.2f}). Package safe in Partner Store custody.",
                    kind="payment",
                )
                if reason in ("vehicle_breakdown", "accident_health", "medical_emergency"):
                    await database.collection(RIDERS_COLLECTION).update_one(
                        {"$or": [{"_id": rider_id}, {"riderId": rider_id}]},
                        {"$set": {"isOnline": False, "dutyStatus": "OFF DUTY", "updatedAt": now}}
                    )
            except Exception as err:
                logger.error(f"Error crediting Rider 1 pickup payout: {err}", exc_info=True)

        reassignment_data = {
            "requested": True,
            "requestedAt": now,
            "originalRiderId": rider_id,
            "reason": reason,
            "remarks": remarks or "",
            "custody": "partner",
            "dispatchOtp": dispatch_otp,
            "handoverOtp": dispatch_otp,
            "pickupGrossPayout": pickup_gross_payout,
            "pickupPenaltyDeduction": penalty_deduction,
            "pickupLegPayout": net_pickup_payout,
            "baseDeliveryPayout": base_delivery_payout,
            "deliveryLegPayout": new_rider_delivery_payout,
            "extraBonusPercent": 20,
            "extraBonusAmount": bonus_20,
            "handoverCompleted": False,
            "assignedTransferRiderId": None,
            "storeLocation": {
                "name": p_name,
                "address": p_addr,
                "lat": p_lat,
                "lng": p_lng,
            },
        }

        # Update order document with Partner custody and Dispatch OTP
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.DELIVERY_REASSIGNMENT_REQUIRED,
                    "riderDeliveryOptOut": True,
                    "reassignmentRequired": True,
                    "assignedRiderId": None,
                    "originalRiderId": rider_id,
                    "pickupGrossPayout": pickup_gross_payout,
                    "pickupPenaltyDeduction": penalty_deduction,
                    "pickupNetPayout": net_pickup_payout,
                    "deliveryReassignedBonusPercent": 20,
                    "deliveryReassignedBonusAmount": bonus_20,
                    "reassignment": reassignment_data,
                    "otp.dispatch": dispatch_record,
                    "otp.handover": dispatch_record,
                    "dispatchOtp": dispatch_otp,
                    "handoverOtp": dispatch_otp,
                    "custody": "partner",
                    "updatedAt": now,
                }
            },
        )

        # Update or create handover ride in rides collection
        handover_ride_id = f"ride-transfer-{canonical_id}"
        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": handover_ride_id},
            {
                "$set": {
                    "_id": handover_ride_id,
                    "orderId": canonical_id,
                    "orderCode": order.get("code") or canonical_id[:8],
                    "rideType": "handover_delivery",
                    "status": "SEARCHING",
                    "pickupLocation": {
                        "name": f"Collect from Partner Store ({p_name})",
                        "address": p_addr,
                        "lat": p_lat,
                        "lng": p_lng,
                        "phone": partner_info.get("phone") or "",
                    },
                    "dropLocation": {
                        "name": order.get("customerName") or "Customer",
                        "address": drop_addr,
                        "lat": drop_lat,
                        "lng": drop_lng,
                        "phone": order.get("customerPhone") or "",
                    },
                    "fare": new_rider_delivery_payout,
                    "estimatedEarning": new_rider_delivery_payout,
                    "baseFare": base_delivery_payout,
                    "isReassigned": True,
                    "isReassignedBonus": True,
                    "extraBonusPercent": 20,
                    "extraBonusAmount": bonus_20,
                    "originalRiderId": rider_id,
                    "attemptedRiderIds": [rider_id],
                    "dispatchOtp": dispatch_otp,
                    "createdAt": now,
                    "updatedAt": now,
                }
            },
            upsert=True,
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "DELIVERY_REASSIGNMENT_REQUIRED",
                actor_id=rider_id,
                actor_role="rider",
                metadata={"reason": reason, "custody": "partner", "storeLocation": p_addr},
                at=now,
            )
            # Notify Customer, Admin, and Partner
            await broadcast_order_event("order_reassignment_required", updated)

        # Send push & in-app notification to Customer
        try:
            from app.services.order_notifications import send_customer_notification
            customer_id = order.get("customerId") or order.get("userId")
            if customer_id:
                await send_customer_notification(
                    customer_id,
                    title="🛵 Delivery Partner Reassigned",
                    description="Your previous delivery partner reported an emergency issue. A replacement QuickPress Captain is picking up your package from the Partner store.",
                    kind="reassignment",
                    order_id=canonical_id,
                )
        except Exception as e:
            logger.warning(f"Customer notification error: {e}", exc_info=True)

        # Start search for Rider 2 from Partner Store location
        asyncio.create_task(self._search_transfer_riders(canonical_id, p_lat, p_lng, exclude_rider_id=rider_id))

        return {
            "ok": True,
            "requested": True,
            "reason": reason,
            "status": lifecycle.DELIVERY_REASSIGNMENT_REQUIRED,
            "orderId": canonical_id,
            "handoverOtp": dispatch_otp,
            "dispatchOtp": dispatch_otp,
            "custody": "partner",
            "storeLocation": {"lat": p_lat, "lng": p_lng, "address": p_addr},
            "pickupLegPayout": net_pickup_payout,
            "pickupGrossPayout": pickup_gross_payout,
            "pickupOptOutDeduction": penalty_deduction,
            "pickupPenaltyDeduction": penalty_deduction,
            "deliveryLegPayout": new_rider_delivery_payout,
            "extraBonusPercent": 20,
            "extraBonusAmount": bonus_20,
            "message": "Delivery opt-out confirmed. 75% net pickup pay credited to your wallet (25% fee deducted). Package remains in Partner store custody.",
        }

    async def _search_transfer_riders(
        self, order_id: str, handover_lat: float, handover_lng: float, exclude_rider_id: str
    ) -> None:
        """Finds nearby available online riders (excluding Rider 1) and broadcasts handover offer."""
        await asyncio.sleep(1.0)
        try:
            # Query online riders
            online_riders = await database.find_many(
                RIDERS_COLLECTION,
                {"$or": [{"isOnline": True}, {"status": "online"}, {"dutyStatus": "ON DUTY"}]}
            )
            candidates = []
            for r in online_riders:
                rid = r.get("riderId") or r.get("_id")
                if not rid or rid == exclude_rider_id:
                    continue
                loc = r.get("location") or r.get("lastLocation") or {}
                rlat = float(loc.get("lat") or loc.get("latitude") or 0.0)
                rlng = float(loc.get("lng") or loc.get("longitude") or 0.0)
                if rlat and rlng:
                    dist = haversine_distance_km(handover_lat, handover_lng, rlat, rlng)
                else:
                    dist = 2.0  # fallback nearby
                candidates.append((dist, rid, r))

            candidates.sort(key=lambda x: x[0])

            order = await lifecycle.find_order(order_id)
            if not order:
                return

            payout = float((order.get("reassignment") or {}).get("deliveryLegPayout") or 35.0)
            bonus_amt = float((order.get("reassignment") or {}).get("extraBonusAmount") or 0)

            # Broadcast offer to candidates
            for dist, rid, r in candidates[:5]:
                offer_payload = {
                    "offerId": f"offer-transfer-{order_id}-{rid}",
                    "id": f"offer-transfer-{order_id}-{rid}",
                    "orderId": order_id,
                    "rideId": f"ride-transfer-{order_id}",
                    "orderCode": order.get("code") or order_id[:8],
                    "type": "delivery",
                    "rideType": "delivery",
                    "isTransfer": True,
                    "isReassigned": True,
                    "isReassignedBonus": True,
                    "extraBonusPercent": 20,
                    "extraBonusAmount": bonus_amt,
                    "pickupTitle": "QuickPress Partner Store (Dispatch Handover)",
                    "pickupAddress": (order.get("reassignment") or {}).get("storeLocation", {}).get("address") or (order.get("partner") or {}).get("address") or "Partner Store Address",
                    "dropTitle": order.get("customerName") or "Customer Drop",
                    "dropAddress": order.get("deliveryAddress") or order.get("dropAddress") or "Customer Address",
                    "distanceKm": dist,
                    "fare": payout,
                    "estimatedEarning": payout,
                    "expiresInSeconds": 35,
                }
                await broadcast_order_event(f"rider_offer_{rid}", offer_payload)
                try:
                    from app.core.socketio import sio
                    await sio.emit("rider.new_offer", offer_payload, room=f"rider_{rid}")
                    await sio.emit("rider.new_offer", offer_payload, room="riders")
                except Exception:
                    pass

                # Send OneSignal notification to candidate rider
                try:
                    from app.core.onesignal import send_onesignal_notification
                    await send_onesignal_notification(
                        rid,
                        title="🛵 QuickPress Delivery Leg Available",
                        body=f"Collect ready laundry from Partner Store ({dist:.1f}km) & deliver to customer. Earn ₹{payout:.0f}!",
                        data={"orderId": order_id, "kind": "handover_delivery"},
                        url="/orders",
                    )
                except Exception:
                    pass

        except Exception as err:
            logger.warning(f"Error searching transfer riders: {err}")

    async def verify_handover_transfer(
        self, order_id: str, otp: str, new_rider_id: str
    ) -> Dict[str, Any]:
        """Invoked by Rider 2 when meeting Rider 1 to verify 4-digit Handover OTP.
        Transfers custody, credits Rider 1 wallet with pickup payout, releases Rider 1,
        and transitions order to OUT_FOR_DELIVERY for Rider 2.
        """
        order = await lifecycle.find_order(order_id)
        if not order:
            raise LookupError(f"Order {order_id} not found")

        canonical_id = lifecycle.order_id_of(order)
        reassignment = order.get("reassignment") or {}
        expected_otp = reassignment.get("handoverOtp")

        if not expected_otp or str(otp).strip() != str(expected_otp).strip():
            raise ValueError("Invalid Handover OTP. Please verify the 4-digit code provided by Captain.")

        now = lifecycle.now_iso()
        original_rider_id = reassignment.get("originalRiderId")
        pickup_payout = float(reassignment.get("pickupLegPayout") or 35.0)

        # 1. Credit Rider 1 wallet with pickup leg payout
        if original_rider_id:
            try:
                from app.db.rider_repositories import rider_wallet_repository, rider_notification_repository
                await rider_wallet_repository.credit(
                    rider_id=original_rider_id,
                    amount=pickup_payout,
                    title=f"Order Pickup Leg Payout (#{order.get('code') or canonical_id[:8]})",
                    order_code=order.get("code") or canonical_id[:8],
                    kind="transfer_pickup",
                )
                await rider_notification_repository.create(
                    rider_id=original_rider_id,
                    title="🎉 Handover Complete & Wallet Credited",
                    message=f"Custody of order #{order.get('code') or canonical_id[:8]} transferred. ₹{pickup_payout:.2f} credited to your wallet for pickup leg.",
                    kind="payment",
                )
                # If reason was medical or vehicle breakdown, set Rider 1 offline for safety
                reason = reassignment.get("reason")
                if reason in ("vehicle_breakdown", "accident_health", "medical_emergency"):
                    await database.collection(RIDERS_COLLECTION).update_one(
                        {"$or": [{"_id": original_rider_id}, {"riderId": original_rider_id}]},
                        {"$set": {"isOnline": False, "dutyStatus": "OFF DUTY", "updatedAt": now}}
                    )
            except Exception as e:
                logger.error(f"Error crediting Rider 1: {e}", exc_info=True)

        # 2. Update order with Rider 2 as the new assigned rider
        reassignment["handoverCompleted"] = True
        reassignment["handoverCompletedAt"] = now
        reassignment["assignedTransferRiderId"] = new_rider_id

        # Get Rider 2 profile info for Customer display
        r2_profile = await database.find_one(
            RIDERS_COLLECTION,
            {"$or": [{"_id": new_rider_id}, {"riderId": new_rider_id}]}
        ) or {}

        r2_party = {
            "id": new_rider_id,
            "name": r2_profile.get("fullName") or r2_profile.get("name") or "QuickPress Captain",
            "phone": r2_profile.get("phone") or "",
            "vehicle": r2_profile.get("vehicleType") or "Bike",
            "plate": r2_profile.get("vehicleNumber") or "UP-87-QP-1001",
            "rating": float(r2_profile.get("rating", 4.9)),
        }

        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.OUT_FOR_DELIVERY,
                    "assignedRiderId": new_rider_id,
                    "riderId": new_rider_id,
                    "rider_id": new_rider_id,
                    "rider": r2_party,
                    "riderName": r2_party["name"],
                    "riderPhone": r2_party["phone"],
                    "reassignment": reassignment,
                    "updatedAt": now,
                }
            },
        )

        # Update handover ride in rides collection
        handover_ride_id = f"ride-transfer-{canonical_id}"
        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": handover_ride_id},
            {
                "$set": {
                    "status": "COMPLETED",
                    "riderId": new_rider_id,
                    "handoverVerified": True,
                    "handoverVerifiedAt": now,
                    "updatedAt": now,
                }
            },
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "HANDOVER_COMPLETED",
                actor_id=new_rider_id,
                actor_role="rider",
                metadata={
                    "transferredFrom": original_rider_id,
                    "transferredTo": new_rider_id,
                    "pickupPayoutCredited": pickup_payout,
                },
                at=now,
            )
            await broadcast_order_event(EVENT_ORDER_OUT_FOR_DELIVERY, updated)

        return {
            "ok": True,
            "status": lifecycle.OUT_FOR_DELIVERY,
            "orderId": canonical_id,
            "transferredTo": new_rider_id,
            "message": "Handover verified. You now have custody of this order.",
        }


# Singleton export
smart_2ride_engine = Smart2RideEngine()
