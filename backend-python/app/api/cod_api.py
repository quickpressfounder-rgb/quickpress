"""QuickPress Hyperlocal COD Management API Router.

Prefix: `/api/cod`
Provides endpoints for:
1. Executive COD Dashboard KPIs (Outstanding, Collected, Verified, Overdue).
2. Order-level COD collection tracking and server-side pagination.
3. Rider COD risk summary and cash ceiling eligibility.
4. Rider deposit slip & UTR submission.
5. Finance Admin deposit verification with automated Double-Entry Ledger reconciliation.
6. Overdue riders alert list for fleet manager intervention.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.db.client import database
from app.db.cod_repository import cod_repository
from app.models.user import User
from app.services.cod_risk_service import cod_risk_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cod", tags=["cod-management"])


# -----------------------------------------------------------------------------
# 1. COD DASHBOARD SUMMARY KPIS
# -----------------------------------------------------------------------------
@router.get("/metrics", summary="Get Executive COD Dashboard Metrics")
async def get_cod_metrics() -> Dict[str, Any]:
    """Returns top-level COD metrics for Finance Console."""
    summary = await cod_repository.get_dashboard_summary()
    rules = await cod_risk_service.get_system_cod_rules()
    return {"ok": True, "metrics": summary, "activeRules": rules}


# -----------------------------------------------------------------------------
# 2. COD COLLECTIONS LIST (PAGINATED & FILTERED)
# -----------------------------------------------------------------------------
@router.get("/collections", summary="List COD Collections (Paginated)")
async def list_cod_collections(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    status: Optional[str] = Query(None, description="CASH_COLLECTED, DEPOSITED, VERIFIED, OVERDUE"),
    rider_id: Optional[str] = Query(None, description="Filter by rider ID"),
    overdue_only: bool = Query(False, description="Filter only collections past 24h deadline"),
    search: Optional[str] = Query(None, description="Search Order ID, Rider ID, Bank UTR"),
) -> Dict[str, Any]:
    """Returns paginated COD collection records."""
    skip = (page - 1) * page_size
    collections, total = await cod_repository.list_collections(
        skip=skip,
        limit=page_size,
        status=status,
        rider_id=rider_id,
        overdue_only=overdue_only,
        search=search,
    )
    return {
        "ok": True,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        "collections": collections,
    }


# -----------------------------------------------------------------------------
# 3. RIDER COD ELIGIBILITY & SUMMARY
# -----------------------------------------------------------------------------
@router.get("/rider/{rider_id}/summary", summary="Get Rider COD Custody & Risk Status")
async def get_rider_cod_status(
    rider_id: str,
    new_order_amount: float = Query(0.0, ge=0.0, description="Simulate new order acceptance"),
) -> Dict[str, Any]:
    """Checks rider cash liability, ceiling limit, and overdue blocking status."""
    eligibility = await cod_risk_service.check_rider_cod_eligibility(
        rider_id=rider_id,
        new_order_amount=new_order_amount,
    )
    active_colls = await cod_repository.get_rider_active_collections(rider_id)
    return {
        "ok": True,
        "riderId": rider_id,
        "eligibility": eligibility,
        "activeCollectionsCount": len(active_colls),
        "activeCollections": active_colls,
    }


# -----------------------------------------------------------------------------
# 4. DEPOSIT SUBMISSION (RIDER APP)
# -----------------------------------------------------------------------------
@router.post("/deposit/submit", summary="Rider Submits Bank / CDM Deposit Slip")
async def submit_cod_deposit(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Rider submits bank deposit slip and UTR reference for collected cash."""
    rider_id = str(body.get("riderId") or getattr(user, "id", None) or "rider-demo-1")
    collection_ids = body.get("collectionIds") or []
    deposited_amount = float(body.get("depositedAmount") or 0.0)
    bank_utr = str(body.get("bankUtr") or "").strip()
    deposit_slip_url = body.get("depositSlipUrl")
    notes = str(body.get("notes") or "")

    if deposited_amount <= 0:
        raise HTTPException(status_code=400, detail="Deposited amount must be greater than 0.")
    if not bank_utr:
        raise HTTPException(status_code=400, detail="Bank UTR / Transaction Reference is mandatory.")

    # If collection_ids not provided, auto-link to all pending collections for this rider
    if not collection_ids:
        active = await cod_repository.get_rider_active_collections(rider_id)
        collection_ids = [c["id"] for c in active if c.get("status") in ("CASH_COLLECTED", "OVERDUE")]

    dep_doc = await cod_repository.submit_deposit(
        rider_id=rider_id,
        collection_ids=collection_ids,
        deposited_amount=deposited_amount,
        deposit_slip_url=deposit_slip_url,
        bank_utr=bank_utr,
        notes=notes,
    )
    return {"ok": True, "message": "Deposit submitted for verification.", "deposit": dep_doc}


# -----------------------------------------------------------------------------
# 5. DEPOSIT VERIFICATION & DOUBLE-ENTRY LEDGER POSTING (ADMIN)
# -----------------------------------------------------------------------------
@router.post("/deposit/{deposit_id}/verify", summary="Finance Admin Verifies Deposit & Posts to Ledger")
async def verify_cod_deposit(
    deposit_id: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Verifies cash credit into Bank Operating Account and reconciles rider custody via General Ledger."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "finance_admin"
    notes = str(body.get("notes") or "Verified via Bank Statement match")

    try:
        res = await cod_risk_service.verify_and_reconcile_deposit(
            deposit_id=deposit_id,
            verified_by=str(admin_id),
            notes=notes,
        )
        return {"ok": True, "message": "Deposit verified and reconciled into General Ledger.", **res}
    except Exception as exc:
        logger.exception("Failed to verify COD deposit %s: %s", deposit_id, exc)
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/deposit/{deposit_id}/dispute", summary="Dispute Deposit Discrepancy")
async def dispute_cod_deposit(
    deposit_id: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Flags deposit variance (e.g. rider claimed ₹2,000, bank credit is ₹1,800)."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "finance_admin"
    reason = str(body.get("reason") or "Amount mismatch on bank statement")
    variance = float(body.get("varianceAmount") or 0.0)

    res = await cod_repository.dispute_deposit(
        deposit_id=deposit_id,
        disputed_by=str(admin_id),
        reason=reason,
        variance_amount=variance,
    )
    return {"ok": True, "message": "Deposit flagged as DISPUTED.", **res}


# -----------------------------------------------------------------------------
# 6. OVERDUE RIDERS AUDIT LIST
# -----------------------------------------------------------------------------
@router.get("/overdue-riders", summary="List All Riders with Overdue Cash")
async def get_overdue_riders() -> Dict[str, Any]:
    """Returns all riders holding unverified cash older than 24 hours."""
    overdue_list = await cod_risk_service.get_overdue_riders_report()
    return {"ok": True, "count": len(overdue_list), "overdueRiders": overdue_list}


# -----------------------------------------------------------------------------
# 7. DYNAMIC COD RULES CONFIGURATION
# -----------------------------------------------------------------------------
@router.post("/rules", summary="Update Dynamic COD Ceiling & Overdue Thresholds")
async def update_cod_rules(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Updates dynamic COD limits in database (No hardcoded values)."""
    max_limit = float(body.get("maxHoldingLimit", 5000.0))
    overdue_hours = float(body.get("overdueHours", 24.0))

    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"

    doc = {
        "_id": "cod_rules",
        "maxHoldingLimit": max_limit,
        "overdueHours": overdue_hours,
        "updatedBy": str(admin_id),
        "updatedAt": database.client if hasattr(database, "client") else "now",
    }
    await database.collection("system_finance_settings").update_one(
        {"_id": "cod_rules"},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "message": "COD risk limits updated dynamically.", "rules": doc}
