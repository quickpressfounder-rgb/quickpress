"""Canonical order lifecycle — the single source of truth for order state.

Every app (customer, partner, rider, admin) reads and writes the SAME order
document in the `customer_orders` collection, identified by the SAME canonical
`orderId`. Partner and rider views are *projections* of that document; they no
longer own their own copy of an order.

Collections
-----------
customer_orders  the canonical order (identity, parties, status, totals, otp)
order_events     append-only audit trail: one row per lifecycle transition

Status machine
--------------
pending_partner_acceptance -> partner_accepted | cancelled
partner_accepted           -> rider_assigned   | cancelled
rider_assigned             -> rider_accepted   | cancelled
rider_accepted             -> picked_up        | cancelled
picked_up                  -> at_partner       | cancelled
at_partner                 -> processing       | cancelled
processing                 -> completed        | cancelled
completed                  -> out_for_delivery | cancelled
out_for_delivery           -> delivered
delivered                  -> (terminal)
cancelled                  -> (terminal)
"""

from __future__ import annotations

import asyncio
import logging
import random
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

from app.db.client import database
from app.core.privacy import mask_phone

ORDERS = "customer_orders"
EVENTS = "order_events"

# Canonical QuickPress Order Lifecycle V2 Constants
PLACED = "placed"
PENDING = "pending_partner_acceptance"  # alias
ORDER_PLACED = "placed"

PARTNER_ACCEPTED = "partner_accepted"

RIDER_PICKUP_ASSIGNING = "rider_pickup_assigning"
RIDER_SEARCHING = "rider_searching"  # alias
PICKUP_RIDER_ASSIGNED = "pickup_rider_assigned"
RIDER_ASSIGNED = "rider_assigned"  # alias
RIDER_PICKUP_ACCEPTED = "pickup_rider_accepted"
PICKUP_RIDER_ACCEPTED = "pickup_rider_accepted"
RIDER_ACCEPTED = "rider_accepted"  # alias
RIDER_GOING_TO_PICKUP = "rider_going_to_pickup"
PICKUP_OTP_PENDING = "pickup_otp_pending"
PICKUP_OTP_VERIFIED = "pickup_otp_verified"
PICKED_UP = "picked_up"

IN_TRANSIT_TO_STORE = "in_transit_to_store"
AT_STORE = "at_store"
AT_PARTNER = AT_STORE  # canonical alias
STORE_DROP_CONFIRMED = "store_drop_confirmed"

PROCESSING_STARTED = "processing_started"
PROCESSING = PROCESSING_STARTED  # canonical alias
SORTING = "sorting"
WASHING = "washing"
DRYING = "drying"
DRY_CLEANING = "dry_cleaning"
IRONING = "ironing"
QUALITY_CHECK = "quality_check"
PACKED = "packed"
PROCESSING_COMPLETED = "processing_completed"

READY_FOR_DELIVERY = "ready_for_delivery"
READY = "ready"  # alias
COMPLETED = "completed"

DELIVERY_RIDER_ASSIGNING = "delivery_rider_assigning"
DELIVERY_RIDER_ASSIGNED = "delivery_rider_assigned"
DELIVERY_RIDER_2_ASSIGNED = "delivery_rider_2_assigned"
DELIVERY_RIDER_ACCEPTED = "delivery_rider_accepted"
DISPATCH_OTP_PENDING = "dispatch_otp_pending"
DISPATCH_OTP_VERIFIED = "dispatch_otp_verified"
OUT_FOR_DELIVERY = "out_for_delivery"
DELIVERY_OTP_PENDING = "delivery_otp_pending"
DELIVERY_OTP_VERIFIED = "delivery_otp_verified"
DELIVERED = "delivered"

# Failure and Reassignment States
RIDER_REJECTED = "rider_rejected"
RIDER_TIMEOUT = "rider_timeout"
PICKUP_FAILED = "pickup_failed"
CUSTOMER_UNAVAILABLE = "customer_unavailable"
STORE_REJECTED = "store_rejected"
PROCESSING_HOLD = "processing_hold"
QUALITY_ISSUE = "quality_issue"
DELIVERY_FAILED = "delivery_failed"
DELIVERY_RIDER_REASSIGNING = "delivery_rider_reassigning"
DELIVERY_REASSIGNMENT_REQUIRED = "delivery_reassignment_required"  # alias
HANDOVER_RIDER_ASSIGNED = "handover_rider_assigned"
HANDOVER_OTP_PENDING = "handover_otp_pending"
CANCELLED = "cancelled"
PAYMENT_FAILED = "payment_failed"
REFUND_PENDING = "refund_pending"
REFUNDED = "refunded"

TERMINAL = (COMPLETED, DELIVERED, CANCELLED, REFUNDED)

# Platform SLA Guarantees (in seconds)
PARTNER_ACCEPT_SLA_SECONDS = 600   # 10 minutes for Partner Store to accept
RIDER_ACCEPT_SLA_SECONDS = 1800    # 30 minutes for Delivery Captain to accept pickup

#: Documents created before the canonical lifecycle used aliases.
LEGACY_STATUS_ALIASES = {
    "placed": PLACED,
    "pending_partner_acceptance": PLACED,
    "ORDER_CREATED": PLACED,
    "ORDER_PLACED": PLACED,
    "order_created": PLACED,
    "searching": RIDER_SEARCHING,
    "rider_searching": RIDER_SEARCHING,
    "rider_pickup_assigning": RIDER_PICKUP_ASSIGNING,
    "rider_assigned": PICKUP_RIDER_ASSIGNED,
    "pickup_rider_assigned": PICKUP_RIDER_ASSIGNED,
    "rider_accepted": PICKUP_RIDER_ACCEPTED,
    "pickup_rider_accepted": PICKUP_RIDER_ACCEPTED,
    "at-partner": AT_PARTNER,
    "at_partner": AT_STORE,
    "at_store": AT_STORE,
    "ready": READY_FOR_DELIVERY,
    "completed": COMPLETED,
    "ready-for-delivery": READY_FOR_DELIVERY,
    "ready_for_delivery": READY_FOR_DELIVERY,
    "processing": PROCESSING_STARTED,
    "processing_started": PROCESSING_STARTED,
    "in_wash": WASHING,
    "dry_cleaning": DRY_CLEANING,
    "ironing": IRONING,
}

TRANSITIONS: Dict[str, tuple] = {
    PLACED: (PARTNER_ACCEPTED, STORE_REJECTED, CANCELLED, PAYMENT_FAILED),
    PENDING: (PARTNER_ACCEPTED, STORE_REJECTED, CANCELLED, PAYMENT_FAILED),
    PARTNER_ACCEPTED: (RIDER_PICKUP_ASSIGNING, PICKUP_RIDER_ASSIGNED, RIDER_ASSIGNED, RIDER_SEARCHING, CANCELLED),
    RIDER_PICKUP_ASSIGNING: (PICKUP_RIDER_ASSIGNED, RIDER_ASSIGNED, RIDER_REJECTED, RIDER_TIMEOUT, CANCELLED),
    RIDER_SEARCHING: (PICKUP_RIDER_ASSIGNED, RIDER_ASSIGNED, RIDER_REJECTED, RIDER_TIMEOUT, CANCELLED),
    RIDER_REJECTED: (RIDER_PICKUP_ASSIGNING, RIDER_SEARCHING, PICKUP_RIDER_ASSIGNED, CANCELLED),
    RIDER_TIMEOUT: (RIDER_PICKUP_ASSIGNING, RIDER_SEARCHING, PICKUP_RIDER_ASSIGNED, CANCELLED),
    PICKUP_RIDER_ASSIGNED: (RIDER_GOING_TO_PICKUP, PICKUP_RIDER_ACCEPTED, RIDER_ACCEPTED, PICKUP_OTP_PENDING, PICKED_UP, AT_STORE, AT_PARTNER, PICKUP_FAILED, CANCELLED),
    RIDER_ASSIGNED: (RIDER_GOING_TO_PICKUP, PICKUP_RIDER_ACCEPTED, RIDER_ACCEPTED, PICKUP_OTP_PENDING, PICKED_UP, AT_STORE, AT_PARTNER, PICKUP_FAILED, CANCELLED),
    RIDER_GOING_TO_PICKUP: (PICKUP_OTP_PENDING, PICKUP_OTP_VERIFIED, PICKED_UP, IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, CUSTOMER_UNAVAILABLE, PICKUP_FAILED, CANCELLED),
    PICKUP_RIDER_ACCEPTED: (RIDER_GOING_TO_PICKUP, PICKUP_OTP_PENDING, PICKUP_OTP_VERIFIED, PICKED_UP, IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, PICKUP_FAILED, CANCELLED),
    RIDER_ACCEPTED: (RIDER_GOING_TO_PICKUP, PICKUP_OTP_PENDING, PICKUP_OTP_VERIFIED, PICKED_UP, IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, PICKUP_FAILED, CANCELLED),
    PICKUP_OTP_PENDING: (PICKUP_OTP_VERIFIED, PICKED_UP, IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, PICKUP_FAILED, CANCELLED),
    PICKUP_OTP_VERIFIED: (PICKED_UP, IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, CANCELLED),
    PICKED_UP: (IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    IN_TRANSIT_TO_STORE: (AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, STORE_REJECTED, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    AT_STORE: (STORE_DROP_CONFIRMED, STORE_REJECTED, PROCESSING_STARTED, PROCESSING, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    AT_PARTNER: (STORE_DROP_CONFIRMED, STORE_REJECTED, PROCESSING_STARTED, PROCESSING, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    STORE_DROP_CONFIRMED: (PROCESSING_STARTED, PROCESSING, SORTING, WASHING, DRY_CLEANING, IRONING, PROCESSING_HOLD, CANCELLED),
    PROCESSING_STARTED: (SORTING, WASHING, DRYING, DRY_CLEANING, IRONING, QUALITY_CHECK, PACKED, PROCESSING_COMPLETED, READY_FOR_DELIVERY, PROCESSING_HOLD, QUALITY_ISSUE, CANCELLED),
    PROCESSING: (SORTING, WASHING, DRYING, DRY_CLEANING, IRONING, QUALITY_CHECK, PACKED, PROCESSING_COMPLETED, READY_FOR_DELIVERY, PROCESSING_HOLD, QUALITY_ISSUE, CANCELLED),
    SORTING: (WASHING, DRY_CLEANING, IRONING, QUALITY_CHECK, PACKED, QUALITY_ISSUE, PROCESSING_HOLD, CANCELLED),
    WASHING: (DRYING, IRONING, QUALITY_CHECK, PACKED, QUALITY_ISSUE, PROCESSING_HOLD, CANCELLED),
    DRYING: (IRONING, QUALITY_CHECK, PACKED, QUALITY_ISSUE, PROCESSING_HOLD, CANCELLED),
    DRY_CLEANING: (IRONING, QUALITY_CHECK, PACKED, QUALITY_ISSUE, PROCESSING_HOLD, CANCELLED),
    IRONING: (QUALITY_CHECK, PACKED, PROCESSING_COMPLETED, READY_FOR_DELIVERY, QUALITY_ISSUE, CANCELLED),
    QUALITY_CHECK: (PACKED, PROCESSING_COMPLETED, READY_FOR_DELIVERY, QUALITY_ISSUE, PROCESSING_HOLD, CANCELLED),
    QUALITY_ISSUE: (SORTING, WASHING, DRY_CLEANING, IRONING, PROCESSING_STARTED, PROCESSING_HOLD, CANCELLED),
    PROCESSING_HOLD: (PROCESSING_STARTED, SORTING, WASHING, DRY_CLEANING, IRONING, CANCELLED),
    PACKED: (PROCESSING_COMPLETED, READY_FOR_DELIVERY, CANCELLED),
    PROCESSING_COMPLETED: (READY_FOR_DELIVERY, READY, COMPLETED, CANCELLED),
    READY_FOR_DELIVERY: (DELIVERY_RIDER_ASSIGNING, DELIVERY_RIDER_ASSIGNED, DELIVERY_RIDER_ACCEPTED, RIDER_ASSIGNED, RIDER_ACCEPTED, RIDER_SEARCHING, DISPATCH_OTP_PENDING, DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_FAILED, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    READY: (DELIVERY_RIDER_ASSIGNING, DELIVERY_RIDER_ASSIGNED, DELIVERY_RIDER_ACCEPTED, RIDER_ASSIGNED, RIDER_ACCEPTED, RIDER_SEARCHING, DISPATCH_OTP_PENDING, DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_FAILED, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    DELIVERY_RIDER_ASSIGNING: (DELIVERY_RIDER_ASSIGNED, DELIVERY_RIDER_ACCEPTED, DELIVERY_FAILED, RIDER_REJECTED, RIDER_TIMEOUT, CANCELLED),
    DELIVERY_RIDER_ASSIGNED: (DELIVERY_RIDER_ACCEPTED, DISPATCH_OTP_PENDING, DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_FAILED, DELIVERY_RIDER_REASSIGNING, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    DELIVERY_RIDER_ACCEPTED: (DISPATCH_OTP_PENDING, DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_FAILED, DELIVERY_RIDER_REASSIGNING, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    DELIVERY_FAILED: (DELIVERY_RIDER_REASSIGNING, DELIVERY_RIDER_2_ASSIGNED, DELIVERY_RIDER_ASSIGNED, CANCELLED),
    DELIVERY_RIDER_REASSIGNING: (DELIVERY_RIDER_2_ASSIGNED, DELIVERY_RIDER_ASSIGNED, CANCELLED),
    DELIVERY_RIDER_2_ASSIGNED: (DISPATCH_OTP_PENDING, DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_FAILED, CANCELLED),
    DISPATCH_OTP_PENDING: (DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_FAILED, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    DISPATCH_OTP_VERIFIED: (OUT_FOR_DELIVERY, DELIVERY_FAILED, CANCELLED),
    OUT_FOR_DELIVERY: (DELIVERY_OTP_PENDING, DELIVERY_OTP_VERIFIED, DELIVERED, DELIVERY_FAILED, CUSTOMER_UNAVAILABLE, DELIVERY_REASSIGNMENT_REQUIRED, CANCELLED),
    DELIVERY_OTP_PENDING: (DELIVERY_OTP_VERIFIED, DELIVERED, DELIVERY_FAILED, CUSTOMER_UNAVAILABLE, CANCELLED),
    DELIVERY_OTP_VERIFIED: (DELIVERED, COMPLETED, CANCELLED),
    DELIVERY_REASSIGNMENT_REQUIRED: (DELIVERY_RIDER_ACCEPTED, DELIVERY_RIDER_ASSIGNED, DELIVERY_RIDER_2_ASSIGNED, HANDOVER_RIDER_ASSIGNED, DISPATCH_OTP_PENDING, OUT_FOR_DELIVERY, CANCELLED),
    HANDOVER_RIDER_ASSIGNED: (HANDOVER_OTP_PENDING, DISPATCH_OTP_PENDING, OUT_FOR_DELIVERY, CANCELLED),
    HANDOVER_OTP_PENDING: (OUT_FOR_DELIVERY, CANCELLED),
    DELIVERED: (COMPLETED,),
    COMPLETED: (),
    CANCELLED: (REFUND_PENDING, REFUNDED),
    REFUND_PENDING: (REFUNDED,),
    REFUNDED: (),
}

STATUS_LABEL = {
    PLACED: "Order placed",
    PENDING: "Order placed",
    PARTNER_ACCEPTED: "Partner accepted",
    RIDER_PICKUP_ASSIGNING: "Assigning pickup rider",
    RIDER_SEARCHING: "Searching for pickup rider",
    RIDER_REJECTED: "Rider rejected offer",
    RIDER_TIMEOUT: "Rider offer timed out",
    PICKUP_RIDER_ASSIGNED: "Pickup rider assigned",
    RIDER_ASSIGNED: "Pickup rider assigned",
    RIDER_GOING_TO_PICKUP: "Rider heading to pickup",
    PICKUP_RIDER_ACCEPTED: "Pickup rider accepted",
    RIDER_ACCEPTED: "Pickup rider accepted",
    PICKUP_OTP_PENDING: "Pickup OTP verification",
    PICKUP_OTP_VERIFIED: "Pickup OTP verified",
    PICKED_UP: "Picked up",
    IN_TRANSIT_TO_STORE: "In transit to store",
    AT_STORE: "Reached store",
    AT_PARTNER: "Reached store",
    STORE_DROP_CONFIRMED: "Store received clothes",
    PROCESSING_STARTED: "In processing",
    PROCESSING: "In cleaning",
    SORTING: "Sorting garments",
    WASHING: "Washing & deep clean",
    DRYING: "Drying cycle",
    DRY_CLEANING: "Dry cleaning fabric care",
    IRONING: "Steam ironing & pressing",
    QUALITY_CHECK: "Quality control inspection",
    PACKED: "Garments packed",
    PROCESSING_COMPLETED: "Processing completed",
    READY_FOR_DELIVERY: "Ready for delivery",
    READY: "Ready for delivery",
    DELIVERY_RIDER_ASSIGNING: "Assigning delivery rider",
    DELIVERY_RIDER_ASSIGNED: "Delivery rider assigned",
    DELIVERY_RIDER_2_ASSIGNED: "Replacement delivery rider assigned",
    DELIVERY_RIDER_ACCEPTED: "Delivery rider accepted",
    DISPATCH_OTP_PENDING: "Store dispatch OTP verification",
    DISPATCH_OTP_VERIFIED: "Store dispatch verified",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERY_OTP_PENDING: "Delivery OTP verification",
    DELIVERY_OTP_VERIFIED: "Delivery OTP verified",
    DELIVERY_FAILED: "Delivery incomplete – reassigning",
    DELIVERY_RIDER_REASSIGNING: "Auto-reassigning delivery rider",
    DELIVERY_REASSIGNMENT_REQUIRED: "Delivery pending – reassignment required",
    HANDOVER_RIDER_ASSIGNED: "Transfer captain assigned",
    HANDOVER_OTP_PENDING: "Handover OTP verification",
    PICKUP_FAILED: "Pickup unsuccessful",
    CUSTOMER_UNAVAILABLE: "Customer unavailable",
    STORE_REJECTED: "Store rejected order",
    PROCESSING_HOLD: "Processing on hold",
    QUALITY_ISSUE: "Quality review pending",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    PAYMENT_FAILED: "Payment failed",
    REFUND_PENDING: "Refund pending",
    REFUNDED: "Refunded to customer",
}

#: Audit-trail event name emitted for each status.
EVENT_NAME = {
    PLACED: "ORDER_CREATED",
    PENDING: "ORDER_CREATED",
    PARTNER_ACCEPTED: "PARTNER_ACCEPTED",
    RIDER_PICKUP_ASSIGNING: "PICKUP_RIDER_SEARCHING",
    RIDER_SEARCHING: "PICKUP_RIDER_SEARCHING",
    RIDER_REJECTED: "RIDER_OFFER_REJECTED",
    RIDER_TIMEOUT: "RIDER_OFFER_TIMEOUT",
    PICKUP_RIDER_ASSIGNED: "PICKUP_RIDER_ASSIGNED",
    RIDER_ASSIGNED: "PICKUP_RIDER_ASSIGNED",
    RIDER_GOING_TO_PICKUP: "RIDER_GOING_TO_PICKUP",
    PICKUP_RIDER_ACCEPTED: "PICKUP_RIDER_ACCEPTED",
    RIDER_ACCEPTED: "PICKUP_RIDER_ACCEPTED",
    PICKUP_OTP_PENDING: "PICKUP_OTP_PENDING",
    PICKUP_OTP_VERIFIED: "PICKUP_OTP_VERIFIED",
    PICKED_UP: "PICKED_UP",
    IN_TRANSIT_TO_STORE: "IN_TRANSIT_TO_STORE",
    AT_STORE: "AT_PARTNER",
    AT_PARTNER: "AT_PARTNER",
    STORE_DROP_CONFIRMED: "STORE_DROP_CONFIRMED",
    PROCESSING_STARTED: "PROCESSING_STARTED",
    PROCESSING: "PROCESSING_STARTED",
    SORTING: "PROCESSING_SORTING",
    WASHING: "PROCESSING_WASHING",
    DRYING: "PROCESSING_DRYING",
    DRY_CLEANING: "PROCESSING_DRY_CLEANING",
    IRONING: "PROCESSING_IRONING",
    QUALITY_CHECK: "PROCESSING_QUALITY_CHECK",
    PACKED: "PROCESSING_PACKED",
    PROCESSING_COMPLETED: "PROCESSING_COMPLETED",
    READY_FOR_DELIVERY: "READY_FOR_DELIVERY",
    READY: "READY_FOR_DELIVERY",
    DELIVERY_RIDER_ASSIGNING: "DELIVERY_RIDER_SEARCHING",
    DELIVERY_RIDER_ASSIGNED: "DELIVERY_RIDER_ASSIGNED",
    DELIVERY_RIDER_2_ASSIGNED: "DELIVERY_RIDER_2_ASSIGNED",
    DELIVERY_RIDER_ACCEPTED: "DELIVERY_RIDER_ACCEPTED",
    DISPATCH_OTP_PENDING: "DISPATCH_OTP_PENDING",
    DISPATCH_OTP_VERIFIED: "DISPATCH_OTP_VERIFIED",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERY_OTP_PENDING: "DELIVERY_OTP_PENDING",
    DELIVERY_OTP_VERIFIED: "DELIVERY_OTP_VERIFIED",
    DELIVERY_FAILED: "DELIVERY_FAILED",
    DELIVERY_RIDER_REASSIGNING: "DELIVERY_RIDER_REASSIGNING",
    DELIVERY_REASSIGNMENT_REQUIRED: "DELIVERY_REASSIGNMENT_REQUIRED",
    HANDOVER_RIDER_ASSIGNED: "HANDOVER_RIDER_ASSIGNED",
    HANDOVER_OTP_PENDING: "HANDOVER_OTP_PENDING",
    PICKUP_FAILED: "PICKUP_FAILED",
    CUSTOMER_UNAVAILABLE: "CUSTOMER_UNAVAILABLE",
    STORE_REJECTED: "STORE_REJECTED",
    PROCESSING_HOLD: "PROCESSING_HOLD",
    QUALITY_ISSUE: "QUALITY_ISSUE",
    DELIVERED: "ORDER_DELIVERED",
    COMPLETED: "ORDER_COMPLETED",
    CANCELLED: "ORDER_CANCELLED",
    PAYMENT_FAILED: "PAYMENT_FAILED",
    REFUND_PENDING: "REFUND_PENDING",
    REFUNDED: "REFUND_COMPLETED",
}


class OrderNotFoundError(Exception):
    """No canonical order exists for the given id/code."""


class InvalidTransitionError(Exception):
    """The requested status is not reachable from the current status."""


class DuplicateActionError(Exception):
    """The order is already in the requested status."""


class OrderAuthorizationError(Exception):
    """The actor is not the partner/rider/customer attached to this order."""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def new_otp() -> str:
    """Order specific OTP. Never a hardcoded universal code."""
    return f"{random.randint(1000, 9999)}"


def normalize_status(value: Any) -> str:
    status = str(value or PENDING)
    return LEGACY_STATUS_ALIASES.get(status, status)


def order_status(order: Dict[str, Any]) -> str:
    return normalize_status(order.get("status"))


def order_id_of(order: Dict[str, Any]) -> str:
    return str(order.get("_id") or order.get("id"))


def compute_order_deadlines(order: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate remaining SLA seconds and ISO deadlines for Partner and Rider acceptance."""
    now = datetime.now(timezone.utc)
    created_at_str = order.get("createdAt") or order.get("placedAt") or order.get("created_at")
    partner_accepted_at_str = (
        order.get("partnerAcceptedAt")
        or order.get("partner_accepted_at")
        or order.get("riderDispatchStartedAt")
    )

    partner_deadline_str = order.get("partnerAcceptDeadline")
    rider_deadline_str = order.get("riderAcceptDeadline")

    partner_remaining: Optional[int] = None
    rider_remaining: Optional[int] = None

    if created_at_str:
        try:
            created_dt = datetime.fromisoformat(str(created_at_str).replace("Z", "+00:00"))
            if not partner_deadline_str:
                partner_deadline_dt = created_dt + timedelta(seconds=PARTNER_ACCEPT_SLA_SECONDS)
                partner_deadline_str = partner_deadline_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
            else:
                partner_deadline_dt = datetime.fromisoformat(str(partner_deadline_str).replace("Z", "+00:00"))

            diff = (partner_deadline_dt - now).total_seconds()
            partner_remaining = max(0, int(diff))
        except Exception:
            pass

    if partner_accepted_at_str:
        try:
            accepted_dt = datetime.fromisoformat(str(partner_accepted_at_str).replace("Z", "+00:00"))
            if not rider_deadline_str:
                rider_deadline_dt = accepted_dt + timedelta(seconds=RIDER_ACCEPT_SLA_SECONDS)
                rider_deadline_str = rider_deadline_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
            else:
                rider_deadline_dt = datetime.fromisoformat(str(rider_deadline_str).replace("Z", "+00:00"))

            diff = (rider_deadline_dt - now).total_seconds()
            rider_remaining = max(0, int(diff))
        except Exception:
            pass

    return {
        "partnerAcceptDeadline": partner_deadline_str,
        "partnerSlaSeconds": PARTNER_ACCEPT_SLA_SECONDS,
        "partnerSlaRemainingSeconds": partner_remaining,
        "riderAcceptDeadline": rider_deadline_str,
        "riderSlaSeconds": RIDER_ACCEPT_SLA_SECONDS,
        "riderSlaRemainingSeconds": rider_remaining,
    }


import re

async def find_order(order_id: str) -> Optional[Dict[str, Any]]:
    """Resolve an order by its canonical id or its human order code with prefix tolerance."""
    if not order_id:
        return None
    raw = str(order_id).strip()
    
    # 1. Direct checks
    doc = await database.find_one(ORDERS, {"_id": raw})
    if doc: return doc
    doc = await database.find_one(ORDERS, {"id": raw})
    if doc: return doc
    doc = await database.find_one(ORDERS, {"code": raw})
    if doc: return doc
    doc = await database.find_one(ORDERS, {"code": raw.upper()})
    if doc: return doc

    # 2. Strip ord- or ord_ prefix
    clean = re.sub(r"^ord[-_]", "", raw, flags=re.IGNORECASE)
    if clean and clean != raw:
        doc = await database.find_one(ORDERS, {"_id": clean})
        if doc: return doc
        doc = await database.find_one(ORDERS, {"code": clean})
        if doc: return doc
        doc = await database.find_one(ORDERS, {"code": clean.upper()})
        if doc: return doc
        doc = await database.find_one(ORDERS, {"id": clean})
        if doc: return doc

    # 3. Try adding ord- or ord_ prefix if not present
    if not raw.lower().startswith("ord"):
        doc = await database.find_one(ORDERS, {"_id": f"ord-{raw}"})
        if doc: return doc
        doc = await database.find_one(ORDERS, {"_id": f"ord_{raw}"})
        if doc: return doc

    # 4. Try case-insensitive regex match on code or _id
    try:
        pattern = f"^{re.escape(clean)}$"
        doc = await database.find_one(ORDERS, {"code": {"$regex": pattern, "$options": "i"}})
        if doc: return doc
        doc = await database.find_one(ORDERS, {"_id": {"$regex": pattern, "$options": "i"}})
        if doc: return doc
    except Exception:
        pass

    return None


async def get_order(order_id: str) -> Dict[str, Any]:
    document = await find_order(order_id)
    if document is None:
        raise OrderNotFoundError(f"Order {order_id} does not exist")
    return document


def assert_partner(order: Dict[str, Any], partner_id: str) -> None:
    order_partner = order.get("partner") or {}
    order_p_id = str(order_partner.get("id") or order.get("partner_id") or order.get("partnerId") or order.get("store_id") or "")
    if order_p_id:
        if order_p_id == partner_id or order_p_id.lower() == partner_id.lower():
            return
        st = order_status(order)
        if st in (PLACED, PENDING, "new"):
            return
        raise OrderAuthorizationError("This order is assigned to another partner store")
    st = order_status(order)
    if st in (PLACED, PENDING, "new"):
        return
    raise OrderAuthorizationError("This order has already been accepted by another partner")


def assert_rider(order: Dict[str, Any], rider_id: str) -> None:
    rider = order.get("rider") or {}
    delivery_rider = order.get("deliveryRider") or {}
    transfer_rider = order.get("transferRider") or (order.get("reassignment") or {}).get("transferRider") or {}

    allowed_raw = [
        rider.get("id"),
        delivery_rider.get("id"),
        transfer_rider.get("id"),
        order.get("assignedRiderId"),
        order.get("riderId"),
        order.get("deliveryRiderId"),
        order.get("pickupRiderId"),
        order.get("originalRiderId"),
        (order.get("reassignment") or {}).get("originalRiderId"),
        (order.get("reassignment") or {}).get("assignedTransferRiderId"),
    ]

    target_ids = set()
    for raw_id in allowed_raw:
        if not raw_id:
            continue
        s_id = str(raw_id).strip()
        target_ids.add(s_id)
        target_ids.add(s_id.lower())
        target_ids.add(s_id.upper())
        if s_id.upper().startswith("CAP-"):
            target_ids.add(f"rdr-{s_id[4:].lower()}")
            target_ids.add(f"rdr-{s_id[4:]}")
        elif s_id.lower().startswith("rdr-"):
            target_ids.add(f"CAP-{s_id[4:].upper()}")
            target_ids.add(f"cap-{s_id[4:].lower()}")

    if not target_ids:
        raise OrderAuthorizationError("No rider is assigned to this order yet")

    if str(rider_id) not in target_ids and str(rider_id).lower() not in target_ids:
        raise OrderAuthorizationError("This order is assigned to another rider")


def assert_customer(order: Dict[str, Any], user_id: str) -> None:
    if order.get("userId") != user_id:
        raise OrderAuthorizationError("This order belongs to another customer")


def check_transition(current: str, target: str) -> None:
    current = normalize_status(current)
    if current == target:
        raise DuplicateActionError(f"This order is already {target.replace('_', ' ')}")
    if current in TERMINAL:
        raise InvalidTransitionError(
            f"This order is already {current} and can no longer change status"
        )
    if target not in TRANSITIONS.get(current, ()):  # unknown or illegal target
        raise InvalidTransitionError(f"Cannot move an order from {current} to {target}")


async def record_event(
    order: Dict[str, Any],
    event: str,
    *,
    actor_id: str = "",
    actor_role: str = "system",
    metadata: Optional[Dict[str, Any]] = None,
    at: Optional[str] = None,
) -> Dict[str, Any]:
    """Append one row to the `order_events` audit trail."""
    timestamp = at or now_iso()
    event_id = f"oevt-{order_id_of(order)}-{event}-{uuid.uuid4().hex[:8]}"
    document = {
        "_id": event_id,
        "orderId": order_id_of(order),
        "orderCode": order.get("code", ""),
        "event": event,
        "actorId": actor_id,
        "actorRole": actor_role,
        "timestamp": timestamp,
        "metadata": metadata or {},
    }
    await database.collection(EVENTS).insert_one(document)
    return document


async def events_for(order_id: str) -> List[Dict[str, Any]]:
    order = await find_order(order_id)
    canonical = order_id_of(order) if order else order_id
    rows = await database.find_many(EVENTS, {"orderId": canonical})
    rows.sort(key=lambda row: row.get("timestamp") or "")
    return [{k: v for k, v in row.items() if k != "_id"} for row in rows]


async def transition(
    order_id: str,
    target: str,
    *,
    actor_id: str = "",
    actor_role: str = "system",
    metadata: Optional[Dict[str, Any]] = None,
    changes: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Validate + apply a status change, and write the audit trail.

    Raises OrderNotFoundError / InvalidTransitionError / DuplicateActionError.
    """
    order = await get_order(order_id)
    check_transition(order_status(order), target)

    at = now_iso()
    embedded = list(order.get("events") or [])
    embedded.append(
        {
            "id": f"{order.get('code')}-evt-{len(embedded)}",
            "status": target,
            "label": STATUS_LABEL.get(target, target),
            "at": at,
            "actor": actor_role if actor_role in ("customer", "partner", "rider", "admin") else "system",
        }
    )
    update: Dict[str, Any] = {
        "status": target,
        "updatedAt": at,
        "events": embedded,
        **(changes or {}),
    }
    await database.collection(ORDERS).update_one({"_id": order["_id"]}, {"$set": update})
    updated = await get_order(order["_id"])
    await record_event(
        updated,
        EVENT_NAME.get(target, target.upper()),
        actor_id=actor_id,
        actor_role=actor_role,
        metadata=metadata,
        at=at,
    )
    from app.services.order_notifications import dispatch_order_transition_notifications

    await dispatch_order_transition_notifications(
        updated,
        target,
        actor_id=actor_id,
        actor_role=actor_role,
        metadata=metadata,
        changes=changes,
    )

    # Broadcast real-time order status transition to Customer, Partner, Rider and Admin simultaneously
    try:
        from app.services.socket_service import broadcast_order_event
        canonical_event = f"order.{target}"
        evt_payload = {
            "orderId": order_id_of(updated),
            "id": order_id_of(updated),
            "code": updated.get("code") or order_id_of(updated),
            "status": target,
            "canonicalStatus": target,
            "target": target,
            "actorRole": actor_role,
            "actorId": actor_id,
            "at": at,
        }
        asyncio.create_task(
            broadcast_order_event(
                canonical_event,
                updated,
                extra_data=evt_payload,
            )
        )
        asyncio.create_task(
            broadcast_order_event(
                "order.status_changed",
                updated,
                extra_data=evt_payload,
            )
        )
    except Exception as exc:
        logger.warning(f"Failed to broadcast transition to Socket.IO: {exc}")

    # Referral, Settlement, and Automated Email Invoice Dispatch hooks on order delivery
    if target in (DELIVERED, COMPLETED):
        try:
            from app.db.referral_repositories import referral_repository
            await referral_repository.on_order_delivered(updated)
        except Exception:
            pass
        try:
            from app.services.settlement_engine import settlement_engine
            await settlement_engine.settle_order_on_completion(updated)
        except Exception as err:
            logger.warning(f"Settlement engine hook error: {err}")
        try:
            from app.core.email_service import send_order_completion_email
            asyncio.create_task(send_order_completion_email(updated))
        except Exception as err:
            logger.warning(f"Email invoice automation hook error: {err}")
        try:
            from app.db.loyalty_repositories import loyalty_repository
            asyncio.create_task(loyalty_repository.issue_order_scratch_card(updated))
        except Exception as err:
            logger.warning(f"Loyalty scratch card delivery hook error: {err}")

    # Real Rider Delivery Stats & Earnings increment hook on order delivery / handover
    if target in (DELIVERED, COMPLETED, AT_PARTNER):
        try:
            rider_info = updated.get("rider") or updated.get("deliveryRider") or updated.get("pickupRider") or {}
            target_rider_id = rider_info.get("id") or updated.get("assignedRiderId") or updated.get("riderId")
            if target_rider_id:
                payout = float(updated.get("deliveryFee") or (updated.get("delivery") or {}).get("fee") or 60.0)
                await database.update(
                    "rider_profiles",
                    {"$or": [{"_id": target_rider_id}, {"riderId": target_rider_id}, {"id": target_rider_id}]},
                    {
                        "$inc": {
                            "todayDeliveries": 1,
                            "totalDeliveries": 1,
                            "lifetimeDeliveries": 1,
                            "todayEarnings": payout,
                            "totalEarnings": payout,
                            "walletBalance": payout,
                        },
                        "$set": {
                            "lastDeliveredAt": at,
                        },
                    },
                    upsert=False,
                )
        except Exception as r_err:
            logger.warning(f"Rider profile real stats update warning: {r_err}")

    return updated


# ---------------------------------------------------------------------------
# Projections — every role sees the same order through its own vocabulary.
# ---------------------------------------------------------------------------

#: canonical status -> partner app status
PARTNER_STATUS = {
    PLACED: "new",
    PENDING: "new",
    PARTNER_ACCEPTED: "accepted",
    RIDER_SEARCHING: "accepted",
    RIDER_PICKUP_ASSIGNING: "accepted",
    PICKUP_RIDER_ASSIGNED: "accepted",
    RIDER_ASSIGNED: "accepted",
    RIDER_GOING_TO_PICKUP: "accepted",
    PICKUP_RIDER_ACCEPTED: "accepted",
    RIDER_ACCEPTED: "accepted",
    PICKUP_OTP_PENDING: "accepted",
    PICKUP_OTP_VERIFIED: "picked",
    PICKED_UP: "picked",
    IN_TRANSIT_TO_STORE: "picked",
    AT_STORE: "at_partner",
    AT_PARTNER: "at_partner",
    STORE_DROP_CONFIRMED: "at_partner",
    PROCESSING_STARTED: "processing",
    PROCESSING: "processing",
    SORTING: "processing",
    WASHING: "processing",
    DRYING: "processing",
    DRY_CLEANING: "processing",
    IRONING: "processing",
    QUALITY_CHECK: "processing",
    PROCESSING_HOLD: "processing",
    QUALITY_ISSUE: "processing",
    PACKED: "ready",
    PROCESSING_COMPLETED: "ready",
    READY_FOR_DELIVERY: "ready",
    READY: "ready",
    COMPLETED: "ready",
    DELIVERY_RIDER_ASSIGNING: "ready",
    DELIVERY_RIDER_ASSIGNED: "ready",
    DELIVERY_RIDER_2_ASSIGNED: "ready",
    DELIVERY_RIDER_ACCEPTED: "ready",
    DISPATCH_OTP_PENDING: "ready",
    DISPATCH_OTP_VERIFIED: "out_for_delivery",
    OUT_FOR_DELIVERY: "out_for_delivery",
    DELIVERY_OTP_PENDING: "out_for_delivery",
    DELIVERY_OTP_VERIFIED: "delivered",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    STORE_REJECTED: "cancelled",
    PICKUP_FAILED: "cancelled",
    CUSTOMER_UNAVAILABLE: "cancelled",
    PAYMENT_FAILED: "cancelled",
    REFUND_PENDING: "refund_pending",
    REFUNDED: "refunded",
}

#: canonical status -> rider app status
RIDER_STATUS = {
    PLACED: "assigned",
    PENDING: "assigned",
    PARTNER_ACCEPTED: "assigned",
    RIDER_SEARCHING: "assigned",
    RIDER_PICKUP_ASSIGNING: "assigned",
    PICKUP_RIDER_ASSIGNED: "assigned",
    RIDER_ASSIGNED: "assigned",
    RIDER_GOING_TO_PICKUP: "accepted",
    PICKUP_RIDER_ACCEPTED: "accepted",
    RIDER_ACCEPTED: "accepted",
    PICKUP_OTP_PENDING: "accepted",
    PICKUP_OTP_VERIFIED: "picked",
    PICKED_UP: "picked",
    IN_TRANSIT_TO_STORE: "picked",
    AT_STORE: "at-partner",
    AT_PARTNER: "at-partner",
    STORE_DROP_CONFIRMED: "at-partner",
    PROCESSING_STARTED: "at-partner",
    PROCESSING: "at-partner",
    SORTING: "at-partner",
    WASHING: "at-partner",
    DRYING: "at-partner",
    DRY_CLEANING: "at-partner",
    IRONING: "at-partner",
    QUALITY_CHECK: "at-partner",
    PACKED: "at-partner",
    PROCESSING_COMPLETED: "at-partner",
    READY_FOR_DELIVERY: "at-partner",
    READY: "at-partner",
    COMPLETED: "at-partner",
    DELIVERY_RIDER_ASSIGNING: "assigned",
    DELIVERY_RIDER_ASSIGNED: "assigned",
    DELIVERY_RIDER_2_ASSIGNED: "assigned",
    DELIVERY_RIDER_ACCEPTED: "accepted",
    DISPATCH_OTP_PENDING: "accepted",
    DISPATCH_OTP_VERIFIED: "ready-for-delivery",
    OUT_FOR_DELIVERY: "ready-for-delivery",
    DELIVERY_OTP_PENDING: "ready-for-delivery",
    DELIVERY_OTP_VERIFIED: "delivered",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    STORE_REJECTED: "cancelled",
    PICKUP_FAILED: "cancelled",
    CUSTOMER_UNAVAILABLE: "cancelled",
    PAYMENT_FAILED: "cancelled",
    REFUND_PENDING: "cancelled",
    REFUNDED: "cancelled",
}

_PARTNER_STAGES = [
    ("pending", "Order Placed", (PLACED, PENDING)),
    ("accepted", "Accepted", (PARTNER_ACCEPTED, RIDER_SEARCHING, RIDER_PICKUP_ASSIGNING)),
    ("pickup_pending", "Waiting for Pickup", (PICKUP_RIDER_ASSIGNED, RIDER_ASSIGNED, RIDER_GOING_TO_PICKUP, PICKUP_RIDER_ACCEPTED, RIDER_ACCEPTED, PICKUP_OTP_PENDING)),
    ("picked", "Pickup Completed", (PICKUP_OTP_VERIFIED, PICKED_UP, IN_TRANSIT_TO_STORE, AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED)),
    ("processing", "Processing", (PROCESSING_STARTED, PROCESSING, SORTING, WASHING, DRYING, DRY_CLEANING, IRONING, QUALITY_CHECK)),
    ("ready", "Ready for Delivery", (PACKED, PROCESSING_COMPLETED, READY_FOR_DELIVERY, READY, COMPLETED)),
    ("delivery_assigned", "Delivery Rider Assigned", (DELIVERY_RIDER_ASSIGNING, DELIVERY_RIDER_ASSIGNED, DELIVERY_RIDER_2_ASSIGNED, DELIVERY_RIDER_ACCEPTED)),
    ("dispatch", "Dispatch / Handover", (DISPATCH_OTP_PENDING, DISPATCH_OTP_VERIFIED)),
    ("out_for_delivery", "Out for Delivery", (OUT_FOR_DELIVERY, DELIVERY_OTP_PENDING)),
    ("delivered", "Delivered", (DELIVERY_OTP_VERIFIED, DELIVERED)),
]


_RIDER_STAGES = [
    ("assigned", "Assigned", (PLACED, PENDING, PARTNER_ACCEPTED, RIDER_SEARCHING, RIDER_PICKUP_ASSIGNING, PICKUP_RIDER_ASSIGNED, RIDER_ASSIGNED, DELIVERY_RIDER_ASSIGNING, DELIVERY_RIDER_ASSIGNED, DELIVERY_RIDER_2_ASSIGNED)),
    ("accepted", "Accepted", (RIDER_GOING_TO_PICKUP, PICKUP_RIDER_ACCEPTED, RIDER_ACCEPTED, PICKUP_OTP_PENDING, DELIVERY_RIDER_ACCEPTED, DISPATCH_OTP_PENDING)),
    ("picked", "Picked up from customer", (PICKUP_OTP_VERIFIED, PICKED_UP, IN_TRANSIT_TO_STORE)),
    ("at-partner", "Dropped at store", (AT_STORE, AT_PARTNER, STORE_DROP_CONFIRMED, PROCESSING_STARTED, PROCESSING, SORTING, WASHING, DRYING, DRY_CLEANING, IRONING, QUALITY_CHECK, PACKED, PROCESSING_COMPLETED, READY_FOR_DELIVERY, READY, COMPLETED)),
    ("ready-for-delivery", "Out for delivery", (DISPATCH_OTP_VERIFIED, OUT_FOR_DELIVERY, DELIVERY_OTP_PENDING)),
    ("delivered", "Delivered", (DELIVERY_OTP_VERIFIED, DELIVERED)),
]


STATUS_PROGRESSION_RANK: Dict[str, int] = {
    PLACED: 1,
    PENDING: 1,
    "pending": 1,
    "new": 1,
    "ORDER_CREATED": 1,
    "order_created": 1,
    PARTNER_ACCEPTED: 2,
    "accepted": 2,
    RIDER_SEARCHING: 3,
    PICKUP_RIDER_ASSIGNED: 3,
    RIDER_ASSIGNED: 3,
    PICKUP_RIDER_ACCEPTED: 3,
    RIDER_ACCEPTED: 3,
    PICKUP_OTP_PENDING: 3,
    "pickup_pending": 3,
    PICKED_UP: 4,
    "picked": 4,
    AT_PARTNER: 4,
    "dropped_at_partner": 4,
    PROCESSING: 5,
    "processing": 5,
    IRONING: 5,
    "washing": 5,
    "dry_cleaning": 5,
    READY_FOR_DELIVERY: 6,
    READY: 6,
    "ready": 6,
    COMPLETED: 6,
    DELIVERY_RIDER_ASSIGNED: 7,
    "delivery_assigned": 7,
    DELIVERY_RIDER_ACCEPTED: 7,
    DISPATCH_OTP_PENDING: 8,
    "dispatch": 8,
    OUT_FOR_DELIVERY: 9,
    "out_for_delivery": 9,
    DELIVERY_OTP_PENDING: 9,
    DELIVERED: 10,
    "delivered": 10,
    CANCELLED: 99,
}


def _event_times(order: Dict[str, Any]) -> Dict[str, str]:
    times: Dict[str, str] = {}
    created_at = (
        order.get("createdAt")
        or order.get("placedAt")
        or order.get("created_at")
        or order.get("placedOn")
        or ""
    )
    if created_at:
        times[PLACED] = created_at
        times["placed"] = created_at
        times[PENDING] = created_at
        times["pending"] = created_at
        times["pending_partner_acceptance"] = created_at
        times["ORDER_CREATED"] = created_at
        times["order_created"] = created_at
        times["new"] = created_at

    explicit_mappings = {
        PLACED: order.get("placedAt") or order.get("createdAt") or order.get("placedOn"),
        PARTNER_ACCEPTED: order.get("partnerAcceptedAt") or order.get("acceptedAt"),
        PICKUP_RIDER_ASSIGNED: order.get("pickupRiderAssignedAt") or order.get("riderAssignedAt"),
        PICKUP_RIDER_ACCEPTED: order.get("pickupRiderAcceptedAt") or order.get("riderAcceptedAt"),
        PICKED_UP: order.get("pickedUpAt") or order.get("pickupCompletedAt"),
        AT_PARTNER: order.get("atPartnerAt") or order.get("partnerReceivedAt") or order.get("droppedAtPartnerAt"),
        PROCESSING: order.get("processingStartedAt"),
        READY_FOR_DELIVERY: order.get("readyAt") or order.get("readyForDeliveryAt"),
        READY: order.get("readyAt") or order.get("readyForDeliveryAt"),
        DELIVERY_RIDER_ASSIGNED: order.get("deliveryRiderAssignedAt"),
        OUT_FOR_DELIVERY: order.get("outForDeliveryAt") or order.get("dispatchedAt") or order.get("dispatchAt"),
        DELIVERED: order.get("deliveredAt") or order.get("completedAt"),
        CANCELLED: order.get("cancelledAt"),
    }
    for k, v in explicit_mappings.items():
        if v and k not in times:
            times[k] = str(v)

    for event in order.get("events") or []:
        raw_status = str(event.get("status") or "")
        norm_status = normalize_status(raw_status)
        at = event.get("at") or ""
        if at:
            times.setdefault(norm_status, at)
            times.setdefault(raw_status, at)
            if norm_status == PLACED or raw_status in ("pending_partner_acceptance", "placed", "ORDER_CREATED", "new"):
                times["placed"] = at
                times[PLACED] = at
                times[PENDING] = at
                times["pending_partner_acceptance"] = at

    return times


def _timeline(order: Dict[str, Any], stages) -> List[Dict[str, Any]]:
    times = _event_times(order)
    current = order_status(order)
    current_rank = STATUS_PROGRESSION_RANK.get(current, 1)

    created_at = (
        order.get("createdAt")
        or order.get("placedAt")
        or order.get("created_at")
        or order.get("placedOn")
        or ""
    )

    rows = []
    prev_time = created_at

    for stage_id, label, statuses in stages:
        hit = next((times[s] for s in statuses if s in times), "")

        stage_ranks = [STATUS_PROGRESSION_RANK.get(s, 0) for s in statuses if s in STATUS_PROGRESSION_RANK]
        min_stage_rank = min(stage_ranks) if stage_ranks else 0

        is_done = bool(hit)
        if not is_done and current_rank != 99:
            if stage_id in ("placed", "pending") or min_stage_rank <= 1:
                is_done = True
            elif min_stage_rank > 0 and current_rank >= min_stage_rank:
                is_done = True

        effective_time = hit
        if not effective_time and is_done:
            if stage_id in ("placed", "pending"):
                effective_time = created_at
            else:
                effective_time = prev_time

        if effective_time:
            prev_time = effective_time

        is_current = False
        if current_rank != 99:
            if current in statuses or (is_done and min_stage_rank == current_rank):
                is_current = True

        rows.append({
            "id": stage_id,
            "key": stage_id,
            "label": label,
            "time": effective_time or "",
            "at": effective_time or "",
            "done": is_done,
            "current": is_current,
        })

    if current == CANCELLED:
        cancel_time = (
            times.get(CANCELLED)
            or order.get("cancelledAt")
            or order.get("updatedAt")
            or ""
        )
        reason = (
            order.get("cancellationReason")
            or order.get("cancelledReason")
            or order.get("refundReason")
            or "Order cancelled"
        )
        rows.append({
            "id": "cancelled",
            "label": f"Cancelled — {reason}",
            "time": cancel_time,
            "at": cancel_time,
            "done": True,
            "cancelled": True,
            "reason": reason,
        })
    return rows


def _address_line(address: Dict[str, Any]) -> str:
    parts = [address.get("line", ""), address.get("city", "")]
    return ", ".join([p for p in parts if p]).strip(", ")


def to_partner_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Canonical order -> the partner app's order shape (same orderId)."""
    customer = order.get("customer") or {}
    totals = order.get("totals") or {}
    payment = order.get("payment") or {}
    items = order.get("items") or []
    addr = order.get("address") or {}
    status = order_status(order)
    
    c_name = customer.get("name") or order.get("customer_name") or order.get("customerName") or "Customer"
    c_phone = customer.get("phone") or order.get("customer_phone") or order.get("customerPhone") or (addr.get("phone") if isinstance(addr, dict) else "") or ""
    
    grand_total = totals.get("grandTotal")
    if grand_total is None or grand_total == 0:
        grand_total = order.get("pricing", {}).get("finalTotal") or order.get("total_amount") or order.get("amount") or 0
    
    address_str = _address_line(addr) if isinstance(addr, dict) else str(addr or order.get("pickup_address") or "")
    if not address_str and isinstance(addr, dict):
        address_str = addr.get("line") or addr.get("city") or "Doorstep Address"

    # Partner is shown Dispatch OTP only when order is ready / dispatch pending
    dispatch_otp_val = (order.get("otp") or {}).get("dispatch")
    dispatch_code = (
        dispatch_otp_val.get("code")
        if isinstance(dispatch_otp_val, dict)
        else str(dispatch_otp_val or "")
    )

    rider = order.get("rider") or {}
    rider_obj = None
    if isinstance(rider, dict) and (rider.get("name") or rider.get("id")):
        rider_obj = {
            "id": str(rider.get("id") or ""),
            "name": str(rider.get("name") or "QuickPress Rider"),
            "phone": str(rider.get("phone") or ""),
            "vehicleNumber": str(rider.get("vehicle") or rider.get("vehicleNumber") or rider.get("plate") or "Delivery Bike"),
            "rating": float(rider.get("rating") or 4.9),
            "image": str(rider.get("image") or rider.get("avatar") or ""),
            "status": str(rider.get("status") or "assigned"),
            "lat": rider.get("lat") or (rider.get("location") or {}).get("lat"),
            "lng": rider.get("lng") or (rider.get("location") or {}).get("lng"),
            "lastLocationAt": rider.get("lastLocationAt") or rider.get("updatedAt") or "",
        }

    return {
        "id": order_id_of(order),
        "orderId": order_id_of(order),
        "code": order.get("code") or order.get("order_code") or order_id_of(order),
        "customerName": c_name,
        "customerPhone": mask_phone(c_phone),
        "customerPhoneMasked": mask_phone(c_phone),
        "isNumberMasked": True,
        "status": PARTNER_STATUS.get(status, "new"),
        "canonicalStatus": status,
        "placedAt": order.get("createdAt") or order.get("placedAt") or "",
        "placedAtRaw": order.get("createdAt") or order.get("placedAt") or "",
        "slot": (order.get("pickup") or {}).get("slot", "") if isinstance(order.get("pickup"), dict) else "",
        "address": address_str,
        "pickupAddress": address_str,
        "deliveryAddress": address_str,
        "specialInstructions": str(order.get("notes") or order.get("specialInstructions") or order.get("careInstructions") or ""),
        "itemCount": sum(int(item.get("qty", 1)) for item in items) if items else 1,
        "amount": int(grand_total),
        "charges": {
            "subtotal": int(totals.get("subtotal") or grand_total),
            "pickupFee": int(totals.get("pickupFee") or totals.get("deliveryFee") or 0),
            "taxes": int(totals.get("tax") or totals.get("taxes") or 0),
            "discount": int(totals.get("discount") or 0),
            "total": int(grand_total),
        },
        "paymentMode": payment.get("mode", "cod"),
        "paymentStatus": "paid" if payment.get("paid") else "pending",
        "serviceLabel": order.get("serviceLabel", "Laundry"),
        "services": [str(item.get("service") or item.get("name") or "Laundry") for item in items] if items else ["Laundry"],
        "riderName": rider_obj.get("name", "") if rider_obj else "",
        "assignedRider": rider_obj,
        "rider": rider_obj,
        "dispatchOtp": dispatch_code if status in (READY, READY_FOR_DELIVERY, COMPLETED, DISPATCH_OTP_PENDING) else "",
        "dispatchOtpVerified": bool((order.get("otp") or {}).get("dispatch", {}).get("verified") or order.get("dispatchOtpVerified")),
        "dispatchOtpRequired": status in (READY, READY_FOR_DELIVERY, COMPLETED, DISPATCH_OTP_PENDING) and not bool((order.get("otp") or {}).get("dispatch", {}).get("verified") or order.get("dispatchOtpVerified")),
        "cancelledReason": order.get("cancelledReason"),
        "cancellationReason": order.get("cancellationReason") or order.get("cancelledReason"),
        "partnerAcceptDeadline": order.get("partnerAcceptDeadline"),
        "partnerSlaSeconds": order.get("partnerSlaSeconds", PARTNER_ACCEPT_SLA_SECONDS),
        "riderAcceptDeadline": order.get("riderAcceptDeadline"),
        "riderSlaSeconds": order.get("riderSlaSeconds", RIDER_ACCEPT_SLA_SECONDS),
        "partnerAcceptedAt": order.get("partnerAcceptedAt"),
        "autoCancelled": bool(order.get("autoCancelled")),
        "items": [
            {
                "id": str(item.get("id") or item.get("_id") or ""),
                "name": str(item.get("name") or "Laundry Service"),
                "service": str(item.get("service") or item.get("name") or "Laundry"),
                "qty": int(item.get("qty", 1)),
                "price": int(item.get("price", 0)),
                "unit": str(item.get("unit") or "items"),
            }
            for item in items
        ],
        "timeline": _timeline(order, _PARTNER_STAGES),
    }


def to_rider_delivery(order: Dict[str, Any]) -> Dict[str, Any]:
    """Canonical order -> the rider app's task shape (same orderId)."""
    customer = order.get("customer") or {}
    partner = order.get("partner") or {}
    totals = order.get("totals") or {}
    payment = order.get("payment") or {}
    items = order.get("items") or []
    status = order_status(order)
    address = _address_line(order.get("address") or {})

    otp_obj = order.get("otp") or {}
    pickup_otp = otp_obj.get("pickup") or {}
    dispatch_otp = otp_obj.get("dispatch") or {}
    delivery_otp = otp_obj.get("delivery") or {}

    pickup_verified = pickup_otp.get("verified", False) if isinstance(pickup_otp, dict) else False
    dispatch_verified = dispatch_otp.get("verified", False) if isinstance(dispatch_otp, dict) else False
    delivery_verified = delivery_otp.get("verified", False) if isinstance(delivery_otp, dict) else False

    dist_km = float(
        order.get("distanceKm")
        or (order.get("delivery") or {}).get("distanceKm")
        or (order.get("address") or {}).get("distanceKm")
        or 2.8
    )
    eta_mins = int(
        order.get("etaMinutes")
        or (order.get("delivery") or {}).get("etaMinutes")
        or max(8, round(dist_km * 4.5))
    )

    partner_addr = (
        (order.get("partner") or {}).get("address")
        or order.get("partnerAddress")
        or order.get("storeAddress")
        or "QuickPress Partner Store Hub"
    )

    p_lat = float(
        (order.get("partner") or {}).get("latitude")
        or (order.get("partner") or {}).get("lat")
        or 0.0
    )
    p_lng = float(
        (order.get("partner") or {}).get("longitude")
        or (order.get("partner") or {}).get("lng")
        or 0.0
    )
    c_lat = float(
        (order.get("address") or {}).get("latitude")
        or (order.get("address") or {}).get("lat")
        or 0.0
    )
    c_lng = float(
        (order.get("address") or {}).get("longitude")
        or (order.get("address") or {}).get("lng")
        or 0.0
    )

    order_amount = int(
        totals.get("grandTotal")
        or (order.get("pricing") or {}).get("finalTotal")
        or order.get("total_amount")
        or order.get("amount")
        or 0
    )
    delivery_earning = int(
        (order.get("pricing") or {}).get("deliveryFee")
        or max(35, round(order_amount * 0.12) if order_amount > 0 else 45)
    )
    placed_at = (
        order.get("createdAt")
        or order.get("created_at")
        or order.get("placedAt")
        or now_iso()
    )

    p_code = (
        (pickup_otp.get("code") if isinstance(pickup_otp, dict) else str(pickup_otp or ""))
        or str(order.get("pickupOtp") or "")
    )
    d_code = (
        (delivery_otp.get("code") if isinstance(delivery_otp, dict) else str(delivery_otp or ""))
        or str(order.get("deliveryOtp") or "")
    )
    disp_code = (
        (dispatch_otp.get("code") if isinstance(dispatch_otp, dict) else str(dispatch_otp or ""))
        or str(
            order.get("dispatchOtp")
            or (order.get("reassignment") or {}).get("dispatchOtp")
            or (order.get("reassignment") or {}).get("handoverOtp")
            or ""
        )
    )

    return {
        "id": order_id_of(order),
        "orderId": order_id_of(order),
        "riderId": (order.get("rider") or {}).get("id", "") or str(order.get("assignedRiderId") or order.get("riderId") or ""),
        "code": order.get("code", "") or order.get("orderCode", ""),
        "taskType": "delivery" if status in (READY_FOR_DELIVERY, READY, OUT_FOR_DELIVERY, DELIVERY_OTP_PENDING, DELIVERED) else "pickup",
        "status": RIDER_STATUS.get(status, "assigned"),
        "canonicalStatus": status,
        "custody": order.get("custody", "customer"),
        "customerName": customer.get("name", "") or order.get("customerName", "") or "Customer",
        "customerPhone": mask_phone(customer.get("phone", "") or order.get("customerPhone", "") or ""),
        "customerPhoneMasked": mask_phone(customer.get("phone", "") or order.get("customerPhone", "") or ""),
        "isNumberMasked": True,
        "virtualCallAvailable": True,
        "partnerName": partner.get("name", "") or order.get("partnerName", "") or "QuickPress Laundry Store",
        "partnerPhone": partner.get("phone", "") or order.get("partnerPhone", "") or "",
        "partnerAddress": partner_addr,
        "pickupAddress": address or "Customer Pickup Location",
        "deliveryAddress": address or "Customer Delivery Address",
        "pickupLocation": {"latitude": c_lat, "longitude": c_lng},
        "deliveryLocation": {"latitude": c_lat, "longitude": c_lng},
        "partnerLocation": {"latitude": p_lat, "longitude": p_lng},
        "customerCoords": {"lat": c_lat, "lng": c_lng},
        "partnerCoords": {"lat": p_lat, "lng": p_lng},
        "pickupCoords": {"lat": c_lat, "lng": c_lng},
        "dropCoords": {"lat": p_lat, "lng": p_lng},
        "orderCode": order.get("code") or order.get("orderNumber") or order.get("id"),
        "distanceKm": round(dist_km, 1),
        "etaMinutes": eta_mins,
        "estimatedEarning": delivery_earning,
        "itemCount": sum(int(item.get("qty", 0)) for item in items) or len(items) or 1,
        "items": items,
        "slot": (order.get("pickup") or {}).get("slot", "") or "Standard Slot",
        "placedAt": placed_at,
        "paymentMode": payment.get("mode", "cod"),
        "amount": order_amount,
        "pickupOtp": p_code,
        "dispatchOtp": disp_code,
        "deliveryOtp": d_code,
        "reassignment": order.get("reassignment"),
        "pickupOtpRequired": status in (RIDER_ASSIGNED, RIDER_ACCEPTED, PICKUP_OTP_PENDING) and not pickup_verified,
        "dispatchOtpRequired": status in (READY, COMPLETED, DISPATCH_OTP_PENDING) and not dispatch_verified,
        "deliveryOtpRequired": status in (OUT_FOR_DELIVERY, DELIVERY_OTP_PENDING) and not delivery_verified,
        "pickupOtpVerified": pickup_verified,
        "dispatchOtpVerified": dispatch_verified,
        "deliveryOtpVerified": delivery_verified,
        "processingEstimateMinutes": order.get("processingEstimateMinutes") or 120,
        "estimatedReadyAt": order.get("estimatedReadyAt"),
        "processingStartedAt": order.get("processingStartedAt"),
        "timeline": _timeline(order, _RIDER_STAGES),
    }

