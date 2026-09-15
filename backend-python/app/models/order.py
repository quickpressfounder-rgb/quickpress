"""Order models — Sprint 2.4 (Checkout & Order Creation).

These mirror the canonical `Order` contract in `shared/src/types/order.ts`, so
POST /api/orders and GET /api/orders/{order_id} feed the existing Order Success
and Live Tracking screens without any UI change.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel

from app.models.address import AddressType  # noqa: F401  (kept for callers)

OrderStatus = Literal[
    # Canonical lifecycle statuses (shared by customer, partner, rider, admin).
    "placed",
    "pending_partner_acceptance",
    "partner_accepted",
    "pickup_rider_assigned",
    "rider_assigned",
    "rider_searching",
    "pickup_rider_accepted",
    "rider_accepted",
    "pickup_otp_pending",
    "picked_up",
    "at_partner",
    "processing",
    "ironing",
    "ready_for_delivery",
    "ready",
    "completed",
    "delivery_rider_assigned",
    "delivery_rider_accepted",
    "dispatch_otp_pending",
    "out_for_delivery",
    "delivery_otp_pending",
    "delivered",
    "cancelled",
]


class OrderLine(BaseModel):
    id: str
    name: str
    qty: int
    price: int


class OrderAddress(BaseModel):
    label: str = "Home"
    line: str = ""
    city: str = ""
    phone: str = ""


class OrderTotals(BaseModel):
    itemsTotal: int = 0
    pickup: int = 0
    delivery: int = 0
    handling: int = 0
    gst: int = 0
    discount: int = 0
    grandTotal: int = 0


class OrderPickup(BaseModel):
    date: str = ""
    slot: str = ""
    express: bool = False


class OrderDelivery(BaseModel):
    date: str = ""
    slot: str = ""


class OrderPaymentPayload(BaseModel):
    mode: Literal["online", "cod", "wallet"] = "cod"
    label: str = "Cash on delivery"
    note: Optional[str] = None
    method: Optional[str] = None


class OrderPayment(BaseModel):
    mode: Literal["online", "cod", "wallet"] = "cod"
    label: str = "Cash on delivery"
    note: str = ""
    paid: bool = False


class OrderParty(BaseModel):
    id: str = ""
    name: str = ""
    phone: str = ""


class OrderPartnerParty(OrderParty):
    image: str = ""
    city: str = ""


class OrderRiderParty(OrderParty):
    vehicle: str = ""
    plate: str = ""
    rating: float = 0
    trips: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[Dict[str, float]] = None


class OrderEvent(BaseModel):
    id: str
    status: OrderStatus
    label: str
    at: str
    actor: Literal["customer", "partner", "rider", "admin", "system"] = "customer"


class OrderOtp(BaseModel):
    pickup: str = ""
    dispatch: str = ""
    delivery: str = ""


class PlaceOrderPayload(BaseModel):
    """POST /api/orders."""

    items: List[OrderLine] = []
    addressId: Optional[str] = None
    address: Optional[OrderAddress] = None
    partnerId: Optional[str] = None
    serviceLabel: Optional[str] = None
    pickup: OrderPickup = OrderPickup()
    delivery: Optional[OrderDelivery] = None
    payment: OrderPaymentPayload = OrderPaymentPayload()
    customerName: Optional[str] = None
    customerPhone: Optional[str] = None
    couponCode: Optional[str] = None
    couponDiscount: int = 0
    instructions: str = ""
    isExpress: Optional[bool] = False
    expressFee: Optional[float] = 0.0
    """Client generated key so a double tap can never create two orders."""
    idempotencyKey: Optional[str] = None


class OrderResponse(BaseModel):
    """The canonical order document — identical shape in mock and FastAPI."""

    model_config = {"extra": "ignore"}

    id: str = ""
    code: str = ""
    status: OrderStatus = "pending_partner_acceptance"
    createdAt: str = ""
    updatedAt: str = ""
    customer: OrderParty = OrderParty()
    partner: OrderPartnerParty = OrderPartnerParty()
    rider: Optional[OrderRiderParty] = None
    serviceLabel: str = "Laundry"
    items: List[OrderLine] = []
    totals: OrderTotals = OrderTotals()
    address: OrderAddress = OrderAddress()
    pickup: OrderPickup = OrderPickup()
    delivery: OrderDelivery = OrderDelivery()
    payment: OrderPayment = OrderPayment()
    otp: OrderOtp = OrderOtp()
    events: List[OrderEvent] = []
    cancelledReason: Optional[str] = None
    cancellationReason: Optional[str] = None
    placedAt: Optional[str] = None
    partnerAcceptedAt: Optional[str] = None
    partnerAcceptDeadline: Optional[str] = None
    partnerSlaSeconds: Optional[int] = 300
    partnerSlaRemainingSeconds: Optional[int] = None
    riderDispatchStartedAt: Optional[str] = None
    riderAcceptDeadline: Optional[str] = None
    riderSlaSeconds: Optional[int] = 180
    riderSlaRemainingSeconds: Optional[int] = None
    slaBreached: Optional[str] = None
    autoCancelled: Optional[bool] = False
    isExpress: Optional[bool] = False
    expressFee: Optional[float] = 0.0
    partnerExpressBonus: Optional[float] = 0.0
    riderExpressBonus: Optional[float] = 0.0
    expressPartnerSharePercent: Optional[float] = 20.0
    expressRiderSharePercent: Optional[float] = 80.0


class PlaceOrderResponse(BaseModel):
    """POST /api/orders — what the checkout screen needs to move on."""

    orderId: str
    orderNumber: str
    pickupEstimate: str
    deliveryEstimate: str
    order: OrderResponse


OrderRiderParty.model_rebuild()
OrderResponse.model_rebuild()
PlaceOrderResponse.model_rebuild()
