"""Production payment, wallet, settlement and admin models — Phase 5 · Sprint 5.6.

These mirror `shared/src/types/payment.ts` field-for-field (camelCase JSON) so
the frontend needs zero changes when it is pointed at this FastAPI service
instead of the mock router (`backend/src/mock/payment-routes.ts`).
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

PaymentGateway = Literal["cashfree", "wallet", "cod", "mixed", "razorpay"]
GatewayPaymentStatus = Literal[
    "created",
    "authorized",
    "captured",
    "paid",
    "failed",
    "refunded",
    "partially_refunded",
    "cancelled",
    "user_dropped",
]
LedgerDirection = Literal["credit", "debit"]
LedgerReason = Literal[
    "order-payment",
    "wallet-topup",
    "refund",
    "cashback",
    "settlement",
    "withdrawal",
    "incentive",
    "adjustment",
    "penalty",
]
LedgerStatus = Literal["success", "pending", "failed"]
GatewayRefundStatus = Literal["requested", "approved", "processing", "processed", "rejected", "failed"]
SettlementStatus = Literal["pending", "approved", "processing", "settled", "rejected"]
WithdrawalStatus = Literal["requested", "approved", "processing", "paid", "rejected"]
AccountRole = Literal["customer", "partner", "rider", "admin"]


class CashfreeConfig(BaseModel):
    appId: str
    env: Literal["SANDBOX", "PROD"]
    apiVersion: str = "2023-08-01"
    enabled: bool
    currency: str = "INR"


class CashfreeCreateOrderPayload(BaseModel):
    amount: float = Field(gt=0, le=1_000_000)
    orderId: Optional[str] = None
    walletAmount: Optional[float] = 0.0
    purpose: Optional[str] = "Order payment"
    customerPhone: Optional[str] = None
    customerEmail: Optional[str] = None
    customerName: Optional[str] = None
    returnUrl: Optional[str] = None


class CashfreeOrderResult(BaseModel):
    ok: bool = True
    paymentId: str
    orderId: str
    cfOrderId: Optional[str] = None
    paymentSessionId: Optional[str] = None
    amount: float
    walletApplied: float = 0.0
    payableAmount: float
    fullyPaidByWallet: bool = False
    currency: str = "INR"
    env: str = "SANDBOX"
    customerDetails: Dict[str, Any] = Field(default_factory=dict)


class CashfreeVerifyPayload(BaseModel):
    paymentId: Optional[str] = None
    orderId: str
    cfOrderId: Optional[str] = None


class CashfreeRefundPayload(BaseModel):
    orderId: str
    paymentId: Optional[str] = None
    amount: float
    reason: str = "Customer cancellation"
    destination: Literal["source", "wallet"] = "source"


class RazorpayConfig(BaseModel):
    keyId: str
    enabled: bool
    currency: str = "INR"
    mode: Literal["test", "live", "disabled"] = "test"


class RazorpayOrderResult(BaseModel):
    ok: bool = True
    paymentId: str
    gatewayOrderId: str
    keyId: str
    currency: str = "INR"
    amount: float
    walletApplied: float
    payableAmount: float
    amountInPaise: int
    fullyPaidByWallet: bool
    receipt: str
    notes: Dict[str, str] = Field(default_factory=dict)


class GatewayPayment(BaseModel):
    id: str
    orderId: Optional[str] = None
    accountId: str
    gateway: PaymentGateway
    status: GatewayPaymentStatus
    amount: float
    walletAmount: float = 0
    gatewayAmount: float = 0
    currency: str = "INR"
    gatewayOrderId: Optional[str] = None
    gatewayPaymentId: Optional[str] = None
    signatureVerified: bool = False
    purpose: str = "Order payment"
    failureReason: Optional[str] = None
    refundedAmount: float = 0
    createdAt: str
    updatedAt: str


class RazorpaySuccessPayload(BaseModel):
    paymentId: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class SimulateCheckoutPayload(BaseModel):
    gatewayOrderId: str


class PaymentVerificationResult(BaseModel):
    ok: bool
    verified: bool
    message: str
    payment: GatewayPayment


class CreateOrderPayload(BaseModel):
    amount: float = Field(gt=0, le=1_000_000)
    orderId: Optional[str] = None
    purpose: str = "Order payment"
    walletAmount: float = 0
    savedMethodId: Optional[str] = None


class PaymentFailurePayload(BaseModel):
    paymentId: str
    reason: Optional[str] = None
    code: Optional[str] = None


class RefundRequestPayload(BaseModel):
    amount: Optional[float] = None
    reason: str = "Customer requested a refund"
    destination: Literal["source", "wallet"] = "source"


class WalletLedgerEntry(BaseModel):
    id: str
    accountId: str
    role: Literal["customer", "partner", "rider"]
    direction: LedgerDirection
    reason: LedgerReason
    amount: float
    balanceAfter: float
    currency: str = "INR"
    reference: Optional[str] = None
    orderId: Optional[str] = None
    paymentId: Optional[str] = None
    note: str = ""
    status: LedgerStatus = "success"
    createdAt: str
    dateLabel: str


class WalletLedgerResult(BaseModel):
    entries: List[WalletLedgerEntry] = Field(default_factory=list)
    balance: float = 0
    pending: float = 0
    lifetimeCredit: float = 0
    lifetimeDebit: float = 0
    currency: str = "INR"


class WalletCreditPayload(BaseModel):
    reason: LedgerReason = "wallet-topup"
    amount: float = Field(gt=0)
    note: str = "Wallet credited"
    reference: Optional[str] = None


class WalletTopupPayload(BaseModel):
    amount: float = Field(gt=0)


class GatewayRefund(BaseModel):
    id: str
    paymentId: str
    orderId: Optional[str] = None
    accountId: str
    amount: float
    reason: str
    status: GatewayRefundStatus
    gatewayRefundId: Optional[str] = None
    destination: Literal["source", "wallet"] = "source"
    createdAt: str
    updatedAt: str
    dateLabel: str
    timeline: List[Dict[str, str]] = Field(default_factory=list)


class Settlement(BaseModel):
    id: str
    accountId: str
    role: Literal["partner", "rider"]
    periodStart: str
    periodEnd: str
    periodLabel: str
    orders: int
    grossAmount: float
    commission: float
    taxDeducted: float
    incentives: float
    netAmount: float
    status: SettlementStatus
    utr: Optional[str] = None
    settledAt: Optional[str] = None
    createdAt: str


class SettlementResult(BaseModel):
    items: List[Settlement] = Field(default_factory=list)
    totalSettled: float = 0
    totalPending: float = 0
    currency: str = "INR"


class WithdrawalRequest(BaseModel):
    id: str
    accountId: str
    role: Literal["partner", "rider"]
    amount: float
    method: Literal["bank", "upi"]
    destination: str
    status: WithdrawalStatus
    requestedAt: str
    processedAt: Optional[str] = None
    rejectionReason: Optional[str] = None
    reference: Optional[str] = None
    dateLabel: str


class WithdrawalResult(BaseModel):
    items: List[WithdrawalRequest] = Field(default_factory=list)
    available: float = 0
    pendingAmount: float = 0
    minimumAmount: float = 100
    currency: str = "INR"


class CreateWithdrawalPayload(BaseModel):
    amount: float = Field(gt=0)
    method: Literal["bank", "upi"] = "bank"
    destination: str = "Primary bank account"


class EarningsBreakdown(BaseModel):
    today: float = 0
    week: float = 0
    month: float = 0
    lifetime: float = 0
    orders: int = 0
    averagePerOrder: float = 0
    commissionRate: float = 0.18
    pendingSettlement: float = 0
    currency: str = "INR"
    series: List[Dict[str, float]] = Field(default_factory=list)


class RiderIncentive(BaseModel):
    id: str
    title: str
    description: str
    target: int
    progress: int
    reward: float
    status: Literal["active", "completed", "expired"]
    expiresAt: str


class AdminPaymentKpis(BaseModel):
    grossVolume: float = 0
    successfulPayments: int = 0
    failedPayments: int = 0
    successRate: float = 100
    refundedAmount: float = 0
    refundCount: int = 0
    walletFloat: float = 0
    pendingSettlements: int = 0
    pendingWithdrawals: int = 0
    currency: str = "INR"


class AdminPaymentDashboard(BaseModel):
    kpis: AdminPaymentKpis
    recentPayments: List[GatewayPayment] = Field(default_factory=list)
    gatewayMode: Literal["test", "live", "disabled"] = "test"
    series: List[Dict[str, float]] = Field(default_factory=list)


class AdminWalletMonitorRow(BaseModel):
    accountId: str
    name: str
    role: Literal["customer", "partner", "rider"]
    balance: float
    pending: float
    lifetimeCredit: float
    lifetimeDebit: float
    lastActivityAt: Optional[str] = None
    flagged: bool = False


class ApproveSettlementPayload(BaseModel):
    utr: Optional[str] = None


class RejectReasonPayload(BaseModel):
    reason: str = ""


class ApproveWithdrawalPayload(BaseModel):
    reference: Optional[str] = None
