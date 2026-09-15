import pytest
from app.core.anti_fraud import extract_device_id, is_device_promo_claimed, record_device_promo_claim
from app.db.client import database
from app.db.referral_repositories import referral_repository
from app.models.user import Role, User, UserStatus


class DummyRequest:
    def __init__(self, headers=None, query_params=None, client_host="192.168.1.10"):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.client = type("Client", (), {"host": client_host})()


def test_device_id_extraction_precedence():
    # 1. Header precedence
    req = DummyRequest(headers={"x-device-id": "device-uuid-12345"})
    assert extract_device_id(req) == "device-uuid-12345"

    # 2. X-Device-Fingerprint
    req = DummyRequest(headers={"x-device-fingerprint": "fingerprint-abcde"})
    assert extract_device_id(req) == "fingerprint-abcde"

    # 3. Query param fallback
    req = DummyRequest(query_params={"device_id": "query-dev-999"})
    assert extract_device_id(req) == "query-dev-999"

    # 4. Fallback IP + User-Agent hash
    req = DummyRequest(headers={"user-agent": "Mozilla/5.0 Test"}, client_host="10.0.0.1")
    dev_id = extract_device_id(req)
    assert dev_id.startswith("dev-") and len(dev_id) > 10


@pytest.mark.asyncio
async def test_duplicate_device_referral_blocked():
    """Verify that two different user accounts on the same device cannot claim referral reward twice."""
    device_id = "test-hardware-uuid-888"

    # Setup referrer in users and referrals collections
    referrer = User(
        id="usr-referrer-1",
        firebase_uid="fb-ref-1",
        role=Role.customer,
        status=UserStatus.active,
        referral_code="FRIEND100",
    )
    await database.update(
        "users",
        {"_id": referrer.id},
        {"_id": referrer.id, "id": referrer.id, "referral_code": "FRIEND100", "role": "customer", "name": "Referrer Guy"},
        upsert=True,
    )
    await database.update(
        "referrals",
        {"code": "FRIEND100"},
        {"_id": f"ref:{referrer.id}", "user_id": referrer.id, "code": "FRIEND100"},
        upsert=True,
    )

    # First user on this device claims referral
    user1 = User(
        id="usr-fresh-device-1",
        firebase_uid="fb-fresh-1",
        role=Role.customer,
        status=UserStatus.active,
    )
    await database.update("users", {"_id": user1.id}, {"_id": user1.id, "role": "customer"}, upsert=True)

    claimed1 = await referral_repository.apply_login_referral(user1, "FRIEND100", device_id=device_id)
    assert claimed1 is not None
    assert claimed1.get("ok") is True

    # Device claim must now be recorded
    assert await is_device_promo_claimed(device_id, "referral") is True

    # Second user tries to claim referral on the same device
    user2 = User(
        id="usr-fresh-device-2",
        firebase_uid="fb-fresh-2",
        role=Role.customer,
        status=UserStatus.active,
    )
    await database.update("users", {"_id": user2.id}, {"_id": user2.id, "role": "customer"}, upsert=True)

    with pytest.raises(ValueError) as excinfo:
        await referral_repository.apply_login_referral(user2, "FRIEND100", device_id=device_id)

    assert "Referral reward already claimed on this device" in str(excinfo.value)
