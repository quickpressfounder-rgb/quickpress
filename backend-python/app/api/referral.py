"""Customer referral & rewards API — Sprint 2.8.

    GET  /api/referral            dashboard: code, QR, stats, history, rewards
    GET  /api/referral/history    referred friends + status + reward earned
    GET  /api/referral/rewards    pending / completed rewards + history
    GET  /api/referral/stats      counters only (cheap poll for cards)
    POST /api/referral/apply      apply a friend's code (one per customer)
    POST /api/referral/invite     record an invite (copy / link / whatsapp / sms)

Every route requires a bearer token and is scoped to `current_user`.
"""

from __future__ import annotations
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import current_user
from app.db.referral_repositories import ReferralConflict, referral_repository
from app.models.referral import (
    ApplyReferralPayload,
    ApplyReferralResponse,
    ClaimReferralRewardPayload,
    ClaimReferralRewardResponse,
    InviteReferralPayload,
    InviteReferralResponse,
    ReferralHistoryResponse,
    ReferralProgramSettings,
    ReferralResponse,
    ReferralRewardsResponse,
    ReferralRuleItem,
    ReferralStatsResponse,
    UserReferralHubResponse,
    WelcomeReferralOffer,
)
from app.models.user import User

router = APIRouter(tags=["referral"])


@router.get("/referral/program", response_model=ReferralProgramSettings)
async def get_referral_program() -> ReferralProgramSettings:
    """Public endpoint to fetch active referral offer terms, discounts, and banner copy."""
    return await referral_repository.get_settings()


@router.get("/referral/welcome-offer", response_model=WelcomeReferralOffer)
async def get_welcome_offer(user: User = Depends(current_user)) -> WelcomeReferralOffer:
    """Check if current user has an active 50% referral discount on their first order."""
    return await referral_repository.get_welcome_offer_for_user(user.id)


@router.get("/referral", response_model=ReferralResponse)
async def referral_dashboard(user: User = Depends(current_user)) -> ReferralResponse:
    return await referral_repository.dashboard(user)


@router.get("/referral/history", response_model=ReferralHistoryResponse)
async def referral_history(user: User = Depends(current_user)) -> ReferralHistoryResponse:
    return await referral_repository.history(user)


@router.get("/referral/rewards", response_model=ReferralRewardsResponse)
async def referral_rewards(user: User = Depends(current_user)) -> ReferralRewardsResponse:
    return await referral_repository.rewards(user)


@router.get("/referral/stats", response_model=ReferralStatsResponse)
async def referral_stats(user: User = Depends(current_user)) -> ReferralStatsResponse:
    return await referral_repository.stats(user)


@router.post("/referral/apply", response_model=ApplyReferralResponse)
async def apply_referral(
    payload: ApplyReferralPayload, user: User = Depends(current_user)
) -> ApplyReferralResponse:
    try:
        return await referral_repository.apply(user, payload.code)
    except ReferralConflict as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.post("/referral/invite", response_model=InviteReferralResponse)
async def invite_referral(
    payload: InviteReferralPayload, user: User = Depends(current_user)
) -> InviteReferralResponse:
    return await referral_repository.invite(user, payload.channel, payload.contact)


# ==============================================================================
# Multi-Role Referral Endpoints (Partner, Rider & Customer)
# ==============================================================================

@router.get("/referral/rules", response_model=List[ReferralRuleItem])
async def list_referral_rules(
    role: Optional[str] = Query(default=None), city: Optional[str] = Query(default=None)
) -> List[ReferralRuleItem]:
    """Fetch active referral rules filtered by role and city."""
    if role:
        rule = await referral_repository.get_active_rule(role, city)
        return [rule]
    return await referral_repository.get_multi_role_rules()


@router.get("/referral/hub", response_model=UserReferralHubResponse)
async def get_user_referral_hub(
    role: str = Query(default="partner"),
    city: Optional[str] = Query(default=None),
    user: User = Depends(current_user),
) -> UserReferralHubResponse:
    """Returns role-specific referral hub: code, dynamic rules, milestone progress, and balance."""
    return await referral_repository.get_user_referral_hub(user, role=role, city=city)


@router.post("/referral/claim", response_model=ClaimReferralRewardResponse)
async def claim_referral_reward(
    payload: ClaimReferralRewardPayload,
    role: str = Query(default="partner"),
    user: User = Depends(current_user),
) -> ClaimReferralRewardResponse:
    """Claims unlocked referral rewards into weekly settlement cycle (partner) or wallet (rider)."""
    return await referral_repository.claim_referral_rewards(user, role=role, reward_id=payload.rewardId)


@router.post("/referral/apply-partner-rider")
async def apply_partner_rider_referral(
    payload: dict,
    user: User = Depends(current_user),
) -> dict:
    code = str(payload.get("code") or "").strip()
    role = str(payload.get("role") or "partner").strip()
    city = str(payload.get("city") or "All Cities").strip()
    try:
        return await referral_repository.apply_partner_or_rider_referral(code, user, referee_role=role, city=city)
    except ReferralConflict as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error

