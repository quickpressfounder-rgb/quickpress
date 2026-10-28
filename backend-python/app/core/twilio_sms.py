"""Twilio SMS & OTP Engine for QuickPress.

Supports:
1. Twilio Programmable SMS API (Direct SMS dispatch with custom brand template).
2. Twilio Verify Service API (Managed OTP generation and verification).
3. Graceful Fallback & Audit Mode (When credentials are not yet configured).
"""

from __future__ import annotations

import logging
import secrets
import time
from typing import Dict, Optional, Tuple

import httpx

from app.config import get_settings

_log = logging.getLogger(__name__)

# In-memory OTP storage with TTL (Phone -> (code, expiry_timestamp))
_OTP_STORE: Dict[str, Tuple[str, float]] = {}


def generate_otp_code(length: int = 6) -> str:
    """Generates a cryptographically secure numeric OTP."""
    if length == 4:
        return f"{secrets.randbelow(9000) + 1000}"
    return f"{secrets.randbelow(900000) + 100000}"


def store_otp(phone: str, code: str, ttl_seconds: int = 300) -> None:
    """Stores an OTP for verification with expiry timestamp."""
    expiry = time.time() + ttl_seconds
    _OTP_STORE[phone] = (code, expiry)


def verify_stored_otp(phone: str, code: str) -> bool:
    """Validates submitted OTP code against stored code and expiry."""
    code_clean = str(code).strip()
    
    entry = _OTP_STORE.get(phone)
    if not entry:
        return False

    stored_code, expiry = entry
    if time.time() > expiry:
        _OTP_STORE.pop(phone, None)
        return False

    if stored_code == code_clean:
        # One-time use: invalidate immediately upon successful verification
        _OTP_STORE.pop(phone, None)
        return True

    return False


async def verify_phone_otp_code(phone: str, code: str) -> bool:
    """Validates OTP against Twilio Verify API or in-memory store."""
    import os
    code_clean = str(code).strip()
    settings = get_settings()
    twilio_sid = (settings.twilio_account_sid or os.getenv("TWILIO_ACCOUNT_SID") or "").strip()
    twilio_token = (settings.twilio_auth_token or os.getenv("TWILIO_AUTH_TOKEN") or "").strip()
    twilio_verify_sid = (settings.twilio_verify_service_sid or os.getenv("TWILIO_VERIFY_SERVICE_SID") or "").strip()

    # If Twilio Verify service is configured, check against Twilio
    if twilio_sid and twilio_token and twilio_verify_sid:
        url = f"https://verify.twilio.com/v2/Services/{twilio_verify_sid}/VerificationCheck"
        auth = (twilio_sid, twilio_token)
        data = {"To": phone, "Code": code_clean}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, auth=auth, data=data)
                if resp.status_code == 200:
                    payload = resp.json()
                    if payload.get("status") == "approved":
                        _OTP_STORE.pop(phone, None)
                        return True
                _log.warning("Twilio Verify Check returned status %s: %s", resp.status_code, resp.text)
        except Exception as exc:
            _log.error("Twilio Verify Check error: %s", exc)

    return verify_stored_otp(phone, code_clean)


async def send_twilio_sms_otp(phone: str, role: str = "customer") -> Tuple[bool, str, Optional[str]]:
    """Dispatches real SMS OTP via Twilio (Primary) with Indian gateway fallbacks.

    Returns:
        (success: bool, delivery_method: str, error_message: Optional[str])
    """
    import os
    settings = get_settings()
    otp_code = generate_otp_code(6)
    store_otp(phone, otp_code, ttl_seconds=settings.otp_ttl_seconds)

    twilio_sid = (settings.twilio_account_sid or os.getenv("TWILIO_ACCOUNT_SID") or "").strip()
    twilio_token = (settings.twilio_auth_token or os.getenv("TWILIO_AUTH_TOKEN") or "").strip()
    twilio_verify_sid = (settings.twilio_verify_service_sid or os.getenv("TWILIO_VERIFY_SERVICE_SID") or "").strip()
    twilio_number = (settings.twilio_phone_number or os.getenv("TWILIO_PHONE_NUMBER") or "").strip()

    # 1. Twilio Verify Service (Managed OTP Delivery)
    if twilio_sid and twilio_token and twilio_verify_sid:
        url = f"https://verify.twilio.com/v2/Services/{twilio_verify_sid}/Verifications"
        auth = (twilio_sid, twilio_token)
        data = {"To": phone, "Channel": "sms"}
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(url, auth=auth, data=data)
                if resp.status_code in (200, 201):
                    _log.info("Twilio Verify SMS dispatched successfully to %s", phone)
                    return True, "twilio_verify", None
                error_text = resp.text
                _log.warning("Twilio Verify API returned %s: %s", resp.status_code, error_text)
                return False, "twilio_verify_error", error_text
        except Exception as exc:
            _log.error("Twilio Verify request failed: %s", exc)
            return False, "twilio_verify_error", str(exc)

    # 2. Twilio Programmable SMS API (Direct SMS dispatch)
    if twilio_sid and twilio_token and twilio_number:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
        auth = (twilio_sid, twilio_token)
        body = (
            f"Your QuickPress verification code is {otp_code}. "
            f"Valid for 5 minutes. Do not share this code with anyone."
        )
        data = {
            "From": twilio_number,
            "To": phone,
            "Body": body,
        }
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(url, auth=auth, data=data)
                if resp.status_code in (200, 201):
                    _log.info("Twilio SMS OTP %s dispatched successfully to %s", otp_code, phone)
                    return True, "twilio_sms", None
                error_body = resp.text
                _log.warning("Twilio Programmable SMS API returned %s: %s", resp.status_code, error_body)
                return False, "twilio_error", error_body
        except Exception as exc:
            _log.error("Twilio SMS request failed: %s", exc)
            return False, "twilio_error", str(exc)

    # 3. Indian Gateway: Fast2SMS (Optional fallback if configured)
    clean_digits = "".join(filter(str.isdigit, phone))
    clean_10digit = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits
    fast2sms_key = (settings.fast2sms_api_key or os.getenv("FAST2SMS_API_KEY") or "").strip()
    if fast2sms_key and len(clean_10digit) == 10:
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": fast2sms_key,
            "Content-Type": "application/json",
        }
        payload = {
            "route": "otp",
            "variables_values": otp_code,
            "numbers": clean_10digit,
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                data = resp.json() if resp.content else {}
                if resp.status_code == 200 and data.get("return") is True:
                    _log.info("Fast2SMS OTP %s dispatched successfully to %s", otp_code, phone)
                    return True, "fast2sms", None
                err_msg = str(data.get("message") or resp.text)
                _log.warning("Fast2SMS API returned: %s", data)
                return False, "fast2sms_error", err_msg
        except Exception as exc:
            _log.error("Fast2SMS request failed: %s", exc)
            return False, "fast2sms_error", str(exc)

    # 4. Indian Gateway: 2Factor.in (Optional fallback if configured)
    twofactor_key = (os.getenv("TWOFACTOR_API_KEY") or os.getenv("TWO_FACTOR_API_KEY") or "").strip()
    if twofactor_key and len(clean_10digit) == 10:
        url = f"https://2factor.in/API/V1/{twofactor_key}/SMS/{clean_10digit}/{otp_code}/QuickPress"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                data = resp.json() if resp.content else {}
                if resp.status_code == 200 and data.get("Status") == "Success":
                    _log.info("2Factor OTP dispatched successfully to %s", phone)
                    return True, "2factor", None
                err_msg = str(data.get("Details") or resp.text)
                _log.warning("2Factor API returned: %s", data)
                return False, "2factor_error", err_msg
        except Exception as exc:
            _log.error("2Factor request failed: %s", exc)
            return False, "2factor_error", str(exc)

    # 5. Live Gateway Missing: No mock OTP allowed. Real SMS gateway is required.
    _log.error(
        "❌ [TWILIO GATEWAY MISSING] Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env to dispatch real SMS to %s.",
        phone,
    )
    return False, "unconfigured", "Twilio credentials missing. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env."
