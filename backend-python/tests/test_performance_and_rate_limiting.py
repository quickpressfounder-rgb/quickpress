"""Tests for Performance Optimization, In-Memory Caching, and Rate Limiting."""

from __future__ import annotations

import time
import pytest
from app.core.rate_limiter import SlidingWindowRateLimiter, rate_limiter
from app.db.supabase_client import (
    SupabaseCollection,
    _compile_filter,
    _make_cache_key,
    _CACHEABLE_STATIC_COLLECTIONS,
)


def test_compile_boolean_and_numeric_values():
    """Verify booleans and numbers are correctly stringified for PostgreSQL JSONB text operator."""
    where, params = _compile_filter("riders", {"isOnline": True, "active": False, "rating": 5})
    assert "data->>'isOnline' = $2" in where
    assert "data->>'active' = $3" in where
    assert "data->>'rating' = $4" in where
    assert params == ["riders", "true", "false", "5"]


def test_compile_list_equality_as_any_operator():
    """Verify lists or tuples are converted to ANY($N::text[])."""
    where, params = _compile_filter("users", {"roles": ["rider", "partner"]})
    assert "data->>'roles' = ANY($2::text[])" in where
    assert params == ["users", ["rider", "partner"]]


def test_rate_limiter_sliding_window_within_limit():
    limiter = SlidingWindowRateLimiter()
    key = "test_ip_123"
    for i in range(5):
        allowed, remaining, reset_sec = limiter.check_limit_with_info(key, max_requests=10, window_seconds=60)
        assert allowed is True
        assert remaining == 10 - (i + 1)
        assert reset_sec <= 60


def test_rate_limiter_exceeded():
    limiter = SlidingWindowRateLimiter()
    key = "test_ip_abuse"
    for _ in range(5):
        allowed, _, _ = limiter.check_limit_with_info(key, max_requests=5, window_seconds=60)
        assert allowed is True

    # 6th request must be rejected
    allowed, remaining, reset_sec = limiter.check_limit_with_info(key, max_requests=5, window_seconds=60)
    assert allowed is False
    assert remaining == 0
    assert reset_sec > 0


def test_rate_limiter_lockout():
    limiter = SlidingWindowRateLimiter()
    key = "test_auth_phone"
    for _ in range(4):
        fails, lock_sec = limiter.record_failed_attempt(key, max_failures=5, lock_duration=300)
        assert lock_sec is None

    fails, lock_sec = limiter.record_failed_attempt(key, max_failures=5, lock_duration=300)
    assert lock_sec == 300
    is_locked, remaining_lock = limiter.is_locked(key)
    assert is_locked is True
    assert remaining_lock > 0


def test_static_collections_configured():
    assert "banners" in _CACHEABLE_STATIC_COLLECTIONS
    assert "categories" in _CACHEABLE_STATIC_COLLECTIONS
    assert "services" in _CACHEABLE_STATIC_COLLECTIONS
    assert "admin_cities" in _CACHEABLE_STATIC_COLLECTIONS
