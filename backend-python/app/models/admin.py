"""Admin domain models — Sprint 5.2 (MongoDB integration).

Loose, additive pydantic models for request bodies used by the admin panel.
Most list/detail responses are returned as plain dicts (mirroring the mock
TS server's untyped JSON shapes) so the admin-frontend receives byte-for-byte
compatible payloads without over-constraining fields that differ per screen.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AssignRiderPayload(BaseModel):
    riderId: str


class CancelOrderPayload(BaseModel):
    reason: Optional[str] = None


class UpdateOrderStatusPayload(BaseModel):
    status: str
    reason: Optional[str] = None


class AdjustCustomerWalletPayload(BaseModel):
    amount: float
    reason: str


class AdjustCustomerLoyaltyPayload(BaseModel):
    points: int
    reason: str


class AddCustomerNotePayload(BaseModel):
    note: str


class UpdateCustomerTagsPayload(BaseModel):
    tags: List[str]


class SendCustomerNotificationPayload(BaseModel):
    title: str
    body: str
    channel: Optional[str] = "push"


class SuspendPartnerPayload(BaseModel):
    reason: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    internalNote: Optional[str] = None


class BlockPartnerPayload(BaseModel):
    reason: str
    internalNote: Optional[str] = None


class UpdatePartnerKycPayload(BaseModel):
    status: str
    reason: Optional[str] = None


class UpdatePartnerCommissionPayload(BaseModel):
    commissionRate: float
    serviceRates: Optional[Dict[str, float]] = None


class AdjustPartnerWalletPayload(BaseModel):
    amount: float
    reason: str


class AddPartnerNotePayload(BaseModel):
    note: str


class UpdatePartnerTagsPayload(BaseModel):

    tags: List[str]


class SendPartnerNotificationPayload(BaseModel):

    title: str
    body: str
    category: Optional[str] = "operational"


class CouponPayload(BaseModel):
    model_config = {"extra": "allow"}

    code: Optional[str] = None
    type: Optional[str] = "percentage"  # percentage | flat | free_delivery
    value: Optional[str] = None
    discountPct: Optional[float] = 0.0
    maxDiscount: Optional[float] = None
    flatDiscount: Optional[float] = 0.0
    minOrder: Optional[float] = 0.0
    description: Optional[str] = None
    cities: Optional[List[str]] = Field(default_factory=list)
    pincodes: Optional[List[str]] = Field(default_factory=list)
    audience: Optional[str] = "All Users"  # All Users | New Customers | Returning Customers | VIP Members
    perUserLimit: Optional[int] = 1
    limit: Optional[int] = 500
    startDate: Optional[str] = None
    expiry: Optional[str] = None
    validTill: Optional[str] = None
    status: Optional[str] = "Active"  # Active | Paused | Expired | Scheduled
    badge: Optional[str] = None
    discount: Optional[str] = None

class CreatePartnerPayload(BaseModel):
    businessName: str
    ownerName: str
    phone: str
    email: Optional[str] = None
    city: str
    zone: Optional[str] = "Main Zone"
    address: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    commissionRate: Optional[float] = 18.0


class AdminPartnerUpdatePayload(BaseModel):

    businessName: Optional[str] = None
    ownerName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    pincode: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    gstin: Optional[str] = None
    experience: Optional[str] = None
    bankName: Optional[str] = None
    accountHolder: Optional[str] = None
    accountNumber: Optional[str] = None
    ifsc: Optional[str] = None
    openingTime: Optional[str] = None
    closingTime: Optional[str] = None
    weeklyOff: Optional[str] = None
    pickupRadiusKm: Optional[int] = None
    deliveryRadiusKm: Optional[int] = None
    status: Optional[str] = None
    isVerified: Optional[bool] = None


class AdminRiderUpdatePayload(BaseModel):
    fullName: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    vehicleType: Optional[str] = None
    vehicleNumber: Optional[str] = None
    vehicle: Optional[str] = None
    plate: Optional[str] = None
    bankName: Optional[str] = None
    accountLast4: Optional[str] = None
    ifsc: Optional[str] = None
    status: Optional[str] = None
    kycStatus: Optional[str] = None
    isOnline: Optional[bool] = None


class AdjustRiderWalletPayload(BaseModel):
    amount: float
    reason: str
    isCodSettlement: Optional[bool] = False


class VerifyRiderDocumentPayload(BaseModel):
    status: str
    reason: Optional[str] = None


class AddRiderNotePayload(BaseModel):
    note: str


class SendRiderNotificationPayload(BaseModel):
    title: str
    body: str


class StaffPayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    scope: Optional[str] = None
    permissions: Optional[List[str]] = None
    status: Optional[str] = None


class StaffPermissionsPayload(BaseModel):
    permissions: List[str]


class StaffStatusPayload(BaseModel):
    status: str
    reason: Optional[str] = None


class StaffRegisterPayload(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    phone: Optional[str] = None
    password: str = Field(..., min_length=6)
    role: Optional[str] = "Operations Admin"
    scope: Optional[str] = "All India Hubs"


class StaffVerifyEmailPayload(BaseModel):
    email: str
    otp: str


class AdminLoginPayload(BaseModel):
    email: str
    password: str


class Admin2FAPayload(BaseModel):
    challengeId: str
    otp: str



class CityPayload(BaseModel):
    city: Optional[str] = None
    name: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    areas: Optional[int] = None
    pickupRadius: Optional[str] = None
    deliveryRadiusKm: Optional[float] = None
    baseDeliveryFee: Optional[float] = None
    surgeMultiplier: Optional[float] = None
    tier: Optional[str] = "Tier-2"
    status: Optional[str] = "Live"
    pincodes: Optional[List[str]] = None
    zones: Optional[List[dict]] = None
    model_config = {"extra": "allow"}



class ServicePayload(BaseModel):
    name: Optional[str] = None
    categoryId: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    description: Optional[str] = None


class CreateSupportTicketPayload(BaseModel):
    subject: str
    description: Optional[str] = None
    role: Optional[str] = "Customer"
    raisedBy: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    userId: Optional[str] = None
    partnerId: Optional[str] = None
    riderId: Optional[str] = None
    priority: Optional[str] = "Medium"
    category: Optional[str] = "General Issue"
    refOrder: Optional[str] = None
    city: Optional[str] = None
    assignee: Optional[str] = "Himanshu (Lead Admin)"


class SupportReplyPayload(BaseModel):
    body: Optional[str] = None
    isInternal: Optional[bool] = False


class SupportStatusPayload(BaseModel):
    status: str


class SupportAssignPayload(BaseModel):
    assignee: str


class SupportCompensatePayload(BaseModel):
    amount: float
    reason: Optional[str] = None


class BroadcastPayload(BaseModel):
    audience: Optional[str] = "All"
    title: Optional[str] = None
    message: Optional[str] = None
    category: Optional[str] = None
    channel: Optional[str] = None


class SettingsUpdatePayload(BaseModel):
    model_config = {"extra": "allow"}
