"""QuickPress General Ledger & Period Governance API Router.

Prefix: `/api/finance-ledger`
Provides endpoints for:
1. Double-Entry General Ledger inspection & server-side pagination.
2. Complete Chart of Accounts balances.
3. Real-time Trial Balance verification (Debits == Credits).
4. Financial Period Lock (Month-end / Year-end close).
5. Offsetting Reversal Entry posting (Zero hard-deletes).
6. Order & Reference Ledger Trail inspection.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.db.accounting_period_repository import accounting_period_repository
from app.db.general_ledger_repository import general_ledger_repository
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance-ledger", tags=["finance-ledger"])


# -----------------------------------------------------------------------------
# 1. GENERAL LEDGER ENTRIES (PAGINATED & FILTERED)
# -----------------------------------------------------------------------------
@router.get("", summary="List General Ledger Entries (Paginated)")
async def list_ledger_entries(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    account_code: Optional[int] = Query(None, description="Filter by account code (e.g. 1010, 2010)"),
    reference_type: Optional[str] = Query(None, description="ORDER_PAYMENT, COD_COLLECTION, etc."),
    reference_id: Optional[str] = Query(None, description="Order ID or Payment ID"),
    accounting_period: Optional[str] = Query(None, description="e.g. 2026-03"),
    search: Optional[str] = Query(None, description="Search description, reference, party ID"),
) -> Dict[str, Any]:
    """Returns paginated, filterable double-entry journal records."""
    skip = (page - 1) * page_size
    entries, total = await general_ledger_repository.list_entries(
        skip=skip,
        limit=page_size,
        account_code=account_code,
        reference_type=reference_type,
        reference_id=reference_id,
        accounting_period=accounting_period,
        search=search,
    )
    return {
        "ok": True,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        "entries": entries,
    }


# -----------------------------------------------------------------------------
# 2. CHART OF ACCOUNTS & TRIAL BALANCE
# -----------------------------------------------------------------------------
@router.get("/chart-of-accounts", summary="Get Chart of Accounts with Live Balances")
async def get_chart_of_accounts(
    accounting_period: Optional[str] = Query(None, description="Optional period filter e.g. 2026-03"),
) -> Dict[str, Any]:
    """Returns complete Chart of Accounts (1000 - 5999) with live net balances."""
    trial_bal = await general_ledger_repository.get_trial_balance(accounting_period)
    return {
        "ok": True,
        "accountingPeriod": trial_bal["accounting_period"],
        "isBalanced": trial_bal["is_balanced"],
        "totalDebit": trial_bal["total_debit"],
        "totalCredit": trial_bal["total_credit"],
        "variance": trial_bal["variance"],
        "accounts": trial_bal["accounts"],
    }


@router.get("/trial-balance", summary="Validate Mathematical Trial Balance")
async def get_trial_balance_validation(
    accounting_period: Optional[str] = Query(None, description="e.g. 2026-03"),
) -> Dict[str, Any]:
    """Validates that Σ Debits == Σ Credits across the entire ledger."""
    trial = await general_ledger_repository.get_trial_balance(accounting_period)
    return {
        "ok": True,
        "status": "BALANCED" if trial["is_balanced"] else "UNBALANCED",
        "period": trial["accounting_period"],
        "totalDebits": trial["total_debit"],
        "totalCredits": trial["total_credit"],
        "variance": trial["variance"],
    }


# -----------------------------------------------------------------------------
# 3. ACCOUNTING PERIOD LOCK (MONTH-END CLOSE)
# -----------------------------------------------------------------------------
@router.get("/periods", summary="List All Accounting Periods and Lock Status")
async def list_accounting_periods() -> Dict[str, Any]:
    """Lists accounting periods and their lock statuses."""
    periods = await accounting_period_repository.list_periods()
    return {"ok": True, "periods": periods}


@router.post("/periods/{period}/lock", summary="Lock Accounting Period (Admin)")
async def lock_accounting_period(
    period: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Hard-locks an accounting period to prevent retroactive tampering."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"
    notes = str(body.get("notes") or "Month-end financial close")

    res = await accounting_period_repository.lock_period(
        period_str=period,
        locked_by=str(admin_id),
        closing_notes=notes,
    )
    return {"ok": True, "message": f"Period {period} locked successfully.", **res}


@router.post("/periods/{period}/unlock", summary="Unlock Accounting Period (Admin with Reason)")
async def unlock_accounting_period(
    period: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Unlocks an accounting period with mandatory audit explanation."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"
    reason = str(body.get("reason") or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory justification reason is required to unlock a financial period.",
        )

    res = await accounting_period_repository.unlock_period(
        period_str=period,
        unlocked_by=str(admin_id),
        reason=reason,
    )
    return {"ok": True, "message": f"Period {period} unlocked.", **res}


# -----------------------------------------------------------------------------
# 4. ORDER & REFERENCE LEDGER TRAIL (DRILL-DOWN)
# -----------------------------------------------------------------------------
@router.get("/reference/{reference_type}/{reference_id}", summary="Get Full Ledger Trail for Entity")
async def get_ledger_trail(reference_type: str, reference_id: str) -> Dict[str, Any]:
    """Fetches complete balanced journal trail for any order, payment, or settlement."""
    entries = await general_ledger_repository.get_by_reference(reference_type, reference_id)
    total_dr = sum(float(e.get("debit", 0.0)) for e in entries)
    total_cr = sum(float(e.get("credit", 0.0)) for e in entries)

    return {
        "ok": True,
        "referenceType": reference_type.upper(),
        "referenceId": reference_id,
        "count": len(entries),
        "totalDebits": round(total_dr, 2),
        "totalCredits": round(total_cr, 2),
        "isBalanced": abs(total_dr - total_cr) < 0.01,
        "entries": entries,
    }


# -----------------------------------------------------------------------------
# 5. REVERSAL ENTRY (ZERO HARD-DELETE CORRECTION)
# -----------------------------------------------------------------------------
@router.post("/reversal", summary="Post Offsetting Reversal Entry")
async def post_ledger_reversal(
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Creates offsetting reversal entries referencing the original batch or entry."""
    entry_id = str(body.get("entryId") or body.get("batchId") or "").strip()
    reason = str(body.get("reason") or "").strip()
    if not entry_id:
        raise HTTPException(status_code=400, detail="entryId or batchId is required.")
    if not reason:
        raise HTTPException(status_code=400, detail="Audit reason is mandatory for financial reversal.")

    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "super_admin"

    try:
        reversal_lines = await general_ledger_repository.record_reversal(
            original_entry_or_batch_id=entry_id,
            reason=reason,
            approved_by=str(admin_id),
        )
        return {
            "ok": True,
            "message": f"Successfully reversed {len(reversal_lines)} ledger line(s).",
            "reversalLines": reversal_lines,
        }
    except Exception as exc:
        logger.exception("Reversal posting failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
