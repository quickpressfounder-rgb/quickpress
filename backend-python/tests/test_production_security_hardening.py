"""Production Security Hardening & Zero-Trust Gateway Verification Tests.

Validates:
1. Hardcoded OTP 000000 bypass is strictly blocked in production.
2. Razorpay webhook signature is strictly enforced in production.
"""

from __future__ import annotations

import hmac
import hashlib
import pytest
from fastapi.testclient import TestClient

from app.core.twilio_sms import store_otp, verify_phone_otp_code, verify_stored_otp
from app.main import create_app


@pytest.mark.asyncio
async def test_otp_bypass_blocked_in_production(monkeypatch):
    """Ensure universal 000000 bypass is rejected when APP_ENV=production."""
    test_phone = "+919876543999"

    # In Production:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOW_TEST_OTP", raising=False)

    # 1. 000000 must be rejected
    assert not verify_stored_otp(test_phone, "000000")
    assert not await verify_phone_otp_code(test_phone, "000000")

    # 2. Genuine OTP must still verify successfully
    store_otp(test_phone, "482910", ttl_seconds=60)
    assert verify_stored_otp(test_phone, "482910")


@pytest.mark.asyncio
async def test_otp_bypass_allowed_in_dev(monkeypatch):
    """Ensure 000000 bypass continues to work in development for local test suites."""
    test_phone = "+919876543998"

    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALLOW_TEST_OTP", "true")

    assert verify_stored_otp(test_phone, "000000")
    assert await verify_phone_otp_code(test_phone, "000000")


def test_razorpay_webhook_signature_enforced_in_production(monkeypatch):
    """Ensure unauthenticated/spoofed Razorpay webhooks are blocked in production."""
    app = create_app()
    client = TestClient(app)

    monkeypatch.setenv("APP_ENV", "production")

    # Case A: Missing webhook secret in production raises 500 (fails closed)
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "")
    resp = client.post(
        "/api/payments/razorpay/webhook",
        json={"event": "payment.captured", "id": "evt_test_sec_1"},
        headers={"x-razorpay-signature": "fake_signature"},
    )
    assert resp.status_code == 500
    assert "unconfigured" in resp.json()["detail"].lower()

    # Case B: Secret configured, but invalid signature raises 401
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_test_secret_123")
    resp_tampered = client.post(
        "/api/payments/razorpay/webhook",
        json={"event": "payment.captured", "id": "evt_test_sec_2"},
        headers={"x-razorpay-signature": "tampered_signature_xyz"},
    )
    assert resp_tampered.status_code == 401
    assert "invalid webhook signature" in resp_tampered.json()["detail"].lower()
