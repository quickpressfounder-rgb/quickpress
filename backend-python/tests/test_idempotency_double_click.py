"""Tests for 2-Tier Double-Click Protection & Request Coalescing Idempotency Engine."""

import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.core.idempotency import IdempotencyEngine, idempotency_engine
from app.db.client import database
from app.main import fastapi_app
from app.models.user import User, Role
from app.core.deps import current_user


@pytest.mark.asyncio
async def test_double_click_acquire_or_wait_awaits_in_flight_completion():
    """Verify that a concurrent second request waits for an in-flight request

    and receives the identical completed payload instead of an error or duplicate.
    """
    engine = IdempotencyEngine()
    test_key = f"user-conc-1:{uuid.uuid4().hex[:8]}"
    shared_result = {"orderId": f"ord-{uuid.uuid4().hex[:6]}", "amount": 499.0, "status": "confirmed"}

    task1_started = asyncio.Event()

    async def task_1_first_click():
        res1 = await engine.acquire_or_wait("order", test_key, timeout_seconds=2.0)
        assert res1.is_duplicate is False, "Task 1 should acquire the lock"
        task1_started.set()
        # Simulate processing time (e.g. database write / payment gateway call)
        await asyncio.sleep(0.15)
        await engine.complete("order", test_key, shared_result)
        return {"source": "task1", "orderId": shared_result["orderId"]}

    async def task_2_second_click():
        # Wait until task 1 has acquired the lock so task 2 arrives while task 1 is in-flight
        await task1_started.wait()
        res2 = await engine.acquire_or_wait("order", test_key, timeout_seconds=2.0)
        assert res2.is_duplicate is True, "Task 2 should detect duplicate"
        assert res2.is_processing is False, "Task 2 should receive completed status after waiting"
        assert res2.cached_data == shared_result, "Task 2 should receive exact payload from Task 1"
        return {"source": "task2", "orderId": res2.cached_data["orderId"]}

    # Run both simultaneously
    t1_res, t2_res = await asyncio.gather(task_1_first_click(), task_2_second_click())

    assert t1_res["orderId"] == t2_res["orderId"]
    assert t1_res["orderId"] == shared_result["orderId"]


@pytest.mark.asyncio
async def test_double_click_acquire_or_wait_recovers_if_first_fails():
    """Verify that if the first in-flight request releases/fails, the second

    waiting request smoothly acquires the lock and can proceed.
    """
    engine = IdempotencyEngine()
    test_key = f"user-conc-2:{uuid.uuid4().hex[:8]}"

    task1_started = asyncio.Event()

    async def task_1_fails():
        res1 = await engine.acquire_or_wait("order", test_key, timeout_seconds=2.0)
        assert res1.is_duplicate is False
        task1_started.set()
        await asyncio.sleep(0.05)
        # Simulate failure and lock release
        await engine.release("order", test_key)
        return "task1_failed"

    async def task_2_retries():
        await task1_started.wait()
        # Task 2 waits; since task 1 released, task 2 acquires the lock
        res2 = await engine.acquire_or_wait("order", test_key, timeout_seconds=2.0)
        assert res2.is_duplicate is False, "Task 2 should acquire released lock"
        await engine.complete("order", test_key, {"recovered": True})
        return "task2_succeeded"

    t1, t2 = await asyncio.gather(task_1_fails(), task_2_retries())
    assert t1 == "task1_failed"
    assert t2 == "task2_succeeded"


@pytest.mark.asyncio
async def test_concurrent_order_placement_creates_only_one_order_in_database():
    """Simulate a user double-clicking the checkout button rapidly.

    Both concurrent HTTP requests must return HTTP 201 with identical order IDs,
    and exactly 1 order record must exist in the database.
    """
    mock_user_id = f"test-usr-{uuid.uuid4().hex[:6]}"
    mock_user = User(
        id=mock_user_id,
        email="doubleclick@quickpress.com",
        name="Double Click Tester",
        role=Role.customer,
        roles=[Role.customer],
    )

    # Pre-insert mock pickup address so place_order succeeds
    addr_id = f"addr-{uuid.uuid4().hex[:6]}"
    await database.insert_one(
        "customer_addresses",
        {
            "_id": addr_id,
            "id": addr_id,
            "userId": mock_user_id,
            "type": "home",
            "label": "Home",
            "houseNumber": "742",
            "building": "Evergreen Terrace",
            "street": "Springfield Ave",
            "area": "Bandra West",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400050",
            "phone": "9876543210",
            "isDefault": True,
        },
    )

    shared_idempotency_key = f"idem-checkout-{uuid.uuid4().hex[:10]}"
    order_payload = {
        "items": [
            {
                "id": "svc-wash-fold",
                "name": "Wash & Fold",
                "price": 99.0,
                "unit": "kg",
                "qty": 3,
                "image": "",
                "description": "Premium Wash & Fold",
            }
        ],
        "idempotencyKey": shared_idempotency_key,
        "addressId": addr_id,
        "pickup": {
            "date": "Today",
            "slot": "Standard (30–60 mins)",
        },
        "paymentMethod": "cod",
        "customerName": "Double Click Tester",
        "customerPhone": "9876543210",
    }

    fastapi_app.dependency_overrides[current_user] = lambda: mock_user

    try:
        transport = ASGITransport(app=fastapi_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            async def submit_order(click_num: int):
                # Click 2 arrives 20ms after click 1
                if click_num == 2:
                    await asyncio.sleep(0.02)
                resp = await client.post(
                    "/api/orders",
                    json=order_payload,
                    headers={"X-Idempotency-Key": shared_idempotency_key},
                )
                return resp

            # Fire 2 requests simultaneously (double-click)
            resp1, resp2 = await asyncio.gather(submit_order(1), submit_order(2))

        assert resp1.status_code in (200, 201), f"Resp1 failed: {resp1.text}"
        assert resp2.status_code in (200, 201), f"Resp2 failed: {resp2.text}"

        data1 = resp1.json()
        data2 = resp2.json()

        # Both must return the identical order ID and code
        assert data1["orderId"] == data2["orderId"], "Double submit returned divergent order IDs!"
        assert data1["orderNumber"] == data2["orderNumber"], "Double submit returned divergent order numbers!"

        # Exactly 1 order must be in the database with this idempotency key
        orders_in_db = await database.find_many(
            "customer_orders",
            {"$or": [{"idempotencyKey": shared_idempotency_key}, {"_id": data1["orderId"]}]},
        )
        assert len(orders_in_db) == 1, f"Expected 1 order in DB, found {len(orders_in_db)}: Duplicate created!"

    finally:
        fastapi_app.dependency_overrides.pop(current_user, None)


@pytest.mark.asyncio
async def test_concurrent_payment_creation_is_idempotent():
    """Simulate double-click on payment submit.

    Both concurrent requests with the same idempotency key must succeed
    and return the identical payment record.
    """
    mock_user_id = f"test-pay-usr-{uuid.uuid4().hex[:6]}"
    mock_user = User(
        id=mock_user_id,
        email="paytester@quickpress.com",
        name="Payment Double Click Tester",
        role=Role.customer,
        roles=[Role.customer],
    )

    shared_pay_ref = f"pay-ref-{uuid.uuid4().hex[:10]}"
    pay_payload = {
        "amount": 299.0,
        "method": "upi",
        "paymentReference": shared_pay_ref,
        "purpose": "order_payment",
    }

    fastapi_app.dependency_overrides[current_user] = lambda: mock_user

    try:
        transport = ASGITransport(app=fastapi_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            async def submit_payment(click_num: int):
                if click_num == 2:
                    await asyncio.sleep(0.015)
                return await client.post(
                    "/api/payments/create",
                    json=pay_payload,
                    headers={"X-Idempotency-Key": shared_pay_ref},
                )

            res1, res2 = await asyncio.gather(submit_payment(1), submit_payment(2))

        assert res1.status_code == 200, f"Payment 1 failed: {res1.text}"
        assert res2.status_code == 200, f"Payment 2 failed: {res2.text}"

        d1 = res1.json()
        d2 = res2.json()

        assert d1["payment"]["id"] == d2["payment"]["id"], "Divergent payment records created!"
        assert d1["payment"]["amount"] == d2["payment"]["amount"] == 299.0

    finally:
        fastapi_app.dependency_overrides.pop(current_user, None)


@pytest.mark.asyncio
async def test_partner_accept_double_submit_is_idempotent():
    """Verify that if a partner store submits accept twice in quick succession,

    both requests return 200 OK without raising InvalidTransitionError.
    """
    from app.db.partner_repositories import partner_order_repository
    from app.services import order_lifecycle as lifecycle

    partner_id = f"ptn-{uuid.uuid4().hex[:6]}"
    order_id = f"ord-{uuid.uuid4().hex[:6]}"

    # Insert mock store profile
    await database.insert_one(
        "partner_profiles",
        {"_id": partner_id, "partnerId": partner_id, "businessName": "Super Clean Store", "phone": "9876543210"},
    )

    # Insert mock pending order into customer_orders
    now_iso = lifecycle.now_iso()
    await database.insert_one(
        "customer_orders",
        {
            "_id": order_id,
            "id": order_id,
            "code": "QP8888",
            "status": lifecycle.PLACED,
            "userId": "cust-1",
            "createdAt": now_iso,
            "updatedAt": now_iso,
        },
    )

    # Accept order first time
    res1 = await partner_order_repository.accept(partner_id, order_id, prep_time_minutes=25)
    assert res1 is not None

    # Accept order second time (double click / replay)
    res2 = await partner_order_repository.accept(partner_id, order_id, prep_time_minutes=25)
    assert res2 is not None
    assert (res2.get("id") or res2.get("_id")) == order_id
