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
    customer_city = body.get("customerCity")
    customer_area = body.get("customerArea")

    res = await unified_finance_service.calculate_checkout_price(
        items=items,
        distance_km=distance_km,
        coupon_code=coupon_code,
        coupon_discount=coupon_discount,
        is_express=is_express,
        is_member=is_member,
        customer_state=customer_state,
        partner_state=partner_state,
        customer_city=customer_city,
        customer_area=customer_area,
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


# --------------------------------------------------------------------------
# 8. BUSINESS EXPENSE TRACKER & REAL NET PROFIT REPORTING
# --------------------------------------------------------------------------

@router.get("/expenses", summary="Get Operating Business Expenses")
async def get_expenses(
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=500),
) -> Dict[str, Any]:
    """Returns business expenses with category breakdown and total operational expense."""
    return await unified_finance_service.get_expenses(limit=limit, category=category)


@router.post("/expenses", summary="Log New Operating Expense")
async def add_expense(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Creates a new business operating expense record."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("addedBy") or "super_admin"
    return await unified_finance_service.add_expense(expense_data=body, admin_id=str(admin_id))


@router.delete("/expenses/{expense_id}", summary="Delete Operating Expense")
@router.post("/expenses/{expense_id}/delete", summary="Delete Operating Expense (POST fallback)")
async def delete_expense(expense_id: str) -> Dict[str, Any]:
    """Deletes an operating expense."""
    return await unified_finance_service.delete_expense(expense_id=expense_id)


@router.get("/net-profit-report", summary="Calculate Real In-Hand Net Profit & P&L Waterfall")
async def get_net_profit_report() -> Dict[str, Any]:
    """Calculates true net profit after deducting Partner payout, Rider payout, Taxes, Gateway fees, and Opex."""
    return await unified_finance_service.get_net_profit_report()


# --------------------------------------------------------------------------
# 9. PHASE 1: CUSTOMER FINANCE 360
# --------------------------------------------------------------------------

@router.get("/customer-360/{identifier}", summary="Customer Finance 360 Profile")
async def get_customer_finance_360(identifier: str) -> Dict[str, Any]:
    """Fetches complete customer lifetime spending, orders, payments, refunds, wallet, and financial timeline."""
    return await unified_finance_service.get_customer_finance_360(identifier=identifier)


# --------------------------------------------------------------------------
# 10. PHASE 1: ORDER FINANCIAL 360 & TIMELINE
# --------------------------------------------------------------------------

@router.get("/orders/{order_id}/financial-360", summary="Order Financial 360 View")
async def get_order_financial_360(order_id: str) -> Dict[str, Any]:
    """Transparent financial unit economics and complete chronological lifecycle timeline for an order."""
    return await unified_finance_service.get_order_financial_360(order_id=order_id)


# --------------------------------------------------------------------------
# 11. PHASE 2: ADVANCED ACCOUNTING STATEMENTS (P&L, BALANCE SHEET, CASH FLOW)
# --------------------------------------------------------------------------

@router.get("/accounting/statements", summary="GAAP-Standard P&L, Balance Sheet, Cash Flow & Aging")
async def get_accounting_statements(period: Optional[str] = Query(default=None)) -> Dict[str, Any]:
    """Generates authoritative GAAP financial statements and AR/AP aging buckets from the live ledger."""
    return await unified_finance_service.get_accounting_statements(period=period)


# --------------------------------------------------------------------------
# 12. PHASE 2: PROFITABILITY ANALYTICS (CITY, SERVICE, PARTNER, RIDER)
# --------------------------------------------------------------------------

@router.get("/profitability", summary="Multi-Dimensional Profitability Analytics")
async def get_profitability_analytics(period: Optional[str] = Query(default=None)) -> Dict[str, Any]:
    """Calculates real profitability heatmaps by City, Service category, Partner rank, and Rider costs."""
    return await unified_finance_service.get_profitability_analytics(period=period)


# --------------------------------------------------------------------------
# 13. PHASE 2 & 4: GST & TAX COMPLIANCE CENTER
# --------------------------------------------------------------------------

@router.get("/tax-center", summary="Tax Center & Statutory Compliance Calendar")
async def get_tax_compliance_center() -> Dict[str, Any]:
    """Returns statutory tax breakdown (CGST, SGST, IGST, Section 194-O TCS, Section 194-C TDS) and filing calendar."""
    return await unified_finance_service.get_tax_compliance_center()


# --------------------------------------------------------------------------
# 14. PHASE 4: TREASURY CENTER, BANK ACCOUNTS & CASH POSITIONING
# --------------------------------------------------------------------------

@router.get("/treasury", summary="Corporate Treasury & Liquidity Position")
async def get_treasury_center() -> Dict[str, Any]:
    """Returns corporate bank account balances, gateway in-transit escrow, COD float, and cash runway projections."""
    return await unified_finance_service.get_treasury_center()


@router.post("/treasury/bank-accounts", summary="Add Corporate Bank Account")
async def add_bank_account(body: Dict[str, Any]) -> Dict[str, Any]:
    """Registers a corporate operating or escrow bank account."""
    return await unified_finance_service.add_bank_account(body)


# --------------------------------------------------------------------------
# 15. PHASE 1 & 3: MAKER-CHECKER APPROVALS CENTER & SEGREGATION OF DUTIES
# --------------------------------------------------------------------------

@router.get("/approvals", summary="Pending Maker-Checker Financial Approvals")
async def get_approvals_center(status: Optional[str] = Query(default=None)) -> Dict[str, Any]:
    """Returns approval requests for high-value refunds, manual ledger adjustments, and settlements."""
    return await unified_finance_service.get_approvals_center(status_filter=status)


@router.post("/approvals/request", summary="Submit Maker-Checker Approval Request")
async def submit_approval_request(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Submits a sensitive financial action for mandatory checker review."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("requestedBy") or "super_admin"
    return await unified_finance_service.submit_approval_request(data=body, creator_id=str(admin_id))


@router.post("/approvals/{request_id}/action", summary="Approve or Reject Request")
async def process_approval_action(
    request_id: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Approves or rejects a financial request. Enforces Segregation of Duties (Creator != Approver)."""
    action = str(body.get("action", "APPROVE")).upper()
    reason = str(body.get("reason", "Approved by authorized finance manager"))
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "finance_manager"
    try:
        return await unified_finance_service.process_approval_action(
            request_id=request_id,
            action=action,
            admin_id=str(admin_id),
            reason=reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --------------------------------------------------------------------------
# 16. PHASE 1 & 3: FINANCIAL PERIOD LOCK GOVERNANCE
# --------------------------------------------------------------------------

@router.get("/periods", summary="List Accounting Periods & Locks")
async def get_financial_periods() -> Dict[str, Any]:
    """Returns monthly financial close periods and lock statuses."""
    return await unified_finance_service.get_financial_periods()


@router.post("/periods/{period_id}/close", summary="Lock Financial Period")
async def close_financial_period(
    period_id: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Permanently locks an accounting period to prevent historical journal alterations."""
    notes = str(body.get("notes", "Month-end financial close completed."))
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"
    return await unified_finance_service.close_financial_period(
        period_id=period_id,
        admin_id=str(admin_id),
        notes=notes,
    )


# --------------------------------------------------------------------------
# 17. PHASE 3: AI FINANCE ASSISTANT
# --------------------------------------------------------------------------

@router.post("/ai-assistant", summary="Query AI Finance Assistant")
async def ai_finance_assistant(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Natural language financial query engine running deterministic calculations on live Supabase data."""
    query = str(body.get("query", ""))
    if not query.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty.")
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or "super_admin"
    return await unified_finance_service.ai_finance_assistant(query=query, admin_id=str(admin_id))


# --------------------------------------------------------------------------
# 18. PHASE 2 & 3: WHAT-IF SCENARIO SIMULATOR
# --------------------------------------------------------------------------

@router.post("/simulate-scenario", summary="Commercial What-If Simulator")
async def simulate_scenario(body: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates live financial impact of commercial levers without mutating actual ledger records."""
    return await unified_finance_service.simulate_scenario(params=body)


