"""Tests for Phase 3: Supabase JSONB Query Compiler and Pushdown Optimizations."""

from __future__ import annotations

import pytest
from app.db.supabase_client import _compile_filter


def test_compile_empty_query():
    where, params = _compile_filter("customer_orders", {})
    assert where == "collection = $1"
    assert params == ["customer_orders"]


def test_compile_primary_key_query():
    where, params = _compile_filter("customer_orders", {"_id": "order-123"})
    assert "collection = $1" in where
    assert "id = $2" in where
    assert params == ["customer_orders", "customer_orders:order-123"]

    where_in, params_in = _compile_filter("customer_orders", {"_id": {"$in": ["ord-1", "ord-2"]}})
    assert "id = ANY($2::text[])" in where_in
    assert params_in[1] == ["customer_orders:ord-1", "customer_orders:ord-2"]


def test_compile_field_and_nested_equality():
    where, params = _compile_filter("customer_orders", {"userId": "usr-99", "address.city": "Kasganj"})
    assert "collection = $1" in where
    assert "data->>'userId' = $2" in where
    assert "data->'address'->>'city' = $3" in where
    assert params == ["customer_orders", "usr-99", "Kasganj"]


def test_compile_in_operator():
    where, params = _compile_filter(
        "customer_orders",
        {"status": {"$in": ["placed", "pending_partner_acceptance", "partner_accepted"]}}
    )
    assert "data->>'status' = ANY($2::text[])" in where
    assert params[1] == ["placed", "pending_partner_acceptance", "partner_accepted"]


def test_compile_numeric_and_comparison_operators():
    where, params = _compile_filter(
        "customer_orders",
        {"grandTotal": {"$gte": 500, "$lt": 2000}}
    )
    assert "(data->>'grandTotal')::numeric >= $2" in where
    assert "(data->>'grandTotal')::numeric < $3" in where
    assert params == ["customer_orders", 500.0, 2000.0]


def test_compile_or_operator():
    where, params = _compile_filter(
        "riders",
        {"$or": [{"phone": "+919999900001"}, {"email": "captain@quickpress.com"}]}
    )
    assert "collection = $1" in where
    assert "((data->>'phone' = $2) OR (data->>'email' = $3))" in where
    assert params == ["riders", "+919999900001", "captain@quickpress.com"]


def test_unsupported_query_graceful_fallback():
    # $regex cannot be translated to standard ANY/equality SQL in this compiler; must fall back to memory
    where, params = _compile_filter(
        "customer_orders",
        {"code": {"$regex": "^ORD", "$options": "i"}}
    )
    assert where is None
    assert params == []
