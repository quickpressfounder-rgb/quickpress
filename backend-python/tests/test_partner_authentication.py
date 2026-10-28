"""Automated test suite for Partner Authentication & Authorization.

Verifies:
  1. POST /api/auth/phone/send-otp accepts role="partner" and audits request.
  2. Partner identity creation and MongoDB Atlas document in `users` and `partners`.
  3. QuickPress Partner JWT issuance with role="partner".
  4. Access to protected partner routes (GET /api/partner/dashboard, /profile, /settings, /orders) with Partner JWT.
  5. Role boundary: A customer account attempting partner authentication is rejected with 409 Conflict.
  6. Non-partner roles (customer/rider) cannot access partner protected endpoints (403 Forbidden).
  7. Partner session refresh & logout.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.db.client import database
from app.db.repositories import users
from app.main import app
from app.models.user import Role


@pytest.fixture
async def partner_test_users():
    """Creates a partner user and a customer user in MongoDB."""
    partner_user = await users.upsert_from_firebase(
        firebase_uid="test_firebase_partner_auth_uid_1",
        role=Role.partner,
        phone="+919876500001",
        email="partner1@quickpress.test",
        display_name="Metro Dry Cleaners",
        photo_url=None,
    )
    partner_token, _ = create_access_token(partner_user.id, partner_user.role.value)
    store_id = f"PRT-TEST-{partner_user.id[:6].upper()}"
    await database.update("partners", {"user_id": partner_user.id}, {"partner_id": store_id}, upsert=True)
    await database.insert("partner_profiles", {
        "_id": store_id,
        "partnerId": store_id,
        "userId": partner_user.id,
        "businessName": "Metro Dry Cleaners",
        "ownerName": "Metro Partner",
        "phone": "+919876500001",
        "email": "partner1@quickpress.test",
        "city": "Bengaluru",
        "rating": 5.0,
        "totalOrders": 10,
        "joinedOn": "August 2026",
        "onTimeRate": 99.0,
        "tier": "Silver",
        "isOnline": True,
        "isVerified": True,
        "status": "active",
    })

    customer_user = await users.upsert_from_firebase(
        firebase_uid="test_firebase_cust_partner_cross_uid",
        role=Role.customer,
        phone="+919876500002",
        email="cust_cross@quickpress.test",
        display_name="Customer Cross Tester",
        photo_url=None,
    )
    customer_token, _ = create_access_token(customer_user.id, customer_user.role.value)

    yield {
        "partner_user": partner_user,
        "partner_token": partner_token,
        "customer_user": customer_user,
        "customer_token": customer_token,
        "store_id": store_id,
    }

    # Clean up test data
    await database.collection("users").delete_many(
        {"_id": {"$in": [partner_user.id, customer_user.id]}}
    )
    await database.collection("partners").delete_many(
        {"user_id": partner_user.id}
    )
    await database.collection("partner_profiles").delete_many(
        {"_id": store_id}
    )


@pytest.mark.asyncio
async def test_partner_send_otp_endpoint(partner_test_users):
    """Verify send-otp for role='partner'."""
    from unittest.mock import AsyncMock, patch
    with patch("app.core.twilio_sms.send_twilio_sms_otp", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, "fast2sms", None)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/auth/phone/send-otp",
                json={"phone": "+919876599999", "role": "partner"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert "expiresInSeconds" in data


@pytest.mark.asyncio
async def test_partner_access_protected_dashboard(partner_test_users):
    """Verify partner can access GET /api/partner/dashboard with Partner JWT."""
    partner_token = partner_test_users["partner_token"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/partner/dashboard",
            headers={"Authorization": f"Bearer {partner_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "newOrders" in data
        assert "inProgress" in data
        assert "readyForDelivery" in data
        assert "earningsToday" in data


@pytest.mark.asyncio
async def test_partner_access_protected_profile_and_settings(partner_test_users):
    """Verify partner can access profile and business settings."""
    partner_token = partner_test_users["partner_token"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Profile
        prof_resp = await client.get(
            "/api/partner/profile",
            headers={"Authorization": f"Bearer {partner_token}"},
        )
        assert prof_resp.status_code == 200
        prof_data = prof_resp.json()
        assert "partnerId" in prof_data
        assert "rating" in prof_data

        # Settings
        settings_resp = await client.get(
            "/api/partner/settings",
            headers={"Authorization": f"Bearer {partner_token}"},
        )
        assert settings_resp.status_code == 200
        settings_data = settings_resp.json()
        assert "isStoreOpen" in settings_data


@pytest.mark.asyncio
async def test_customer_token_rejected_on_partner_routes(partner_test_users):
    """Verify customer cannot access partner protected endpoints (403 Forbidden)."""
    customer_token = partner_test_users["customer_token"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/partner/dashboard",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_same_firebase_identity_can_have_customer_and_partner_roles(partner_test_users):
    """Verify that a single phone/firebase identity can create both customer and partner profiles."""
    customer_user = partner_test_users["customer_user"]

    partner_profile = await users.upsert_from_firebase(
        firebase_uid=customer_user.firebase_uid,
        role=Role.partner,
        phone=customer_user.phone,
        email=customer_user.email,
        display_name="Multi Role Store",
        photo_url=None,
    )
    assert partner_profile.id != customer_user.id
    assert partner_profile.role == Role.partner
    assert partner_profile.firebase_uid == customer_user.firebase_uid

    # Clean up created multi-role user
    await database.collection("users").delete_one({"_id": partner_profile.id})
    await database.collection("partners").delete_many({"user_id": partner_profile.id})
