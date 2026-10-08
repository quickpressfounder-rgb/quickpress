"""Automated test suite for Enterprise Staff Auth, Business Email Verification, 2FA, RBAC & Audit Trail."""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.admin_security import is_business_email, hash_password, verify_password
from app.db.client import database


@pytest.mark.asyncio
async def test_business_email_domain_validation():
    # Personal emails must be rejected
    is_valid, reason = is_business_email("rajesh@gmail.com")
    assert is_valid is False
    assert "Personal email provider" in reason

    is_valid, reason = is_business_email("admin@yahoo.com")
    assert is_valid is False

    is_valid, reason = is_business_email("vikram@outlook.com")
    assert is_valid is False

    # Corporate business emails must be accepted
    is_valid, reason = is_business_email("rajesh.ops@quickpress.online")
    assert is_valid is True

    is_valid, reason = is_business_email("vikram@enterprise-logistics.in")
    assert is_valid is True


@pytest.mark.asyncio
async def test_password_hashing_and_verification():
    raw = "SuperSecret@2026"
    hashed = hash_password(raw)
    assert hashed.startswith("pbkdf2:sha256:")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_unregistered_email_login_denied_in_staff_directory():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Attempt login with random unregistered email -> Must get 403 Forbidden
        res = await client.post(
            "/api/auth/admin/login",
            json={
                "email": "intruder.unknown@external-domain.com",
                "password": "SomePassword@123",
            },
        )
        assert res.status_code == 403
        assert "not registered in the Staff Directory" in res.json()["detail"]

        # 2. Attempt login with registered email but WRONG password -> Must get 401 Unauthorized, NO OTP generated
        wrong_pwd_res = await client.post(
            "/api/auth/admin/login",
            json={
                "email": "admin@quickpress.online",
                "password": "CompletelyWrongPassword@999",
            },
        )
        assert wrong_pwd_res.status_code == 401
        assert "Invalid password" in wrong_pwd_res.json()["detail"]


@pytest.mark.asyncio
async def test_staff_registration_and_email_otp_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Attempt registration with generic personal email -> Expect 400 rejection
        bad_reg = await client.post(
            "/api/auth/staff/register",
            json={
                "name": "Rajesh Sharma",
                "email": "rajesh.personal@gmail.com",
                "phone": "+919876543210",
                "password": "Password@123",
                "role": "Operations Admin",
            },
        )
        assert bad_reg.status_code == 400
        assert "Personal email provider" in bad_reg.json()["detail"]

        # 2. Register with Corporate Business Email -> Expect 200 OK with OTP
        corp_email = "rajesh.ops@quickpress.online"
        good_reg = await client.post(
            "/api/auth/staff/register",
            json={
                "name": "Rajesh Sharma",
                "email": corp_email,
                "phone": "+919876543210",
                "password": "Password@123",
                "role": "Operations Admin",
                "scope": "Kasganj Market Hub",
            },
        )
        assert good_reg.status_code == 200
        reg_data = good_reg.json()
        assert reg_data["ok"] is True

        # 3. Verify Business Email with OTP (using master fallback / stored OTP)
        verify_res = await client.post(
            "/api/auth/staff/verify-email",
            json={"email": corp_email, "otp": "123456"},
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["verified"] is True

        # 4. Verify staff document is now Active in DB
        staff_doc = await database.find_one("admin_staff", {"email": corp_email})
        assert staff_doc is not None
        assert staff_doc["status"] == "Active"


@pytest.mark.asyncio
async def test_super_admin_email_password_and_2fa_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Step 1: Login with Email + Password
        login_res = await client.post(
            "/api/auth/admin/login",
            json={
                "email": "admin@quickpress.online",
                "password": "Admin@QuickPress2026!",
            },
        )
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["twoFactorRequired"] is True
        challenge_id = login_data["challengeId"]

        # 2. Step 2: Verify 2FA OTP Challenge
        two_fa_res = await client.post(
            "/api/auth/admin/2fa",
            json={
                "challengeId": challenge_id,
                "otp": "123456",
            },
        )
        assert two_fa_res.status_code == 200
        session_data = two_fa_res.json()
        assert "token" in session_data
        admin_token = session_data["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 3. List staff members
        list_res = await client.get("/api/admin/staff", headers=headers)
        assert list_res.status_code == 200
        staff_list = list_res.json()
        assert len(staff_list) >= 1
        target_staff = staff_list[0]["id"]

        # 4. Update Granular RBAC Permissions
        new_permissions = ["orders", "customers", "partners", "riders", "support", "cities"]
        perm_res = await client.put(
            f"/api/admin/staff/{target_staff}/permissions",
            headers=headers,
            json={"permissions": new_permissions},
        )
        assert perm_res.status_code == 200
        assert perm_res.json()["permissions"] == new_permissions

        # 5. Toggle Staff Status
        status_res = await client.put(
            f"/api/admin/staff/{target_staff}/status",
            headers=headers,
            json={"status": "Active", "reason": "Verified corporate KYC"},
        )
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "Active"

        # 6. Retrieve Real-Time Audit Logs
        logs_res = await client.get("/api/admin/staff/logs", headers=headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) >= 1
        assert any("auth" in l.get("action", "") or "staff" in l.get("action", "") for l in logs)


@pytest.mark.asyncio
async def test_staff_member_login_receives_assigned_permissions_and_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Super Admin logs in
        admin_login = await client.post(
            "/api/auth/admin/login",
            json={"email": "admin@quickpress.online", "password": "Admin@QuickPress2026!"},
        )
        ch_id = admin_login.json()["challengeId"]
        admin_session = await client.post(
            "/api/auth/admin/2fa",
            json={"challengeId": ch_id, "otp": "123456"},
        )
        admin_token = admin_session.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Super Admin creates a specific staff member (e.g. Operations Manager) with only ["orders", "riders"]
        corp_email = f"rahul.dispatch.{uuid.uuid4().hex[:6]}@quickpress.online"
        assigned_perms = ["orders", "riders"]
        create_res = await client.post(
            "/api/admin/staff",
            headers=headers,
            json={
                "name": "Rahul Sharma",
                "email": corp_email,
                "phone": "+91 98765 43210",
                "role": "Dispatch Coordinator",
                "scope": "Delhi Hub South",
                "permissions": assigned_perms,
                "password": "DispatchPassword@2026",
            },
        )
        assert create_res.status_code == 201

        # 3. Staff logs in with their credentials
        staff_login = await client.post(
            "/api/auth/admin/login",
            json={"email": corp_email, "password": "DispatchPassword@2026"},
        )
        assert staff_login.status_code == 200
        staff_ch_id = staff_login.json()["challengeId"]

        # 4. Staff completes 2FA verification
        staff_2fa = await client.post(
            "/api/auth/admin/2fa",
            json={"challengeId": staff_ch_id, "otp": "123456"},
        )
        assert staff_2fa.status_code == 200
        staff_session = staff_2fa.json()

        # 5. Validate Account object returned to staff
        account = staff_session["account"]
        assert account["name"] == "Rahul Sharma"
        assert account["email"] == corp_email
        assert account["departmentRole"] == "Dispatch Coordinator"
        assert account["scope"] == "Delhi Hub South"
        assert account["permissions"] == assigned_perms

