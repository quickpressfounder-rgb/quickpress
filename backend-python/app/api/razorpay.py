"""Razorpay gateway routes — Phase 5 · Sprint 5.6.

Endpoints:
- GET  /api/payments/razorpay/config
- POST /api/payments/razorpay/order
- POST /api/payments/razorpay/verify
- POST /api/payments/razorpay/failure
- POST /api/payments/razorpay/simulate
- POST /api/payments/razorpay/webhook
- GET  /api/payments/gateway
- GET  /api/payments/gateway/{payment_id}
- POST /api/payments/{payment_id}/refund
- GET  /api/refunds
- GET  /api/refunds/{refund_id}
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.core.deps import current_user
from app.db import payment_repositories as repo
from app.db.client import database
from app.models.payment import (
    CreateOrderPayload,
    GatewayPayment,
    PaymentFailurePayload,
    PaymentVerificationResult,
    RazorpayConfig,
    RazorpayOrderResult,
    RazorpaySuccessPayload,
    RefundRequestPayload,
    SimulateCheckoutPayload,
)
from app.models.user import User
from app.services import razorpay_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["razorpay-payments"])

WEBHOOK_EVENTS_COLL = "processed_webhook_events"


def _fail(error: repo.PaymentError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.get("/payments/razorpay/config", response_model=RazorpayConfig)
async def razorpay_config() -> RazorpayConfig:
    """Publishable Razorpay client configuration."""
    return RazorpayConfig(**repo.config())


@router.post("/payments/razorpay/order", response_model=RazorpayOrderResult)
async def create_order(
    payload: CreateOrderPayload,
    user: User = Depends(current_user),
) -> RazorpayOrderResult:
    """Create a server-side Razorpay order and debit any requested wallet portion."""
    try:
        result = await repo.create_order(user, payload.model_dump())
    except repo.PaymentError as error:
        raise _fail(error) from error
    return RazorpayOrderResult(**result)


@router.post("/payments/razorpay/verify", response_model=PaymentVerificationResult)
async def verify_payment(
    payload: RazorpaySuccessPayload,
    user: User = Depends(current_user),
) -> PaymentVerificationResult:
    """Verify Razorpay payment signature cryptographically server-to-server."""
    try:
        result = await repo.verify_payment(user, payload.model_dump())
    except repo.PaymentError as error:
        raise _fail(error) from error
    return PaymentVerificationResult(**result)


@router.post("/payments/razorpay/failure")
async def record_failure(
    payload: PaymentFailurePayload,
    user: User = Depends(current_user),
) -> dict:
    """Persist client-reported failure or checkout dismissal."""
    try:
        return await repo.record_failure(user, payload.model_dump())
    except repo.PaymentError as error:
        raise _fail(error) from error


@router.post("/payments/razorpay/simulate", response_model=RazorpaySuccessPayload)
async def simulate_checkout(
    payload: SimulateCheckoutPayload,
    user: User = Depends(current_user),
) -> RazorpaySuccessPayload:
    """TEST-MODE ONLY mock signature generator for local automated test suites."""
    try:
        return RazorpaySuccessPayload(**await repo.simulate_checkout(user, payload.gatewayOrderId))
    except repo.PaymentError as error:
        raise _fail(error) from error


@router.post("/payments/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header("", alias="x-razorpay-signature"),
) -> dict:
    """Public Razorpay server-to-server webhook handler.

    Verifies HMAC-SHA256 signature using RAZORPAY_WEBHOOK_SECRET and updates
    payment/order states idempotently.
    """
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload.")

    cfg = razorpay_client.get_pg_config()
    if cfg["is_configured"] and cfg["webhook_secret"]:
        if not x_razorpay_signature or not razorpay_client.verify_webhook_signature(
            raw_body=raw_body,
            signature=x_razorpay_signature,
            secret=cfg["webhook_secret"],
        ):
            logger.warning("Razorpay webhook signature mismatch.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature.")

    event_id = payload.get("event_id") or payload.get("id") or f"evt_{hash(raw_body)}"
    event_type = payload.get("event") or ""

    # Idempotency check
    existing = await database.find_one(WEBHOOK_EVENTS_COLL, {"_id": event_id})
    if existing:
        logger.info("Razorpay webhook event %s already processed. Skipping.", event_id)
        return {"ok": True, "status": "already_processed", "eventId": event_id}

    await database.collection(WEBHOOK_EVENTS_COLL).insert_one(
        {
            "_id": event_id,
            "event_type": event_type,
            "gateway": "razorpay",
            "payload": payload,
            "processed_at": repo.now_iso(),
        }
    )

    logger.info("Processing Razorpay webhook event: %s (%s)", event_type, event_id)

    # Handle payment events
    entity = (payload.get("payload") or {}).get("payment", {}).get("entity", {})
    if not entity:
        entity = (payload.get("payload") or {}).get("order", {}).get("entity", {})

    rzp_payment_id = entity.get("id")
    rzp_order_id = entity.get("order_id")

    if event_type in ("payment.captured", "order.paid") and rzp_order_id:
        link = await database.find_one(repo.ORDER_SECRETS, {"_id": rzp_order_id})
        if link:
            payment_doc = await repo._payment_doc(link["paymentId"])
            if payment_doc and payment_doc.get("status") != "paid":
                payment_doc["status"] = "paid"
                payment_doc["signatureVerified"] = True
                payment_doc["gatewayPaymentId"] = rzp_payment_id or payment_doc.get("gatewayPaymentId")
                await repo._save_payment(payment_doc)
                await repo.mark_order_paid(payment_doc.get("orderId"), payment_doc)
                logger.info("Razorpay webhook marked payment %s as paid", payment_doc["_id"])

    elif event_type == "payment.failed" and rzp_order_id:
        link = await database.find_one(repo.ORDER_SECRETS, {"_id": rzp_order_id})
        if link:
            payment_doc = await repo._payment_doc(link["paymentId"])
            if payment_doc and payment_doc.get("status") not in ("paid", "failed"):
                payment_doc["status"] = "failed"
                payment_doc["failureReason"] = entity.get("error_description") or "Payment failed at Razorpay."
                await repo._save_payment(payment_doc)
                logger.info("Razorpay webhook marked payment %s as failed", payment_doc["_id"])

    return {"ok": True, "status": "processed", "event": event_type}


# Gateway payment history
@router.get("/payments/gateway")
async def list_gateway_payments(user: User = Depends(current_user)) -> dict:
    return await repo.payments_for(user)


@router.get("/payments/gateway/{payment_id}", response_model=GatewayPayment)
async def get_gateway_payment(
    payment_id: str,
    user: User = Depends(current_user),
) -> GatewayPayment:
    try:
        return GatewayPayment(**await repo.payment_by_id(payment_id, user))
    except repo.PaymentError as error:
        raise _fail(error) from error


@router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    payload: RefundRequestPayload,
    user: User = Depends(current_user),
) -> dict:
    try:
        return await repo.create_refund(user, payment_id, payload.model_dump())
    except repo.PaymentError as error:
        raise _fail(error) from error


@router.get("/refunds")
async def list_refunds(user: User = Depends(current_user)) -> dict:
    return await repo.list_refunds(user.id)


@router.get("/refunds/{refund_id}")
async def get_refund(refund_id: str, user: User = Depends(current_user)) -> dict:
    try:
        return await repo.refund_by_id(refund_id)
    except repo.PaymentError as error:
        raise _fail(error) from error
