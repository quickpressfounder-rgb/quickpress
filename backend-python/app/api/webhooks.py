"""Public gateway webhooks router.

Supports Razorpay server-to-server events (HMAC-SHA256 verified).
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Header, HTTPException, Request, status

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhooks"])


@router.post("/public/webhooks/razorpay")
async def razorpay_webhook_public(
    request: Request,
    x_razorpay_signature: str = Header("", alias="x-razorpay-signature"),
) -> dict:
    """Public Razorpay webhook endpoint with cryptographic HMAC-SHA256 signature verification."""
    from app.api.razorpay import razorpay_webhook
    return await razorpay_webhook(request=request, x_razorpay_signature=x_razorpay_signature)

