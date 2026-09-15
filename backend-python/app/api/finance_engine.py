"""QuickPress Unified Financial & Order Engine API Router.

Mounted under prefix `/finance-engine` (e.g. `/api/finance-engine`).
Provides full admin and cross-app control over:
1. Active Financial Rules (Pricing, GST, Commission, Delivery, Refunds, Incentives, Penalties, Settlements).
2. Customer Dynamic Pricing Calculation with GST & Delivery Subsidies.
3. Single Order Financials & Immutable Financial Ledger Inspection.
4. Stage-Based Cancellation & Refund Management.
5. Partner & Rider Penalties and Incentives.
6. Weekly Settlement Batches & Payout Orchestration.
7. Executive Financial Summary & P&L Reporting.
8. Immutable Audit Logs with Effective Date Governance.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.db.client import database
from app.models.user import User
from app.services.unified_finance_service import unified_finance_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance-engine", tags=["finance-engine"])


# --------------------------------------------------------------------------
# 1. RULES & CONFIGURATION (ADMIN CONTROL PANEL)
# --------------------------------------------------------------------------

@router.get("/rules", summary="Get Active Financial Rules")
async def get_active_rules() -> Dict[str, Any]:
    """Returns live active financial rules across all 8 sub-engines."""
    rules = await unified_finance_service.get_active_rules()
    return {"ok": True, "rules": rules}


@router.put("/rules", summary="Update Financial Rules (Admin)")
async def update_financial_rules(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Updates financial rules in Supabase and records an immutable audit log."""
    new_rules = body.get("rules") or body
    reason = str(body.get("reason") or "Admin Configuration Update")
    effective_from = body.get("effectiveFrom")
    effective_until = body.get("effectiveUntil")

    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("authorId") or "super_admin"

    res = await unified_finance_service.update_rules(
        new_rules=new_rules,
        admin_id=str(admin_id),
        reason=reason,
        effective_from=effective_from,
        effective_until=effective_until,
    )
    return res


# --------------------------------------------------------------------------
# 2. PRICING & GST CALCULATION (CUSTOMER & CHECKOUT)
# --------------------------------------------------------------------------

@router.post("/price/calculate", summary="Compute Unified Checkout Price")
async def calculate_checkout_price(body: Dict[str, Any]) -> Dict[str, Any]:
    """Computes exact checkout price, GST components, delivery fee, and subsidies."""
    items = body.get("items") or []
    distance_km = float(body.get("distanceKm") or 2.0)
    coupon_code = body.get("couponCode")
    coupon_discount = float(body.get("couponDiscount") or 0.0)
    is_express = bool(body.get("isExpress", False))
    is_member = bool(body.get("isMember", False))
    customer_state = str(body.get("customerState") or "Uttar Pradesh")
    partner_state = str(body.get("partnerState") or "Uttar Pradesh")

    res = await unified_finance_service.calculate_checkout_price(
        items=items,
        distance_km=distance_km,
        coupon_code=coupon_code,
        coupon_discount=coupon_discount,
        is_express=is_express,
        is_member=is_member,
        customer_state=customer_state,
        partner_state=partner_state,
    )
    return {"ok": True, **res}


@router.post("/simulate", summary="Simulate Order Unit Economics & Reconciliation")
async def simulate_order_economics(body: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates end-to-end unit economics and validates mathematical reconciliation."""
    items = body.get("items") or []
    distance_km = float(body.get("distanceKm") or 2.0)
    coupon_discount = float(body.get("couponDiscount") or 0.0)
    partner_monthly_orders = int(body.get("partnerMonthlyOrders") or 100)
    is_express = bool(body.get("isExpress", False))
    customer_state = str(body.get("customerState") or "Uttar Pradesh")
    partner_state = str(body.get("partnerState") or "Uttar Pradesh")

    res = await unified_finance_service.simulate_order_lifecycle(
        items=items,
        distance_km=distance_km,
        coupon_discount=coupon_discount,
        partner_monthly_orders=partner_monthly_orders,
        is_express=is_express,
        customer_state=customer_state,
        partner_state=partner_state,
    )
    return res


# --------------------------------------------------------------------------
# 3. SINGLE ORDER FINANCIALS & IMMUTABLE FINANCIAL LEDGER
# --------------------------------------------------------------------------

@router.get("/orders/{order_id}/financials", summary="Get Single Order Financial Object & Ledger")
async def get_order_financials(order_id: str) -> Dict[str, Any]:
    """Fetches the complete single financial object and full immutable ledger stream for an order."""
    data = await unified_finance_service.get_order_financials_with_ledger(order_id)
    if not data.get("financials"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial object not found for order {order_id}",
        )
    return {"ok": True, **data}


@router.post("/orders/{order_id}/initialize", summary="Initialize Order Financial Object")
async def initialize_order_financials(order_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Initializes `order_financials` and writes `ORDER_CREATED` event to `financial_ledger`."""
    customer_id = str(body.get("customerId") or "guest")
    partner_id = body.get("partnerId")
    rider_id = body.get("riderId")
    pricing_data = body.get("pricingData") or body
    monthly_orders = int(body.get("monthlyPartnerOrders") or 0)

    fin = await unified_finance_service.initialize_order_financials(
        order_id=order_id,
        customer_id=customer_id,
        pricing_data=pricing_data,
        partner_id=partner_id,
        rider_id=rider_id,
        monthly_partner_orders=monthly_orders,
    )
    return {"ok": True, "financials": fin}


@router.post("/orders/{order_id}/payment", summary="Record Payment Received in Ledger")
async def record_payment_received(order_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Records payment received, updates financial object, and writes to immutable ledger."""
    payment_id = str(body.get("paymentId") or body.get("gatewayTransactionId") or "TXN_MANUAL")
    gateway = str(body.get("gateway") or "RAZORPAY")
    method = str(body.get("method") or "UPI")
    amount = float(body["amount"]) if "amount" in body else None

    res = await unified_finance_service.record_payment_received(
        order_id=order_id,
        payment_id=payment_id,
        gateway=gateway,
        method=method,
        amount_paid=amount,
    )
    return res


# --------------------------------------------------------------------------
# 4. CANCELLATION & REFUND ENGINE
# --------------------------------------------------------------------------

@router.post("/cancellation/calculate", summary="Calculate Cancellation Fee & Refund")
@router.post("/orders/{order_id}/cancellation-calc", summary="Calculate Cancellation Fee & Refund (Alias)")
async def calculate_cancellation(
    body: Optional[Dict[str, Any]] = None,
    order_id: Optional[str] = None,
    stage: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """Calculates stage-aware cancellation charges and refundable amount."""
    b = body or {}
    oid = order_id or str(b.get("orderId") or "preview_order")
    stg = stage or str(b.get("stage") or "ORDER_PLACED")

    res = await unified_finance_service.calculate_cancellation_refund(oid, stg)
    return {"ok": True, **res}


@router.post("/refunds/create", summary="Process Refund & Record in Ledger")
async def create_refund(
    body: Dict[str, Any],
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Processes a full or partial refund with ledger recording and ceiling checks."""
    order_id = str(body.get("orderId") or "")
    amount = float(body.get("amount") or 0.0)
    reason = str(body.get("reason") or "Customer Cancellation")
    refund_type = str(body.get("refundType") or "ORIGINAL_PAYMENT_REFUND")
    admin_id = getattr(user, "id", None) or "admin"

    if not order_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Valid orderId and positive amount required")

    try:
        res = await unified_finance_service.process_refund(
            order_id=order_id,
            refund_amount=amount,
            reason=reason,
            refund_type=refund_type,
            admin_id=str(admin_id),
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------------------------
# 5. PENALTIES & INCENTIVES
# --------------------------------------------------------------------------

@router.post("/penalties/apply", summary="Apply Penalty on Partner or Rider")
async def apply_penalty(
    body: Dict[str, Any],
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Applies a penalty and appends to `financial_ledger` if associated with an order."""
    partner_id = body.get("partnerId")
    rider_id = body.get("riderId")
    order_id = body.get("orderId")
    penalty_type = str(body.get("penaltyType") or "customerComplaint")
    custom_amount = float(body["amount"]) if "amount" in body else None
    reason = str(body.get("reason") or "")
    admin_id = getattr(user, "id", None) or "admin"

    res = await unified_finance_service.apply_penalty(
        partner_id=partner_id,
        rider_id=rider_id,
        order_id=order_id,
        penalty_type=penalty_type,
        custom_amount=custom_amount,
        reason=reason,
        admin_id=str(admin_id),
    )
    return res


# --------------------------------------------------------------------------
# 6. SETTLEMENT ENGINE & PAYOUT BATCHES
# --------------------------------------------------------------------------

@router.get("/settlements", summary="List Settlement Batches")
async def list_settlements() -> Dict[str, Any]:
    """Lists generated settlement batches from Supabase."""
    batches = await database.find_many("financial_settlement_batches", {})
    batches.sort(key=lambda x: str(x.get("generatedAt", "")), reverse=True)
    return {"ok": True, "batches": batches, "count": len(batches)}


@router.post("/settlements/generate", summary="Generate Weekly Settlement Batch")
async def generate_settlements(
    body: Optional[Dict[str, Any]] = None,
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Generates dual settlement batches for Laundry Partners and Delivery Captains."""
    b = body or {}
    start_str = b.get("startDate")
    end_str = b.get("endDate")

    batch = await unified_finance_service.generate_weekly_settlements(start_str, end_str)
    return {"ok": True, "batch": batch}


@router.post("/settlements/{batch_id}/approve", summary="Approve Settlement Batch")
async def approve_settlement_batch(
    batch_id: str,
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Approves a settlement batch for disbursement."""
    admin_id = getattr(user, "id", None) or "super_admin"
    now_iso = from_now_iso = str(unified_finance_service) # import safe
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()

    await database.update_one(
        "financial_settlement_batches",
        {"_id": batch_id},
        {
            "$set": {
                "status": "APPROVED",
                "approvedBy": str(admin_id),
                "approvedAt": now_iso,
            }
        },
    )
    return {"ok": True, "batchId": batch_id, "status": "APPROVED"}


@router.post("/settlements/{batch_id}/payout", summary="Mark Settlement Batch as Paid")
async def payout_settlement_batch(
    batch_id: str,
    body: Optional[Dict[str, Any]] = None,
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Marks an approved settlement batch as PAID with payout reference."""
    b = body or {}
    payout_ref = str(b.get("payoutReference") or f"BANK-PAYOUT-{batch_id}")
    admin_id = getattr(user, "id", None) or "super_admin"
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()

    await database.update_one(
        "financial_settlement_batches",
        {"_id": batch_id},
        {
            "$set": {
                "status": "PAID",
                "payoutReference": payout_ref,
                "paidBy": str(admin_id),
                "paidAt": now_iso,
            }
        },
    )
    return {"ok": True, "batchId": batch_id, "status": "PAID", "payoutReference": payout_ref}


# --------------------------------------------------------------------------
# 7. EXECUTIVE FINANCIAL REPORTING & AUDIT LOGS
# --------------------------------------------------------------------------

@router.get("/reports/summary", summary="Executive Financial Summary & P&L")
async def get_financial_summary() -> Dict[str, Any]:
    """Returns live GMV, collections, commission, GST, subsidies, payouts, and net revenue."""
    metrics = await unified_finance_service.get_financial_summary()
    return {"ok": True, "metrics": metrics}


@router.get("/audit-logs", summary="Financial Rules Audit Trail")
async def get_audit_logs(limit: int = Query(default=50, le=200)) -> Dict[str, Any]:
    """Returns chronological audit logs of all financial rule modifications."""
    logs = await database.find_many("financial_audit_logs", {})
    logs.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return {"ok": True, "logs": logs[:limit], "total": len(logs)}
