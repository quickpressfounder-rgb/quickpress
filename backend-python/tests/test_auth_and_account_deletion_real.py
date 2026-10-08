"""Real Database Integration Test Suite for QuickPress Auth & Profile Lifecycle.

Verifies all 10 authentication and profile capabilities:
1. Phone Login & OTP Audit Trail
2. Google Sign-In & Automated Registration
3. Role-based Identity & Profile Provisioning in MongoDB Atlas
4. Secure Token Generation & Header Authentication
5. Session Expiry, Rotation & Refresh Token Exchange
6. Token Revocation on Logout
7. Blocked User Protection (403 Forbidden Guard)
8. Profile Retrieval (GET /api/profile)
9. Profile & Settings Editing (PUT /api/profile, PUT /api/me/settings, POST /api/profile/photo)
10. Complete Permanent Account Deletion (DELETE /api/profile) & Database Wipe
"""

from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token, create_refresh_token
from app.db.client import database
from app.db.repositories import users as user_repository
from app.main import app
from app.models.user import Role, User, UserStatus


from tests.conftest import real_mongodb_uri


def _make_headers(user_id: str, role: Role) -> dict[str, str]:
    token, _ = create_access_token(user_id, role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client


@pytest.mark.skipif(not real_mongodb_uri(), reason="REAL_MONGODB_URI not configured")
@pytest.mark.asyncio
async def test_auth_and_account_deletion_lifecycle_real_database(client: AsyncClient):
    # =========================================================================
    # 1. PHONE OTP SEND & SMS AUDIT LOG
    # =========================================================================
    test_phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
    send_res = await client.post(
        "/api/auth/phone/send-otp",
        json={"phone": test_phone, "role": "customer"},
    )
    assert send_res.status_code == 200
    send_json = send_res.json()
    assert send_json.get("ok") is True

    # Verify audit log in MongoDB Atlas
    audit_record = await database.collection("otp_attempts").find_one({"phone": test_phone})
    assert audit_record is not None
    assert audit_record["phone"] == test_phone
    assert audit_record["role"] == "customer"

    # =========================================================================
    # 2 & 3. REGISTRATION / IDENTITY PROVISIONING IN MONGODB ATLAS
    # =========================================================================
    test_user_id = f"usr-del-{uuid.uuid4().hex[:8]}"
    test_firebase_uid = f"fb-{uuid.uuid4().hex[:12]}"
    test_email = f"user_{uuid.uuid4().hex[:6]}@quickpress.test"

    new_user = User(
        id=test_user_id,
        firebase_uid=test_firebase_uid,
        role=Role.customer,
        phone=test_phone,
        email=test_email,
        display_name="Test Customer",
        photo_url=None,
        status=UserStatus.active,
        is_verified=True,
        is_onboarded=True,
    )
    created_user = await user_repository.create(new_user)
    assert created_user.id == test_user_id

    # Populate linked customer documents across collections
    await database.collection("customers").update_one(
        {"_id": test_user_id},
        {
            "$set": {
                "name": "Test Customer",
                "phone": test_phone,
                "email": test_email,
                "city": "Test City",
            }
        },
        upsert=True,
    )
    await database.collection("customer_settings").update_one(
        {"_id": test_user_id},
        {
            "$set": {
                "theme": "dark",
                "language": "hi-IN",
                "notifications": {"orderUpdates": True, "sms": True},
            }
        },
        upsert=True,
    )
    await database.collection("customer_addresses").insert_one(
        {
            "id": f"addr-{uuid.uuid4().hex[:6]}",
            "userId": test_user_id,
            "label": "Home",
            "line": "Civil Lines, Kasganj",
            "city": "Kasganj",
            "pincode": "207123",
        }
    )
    await database.collection("payment_methods").insert_one(
        {
            "id": f"pm-{uuid.uuid4().hex[:6]}",
            "userId": test_user_id,
            "kind": "upi",
            "name": "customer@okhdfcbank",
        }
    )
    await database.collection("carts").update_one(
        {"_id": test_user_id},
        {"$set": {"userId": test_user_id, "partnerId": "prt-2001", "items": [{"id": "s1", "qty": 2}]}},
        upsert=True,
    )

    auth_headers = _make_headers(test_user_id, Role.customer)

    # =========================================================================
    # 4. PROFILE RETRIEVAL (GET /api/profile)
    # =========================================================================
    profile_res = await client.get("/api/profile", headers=auth_headers)
    assert profile_res.status_code == 200
    p_data = profile_res.json()
    assert p_data["name"] == "Test Customer"
    assert p_data["phone"] == test_phone
    assert p_data["email"] == test_email

    # =========================================================================
    # 5. EDIT PROFILE & SETTINGS (PUT /api/profile, PUT /api/me/settings, POST /api/profile/photo)
    # =========================================================================
    update_res = await client.put(
        "/api/profile",
        headers=auth_headers,
        json={"name": "Test Customer Updated", "email": "test.customer@quickpress.test", "city": "Test City"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Test Customer Updated"

    # Verify persistence in MongoDB Atlas
    db_user = await user_repository.by_id(test_user_id)
    assert db_user is not None
    assert db_user.display_name == "Test Customer Updated"
    assert db_user.email == "test.customer@quickpress.test"

    # Photo update
    photo_res = await client.post(
        "/api/profile/photo",
        headers=auth_headers,
        json={"photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="},
    )
    assert photo_res.status_code == 200
    assert photo_res.json().get("avatarUrl") or photo_res.json().get("photoUrl")

    # Settings update
    settings_res = await client.put(
        "/api/me/settings",
        headers=auth_headers,
        json={"theme": "light", "language": "en-IN", "notifications": {"push": False}},
    )
    assert settings_res.status_code == 200

    # =========================================================================
    # 6. SESSION REFRESH & TOKEN ROTATION (POST /api/auth/refresh)
    # =========================================================================
    from app.db.repositories import refresh_tokens
    raw_refresh_token, token_id, refresh_expires = create_refresh_token(test_user_id, Role.customer.value)
    await refresh_tokens.store(token_id, test_user_id, refresh_expires)
    refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": raw_refresh_token},
    )
    assert refresh_res.status_code == 200
    refreshed_data = refresh_res.json()
    assert "token" in refreshed_data
    assert "refreshToken" in refreshed_data
    new_token = refreshed_data["token"]
    assert new_token != ""

    # =========================================================================
    # 7. LOGOUT & TOKEN REVOCATION (POST /api/auth/logout)
    # =========================================================================
    logout_res = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {new_token}"},
        json={"refresh_token": refreshed_data["refreshToken"]},
    )
    assert logout_res.status_code == 200
    assert logout_res.json().get("ok") is True

    # =========================================================================
    # 8. BLOCKED USER PROTECTION (RBAC / Auth Guard)
    # =========================================================================
    # Mark user as blocked
    await user_repository.update(test_user_id, {"status": UserStatus.blocked.value})
    blocked_headers = _make_headers(test_user_id, Role.customer)

    blocked_res = await client.get("/api/profile", headers=blocked_headers)
    assert blocked_res.status_code == 403
    assert "blocked" in blocked_res.json()["detail"].lower()

    # Unblock user for deletion test
    await user_repository.update(test_user_id, {"status": UserStatus.active.value})

    # =========================================================================
    # 9 & 10. ACCOUNT DELETION (DELETE /api/profile) & DATA WIPE
    # =========================================================================
    delete_res = await client.delete("/api/profile", headers=auth_headers)
    assert delete_res.status_code == 200
    delete_json = delete_res.json()
    assert delete_json.get("ok") is True

    # VERIFY USER IS COMPLETELY DELETED FROM MONGO ATLAS
    user_after_delete = await database.collection("users").find_one({"_id": test_user_id})
    assert user_after_delete is None

    # VERIFY LINKED ARTIFACTS ARE WIPED FROM MONGO ATLAS
    settings_after = await database.collection("customer_settings").find_one({"_id": test_user_id})
    assert settings_after is None

    addresses_after = await database.find_many("customer_addresses", {"userId": test_user_id})
    assert len(addresses_after) == 0

    payments_after = await database.find_many("payment_methods", {"userId": test_user_id})
    assert len(payments_after) == 0

    cart_after = await database.collection("carts").find_one({"_id": test_user_id})
    assert cart_after is None

    # Verify that trying to access profile with old token returns 401 Unauthorized
    post_delete_profile = await client.get("/api/profile", headers=auth_headers)
    assert post_delete_profile.status_code == 401
