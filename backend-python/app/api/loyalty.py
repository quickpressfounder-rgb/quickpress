"""Loyalty Program API Router — Sprint 2.15.

Endpoints:
  GET  /api/loyalty/dashboard          Customer loyalty dashboard (balance, ₹ worth, cards)
  POST /api/loyalty/scratch/{card_id}  Customer scratches a card
  POST /api/loyalty/redeem             Customer transfers loyalty points to wallet cash (100 pts = ₹10)
  GET  /api/loyalty/admin/config       Admin reads campaign budget & metrics
  PUT  /api/loyalty/admin/config       Admin updates budget & targets
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.deps import current_user, optional_user
from app.db.loyalty_repositories import loyalty_repository
from app.models.user import User

router = APIRouter(prefix="/loyalty", tags=["loyalty"])


class RedeemPointsPayload(BaseModel):
    points: int = Field(ge=10, description="Number of points to redeem (min 10)")


class CampaignConfigPayload(BaseModel):
    enabled: Optional[bool] = None
    campaignName: Optional[str] = None
    totalBudget: Optional[float] = None
    targetUserCount: Optional[int] = None
    minPoints: Optional[int] = None
    maxPoints: Optional[int] = None


@router.get("/dashboard")
async def get_loyalty_dashboard(user: User = Depends(current_user)) -> Dict[str, Any]:
    """Fetch customer's loyalty balance, ₹ worth, and scratch cards."""
    return await loyalty_repository.get_dashboard(user)


@router.post("/scratch/{card_id}")
async def scratch_card(card_id: str, user: User = Depends(current_user)) -> Dict[str, Any]:
    """Customer scratches a card to reveal points."""
    try:
        return await loyalty_repository.scratch_card(user.id, card_id)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.post("/redeem")
async def redeem_to_wallet(
    payload: RedeemPointsPayload, user: User = Depends(current_user)
) -> Dict[str, Any]:
    """Convert customer loyalty points to real QuickPress Wallet money at 100 points = ₹10."""
    try:
        return await loyalty_repository.redeem_points_to_wallet(user, payload.points)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/admin/config")
async def get_admin_campaign_config(
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Admin endpoint to fetch loyalty budget and distribution economics."""
    config = await loyalty_repository.get_campaign_config()
    return {"ok": True, "config": config}


@router.put("/admin/config")
async def update_admin_campaign_config(
    payload: CampaignConfigPayload,
    user: Optional[User] = Depends(optional_user),
) -> Dict[str, Any]:
    """Admin endpoint to update total budget, target user count, and min/max points."""
    admin_id = getattr(user, "id", None) or getattr(user, "email", None) or "super_admin"
    updated = await loyalty_repository.update_campaign_config(payload.model_dump(exclude_unset=True), admin_id=str(admin_id))
    return {"ok": True, "config": updated, "message": "Loyalty campaign configuration updated successfully"}
