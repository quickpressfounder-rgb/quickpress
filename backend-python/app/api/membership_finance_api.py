"""QuickPress Membership Finance & Plan Control API Router.

Prefix: `/api/membership-finance`
Provides endpoints for:
1. Subscription Financial KPIs (MRR, ARR, Churn, Active Subscribers).
2. Dynamic Plan Management (100% No-code price & perk configuration).
3. Active Members Directory with Days Remaining & LTV.
4. Ind AS 115 Deferred Revenue recognition.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.models.user import User
from app.services.membership_finance_service import membership_finance_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/membership-finance", tags=["membership-finance"])


@router.get("/metrics", summary="Get Membership Financial KPIs (MRR, ARR, Churn)")
async def get_membership_metrics() -> Dict[str, Any]:
    """Returns subscription financial KPIs."""
    metrics = await membership_finance_service.get_membership_financial_metrics()
    return {"ok": True, "metrics": metrics}


@router.get("/plans", summary="List All Membership Plans (Dynamic)")
async def list_plans() -> Dict[str, Any]:
    """Returns all membership plans with live pricing."""
    plans = await membership_finance_service.list_plans()
    return {"ok": True, "plans": plans}


@router.post("/plans", summary="Create New Membership Plan (Admin)")
async def create_plan(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Creates a new dynamic membership plan in database."""
    name = str(body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Plan name is required.")

    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"

    doc = await membership_finance_service.create_plan(
        name=name,
        monthly_price=float(body.get("monthlyPrice") or body.get("monthly_price") or 0.0),
        yearly_price=float(body.get("yearlyPrice") or body.get("yearly_price") or 0.0),
        validity_days=int(body.get("validityDays") or 30),
        free_delivery_min_order=float(body.get("freeDeliveryMinOrder") or 299.0),
        discount_percent=float(body.get("discountPercent") or 15.0),
        max_discount_per_order=float(body.get("maxDiscountPerOrder") or 150.0),
        tagline=str(body.get("tagline") or ""),
        created_by=str(admin_id),
    )
    return {"ok": True, "message": "Membership plan created successfully.", "plan": doc}


@router.put("/plans/{plan_id}", summary="Update Membership Plan Pricing & Perks (Admin)")
async def update_plan(
    plan_id: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Updates plan price, discount %, or free delivery threshold dynamically."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"

    res = await membership_finance_service.update_plan_pricing(
        plan_id=plan_id,
        monthly_price=float(body["monthlyPrice"]) if "monthlyPrice" in body else None,
        yearly_price=float(body["yearlyPrice"]) if "yearlyPrice" in body else None,
        free_delivery_min_order=float(body["freeDeliveryMinOrder"]) if "freeDeliveryMinOrder" in body else None,
        discount_percent=float(body["discountPercent"]) if "discountPercent" in body else None,
        max_discount_per_order=float(body["maxDiscountPerOrder"]) if "maxDiscountPerOrder" in body else None,
        updated_by=str(admin_id),
    )
    return {"ok": True, "message": "Plan updated.", **res}


@router.post("/plans/{plan_id}/toggle", summary="Toggle Plan Active / Archived")
async def toggle_plan(plan_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Activates or archives a membership plan."""
    is_active = bool(body.get("isActive", True))
    res = await membership_finance_service.toggle_plan_status(plan_id, is_active)
    return {"ok": True, **res}


@router.get("/members", summary="List Active Members Directory")
async def list_active_members(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    plan_id: Optional[str] = Query(None, description="Filter by plan ID"),
    search: Optional[str] = Query(None, description="Search customer name or phone"),
) -> Dict[str, Any]:
    """Returns active members directory with days remaining and LTV."""
    skip = (page - 1) * page_size
    members, total = await membership_finance_service.list_active_members(
        skip=skip,
        limit=page_size,
        plan_id=plan_id,
        search=search,
    )
    return {
        "ok": True,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        "members": members,
    }


@router.post("/subscribe", summary="Record Subscription Purchase with Deferred Revenue")
async def record_subscription(body: Dict[str, Any]) -> Dict[str, Any]:
    """Records membership purchase and posts Ind AS 115 Deferred Revenue entry in General Ledger."""
    user_id = str(body.get("userId") or "").strip()
    plan_id = str(body.get("planId") or "").strip()
    amount = float(body.get("amount") or 0.0)
    payment_ref = str(body.get("paymentReference") or f"PAY-MEM-{user_id[:6]}")
    billing_cycle = str(body.get("billingCycle") or "monthly")

    if not user_id or not plan_id or amount <= 0:
        raise HTTPException(status_code=400, detail="userId, planId, and positive amount are required.")

    res = await membership_finance_service.record_subscription_purchase(
        user_id=user_id,
        plan_id=plan_id,
        amount_paid=amount,
        payment_reference=payment_ref,
        billing_cycle=billing_cycle,
    )
    return {"ok": True, "message": "Subscription activated and deferred revenue booked.", **res}
