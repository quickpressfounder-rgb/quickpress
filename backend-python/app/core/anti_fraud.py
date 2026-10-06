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


# =========================================================================
#  Phase 2 Rule 2: Payment Card Velocity & Anti-Carding Brute-Force Guard
# =========================================================================

CARD_VELOCITY_COLLECTION = "card_velocity_logs"
CARD_MAX_FAILURES = 3
CARD_WINDOW_SECONDS = 600       # 10 minutes sliding window
CARD_COOLDOWN_SECONDS = 3600    # 1 hour lockout


async def check_card_velocity_allowed(
    client_ip: str,
    device_id: str,
    user_id: Optional[str] = None,
) -> Tuple[bool, Optional[str], Optional[int]]:
    """Checks whether card payments are permitted or currently locked in anti-carding cooldown.
    
    Returns:
        (is_allowed: bool, rejection_reason: Optional[str], remaining_seconds: Optional[int])
    """
    now = datetime.now(timezone.utc)
    now_ts = now.timestamp()
    cutoff_ts = now_ts - CARD_WINDOW_SECONDS

    # 1. Search recent failed attempts for this IP, device, or user
    or_clauses = []
    if client_ip:
        or_clauses.append({"clientIp": client_ip})
    if device_id:
        or_clauses.append({"deviceId": device_id})
    if user_id:
        or_clauses.append({"userId": user_id})

    if not or_clauses:
        return True, None, None

    query = {
        "status": "failed",
        "$or": or_clauses,
    }

    try:
        docs = await database.find_many(CARD_VELOCITY_COLLECTION, query)
    except Exception:
        return True, None, None

    # Filter to recent failures within window or active lockout
    recent_failures = []
    latest_failure_ts = 0.0

    for doc in docs:
        doc_ts = doc.get("timestamp_epoch")
        if not doc_ts and doc.get("timestamp"):
            try:
                doc_ts = datetime.fromisoformat(str(doc["timestamp"]).replace("Z", "+00:00")).timestamp()
            except Exception:
                continue
        if doc_ts:
            if doc_ts > latest_failure_ts:
                latest_failure_ts = doc_ts
            if doc_ts >= cutoff_ts:
                recent_failures.append(doc)

    # Check if currently locked out
    if len(recent_failures) >= CARD_MAX_FAILURES:
        elapsed = now_ts - latest_failure_ts
        if elapsed < CARD_COOLDOWN_SECONDS:
            remaining = int(CARD_COOLDOWN_SECONDS - elapsed)
            return (
                False,
                f"Card payment attempts temporarily suspended due to multiple failed tries. Please use UPI / Cash or try again in {round(remaining / 60)} minutes.",
                remaining,
            )

    return True, None, None


async def record_card_attempt_failure(
    client_ip: str,
    device_id: str,
    user_id: Optional[str] = None,
    reason: str = "card_declined",
) -> None:
    """Records a failed card transaction attempt for velocity tracking."""
    now = datetime.now(timezone.utc)
    doc = {
        "clientIp": client_ip or "",
        "deviceId": device_id or "",
        "userId": user_id or "",
        "status": "failed",
        "reason": reason,
        "timestamp": now.isoformat(),
        "timestamp_epoch": now.timestamp(),
    }
    try:
        await database.insert(CARD_VELOCITY_COLLECTION, doc)
    except Exception:
        pass


async def reset_card_attempt_failures(
    client_ip: str,
    device_id: str,
    user_id: Optional[str] = None,
) -> None:
    """Clears failure count upon a successfully verified payment."""
    or_clauses = []
    if client_ip:
        or_clauses.append({"clientIp": client_ip})
    if device_id:
        or_clauses.append({"deviceId": device_id})
    if user_id:
        or_clauses.append({"userId": user_id})

    if or_clauses:
        try:
            await database.delete_many(CARD_VELOCITY_COLLECTION, {"$or": or_clauses})
        except Exception:
            pass


