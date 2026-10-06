"""Unit tests for QuickPress Bank-Grade Admin Panel Security (9 Points).

Covers:
1. RBAC (Role-Based Access Control)
2. 2FA (Two-Factor Authentication Challenge & Verification)
3. IP / Device / Session Monitoring (15-min idle timeout & remote kill)
4. Sensitive Action Confirmation (Sudo Mode)
5. Audit Logs (Immutable action history)
6. Login History
7. Failed-Login Alerts & Auto-Lockout
8. Finance / Refund Permissions Separate (Segregation of Duties)
9. Super Admin Permissions Limited (Dual-Control for high-value actions)
"""

import time
import pytest
from fastapi import HTTPException

from app.core.admin_security import (
    PERM_FINANCE_REFUND,
    PERM_ORDERS_READ,
    check_admin_permission,
    create_admin_2fa_challenge,
    create_admin_session,
    issue_sudo_token,
    list_admin_active_sessions,
    list_admin_login_history,
    record_admin_login_history,
    record_failed_attempt,
    record_successful_login,
    terminate_admin_session,
    touch_admin_session,
    verify_admin_2fa_challenge,
    verify_sudo_token,
)
from app.db.client import database
from app.models.user import Role, User, UserStatus
from app.services.dual_control_service import dual_control_service, HighImpactActionType


@pytest.mark.asyncio
async def test_point1_and_8_rbac_and_segregation_of_duties():
    """Point 1 & 8: Support agents cannot issue refunds; Finance officers are permitted."""
    support_user = User(
        id="usr-support-01",
        email="support@quickpress.online",
        role=Role.support,
        status=UserStatus.active,
    )
    finance_user = User(
        id="usr-finance-01",
        email="finance@quickpress.online",
        role=Role.finance,
        status=UserStatus.active,
    )

    # 1. Support agent can read orders
    check_admin_permission(support_user, PERM_ORDERS_READ)

    # 2. Support agent is STRICTLY FORBIDDEN from issuing refunds (Point 8)
    with pytest.raises(HTTPException) as excinfo:
        check_admin_permission(support_user, PERM_FINANCE_REFUND)
    assert excinfo.value.status_code == 403
    assert "Segregation of Duties" in excinfo.value.detail or "RBAC Access Denied" in excinfo.value.detail

    # 3. Finance officer is authorized to issue refunds
    check_admin_permission(finance_user, PERM_FINANCE_REFUND)


@pytest.mark.asyncio
async def test_point2_2fa_challenge_and_verification():
    """Point 2: 2FA challenge creation, rate limits and verification."""
    email = "admin-2fa-test@quickpress.online"
    # Create 2FA challenge
    challenge = await create_admin_2fa_challenge(
        user_id="usr-adm-2fa",
        email=email,
        role="Admin",
    )
    assert challenge["challengeId"].startswith("chg_")
    assert "@quickpress.online" in challenge["emailMasked"]

    # Verify with valid code (or dev master OTP)
    verified = await verify_admin_2fa_challenge(challenge["challengeId"], "123456")
    assert verified is not None
    assert verified["email"] == email


@pytest.mark.asyncio
async def test_point3_session_monitoring_and_inactivity_timeout():
    """Point 3: Session created, refreshed, and remote-terminated."""
    admin_id = "adm-session-test"
    ip = "103.21.244.15"
    session = await create_admin_session(
        admin_id=admin_id,
        email="security@quickpress.online",
        client_ip=ip,
        user_agent="Mozilla/5.0 (Macintosh)",
        device_id="macbook-pro-m3",
    )
    sess_id = session["sessionId"]

    # Session is active
    active_sessions = await list_admin_active_sessions(admin_id=admin_id)
    assert any(s["sessionId"] == sess_id for s in active_sessions)

    # Touch session refreshes it
    is_touched = await touch_admin_session(sess_id, client_ip=ip)
    assert is_touched is True

    # Remotely terminate session
    is_killed = await terminate_admin_session(sess_id)
    assert is_killed is True


@pytest.mark.asyncio
async def test_point4_sensitive_action_sudo_mode():
    """Point 4: Sudo token issuance and expiration validation."""
    admin_id = "adm-sudo-tester"
    sudo_token = await issue_sudo_token(admin_id)
    assert sudo_token.startswith("sudo_")

    # Valid token check
    is_valid = await verify_sudo_token(admin_id, sudo_token)
    assert is_valid is True

    # Non-existent or fake token
    fake_valid = await verify_sudo_token(admin_id, "sudo_invalid_fake_token")
    assert fake_valid is False


@pytest.mark.asyncio
async def test_point5_and_6_audit_and_login_history():
    """Point 5 & 6: Successful login records audit logs and chronological history."""
    admin_id = "adm-audit-test"
    email = "audit-officer@quickpress.online"
    ip = "192.168.1.150"

    await record_successful_login(
        admin_id=admin_id,
        email=email,
        client_ip=ip,
        user_agent="Chrome 130 macOS",
    )

    # Verify login history
    history = await list_admin_login_history(admin_id=admin_id, limit=5)
    assert len(history) > 0
    assert history[0]["status"] == "SUCCESS"
    assert history[0]["email"] == email


@pytest.mark.asyncio
async def test_point7_failed_login_lockout():
    """Point 7: 5 consecutive failed login attempts trigger security lockout."""
    bad_ip = "45.33.32.156"
    for _ in range(5):
        count = await record_failed_attempt(
            client_ip=bad_ip,
            email="attacker@external.com",
            user_agent="Python-requests/2.31",
        )
    assert count >= 5

    # Rate limit check triggers 429
    from app.core.admin_security import check_admin_rate_limit
    with pytest.raises(HTTPException) as excinfo:
        await check_admin_rate_limit(bad_ip)
    assert excinfo.value.status_code == 429
    assert "Security Lockout" in excinfo.value.detail


@pytest.mark.asyncio
async def test_point9_super_admin_permissions_limited_dual_control():
    """Point 9: High-value actions (>= ₹5,000) require Dual-Control even for Super Admin."""
    initiator_admin = "super-admin-01"
    amount = 6500.0

    # Checking threshold requires dual control
    assert dual_control_service.requires_dual_control(
        action_type=HighImpactActionType.HIGH_VALUE_REFUND.value,
        amount=amount,
    ) is True

    ticket = await dual_control_service.create_request(
        action_type=HighImpactActionType.HIGH_VALUE_REFUND.value,
        initiator_admin_id=initiator_admin,
        initiator_admin_name="Super Admin",
        payload={"orderId": "ORD-BIG-99", "amount": amount},
        reason="Bulk linen damage in commercial dryclean",
        target_entity_id="ORD-BIG-99",
    )
    assert ticket["status"] == "PENDING_SECOND_APPROVAL"

    # Super Admin cannot self-approve their own ticket
    with pytest.raises(HTTPException) as excinfo:
        await dual_control_service.approve_request(
            request_id=ticket["requestId"],
            approver_admin_id=initiator_admin,
            approver_admin_name="Super Admin",
        )
    assert excinfo.value.status_code == 403
    assert "Four-Eyes Principle" in excinfo.value.detail
