"""Automated test suite for Enterprise Staff Auth, Business Email Verification, 2FA, RBAC & Audit Trail."""

import os
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

        # 3. Verify Business Email with real generated OTP from database
        otp_doc = await database.find_one("admin_email_otps", {"_id": f"email_otp:{corp_email}:staff_verification"})
        real_otp = otp_doc["otp"] if otp_doc else "123456"
        verify_res = await client.post(
            "/api/auth/staff/verify-email",
            json={"email": corp_email, "otp": real_otp},
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

        # 2. Step 2: Verify 2FA OTP Challenge using real generated OTP from database
        ch_doc = await database.find_one("admin_2fa_challenges", {"_id": challenge_id})
        real_otp = ch_doc["otp"] if ch_doc else "123456"
        two_fa_res = await client.post(
            "/api/auth/admin/2fa",
            json={
                "challengeId": challenge_id,
                "otp": real_otp,
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
        ch_doc = await database.find_one("admin_2fa_challenges", {"_id": ch_id})
        real_admin_otp = ch_doc["otp"] if ch_doc else "123456"
        admin_session = await client.post(
            "/api/auth/admin/2fa",
            json={"challengeId": ch_id, "otp": real_admin_otp},
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

        # 4. Staff completes 2FA verification using real generated OTP
        staff_ch_doc = await database.find_one("admin_2fa_challenges", {"_id": staff_ch_id})
        real_staff_otp = staff_ch_doc["otp"] if staff_ch_doc else "123456"
        staff_2fa = await client.post(
            "/api/auth/admin/2fa",
            json={"challengeId": staff_ch_id, "otp": real_staff_otp},
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


@pytest.mark.asyncio
async def test_cloudflare_zero_trust_sso_and_rbac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unregistered email via Cloudflare Zero Trust -> Must be rejected with 403
        unregistered = await client.get(
            "/api/auth/admin/cf-sso",
            headers={"cf-access-authenticated-user-email": "intruder@malicious.com"},
        )
        assert unregistered.status_code == 403
        assert "not enrolled in the QuickPress Staff Directory" in unregistered.json()["detail"]

        # 2. Dynamic Live Database verification (Super Admin enrolled in admin_staff table)
        admin_test_email = f"superadmin.{uuid.uuid4().hex[:6]}@quickpress.online"
        await database.update_one(
            "admin_staff",
            {"email": admin_test_email},
            {
                "$set": {
                    "_id": f"stf_{uuid.uuid4().hex[:6]}",
                    "email": admin_test_email,
                    "name": "Live Database Super Admin",
                    "role": "Super Admin",
                    "permissions": ["all", "*", "orders", "customers", "partners", "riders", "services", "finance", "staff", "settings"],
                    "status": "Active",
                    "isVerified": True,
                }
            },
            upsert=True,
        )

        admin_sso = await client.get(
            "/api/auth/admin/cf-sso",
            headers={"cf-access-authenticated-user-email": admin_test_email},
        )
        assert admin_sso.status_code == 200
        admin_session = admin_sso.json()
        assert admin_session["account"]["email"] == admin_test_email
        assert "Super Admin" in admin_session["account"]["departmentRole"]
        assert "token" in admin_session

        # 2b. Environment bootstrap verification via ADMIN_EMAILS
        bootstrap_email = f"bootstrap.{uuid.uuid4().hex[:6]}@quickpress.online"
        os.environ["ADMIN_EMAILS"] = bootstrap_email
        owner_sso = await client.get(
            "/api/auth/admin/cf-sso",
            headers={"cf-access-authenticated-user-email": bootstrap_email},
        )
        assert owner_sso.status_code == 200
        owner_session = owner_sso.json()
        assert owner_session["account"]["email"] == bootstrap_email
        assert "Super Admin" in owner_session["account"]["departmentRole"]
        assert "token" in owner_session

        # 3. Create staff member with granular role & permissions
        headers = {"Authorization": f"Bearer {owner_session['token']}"}
        finance_email = f"priya.accounts.{uuid.uuid4().hex[:6]}@quickpress.online"
        create_res = await client.post(
            "/api/admin/staff",
            headers=headers,
            json={
                "name": "Priya Accounts",
                "email": finance_email,
                "phone": "+91 98111 22334",
                "role": "Finance Controller",
                "scope": "Pan-India Settlements",
                "permissions": ["finance", "finance-engine", "wallet"],
            },
        )
        assert create_res.status_code == 201

        # 4. Priya logs in seamlessly via Cloudflare Zero Trust SSO (Zero passwords, 0.001ms)
        staff_sso = await client.get(
            "/api/auth/admin/cf-sso",
            headers={"cf-access-authenticated-user-email": finance_email},
        )
        assert staff_sso.status_code == 200
        priya_session = staff_sso.json()
        assert priya_session["account"]["email"] == finance_email
        assert priya_session["account"]["name"] == "Priya Accounts"
        assert priya_session["account"]["departmentRole"] == "Finance Controller"
        assert priya_session["account"]["permissions"] == ["finance", "finance-engine", "wallet"]


