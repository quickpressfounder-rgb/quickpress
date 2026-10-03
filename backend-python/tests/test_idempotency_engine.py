"""Tests for Phase 7: Distributed Payment & Order Idempotency Engine."""

import asyncio
import uuid
from unittest.mock import patch

import pytest
from app.core.idempotency import IdempotencyEngine, idempotency_engine
from app.db.client import database
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_idempotency_acquire_and_complete():
    """Verify first-time acquire, completion caching, and fast replay."""
    engine = IdempotencyEngine()
    test_key = f"user-1:test-order-{uuid.uuid4().hex[:8]}"

    # 1. First attempt: acquire successfully
    res1 = await engine.acquire("order", test_key)
    assert res1.is_duplicate is False
    assert res1.is_processing is False
    assert res1.cached_data is None

    # 2. Concurrent second attempt: blocked because first is processing
    res2 = await engine.acquire("order", test_key)
    assert res2.is_duplicate is True
    assert res2.is_processing is True
    assert res2.cached_data is None

    # 3. First finishes and completes with cached payload
    payload = {"orderId": "ord-123", "grandTotal": 450, "status": "pending"}
    await engine.complete("order", test_key, payload)

    # 4. Third attempt (replay after completion): returns cached data instantly
    res3 = await engine.acquire("order", test_key)
    assert res3.is_duplicate is True
    assert res3.is_processing is False
    assert res3.cached_data == payload

    # 5. Direct get also returns cached payload
    direct = await engine.get("order", test_key)
    assert direct == payload


@pytest.mark.asyncio
async def test_idempotency_release_on_error():
    """Verify that releasing a lock allows subsequent retries after a failure."""
    engine = IdempotencyEngine()
    test_key = f"user-2:failed-payment-{uuid.uuid4().hex[:8]}"

    # Acquire lock
    res1 = await engine.acquire("payment", test_key)
    assert res1.is_duplicate is False

    # Simulate error and release
    await engine.release("payment", test_key)

    # Verify that caller can now retry cleanly
    retry = await engine.acquire("payment", test_key)
    assert retry.is_duplicate is False
    assert retry.is_processing is False


@pytest.mark.asyncio
async def test_order_repository_duplicate_check_uses_cache():
    """Verify find_recent_duplicate leverages idempotency engine cache."""
    from app.db.order_repositories import order_repository

    user_id = "test-idemp-user-3"
    key = "chk-fast-cache-99"

    # Populate cache directly in idempotency engine
    dummy_cached_order = {
        "id": "ord-idemp-99",
        "code": "QP9999",
        "userId": user_id,
        "items": [],
        "totals": {
            "subtotal": 300,
            "discount": 0,
            "deliveryFee": 0,
            "tax": 0,
            "grandTotal": 300,
            "paid": 0,
            "refunded": 0,
        },
        "status": "pending",
        "createdAt": "2026-09-29T10:00:00Z",
        "pickup": {"date": "2026-09-30", "slot": "morning"},
        "delivery": {"date": "2026-10-02", "slot": "morning"},
        "address": {"label": "Home", "line": "123 Main St", "city": "Kasganj", "phone": "9876543210"},
        "timeline": [],
        "payment": {"method": "cod", "status": "pending"},
        "idempotencyKey": key,
    }
    await idempotency_engine.complete("order", f"{user_id}:{key}", dummy_cached_order)

    # Calling find_recent_duplicate should return cached OrderResponse without hitting DB
    found = await order_repository.find_recent_duplicate(user_id, key)
    assert found is not None
    assert found.id == "ord-idemp-99"
    assert found.code == "QP9999"
