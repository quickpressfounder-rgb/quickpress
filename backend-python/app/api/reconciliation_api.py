"""3-Way Automated Reconciliation API Router for QuickPress.

Prefix: `/api/reconciliation`
Provides endpoints for:
1. Reconciliation dashboard summary KPIs.
2. Paginated list of reconciliation runs (Gateway, COD, Settlements).
3. Recording reconciliation comparisons.
4. Resolving financial variances and mismatch discrepancies.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.db.reconciliation_repository import reconciliation_repository
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


@router.get("/summary", summary="Get 3-Way Reconciliation Summary KPIs")
async def get_reconciliation_summary() -> Dict[str, Any]:
    """Returns top-level reconciliation metrics and match rates."""
    summary = await reconciliation_repository.get_summary()
    return {"ok": True, "summary": summary}


@router.get("/runs", summary="List Reconciliation Runs (Paginated)")
async def list_reconciliation_runs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    recon_type: Optional[str] = Query(None, description="GATEWAY_VS_BANK, COD_VS_BANK, SETTLEMENT_VS_BANK"),
    status: Optional[str] = Query(None, description="MATCHED, PARTIALLY_MATCHED, MISMATCH, RESOLVED"),
    search: Optional[str] = Query(None, description="Search reference or notes"),
) -> Dict[str, Any]:
    """Returns paginated reconciliation runs."""
    skip = (page - 1) * page_size
    runs, total = await reconciliation_repository.list_runs(
        skip=skip,
        limit=page_size,
        recon_type=recon_type,
        status=status,
        search=search,
    )
    return {
        "ok": True,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        "runs": runs,
    }


@router.post("/runs/record", summary="Record a Reconciliation Comparison")
async def record_reconciliation_run(body: Dict[str, Any]) -> Dict[str, Any]:
    """Records a reconciliation comparison run (Gateway vs Bank, COD vs CDM, etc.)."""
    recon_type = str(body.get("reconType") or "GATEWAY_VS_BANK")
    ext_source = str(body.get("externalSource") or "RAZORPAY")
    ext_ref = str(body.get("externalReference") or "").strip()
    int_ref = str(body.get("internalReference") or "").strip()
    ext_amt = float(body.get("externalAmount") or 0.0)
    int_amt = float(body.get("internalAmount") or 0.0)
    discrepancy = body.get("discrepancyReason")
    notes = str(body.get("notes") or "")

    if not ext_ref or not int_ref:
        raise HTTPException(status_code=400, detail="External and internal references are required.")

    doc = await reconciliation_repository.record_run(
        recon_type=recon_type,
        external_source=ext_source,
        external_reference=ext_ref,
        internal_reference=int_ref,
        external_amount=ext_amt,
        internal_amount=int_amt,
        discrepancy_reason=discrepancy,
        notes=notes,
    )
    return {"ok": True, "reconciliationRun": doc}


@router.post("/runs/{run_id}/resolve", summary="Resolve Reconciliation Mismatch (Admin)")
async def resolve_reconciliation_run(
    run_id: str,
    body: Dict[str, Any],
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Admin marks a reconciliation mismatch as RESOLVED with audit note."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or body.get("adminId") or "finance_admin"
    notes = str(body.get("notes") or "").strip()
    if not notes:
        raise HTTPException(status_code=400, detail="Resolution audit notes are mandatory.")

    try:
        res = await reconciliation_repository.resolve_run(
            run_id=run_id,
            resolved_by=str(admin_id),
            resolution_notes=notes,
        )
        return {"ok": True, "message": "Discrepancy marked as RESOLVED.", **res}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
