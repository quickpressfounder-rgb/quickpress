"""Wallet / payment models — Sprint 2.10.

Every response model is camelCase because it is consumed directly by the
customer frontend (`@backend/customer/wallet-api`, `payments-api`).
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

PaymentKind = Literal[
    "cod", "wallet", "razorpay", "upi", "card", "credit-card", "debit-card", "netbanking", "instant"
]
TransactionDirection = Literal["credit", "debit"]
TransactionStatus = Literal["success", "pending", "failed"]
PaymentStatus = Literal["created", "pending", "paid", "failed", "refunded", "cancelled"]
RefundStatus = Literal["requested", "processing", "completed", "rejected"]
TransactionKind = Literal[
    "add-funds",
    "order-payment",
    "refund",
    "order-cashback",
    "referral-bonus",
    "reward-credit",
    "membership-credit",
    "recharge",
]

#: Online rails are wired end-to-end but stay disabled until production
#: gateway credentials are configured (Sprint 3).
ONLINE_KINDS: List[str] = ["razorpay", "upi", "credit-card", "debit-card"]


class WalletBalances(BaseModel):
    currentBalance: float = 0
    pendingBalance: float = 0
    rewardBalance: float = 0
    membershipCredits: float = 0
    currency: str = "INR"


class WalletTransaction(BaseModel):
    id: str
    kind: str = "add-funds"
    title: str = ""
    description: str = ""
    amount: float = 0
    direction: str = "credit"
    status: str = "success"
    balanceAfter: float = 0
    method: Optional[str] = None
    reference: Optional[str] = None
    createdAt: str = ""


class WalletResponse(BaseModel):
    balances: WalletBalances = Field(default_factory=WalletBalances)
    totalBalance: float = 0
    recentTransactions: List[WalletTransaction] = Field(default_factory=list)
    updatedAt: Optional[str] = None
    #: Mirrored from Sprint 2.8 so the wallet screen's refer-and-earn block
    #: keeps rendering without a second round trip.
    referralCode: str = ""
    referralEarned: float = 0


class WalletHistoryResponse(BaseModel):
    items: List[WalletTransaction] = Field(default_factory=list)
    total: int = 0


class AddFundsPayload(BaseModel):
    amount: float = Field(gt=0, le=100_000)
    #: `wallet` = internal top-up (dev/demo). Online kinds are rejected until
    #: production gateway credentials exist.
    method: PaymentKind = "wallet"
    paymentReference: Optional[str] = Field(default=None, max_length=120)


class PaymentRecord(BaseModel):
    id: str
    amount: float = 0
    method: PaymentKind = "wallet"
    methodLabel: str = ""
    status: PaymentStatus = "created"
    purpose: str = "order"
    orderId: Optional[str] = None
    transactionId: str = ""
    gateway: Optional[str] = None
    gatewayOrderId: Optional[str] = None
    failureReason: Optional[str] = None
    createdAt: str
    updatedAt: Optional[str] = None


class AddFundsResponse(BaseModel):
    ok: bool = True
    message: str = ""
    wallet: WalletResponse
    transaction: WalletTransaction
    payment: Optional[PaymentRecord] = None


class PaymentMethod(BaseModel):
    id: str
    kind: PaymentKind
    name: str
    masked: str = ""
    note: str = ""
    isDefault: bool = False
    enabled: bool = True
    createdAt: Optional[str] = None


class PaymentProvider(BaseModel):
    id: str
    kind: PaymentKind
    name: str
    tagline: str = ""
    initials: str = ""
    enabled: bool = False
    comingSoon: bool = False


class PaymentMethodsResponse(BaseModel):
    #: `methods` is the canonical field; `items` is kept as an alias for the
    #: pre-2.10 clients that read a flat list.
    methods: List[PaymentMethod] = Field(default_factory=list)
    items: List[PaymentMethod] = Field(default_factory=list)
    providers: List[PaymentProvider] = Field(default_factory=list)
    onlinePaymentsEnabled: bool = False


class PaymentMethodPayload(BaseModel):
    kind: PaymentKind
    name: str = Field(min_length=1, max_length=60)
    masked: str = Field(default="", max_length=40)
    isDefault: bool = False


class PaymentMethodPatch(BaseModel):
    kind: Optional[PaymentKind] = None
    name: Optional[str] = Field(default=None, max_length=60)
    masked: Optional[str] = Field(default=None, max_length=40)
    isDefault: Optional[bool] = None


class SimpleOkResponse(BaseModel):
    ok: bool = True
    message: str = ""


class CreatePaymentPayload(BaseModel):
    amount: float = Field(gt=0, le=500_000)
    method: PaymentKind = "cod"
    orderId: Optional[str] = Field(default=None, max_length=64)
    purpose: str = Field(default="order", max_length=40)
    paymentReference: Optional[str] = Field(default=None, max_length=120)


class CreatePaymentResponse(BaseModel):
    ok: bool = True
    message: str = ""
    payment: PaymentRecord
    wallet: Optional[WalletResponse] = None


class Refund(BaseModel):
    id: str
    paymentId: Optional[str] = None
    orderId: Optional[str] = None
    amount: float = 0
    reason: str = ""
    status: RefundStatus = "requested"
    createdAt: str
    processedAt: Optional[str] = None


class RefundsResponse(BaseModel):
    items: List[Refund] = Field(default_factory=list)
    total: int = 0
    totalAmount: float = 0
