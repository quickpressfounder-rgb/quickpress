"""Global Finance Search & Customer 360 API Router.

Prefix: `/api/finance-search`
Provides endpoints for:
1. Omnipresent Global Finance Search (Smart regex pattern auto-detection).
2. Complete Customer 360 Financial Profile with LTV, Orders, Wallets, and Ledger.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.services.global_finance_search_service import global_finance_search_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance-search", tags=["finance-search"])


@router.get("", summary="Universal Global Finance Search")
async def global_search(
    q: str = Query(..., min_length=1, description="Phone, Order ID, Payment ID, Invoice ID, etc."),
    limit: int = Query(10, ge=1, le=50, description="Max matches per entity group"),
) -> Dict[str, Any]:
    """Smart auto-detects search query type and returns grouped financial matches."""
    res = await global_finance_search_service.search_all(q, limit=limit)
    return {"ok": True, **res}


@router.get("/customer/{customer_id}/profile", summary="Get Full Customer 360 Financial Profile")
async def get_customer_profile(customer_id: str) -> Dict[str, Any]:
    """Returns Customer 360 Financial Profile (LTV, orders, payments, refunds, wallets)."""
    profile = await global_finance_search_service.get_customer_financial_profile(customer_id)
    if profile.get("error"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=profile["error"])
    return {"ok": True, "profile": profile}
