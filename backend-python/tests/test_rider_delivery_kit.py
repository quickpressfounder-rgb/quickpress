"""Automated Test Suite for Captain Delivery Kit & Admin Management.

Verifies:
1. Public & Rider API:
   - GET /api/rider/delivery-kit/config
   - POST /api/rider/delivery-kit/create-order (Full vs Part Payment)
   - POST /api/rider/delivery-kit/verify-payment (HMAC verification & DB insert)
   - GET /api/rider/delivery-kit/my-kit
2. Zero-Bypass Security:
   - Agreement OTP endpoints strictly reject unpaid riders with HTTP 403 Forbidden.
   - Agreement OTP endpoints accept paid/partially-paid riders with HTTP 200 OK.
3. Admin Fulfillment API:
   - GET /api/admin/delivery-kits/stats
   - GET /api/admin/delivery-kits
   - PATCH /api/admin/delivery-kits/{id}/dispatch
   - PATCH /api/admin/delivery-kits/{id}/deliver
"""

from __future__ import annotations

import hmac
import hashlib
import uuid
from typing import Any, Dict
from unittest.mock import patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.db.client import database
from app.core.security import create_access_token
from app.models.user import Role, User, UserStatus
from app.db.repositories import users as user_repository
from app.services import razorpay_client


@pytest.fixture()
def client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


async def _create_admin_user() -> User:
    admin = User(
        id=str(uuid.uuid4()),
        firebase_uid=f"uid-admin-{uuid.uuid4().hex[:8]}",
        role=Role.admin,
        phone=f"+9198{uuid.uuid4().int % 100_000_000:08d}",
        email="ops-admin@quickpress.online",
        display_name="Operations Admin",
        status=UserStatus.active,
        is_verified=True,
        is_onboarded=True,
    )
    return await user_repository.create(admin)


def _admin_token(user: User) -> str:
    token, _ = create_access_token(user.id, user.role.value)
    return token


@pytest.mark.asyncio
async def test_delivery_kit_config(client: TestClient):
    """Verifies standard kit pricing and part-payment terms."""
    response = client.get("/api/rider/delivery-kit/config")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["mandatoryForOnboarding"] is True
    assert "items" in data
    assert len(data["items"]) >= 4

    std_kit = data["standardKit"]
    assert std_kit["totalPrice"] == 999.0
    assert std_kit["allowPartPayment"] is True
    assert std_kit["partPaymentTotalPrice"] == 1200.0
    assert std_kit["partPaymentUpfront"] == 300.0
    assert std_kit["remainingBalance"] == 900.0
    assert std_kit["deductionWeekly"] == 300.0
    assert std_kit["deductionWeeks"] == 3


@pytest.mark.asyncio
async def test_create_delivery_kit_order(client: TestClient):
    """Verifies Razorpay order creation for both Full Payment and Part Payment."""
    test_phone = "9876500001"

    with patch.object(razorpay_client, "create_order", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = {
            "id": "order_test_part_123",
            "amount": 30000,
            "currency": "INR",
            "status": "created",
        }

        # 1. Part Payment Upfront = ₹300
        res = client.post(
            "/api/rider/delivery-kit/create-order",
            json={
                "riderPhone": test_phone,
                "riderName": "Vikram Singh",
                "paymentType": "PART_PAYMENT",
                "tshirtSize": "L",
                "deliveryPreference": "home_delivery",
            },
        )
        assert res.status_code == 200
        d = res.json()
        assert d["ok"] is True
        assert d["razorpayOrderId"] == "order_test_part_123"
        assert d["amount"] == 300.0
        assert d["totalPrice"] == 1200.0
        assert d["remainingBalance"] == 900.0

        # 2. Full Payment Flat = ₹999
        mock_create.return_value = {
            "id": "order_test_full_456",
            "amount": 99900,
            "currency": "INR",
            "status": "created",
        }
        res2 = client.post(
            "/api/rider/delivery-kit/create-order",
            json={
                "riderPhone": test_phone,
                "riderName": "Vikram Singh",
                "paymentType": "FULL_PAYMENT",
                "tshirtSize": "XL",
                "deliveryPreference": "hub_pickup",
            },
        )
        assert res2.status_code == 200
        d2 = res2.json()
        assert d2["ok"] is True
        assert d2["amount"] == 999.0
        assert d2["remainingBalance"] == 0.0


@pytest.mark.asyncio
async def test_verify_delivery_kit_payment_signature(client: TestClient):
    """Verifies signature validation, db insertion, and status retrieval."""
    test_phone = f"98{uuid.uuid4().int % 100_000_000:08d}"
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"

    # Mock signature verification
    with patch.object(razorpay_client, "verify_payment_signature", return_value=True):
        payload = {
            "riderPhone": test_phone,
            "riderName": "Rahul Sharma",
            "city": "Kasganj",
            "razorpayOrderId": order_id,
            "razorpayPaymentId": payment_id,
            "razorpaySignature": "valid_mock_signature_hex",
            "paymentType": "PART_PAYMENT",
            "tshirtSize": "M",
            "deliveryPreference": "home_delivery",
        }
        res = client.post("/api/rider/delivery-kit/verify-payment", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["status"] == "PARTIALLY_PAID"
        assert data["amountPaid"] == 300.0
        assert data["remainingBalance"] == 900.0

    # Retrieve kit with GET /api/rider/delivery-kit/my-kit
    my_kit_res = client.get(f"/api/rider/delivery-kit/my-kit?phone={test_phone}")
    assert my_kit_res.status_code == 200
    my_kit = my_kit_res.json()
    assert my_kit["ok"] is True
    assert my_kit["hasKitOrder"] is True
    assert my_kit["kitOrder"]["pricing"]["remainingBalance"] == 900.0
    assert my_kit["kitOrder"]["fulfillment"]["status"] == "PENDING_DISPATCH"


@pytest.mark.asyncio
async def test_zero_bypass_agreement_security(client: TestClient):
    """Strictly verifies that Agreement OTP endpoints reject unpaid riders with 403 Forbidden."""
    unpaid_phone = f"97{uuid.uuid4().int % 100_000_000:08d}"
    unpaid_email = f"unpaid_{unpaid_phone}@test.quickpress"

    # Step 1: Rider attempts to call /api/rider/agreement/send-otp WITHOUT paying kit
    send_otp_res = client.post(
        "/api/rider/agreement/send-otp",
        json={"email": unpaid_email, "name": "Bypass Attempt Rider"},
    )
    # MUST BE 403 FORBIDDEN
    assert send_otp_res.status_code == 403
    assert "Delivery Kit selection and payment is mandatory" in send_otp_res.json()["detail"]

    # Step 2: Now simulate verified payment in database
    await database.collection("rider_delivery_kits").insert_one({
        "_id": f"kit_{unpaid_phone}",
        "riderPhone": unpaid_phone,
        "pricing": {
            "totalKitPrice": 1200.0,
            "paymentType": "PART_PAYMENT",
            "amountPaid": 300.0,
            "remainingBalance": 900.0,
        },
        "payment": {
            "status": "PARTIALLY_PAID",
            "signatureVerified": True,
        },
        "fulfillment": {
            "status": "PENDING_DISPATCH",
        },
    })
    # Also link to rider profile if exists
    await database.collection("rider_profiles").insert_one({
        "_id": f"rdr_{unpaid_phone}",
        "phone": unpaid_phone,
        "email": unpaid_email,
        "fullName": "Legit Rider",
    })

    # Step 3: Now call /api/rider/agreement/send-otp -> MUST SUCCEED (200 OK)
    send_otp_res2 = client.post(
        "/api/rider/agreement/send-otp",
        json={"email": unpaid_email, "name": "Legit Rider"},
    )
    assert send_otp_res2.status_code == 200
    assert send_otp_res2.json()["ok"] is True


@pytest.mark.asyncio
async def test_admin_delivery_kits_management(client: TestClient):
    """Verifies Admin endpoints for statistics, listing, dispatching and delivering kits."""
    admin_user = await _create_admin_user()
    token = _admin_token(admin_user)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch Stats
    stats_res = client.get("/api/admin/delivery-kits/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["ok"] is True
    assert "totalOrders" in stats
    assert "totalRevenueCollected" in stats

    # 2. List Kits
    list_res = client.get("/api/admin/delivery-kits?limit=10", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert isinstance(items, list)

    # 3. Create a test kit in database to test dispatch & delivery
    test_kit_id = f"kit_test_{uuid.uuid4().hex[:8]}"
    await database.collection("rider_delivery_kits").insert_one({
        "_id": test_kit_id,
        "id": test_kit_id,
        "riderPhone": "9998887776",
        "riderName": "Suresh Raina",
        "tshirtSize": "XL",
        "deliveryPreference": "home_delivery",
        "pricing": {"amountPaid": 999.0, "paymentType": "FULL_PAYMENT"},
        "payment": {"status": "PAID"},
        "fulfillment": {"status": "PENDING_DISPATCH"},
    })

    # 4. Dispatch the kit
    dispatch_res = client.patch(
        f"/api/admin/delivery-kits/{test_kit_id}/dispatch",
        headers=headers,
        json={
            "courierName": "DTDC Express",
            "trackingNumber": "DTDC-99283741",
            "notes": "Green box dispatched from Delhi hub.",
        },
    )
    assert dispatch_res.status_code == 200
    dispatch_data = dispatch_res.json()
    assert dispatch_data["ok"] is True
    assert dispatch_data["kitOrder"]["fulfillment"]["status"] == "DISPATCHED"
    assert dispatch_data["kitOrder"]["fulfillment"]["trackingNumber"] == "DTDC-99283741"

    # 5. Mark as Delivered
    deliver_res = client.patch(
        f"/api/admin/delivery-kits/{test_kit_id}/deliver",
        headers=headers,
        json={"deliveredBy": "Hub Manager", "notes": "Handed over successfully"},
    )
    assert deliver_res.status_code == 200
    deliver_data = deliver_res.json()
    assert deliver_data["ok"] is True
    assert deliver_data["kitOrder"]["fulfillment"]["status"] == "DELIVERED"

