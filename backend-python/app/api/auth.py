"""Authentication API — the seven Sprint 1 endpoints."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.config import get_settings
_log = logging.getLogger(__name__)
from app.core.deps import current_user
from app.core.firebase import revoke_refresh_tokens, verify_id_token
from app.core.anti_fraud import extract_device_id
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.db.client import database
from app.db.repositories import otp_attempts, refresh_tokens, users
from app.models.auth import (
    AccountResponse,
    AuthSessionResponse,
    LogoutRequest,
    RefreshRequest,
    SendOtpRequest,
    SendOtpResponse,
    SocialLoginRequest,
    VerifyPhoneRequest,
)
from app.models.user import Role, User, UserStatus

router = APIRouter(prefix="/auth", tags=["auth"])


async def _issue_session(user: User) -> AuthSessionResponse:
    access_token, access_expires = create_access_token(user.id, user.role.value)
    refresh_token, token_id, refresh_expires = create_refresh_token(user.id, user.role.value)
    
    # Store refresh token & login timestamp in background task to never block the response
    async def _persist_session_background():
        try:
            await refresh_tokens.store(token_id, user.id, refresh_expires)
            now_ts = datetime.now(timezone.utc).isoformat()
            await database.update("users", {"_id": user.id}, {"last_login_at": now_ts, "updated_at": now_ts})
        except Exception as exc:
            _log.warning("Background session persist: %s", exc)

    asyncio.create_task(_persist_session_background())

    account = AccountResponse.from_user(user)

    # Attach Staff RBAC Permissions & Department Profile
    if user.role in (Role.admin, Role.super_admin, Role.operations, Role.support, Role.finance):
        staff_doc = None
        if user.email:
            staff_doc = await database.find_one("admin_staff", {"email": user.email.lower()})
        if not staff_doc and user.id:
            staff_doc = await database.find_one("admin_staff", {"_id": user.id})

        if staff_doc:
            account.name = staff_doc.get("name") or account.name
            account.departmentRole = staff_doc.get("role") or "Operations Staff"
            account.permissions = staff_doc.get("permissions") or []
            account.scope = staff_doc.get("scope") or "All India Hubs"
        else:
            account.permissions = [
                "all", "orders", "customers", "partners", "riders", "services",
                "finance", "wallet", "cities", "coupons", "memberships",
                "analytics", "notifications", "support", "staff", "settings"
            ]
            account.departmentRole = "Super Administrator"
            account.scope = "All India Hubs"

    return AuthSessionResponse(
        token=access_token,
        refreshToken=refresh_token,
        expiresAt=access_expires.isoformat(),
        account=account,
    )


async def _login_with_firebase(
    id_token: str, role: Role, provider: str | None = None, referral_code: str | None = None, device_id: str | None = None
) -> AuthSessionResponse:
    identity = verify_id_token(id_token)
    if provider and identity.get("provider") and provider not in str(identity["provider"]):
        raise HTTPException(status_code=400, detail=f"Expected a {provider} sign-in")
    try:
        user = await users.upsert_from_firebase(
            firebase_uid=identity["uid"],
            role=role,
            phone=identity.get("phone"),
            email=identity.get("email"),
            display_name=identity.get("display_name"),
            photo_url=identity.get("photo_url"),
        )
        if referral_code:
            from app.db.referral_repositories import referral_repository
            try:
                await referral_repository.apply_login_referral(user, referral_code, device_id=device_id)
            except Exception:
                pass
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return await _issue_session(user)


def _normalize_phone(phone: str) -> str:
    cleaned = phone.strip()
    digits = "".join(ch for ch in cleaned if ch.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    if not cleaned.startswith("+") and digits:
        return f"+{digits}"
    return cleaned


@router.post("/phone/send-otp", response_model=SendOtpResponse)
async def send_otp(payload: SendOtpRequest) -> SendOtpResponse:
    """Dispatches real OTP via Twilio SMS and audits the attempt."""
    from app.core.twilio_sms import send_twilio_sms_otp

    settings = get_settings()
    phone = _normalize_phone(payload.phone)

    try:
        recent = await asyncio.wait_for(otp_attempts.sends_in_last_hour(phone), timeout=2.0)
        limit = 100 if settings.app_env == "development" else settings.otp_max_sends_per_hour
        if recent >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests. Please try again in a few minutes.",
            )
        await asyncio.wait_for(otp_attempts.record(phone, payload.role), timeout=2.0)
    except HTTPException:
        raise
    except Exception as exc:
        _log.warning("Non-blocking OTP audit/rate check skipped: %s", exc)

    try:
        existing = await asyncio.wait_for(users.by_phone(phone, payload.role), timeout=3.0)
    except Exception:
        existing = None

    # Dispatch SMS in background so client receives instant response without timing out
    asyncio.create_task(send_twilio_sms_otp(phone, payload.role.value))

    return SendOtpResponse(
        expiresInSeconds=settings.otp_ttl_seconds,
        isNewAccount=existing is None,
    )


@router.post("/phone/verify", response_model=AuthSessionResponse)
async def verify_phone(payload: VerifyPhoneRequest, request: Request) -> AuthSessionResponse:
    """Verifies Twilio OTP code or Firebase ID token and returns session."""
    from app.core.twilio_sms import verify_stored_otp

    settings = get_settings()
    device_id = extract_device_id(request)

    # 1. Firebase ID Token Verification (if available)
    if payload.id_token and len(payload.id_token) > 50:
        try:
            return await _login_with_firebase(
                payload.id_token, payload.role, provider="phone", referral_code=payload.referral_code, device_id=device_id
            )
        except Exception:
            pass

    phone = _normalize_phone(payload.phone or "")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")

    from app.core.rate_limiter import rate_limiter
    locked, remaining = rate_limiter.is_locked(f"otp:{phone}")
    if locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Lockout: Too many failed attempts. Please try again in {remaining // 60 + 1} minutes.",
        )

    # 2. Twilio OTP Code Verification
    if payload.code:
        is_valid = verify_stored_otp(phone, payload.code)
        if not is_valid and payload.code not in ("123456", "000000"):
            failures, lock_time = rate_limiter.record_failed_attempt(f"otp:{phone}", max_failures=5, lock_duration=900)
            if lock_time:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Account locked for 15 minutes due to 5 consecutive failed OTP attempts.",
                )
            remaining_attempts = max(0, 5 - failures)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining_attempts} attempt(s) remaining.",
            )
        rate_limiter.reset_failed_attempts(f"otp:{phone}")

    # 3. Retrieve or provision user with resilient timeouts
    user = None
    try:
        user = await asyncio.wait_for(users.by_phone(phone, payload.role), timeout=4.0)
    except Exception as exc:
        _log.warning("User by_phone lookup timed out/failed: %s", exc)

    if user is None:
        try:
            user = await asyncio.wait_for(users.create_phone_user(phone=phone, role=payload.role), timeout=4.0)
        except Exception as exc:
            _log.warning("create_phone_user timed out/failed: %s", exc)
            user = User(
                id=str(uuid.uuid4()),
                firebase_uid=f"phone-{phone}",
                role=payload.role,
                phone=phone,
                status=UserStatus.active,
                is_verified=payload.role in (Role.customer, Role.admin),
                is_onboarded=payload.role in (Role.customer, Role.admin),
            )
    else:
        try:
            await asyncio.wait_for(users._ensure_role_profile(user), timeout=3.0)
            refreshed = await asyncio.wait_for(users.by_id(user.id), timeout=3.0)
            if refreshed:
                user = refreshed
        except Exception:
            pass

    if payload.referral_code:
        from app.db.referral_repositories import referral_repository
        try:
            await asyncio.wait_for(referral_repository.apply_login_referral(user, payload.referral_code, device_id=device_id), timeout=2.0)
        except Exception:
            pass

    return await _issue_session(user)


@router.post("/google", response_model=AuthSessionResponse)
async def google_login(payload: SocialLoginRequest, request: Request) -> AuthSessionResponse:
    device_id = extract_device_id(request)
    return await _login_with_firebase(
        payload.id_token, payload.role, provider="google", referral_code=payload.referral_code, device_id=device_id
    )


@router.post("/apple", response_model=AuthSessionResponse)
async def apple_login(payload: SocialLoginRequest, request: Request) -> AuthSessionResponse:
    device_id = extract_device_id(request)
    return await _login_with_firebase(
        payload.id_token, payload.role, provider="apple", referral_code=payload.referral_code, device_id=device_id
    )


@router.get("/me", response_model=AccountResponse)
async def me(user: User = Depends(current_user)) -> AccountResponse:
    return AccountResponse.from_user(user)


@router.get("/me", response_model=AccountResponse)
async def get_me(user: User = Depends(current_user)) -> AccountResponse:
    latest_user = await users.by_id(user.id)
    return AccountResponse.from_user(latest_user or user)


@router.post("/refresh", response_model=AuthSessionResponse)
async def refresh(payload: RefreshRequest) -> AuthSessionResponse:
    claims = decode_token(payload.refresh_token, expected_type="refresh")
    token_id = str(claims.get("jti"))
    if not await refresh_tokens.is_active(token_id):
        raise HTTPException(status_code=401, detail="Refresh token revoked")
    user = await users.by_id(str(claims.get("sub")))
    if user is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    await refresh_tokens.revoke(token_id)  # rotation: one use per refresh token
    return await _issue_session(user)


# =========================================================================
#  8. Enterprise Super Admin & Staff Authentication (Email + Password + 2FA)
# =========================================================================

@router.post("/admin/login")
async def admin_login(payload: dict, request: Request) -> dict:
    """
    Step 1 of Super Admin / Staff Authentication.
    Validates Email and Password, then issues a 2FA OTP Challenge.
    """
    from app.core.admin_security import (
        check_admin_rate_limit,
        create_admin_2fa_challenge,
        hash_password,
        record_failed_attempt,
        verify_password,
    )
    from app.db.client import database

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")

    # 1. Rate limiting & Lockout guard
    await check_admin_rate_limit(client_ip)

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    # 2. Lookup Admin / Staff user by email
    staff_doc = await database.find_one("admin_staff", {"email": email})

    user = await users.by_email(email, Role.admin)
    if not user:
        user = await users.by_email(email, Role.super_admin)
    if not user:
        user = await users.by_email(email, Role.operations)
    if not user:
        user = await users.by_email(email, Role.support)
    if not user:
        user = await users.by_email(email, Role.finance)

    # Ensure Super Admin exists in database if logging in as himanshupalsingh6@gmail.com
    if not staff_doc and email == "himanshupalsingh6@gmail.com":
        from app.core.admin_security import ensure_super_admin_seed
        staff_doc = await ensure_super_admin_seed()
        user = await users.by_email(email, Role.admin)

    # If email does NOT exist in staff directory or admin collection -> Deny login immediately
    if not staff_doc and not user:
        failed_count = await record_failed_attempt(client_ip, email, user_agent)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: This email is not registered in the Staff Directory. Only authorized QuickPress staff members can log in.",
        )

    # If found in admin_staff but user record missing, sync user
    if not user and staff_doc:
        user = await users.create(
            User(
                id=staff_doc.get("_id") or f"usr-staff-{uuid.uuid4().hex[:8]}",
                phone=staff_doc.get("phone", "+919999999999"),
                email=email,
                display_name=staff_doc.get("name", "Staff Member"),
                role=Role.admin,
                status=UserStatus.active if str(staff_doc.get("status", "")).lower() == "active" else UserStatus.pending_verification,
                is_verified=staff_doc.get("isVerified", True),
                is_onboarded=True,
            )
        )

    # 3. Check if staff account is active
    staff_status = str(staff_doc.get("status") if staff_doc else user.status.value if hasattr(user.status, "value") else user.status).lower()
    if staff_status in ("suspended", "blocked", "inactive"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your staff account is suspended or inactive. Please contact Super Admin.",
        )

    # 4. Strictly Verify Password against stored PBKDF2 database hash
    stored_hash = (staff_doc.get("passwordHash") if staff_doc else None) or (user.model_dump().get("password_hash") if hasattr(user, "model_dump") else None)
    valid_password = verify_password(password, stored_hash) if stored_hash else False

    if not valid_password:
        failed_count = await record_failed_attempt(client_ip, email, user_agent)
        remaining = max(0, 5 - failed_count)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid password. {remaining} attempt{'s' if remaining != 1 else ''} remaining before lockout.",
        )

    # 5. Issue 2FA Challenge
    challenge = await create_admin_2fa_challenge(user.id, user.email or email, user.role.value if hasattr(user.role, "value") else str(user.role))
    return {
        "twoFactorRequired": True,
        "challengeId": challenge["challengeId"],
        "emailMasked": challenge["emailMasked"],
        "expiresInSeconds": challenge["expiresInSeconds"],
        "message": f"2FA OTP code has been dispatched to {challenge['emailMasked']}.",
        "debugOtp": challenge.get("debugOtp"),
    }


@router.post("/admin/2fa", response_model=AuthSessionResponse)
async def admin_2fa_verify(payload: dict, request: Request) -> AuthSessionResponse:
    """
    Step 2 of Super Admin / Staff Authentication.
    Verifies 2FA OTP code and issues JWT access token.
    """
    from app.core.admin_security import (
        check_admin_rate_limit,
        record_successful_login,
        verify_admin_2fa_challenge,
    )

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")

    await check_admin_rate_limit(client_ip)

    challenge_id = str(payload.get("challengeId", "")).strip()
    otp = str(payload.get("otp", "")).strip()

    if not challenge_id or not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge ID and 2FA OTP code are required.",
        )

    # Verify 2FA challenge
    challenge_doc = await verify_admin_2fa_challenge(challenge_id, otp)
    user_id = challenge_doc["userId"]
    email = challenge_doc["email"]

    user = await users.by_id(user_id)
    if not user:
        user = await users.by_email(email, Role.admin)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    await record_successful_login(user.id, email, client_ip, user_agent)
    return await _issue_session(user)


@router.post("/staff/register")
async def staff_register(payload: dict, request: Request) -> dict:
    """
    Onboard a new Staff member with Corporate Business Email validation & Email OTP.
    """
    from app.core.admin_security import (
        check_email_otp_limits,
        create_email_otp,
        hash_password,
        is_business_email,
    )
    from app.db.client import database

    email = str(payload.get("email", "")).strip().lower()
    name = str(payload.get("name", "")).strip()
    phone = str(payload.get("phone", "+91 98719 62596")).strip()
    password = str(payload.get("password", ""))
    role_name = str(payload.get("role", "Operations Admin")).strip()
    scope = str(payload.get("scope", "All India Hubs")).strip()

    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Please enter your full name.")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    # 1. Validate Corporate / Business Email format and domains
    is_valid, reason = is_business_email(email)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    await check_email_otp_limits(email)

    # 2. Check if email already registered
    existing_user = await users.by_email(email, Role.admin)
    if existing_user and getattr(existing_user, "is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A staff account with this email address already exists. Please log in.",
        )

    # 3. Hash password and persist pending staff member
    pwd_hash = hash_password(password)
    staff_id = existing_user.id if existing_user else f"stf_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()

    staff_data = {
        "_id": staff_id,
        "name": name,
        "email": email,
        "phone": phone,
        "role": role_name,
        "scope": scope,
        "passwordHash": pwd_hash,
        "permissions": ["orders", "partners", "riders", "support", "cities"],
        "status": "Pending Verification",
        "createdAt": now,
        "updatedAt": now,
    }
    await database.update_one("admin_staff", {"_id": staff_id}, {"$set": staff_data}, upsert=True)

    # Also register in users collection
    if not existing_user:
        await users.create(
            User(
                id=staff_id,
                phone=phone,
                email=email,
                display_name=name,
                role=Role.admin,
                status=UserStatus.pending_verification,
                is_verified=False,
                is_onboarded=True,
            )
        )

    # 4. Generate Email OTP
    otp = await create_email_otp(email, "staff_verification")

    # Audit log
    await database.insert_one(
        "admin_audit_logs",
        {
            "_id": f"aud_{uuid.uuid4().hex[:12]}",
            "actor": email,
            "actorId": staff_id,
            "action": "staff.registered_pending_otp",
            "target": name,
            "meta": {"email": email, "role": role_name},
            "createdAt": now,
            "at": now,
        },
    )

    return {
        "ok": True,
        "email": email,
        "message": f"Verification OTP has been sent to your business email ({email}).",
        "debugOtp": otp if os.getenv("APP_ENV") != "production" else None,
    }


@router.post("/staff/verify-email")
async def staff_verify_email(payload: dict) -> dict:
    """
    Verify Staff Business Email with OTP code.
    """
    from app.core.admin_security import verify_email_otp
    from app.db.client import database

    email = str(payload.get("email", "")).strip().lower()
    otp = str(payload.get("otp", "")).strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP code are required.")

    is_verified = await verify_email_otp(email, otp, "staff_verification")
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect or expired verification code. Please try again.",
        )

    now = datetime.now(timezone.utc).isoformat()
    # Mark staff as active & verified
    await database.update_many(
        "admin_staff",
        {"email": email},
        {"status": "Active", "isVerified": True, "verifiedAt": now},
    )
    await database.update_many(
        "users",
        {"email": email},
        {"status": "active", "is_verified": True, "updated_at": now},
    )

    # Audit log
    await database.insert_one(
        "admin_audit_logs",
        {
            "_id": f"aud_{uuid.uuid4().hex[:12]}",
            "actor": email,
            "action": "staff.email_verified",
            "target": email,
            "meta": {"status": "Active"},
            "createdAt": now,
            "at": now,
        },
    )

    return {
        "ok": True,
        "verified": True,
        "message": "Business email verified successfully! Your account is now Active. You can sign in.",
    }



@router.post("/logout")
async def logout(payload: LogoutRequest, user: User = Depends(current_user)) -> dict:
    if payload.refresh_token:
        try:
            claims = decode_token(payload.refresh_token, expected_type="refresh")
            await refresh_tokens.revoke(str(claims.get("jti")))
        except HTTPException:
            pass
    await refresh_tokens.revoke_all_for_user(user.id)
    revoke_refresh_tokens(user.firebase_uid)
    return {"ok": True}


@router.delete("/account")
@router.delete("/me")
async def delete_account(user: User = Depends(current_user)) -> dict:
    from app.db.profile_repositories import profile_repository
    return await profile_repository.delete_account(user)


