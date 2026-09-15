"""Anti-Fraud & Device Fingerprint Tracking for QuickPress.

Prevents multi-account abuse, repeat referral bonuses, and promo voucher exploitation
from the same physical device or browser instance.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import Request
from app.db.client import database

DEVICE_FRAUD_COLLECTION = "device_fraud_claims"


def extract_device_id(request: Request, body: Optional[Dict[str, Any]] = None) -> str:
    """Extracts a reliable device identifier from headers, body, or client fingerprint."""
    # 1. Explicit Client-provided Device UUID (persisted in secure storage/localStorage)
    header_device = (
        request.headers.get("x-device-id")
        or request.headers.get("x-device-fingerprint")
        or request.headers.get("device-id")
        or ""
    ).strip()
    if header_device:
        return header_device

    # 2. Check query params for device_id
    if hasattr(request, "query_params") and request.query_params:
        qp_device = (
            request.query_params.get("device_id")
            or request.query_params.get("deviceId")
            or ""
        ).strip()
        if qp_device:
            return qp_device

    # 3. Check JSON payload for deviceId
    if body and isinstance(body, dict):
        body_device = str(body.get("deviceId") or body.get("device_id") or "").strip()
        if body_device:
            return body_device

    # 3. Fallback: Cryptographic hash of Client IP + User-Agent
    client_ip = request.client.host if request.client else "unknown-ip"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    user_agent = request.headers.get("user-agent") or "unknown-ua"
    accept_lang = request.headers.get("accept-language") or ""
    
    raw = f"{client_ip}|{user_agent}|{accept_lang}"
    return f"dev-{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:24]}"


async def is_device_promo_claimed(device_id: str, promo_type: str = "referral") -> bool:
    """Checks if a device has already claimed a specific promotion or referral bonus."""
    if not device_id:
        return False
    record = await database.collection(DEVICE_FRAUD_COLLECTION).find_one(
        {"deviceId": device_id, "promoType": promo_type}
    )
    return record is not None


async def record_device_promo_claim(
    device_id: str,
    user_id: str,
    promo_type: str = "referral",
    reference_code: str = "",
) -> None:
    """Records a claimed promotion against a device fingerprint."""
    if not device_id:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    await database.collection(DEVICE_FRAUD_COLLECTION).update_one(
        {"deviceId": device_id, "promoType": promo_type},
        {
            "$set": {
                "deviceId": device_id,
                "userId": user_id,
                "promoType": promo_type,
                "referenceCode": reference_code,
                "claimedAt": now_iso,
            }
        },
        upsert=True,
    )
