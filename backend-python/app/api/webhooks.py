"""Public gateway webhooks router.

Supports Cashfree server-to-server events (v2023-08-01 HMAC-SHA256 verified)
and legacy webhook backwards-compatibility.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Header, HTTPException, Request, status

from app.services import cashfree_payments_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhooks"])


@router.post("/public/webhooks/cashfree")
async def cashfree_webhook_public(
    request: Request,
    x_webhook_signature: str = Header("", alias="x-webhook-signature"),
    x_webhook_timestamp: str = Header("", alias="x-webhook-timestamp"),
) -> dict:
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload.")

    try:
        return await cashfree_payments_service.handle_cashfree_webhook(
            event_payload=payload,
            raw_body=raw_body,
            signature=x_webhook_signature,
            timestamp=x_webhook_timestamp,
        )
    except cashfree_payments_service.CashfreePaymentServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.post("/public/webhooks/razorpay")
async def razorpay_webhook_public(
    request: Request,
    x_razorpay_signature: str = Header("", alias="x-razorpay-signature"),
) -> dict:
    """Public Razorpay webhook endpoint with signature verification."""
    from app.api.razorpay import razorpay_webhook
    return await razorpay_webhook(request=request, x_razorpay_signature=x_razorpay_signature)
