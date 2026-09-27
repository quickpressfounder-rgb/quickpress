"""Official Cashfree Payment Gateway (PG) Client for QuickPress.

Integrates Cashfree PG API v2023-08-01:
- Order & Payment Session Creation (for Drop UI, Seamless In-App, and UPI Intent)
- Payment Status & Verification
- Webhook Signature Verification (HMAC-SHA256)
- Refunds & Refund Status Tracking
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
from typing import Any, Dict, List, Optional
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

CASHFREE_PROD_PG_URL = "https://api.cashfree.com/pg"
CASHFREE_SANDBOX_PG_URL = "https://sandbox.cashfree.com/pg"
DEFAULT_API_VERSION = "2023-08-01"


class CashfreeError(Exception):
    def __init__(self, message: str, status_code: int = 400, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


def _get_pg_config() -> Dict[str, Any]:
    settings = get_settings()
    app_id = settings.cashfree_app_id.strip()
    secret_key = settings.cashfree_secret_key.strip()
    api_version = (settings.cashfree_api_version or DEFAULT_API_VERSION).strip()
    is_live = settings.cashfree_is_production
    base_url = CASHFREE_PROD_PG_URL if is_live else CASHFREE_SANDBOX_PG_URL

    return {
        "app_id": app_id,
        "secret_key": secret_key,
        "api_version": api_version,
        "env": "PROD" if is_live else "SANDBOX",
        "is_configured": bool(app_id and secret_key),
        "base_url": base_url,
        "webhook_secret": (settings.cashfree_webhook_secret or secret_key).strip(),
    }


def _get_headers(cfg: Dict[str, Any]) -> Dict[str, str]:
    return {
        "x-client-id": cfg["app_id"],
        "x-client-secret": cfg["secret_key"],
        "x-api-version": cfg["api_version"],
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def create_order(
    *,
    order_id: str,
    order_amount: float,
    order_currency: str = "INR",
    customer_id: str,
    customer_phone: str,
    customer_email: Optional[str] = None,
    customer_name: Optional[str] = None,
    order_note: Optional[str] = None,
    return_url: Optional[str] = None,
    notify_url: Optional[str] = None,
    payment_methods: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a Cashfree PG Order and retrieve payment_session_id."""
    cfg = _get_pg_config()
    if not cfg["is_configured"]:
        raise CashfreeError(
            "Cashfree PG credentials are not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.",
            status_code=503,
        )

    # Sanitize phone (Indian 10-digit standard without country code prefix for Cashfree)
    clean_phone = "".join(filter(str.isdigit, customer_phone))
    if len(clean_phone) > 10 and clean_phone.startswith("91"):
        clean_phone = clean_phone[2:]
    if len(clean_phone) < 10:
        clean_phone = "9999999999"  # Fallback for preview/test accounts

    clean_email = (customer_email or f"user_{customer_id[:8]}@quickpress.online").strip()
    clean_name = (customer_name or "QuickPress Customer").strip()

    body: Dict[str, Any] = {
        "order_id": order_id,
        "order_amount": round(float(order_amount), 2),
        "order_currency": order_currency,
        "customer_details": {
            "customer_id": str(customer_id),
            "customer_phone": clean_phone,
            "customer_email": clean_email,
            "customer_name": clean_name,
        },
        "order_meta": {},
    }

    if return_url:
        body["order_meta"]["return_url"] = return_url
    if notify_url:
        body["order_meta"]["notify_url"] = notify_url
    if payment_methods:
        body["order_meta"]["payment_methods"] = payment_methods
    if order_note:
        body["order_note"] = order_note

    headers = _get_headers(cfg)
    url = f"{cfg['base_url']}/orders"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, json=body, headers=headers)

        data = resp.json() if resp.content else {}
        if resp.status_code not in (200, 201):
            msg = data.get("message") or f"Cashfree order creation failed with status {resp.status_code}"
            logger.error("Cashfree create_order error: %s (status: %d, response: %s)", msg, resp.status_code, data)
            raise CashfreeError(msg, status_code=resp.status_code, details=data)

        return data
    except httpx.HTTPError as exc:
        logger.error("Cashfree HTTP connection error: %s", exc)
        raise CashfreeError(f"Could not connect to Cashfree Payment Gateway: {str(exc)}", status_code=502)


async def get_order(order_id: str) -> Dict[str, Any]:
    """Fetch Cashfree Order by order_id."""
    cfg = _get_pg_config()
    if not cfg["is_configured"]:
        raise CashfreeError("Cashfree PG credentials are not configured.", status_code=503)

    headers = _get_headers(cfg)
    url = f"{cfg['base_url']}/orders/{order_id}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)

        data = resp.json() if resp.content else {}
        if resp.status_code != 200:
            msg = data.get("message") or f"Cashfree get_order failed with status {resp.status_code}"
            raise CashfreeError(msg, status_code=resp.status_code, details=data)

        return data
    except httpx.HTTPError as exc:
        raise CashfreeError(f"Could not connect to Cashfree: {str(exc)}", status_code=502)


async def get_order_payments(order_id: str) -> List[Dict[str, Any]]:
    """Fetch all payments attempted against a Cashfree order."""
    cfg = _get_pg_config()
    if not cfg["is_configured"]:
        raise CashfreeError("Cashfree PG credentials are not configured.", status_code=503)

    headers = _get_headers(cfg)
    url = f"{cfg['base_url']}/orders/{order_id}/payments"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)

        data = resp.json() if resp.content else []
        if resp.status_code != 200:
            msg = data.get("message") if isinstance(data, dict) else f"Status {resp.status_code}"
            raise CashfreeError(f"Failed to fetch order payments: {msg}", status_code=resp.status_code, details=data)

        return data if isinstance(data, list) else []
    except httpx.HTTPError as exc:
        raise CashfreeError(f"Could not connect to Cashfree: {str(exc)}", status_code=502)


async def create_refund(
    *,
    order_id: str,
    refund_id: str,
    refund_amount: float,
    refund_note: Optional[str] = None,
) -> Dict[str, Any]:
    """Initiate a full or partial refund on a paid Cashfree order."""
    cfg = _get_pg_config()
    if not cfg["is_configured"]:
        raise CashfreeError("Cashfree PG credentials are not configured.", status_code=503)

    headers = _get_headers(cfg)
    url = f"{cfg['base_url']}/orders/{order_id}/refunds"
    body: Dict[str, Any] = {
        "refund_id": refund_id,
        "refund_amount": round(float(refund_amount), 2),
        "refund_note": refund_note or "QuickPress Order Refund",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=body, headers=headers)

        data = resp.json() if resp.content else {}
        if resp.status_code not in (200, 201):
            msg = data.get("message") or f"Cashfree refund initiation failed with status {resp.status_code}"
            raise CashfreeError(msg, status_code=resp.status_code, details=data)

        return data
    except httpx.HTTPError as exc:
        raise CashfreeError(f"Could not connect to Cashfree for refund: {str(exc)}", status_code=502)


async def get_refund(order_id: str, refund_id: str) -> Dict[str, Any]:
    """Fetch status of a specific refund."""
    cfg = _get_pg_config()
    if not cfg["is_configured"]:
        raise CashfreeError("Cashfree PG credentials are not configured.", status_code=503)

    headers = _get_headers(cfg)
    url = f"{cfg['base_url']}/orders/{order_id}/refunds/{refund_id}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)

        data = resp.json() if resp.content else {}
        if resp.status_code != 200:
            msg = data.get("message") or f"Cashfree get_refund failed with status {resp.status_code}"
            raise CashfreeError(msg, status_code=resp.status_code, details=data)

        return data
    except httpx.HTTPError as exc:
        raise CashfreeError(f"Could not connect to Cashfree: {str(exc)}", status_code=502)


def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    timestamp: str,
    secret: Optional[str] = None,
) -> bool:
    """Verify Cashfree Webhook Signature (v2023-08-01 HMAC-SHA256).

    Cashfree calculates signature as:
    Base64(HMAC_SHA256(secret, timestamp + raw_body))
    """
    if not signature or not timestamp:
        return False

    cfg = _get_pg_config()
    signing_secret = (secret or cfg["webhook_secret"] or cfg["secret_key"]).strip()
    if not signing_secret:
        logger.warning("No Cashfree signing secret available to verify webhook.")
        return False

    message = timestamp.encode("utf-8") + raw_body
    computed_digest = hmac.new(
        signing_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).digest()
    computed_signature = base64.b64encode(computed_digest).decode("utf-8")

    return hmac.compare_digest(computed_signature, signature)
