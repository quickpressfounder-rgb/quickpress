"""Referral & rewards models — Sprint 2.8."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

ReferralStatus = Literal["pending", "completed", "expired"]
RewardStatus = Literal["pending", "completed"]
InviteChannel = Literal["copy", "link", "whatsapp", "sms", "share", "email"]

#: Default reward amounts (INR) and dynamic rules
DEFAULT_REFERRER_REWARD = 150
DEFAULT_REFEREE_DISCOUNT_PERCENT = 50.0
DEFAULT_REFEREE_MAX_DISCOUNT = 150.0
DEFAULT_REFEREE_MIN_ORDER = 199.0

REFERRER_REWARD = DEFAULT_REFERRER_REWARD
REFEREE_REWARD = int(DEFAULT_REFEREE_MAX_DISCOUNT)


class ReferralProgramSettings(BaseModel):
    id: str = "global_referral_config"
    enabled: bool = True
    refereeDiscountPercent: float = Field(default=DEFAULT_REFEREE_DISCOUNT_PERCENT, ge=0, le=100)
    refereeMaxDiscount: float = Field(default=DEFAULT_REFEREE_MAX_DISCOUNT, ge=0)
    refereeMinOrderValue: float = Field(default=DEFAULT_REFEREE_MIN_ORDER, ge=0)
    referrerRewardAmount: float = Field(default=DEFAULT_REFERRER_REWARD, ge=0)
    referrerRewardType: str = "wallet"
    headline: str = "Invite Friends & Earn ₹150"
    subheadline: str = "Friends get 50% OFF on their 1st order. You get ₹150 wallet cash."
    terms: List[str] = Field(
        default_factory=lambda: [
            "50% discount automatically applies to your first order (up to max ₹150).",
            "Minimum order value of ₹199 required.",
            "Referrer receives ₹150 in QuickPress wallet immediately after referee's first order is delivered.",
            "Valid for new customer accounts only.",
        ]
    )
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None


class UpdateReferralSettingsPayload(BaseModel):
    enabled: Optional[bool] = None
    refereeDiscountPercent: Optional[float] = Field(default=None, ge=0, le=100)
    refereeMaxDiscount: Optional[float] = Field(default=None, ge=0)
    refereeMinOrderValue: Optional[float] = Field(default=None, ge=0)
    referrerRewardAmount: Optional[float] = Field(default=None, ge=0)
    referrerRewardType: Optional[str] = None
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    terms: Optional[List[str]] = None


class WelcomeReferralOffer(BaseModel):
    isEligible: bool = False
    appliedCode: Optional[str] = None
    discountPercent: float = 0.0
    maxDiscount: float = 0.0
    minOrderValue: float = 0.0
    headline: str = ""
    description: str = ""


class AdminReferralItem(BaseModel):
    id: str
    referrerId: str
    referrerName: str
    referrerPhone: str
    refereeId: str
    refereeName: str
    refereePhone: str
    code: str
    status: ReferralStatus = "pending"
    rewardAmount: float = 0.0
    discountApplied: float = 0.0
    firstOrderId: Optional[str] = None
    createdAt: str
    completedAt: Optional[str] = None


class AdminReferralStats(BaseModel):
    totalInvites: int = 0
    totalRegisteredReferrals: int = 0
    convertedFirstOrders: int = 0
    totalDiscountGiven: float = 0.0
    totalRewardsPaid: float = 0.0
    activeSettings: ReferralProgramSettings = Field(default_factory=ReferralProgramSettings)


class AdminReferralListResponse(BaseModel):
    items: List[AdminReferralItem] = Field(default_factory=list)
    total: int = 0
    stats: AdminReferralStats = Field(default_factory=AdminReferralStats)


class ReferralHistoryItem(BaseModel):
    id: str
    friendName: str
    joinedAt: str
    status: ReferralStatus = "pending"
    rewardEarned: int = 0
    completedAt: Optional[str] = None


class ReferralRewardItem(BaseModel):
    id: str
    title: str
    description: str = ""
    amount: int = 0
    status: RewardStatus = "pending"
    createdAt: str
    creditedAt: Optional[str] = None
    referralId: Optional[str] = None
    friendName: Optional[str] = None


class ReferralStatsResponse(BaseModel):
    totalInvites: int = 0
    successfulReferrals: int = 0
    pendingReferrals: int = 0
    totalRewardsEarned: int = 0
    pendingRewards: int = 0
    walletRewards: int = 0
    referrerReward: int = DEFAULT_REFERRER_REWARD
    refereeReward: int = int(DEFAULT_REFEREE_MAX_DISCOUNT)
    refereeDiscountPercent: float = DEFAULT_REFEREE_DISCOUNT_PERCENT
    refereeMaxDiscount: float = DEFAULT_REFEREE_MAX_DISCOUNT
    refereeMinOrderValue: float = DEFAULT_REFEREE_MIN_ORDER


class ReferralResponse(BaseModel):
    code: str
    link: str
    qrCodeUrl: str
    active: bool = True
    appliedCode: Optional[str] = None
    canApply: bool = True
    shareMessage: str = ""
    program: ReferralProgramSettings = Field(default_factory=ReferralProgramSettings)
    stats: ReferralStatsResponse = Field(default_factory=ReferralStatsResponse)
    history: List[ReferralHistoryItem] = Field(default_factory=list)
    rewards: List[ReferralRewardItem] = Field(default_factory=list)


class ReferralHistoryResponse(BaseModel):
    items: List[ReferralHistoryItem] = Field(default_factory=list)
    total: int = 0


class ReferralRewardsResponse(BaseModel):
    items: List[ReferralRewardItem] = Field(default_factory=list)
    pendingRewards: int = 0
    completedRewards: int = 0
    walletRewards: int = 0


class ApplyReferralPayload(BaseModel):
    code: str = Field(min_length=3, max_length=24)


class ApplyReferralResponse(BaseModel):
    ok: bool = True
    message: str = ""
    code: str = ""
    rewardAmount: int = DEFAULT_REFERRER_REWARD
    discountPercent: float = DEFAULT_REFEREE_DISCOUNT_PERCENT
    maxDiscount: float = DEFAULT_REFEREE_MAX_DISCOUNT
    minOrderValue: float = DEFAULT_REFEREE_MIN_ORDER
    appliedCode: Optional[str] = None


class InviteReferralPayload(BaseModel):
    channel: InviteChannel = "share"
    contact: Optional[str] = Field(default=None, max_length=120)


class InviteReferralResponse(BaseModel):
    ok: bool = True
    channel: InviteChannel = "share"
    totalInvites: int = 0
    link: str = ""
    shareMessage: str = ""


# ==============================================================================
# Multi-Role Referral Engine (Partner, Rider & Customer) — Unified Architecture
# ==============================================================================

RoleType = Literal["customer", "partner", "rider"]
ReferralMilestoneStatus = Literal["pending_milestone", "unlocked", "claimed_to_cycle", "settled"]


class ReferralRuleItem(BaseModel):
    id: str
    role: RoleType = "partner"
    city: str = "All Cities"
    referrerReward: float = 500.0
    targetOrdersCount: int = 10
    minOrderValue: float = 199.0
    refereeJoiningBonus: float = 0.0
    refereeDiscountPercent: float = 0.0
    refereeMaxDiscount: float = 0.0
    headline: str = "Refer a Partner & Earn ₹500"
    subheadline: str = "Reward unlocks after your referred partner completes 10 orders."
    terms: List[str] = Field(default_factory=lambda: [
        "Referrer gets reward directly in their weekly payout after referred partner completes target orders.",
        "Valid for newly registered verified laundromats only.",
        "Payout is disbursed via weekly bank settlement cycle without deductions.",
    ])
    enabled: bool = True
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class UpdateReferralRulePayload(BaseModel):
    role: RoleType = "partner"
    city: str = "All Cities"
    referrerReward: Optional[float] = Field(default=None, ge=0)
    targetOrdersCount: Optional[int] = Field(default=None, ge=1)
    minOrderValue: Optional[float] = Field(default=None, ge=0)
    refereeJoiningBonus: Optional[float] = Field(default=None, ge=0)
    refereeDiscountPercent: Optional[float] = Field(default=None, ge=0, le=100)
    refereeMaxDiscount: Optional[float] = Field(default=None, ge=0)
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    terms: Optional[List[str]] = None
    enabled: Optional[bool] = None


class ReferralLedgerItem(BaseModel):
    id: str
    referrerId: str
    referrerName: str
    referrerPhone: str
    referrerRole: RoleType = "partner"
    refereeId: str
    refereeName: str
    refereePhone: str
    refereeRole: RoleType = "partner"
    city: str = "All Cities"
    code: str
    targetOrders: int = 10
    completedOrders: int = 0
    rewardAmount: float = 500.0
    status: ReferralMilestoneStatus = "pending_milestone"
    createdAt: str
    unlockedAt: Optional[str] = None
    claimedAt: Optional[str] = None
    settlementCycleId: Optional[str] = None


class UserReferralHubResponse(BaseModel):
    role: RoleType = "partner"
    code: str
    shareLink: str
    qrCodeUrl: str
    shareMessage: str
    activeRule: ReferralRuleItem
    totalReferred: int = 0
    pendingMilestoneCount: int = 0
    unlockedMilestoneCount: int = 0
    claimableBalance: float = 0.0
    totalClaimedBalance: float = 0.0
    ledger: List[ReferralLedgerItem] = Field(default_factory=list)


class ClaimReferralRewardPayload(BaseModel):
    rewardId: Optional[str] = None  # None = claim all unlocked balance


class ClaimReferralRewardResponse(BaseModel):
    ok: bool = True
    claimedAmount: float = 0.0
    cycleId: str = "current"
    message: str = "Referral reward credited to current weekly settlement cycle."


class AdminMultiRoleReferralStats(BaseModel):
    totalPartnerInvites: int = 0
    unlockedPartnerRewards: int = 0
    totalRiderInvites: int = 0
    unlockedRiderRewards: int = 0
    totalCustomerInvites: int = 0
    unlockedCustomerRewards: int = 0
    totalDisbursedToSettlements: float = 0.0
    activeRulesCount: int = 0


class AdminMultiRoleReferralOverview(BaseModel):
    stats: AdminMultiRoleReferralStats = Field(default_factory=AdminMultiRoleReferralStats)
    rules: List[ReferralRuleItem] = Field(default_factory=list)
    ledger: List[ReferralLedgerItem] = Field(default_factory=list)

