"""Test Suite for Step 1 Financial Security Patches.

Verifies:
1. Anti-tampering: Client cannot send arbitrary couponDiscount without valid coupon code.
2. Server-side authoritative coupon calculation: Coupon discounts strictly bound to DB rules.
3. Anti-tampering: Items with price <= 0 are rejected by cart.
4. Financial safety: Wallet debit is automatically refunded if order creation encounters an error.
"""

from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.client import database
from app.main import create_app
from app.models.user import Role, User, UserStatus
from app.db.repositories import users as user_repository
from app.db.wallet_repositories import wallet_repository


@pytest.fixture()
def client():
    with TestClient(create_app(), raise_server_exceptions=False) as test_client:
        yield test_client


async def _make_customer(name: str, phone: str) -> User:
    user = User(
        id=str(uuid.uuid4()),
        firebase_uid=f"uid-{uuid.uuid4().hex[:8]}",
        role=Role.customer,
        phone=phone,
        email=f"{name.lower().replace(' ', '')}@test.com",
        display_name=name,
        status=UserStatus.active,
        is_verified=True,
        is_onboarded=True,
    )
    return await user_repository.create(user)


def _auth(user: User) -> dict:
    token, _ = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_coupon_discount_tampering_blocked(client):
    """Test that a malicious customer cannot inflate or fake couponDiscount."""
    user = await _make_customer("Ramesh Tamper", "+919876599001")
    partner_id = f"prt-test-{uuid.uuid4().hex[:6]}"

    # Add item to cart (₹200)
    add_res = client.post(
        "/api/cart/items",
        headers=_auth(user),
        json={
            "id": f"svc-coat-{uuid.uuid4().hex[:4]}",
            "name": "Woolen Blazer",
            "price": 200,
            "qty": 1,
            "partnerId": partner_id,
        },
    )
    assert add_res.status_code == 201

    # Attempt 1: Maliciously sending couponDiscount=150 with NO couponCode
    res1 = client.post(
        "/api/orders",
        headers=_auth(user),
        json={
            "partnerId": partner_id,
            "address": {
                "label": "Home",
                "line": "Civil Lines",
                "city": "Kasganj",
                "phone": user.phone,
            },
            "pickup": {"date": "today", "slot": "morning"},
            "payment": {"mode": "cod", "label": "Cash on Delivery"},
            "couponCode": None,
            "couponDiscount": 150,  # Attacker tries to steal ₹150 discount
        },
    )
    assert res1.status_code == 201
    order1 = res1.json()["order"]
    # The server must have overridden the fake couponDiscount to 0
    assert order1.get("couponDiscount", 0) == 0
    # Items total should remain full 200
    assert order1["totals"]["itemsTotal"] == 200

    # Attempt 2: Sending a completely fake / non-existent coupon code
    # Add item to cart again
    client.post(
        "/api/cart/items",
        headers=_auth(user),
        json={
            "id": f"svc-shirt-{uuid.uuid4().hex[:4]}",
            "name": "Cotton Shirt",
            "price": 200,
            "qty": 1,
            "partnerId": partner_id,
        },
    )
    res2 = client.post(
        "/api/orders",
        headers=_auth(user),
        json={
            "partnerId": partner_id,
            "address": {
                "label": "Home",
                "line": "Civil Lines",
                "city": "Kasganj",
                "phone": user.phone,
            },
            "pickup": {"date": "today", "slot": "morning"},
            "payment": {"mode": "cod", "label": "Cash on Delivery"},
            "couponCode": "HACKER_FREE_100",
            "couponDiscount": 200,
        },
    )
    # Fake coupon must be rejected with 422
    assert res2.status_code == 422
    assert "Invalid or expired promo code" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_zero_or_negative_price_blocked(client):
    """Test that client cannot add items with price <= 0 to cart."""
    user = await _make_customer("Suresh Free", "+919876599002")

    res_zero = client.post(
        "/api/cart/items",
        headers=_auth(user),
        json={
            "id": "svc-hacked-item",
            "name": "Free Service Attempt",
            "price": 0,
            "qty": 1,
        },
    )
    assert res_zero.status_code in (400, 422)

    res_neg = client.post(
        "/api/cart/items",
        headers=_auth(user),
        json={
            "id": "svc-hacked-item-neg",
            "name": "Negative Price Attempt",
            "price": -50,
            "qty": 1,
        },
    )
    assert res_neg.status_code in (400, 422)


@pytest.mark.asyncio
async def test_wallet_auto_refund_on_failure(client, monkeypatch):
    """Test that if order creation encounters an unhandled error after wallet debit, funds are auto-refunded."""
    user = await _make_customer("Pooja Wallet", "+919876599003")
    partner_id = f"prt-test-{uuid.uuid4().hex[:6]}"

    # Credit ₹1000 to user's wallet
    await wallet_repository.credit(
        user,
        1000.0,
        kind="topup",
        title="Wallet Topup",
        description="Initial test balance",
    )
    wallet_before = (await wallet_repository.wallet(user)).balances.currentBalance
    assert wallet_before == 1000.0

    # Add item to cart (₹200)
    add_res = client.post(
        "/api/cart/items",
        headers=_auth(user),
        json={
            "id": f"svc-dry-{uuid.uuid4().hex[:4]}",
            "name": "Dry Clean Suit",
            "price": 200,
            "qty": 1,
            "partnerId": partner_id,
        },
    )
    assert add_res.status_code == 201

    # Simulate database insertion failure by monkeypatching database.collection("customer_orders").insert_one
    async def _failing_insert(*args, **kwargs):
        raise RuntimeError("Simulated Database Outage / Connection Crash")

    monkeypatch.setattr(database.collection("customer_orders"), "insert_one", _failing_insert)

    # Place order paying with wallet — will raise the simulated crash during insert
    try:
        res = client.post(
            "/api/orders",
            headers=_auth(user),
            json={
                "partnerId": partner_id,
                "address": {
                    "label": "Home",
                    "line": "Civil Lines",
                    "city": "Kasganj",
                    "phone": user.phone,
                },
                "pickup": {"date": "today", "slot": "morning"},
                "payment": {"mode": "wallet", "label": "QuickPress Wallet"},
            },
        )
        assert res.status_code == 500
    except RuntimeError as err:
        assert "Simulated Database Outage" in str(err)

    # Verify that the wallet balance was AUTOMATICALLY REFUNDED back to ₹1000
    wallet_after = (await wallet_repository.wallet(user)).balances.currentBalance
    assert wallet_after == 1000.0

    # Verify auto-refund transaction recorded in wallet ledger
    hist = await wallet_repository.history(user)
    refund_tx = next((t for t in hist.items if t.kind == "order-failed-auto-refund"), None)
    assert refund_tx is not None
    assert refund_tx.direction == "credit"
