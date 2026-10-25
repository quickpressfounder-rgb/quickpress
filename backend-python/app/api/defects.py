"""Garment Defect & Pre-wash Inspection API Routes for QuickPress.

Endpoints:
- POST /api/partner/orders/{order_id}/defects            (Partner logs pre-wash defect)
- GET  /api/partner/orders/{order_id}/defects            (Partner views defect list)
- GET  /api/orders/{order_id}/defects                    (Customer/public tracking view)
- POST /api/orders/{order_id}/defects/{defect_id}/respond (Customer responds to defect)
- GET  /api/admin/orders/{order_id}/defects              (Admin QC inspection audit)
- POST /api/admin/orders/{order_id}/defects/{defect_id}/override (Admin dispute override)
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.models.defect import (
    AdminDefectOverridePayload,
    CustomerDefectDecisionPayload,
    GarmentDefect,
    LogDefectPayload,
)
from app.models.user import User
from app.services.defect_service import defect_service

logger = logging.getLogger("quickpress.api.defects")

router = APIRouter(tags=["garment-defects"])


# -----------------------------------------------------------------------------
# 1. Partner Endpoints
# -----------------------------------------------------------------------------

@router.post(
    "/partner/orders/{order_id}/defects",
    response_model=GarmentDefect,
    status_code=status.HTTP_201_CREATED,
    summary="Partner reports a pre-wash defect or stain",
)
async def partner_report_defect(
    order_id: str,
    payload: LogDefectPayload,
    user: Optional[User] = Depends(optional_user),
) -> GarmentDefect:
    """Partner uploads photo & notes for a pre-existing stain or tear on a garment."""
    actor_id = user.id if user else "partner_store"
    actor_role = user.role.value if user and hasattr(user, "role") and user.role else "partner"
    actor_name = user.name if user else "Partner Store"

    return await defect_service.log_defect(
        order_id=order_id,
        actor_id=actor_id,
        actor_role=actor_role,
        actor_name=actor_name,
        payload=payload,
    )


@router.get(
    "/partner/orders/{order_id}/defects",
    response_model=List[GarmentDefect],
    summary="Partner retrieves all logged defects for an order",
)
async def partner_get_defects(
    order_id: str,
    user: Optional[User] = Depends(optional_user),
) -> List[GarmentDefect]:
    return await defect_service.get_defects(order_id)


# -----------------------------------------------------------------------------
# 2. Customer Endpoints (Order Tracking View & Decision Response)
# -----------------------------------------------------------------------------

@router.get(
    "/orders/{order_id}/defects",
    response_model=List[GarmentDefect],
    summary="Customer or tracking view of garment defects",
)
@router.get(
    "/customer/orders/{order_id}/defects",
    response_model=List[GarmentDefect],
)
async def customer_get_defects(
    order_id: str,
    user: Optional[User] = Depends(optional_user),
) -> List[GarmentDefect]:
    return await defect_service.get_defects(order_id)


@router.post(
    "/orders/{order_id}/defects/{defect_id}/respond",
    response_model=GarmentDefect,
    summary="Customer approves wash or requests item return",
)
@router.post(
    "/customer/orders/{order_id}/defects/{defect_id}/respond",
    response_model=GarmentDefect,
)
async def customer_respond_defect(
    order_id: str,
    defect_id: str,
    payload: CustomerDefectDecisionPayload,
    user: Optional[User] = Depends(optional_user),
) -> GarmentDefect:
    customer_id = user.id if user else "guest_customer"
    customer_phone = user.phone if user else None

    return await defect_service.customer_respond(
        order_id=order_id,
        defect_id=defect_id,
        customer_id=customer_id,
        customer_phone=customer_phone,
        payload=payload,
    )


# -----------------------------------------------------------------------------
# 3. Admin QC & Audit Override Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/admin/orders/{order_id}/defects",
    response_model=List[GarmentDefect],
    summary="Admin QC view of all garment defects and photos",
)
async def admin_get_defects(
    order_id: str,
    user: Optional[User] = Depends(optional_user),
) -> List[GarmentDefect]:
    return await defect_service.get_defects(order_id)


@router.post(
    "/admin/orders/{order_id}/defects/{defect_id}/override",
    response_model=GarmentDefect,
    summary="Admin dispute override for a garment defect",
)
async def admin_override_defect(
    order_id: str,
    defect_id: str,
    payload: AdminDefectOverridePayload,
    user: Optional[User] = Depends(optional_user),
) -> GarmentDefect:
    admin_id = user.id if user else "admin_system"
    return await defect_service.admin_override(
        order_id=order_id,
        defect_id=defect_id,
        admin_id=admin_id,
        payload=payload,
    )
