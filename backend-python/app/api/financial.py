"""Financial & Pricing API Endpoints.

Provides live pricing calculations, partner settlement breakdowns, rider trip fares,
daily incentive progress tracking, and Super Admin live financial sliders.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, require_roles
from app.db.client import database
from app.models.user import Role, User
from app.services.financial_engine import (
    DEFAULT_FINANCIAL_CONFIG,
    financial_engine,
)

router = APIRouter(prefix="/financial", tags=["financial"])


@router.post("/pricing/calculate")
async def calculate_checkout_pricing(body: Dict[str, Any]) -> Dict[str, Any]:
    """Computes exact checkout pricing with items, GST, delivery, handling, and discounts."""
    items = body.get("items") or []
    coupon_discount = float(body.get("couponDiscount") or 0.0)
    is_express = bool(body.get("isExpress", False))
    is_member = bool(body.get("isMember", False))
    distance_km = float(body.get("distanceKm") or 3.0)
    city = str(body.get("city") or "Kasganj")

    result = financial_engine.compute_checkout_pricing(
        items=items,
        coupon_discount=coupon_discount,
        is_express=is_express,
        is_member=is_member,
        distance_km=distance_km,
        city=city,
    )

    return {
        "ok": True,
        "itemsSubtotal": result.itemsSubtotal,
        "couponDiscount": result.couponDiscount,
        "membershipDiscount": result.membershipDiscount,
        "totalDiscount": result.totalDiscount,
        "taxableLaundrySubtotal": result.taxableLaundrySubtotal,
        "laundryGst": result.laundryGst,
        "pickupFee": result.pickupFee,
        "deliveryFee": result.deliveryFee,
        "deliveryDiscount": result.deliveryDiscount,
        "effectiveDeliveryFee": result.effectiveDeliveryFee,
        "handlingFee": result.handlingFee,
        "handlingDiscount": result.handlingDiscount,
        "effectiveHandlingFee": result.effectiveHandlingFee,
        "serviceGst": result.serviceGst,
        "grandTotal": result.grandTotal,
        "isFreeDelivery": result.isFreeDelivery,
        "partnerEstimatedEarnings": result.partnerEstimatedEarnings,
        "platformEstimatedCommission": result.platformEstimatedCommission,
        "estimatedRiderPayout": result.estimatedRiderPayout,
        "platformNetMargin": result.platformNetMargin,
        "currency": result.currency,
    }


@router.post("/rider/trip-fare")
async def calculate_rider_trip_fare(body: Dict[str, Any]) -> Dict[str, Any]:
    """Computes distance-based trip fare, weather/night surge, and tips for delivery riders."""
    distance_km = float(body.get("distanceKm") or 2.5)
    is_rain = bool(body.get("isRain", False))
    is_night = bool(body.get("isNight", False))
    waiting_minutes = int(body.get("waitingMinutes") or 0)
    tip_amount = float(body.get("tipAmount") or 0.0)
    city = str(body.get("city") or "Kasganj")

    res = financial_engine.compute_rider_trip_fare(
        distance_km=distance_km,
        is_rain=is_rain,
        is_night=is_night,
        waiting_minutes=waiting_minutes,
        tip_amount=tip_amount,
        city=city,
    )

    return {
        "ok": True,
        "baseFare": res.baseFare,
        "distanceKm": res.distanceKm,
        "distanceFare": res.distanceFare,
        "surgeAmount": res.surgeAmount,
        "surgeReason": res.surgeReason,
        "waitingFare": res.waitingFare,
        "tipAmount": res.tipAmount,
        "totalTripEarnings": res.totalTripEarnings,
        "dailyIncentiveEligible": res.dailyIncentiveEligible,
    }


@router.get("/rider/incentives/{rider_id}")
async def get_rider_incentives(rider_id: str) -> Dict[str, Any]:
    """Returns rider daily incentive milestones, progress, and unlocked cash bonuses."""
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    deliveries_count = await database.count(
        "rider_deliveries",
        {
            "rider_id": rider_id,
            "status": "delivered",
            "created_at": {"$regex": f"^{today_start}"},
        },
    )

    incentives_data = financial_engine.compute_daily_incentives(completed_trips_today=deliveries_count)
    return {
        "ok": True,
        "riderId": rider_id,
        **incentives_data,
    }


@router.get("/admin/config")
async def get_admin_financial_config(user: User = Depends(require_roles(Role.admin))) -> Dict[str, Any]:
    """Returns live platform financial settings, commission rates, and tax parameters."""
    admin_doc = await database.collection("admin_settings").find_one({"_id": "platform"})
    cfg = {**DEFAULT_FINANCIAL_CONFIG, **(admin_doc.get("financialConfig") if admin_doc else {})}
    return {"ok": True, "config": cfg}


@router.put("/admin/config")
async def update_admin_financial_config(body: Dict[str, Any], user: User = Depends(require_roles(Role.admin))) -> Dict[str, Any]:
    """Updates live platform financial settings without requiring code redeployment."""
    current_doc = await database.collection("admin_settings").find_one({"_id": "platform"}) or {"_id": "platform"}
    existing_cfg = current_doc.get("financialConfig") or {}
    updated_cfg = {**existing_cfg, **body}

    await database.collection("admin_settings").update_one(
        {"_id": "platform"},
        {"$set": {"financialConfig": updated_cfg}},
        upsert=True,
    )
    financial_engine.config.update(updated_cfg)

    return {"ok": True, "message": "Platform financial configuration updated successfully", "config": updated_cfg}
