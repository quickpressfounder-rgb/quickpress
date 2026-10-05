"""QuickPress Per-Order Unit Economics & Margin Heatmaps API Router.

Prefix: `/api/unit-economics`
Provides endpoints for:
1. Per-order CM1 & CM2 margin breakdowns.
2. Platform-wide blended contribution margins.
3. City & Micro-market profitability heatmaps.
4. Service category margin comparison (Dry Cleaning vs Wash & Fold vs Shoe Cleaning).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.db.unit_economics_repository import unit_economics_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unit-economics", tags=["unit-economics"])


@router.get("/summary", summary="Get Portfolio Contribution Margins (CM1 & CM2)")
async def get_portfolio_summary() -> Dict[str, Any]:
    """Returns blended platform GMV, CM1, CM2, and profitability ratios."""
    summary = await unit_economics_repository.get_portfolio_margins_summary()
    return {"ok": True, "margins": summary}


@router.get("/orders", summary="List Order Unit Economics (Paginated)")
async def list_orders_unit_economics(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    city: Optional[str] = Query(None, description="Filter by city"),
    service_category: Optional[str] = Query(None, description="Filter by service"),
    profitable_only: Optional[bool] = Query(None, description="Filter by profit status"),
) -> Dict[str, Any]:
    """Returns paginated list of order unit economics."""
    skip = (page - 1) * page_size
    records, total = await unit_economics_repository.list_order_economics(
        skip=skip,
        limit=page_size,
        city=city,
        service_category=service_category,
        profitable_only=profitable_only,
    )
    return {
        "ok": True,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": (total + page_size - 1) // page_size if total > 0 else 0,
        "records": records,
    }


@router.post("/orders/record", summary="Record Unit Economics for Order")
async def record_order_economics(body: Dict[str, Any]) -> Dict[str, Any]:
    """Records CM1 and CM2 margin calculation for an order."""
    order_id = str(body.get("orderId") or body.get("order_id") or "").strip()
    if not order_id:
        raise HTTPException(status_code=400, detail="orderId is required.")

    doc = await unit_economics_repository.record_order_economics(
        order_id=order_id,
        gross_order_value=float(body.get("grossOrderValue") or body.get("gross_order_value") or 0.0),
        taxes=float(body.get("taxes") or 0.0),
        partner_cost=float(body.get("partnerCost") or body.get("partner_cost") or 0.0),
        rider_cost=float(body.get("riderCost") or body.get("rider_cost") or 0.0),
        gateway_fee=float(body.get("gatewayFee") or body.get("gateway_fee") or 0.0),
        discount_subsidy=float(body.get("discountSubsidy") or body.get("discount_subsidy") or 0.0),
        packaging_subsidy=float(body.get("packagingSubsidy") or body.get("packaging_subsidy") or 12.0),
        city=str(body.get("city") or "Kasganj"),
        service_category=str(body.get("serviceCategory") or body.get("service_category") or "Wash & Fold"),
        partner_id=body.get("partnerId") or body.get("partner_id"),
        rider_id=body.get("riderId") or body.get("rider_id"),
    )
    return {"ok": True, "unitEconomics": doc}


@router.get("/profitability/cities", summary="City-Wise Profitability Heatmap")
async def get_city_heatmap() -> Dict[str, Any]:
    """Returns city-wise GMV, CM1, and CM2 margins."""
    heatmap = await unit_economics_repository.get_city_profitability_heatmap()
    return {"ok": True, "cityHeatmap": heatmap}


@router.get("/profitability/services", summary="Service Category Margin Comparison")
async def get_services_comparison() -> Dict[str, Any]:
    """Returns service category margins comparison."""
    services = await unit_economics_repository.get_service_profitability_comparison()
    return {"ok": True, "serviceComparison": services}
