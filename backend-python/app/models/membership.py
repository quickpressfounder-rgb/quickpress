"""Membership models — Dynamic engine with Admin Control."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

PlanId = str
BillingCycle = Literal["monthly", "quarterly", "yearly"]
MembershipStatus = Literal["active", "expired", "cancelled", "none"]
PaymentStatus = Literal["paid", "pending", "failed", "free", "refunded"]
TransactionType = Literal["subscribe", "renew", "upgrade", "cancel", "expire", "admin_grant", "admin_revoke"]


class MembershipBenefit(BaseModel):
    id: str
    title: str
    description: str = ""
    icon: str = "sparkles"
    plans: List[str] = Field(default_factory=list)


class MembershipPlan(BaseModel):
    id: str
    name: str
    tagline: str = ""
    monthlyPrice: int = 0
    quarterlyPrice: int = 0
    yearlyPrice: int = 0
    yearlySavings: int = 0
    savingsLabel: str = ""
    validityDays: int = 30
    yearlyValidityDays: int = 365
    popular: bool = False
    status: str = "Active"  # "Active" | "Inactive" | "Archived"
    badge: str = ""
    color: str = "emerald"
    order: int = 0
    discountPercent: int = 0
    cashbackPercent: int = 0
    freeDeliveryMinOrder: int = 0
    freePickup: bool = False
    priorityProcessing: bool = False
    surgeWaiver: bool = False
    supportTier: str = "Standard"
    monthlyOrderLimit: int = 0
    monthlyWeightLimitKg: int = 0
    freeExpressCount: int = 0
    description: str = ""
    benefits: List[MembershipBenefit] = Field(default_factory=list)


class MembershipQuota(BaseModel):
    totalOrders: int = 0
    usedOrders: int = 0
    remainingOrders: int = 0
    totalWeightKg: int = 0
    usedWeightKg: int = 0
    remainingWeightKg: int = 0
    freeExpressTotal: int = 0
    freeExpressUsed: int = 0
    freeExpressRemaining: int = 0
    totalSavings: float = 0.0


class MembershipOrderLog(BaseModel):
    orderId: str
    orderCode: str
    placedAt: str
    services: List[str] = Field(default_factory=list)
    itemCount: int = 1
    totalAmount: float = 0.0
    discountSaved: float = 0.0
    deliverySaved: float = 0.0
    totalSaved: float = 0.0
    status: str = "completed"


class MembershipPlansResponse(BaseModel):
    plans: List[MembershipPlan] = Field(default_factory=list)
    currentPlanId: str = "free"


class MembershipBenefitsResponse(BaseModel):
    items: List[MembershipBenefit] = Field(default_factory=list)
    activeBenefits: List[MembershipBenefit] = Field(default_factory=list)
    planId: str = "free"


class MembershipResponse(BaseModel):
    planId: str = "free"
    planName: str = "Free"
    status: MembershipStatus = "none"
    active: bool = False
    billingCycle: Optional[BillingCycle] = None
    amountPaid: int = 0
    startedAt: Optional[str] = None
    expiresAt: Optional[str] = None
    cancelledAt: Optional[str] = None
    autoRenew: bool = False
    remainingDays: int = 0
    canRenew: bool = True
    canCancel: bool = False
    plan: Optional[MembershipPlan] = None
    benefits: List[MembershipBenefit] = Field(default_factory=list)
    quota: MembershipQuota = Field(default_factory=MembershipQuota)
    membershipOrders: List[MembershipOrderLog] = Field(default_factory=list)



class MembershipTransaction(BaseModel):
    id: str
    userId: Optional[str] = None
    userName: Optional[str] = None
    planId: str
    planName: str
    type: TransactionType = "subscribe"
    billingCycle: BillingCycle = "monthly"
    amount: int = 0
    paymentStatus: PaymentStatus = "paid"
    paymentReference: Optional[str] = None
    subscribedAt: str
    renewalAt: Optional[str] = None
    expiresAt: Optional[str] = None


class MembershipHistoryResponse(BaseModel):
    items: List[MembershipTransaction] = Field(default_factory=list)
    total: int = 0


class SubscribePayload(BaseModel):
    planId: str
    billingCycle: BillingCycle = "monthly"
    paymentReference: Optional[str] = Field(default=None, max_length=120)


class SubscribeResponse(BaseModel):
    ok: bool = True
    message: str = ""
    membership: MembershipResponse
    transaction: Optional[MembershipTransaction] = None


class CancelPayload(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=240)


class CancelResponse(BaseModel):
    ok: bool = True
    message: str = ""
    membership: MembershipResponse


class MembershipRazorpayOrderPayload(BaseModel):
    planId: str
    billingCycle: BillingCycle = "monthly"


class MembershipRazorpayOrderResponse(BaseModel):
    ok: bool = True
    keyId: str
    gatewayOrderId: str
    amount: float
    currency: str = "INR"
    planId: str
    planName: str
    billingCycle: str


class MembershipRazorpayVerifyPayload(BaseModel):
    razorpayOrderId: str
    razorpayPaymentId: str
    razorpaySignature: str
    planId: str
    billingCycle: BillingCycle = "monthly"


class MembershipRazorpayVerifyResponse(BaseModel):
    ok: bool = True
    message: str = "Membership activated successfully."
    membership: MembershipResponse
    transaction: Optional[MembershipTransaction] = None


# ---------------------------------------------------------------- Admin Models

class AdminPlanPayload(BaseModel):
    id: Optional[str] = None
    name: str
    tagline: str = ""
    monthlyPrice: int = 0
    quarterlyPrice: int = 0
    yearlyPrice: int = 0
    validityDays: int = 30
    yearlyValidityDays: int = 365
    popular: bool = False
    status: str = "Active"
    badge: str = ""
    color: str = "emerald"
    order: int = 0
    discountPercent: int = 0
    cashbackPercent: int = 0
    freeDeliveryMinOrder: int = 0
    freePickup: bool = False
    priorityProcessing: bool = False
    surgeWaiver: bool = False
    supportTier: str = "Standard"
    monthlyOrderLimit: int = 0
    monthlyWeightLimitKg: int = 0
    freeExpressCount: int = 0
    description: str = ""
    benefits: List[MembershipBenefit] = Field(default_factory=list)


class AdminGrantPayload(BaseModel):
    planId: str
    billingCycle: BillingCycle = "monthly"
    validityDays: Optional[int] = None
    reason: Optional[str] = None


class MembershipSubscriberItem(BaseModel):
    userId: str
    userName: str
    userPhone: str
    userEmail: str
    planId: str
    planName: str
    status: str
    billingCycle: str
    amountPaid: int
    startedAt: Optional[str] = None
    expiresAt: Optional[str] = None
    autoRenew: bool = False
    remainingDays: int = 0
    totalOrders: int = 0
    totalSaved: float = 0.0
    city: Optional[str] = None


class MembershipSubscribersResponse(BaseModel):
    items: List[MembershipSubscriberItem] = Field(default_factory=list)
    total: int = 0


class MembershipStatsResponse(BaseModel):
    totalSubscribers: int = 0
    activeMembers: int = 0
    monthlyRecurringRevenue: int = 0
    annualRunRate: int = 0
    topPlanName: str = "Gold"
    expiringSoonCount: int = 0
    totalSavingsGiven: float = 0.0
    memberOrdersCount: int = 0
    averageLtv: float = 0.0
    tierBreakdown: Dict[str, int] = Field(default_factory=dict)
