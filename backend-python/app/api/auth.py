"""Authentication API — the seven Sprint 1 endpoints."""

from __future__ import annotations

import asyncio
import os
import re
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


async def _enrich_account(account: AccountResponse, user: User) -> AccountResponse:
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

    # Attach Partner Real Identity, Store Name & Verification / Onboarding Status
    if user.role == Role.partner:
        try:
            pid = user.linked_id
            prof = None
            if pid:
                prof = (
                    await database.find_one("partner_profiles", {"$or": [{"_id": pid}, {"partnerId": pid}]})
                    or await database.find_one("admin_partners", {"$or": [{"_id": pid}, {"partnerId": pid}]})
                )
            if not prof and user.phone:
                raw_p = user.phone.replace("+91", "").replace("+", "").strip()
                last10 = raw_p[-10:] if len(raw_p) >= 10 else raw_p
                phone_candidates = [p for p in [user.phone, raw_p, last10, f"+91{last10}", f"91{last10}"] if p]
                prof = (
                    await database.find_one("partner_profiles", {
                        "$or": [
                            {"phone": {"$in": phone_candidates}},
                            {"ownerPhone": {"$in": phone_candidates}},
                            {"mobile": {"$in": phone_candidates}},
                        ]
                    })
                    or await database.find_one("admin_partners", {
                        "$or": [
                            {"phone": {"$in": phone_candidates}},
                            {"ownerPhone": {"$in": phone_candidates}},
                            {"mobile": {"$in": phone_candidates}},
                        ]
                    })
                )
            if not prof and user.id:
                prof = (
                    await database.find_one("partner_profiles", {"userId": user.id})
                    or await database.find_one("admin_partners", {"userId": user.id})
                )

            if prof:
                resolved_pid = str(prof.get("_id") or prof.get("partnerId") or "")
                real_name = prof.get("businessName") or prof.get("ownerName") or prof.get("name") or prof.get("storeName")
                if real_name:
                    account.name = real_name
                if resolved_pid:
                    account.linkedId = resolved_pid
                if prof.get("city") and not account.city:
                    account.city = str(prof.get("city"))

                status_str = str(prof.get("status", "")).lower()
                is_verified = bool(
                    prof.get("isVerified") is True
                    or status_str in ("active", "approved")
                    or prof.get("kycStatus") == "verified"
                )
                is_onboarded = bool(
                    prof.get("isOnboarded") is not False
                    or is_verified
                    or status_str not in ("not_registered", "")
                )

                account.isVerified = is_verified
                account.isOnboarded = is_onboarded
                if is_verified:
                    account.status = "active"
                elif is_onboarded:
                    account.status = "pending_verification"
                elif status_str:
                    account.status = status_str

                # Keep users table ground-truth in sync
                user_updates: dict = {}
                if real_name and not user.display_name:
                    user_updates["display_name"] = real_name
                if resolved_pid and user.linked_id != resolved_pid:
                    user_updates["linked_id"] = resolved_pid
                if is_verified and not user.is_verified:
                    user_updates["is_verified"] = True
                    user_updates["status"] = "active"
                if is_onboarded and not user.is_onboarded:
                    user_updates["is_onboarded"] = True

                if user_updates:
                    user_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
                    try:
                        await database.update("users", {"_id": user.id}, {"$set": user_updates})
                    except Exception as u_exc:
                        _log.debug("Non-blocking user ground-truth sync: %s", u_exc)
        except Exception as exc:
            _log.warning("Partner account enrichment error: %s", exc)

    return account


async def _issue_session(user: User, is_new: bool = False) -> AuthSessionResponse:
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
    account.isNewUser = is_new

    account = await _enrich_account(account, user)

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

    is_new = False
    try:
        existing = await users.by_firebase_uid(identity["uid"], role=role)
        if not existing and identity.get("phone"):
            existing = await users.by_phone(identity["phone"], role=role)
        if not existing and identity.get("email"):
            existing = await users.by_email(identity["email"], role=role)
        is_new = existing is None
    except Exception:
        pass

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
    return await _issue_session(user, is_new=is_new)


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
        existing = await asyncio.wait_for(users.by_phone(phone, payload.role), timeout=2.0)
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
        except HTTPException:
            raise
        except Exception as exc:
            _log.warning("Firebase token verification failed, falling back to OTP code if provided: %s", exc)

    phone = _normalize_phone(payload.phone or "")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")

    # Guard: Public phone verification must never self-provision unvetted admin accounts
    if payload.role in (Role.admin, Role.super_admin):
        existing_admin = await users.by_phone(phone, payload.role)
        if not existing_admin:
            staff_doc = await database.find_one("admin_staff", {"phone": phone})
            if not staff_doc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin account not found for this phone number. Contact Super Admin for staff authorization.",
                )

    from app.core.rate_limiter import rate_limiter
    locked, remaining = rate_limiter.is_locked(f"otp:{phone}")
    if locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Lockout: Too many failed attempts. Please try again in {remaining // 60 + 1} minutes.",
        )

    # 2. Twilio OTP Code Verification (Mandatory if Firebase token was not verified)
    if not payload.code or not payload.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code (OTP) or valid Firebase authentication token is required.",
        )

    is_valid = verify_stored_otp(phone, payload.code)
    is_dev = settings.app_env in ("development", "test", "local")
    allowed_dev_codes = ("123456", "000000") if is_dev else ()
    if not is_valid and payload.code not in allowed_dev_codes:
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

    # 3. Retrieve or provision user for THIS role (1 Customer, 1 Partner, 1 Rider per mobile number)
    user = None
    try:
        user = await asyncio.wait_for(users.by_phone(phone, payload.role), timeout=8.0)
    except Exception as exc:
        _log.warning("User by_phone lookup timed out/failed: %s", exc)

    is_new = user is None
    if user is None:
        try:
            user = await asyncio.wait_for(users.create_phone_user(phone=phone, role=payload.role), timeout=8.0)
        except Exception as exc:
            _log.warning("create_phone_user timed out/failed: %s", exc)
            user = User(
                id=str(uuid.uuid4()),
                firebase_uid=f"phone-{phone}-{payload.role.value}",
                role=payload.role,
                phone=phone,
                status=UserStatus.active if payload.role in (Role.customer, Role.admin) else UserStatus.pending,
                is_verified=payload.role in (Role.customer, Role.admin),
                is_onboarded=payload.role in (Role.customer, Role.admin),
            )
    else:
        try:
            await asyncio.wait_for(users._ensure_role_profile(user), timeout=6.0)
            refreshed = await asyncio.wait_for(users.by_id(user.id), timeout=4.0)
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

    return await _issue_session(user, is_new=is_new)


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
async def get_me(user: User = Depends(current_user)) -> AccountResponse:
    latest_user = await users.by_id(user.id)
    u = latest_user or user
    account = AccountResponse.from_user(u)
    return await _enrich_account(account, u)


@router.post("/refresh", response_model=AuthSessionResponse)
async def refresh(payload: RefreshRequest) -> AuthSessionResponse:
    claims = decode_token(payload.refresh_token, expected_type="refresh")
    token_id = str(claims.get("jti"))
    is_valid, token_doc = await refresh_tokens.is_active_or_grace(token_id, grace_seconds=30)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Refresh token revoked")
    user = await users.by_id(str(claims.get("sub")))
    if user is None:
        raise HTTPException(status_code=401, detail="Unauthorized")

    new_session = await _issue_session(user)

    # If token was active (not yet rotated), mark it revoked and track child token
    if token_doc and not token_doc.get("revoked", False):
        try:
            new_claims = decode_token(new_session.refreshToken, expected_type="refresh")
            new_token_id = str(new_claims.get("jti"))
        except Exception:
            new_token_id = None
        await refresh_tokens.revoke(token_id, replaced_by=new_token_id)

    return new_session


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

    # Ensure Super Admin exists in database if logging in as configured admin
    admin_env_raw = os.getenv("ADMIN_EMAILS", os.getenv("ADMIN_EMAIL", "admin@quickpress.online")).strip().lower()
    owner_emails = {e.strip() for e in re.split(r"[,\s;]+", admin_env_raw) if e.strip()}
    if not staff_doc and email in owner_emails:
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
    res_data = {
        "twoFactorRequired": True,
        "challengeId": challenge["challengeId"],
        "emailMasked": challenge["emailMasked"],
        "expiresInSeconds": challenge["expiresInSeconds"],
        "message": f"2FA OTP code has been dispatched to {challenge['emailMasked']}.",
    }
    if os.getenv("APP_ENV") != "production" and challenge.get("debugOtp"):
        res_data["debugOtp"] = challenge["debugOtp"]
    return res_data


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


@router.get("/admin/cf-sso", response_model=AuthSessionResponse)
async def admin_cf_sso_login(request: Request) -> AuthSessionResponse:
    """
    Cloudflare Zero Trust Single Sign-On (SSO) Auto-Authentication.
    Reads verified perimeter identity headers passed by Cloudflare Access:
      - CF-Access-Authenticated-User-Email
      - CF-Access-Jwt-Assertion
    Validates against live admin_staff database directory and issues authentic session without passwords.
    """
    from app.core.admin_security import record_successful_login
    from app.db.client import database

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")

    # 1. Read Cloudflare Access Authenticated Email
    cf_email = (
        request.headers.get("cf-access-authenticated-user-email")
        or request.headers.get("x-cf-access-authenticated-user-email")
        or request.headers.get("x-authenticated-user-email")
    )

    # In development mode, allow query parameter override for local verification
    settings = get_settings()
    if not cf_email and settings.app_env != "production":
        cf_email = request.query_params.get("cf_email")

    if not cf_email or not cf_email.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cloudflare Zero Trust perimeter authentication headers not found.",
        )

    email = cf_email.strip().lower()

    # 2. Check live admin_staff database directory (Dynamic Ground Truth)
    staff_doc = await database.find_one("admin_staff", {"email": email})

    # Optional initial bootstrapping from environment configuration only (Zero hardcoded emails)
    admin_env_raw = os.getenv("ADMIN_EMAILS", os.getenv("ADMIN_EMAIL", "")).strip().lower()
    configured_owner_emails = {e.strip() for e in re.split(r"[,\s;]+", admin_env_raw) if e.strip()}

    now = datetime.now(timezone.utc).isoformat()
    if not staff_doc and email in configured_owner_emails:
        staff_doc = {
            "_id": f"stf_owner_{uuid.uuid4().hex[:6]}",
            "name": "Super Admin",
            "email": email,
            "phone": os.getenv("ADMIN_PHONE", "+91 99999 99999"),
            "role": "Super Admin",
            "scope": "All India Hubs",
            "permissions": [
                "all", "*", "orders", "customers", "partners", "riders", "services",
                "finance", "finance-engine", "wallet", "cities", "coupons", "memberships",
                "analytics", "notifications", "emails", "support", "staff", "settings", "crm"
            ],
            "status": "Active",
            "isVerified": True,
            "lastActive": "Active now",
            "createdAt": now,
            "updatedAt": now,
        }
        await database.update_one("admin_staff", {"email": email}, {"$set": staff_doc}, upsert=True)

    if not staff_doc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Email '{email}' is authenticated by Cloudflare Zero Trust, but is not enrolled in the QuickPress Staff Directory. Please contact your Super Admin to be assigned a staff role.",
        )

    # 3. Check active status in database
    staff_status = str(staff_doc.get("status", "Active")).strip().lower()
    if staff_status in ("suspended", "blocked", "inactive"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Staff account for '{email}' is currently {staff_status}. Please contact Super Admin.",
        )

    # 4. Sync / load User model
    user = await users.by_email(email, Role.admin)
    if not user:
        user = await users.by_email(email, Role.super_admin)
    if not user:
        # Check if user already exists with any role by email
        existing_any = await users.by_email(email)
        if existing_any:
            user = existing_any
            user.role = Role.admin
            user.status = UserStatus.active
            user.is_verified = True
            user.is_onboarded = True
            await users.update(
                user.id,
                {
                    "role": Role.admin.value,
                    "status": UserStatus.active.value,
                    "is_verified": True,
                    "is_onboarded": True,
                },
            )
        else:
            staff_id = str(staff_doc.get("_id") or staff_doc.get("id") or f"usr_stf_{uuid.uuid4().hex[:8]}")
            user = await users.create(
                User(
                    id=staff_id,
                    email=email,
                    phone=staff_doc.get("phone", "+919999999999"),
                    display_name=staff_doc.get("name", "Staff Administrator"),
                    role=Role.admin,
                    status=UserStatus.active,
                    is_verified=True,
                    is_onboarded=True,
                )
            )

    # 5. Update last active timestamp in database
    await database.update_one("admin_staff", {"email": email}, {"$set": {"lastActive": now, "updatedAt": now}})

    # 6. Audit log login event
    try:
        from app.db.admin_repositories import audit_repository
        actor_id = email
        await audit_repository.log(
            actor_id,
            "staff.cf_sso_login",
            user.id,
            meta={"email": email, "auth": "cloudflare_zero_trust", "client_ip": client_ip, "role": staff_doc.get("role")},
        )
    except Exception as exc:
        _log.warning("Audit log staff.cf_sso_login failed: %s", exc)

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

    res_staff = {
        "ok": True,
        "email": email,
        "message": f"Verification OTP has been sent to your business email ({email}).",
    }
    if os.getenv("APP_ENV") != "production" and otp:
        res_staff["debugOtp"] = otp
    return res_staff


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
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        await database.update("users", {"_id": user.id}, {"$set": {"logged_out_at": now_iso}})
    except Exception as exc:
        _log.warning("User logged_out_at update: %s", exc)
    return {"ok": True}


@router.delete("/account")
@router.delete("/me")
async def delete_account(user: User = Depends(current_user)) -> dict:
    from app.db.profile_repositories import profile_repository
    return await profile_repository.delete_account(user)


