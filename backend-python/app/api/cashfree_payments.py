"""Cashfree Payment Gateway API Router for QuickPress.

Official v2023-08-01 PG endpoints for Customer App, Webhook, and Admin Management.
"""

from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.core.deps import current_user
from app.models.payment import (
    CashfreeConfig,
    CashfreeCreateOrderPayload,
    CashfreeOrderResult,
    CashfreeRefundPayload,
    CashfreeVerifyPayload,
)
from app.models.user import User
from app.services import cashfree_payments_service as service
from app.services.cashfree_client import CashfreeError
from app.services.cashfree_payments_service import CashfreePaymentServiceError

router = APIRouter(prefix="/payments/cashfree", tags=["cashfree-payments"])


def _handle_error(err: Any) -> HTTPException:
    status_code = getattr(err, "status_code", 400)
    message = getattr(err, "message", str(err))
    return HTTPException(status_code=status_code, detail=message)


@router.get("/config", response_model=CashfreeConfig)
async def get_config() -> CashfreeConfig:
    """Public publishable configuration for frontend SDK initialization."""
    cfg = await service.get_payment_config()
    return CashfreeConfig(**cfg)


@router.post("/order", response_model=CashfreeOrderResult)
async def create_order(
    payload: CashfreeCreateOrderPayload,
    user: User = Depends(current_user),
) -> CashfreeOrderResult:
    """Create a Cashfree PG order and retrieve in-app payment_session_id."""
    try:
        result = await service.create_cashfree_order(user, payload.model_dump())
        return CashfreeOrderResult(**result)
    except (CashfreePaymentServiceError, CashfreeError) as exc:
        raise _handle_error(exc) from exc


@router.post("/verify")
async def verify_payment(
    payload: CashfreeVerifyPayload,
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Verify payment server-to-server with Cashfree and advance order status."""
    try:
        return await service.verify_cashfree_payment(user, payload.model_dump())
    except (CashfreePaymentServiceError, CashfreeError) as exc:
        raise _handle_error(exc) from exc


@router.get("/status/{order_id}")
async def get_payment_status(
    order_id: str,
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Check live status of payment for an order."""
    try:
        return await service.get_payment_status(user, order_id)
    except (CashfreePaymentServiceError, CashfreeError) as exc:
        raise _handle_error(exc) from exc


@router.post("/retry")
async def retry_payment(
    payload: Dict[str, Any],
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Re-issue a fresh payment session for a failed or pending order."""
    order_id = payload.get("orderId")
    if not order_id:
        raise HTTPException(status_code=400, detail="orderId is required.")
    try:
        return await service.retry_cashfree_order(user, str(order_id))
    except (CashfreePaymentServiceError, CashfreeError) as exc:
        raise _handle_error(exc) from exc


@router.post("/webhook")
async def cashfree_webhook(
    request: Request,
    x_webhook_signature: str = Header("", alias="x-webhook-signature"),
    x_webhook_timestamp: str = Header("", alias="x-webhook-timestamp"),
) -> Dict[str, Any]:
    """Public webhook receiver for Cashfree server-to-server events."""
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    try:
        return await service.handle_cashfree_webhook(
            event_payload=payload,
            raw_body=raw_body,
            signature=x_webhook_signature,
            timestamp=x_webhook_timestamp,
        )
    except (CashfreePaymentServiceError, CashfreeError) as exc:
        raise _handle_error(exc) from exc


@router.post("/refund")
async def refund_order_payment(
    payload: CashfreeRefundPayload,
    user: User = Depends(current_user),
) -> Dict[str, Any]:
    """Initiate a full or partial refund to source or wallet."""
    try:
        return await service.refund_cashfree_payment(user, payload.model_dump())
    except (CashfreePaymentServiceError, CashfreeError) as exc:
        raise _handle_error(exc) from exc
