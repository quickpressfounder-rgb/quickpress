"""QuickPress Commission Engine API Endpoints.

Provides unified commission calculation and audit access across:
- Customer: Transparent rupee split & ethical pricing breakdown.
- Partner: Tiered commission (18%/15%/12%), Section 194-O TCS deductions, and wallet credits.
- Captain (Rider): 100% net fare earnings with 0% platform commission guarantee.
- Admin: Real-time platform commission ledger and unit economics analytics.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import optional_user, require_roles
from app.db.client import database
from app.models.user import Role, User
from app.services.commission_engine import commission_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["commission-engine"])


# --------------------------------------------------------------------------
# Customer / Public Transparent Commission Breakdown
# --------------------------------------------------------------------------

@router.get("/api/commission/orders/{order_id}")
async def get_order_commission_breakdown(order_id: str) -> dict:
    """Returns transparent unit-economics & commission breakdown for an order."""
    order = (
        await database.find_one("customer_orders", {"_id": order_id})
        or await database.find_one("customer_orders", {"id": order_id})
    )
    if not order:
        # Check platform_commissions collection
        comm = await database.find_one("platform_commissions", {"orderId": order_id})
        if comm and "fullBreakdown" in comm:
            return comm["fullBreakdown"]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found",
        )

    # Check if already persisted in platform_commissions
    existing_comm = await database.find_one("platform_commissions", {"orderId": order_id})
    if existing_comm and "fullBreakdown" in existing_comm:
        return existing_comm["fullBreakdown"]

    return await commission_engine.compute_order_commission(order)


# --------------------------------------------------------------------------
# Partner Commission Engine Endpoints
# --------------------------------------------------------------------------

@router.get("/api/partner/commission/tier")
async def get_partner_commission_tier(
    partner_id: Optional[str] = Query(None),
    user: Optional[User] = Depends(optional_user),
) -> dict:
    """Returns partner's live commission tier (Standard 18%, Silver 15%, Gold 12%),
    monthly order progress, and estimated monthly commission saved."""
    resolved_id = partner_id
    if not resolved_id and user:
        resolved_id = str(user.id)
    if not resolved_id:
        resolved_id = "PRT-DEMO-001"

    return await commission_engine.get_partner_commission_profile(resolved_id)


@router.get("/api/partner/commission/orders/{order_id}")
async def get_partner_order_commission_slip(
    order_id: str,
    partner_id: Optional[str] = Query(None),
    user: Optional[User] = Depends(optional_user),
) -> dict:
    """Returns itemized commission, 1% TCS deduction, and net store payout for an order."""
    resolved_id = partner_id or (str(user.id) if user else "PRT-DEMO-001")
    
    order = (
        await database.find_one("customer_orders", {"_id": order_id})
        or await database.find_one("customer_orders", {"id": order_id})
    )
    if not order:
        # Return fallback deterministic slip for demo orders
        tier_data = await commission_engine.get_partner_commission_profile(resolved_id)
        gross = 149.0
        comm_rate = tier_data["commissionRate"]
        comm_amt = round(gross * comm_rate, 2)
        tcs = round(gross * 0.01, 2)
        net = round(gross - comm_amt - tcs, 2)
        return {
            "orderId": order_id,
            "orderCode": order_id[:8].upper(),
            "partnerId": resolved_id,
            "tier": tier_data["tier"],
            "commissionRatePct": tier_data["commissionRatePct"],
            "itemsGrossSubtotal": gross,
            "platformCommissionAmount": comm_amt,
            "gstOnCommission18": round(comm_amt * 0.18, 2),
            "tcsDeduction1Pct": tcs,
            "netStoreEarning": net,
            "settlementStatus": "SETTLED",
            "calculatedAt": datetime.now(timezone.utc).isoformat(),
        }

    full_calc = await commission_engine.compute_order_commission(order, partner_id=resolved_id)
    partner_calc = full_calc["partner"]
    partner_calc["orderCode"] = full_calc["orderCode"]
    partner_calc["orderId"] = full_calc["orderId"]
    return partner_calc


@router.get("/api/partner/commission/summary")
async def get_partner_commission_summary(
    partner_id: Optional[str] = Query(None),
    user: Optional[User] = Depends(optional_user),
) -> dict:
    """Returns partner monthly commission audit and itemized settlement history."""
    resolved_id = partner_id or (str(user.id) if user else "PRT-DEMO-001")
    profile_data = await commission_engine.get_partner_commission_profile(resolved_id)
    
    # Fetch all commissions for this partner
    commissions = await database.find_many("platform_commissions", {"partnerId": resolved_id})
    if not commissions:
        # Fallback to general settlements
        settlements = await database.find_many("settlements", {"accountId": resolved_id})
        items = [
            {
                "orderId": s.get("orderId"),
                "orderCode": s.get("orderCode"),
                "grossAmount": s.get("grossAmount"),
                "commission": s.get("commission"),
                "taxDeducted": s.get("taxDeducted"),
                "netAmount": s.get("netAmount"),
                "status": s.get("status"),
                "date": s.get("settledAt") or s.get("createdAt"),
            }
            for s in settlements
        ]
    else:
        items = [
            {
                "orderId": c.get("orderId"),
                "orderCode": c.get("orderCode"),
                "grossAmount": c.get("itemsSubtotal"),
                "commission": c.get("partnerCommissionAmount"),
                "taxDeducted": c.get("partnerTcsDeduction"),
                "netAmount": c.get("partnerNetEarning"),
                "status": "SETTLED",
                "date": c.get("settledAt") or c.get("createdAt"),
            }
            for c in commissions
        ]

    return {
        "profile": profile_data,
        "recentSettlements": items[:15],
    }


# --------------------------------------------------------------------------
# Captain (Rider) Commission Engine Endpoints (0% Commission Guarantee)
# --------------------------------------------------------------------------

@router.get("/api/rider/commission/guarantee")
async def get_rider_commission_guarantee(user: User = Depends(require_roles(Role.rider))) -> dict:
    """Returns QuickPress Captain 0% Platform Commission guarantee details."""
    return {
        "policy": "QuickPress Captain 0% Platform Commission Guarantee",
        "guaranteeActive": True,
        "commissionRate": 0.0,
        "commissionRatePct": 0.0,
        "headline": "Zero Commission. 100% Earnings to Captains.",
        "description": "QuickPress charges 0% platform commission on Captain delivery fares. Every single rupee of base fare, distance pay, surge, and customer tips goes directly to your wallet.",
        "benefits": [
            "0% Commission on all pickup & delivery fares",
            "100% of customer tips credited directly",
            "Instant wallet credit upon customer OTP verification",
            "Daily incentive bonuses on completing 5, 10, or 15 trips",
            "Insurance & accidental coverage included at no deduction",
        ],
        "effectiveDate": "2026-01-01",
    }


@router.get("/api/rider/commission/orders/{order_id}")
async def get_rider_order_commission_slip(
    order_id: str,
    rider_id: Optional[str] = Query(None),
    user: Optional[User] = Depends(optional_user),
) -> dict:
    """Returns Captain's zero-commission transparent trip slip for an order."""
    resolved_id = rider_id or (str(user.id) if user else "rider-1")
    return await commission_engine.get_rider_commission_slip(order_id, resolved_id)


# --------------------------------------------------------------------------
# Admin & Recalculate Endpoints
# --------------------------------------------------------------------------

@router.get("/api/admin/commission/analytics")
async def get_admin_commission_analytics(user: User = Depends(require_roles(Role.admin))) -> dict:
    """Master platform commission ledger & KPIs from Supabase PostgreSQL."""
    return await commission_engine.get_platform_commission_analytics()


@router.post("/api/commission/recalculate/{order_id}")
async def recalculate_order_commission(order_id: str) -> dict:
    """Recalculates commission and persists updated record in Supabase."""
    result = await commission_engine.record_order_commission(order_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found for commission calculation",
        )
    return {
        "ok": True,
        "orderId": order_id,
        "message": "Commission recalculated and saved to Supabase successfully",
        "data": result,
    }
