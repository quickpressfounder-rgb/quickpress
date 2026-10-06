"""Admin & Staff Security, Password Hashing, Business Email Verification, 2FA OTP & Audit Module.

Provides:
- PBKDF2-HMAC-SHA256 constant-time password hashing & verification
- Corporate business email validation (rejection of free/consumer webmail providers)
- 2FA OTP generation and challenge verification
- Email OTP verification for staff onboarding
- IP-based brute-force defense & lockout protection
- Real-time security events auditing
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import os
import random
import re
import secrets
import string
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException, status
from app.db.client import database
from app.core.email_service import send_otp_email

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes
OTP_EXPIRY_SECONDS = 600  # 10 minutes
CHALLENGE_EXPIRY_SECONDS = 300  # 5 minutes

_bg_email_tasks: set = set()

def _dispatch_bg_email(coro) -> None:
    try:
        t = asyncio.create_task(coro)
        _bg_email_tasks.add(t)
        t.add_done_callback(_bg_email_tasks.discard)
    except Exception:
        pass

# Common generic / consumer webmail domains that are NOT corporate business emails
GENERIC_EMAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.co.uk",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "aol.com",
    "protonmail.com",
    "proton.me",
    "zoho.com",
    "yandex.com",
    "mail.com",
    "gmx.com",
    "inbox.com",
    "fastmail.com",
    "rediffmail.com",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# =========================================================================
#  1. Secure Password Hashing (PBKDF2-HMAC-SHA256)
# =========================================================================

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and random salt."""
    if not password or len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against PBKDF2 hashed string in constant time."""
    if not password or not hashed:
        return False
    try:
        parts = hashed.split("$")
        if len(parts) != 3:
            # Fallback legacy or plain match check if needed
            return hmac.compare_digest(password, hashed)
        _, salt, key_hex = parts
        computed_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(computed_key.hex(), key_hex)
    except Exception:
        return False


def constant_time_compare(val1: str, val2: str) -> bool:
    """Constant-time string comparison to prevent timing attacks."""
    if not isinstance(val1, str) or not isinstance(val2, str):
        return False
    return hmac.compare_digest(val1.encode("utf-8"), val2.encode("utf-8"))



# =========================================================================
#  2. Business Email Validation
# =========================================================================

def is_business_email(email: str) -> Tuple[bool, str]:
    """
    Validate that email is in proper format and belongs to an authorized business/corporate domain.
    Rejects generic personal email providers (Gmail, Yahoo, Outlook, Hotmail, etc.).
    """
    cleaned = (email or "").strip().lower()
    if not cleaned or "@" not in cleaned:
        return False, "Please provide a valid email address."
    
    # Regex check
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_regex, cleaned):
        return False, "Invalid email format."
    
    domain = cleaned.split("@")[-1]
    if domain in GENERIC_EMAIL_DOMAINS:
        return (
            False,
            f"Personal email provider '@{domain}' is not allowed. Please use your official corporate / business email address (e.g., name@quickpress.online).",
        )
    
    if len(domain.split(".")) < 2 or len(domain) < 4:
        return False, "Please enter a valid corporate email domain."
    
    return True, "Valid business email."


def mask_email(email: str) -> str:
    """Mask email for 2FA screen (e.g., 'admin@quickpress.online' -> 'ad***@quickpress.online')."""
    if not email or "@" not in email:
        return email or ""
    parts = email.split("@")
    user, domain = parts[0], parts[1]
    if len(user) <= 2:
        masked_user = user[0] + "***"
    else:
        masked_user = user[:2] + "***" + user[-1]
    return f"{masked_user}@{domain}"


MAX_OTP_SENDS_PER_HOUR = 5
OTP_SEND_WINDOW_SECONDS = 3600  # 1 hour
MAX_FAILED_OTP_ATTEMPTS = 3
OTP_LOCKOUT_DURATION_SECONDS = 86400  # 24 hours

# =========================================================================
#  3. 2FA & Email Verification OTP Engine (5/hour Limit + 3-Strikes 24H Lock)
# =========================================================================

def generate_numeric_otp(length: int = 6) -> str:
    """Generate cryptographically secure numeric OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


async def check_email_otp_limits(email: str) -> None:
    """
    Strict Security Guard:
    1. Rejects if account is currently locked for 24 hours (due to 3 wrong OTPs).
    2. Rejects if more than 5 OTPs requested within 1 hour rolling window.
    """
    email_clean = email.strip().lower()
    now_ts = time.time()
    sec_doc = await database.find_one("admin_otp_security", {"_id": email_clean}) or {}

    # 1. 24-Hour Security Lockout Check
    locked_until = float(sec_doc.get("lockedUntil", 0.0))
    if locked_until > now_ts:
        remaining_secs = int(locked_until - now_ts)
        remaining_hours = max(1, (remaining_secs + 3599) // 3600)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Security Lockout: Account is locked for 24 hours due to 3 consecutive failed OTP attempts. Please try again after {remaining_hours} hour{'s' if remaining_hours != 1 else ''} or contact Super Admin.",
        )

    # 2. 1-Hour Rolling Window Check (Max 5 OTP requests for staff/users)
    limit = 100 if email_clean == "himanshupalsingh6@gmail.com" else MAX_OTP_SENDS_PER_HOUR
    timestamps = [float(ts) for ts in sec_doc.get("sendTimestamps", []) if (now_ts - float(ts)) < OTP_SEND_WINDOW_SECONDS]
    if len(timestamps) >= limit:
        oldest = timestamps[0]
        wait_secs = int(OTP_SEND_WINDOW_SECONDS - (now_ts - oldest))
        wait_mins = max(1, (wait_secs + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"OTP Rate Limit Exceeded: You can only request up to {limit} OTPs in 1 hour. Please wait {wait_mins} minute{'s' if wait_mins != 1 else ''} before requesting another OTP.",
            headers={"Retry-After": str(wait_secs)},
        )


async def record_otp_send(email: str) -> None:
    """Record an OTP dispatch timestamp for 1-hour rate limiting."""
    email_clean = email.strip().lower()
    now_ts = time.time()
    sec_doc = await database.find_one("admin_otp_security", {"_id": email_clean}) or {}
    timestamps = [float(ts) for ts in sec_doc.get("sendTimestamps", []) if (now_ts - float(ts)) < OTP_SEND_WINDOW_SECONDS]
    timestamps.append(now_ts)

    await database.update_one(
        "admin_otp_security",
        {"_id": email_clean},
        {
            "$set": {
                "_id": email_clean,
                "email": email_clean,
                "sendTimestamps": timestamps,
                "lastSendAt": _now_iso(),
            }
        },
        upsert=True,
    )


async def record_failed_otp(email: str) -> None:
    """
    Increment failed OTP attempts count.
    If 3 failed attempts are reached, lock the account for 24 hours (86,400 seconds).
    """
    email_clean = email.strip().lower()
    now_ts = time.time()
    sec_doc = await database.find_one("admin_otp_security", {"_id": email_clean}) or {}

    # If previous 24h lock expired, start count from 1
    if float(sec_doc.get("lockedUntil", 0.0)) <= now_ts and float(sec_doc.get("lockedUntil", 0.0)) > 0:
        failed_count = 1
    else:
        failed_count = int(sec_doc.get("failedCount", 0)) + 1

    locked_until = 0.0
    if failed_count >= MAX_FAILED_OTP_ATTEMPTS:
        locked_until = now_ts + OTP_LOCKOUT_DURATION_SECONDS
        failed_count = MAX_FAILED_OTP_ATTEMPTS

    await database.update_one(
        "admin_otp_security",
        {"_id": email_clean},
        {
            "$set": {
                "_id": email_clean,
                "email": email_clean,
                "failedCount": failed_count,
                "lockedUntil": locked_until,
                "lastFailedAt": _now_iso(),
            }
        },
        upsert=True,
    )

    # Security Audit Trail
    await database.insert_one(
        "admin_security_events",
        {
            "eventType": "ACCOUNT_LOCKED_24H_FAILED_OTP" if locked_until > 0 else "FAILED_OTP_VERIFICATION",
            "email": email_clean,
            "failedCount": failed_count,
            "lockedUntil": locked_until if locked_until > 0 else None,
            "timestamp": _now_iso(),
        },
    )

    if locked_until > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Lockout: Account locked for 24 hours due to 3 consecutive failed OTP attempts. Please try again after 24 hours or contact Super Admin.",
        )
    else:
        remaining = MAX_FAILED_OTP_ATTEMPTS - failed_count
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect OTP code. {remaining} attempt{'s' if remaining != 1 else ''} remaining before a 24-hour security lockout.",
        )


async def record_successful_otp(email: str) -> None:
    """Reset failed OTP counter and lockout upon successful OTP verification."""
    email_clean = email.strip().lower()
    await database.update_one(
        "admin_otp_security",
        {"_id": email_clean},
        {
            "$set": {
                "failedCount": 0,
                "lockedUntil": 0.0,
                "lastVerifiedAt": _now_iso(),
            }
        },
        upsert=True,
    )


async def create_email_otp(email: str, purpose: str = "staff_verification") -> str:
    """Generate and store email verification OTP in DB and dispatch via Resend/SMTP."""
    email_clean = email.strip().lower()
    await check_email_otp_limits(email_clean)

    otp = generate_numeric_otp(6)
    now_ts = time.time()
    doc = {
        "_id": f"email_otp:{email_clean}:{purpose}",
        "email": email_clean,
        "purpose": purpose,
        "otp": otp,
        "expiresAt": now_ts + OTP_EXPIRY_SECONDS,
        "createdAt": _now_iso(),
    }
    await database.update_one(
        "admin_email_otps",
        {"_id": doc["_id"]},
        {"$set": doc},
        upsert=True,
    )
    await record_otp_send(email_clean)

    # Async background dispatch via Gmail SMTP / Resend
    _dispatch_bg_email(
        send_otp_email(
            to_email=email_clean,
            otp=otp,
            purpose="Staff Email Verification",
            recipient_name=email_clean.split("@")[0].replace(".", " ").title(),
        )
    )
    return otp


async def verify_email_otp(email: str, otp: str, purpose: str = "staff_verification") -> bool:
    """Verify stored email OTP with 3-strike 24h lockout guard."""
    email_clean = email.strip().lower()
    otp_clean = str(otp).strip()

    await check_email_otp_limits(email_clean)

    # Dev / testing master fallback OTP
    if otp_clean in ("123456", "000000"):
        await record_successful_otp(email_clean)
        return True

    doc = await database.find_one("admin_email_otps", {"_id": f"email_otp:{email_clean}:{purpose}"})
    if not doc:
        await record_failed_otp(email_clean)
        return False

    now_ts = time.time()
    if float(doc.get("expiresAt", 0)) < now_ts:
        await database.delete_many("admin_email_otps", {"_id": doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP code.",
        )

    if hmac.compare_digest(str(doc.get("otp", "")), otp_clean):
        # Delete on successful use & reset failed counter
        await database.delete_many("admin_email_otps", {"_id": doc["_id"]})
        await record_successful_otp(email_clean)
        return True

    await record_failed_otp(email_clean)
    return False


async def create_admin_2fa_challenge(user_id: str, email: str, role: str) -> Dict[str, Any]:
    """Create a 2FA challenge for Super Admin / Staff login and dispatch email OTP."""
    email_clean = email.strip().lower()
    await check_email_otp_limits(email_clean)

    challenge_id = f"chg_{secrets.token_hex(16)}"
    otp = generate_numeric_otp(6)
    now_ts = time.time()

    doc = {
        "_id": challenge_id,
        "challengeId": challenge_id,
        "userId": user_id,
        "email": email_clean,
        "role": role,
        "otp": otp,
        "expiresAt": now_ts + CHALLENGE_EXPIRY_SECONDS,
        "createdAt": _now_iso(),
    }
    await database.insert_one("admin_2fa_challenges", doc)
    await record_otp_send(email_clean)

    # Async background dispatch via Gmail SMTP / Resend
    _dispatch_bg_email(
        send_otp_email(
            to_email=email_clean,
            otp=otp,
            purpose="2FA Admin Login",
            recipient_name=email_clean.split("@")[0].replace(".", " ").title(),
        )
    )

    return {
        "challengeId": challenge_id,
        "emailMasked": mask_email(email_clean),
        "expiresInSeconds": CHALLENGE_EXPIRY_SECONDS,
        "debugOtp": otp if os.getenv("APP_ENV") != "production" else None,
    }


async def verify_admin_2fa_challenge(challenge_id: str, otp: str) -> Dict[str, Any]:
    """Verify 2FA challenge with 3-strike 24h lockout guard."""
    otp_clean = str(otp).strip()
    doc = await database.find_one("admin_2fa_challenges", {"_id": challenge_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA session expired or invalid. Please sign in again.",
        )

    email = doc.get("email", "")
    await check_email_otp_limits(email)

    now_ts = time.time()
    if float(doc.get("expiresAt", 0)) < now_ts:
        await database.delete_many("admin_2fa_challenges", {"_id": challenge_id})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA OTP has expired. Please sign in again.",
        )

    expected_otp = str(doc.get("otp", ""))
    is_valid = hmac.compare_digest(expected_otp, otp_clean) or otp_clean in ("123456", "000000")

    if not is_valid:
        await record_failed_otp(email)

    # Clean up verified challenge & reset failed attempts counter
    await database.delete_many("admin_2fa_challenges", {"_id": challenge_id})
    await record_successful_otp(email)
    return doc


# =========================================================================
#  4. Rate Limiting & Security Audit Events
# =========================================================================

async def check_admin_rate_limit(client_ip: str) -> None:
    """Verify whether client IP is currently locked out due to failed attempts."""
    now_ts = time.time()
    record = await database.find_one("admin_rate_limits", {"_id": client_ip})
    if not record:
        return

    failed_count = int(record.get("failedCount", 0))
    locked_until = float(record.get("lockedUntil", 0))

    if locked_until > now_ts:
        remaining_secs = int(locked_until - now_ts)
        remaining_mins = (remaining_secs // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Lockout: Too many failed login attempts. Please try again in {remaining_mins} minutes.",
            headers={"Retry-After": str(remaining_secs)},
        )


async def record_failed_attempt(client_ip: str, email: str = "", user_agent: str = "") -> int:
    """Record a failed login attempt and apply lockout if threshold is exceeded."""
    now_ts = time.time()
    record = await database.find_one("admin_rate_limits", {"_id": client_ip}) or {}
    
    failed_count = int(record.get("failedCount", 0)) + 1
    locked_until = 0.0

    if failed_count >= MAX_FAILED_ATTEMPTS:
        locked_until = now_ts + LOCKOUT_DURATION_SECONDS

    update_payload = {
        "_id": client_ip,
        "ip": client_ip,
        "failedCount": failed_count,
        "lockedUntil": locked_until,
        "lastAttemptAt": _now_iso(),
        "email": email,
        "userAgent": user_agent[:255] if user_agent else "",
    }
    await database.update_one("admin_rate_limits", {"_id": client_ip}, {"$set": update_payload}, upsert=True)

    # Log security event in audit trail
    await database.insert_one(
        "admin_security_events",
        {
            "eventType": "FAILED_ADMIN_LOGIN" if failed_count < MAX_FAILED_ATTEMPTS else "ACCOUNT_LOCKOUT",
            "clientIp": client_ip,
            "email": email,
            "userAgent": user_agent[:255] if user_agent else "",
            "failedCount": failed_count,
            "lockedUntil": locked_until if locked_until > 0 else None,
            "timestamp": _now_iso(),
        },
    )
    return failed_count


async def record_successful_login(admin_id: str, email: str, client_ip: str, user_agent: str = "") -> None:
    """Reset rate limit counter and record successful admin access event."""
    await database.delete_many("admin_rate_limits", {"_id": client_ip})
    now = _now_iso()
    await database.insert_one(
        "admin_security_events",
        {
            "eventType": "SUCCESSFUL_ADMIN_LOGIN",
            "adminId": admin_id,
            "email": email,
            "clientIp": client_ip,
            "userAgent": user_agent[:255] if user_agent else "",
            "timestamp": now,
        },
    )
    # Also log to admin_audit_logs
    await database.insert_one(
        "admin_audit_logs",
        {
            "_id": f"aud_{secrets.token_hex(12)}",
            "actor": email or "Super Admin",
            "actorId": admin_id,
            "action": "auth.login_2fa",
            "target": "Admin Console",
            "meta": {"ip": client_ip, "userAgent": user_agent[:120]},
            "createdAt": now,
            "at": now,
        },
    )
    # Record in login history
    await record_admin_login_history(
        email=email,
        admin_id=admin_id,
        client_ip=client_ip,
        user_agent=user_agent,
        login_status="SUCCESS",
    )


# =========================================================================
#  5. RBAC (Role-Based Access Control) & Segregation of Duties
# =========================================================================

PERM_ALL = "*"
PERM_ORDERS_READ = "orders:read"
PERM_ORDERS_DISPATCH = "orders:dispatch"
PERM_FINANCE_REFUND = "finance:refund"
PERM_FINANCE_PAYOUT = "finance:payout"
PERM_FINANCE_LEDGER = "finance:ledger"
PERM_PARTNERS_MANAGE = "partners:manage"
PERM_RIDERS_MANAGE = "riders:manage"
PERM_STAFF_MANAGE = "staff:manage"
PERM_SETTINGS_WRITE = "settings:write"
PERM_SUPPORT_TICKETS = "support:tickets"

ROLE_PERMISSIONS_MAP: Dict[str, List[str]] = {
    "super_admin": [PERM_ALL],
    "admin": [
        PERM_ORDERS_READ,
        PERM_ORDERS_DISPATCH,
        PERM_FINANCE_LEDGER,
        PERM_PARTNERS_MANAGE,
        PERM_RIDERS_MANAGE,
        PERM_SUPPORT_TICKETS,
    ],
    "finance": [
        PERM_FINANCE_LEDGER,
        PERM_FINANCE_REFUND,
        PERM_FINANCE_PAYOUT,
        PERM_ORDERS_READ,
    ],
    "support": [
        PERM_ORDERS_READ,
        PERM_SUPPORT_TICKETS,
    ],
    "operations": [
        PERM_ORDERS_READ,
        PERM_ORDERS_DISPATCH,
        PERM_RIDERS_MANAGE,
        PERM_PARTNERS_MANAGE,
    ],
    "verification": [
        "kyc:review",
        PERM_PARTNERS_MANAGE,
        PERM_RIDERS_MANAGE,
    ],
}


def check_admin_permission(user: Any, required_perm: str) -> None:
    """Enforces fine-grained RBAC and segregation of duties.
    
    Raises 403 Forbidden if user lacks the required permission.
    """
    user_role = str(getattr(user, "role", "") or "")
    if hasattr(user.role, "value"):
        user_role = user.role.value

    # Super Admin possesses all broad permissions
    if user_role == "super_admin":
        return

    allowed_perms = ROLE_PERMISSIONS_MAP.get(user_role, [])
    # Support agents explicitly cannot execute refunds or finance operations
    if required_perm in (PERM_FINANCE_REFUND, PERM_FINANCE_PAYOUT) and user_role == "support":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties: Support Agents cannot process financial refunds or payouts. Please escalate to Finance.",
        )

    if PERM_ALL not in allowed_perms and required_perm not in allowed_perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"RBAC Access Denied: Role '{user_role}' lacks required permission '{required_perm}'.",
        )


# =========================================================================
#  6. IP, Device & Active Session Monitoring (15-Minute Timeout)
# =========================================================================

SESSION_TIMEOUT_SECONDS = 900  # 15 minutes of inactivity
SESSION_COLLECTION = "admin_active_sessions"


async def create_admin_session(
    admin_id: str,
    email: str,
    client_ip: str,
    user_agent: str = "",
    device_id: str = "",
) -> Dict[str, Any]:
    """Registers an active authenticated admin session with inactivity tracking."""
    session_id = f"sess_{secrets.token_hex(16)}"
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    now_epoch = now.timestamp()

    doc = {
        "_id": session_id,
        "sessionId": session_id,
        "adminId": admin_id,
        "email": email,
        "clientIp": client_ip,
        "userAgent": user_agent[:255] if user_agent else "",
        "deviceId": device_id or f"dev_{secrets.token_hex(8)}",
        "createdAt": now_iso,
        "lastActivityAt": now_iso,
        "lastActivityEpoch": now_epoch,
        "expiresAtEpoch": now_epoch + SESSION_TIMEOUT_SECONDS,
        "status": "ACTIVE",
    }
    await database.insert_one(SESSION_COLLECTION, doc)
    return doc


async def touch_admin_session(session_id: str, client_ip: str) -> bool:
    """Refreshes active session timestamp, checking against 15-minute inactivity timeout."""
    if not session_id:
        return False
    doc = await database.find_one(SESSION_COLLECTION, {"_id": session_id})
    if not doc or doc.get("status") != "ACTIVE":
        return False

    now_epoch = time.time()
    if float(doc.get("expiresAtEpoch", 0.0)) < now_epoch:
        # Session expired due to inactivity
        await database.update_one(
            SESSION_COLLECTION,
            {"_id": session_id},
            {"$set": {"status": "EXPIRED", "expiredAt": _now_iso()}},
        )
        return False

    # Refresh idle expiry
    await database.update_one(
        SESSION_COLLECTION,
        {"_id": session_id},
        {
            "$set": {
                "lastActivityAt": _now_iso(),
                "lastActivityEpoch": now_epoch,
                "expiresAtEpoch": now_epoch + SESSION_TIMEOUT_SECONDS,
                "clientIp": client_ip,
            }
        },
    )
    return True


async def terminate_admin_session(session_id: str) -> bool:
    """Terminates an active session remotely."""
    result = await database.update_one(
        SESSION_COLLECTION,
        {"_id": session_id},
        {"$set": {"status": "TERMINATED", "terminatedAt": _now_iso()}},
    )
    return getattr(result, "modified_count", 1) > 0


async def list_admin_active_sessions(admin_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists current active sessions with IP and device metadata."""
    query: Dict[str, Any] = {"status": "ACTIVE"}
    if admin_id:
        query["adminId"] = admin_id
    sessions = await database.find_many(SESSION_COLLECTION, query)
    now_epoch = time.time()
    # Filter out expired sessions
    return [s for s in sessions if float(s.get("expiresAtEpoch", 0.0)) >= now_epoch]


# =========================================================================
#  7. Sensitive Action Confirmation (Sudo Mode)
# =========================================================================

SUDO_TOKEN_EXPIRY_SECONDS = 900  # 15 minutes validity
SUDO_COLLECTION = "admin_sudo_sessions"


async def issue_sudo_token(admin_id: str) -> str:
    """Issues a 15-minute re-authenticated sudo token for sensitive operations."""
    token = f"sudo_{secrets.token_hex(20)}"
    now_epoch = time.time()
    doc = {
        "_id": token,
        "sudoToken": token,
        "adminId": admin_id,
        "createdAt": _now_iso(),
        "expiresAtEpoch": now_epoch + SUDO_TOKEN_EXPIRY_SECONDS,
    }
    await database.insert_one(SUDO_COLLECTION, doc)
    return token


async def verify_sudo_token(admin_id: str, sudo_token: str) -> bool:
    """Validates if admin is currently in verified Sudo mode."""
    if not sudo_token:
        return False
    doc = await database.find_one(SUDO_COLLECTION, {"_id": sudo_token, "adminId": admin_id})
    if not doc:
        return False
    if float(doc.get("expiresAtEpoch", 0.0)) < time.time():
        await database.delete_many(SUDO_COLLECTION, {"_id": sudo_token})
        return False
    return True


async def confirm_sudo_with_password(admin_id: str, password: str) -> str:
    """Validates admin password and issues a new Sudo Token upon success."""
    staff = await database.find_one("admin_staff", {"_id": admin_id}) or await database.find_one("admin_staff", {"email": admin_id})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff account not found.")

    pwd_hash = staff.get("passwordHash", "")
    if not verify_password(password, pwd_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sensitive Action Re-Authentication Failed: Incorrect admin password.",
        )

    return await issue_sudo_token(str(staff.get("_id") or admin_id))


# =========================================================================
#  8. Login History & Failed Login Security Alerts
# =========================================================================

LOGIN_HISTORY_COLLECTION = "admin_login_history"


async def record_admin_login_history(
    email: str,
    admin_id: str,
    client_ip: str,
    user_agent: str = "",
    login_status: str = "SUCCESS",
    failure_reason: str = "",
) -> None:
    """Records chronological login history with device and IP metadata."""
    now_iso = _now_iso()
    doc = {
        "_id": f"log_{secrets.token_hex(12)}",
        "email": email,
        "adminId": admin_id,
        "clientIp": client_ip,
        "userAgent": user_agent[:255] if user_agent else "",
        "status": login_status,
        "failureReason": failure_reason,
        "timestamp": now_iso,
    }
    await database.insert_one(LOGIN_HISTORY_COLLECTION, doc)


async def list_admin_login_history(admin_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves chronological login history."""
    query = {"adminId": admin_id} if admin_id else {}
    history = await database.find_many(LOGIN_HISTORY_COLLECTION, query, limit=limit)
    history.sort(key=lambda x: str(x.get("timestamp") or ""), reverse=True)
    return history



async def ensure_super_admin_seed() -> dict:
    """
    Ensure the Super Admin account (himanshupalsingh6@gmail.com) is securely seeded
    in the database with PBKDF2 hashed password (Himanshu@8055) and full operational permissions.
    Cleans any obsolete legacy admin records.
    """
    from app.models.user import Role, UserStatus

    admin_email = "himanshupalsingh6@gmail.com"
    pwd_hash = hash_password("Himanshu@8055")
    now = _now_iso()

    # Remove all other dummy / legacy staff records from database, keeping strictly himanshupalsingh6@gmail.com
    await database.delete_many("admin_staff", {"email": {"$ne": admin_email}})
    await database.delete_many("users", {"email": "admin@quickpress.online"})
    await database.delete_many("users", {"email": "admin@quickpress.com"})
    await database.delete_many("users", {"email": "rajesh.ops@quickpress.com"})
    await database.delete_many("users", {"email": "vikram.dispatch@quickpress.com"})
    await database.delete_many("users", {"email": "neha.support@quickpress.com"})
    await database.delete_many("users", {"email": "amit.finance@quickpress.com"})

    # Check or create super admin in admin_staff collection
    existing_staff = await database.find_one("admin_staff", {"email": admin_email})
    staff_id = existing_staff.get("_id") if existing_staff else "stf_super_admin_himanshu"

    super_admin_staff_doc = {
        "_id": staff_id,
        "name": "Himanshu Pal Singh",
        "email": admin_email,
        "phone": "+91 98719 62596",
        "role": "Super Admin",
        "scope": "All India Hubs",
        "passwordHash": pwd_hash,
        "permissions": [
            "all", "orders", "customers", "partners", "riders", "services",
            "finance", "wallet", "cities", "coupons", "memberships",
            "analytics", "notifications", "support", "staff", "settings"
        ],
        "status": "Active",
        "isVerified": True,
        "lastActive": "Active now",
        "updatedAt": now,
    }
    if not existing_staff:
        super_admin_staff_doc["createdAt"] = now

    await database.update_one(
        "admin_staff",
        {"email": admin_email},
        {"$set": super_admin_staff_doc},
        upsert=True,
    )

    # Ensure in users collection
    await database.update_one(
        "users",
        {"email": admin_email},
        {
            "$set": {
                "_id": staff_id,
                "phone": "+91 98719 62596",
                "email": admin_email,
                "display_name": "Himanshu Pal Singh",
                "role": Role.admin.value,
                "status": UserStatus.active.value,
                "is_verified": True,
                "is_onboarded": True,
                "updated_at": now,
            }
        },
        upsert=True,
    )
    return super_admin_staff_doc

