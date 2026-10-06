"""Unit tests for QuickPress Phase 2 Advanced Security Rules (All 6 Rules).

Covers:
1. Rule 1: AI Computer Vision Pre-Wash Garment Damage Rule & Liability Shield
2. Rule 2: Payment Card Velocity & Anti-Carding Brute-Force Guard
3. Rule 3: Driver Telematics & Excessive Velocity Rule (Anti-Spoofing Hardening)
4. Rule 4: Admin Four-Eyes (Dual-Control) Authorization Rule
5. Rule 5: Automated Data Anonymization (DPDP Act 2023 Compliance)
6. Rule 6: Dynamic Surge Ceiling Circuit Breaker (3.5x cap)
"""

from datetime import datetime, timezone
import pytest
from fastapi import HTTPException

from app.api.rider import push_location
from app.core.anti_fraud import (
    check_card_velocity_allowed,
    record_card_attempt_failure,
    reset_card_attempt_failures,
)
from app.db.client import database
from app.models.user import Role, User, UserStatus
from app.services.dpdp_anonymization_service import dpdp_anonymization_service
from app.services.dual_control_service import (
    DualControlStatus,
    HighImpactActionType,
    dual_control_service,
)
from app.services.garment_inspection_ai import garment_inspection_engine
from app.services.surge_engine import (
    MAX_SURGE_MULTIPLIER,
    apply_surge_circuit_breaker,
    surge_engine,
)


@pytest.mark.asyncio
async def test_rule1_ai_prewash_garment_damage():
    """Rule 1: Pre-wash damage inspection stamps cryptographic liability shield on orders."""
    order_id = "test-ord-garment-001"
    await database.update(
        "customer_orders",
        {"_id": order_id},
        {"_id": order_id, "status": "assigned", "customerName": "Ramesh Gupta"},
        upsert=True,
    )

    report = await garment_inspection_engine.inspect_garment(
        order_id=order_id,
        photo_url="https://res.cloudinary.com/quickpress/image/upload/v1/inspections/torn_shirt.jpg",
        garment_category="silk_shirt",
        detected_flaws=["TEAR_OR_RIP", "SEVERE_STAIN"],
        notes="Pre-existing tear near right sleeve cuff.",
        reported_by="rider",
        reporter_id="CAP-100200",
    )

    assert report["hasPreExistingDamage"] is True
    assert report["severity"] == "SEVERE"
    assert report["merchantLiabilityShield"] is True
    assert report["protectionStampHash"].startswith("QP-VERIFIED-")

    # Verify order metadata is stamped
    updated_order = await database.find_one("customer_orders", {"_id": order_id})
    assert updated_order is not None
    assert updated_order.get("garmentConditionNoted") is True
    assert updated_order["prewashInspection"]["severity"] == "SEVERE"


@pytest.mark.asyncio
async def test_rule2_card_velocity_lockout():
    """Rule 2: Exceeding 3 failed card transactions triggers 1-hour anti-carding cooldown."""
    client_ip = "192.168.1.105"
    device_id = "dev-velocity-test-uuid"
    user_id = "user-velocity-test"

    # Reset any previous state
    await reset_card_attempt_failures(client_ip, device_id, user_id)

    # 1. Initially allowed
    allowed, reason, remaining = await check_card_velocity_allowed(client_ip, device_id, user_id)
    assert allowed is True
    assert reason is None

    # 2. Record 3 failed card attempts
    await record_card_attempt_failure(client_ip, device_id, user_id, reason="incorrect_cvv")
    await record_card_attempt_failure(client_ip, device_id, user_id, reason="expired_card")
    await record_card_attempt_failure(client_ip, device_id, user_id, reason="insufficient_funds")

    # 3. Must be locked out now
    allowed_after, reason_after, remaining_after = await check_card_velocity_allowed(
        client_ip, device_id, user_id
    )
    assert allowed_after is False
    assert "temporarily suspended" in reason_after
    assert remaining_after is not None and remaining_after > 0

    # 4. Successful checkout resets the counter
    await reset_card_attempt_failures(client_ip, device_id, user_id)
    allowed_clean, _, _ = await check_card_velocity_allowed(client_ip, device_id, user_id)
    assert allowed_clean is True


@pytest.mark.asyncio
async def test_rule3_rider_telematics_excessive_velocity():
    """Rule 3: Driver movement exceeding 85 km/h in dense city triggers telematics violation."""
    rider_user = User(
        id="rider-telematics-test-01",
        firebase_uid="fb-rider-telematics-01",
        role=Role.rider,
        status=UserStatus.active,
    )
    recent_ts = datetime.now(timezone.utc).isoformat()
    await database.update(
        "rider_profiles",
        {"_id": rider_user.id},
        {
            "_id": rider_user.id,
            "riderId": rider_user.id,
            "userId": rider_user.id,
            "fullName": "Speedy Rider",
            "lat": 27.8100,
            "lng": 78.6400,
            "lastLocationAt": recent_ts,
        },
        upsert=True,
    )

    # Rider travels 1.2 km in only 30 seconds -> ~144 km/h (exceeds 85 km/h threshold)
    with pytest.raises(HTTPException) as excinfo:
        await push_location(
            {"lat": 27.8208, "lng": 78.6400, "isMock": False},
            user=rider_user,
        )
    assert excinfo.value.status_code == 403
    assert "Impossible speed detected" in excinfo.value.detail or "Teleportation" in excinfo.value.detail

    # Check rider profile has telematics anomaly flag set
    profile = await database.find_one("rider_profiles", {"_id": rider_user.id})
    assert profile.get("telematicsAnomalyFlagged") is True


@pytest.mark.asyncio
async def test_rule4_admin_dual_control_four_eyes():
    """Rule 4: Four-Eyes Principle strictly prohibits self-approval of high-impact operations."""
    admin_initiator = "admin-initiator-01"
    admin_second = "admin-approver-02"

    ticket = await dual_control_service.create_request(
        action_type=HighImpactActionType.HIGH_VALUE_REFUND.value,
        initiator_admin_id=admin_initiator,
        initiator_admin_name="SuperAdmin Alice",
        payload={"orderId": "ORD-HIGH-VAL-99", "amount": 8500.0},
        reason="Fabric damaged in factory machine; customer reimbursement requested.",
        target_entity_id="ORD-HIGH-VAL-99",
    )
    req_id = ticket["requestId"]
    assert ticket["status"] == DualControlStatus.PENDING_SECOND_APPROVAL.value

    # 1. Initiator tries to approve their own ticket -> MUST BE REJECTED with 403
    with pytest.raises(HTTPException) as excinfo:
        await dual_control_service.approve_request(
            request_id=req_id,
            approver_admin_id=admin_initiator,
            approver_admin_name="SuperAdmin Alice",
        )
    assert excinfo.value.status_code == 403
    assert "Four-Eyes Principle" in excinfo.value.detail

    # 2. Second independent admin approves -> MUST SUCCEED
    approved_ticket = await dual_control_service.approve_request(
        request_id=req_id,
        approver_admin_id=admin_second,
        approver_admin_name="SuperAdmin Bob",
    )
    assert approved_ticket["status"] == DualControlStatus.APPROVED_AND_EXECUTED.value
    assert approved_ticket["secondApproverAdminId"] == admin_second


@pytest.mark.asyncio
async def test_rule5_dpdp_act_anonymization():
    """Rule 5: DPDP Act 2023 scrubs customer phone & precise GPS while preserving tax invoices."""
    order_id = "test-ord-dpdp-001"
    await database.update(
        "customer_orders",
        {"_id": order_id},
        {
            "_id": order_id,
            "status": "delivered",
            "customerPhone": "+91 98765 43210",
            "customerName": "Aditya Varma",
            "address": {
                "latitude": 27.812345,
                "longitude": 78.645678,
                "line": "Flat 402, Royal Residency, Station Road",
            },
            "deliveryNotes": "Call 9876543210 and leave with security guard",
            "invoiceNumber": "QP-INV-2026-09941",
            "taxInvoice": {"taxableAmount": 450.0, "cgst": 40.5, "sgst": 40.5},
            "deliveredAt": "2026-01-01T10:00:00+00:00",
        },
        upsert=True,
    )

    res = await dpdp_anonymization_service.anonymize_single_order(order_id)
    assert res["status"] == "anonymized"
    assert res["taxInvoiceRetained"] is True

    # Check updated database record
    anonymized = await database.find_one("customer_orders", {"_id": order_id})
    assert anonymized["isDpdpAnonymized"] is True
    # Phone is masked (+91 98••• ••210)
    assert "••" in anonymized["customerPhone"]
    # Coordinates rounded to 1 decimal place (27.8, 78.6)
    assert anonymized["address"]["latitude"] == 27.8
    assert anonymized["address"]["longitude"] == 78.6

    # Exact street address scrubbed
    assert "DPDP Act" in anonymized["address"]["line"]
    # Notes scrubbed
    assert "Scrubbed" in anonymized["deliveryNotes"]
    # Tax invoice still intact
    assert anonymized["invoiceNumber"] == "QP-INV-2026-09941"
    assert anonymized["taxInvoice"]["taxableAmount"] == 450.0


def test_rule6_dynamic_surge_circuit_breaker():
    """Rule 6: Dynamic surge ceiling circuit breaker locks multiplier to 3.5x maximum."""
    # 1. Normal surge (within limits)
    normal_eval = surge_engine.evaluate_capped_surge(calculated_multiplier=1.8, calculated_bonus=20.0)
    assert normal_eval["effectiveMultiplier"] == 1.8
    assert normal_eval["isCircuitBreakerTriggered"] is False

    # 2. Runaway anomalous surge (e.g. 5.5x multiplier and ₹120 bonus during storm)
    runaway_eval = surge_engine.evaluate_capped_surge(calculated_multiplier=5.5, calculated_bonus=120.0)
    assert runaway_eval["effectiveMultiplier"] == MAX_SURGE_MULTIPLIER  # 3.5x
    assert runaway_eval["effectiveBonus"] == 75.0
    assert runaway_eval["isCircuitBreakerTriggered"] is True

    # 3. Helper function test
    capped_m, capped_b, triggered = apply_surge_circuit_breaker(6.0, 95.0)
    assert capped_m == 3.5
    assert capped_b == 75.0
    assert triggered is True
