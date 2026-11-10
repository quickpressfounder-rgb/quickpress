"""Admin Delivery Kits Management API.

Allows operations managers to monitor Captain Delivery Kit orders, track Razorpay
payments (Full vs Part Payment), update fulfillment state (Pending Dispatch ->
Dispatched -> Delivered), and log courier tracking numbers.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db.client import database
from app.core.deps import require_roles
from app.models.user import User, Role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/delivery-kits", tags=["admin-delivery-kits"])

DELIVERY_KITS_COLLECTION = "rider_delivery_kits"
RIDERS_COLLECTION = "rider_profiles"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DispatchKitPayload(BaseModel):
    courierName: str = Field(..., description="Name of courier (e.g. DTDC, Blue Dart) or Hub Direct")
    trackingNumber: str = Field(..., description="Tracking number or delivery challan ID")
    notes: Optional[str] = Field("", description="Optional dispatch remarks")


class MarkDeliveredPayload(BaseModel):
    deliveredBy: Optional[str] = Field("Hub Dispatcher", description="Staff member who confirmed handover")
    notes: Optional[str] = Field("", description="Optional remarks upon delivery")


@router.get("/stats")
async def get_delivery_kits_stats(
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> Dict[str, Any]:
    """Aggregate statistics for delivery kit inventory and revenue."""
    all_kits = await database.find_many(DELIVERY_KITS_COLLECTION, {})

    total_orders = len(all_kits)
    pending_dispatch = sum(1 for k in all_kits if (k.get("fulfillment") or {}).get("status") in ("PENDING_DISPATCH", None, ""))
    dispatched = sum(1 for k in all_kits if (k.get("fulfillment") or {}).get("status") == "DISPATCHED")
    delivered = sum(1 for k in all_kits if (k.get("fulfillment") or {}).get("status") == "DELIVERED")

    total_revenue_collected = sum(float((k.get("pricing") or {}).get("amountPaid") or 0.0) for k in all_kits)
    outstanding_installments = sum(float((k.get("pricing") or {}).get("remainingBalance") or 0.0) for k in all_kits)

    return {
        "ok": True,
        "totalOrders": total_orders,
        "pendingDispatch": pending_dispatch,
        "dispatched": dispatched,
        "delivered": delivered,
        "totalRevenueCollected": round(total_revenue_collected, 2),
        "outstandingInstallments": round(outstanding_installments, 2),
        "currency": "INR",
    }


@router.get("")
async def list_delivery_kits(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by fulfillment status or payment status"),
    search: Optional[str] = Query(None, description="Search rider name, phone, or tracking number"),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> Dict[str, Any]:
    """List delivery kit orders with search and status filtering."""
    query: Dict[str, Any] = {}

    if status_filter and status_filter.upper() != "ALL":
        clean_status = status_filter.upper()
        if clean_status in ("FULL_PAYMENT", "PART_PAYMENT"):
            query["pricing.paymentType"] = clean_status
        elif clean_status in ("PAID", "PARTIALLY_PAID"):
            query["payment.status"] = clean_status
        else:
            query["fulfillment.status"] = clean_status

    all_kits = await database.find_many(DELIVERY_KITS_COLLECTION, query)

    # Search filter in-memory if requested
    if search and search.strip():
        term = search.strip().lower()
        all_kits = [
            k for k in all_kits
            if term in str(k.get("riderName", "")).lower()
            or term in str(k.get("riderPhone", "")).lower()
            or term in str(k.get("_id", "")).lower()
            or term in str((k.get("fulfillment") or {}).get("trackingNumber", "")).lower()
        ]

    # Sort newest first
    all_kits.sort(key=lambda k: str(k.get("createdAt", "")), reverse=True)
    total_count = len(all_kits)
    items = all_kits[:limit]

    return {
        "ok": True,
        "items": items,
        "total": total_count,
    }


@router.patch("/{kit_order_id}/dispatch")
async def dispatch_delivery_kit(
    kit_order_id: str,
    payload: DispatchKitPayload,
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> Dict[str, Any]:
    """Marks a delivery kit as dispatched with courier partner and tracking details."""
    kit = await database.find_one(DELIVERY_KITS_COLLECTION, {"$or": [{"_id": kit_order_id}, {"id": kit_order_id}]})
    if not kit:
        raise HTTPException(status_code=404, detail="Delivery kit order not found")

    now_str = _now_iso()
    fulfillment_updates = {
        "fulfillment.status": "DISPATCHED",
        "fulfillment.courierName": payload.courierName.strip(),
        "fulfillment.trackingNumber": payload.trackingNumber.strip(),
        "fulfillment.dispatchedAt": now_str,
        "fulfillment.dispatchedBy": user.display_name or user.email,
        "fulfillment.notes": payload.notes or "",
        "updatedAt": now_str,
    }

    await database.collection(DELIVERY_KITS_COLLECTION).update_one(
        {"_id": kit["_id"]},
        {"$set": fulfillment_updates},
    )

    # Update rider profile
    rider_phone = kit.get("riderPhone")
    if rider_phone:
        await database.collection(RIDERS_COLLECTION).update_one(
            {"$or": [{"phone": rider_phone}, {"phoneNumber": rider_phone}, {"_id": kit.get("riderId")}]},
            {"$set": {"kitFulfillmentStatus": "DISPATCHED", "kitTrackingNumber": payload.trackingNumber.strip()}},
        )

    updated_kit = await database.find_one(DELIVERY_KITS_COLLECTION, {"_id": kit["_id"]})
    return {"ok": True, "message": "Delivery kit marked as dispatched", "kitOrder": updated_kit}


@router.patch("/{kit_order_id}/deliver")
async def mark_kit_delivered(
    kit_order_id: str,
    payload: MarkDeliveredPayload,
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> Dict[str, Any]:
    """Marks a delivery kit as delivered / physically handed over to the captain."""
    kit = await database.find_one(DELIVERY_KITS_COLLECTION, {"$or": [{"_id": kit_order_id}, {"id": kit_order_id}]})
    if not kit:
        raise HTTPException(status_code=404, detail="Delivery kit order not found")

    now_str = _now_iso()
    fulfillment_updates = {
        "fulfillment.status": "DELIVERED",
        "fulfillment.deliveredAt": now_str,
        "fulfillment.deliveredBy": payload.deliveredBy or user.display_name or user.email,
        "fulfillment.notes": payload.notes or kit.get("fulfillment", {}).get("notes", ""),
        "updatedAt": now_str,
    }

    await database.collection(DELIVERY_KITS_COLLECTION).update_one(
        {"_id": kit["_id"]},
        {"$set": fulfillment_updates},
    )

    rider_phone = kit.get("riderPhone")
    if rider_phone:
        await database.collection(RIDERS_COLLECTION).update_one(
            {"$or": [{"phone": rider_phone}, {"phoneNumber": rider_phone}, {"_id": kit.get("riderId")}]},
            {"$set": {"kitFulfillmentStatus": "DELIVERED", "kitDeliveredAt": now_str}},
        )

    updated_kit = await database.find_one(DELIVERY_KITS_COLLECTION, {"_id": kit["_id"]})
    return {"ok": True, "message": "Delivery kit marked as delivered to Captain", "kitOrder": updated_kit}
