"""Customer membership API — Sprint 2.9.

    GET  /api/membership           current plan, expiry, remaining days, benefits
    GET  /api/membership/plans     Free / Silver / Gold / Premium catalogue
    POST /api/membership/subscribe subscribe, renew or upgrade a plan
    POST /api/membership/cancel    cancel the active membership
    GET  /api/membership/history   subscription / renewal / payment ledger
    GET  /api/membership/benefits  benefit catalogue + the caller's active set

Every route requires a bearer token and is scoped to `current_user`.
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import current_user, optional_user
from app.db.membership_repositories import MembershipConflict, membership_repository
from app.models.membership import (
    CancelPayload,
    CancelResponse,
    MembershipBenefitsResponse,
    MembershipHistoryResponse,
    MembershipPlansResponse,
    MembershipResponse,
    SubscribePayload,
    SubscribeResponse,
)
from app.models.user import User

router = APIRouter(tags=["membership"])


@router.get("/membership/plans", response_model=MembershipPlansResponse)
async def membership_plans(
    user: Optional[User] = Depends(optional_user),
) -> MembershipPlansResponse:
    return await membership_repository.plans(user)


@router.get("/membership/benefits", response_model=MembershipBenefitsResponse)
async def membership_benefits(
    user: Optional[User] = Depends(optional_user),
) -> MembershipBenefitsResponse:
    return await membership_repository.benefits(user)


@router.get("/membership/history", response_model=MembershipHistoryResponse)
async def membership_history(user: User = Depends(current_user)) -> MembershipHistoryResponse:
    return await membership_repository.history(user)


@router.get("/membership", response_model=MembershipResponse)
async def membership_dashboard(
    user: Optional[User] = Depends(optional_user),
) -> MembershipResponse:
    return await membership_repository.current(user)


@router.post("/membership/subscribe", response_model=SubscribeResponse)
async def subscribe_membership(
    payload: SubscribePayload, user: User = Depends(current_user)
) -> SubscribeResponse:
    try:
        return await membership_repository.subscribe(
            user, payload.planId, payload.billingCycle, payload.paymentReference
        )
    except MembershipConflict as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.post("/membership/cancel", response_model=CancelResponse)
async def cancel_membership(
    payload: CancelPayload | None = None, user: User = Depends(current_user)
) -> CancelResponse:
    try:
        return await membership_repository.cancel(user, payload.reason if payload else None)
    except MembershipConflict as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error
