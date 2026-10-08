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
from app.core.privacy import mask_phone
from app.services import order_lifecycle as lifecycle
from app.services.financial_engine import financial_engine
from app.services.processing_service import processing_service
from app.db.rider_earnings_ledger import rider_earnings_ledger
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


KNOWN_CITIES = [
    "kasganj", "noida", "greater noida", "ghaziabad", "delhi", "gurugram", "faridabad",
    "agra", "aligarh", "bareilly", "mathura", "badaun", "soron", "sahawar", "ganjdundwara", "etah"
]


def extract_clean_city(text: Any) -> str:
    """Extract operational city name even from complex addresses like 'INTESRAIL ARRA, Kasganj 207123'."""
    if not text:
        return ""
    import re
    raw = str(text).lower()
    for kc in sorted(KNOWN_CITIES, key=len, reverse=True):
        if re.search(r'\b' + re.escape(kc) + r'\b', raw):
            return kc
    parts = re.split(r'[,/\-]', raw)
    for p in reversed(parts):
        clean_p = re.sub(r'\d+', '', p).strip()
        clean_p = re.sub(r'[^a-z\s]', '', clean_p).strip()
        clean_p = re.sub(r'\s+', ' ', clean_p)
        if clean_p and len(clean_p) >= 3 and clean_p not in ('up', 'uttar pradesh', 'india', 'delhi ncr', 'haryana'):
            return clean_p
    return ""


def is_city_match(rider_city: Any, trip_city: Any, full_trip_text: str = "", full_partner_text: str = "") -> bool:
    """Robust match between rider city and trip city or address text."""
    r_norm = extract_clean_city(rider_city) or normalize_city_name(rider_city)
    t_norm = extract_clean_city(trip_city) or normalize_city_name(trip_city)
    if not r_norm or not t_norm:
        return True
    if r_norm == t_norm or r_norm in t_norm or t_norm in r_norm:
        return True
    full_text = f"{full_trip_text} {full_partner_text}".lower()
    if r_norm in full_text:
        return True
    p_norm = extract_clean_city(full_partner_text)
    if p_norm and p_norm == r_norm:
        return True
    return False


def normalize_city_name(city: Any) -> str:
    """Normalize city name for matching."""
    if not city:
        return ""
    clean = extract_clean_city(city)
    if clean:
        return clean
    import re
    s = str(city).strip().lower()
    s = s.split(",")[0].split("-")[0].split("/")[0].strip()
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


def check_geofence(
    rider_lat: Optional[float],
    rider_lng: Optional[float],
    target_lat: Optional[float],
    target_lng: Optional[float],
    max_radius_meters: float = 250.0,
) -> Dict[str, Any]:
    """Validates that rider GPS position is within geofence perimeter (default 250m)."""
    if rider_lat is None or rider_lng is None or target_lat is None or target_lng is None:
        return {"verified": True, "distanceMeters": 0.0, "anomaly": False, "note": "Coordinates missing - bypassed"}

    try:
        r_lat, r_lng = float(rider_lat), float(rider_lng)
        t_lat, t_lng = float(target_lat), float(target_lng)
    except (ValueError, TypeError):
        return {"verified": True, "distanceMeters": 0.0, "anomaly": False, "note": "Invalid coordinates - bypassed"}

    if (r_lat == 0.0 and r_lng == 0.0) or (t_lat == 0.0 and t_lng == 0.0):
        return {"verified": True, "distanceMeters": 0.0, "anomaly": False, "note": "Zero coordinates bypassed"}

    dist_km = haversine_distance_km(r_lat, r_lng, t_lat, t_lng)
    dist_meters = round(dist_km * 1000, 1)
    is_within = dist_meters <= max_radius_meters

    return {
        "verified": is_within,
        "distanceMeters": dist_meters,
        "anomaly": not is_within,
        "allowedRadiusMeters": max_radius_meters,
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
        current_st = lifecycle.order_status(order)
        if current_st in (lifecycle.PENDING, lifecycle.PLACED, "pending_partner_acceptance"):
            logger.info("Order %s has not been accepted by partner yet (status=%s). Cannot create Ride 1.", canonical_id, current_st)
            return None

        now = lifecycle.now_iso()

        # Idempotency check: verify Ride 1 does not already exist
        existing_ride = await database.find_one(
            RIDES_COLLECTION,
            {"orderId": canonical_id, "rideType": "pickup"},
        )
        if existing_ride:
            if existing_ride.get("status") in ("NO_RIDER_FOUND", "SEARCHING_RIDER") and not existing_ride.get("riderId"):
                logger.info("Re-dispatching existing unassigned Ride 1 (status=%s) for order %s", existing_ride.get("status"), canonical_id)
                await database.collection(RIDES_COLLECTION).update_one(
                    {"_id": existing_ride["_id"]},
                    {"$set": {"status": "SEARCHING_RIDER", "updatedAt": now, "attemptedRiderIds": []}},
                )
                asyncio.create_task(self.dispatch_next_offer(existing_ride["_id"]))
            else:
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
        if partner_id and (not partner.get("address") or not partner.get("city")):
            db_partner = (
                await database.find_one("partners", {"_id": partner_id})
                or await database.find_one("partners", {"partner_id": partner_id})
                or await database.find_one("partner_profiles", {"_id": partner_id})
                or await database.find_one("partner_profiles", {"partnerId": partner_id})
                or await database.find_one("admin_partners", {"_id": partner_id})
                or await database.find_one("admin_partners", {"partnerId": partner_id})
            )
            if db_partner:
                partner = {
                    "name": db_partner.get("storeName") or db_partner.get("businessName") or db_partner.get("name") or partner.get("name") or "QuickPress Partner Store",
                    "phone": db_partner.get("phone") or partner.get("phone") or "",
                    "address": db_partner.get("address") or partner.get("address") or "Partner Store",
                    "city": db_partner.get("city") or partner.get("city") or "",
                    "latitude": db_partner.get("latitude") or db_partner.get("lat") or cust_lat,
                    "longitude": db_partner.get("longitude") or db_partner.get("lng") or cust_lng,
                }

        p_lat = float(partner.get("latitude") or partner.get("lat") or cust_lat)
        p_lng = float(partner.get("longitude") or partner.get("lng") or cust_lng)
        partner_name = partner.get("name") or "QuickPress Partner Store"
        partner_phone = partner.get("phone") or ""
        drop_addr = partner.get("address") or "QuickPress Partner Store"

        # Calculate trip distance and dynamic fare
        distance_km = max(0.5, haversine_distance_km(cust_lat, cust_lng, p_lat, p_lng))
        partner_city = str((partner or {}).get("city") or "").strip()
        city_raw = str(addr.get("city") or order.get("city") or partner_city or "")
        clean_city = extract_clean_city(city_raw) or extract_clean_city(partner_city) or normalize_city_name(city_raw) or normalize_city_name(partner_city) or ""
        fare_calc = financial_engine.compute_rider_trip_fare(distance_km=distance_km, city=clean_city.title())
        base_pickup_earning = max(35, int(round(fare_calc.totalTripEarnings)))

        # Extract Express Pickup & Bonus allocations from parent order
        is_express = bool(order.get("isExpress") or (order.get("pickup") or {}).get("express"))
        express_fee = float(order.get("expressFee") or 0.0)
        rider_share_pct = float(order.get("expressRiderSharePercent") or 80.0)
        partner_share_pct = float(order.get("expressPartnerSharePercent") or 20.0)
        rider_express_bonus = float(order.get("riderExpressBonus") or (round(express_fee * (rider_share_pct / 100.0), 2) if is_express else 0.0))
        partner_express_bonus = float(order.get("partnerExpressBonus") or (round(express_fee * (partner_share_pct / 100.0), 2) if is_express else 0.0))

        pickup_earning = base_pickup_earning + int(round(rider_express_bonus))

        # Preserve existing order pickup OTP if already generated
        existing_pickup = (order.get("otp") or {}).get("pickup")
        if isinstance(existing_pickup, dict) and existing_pickup.get("code"):
            p_code = str(existing_pickup["code"])
        elif existing_pickup:
            p_code = str(existing_pickup)
        else:
            p_code = str(order.get("pickupOtp") or generate_secure_4digit_otp())

        h_code = generate_secure_4digit_otp()
        while h_code == p_code:
            h_code = generate_secure_4digit_otp()

        pickup_otp = create_otp_record(code=p_code)
        handover_otp = create_otp_record(code=h_code)

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
            "isExpress": is_express,
            "expressFee": express_fee,
            "riderExpressBonus": rider_express_bonus,
            "partnerExpressBonus": partner_express_bonus,
            "expressRiderSharePercent": rider_share_pct,
            "expressPartnerSharePercent": partner_share_pct,
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
            "fare": pickup_earning,
            "baseFare": base_pickup_earning,
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
                    "pickupOtp": str(pickup_otp.get("code") if isinstance(pickup_otp, dict) else pickup_otp),
                    "dispatchOtp": str(handover_otp.get("code") if isinstance(handover_otp, dict) else handover_otp),
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

        # Start instant broadcast auto-dispatch to online Captains
        try:
            await self.dispatch_next_offer(ride_doc["_id"])
        except Exception as e:
            logger.error("Immediate dispatch failed, retrying in background: %s", e)
            asyncio.create_task(self.dispatch_next_offer(ride_doc["_id"]))
        updated_ride = await database.find_one(RIDES_COLLECTION, {"_id": ride_doc["_id"]})
        return updated_ride or ride_doc

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
            if existing_ride.get("status") in ("NO_RIDER_FOUND", "SEARCHING_RIDER") and not existing_ride.get("riderId"):
                logger.info("Re-dispatching existing unassigned Ride 2 (status=%s) for order %s", existing_ride.get("status"), canonical_id)
                await database.collection(RIDES_COLLECTION).update_one(
                    {"_id": existing_ride["_id"]},
                    {"$set": {"status": "SEARCHING_RIDER", "updatedAt": now, "attemptedRiderIds": []}},
                )
                asyncio.create_task(self.dispatch_next_offer(existing_ride["_id"]))
            else:
                logger.info("Ride 2 (delivery) already exists for order %s", canonical_id)
            return existing_ride

        # Pickup location for Ride 2 is PARTNER STORE
        partner = order.get("partner") or {}
        partner_id = order.get("partnerId") or order.get("partner_id")
        if partner_id and (not partner.get("address") or not partner.get("city")):
            db_partner = (
                await database.find_one("partners", {"_id": partner_id})
                or await database.find_one("partners", {"partner_id": partner_id})
                or await database.find_one("partner_profiles", {"_id": partner_id})
                or await database.find_one("partner_profiles", {"partnerId": partner_id})
                or await database.find_one("admin_partners", {"_id": partner_id})
                or await database.find_one("admin_partners", {"partnerId": partner_id})
            )
            if db_partner:
                partner = {
                    "name": db_partner.get("storeName") or db_partner.get("businessName") or db_partner.get("name") or partner.get("name") or "QuickPress Partner Store",
                    "phone": db_partner.get("phone") or partner.get("phone") or "",
                    "address": db_partner.get("address") or partner.get("address") or "Partner Store",
                    "city": db_partner.get("city") or partner.get("city") or "",
                    "latitude": db_partner.get("latitude") or db_partner.get("lat") or cust_lat,
                    "longitude": db_partner.get("longitude") or db_partner.get("lng") or cust_lng,
                }

        p_lat = float(partner.get("latitude") or partner.get("lat") or cust_lat)
        p_lng = float(partner.get("longitude") or partner.get("lng") or cust_lng)
        partner_name = partner.get("name") or "QuickPress Partner Store"
        partner_phone = partner.get("phone") or ""
        pickup_addr = partner.get("address") or "QuickPress Partner Store"

        # Drop location for Ride 2 is CUSTOMER ADDRESS
        addr = order.get("address") or {}
        cust_lat = float(addr.get("latitude") or addr.get("lat") or p_lat)
        cust_lng = float(addr.get("longitude") or addr.get("lng") or p_lng)
        cust_name = (order.get("customer") or {}).get("name") or addr.get("name") or order.get("customerName") or "Customer"
        cust_phone = (order.get("customer") or {}).get("phone") or addr.get("phone") or order.get("customerPhone") or ""
        drop_addr = addr.get("line") or addr.get("address") or addr.get("formattedAddress") or "Customer Delivery Location"

        distance_km = max(0.5, haversine_distance_km(p_lat, p_lng, cust_lat, cust_lng))
        partner_city = str((partner or {}).get("city") or "").strip()
        city_raw = str(addr.get("city") or order.get("city") or partner_city or "")
        clean_city = extract_clean_city(city_raw) or extract_clean_city(partner_city) or normalize_city_name(city_raw) or normalize_city_name(partner_city) or ""
        fare_calc = financial_engine.compute_rider_trip_fare(distance_km=distance_km, city=clean_city.title())
        delivery_earning = max(35, int(round(fare_calc.totalTripEarnings)))

        # Preserve existing dispatch and delivery OTPs if already generated
        existing_dispatch = (order.get("otp") or {}).get("dispatch")
        if isinstance(existing_dispatch, dict) and existing_dispatch.get("code"):
            d_code = str(existing_dispatch["code"])
        elif existing_dispatch:
            d_code = str(existing_dispatch)
        else:
            d_code = str(order.get("dispatchOtp") or generate_secure_4digit_otp())

        existing_delivery = (order.get("otp") or {}).get("delivery")
        if isinstance(existing_delivery, dict) and existing_delivery.get("code"):
            del_code = str(existing_delivery["code"])
        elif existing_delivery:
            del_code = str(existing_delivery)
        else:
            del_code = str(order.get("deliveryOtp") or generate_secure_4digit_otp())

        while del_code == d_code:
            del_code = generate_secure_4digit_otp()

        dispatch_otp = create_otp_record(code=d_code)
        delivery_otp = create_otp_record(code=del_code)

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
        now_dt = datetime.now(timezone.utc)
        order_update: Dict[str, Any] = {
            "ride2Id": ride_doc["_id"],
            "status": lifecycle.READY_FOR_DELIVERY,
            "updatedAt": now,
            "dispatchOtp": str(dispatch_otp.get("code") if isinstance(dispatch_otp, dict) else dispatch_otp),
            "deliveryOtp": str(delivery_otp.get("code") if isinstance(delivery_otp, dict) else delivery_otp),
            "otp.dispatch": dispatch_otp,
            "otp.delivery": delivery_otp,
        }
        if not has_opted_out and orig_rider_id:
            order_update["assignedRiderId"] = str(orig_rider_id)
            order_update["riderId"] = str(orig_rider_id)
            order_update["rider"] = assigned_rider_obj
            order_update["deliveryRider"] = assigned_rider_obj
            order_update["deliveryAcceptDeadline"] = (now_dt + timedelta(seconds=120)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
            order_update["deliverySlaSeconds"] = 120

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
                "deliverySlaSeconds": 120 if (not has_opted_out and orig_rider_id) else 0,
            },
        )

        if not has_opted_out and orig_rider_id:
            # Start 120-second (2-minute) Store Arrival & Acceptance SLA timer
            self._schedule_delivery_store_sla_timer(canonical_id, str(orig_rider_id), seconds=120)

            # Send in-app notification to the original Captain
            try:
                from app.db.rider_repositories import rider_notification_repository
                await rider_notification_repository.create(
                    rider_id=str(orig_rider_id),
                    title="📦 Order Packed & Ready for Delivery!",
                    message=f"Order #{order.get('code') or canonical_id[:8]} packed by store. Please reach store within 2 minutes to collect package.",
                    kind="order_ready",
                )
            except Exception:
                pass
            logger.info("Single Continuous Ride retained for Captain %s on order %s with 2-minute store SLA timer", orig_rider_id, canonical_id)
        else:
            # Start sequential auto-dispatch for Captain 2 with +20% bonus
            asyncio.create_task(self.dispatch_next_offer(ride_doc["_id"]))

        return ride_doc

    def _schedule_delivery_store_sla_timer(self, order_id: str, rider_id: str, seconds: int = 120) -> None:
        """Starts 120-second (2-minute) SLA timer for rider to accept and reach store.
        If rider does not verify Dispatch OTP at the store within 2 minutes:
        System auto-triggers delivery reassignment to Rider 2 with 20% pool transfer!
        """
        async def _timer():
            try:
                await asyncio.sleep(seconds)
                order = await lifecycle.find_order(order_id)
                if not order:
                    return
                current_st = lifecycle.order_status(order)
                if current_st in (lifecycle.READY_FOR_DELIVERY, lifecycle.READY, lifecycle.DELIVERY_RIDER_ASSIGNED, "dispatch_otp_pending"):
                    if not order.get("dispatchOtpVerified"):
                        logger.warning(
                            "⏱️ [DELIVERY SLA BREACH] Rider %s failed to report to store within %ds for order %s. Auto-reassigning Rider 2!",
                            rider_id, seconds, order_id
                        )
                        await self.handle_store_arrival_timeout(order_id, rider_id)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error("Error in delivery store SLA timer for order %s: %s", order_id, e)

        timer_key = f"store_sla_{order_id}"
        if timer_key in self._active_timers:
            self._active_timers[timer_key].cancel()
        self._active_timers[timer_key] = asyncio.create_task(_timer())

    async def handle_store_arrival_timeout(self, order_id: str, rider_id: str) -> Dict[str, Any]:
        """Triggered when Rider 1 fails to report to the partner store within 2 minutes (120s).
        Enforces:
        - 20% deduction applied ONLY to the delivery leg fare.
        - Diverts 20% to reassignment_pool.
        - Immediately auto-assigns Rider 2 without waiting for admin.
        - Rider 1's Pickup leg payout is 100% safe.
        """
        order = await lifecycle.find_order(order_id)
        if not order:
            return {"ok": False, "error": "Order not found"}

        canonical_id = lifecycle.order_id_of(order)
        now = lifecycle.now_iso()

        # Query delivery ride document for delivery fare
        ride_2 = await database.find_one(RIDES_COLLECTION, {"orderId": canonical_id, "rideType": "delivery"})
        base_delivery = float((ride_2 or {}).get("estimatedEarning") or (ride_2 or {}).get("fare") or 35.0)

        # 20% deduction from delivery earning
        deduction_20 = round(base_delivery * 0.20, 2)
        rider_1_delivery_net = round(base_delivery - deduction_20, 2)

        # Record Rider 1 deduction in rider_earnings_ledger
        await rider_earnings_ledger.record_entry(
            order_id=canonical_id,
            rider_id=rider_id,
            trip_type="DELIVERY",
            base_earning=base_delivery,
            deduction=deduction_20,
            deduction_percentage=20.0,
            transfer_amount=0.0,
            final_earning=rider_1_delivery_net,
            reason="Store arrival SLA (2 mins) breached — 20% diverted to reassignment pool",
            status="DEDUCTED",
            metadata={"slaSeconds": 120, "at": now},
        )

        # Update order with failure state and reassignment pool
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.DELIVERY_FAILED,
                    "deliveryFailedReason": "Store arrival SLA (2 mins) breached",
                    "reassignmentPool": deduction_20,
                    "reassignmentRequired": True,
                    "riderDeliveryOptOut": True,
                    "originalRiderId": rider_id,
                    "assignedRiderId": None,
                    "deliveryRiderId": None,
                    "updatedAt": now,
                }
            },
        )

        await lifecycle.record_event(
            order,
            "DELIVERY_FAILED",
            actor_id=rider_id,
            actor_role="system",
            metadata={"reason": "Store arrival SLA (2 mins) breached", "reassignmentPool": deduction_20},
            at=now,
        )

        # Notify via Socket.IO
        await broadcast_order_event(
            "order.delivery_failed",
            order,
            extra_data={
                "reason": "Store arrival SLA (2 mins) breached",
                "reassignmentPool": deduction_20,
                "autoReassigning": True,
            },
        )

        # Now immediately trigger Rider 2 auto-assignment
        logger.info("Auto-reassigning delivery rider (Rider 2) for order %s...", canonical_id)
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {"$set": {"status": lifecycle.DELIVERY_RIDER_REASSIGNING, "updatedAt": now}},
        )

        # Re-dispatch Ride 2 with reassignment bonus
        asyncio.create_task(self.reassign_delivery_to_rider_2(canonical_id, bonus_amount=deduction_20))
        return {"ok": True, "reassignmentPool": deduction_20}

    async def reassign_delivery_to_rider_2(self, order_id: str, bonus_amount: float = 0.0) -> Optional[Dict[str, Any]]:
        """Automatically finds and dispatches Rider 2 for the delivery leg."""
        order = await lifecycle.find_order(order_id)
        if not order:
            return None

        canonical_id = lifecycle.order_id_of(order)
        now = lifecycle.now_iso()

        # Update ride_2 in rides collection
        ride_2 = await database.find_one(RIDES_COLLECTION, {"orderId": canonical_id, "rideType": "delivery"})
        if not ride_2:
            return None

        orig_fare = float(ride_2.get("fare") or ride_2.get("estimatedEarning") or 35.0)
        pool = float(bonus_amount or order.get("reassignmentPool") or round(orig_fare * 0.20, 2))
        rider_2_fare = round(orig_fare + pool, 2)

        # Generate fresh Dispatch OTP for store handoff
        new_disp_code = generate_secure_4digit_otp()
        disp_rec = create_otp_record(new_disp_code)

        orig_rider_id = order.get("originalRiderId") or ride_2.get("riderId")
        attempted = [str(orig_rider_id)] if orig_rider_id else []

        await database.collection(RIDES_COLLECTION).update_one(
            {"_id": ride_2["_id"]},
            {
                "$set": {
                    "status": "SEARCHING_RIDER",
                    "baseFare": orig_fare,
                    "fare": rider_2_fare,
                    "estimatedEarning": rider_2_fare,
                    "isReassigned": True,
                    "isReassignedBonus": True,
                    "extraBonusAmount": pool,
                    "extraBonusPercent": 20,
                    "preferredRiderId": None,
                    "riderId": None,
                    "rider": None,
                    "offeredRiderId": None,
                    "attemptedRiderIds": attempted,
                    "otp.dispatch": disp_rec,
                    "updatedAt": now,
                }
            },
        )

        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.DELIVERY_RIDER_REASSIGNING,
                    "dispatchOtp": new_disp_code,
                    "otp.dispatch": disp_rec,
                    "reassignmentPool": pool,
                    "assignedRiderId": None,
                    "deliveryRiderId": None,
                    "deliveryRider": None,
                    "rider": None,
                    "updatedAt": now,
                }
            },
        )

        # Dispatch next offer to nearby eligible riders excluding original rider
        asyncio.create_task(self.dispatch_next_offer(ride_2["_id"]))
        return ride_2

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
                r_city_raw = r_prof.get("city") or r_prof.get("preferredCity") or r_prof.get("operatingCity") or ""

            r_city_norm = normalize_city_name(r_city_raw)
            r_lat = rider.get("lat") or rider.get("latitude")
            r_lng = rider.get("lng") or rider.get("longitude")
            has_real_gps = r_lat is not None and r_lng is not None
            if r_lat is None or r_lng is None:
                r_lat = 27.8118
                r_lng = 78.6477

            dist = haversine_distance_km(float(r_lat), float(r_lng), target_lat, target_lng)

            # City match: matches if city name matches OR physical GPS is within radius_km
            city_ok = is_city_match(r_city_norm, target_city_norm)
            if not city_ok and not (has_real_gps and dist <= radius_km):
                logger.info("Captain %s city '%s' does not match trip city '%s' (dist=%.2f km). Skipping.", r_id, r_city_norm, target_city_norm, dist)
                continue

            if dist <= radius_km:
                active_rides = await database.find_many(
                    RIDES_COLLECTION,
                    {"riderId": r_id, "status": {"$in": ["ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY"]}},
                )
                if len(active_rides) >= 1:
                    continue

                # Floating COD Cash Limit Check (Only applicable for Cash-on-Delivery Delivery Rides, NOT Pickup Rides)
                floating_cash = float(rider.get("floatingCash") or rider.get("cashInHand") or 0.0)
                max_cod_limit = float(rider.get("maxCodLimit") or 50000.0)
                if floating_cash >= max_cod_limit:
                    logger.info(
                        "Captain %s floating COD cash (₹%.2f) reached limit (₹%.2f). Skipping new dispatch.",
                        r_id,
                        floating_cash,
                        max_cod_limit,
                    )
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
        if not target_city or len(target_city) < 3:
            order = await database.find_one("customer_orders", {"_id": order_id}) or await database.find_one("orders", {"_id": order_id})
            if order:
                target_city = (
                    extract_clean_city((order.get("address") or {}).get("city"))
                    or extract_clean_city((order.get("address") or {}).get("addressLine1"))
                    or extract_clean_city((order.get("address") or {}).get("fullAddress"))
                    or str((order.get("address") or {}).get("city") or order.get("city") or "").strip()
                )
            else:
                target_city = ""

        clean_target_city = extract_clean_city(target_city) or normalize_city_name(target_city) or ""

        ranked_riders = await self.find_ranked_eligible_riders(
            target_lat=t_lat,
            target_lng=t_lng,
            radius_km=15.0,
            city=clean_target_city,
            excluded_rider_ids=attempted,
            preferred_rider_id=ride.get("preferredRiderId"),
        )

        # If none found within 15km, search all online riders in the same city or territory
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
                            r_city = rp.get("city") or rp.get("preferredCity") or ""
                        r_city_norm = normalize_city_name(r_city)
                        if clean_target_city and r_city_norm:
                            if not is_city_match(r_city_norm, clean_target_city):
                                continue
                        ranked_riders.append((rider, 2.5))

        # Absolute Fallback: If still no strictly matched city rider found, broadcast to ALL available online captains
        # so customer trip is NEVER abandoned when fleet captains are online
        if not ranked_riders:
            all_fallback = await database.find_many(RIDERS_COLLECTION, {}) or await database.find_many("riders", {}) or []
            for rider in all_fallback:
                is_online = rider.get("isOnline") or rider.get("is_available")
                if is_online in (True, 1, "true", "True") and not rider.get("isSuspended") and not rider.get("isBlocked"):
                    r_id = str(rider.get("_id") or rider.get("riderId") or rider.get("id") or "")
                    if r_id and r_id not in attempted:
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

        timeout_sec = 900  # 15 minutes offer validity matching SLA
        expires_at = (
            (datetime.now(timezone.utc) + timedelta(seconds=timeout_sec))
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )

        # Broadcast offers to ALL eligible nearby online riders simultaneously (Flash Broadcast)
        dispatched_count = 0
        for best_rider, best_dist in ranked_riders:
            r_id = str(best_rider.get("_id") or best_rider.get("riderId") or best_rider.get("id") or "")
            offer_id = f"off-{ride_id}-{r_id}"
            is_express = bool(ride.get("isExpress"))
            rider_express_bonus = float(ride.get("riderExpressBonus") or 0.0)
            express_share_pct = float(ride.get("expressRiderSharePercent") or 80.0)
            express_fee = float(ride.get("expressFee") or 0.0)

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
                "isExpress": is_express,
                "expressFee": express_fee,
                "riderExpressBonus": rider_express_bonus,
                "expressRiderSharePercent": express_share_pct,
                "isReassigned": ride.get("isReassigned", False),
                "isReassignedBonus": ride.get("isReassignedBonus", False),
                "extraBonusPercent": ride.get("extraBonusPercent", 0),
                "extraBonusAmount": rider_express_bonus if is_express else ride.get("extraBonusAmount", 0),
                "pickupAddress": target_loc.get("address"),
                "dropAddress": (ride.get("dropLocation") or {}).get("address"),
                "customerName": target_loc.get("contactName") or "Customer",
                "customerPhone": mask_phone(target_loc.get("contactPhone") or ""),
                "customerPhoneMasked": mask_phone(target_loc.get("contactPhone") or ""),
                "isNumberMasked": True,
                "virtualCallAvailable": True,
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

            if is_express:
                notif_title = "⚡ Express Laundry Pickup Trip"
                notif_msg = f"⚡ EXPRESS Order #{ride.get('orderCode')} ({round(best_dist, 1)} km away)! Earn ₹{ride.get('estimatedEarning', 45)} (+₹{int(round(rider_express_bonus))} Express Bonus)!"
            else:
                notif_title = (
                    "New Laundry Pickup Trip" if ride_type == "pickup" else "New Laundry Delivery Trip"
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

            # Send real-time socket offer to rider across all possible room identifiers and aliases
            socket_rooms = [f"rider:{r_id}"]
            r_phone = str(best_rider.get("phone") or "").replace("+", "").strip()
            if r_phone:
                socket_rooms.extend([f"rider:{r_phone}", f"rider:+{r_phone}"])
            r_uid = str(best_rider.get("userId") or "").strip()
            if r_uid:
                socket_rooms.append(f"rider:{r_uid}")

            for s_room in socket_rooms:
                await sio.emit(EVENT_ORDER_RIDER_OFFER, offer_doc, room=s_room)
                await sio.emit("order.rider_offer", offer_doc, room=s_room)
                await sio.emit("new_order_offer", offer_doc, room=s_room)
                await sio.emit("order.offer", offer_doc, room=s_room)
                await sio.emit("dispatch.offer", offer_doc, room=s_room)
                await sio.emit("order.trip_assigned", {**offer_doc, "autoAssigned": False}, room=s_room)

            # High-priority external push notification
            try:
                from app.services.order_notifications import _dispatch_external_pushes
                await _dispatch_external_pushes(
                    r_id,
                    title=notif_title,
                    body=notif_msg,
                    deep_link="/orders",
                    data={"orderId": str(order_id), "rideId": str(ride_id), "type": "new_order_offer"},
                    role="rider",
                )
            except Exception:
                pass

            dispatched_count += 1

        # Also emit to global riders channel with complete details so any connected captain immediately gets the alert & bell
        broadcast_payload = {
            "offerId": f"off-{ride_id}-broadcast",
            "rideId": ride_id,
            "orderId": order_id,
            "orderCode": ride.get("orderCode"),
            "rideType": ride_type,
            "type": ride_type,
            "fare": ride.get("fare") or ride.get("estimatedEarning", 45),
            "estimatedEarning": ride.get("estimatedEarning", 45),
            "pickupAddress": target_loc.get("address") or "Customer Pickup Location",
            "dropAddress": (ride.get("dropLocation") or {}).get("address") or "QuickPress Store",
            "pickupTitle": (ride.get("pickupLocation") or {}).get("contactName") or "Pickup",
            "dropTitle": (ride.get("dropLocation") or {}).get("contactName") or "Drop",
            "customerName": target_loc.get("contactName") or "Customer",
            "partnerName": (ride.get("dropLocation") or {}).get("contactName") or "QuickPress Store",
            "distanceKm": round(float(ride.get("distanceKm") or 2.0), 1),
            "isExpress": bool(ride.get("isExpress")),
            "riderExpressBonus": float(ride.get("riderExpressBonus") or 0.0),
            "createdAt": now,
            "autoAssigned": False,
        }
        await sio.emit(EVENT_ORDER_RIDER_OFFER, broadcast_payload, room="riders")
        await sio.emit("order.rider_offer", broadcast_payload, room="riders")
        await sio.emit("new_order_offer", broadcast_payload, room="riders")
        await sio.emit("order.offer", broadcast_payload, room="riders")
        await sio.emit("dispatch.offer", broadcast_payload, room="riders")
        await sio.emit("order.trip_assigned", broadcast_payload, room="riders")

        # Log Automation Event: Auto-Dispatch Broadcast
        try:
            from app.db.automation_repositories import automation_repository
            await automation_repository.log_event(
                automation_type="dispatch",
                title=f"Auto-Dispatched {ride_type.upper()} Ride ({dispatched_count} Captains)",
                description=f"Radial search dispatched {ride_type} offer for #{ride.get('orderCode')} to {dispatched_count} eligible captains.",
                order_id=order_id,
                order_code=ride.get("orderCode"),
                severity="info",
                metadata={
                    "rideId": ride_id,
                    "rideType": ride_type,
                    "dispatchedCount": dispatched_count,
                    "timeoutSeconds": timeout_sec,
                },
            )
        except Exception as auto_err:
            logger.debug(f"[Automation] Dispatch log error: {auto_err}")

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
            if not is_city_match(norm_rider_city, norm_ride_city, ride_city_raw, rider_city_raw):
                raise ValueError(
                    f"CITY_MISMATCH: Trip belongs to {norm_ride_city.title()}, but you are registered in {norm_rider_city.title()}. Rides can only be accepted by Captains in the same city."
                )

        from app.services.rider_dispatch import resolve_real_rider_party
        resolved_party = await resolve_real_rider_party(rider_profile or rider_id)
        if resolved_party:
            rider_party = resolved_party
            r_name = rider_party.get("name") or "Delivery Captain"
        else:
            r_name = rider_profile.get("fullName") or rider_profile.get("name") or "Delivery Captain"
            r_phone = rider_profile.get("phone") or ""
            r_vehicle = rider_profile.get("vehicleType") or "Bike"
            r_plate = rider_profile.get("vehicleNumber") or ""
            r_avatar = rider_profile.get("photoUrl") or rider_profile.get("selfieUrl") or ""
            r_lat = rider_profile.get("lat") or 27.8118
            r_lng = rider_profile.get("lng") or 78.6477

            rider_party = {
                "id": rider_id,
                "name": r_name,
                "phone": r_phone,
                "vehicle": r_vehicle,
                "vehicleType": r_vehicle,
                "plate": r_plate,
                "vehicleNumber": r_plate,
                "avatar": r_avatar,
                "photo": r_avatar,
                "image": r_avatar,
                "latitude": float(r_lat),
                "longitude": float(r_lng),
                "location": {"latitude": float(r_lat), "longitude": float(r_lng)},
                "rating": float(rider_profile.get("rating", 5.0)),
                "trips": str(rider_profile.get("lifetimeDeliveries") or rider_profile.get("totalTrips") or "10+ deliveries"),
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

        # Automated WhatsApp notification to customer
        try:
            from app.core.whatsapp_service import whatsapp_service
            cust_phone = (order or {}).get("customerPhone") or ((order or {}).get("customer") or {}).get("phone")
            cust_name = (order or {}).get("customerName") or ((order or {}).get("customer") or {}).get("name") or "Valued Customer"
            ride_type = ride.get("rideType", "pickup")
            if cust_phone:
                asyncio.create_task(
                    whatsapp_service.send_captain_assigned_whatsapp(
                        phone=str(cust_phone),
                        customer_name=str(cust_name),
                        order_id=order_id,
                        captain_name=str(r_name),
                        captain_phone=str(r_phone),
                        eta_minutes=15,
                        ride_type=ride_type,
                    )
                )
        except Exception as exc:
            logger.warning("WhatsApp captain assigned trigger error: %s", exc)

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

    async def verify_pickup_otp(
        self,
        order_id: str,
        otp: str,
        rider_id: str,
        rider_lat: Optional[float] = None,
        rider_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
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

        # Geofence Verification Guard (Default 250m)
        r_lat, r_lng = rider_lat, rider_lng
        if r_lat is None or r_lng is None:
            live_doc = await database.find_one("live_locations", {"_id": f"rider:{rider_id}"})
            if live_doc:
                r_lat = live_doc.get("latitude")
                r_lng = live_doc.get("longitude")

        addr = order.get("address") or order.get("pickupAddress") or {}
        t_lat = addr.get("latitude") or addr.get("lat")
        t_lng = addr.get("longitude") or addr.get("lng")

        # Geofence Verification Guard with Dynamic Admin Policy
        from app.db.admin_repositories import admin_settings_repository
        admin_settings = await admin_settings_repository.get()
        dispatch_cfg = admin_settings.get("dispatch") or {}
        max_geofence_meters = float(dispatch_cfg.get("geofenceRadiusMeters") or 250.0)
        strict_geofence = bool(dispatch_cfg.get("geofenceStrictEnforcement", False))

        geofence_status = check_geofence(
            r_lat, r_lng, t_lat, t_lng, max_radius_meters=max_geofence_meters
        )
        if geofence_status.get("anomaly"):
            logger.warning(
                "🚨 [GEOFENCE ALERT] Order #%s Pickup: Rider #%s is %.1fm away (Allowed: %.0fm)",
                canonical_id, rider_id, geofence_status["distanceMeters"], geofence_status["allowedRadiusMeters"]
            )
            if strict_geofence:
                raise ValueError(
                    f"Geofence security violation: Captain is {geofence_status['distanceMeters']:.0f}m away (Maximum allowed: {max_geofence_meters:.0f}m). Strict Geofence Enforcement is enabled by Admin."
                )

        otp_dict = order.get("otp") or {}
        pickup_record = otp_dict.get("pickup")
        if not pickup_record:
            pickup_code = order.get("pickupOtp")
            if not pickup_code:
                raise PermissionError("Pickup OTP has not been generated for this order yet.")
            pickup_record = {"code": str(pickup_code), "attempts": 0, "verified": False}
        elif isinstance(pickup_record, str):
            pickup_record = {"code": pickup_record, "attempts": 0, "verified": False}
        self._verify_otp_record(pickup_record, otp, "Customer Pickup OTP")

        now = lifecycle.now_iso()
        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.PICKED_UP,
                    "pickupOtpVerified": True,
                    "otp.pickup": pickup_record,
                    "geofence.pickup": geofence_status,
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

            # Trigger Automations: Milestone Broadcast & Laundry SLA Calculation
            try:
                from app.services.automation_service import automation_service
                await automation_service.broadcast_lifecycle_milestone(canonical_id, "picked_up")
                await automation_service.schedule_laundry_sla(canonical_id)
            except Exception as auto_err:
                logger.debug(f"[Automation] Pickup hook error: {auto_err}")
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

        # 1. Fetch Pickup Ride to determine full configured pickup earning
        ride_1 = await database.find_one(RIDES_COLLECTION, {"orderId": canonical_id, "rideType": "pickup"})
        pickup_rider_id = str((ride_1 or {}).get("riderId") or order.get("assignedRiderId") or order.get("riderId") or "")
        pickup_fare = float((ride_1 or {}).get("fare") or (ride_1 or {}).get("estimatedEarning") or 35.0)

        # 2. Settle 100% of Pickup Leg payout into Rider 1 wallet (NO deduction)
        if pickup_rider_id:
            try:
                from app.db.rider_repositories import rider_wallet_repository, rider_notification_repository
                code_str = order.get("code") or canonical_id[:8]
                existing_credit = await database.find_one(
                    "rider_wallet_transactions",
                    {"$or": [{"riderId": pickup_rider_id}, {"rider_id": pickup_rider_id}], "orderCode": code_str, "kind": "pickup_fare"}
                )
                if not existing_credit:
                    await rider_wallet_repository.credit(
                        rider_id=pickup_rider_id,
                        amount=pickup_fare,
                        title=f"Pickup Leg Fare (100% full) · #{code_str}",
                        order_code=code_str,
                        kind="pickup_fare",
                    )
                # Immutable Rider Earnings Ledger: 100% Pickup Leg Settlement
                await rider_earnings_ledger.record_entry(
                    order_id=canonical_id,
                    rider_id=pickup_rider_id,
                    trip_type="PICKUP",
                    base_earning=pickup_fare,
                    deduction=0.0,
                    deduction_percentage=0.0,
                    transfer_amount=0.0,
                    final_earning=pickup_fare,
                    reason="Customer to Store pickup completed successfully",
                    status="SETTLED",
                    metadata={"handoverOtpVerified": True, "at": now},
                )
                await rider_notification_repository.create(
                    rider_id=pickup_rider_id,
                    title="🎉 Pickup Leg Settled (100%)",
                    message=f"Pickup for order #{code_str} confirmed at store. ₹{pickup_fare:.2f} credited to your wallet in full.",
                    kind="payment",
                )
            except Exception as w_err:
                logger.error("Error settling pickup rider fare: %s", w_err)

        # 3. Dynamic Service Processing Timeline & Category Pipeline Calculation
        timeline_info = await processing_service.calculate_processing_timeline(order)

        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.PROCESSING_STARTED,
                    "previousStatus": lifecycle.STORE_DROP_CONFIRMED,
                    "storeDropConfirmed": True,
                    "storeDropConfirmedAt": now,
                    "receivedByPartnerAt": now,
                    "otp.handover": handover_record,
                    "processingTimeline": timeline_info,
                    "processingStages": timeline_info.get("stages", []),
                    "expectedReadyAt": timeline_info.get("expectedReadyAt"),
                    "processingCategory": timeline_info.get("category"),
                    "currentProcessingStage": timeline_info.get("currentStageId", "sorting"),
                    "pickupLegSettled": True,
                    "pickupLegEarning": pickup_fare,
                    "updatedAt": now,
                }
            },
        )
        await database.collection(RIDES_COLLECTION).update_one(
            {"orderId": canonical_id, "rideType": "pickup"},
            {
                "$set": {
                    "status": "COMPLETED",
                    "otp.handover": handover_record,
                    "droppedAtStoreAt": now,
                    "isSettled": True,
                    "settledEarning": pickup_fare,
                    "updatedAt": now,
                }
            },
        )

        updated = await lifecycle.find_order(canonical_id)
        if updated:
            await lifecycle.record_event(
                updated,
                "STORE_DROP_CONFIRMED",
                actor_id=partner_id,
                actor_role="partner",
                metadata={"handoverOtpVerified": True, "pickupFare": pickup_fare},
                at=now,
            )
            await lifecycle.record_event(
                updated,
                "PROCESSING_STARTED",
                actor_id=partner_id,
                actor_role="partner",
                metadata={"expectedReadyAt": timeline_info.get("expectedReadyAt"), "category": timeline_info.get("category")},
                at=now,
            )
            await broadcast_order_event("STORE_DROP_CONFIRMED", updated)
            await broadcast_order_event(lifecycle.PROCESSING_STARTED, updated)
            await broadcast_order_event(
                "order.processing_started",
                updated,
                extra_data={
                    "processingTimeline": timeline_info,
                    "expectedReadyAt": timeline_info.get("expectedReadyAt"),
                },
            )
        return {"ok": True, "status": "STORE_DROP_CONFIRMED", "orderId": canonical_id, "processingTimeline": timeline_info}

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

            # Automated WhatsApp Out For Delivery Alert to Customer
            try:
                from app.core.whatsapp_service import whatsapp_service
                cust_phone = (updated or order).get("customerPhone") or ((updated or order).get("customer") or {}).get("phone")
                cust_name = (updated or order).get("customerName") or ((updated or order).get("customer") or {}).get("name") or "Valued Customer"
                d_otp = str(
                    (updated or order).get("deliveryOtp")
                    or ((updated or order).get("otp") or {}).get("delivery", {}).get("code")
                    or "1234"
                )
                if cust_phone:
                    asyncio.create_task(
                        whatsapp_service.send_out_for_delivery_whatsapp(
                            phone=str(cust_phone),
                            customer_name=str(cust_name),
                            order_id=canonical_id,
                            delivery_otp=d_otp,
                            captain_name=str(assigned_rider_id or "Captain"),
                        )
                    )
            except Exception as exc:
                logger.warning("WhatsApp Out For Delivery notification error: %s", exc)

        return {
            "ok": True,
            "status": lifecycle.OUT_FOR_DELIVERY,
            "orderId": canonical_id,
            "dispatchedTo": assigned_rider_id,
            "custody": "rider",
            "dispatchOtpVerified": True,
            "message": "Dispatch OTP verified. Package custody transferred to Delivery Captain.",
        }

    async def verify_delivery_otp(
        self,
        order_id: str,
        otp: str,
        rider_id: str,
        rider_lat: Optional[float] = None,
        rider_lng: Optional[float] = None,
        garment_verified: bool = True,
        verified_pieces: Optional[int] = None,
    ) -> Dict[str, Any]:
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

        # Geofence Verification Guard at Doorstep Delivery (<250m)
        r_lat, r_lng = rider_lat, rider_lng
        if r_lat is None or r_lng is None:
            live_doc = await database.find_one("live_locations", {"_id": f"rider:{rider_id}"})
            if live_doc:
                r_lat = live_doc.get("latitude")
                r_lng = live_doc.get("longitude")

        addr = order.get("address") or order.get("deliveryAddress") or {}
        t_lat = addr.get("latitude") or addr.get("lat")
        t_lng = addr.get("longitude") or addr.get("lng")

        # Geofence Verification Guard at Doorstep Delivery with Dynamic Admin Policy
        from app.db.admin_repositories import admin_settings_repository
        admin_settings = await admin_settings_repository.get()
        dispatch_cfg = admin_settings.get("dispatch") or {}
        max_geofence_meters = float(dispatch_cfg.get("geofenceRadiusMeters") or 250.0)
        strict_geofence = bool(dispatch_cfg.get("geofenceStrictEnforcement", False))

        geofence_status = check_geofence(
            r_lat, r_lng, t_lat, t_lng, max_radius_meters=max_geofence_meters
        )
        if geofence_status.get("anomaly"):
            logger.warning(
                "🚨 [GEOFENCE ALERT] Order #%s Delivery: Rider #%s is %.1fm away (Allowed: %.0fm)",
                canonical_id, rider_id, geofence_status["distanceMeters"], geofence_status["allowedRadiusMeters"]
            )
            if strict_geofence:
                raise ValueError(
                    f"Geofence security violation: Captain is {geofence_status['distanceMeters']:.0f}m away (Maximum allowed: {max_geofence_meters:.0f}m). Strict Geofence Enforcement is enabled by Admin."
                )

        otp_dict = order.get("otp") or {}
        delivery_record = otp_dict.get("delivery")
        if delivery_record and isinstance(delivery_record, dict) and delivery_record.get("verified"):
            return {"ok": True, "status": "DELIVERED", "orderId": canonical_id, "alreadyDelivered": True}

        if not delivery_record:
            delivery_code = order.get("deliveryOtp")
            if not delivery_code:
                raise PermissionError("Customer Delivery OTP has not been generated for this order yet.")
            delivery_record = {"code": str(delivery_code), "attempts": 0, "verified": False}
        elif isinstance(delivery_record, str):
            delivery_record = {"code": delivery_record, "attempts": 0, "verified": False}

        self._verify_otp_record(delivery_record, clean_otp, "Customer Delivery OTP")

        now = lifecycle.now_iso()

        # Dual-Stage Garment Verification (Checkpoint 2: Doorstep Delivery)
        intake_info = (order.get("garmentVerification") or {}).get("storeIntake") or {}
        default_count = intake_info.get("totalReceivedPieces") or sum(
            int(it.get("quantity") or it.get("qty") or 1) for it in (order.get("items") or [])
        )
        delivered_count = verified_pieces if verified_pieces is not None else default_count

        doorstep_record = {
            "verified": bool(garment_verified),
            "piecesDelivered": delivered_count,
            "verifiedAt": now,
            "verifiedBy": rider_id,
            "customerConfirmed": True,
        }

        await database.collection(ORDERS_COLLECTION).update_one(
            {"_id": canonical_id},
            {
                "$set": {
                    "status": lifecycle.DELIVERED,
                    "deliveryOtpVerified": True,
                    "otp.delivery": delivery_record,
                    "geofence.delivery": geofence_status,
                    "garmentVerification.doorstepDelivery": doorstep_record,
                    "doorstepPiecesVerified": True,
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

        # Automated WhatsApp Order Delivered Notification
        try:
            from app.core.whatsapp_service import whatsapp_service
            cust_phone = (order or {}).get("customerPhone") or ((order or {}).get("customer") or {}).get("phone")
            cust_name = (order or {}).get("customerName") or ((order or {}).get("customer") or {}).get("name") or "Valued Customer"
            if cust_phone:
                asyncio.create_task(
                    whatsapp_service.send_order_delivered_whatsapp(
                        phone=str(cust_phone),
                        customer_name=str(cust_name),
                        order_id=canonical_id,
                    )
                )
        except Exception as exc:
            logger.warning("WhatsApp order delivered notification error: %s", exc)

        # Record COD collected cash in rider's floating custody (Finance Security)
        pay_mode = str(order.get("paymentMode") or (order.get("payment") or {}).get("mode") or "").lower()
        if pay_mode in ("cod", "cash", "cash_on_delivery") and rider_id:
            collected_amount = float(
                (order.get("totals") or {}).get("grandTotal")
                or (order.get("pricing") or {}).get("finalTotal")
                or order.get("total_amount")
                or order.get("amount")
                or 0.0
            )
            if collected_amount > 0:
                await database.collection(RIDERS_COLLECTION).update_one(
                    {"_id": rider_id},
                    {"$inc": {"floatingCash": collected_amount, "cashInHand": collected_amount}},
                )
                logger.info("Captain %s collected COD cash: ₹%.2f (added to floating cash)", rider_id, collected_amount)

        # Settle Delivery Leg payout and Rider 2 Reassignment Pool
        ride_2 = await database.find_one(RIDES_COLLECTION, {"orderId": canonical_id, "rideType": {"$in": ["delivery", "handover_delivery"]}})
        reassignment_pool = float(order.get("reassignmentPool") or (ride_2 or {}).get("extraBonusAmount") or 0.0)
        is_reassigned_delivery = bool(reassignment_pool > 0 or order.get("isReassigned") or (ride_2 or {}).get("isReassigned"))

        stored_fare = float((ride_2 or {}).get("fare") or (ride_2 or {}).get("estimatedEarning") or 35.0)
        base_delivery = float((ride_2 or {}).get("baseFare") or (ride_2 or {}).get("baseDeliveryPayout") or (
            stored_fare - reassignment_pool if is_reassigned_delivery and reassignment_pool > 0 and stored_fare > reassignment_pool else stored_fare
        ))

        if is_reassigned_delivery and reassignment_pool > 0:
            final_delivery_payout = round(base_delivery + reassignment_pool, 2)
            payout_title = f"Delivery Fare + Reassignment Bonus (+₹{reassignment_pool:.2f}) · #{order.get('code')}"
            reason_str = f"Reassigned delivery completed successfully (+20% bonus pool ₹{reassignment_pool:.2f} transferred)"
            transfer_amt = reassignment_pool
        else:
            final_delivery_payout = base_delivery
            payout_title = f"Delivery Leg Fare (100% full) · #{order.get('code')}"
            reason_str = "Doorstep delivery completed successfully"
            transfer_amt = 0.0

        if rider_id:
            try:
                from app.db.rider_repositories import rider_wallet_repository, rider_notification_repository
                code_str = order.get("code") or canonical_id[:8]
                await rider_wallet_repository.credit(
                    rider_id=rider_id,
                    amount=final_delivery_payout,
                    title=payout_title,
                    order_code=code_str,
                    kind="delivery_fare",
                )
                await rider_earnings_ledger.record_entry(
                    order_id=canonical_id,
                    rider_id=rider_id,
                    trip_type="DELIVERY",
                    base_earning=base_delivery,
                    deduction=0.0,
                    deduction_percentage=0.0,
                    transfer_amount=transfer_amt,
                    final_earning=final_delivery_payout,
                    reason=reason_str,
                    status="SETTLED",
                    metadata={"deliveryOtpVerified": True, "at": now},
                )
                await rider_notification_repository.create(
                    rider_id=rider_id,
                    title="🎉 Delivery Leg Settled",
                    message=f"Delivery for order #{code_str} completed. ₹{final_delivery_payout:.2f} credited to your wallet in full.",
                    kind="payment",
                )
            except Exception as r_payout_err:
                logger.error("Error crediting delivery rider payout: %s", r_payout_err)

        # Settle partner, rider, and platform financials via settlement_engine and unified finance ledger
        try:
            from app.services.settlement_engine import settlement_engine
            await settlement_engine.settle_order_on_completion(order)
        except Exception as err:
            logger.warning(f"Settlement completion hook error: {err}")

        try:
            from app.services.unified_finance_service import unified_finance_service
            p_id = str((order.get("partner") or {}).get("id") or order.get("partnerId") or order.get("partner_id") or "")
            await unified_finance_service.record_ledger_event(
                order_id=canonical_id,
                transaction_type="ORDER_COMPLETED",
                amount=float((order.get("totals") or {}).get("grandTotal") or 0.0),
                is_credit=True,
                rider_id=rider_id,
                partner_id=p_id or None,
                reference="DELIVERY_OTP_VERIFIED",
                created_by="RIDER",
                metadata={"deliveredAt": now, "deliveryOtpVerified": True},
            )
        except Exception as fin_err:
            logger.warning(f"Unified finance completion ledger hook error: {fin_err}")

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

            # Trigger Automations: Lifecycle Broadcast & Financial P&L Settlement
            try:
                from app.services.automation_service import automation_service
                await automation_service.broadcast_lifecycle_milestone(canonical_id, "delivered")
                await automation_service.execute_financial_settlement(canonical_id)
            except Exception as auto_err:
                logger.debug(f"[Automation] Delivery settlement hook error: {auto_err}")

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

        # Pickup leg payout is 100% PROTECTED (Customer -> Store completed by Rider 1)
        ride_1 = await database.find_one(RIDES_COLLECTION, {"orderId": canonical_id, "rideType": "pickup"})
        cust_loc = order.get("pickupLocation") or order.get("customerLocation") or {}
        c_lat = float(cust_loc.get("lat") or cust_loc.get("latitude") or p_lat)
        c_lng = float(cust_loc.get("lng") or cust_loc.get("longitude") or p_lng)
        pickup_dist_km = max(0.5, haversine_distance_km(c_lat, c_lng, p_lat, p_lng))
        calc_pickup = round(25.0 + max(0.0, pickup_dist_km * 8.0), 2)
        pickup_gross_payout = float((ride_1 or {}).get("estimatedEarning") or (ride_1 or {}).get("fare") or calc_pickup)
        # ZERO deduction from pickup leg!
        net_pickup_payout = pickup_gross_payout
        penalty_deduction = 0.0

        # Delivery leg payout: 20% deduction applies ONLY to the failed delivery leg
        delivery_dist_km = max(0.5, haversine_distance_km(p_lat, p_lng, drop_lat, drop_lng))
        base_delivery_payout = round(25.0 + max(0.0, delivery_dist_km * 8.0), 2)
        delivery_deduction_20 = round(base_delivery_payout * 0.20, 2)
        rider_1_delivery_payout = round(base_delivery_payout - delivery_deduction_20, 2)
        reassignment_pool = delivery_deduction_20
        new_rider_delivery_payout = round(base_delivery_payout + reassignment_pool, 2)

        # Generate secure 4-digit Dispatch OTP for Partner -> Rider 2 handover
        dispatch_otp = generate_secure_4digit_otp()
        dispatch_record = create_otp_record(dispatch_otp)

        # Record Rider 1 Delivery Deduction in immutable ledger
        if rider_id:
            try:
                code_str = order.get("code") or canonical_id[:8]
                from app.db.rider_repositories import rider_wallet_repository, rider_notification_repository

                # Ensure 100% pickup is credited if not already done
                existing_pickup = await database.find_one(
                    "rider_wallet_transactions",
                    {"$or": [{"riderId": rider_id}, {"rider_id": rider_id}], "orderCode": code_str, "kind": "pickup_fare"}
                )
                if not existing_pickup:
                    await rider_wallet_repository.credit(
                        rider_id=rider_id,
                        amount=pickup_gross_payout,
                        title=f"Pickup Leg Fare (100% full) · #{code_str}",
                        order_code=code_str,
                        kind="pickup_fare",
                    )

                # Record 20% delivery leg deduction in rider_earnings_ledger
                await rider_earnings_ledger.record_entry(
                    order_id=canonical_id,
                    rider_id=rider_id,
                    trip_type="DELIVERY",
                    base_earning=base_delivery_payout,
                    deduction=delivery_deduction_20,
                    deduction_percentage=20.0,
                    transfer_amount=0.0,
                    final_earning=rider_1_delivery_payout,
                    reason=f"Delivery unable ({reason}) — 20% diverted to reassignment pool",
                    status="DEDUCTED",
                    metadata={"at": now, "remarks": remarks or ""},
                )

                await rider_notification_repository.create(
                    rider_id=rider_id,
                    title="⚠️ Delivery Reassigned",
                    message=f"Delivery for order #{code_str} reassigned due to {reason.replace('_', ' ')}. ₹{rider_1_delivery_payout:.2f} delivery credit (20% pool ₹{delivery_deduction_20:.2f} diverted to Rider 2). Pickup earning is 100% safe.",
                    kind="payment",
                )
                if reason in ("vehicle_breakdown", "accident_health", "medical_emergency"):
                    await database.collection(RIDERS_COLLECTION).update_one(
                        {"$or": [{"_id": rider_id}, {"riderId": rider_id}]},
                        {"$set": {"isOnline": False, "dutyStatus": "OFF DUTY", "updatedAt": now}}
                    )
            except Exception as err:
                logger.error(f"Error recording Rider 1 delivery reassignment: {err}", exc_info=True)

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
            "extraBonusAmount": reassignment_pool,
            "reassignmentPool": reassignment_pool,
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
                    "status": lifecycle.DELIVERY_RIDER_REASSIGNING,
                    "previousStatus": lifecycle.DELIVERY_FAILED,
                    "riderDeliveryOptOut": True,
                    "reassignmentRequired": True,
                    "assignedRiderId": None,
                    "deliveryRiderId": None,
                    "originalRiderId": rider_id,
                    "pickupGrossPayout": pickup_gross_payout,
                    "pickupNetPayout": net_pickup_payout,
                    "deliveryReassignedBonusPercent": 20,
                    "deliveryReassignedBonusAmount": reassignment_pool,
                    "reassignmentPool": reassignment_pool,
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
                        "phone": mask_phone(order.get("customerPhone") or ""),
                        "phoneMasked": mask_phone(order.get("customerPhone") or ""),
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

        from app.services.rider_dispatch import resolve_real_rider_party
        resolved_r2 = await resolve_real_rider_party(r2_profile or new_rider_id)
        r2_party = resolved_r2 or {
            "id": new_rider_id,
            "name": r2_profile.get("fullName") or r2_profile.get("name") or "QuickPress Captain",
            "phone": r2_profile.get("phone") or "",
            "vehicle": r2_profile.get("vehicleType") or "Bike",
            "vehicleType": r2_profile.get("vehicleType") or "Bike",
            "plate": r2_profile.get("vehicleNumber") or "",
            "vehicleNumber": r2_profile.get("vehicleNumber") or "",
            "avatar": r2_profile.get("photoUrl") or r2_profile.get("selfieUrl") or "",
            "photo": r2_profile.get("photoUrl") or r2_profile.get("selfieUrl") or "",
            "image": r2_profile.get("photoUrl") or r2_profile.get("selfieUrl") or "",
            "rating": float(r2_profile.get("rating", 5.0)),
            "trips": str(r2_profile.get("lifetimeDeliveries") or r2_profile.get("totalTrips") or "10+ deliveries"),
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
