"""Partner domain models — Sprint 5.2 (MongoDB integration).

These mirror `shared/src/types/partner.ts` byte-for-byte so the
partner-frontend consumes identical payloads from the mock TS server and
FastAPI + MongoDB.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

PartnerOrderStatus = Literal[
    "new", "accepted", "picked", "processing", "ready", "delivered", "cancelled"
]

BusinessCategory = Literal["laundry", "dry-clean", "premium", "shoe-care"]


class PartnerOrderItem(BaseModel):
    id: str = ""
    name: str = "Laundry Item"
    qty: int = 1
    price: float = 0


class PartnerOrderTimelineStage(BaseModel):
    id: str = ""
    label: str = ""
    time: str = "—"
    done: bool = False


class PartnerOrderResponse(BaseModel):
    id: str
    code: str = ""
    customerName: str = "Customer"
    customerPhone: str = ""
    status: str = "new"
    placedAt: str = ""
    slot: str = ""
    address: str = ""
    itemCount: int = 1
    amount: float = 0
    paymentMode: str = "cod"
    paymentStatus: Optional[str] = "pending"
    serviceLabel: str = "Laundry"
    dispatchOtp: Optional[str] = ""
    dispatchOtpVerified: bool = False
    dispatchOtpRequired: bool = False
    items: List[PartnerOrderItem] = []
    timeline: List[PartnerOrderTimelineStage] = []


class RejectOrderPayload(BaseModel):
    reason: str = ""


class PartnerProfileResponse(BaseModel):
    partnerId: str
    id: Optional[str] = None
    businessName: str = "QuickPress Partner Store"
    ownerName: str = "Partner"
    phone: str = ""
    email: str = ""
    city: str = "Bengaluru"
    rating: float = 5.0
    totalOrders: int = 0
    joinedOn: str = "August 2026"
    onTimeRate: float = 98.5
    tier: Literal["Bronze", "Silver", "Platinum", "Gold"] = "Silver"
    isVerified: bool = False
    status: str = "pending"
    logo: Optional[str] = None
    logoUrl: Optional[str] = None
    banner: Optional[str] = None
    bannerUrl: Optional[str] = None
    cover: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    gallery: List[str] = []

    def model_post_init(self, __context: any) -> None:
        if not self.id:
            self.id = self.partnerId
        if not self.logo and self.logoUrl:
            self.logo = self.logoUrl
        if not self.logoUrl and self.logo:
            self.logoUrl = self.logo
        if not self.banner and self.bannerUrl:
            self.banner = self.bannerUrl
        if not self.bannerUrl and self.banner:
            self.bannerUrl = self.banner
        if not self.cover and (self.banner or self.bannerUrl):
            self.cover = self.banner or self.bannerUrl
        if not self.image and (self.logo or self.logoUrl):
            self.image = self.logo or self.logoUrl


class PartnerProfileUpdate(BaseModel):
    businessName: Optional[str] = None
    ownerName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    logo: Optional[str] = None
    logoUrl: Optional[str] = None
    banner: Optional[str] = None
    bannerUrl: Optional[str] = None
    cover: Optional[str] = None
    image: Optional[str] = None
    gallery: Optional[List[str]] = None


class BusinessSettingsResponse(BaseModel):
    isStoreOpen: bool = True
    acceptingNewOrders: bool = True
    autoAcceptOrders: bool = True
    expressDelivery: bool = True
    pickupRadiusKm: int = 8
    openingTime: str = "08:00"
    closingTime: str = "21:00"
    weeklyOff: str = "None"
    dailyOrderCap: int = 50


class BusinessSettingsUpdate(BaseModel):
    isStoreOpen: Optional[bool] = None
    acceptingNewOrders: Optional[bool] = None
    autoAcceptOrders: Optional[bool] = None
    expressDelivery: Optional[bool] = None
    pickupRadiusKm: Optional[int] = None
    openingTime: Optional[str] = None
    closingTime: Optional[str] = None
    weeklyOff: Optional[str] = None
    dailyOrderCap: Optional[int] = None


class PartnerServiceResponse(BaseModel):
    id: str
    name: str = "Standard Service"
    unit: str = "kg"
    price: int = 0
    turnaroundHours: int = 24
    enabled: bool = True
    category: str = "laundry"
    description: str = ""
    image: str = ""
    minQuantity: int = 1
    expressAvailable: bool = False
    pendingApproval: bool = False
    approvalStatus: str = "approved"
    rejectionReason: Optional[str] = None
    pendingChanges: Optional[Dict[str, Any]] = None


class PartnerServiceCreate(BaseModel):
    name: str
    unit: str = "kg"
    price: int
    turnaroundHours: int = 24
    enabled: bool = True
    category: str = "laundry"
    description: str = ""
    image: str = ""
    minQuantity: int = 1
    expressAvailable: bool = False
    pendingApproval: Optional[bool] = None
    approvalStatus: Optional[str] = None


class PartnerServiceUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[int] = None
    turnaroundHours: Optional[int] = None
    enabled: Optional[bool] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    minQuantity: Optional[int] = None
    expressAvailable: Optional[bool] = None
    pendingApproval: Optional[bool] = None
    approvalStatus: Optional[str] = None
    rejectionReason: Optional[str] = None
    pendingChanges: Optional[Dict[str, Any]] = None


class PartnerDashboardResponse(BaseModel):
    newOrders: int
    inProgress: int
    readyForDelivery: int
    delivered: int
    earningsToday: int


class PartnerEarningsResponse(BaseModel):
    total: int
    orders: int
    grossSales: Optional[int] = None
    commissionDeducted: Optional[int] = None
    commissionRate: Optional[float] = None
    tcsDeducted: Optional[int] = None


class PartnerWalletResponse(BaseModel):
    accountId: str
    balance: float
    cashbackBalance: float
    rewardPoints: int
    referralCode: str
    referralEarned: float
    onHold: float = 0
    lifetimeEarned: float = 0
    bankLast4: str = ""
    autoPayout: bool = True


class PartnerWalletTransactionResponse(BaseModel):
    id: str
    title: str
    date: str
    amount: float
    direction: Literal["credit", "debit"]
    status: Literal["success", "pending", "failed"]
    kind: str


class WithdrawPayload(BaseModel):
    amount: float


class PartnerReviewResponse(BaseModel):
    id: str
    partnerId: str
    customerName: str
    rating: float
    comment: str
    date: str


class PartnerNotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    date: str
    read: bool
    kind: str


class OnboardingPayload(BaseModel):
    businessName: str
    ownerName: str
    phone: Optional[str] = None
    email: Optional[str] = None
    category: BusinessCategory = "laundry"
    gstin: Optional[str] = ""
    address: str = ""
    city: str = ""
    state: Optional[str] = "Uttar Pradesh"
    area: Optional[str] = ""
    pincode: Optional[str] = ""
    servicePincodes: List[str] = Field(default_factory=list)
    sectors: List[str] = Field(default_factory=list)
    openingTime: Optional[str] = "08:00"
    closingTime: Optional[str] = "21:00"
    weeklyOff: Optional[str] = "None"
    emergencyClosing: Optional[str] = None
    services: List[Union[str, Dict[str, Any]]] = []
    pickupRadiusKm: Optional[int] = 10
    deliveryRadiusKm: Optional[int] = 10
    pan: Optional[str] = ""
    aadhaar: Optional[str] = ""
    experience: Optional[str] = ""
    accountHolder: Optional[str] = ""
    bankName: Optional[str] = ""
    accountNumber: Optional[str] = ""
    ifsc: Optional[str] = ""
    logo: Optional[str] = None
    banner: Optional[str] = None
    gallery: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    agreementSigned: Optional[bool] = False
    signatureUrl: Optional[str] = None
    signedAt: Optional[str] = None
    signedByName: Optional[str] = None
    agreementVersion: Optional[str] = "QP-SLA-2026.4"


class OnboardingResponse(BaseModel):
    partnerId: str
    phone: str
    businessName: str
    isVerified: bool
    isOnboarded: bool
