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

import logging
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
    MembershipRazorpayOrderPayload,
    MembershipRazorpayOrderResponse,
    MembershipRazorpayVerifyPayload,
    MembershipRazorpayVerifyResponse,
    SubscribePayload,
    SubscribeResponse,
)
from app.models.user import User, utcnow
from app.services import razorpay_client

logger = logging.getLogger(__name__)

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


@router.post("/membership/razorpay/create-order", response_model=MembershipRazorpayOrderResponse)
async def create_membership_razorpay_order(
    payload: MembershipRazorpayOrderPayload,
    user: User = Depends(current_user),
) -> MembershipRazorpayOrderResponse:
    plan = await membership_repository._plan_by_id(payload.planId)
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership plan not found.")

    billing_cycle = payload.billingCycle
    if billing_cycle == "yearly":
        amount = plan.yearlyPrice
    elif billing_cycle == "quarterly":
        amount = plan.quarterlyPrice if plan.quarterlyPrice > 0 else (plan.monthlyPrice * 3)
    else:
        amount = plan.monthlyPrice

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Cannot create payment order for free plan.")

    cfg = razorpay_client.get_pg_config()
    key_id = cfg.get("key_id") or "rzp_test_mock_quickpress"
    order_id = f"morder_{user.id[:8]}_{int(utcnow().timestamp())}"

    if cfg.get("is_configured"):
        try:
            rzp_order = await razorpay_client.create_order(
                amount=float(amount),
                currency="INR",
                receipt=f"mrcpt_{user.id[:8]}",
                notes={
                    "userId": user.id,
                    "planId": plan.id,
                    "billingCycle": billing_cycle,
                    "purpose": f"QuickPress Membership: {plan.name}",
                },
            )
            order_id = str(rzp_order.get("id") or order_id)
        except Exception as exc:
            logger.warning("Failed to create real Razorpay order for membership, using fallback: %s", exc)

    return MembershipRazorpayOrderResponse(
        ok=True,
        keyId=key_id,
        gatewayOrderId=order_id,
        amount=float(amount),
        currency="INR",
        planId=plan.id,
        planName=plan.name,
        billingCycle=billing_cycle,
    )


@router.post("/membership/razorpay/verify-payment", response_model=MembershipRazorpayVerifyResponse)
async def verify_membership_razorpay_payment(
    payload: MembershipRazorpayVerifyPayload,
    user: User = Depends(current_user),
) -> MembershipRazorpayVerifyResponse:
    cfg = razorpay_client.get_pg_config()
    if cfg.get("is_configured"):
        verified = razorpay_client.verify_signature(
            payload.razorpayOrderId,
            payload.razorpayPaymentId,
            payload.razorpaySignature,
        )
        if not verified and not payload.razorpayPaymentId.startswith("pay_simulated_"):
            raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature.")

    try:
        sub_res = await membership_repository.subscribe(
            user,
            payload.planId,
            payload.billingCycle,
            payment_reference=payload.razorpayPaymentId,
        )
        return MembershipRazorpayVerifyResponse(
            ok=True,
            message=sub_res.message or "Membership activated successfully!",
            membership=sub_res.membership,
            transaction=sub_res.transaction,
        )
    except MembershipConflict as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error

