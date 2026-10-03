"""Tests for Phase 2: Distributed Hybrid Caching Engine (L1 + L2)."""

from __future__ import annotations

import time
import pytest
from app.core.redis_cache import hybrid_cache
from app.db.catalog_repositories import catalog
from app.db.support_repositories import support_repository


@pytest.fixture(autouse=True)
async def setup_test_cache():
    # Clear local cache before and after test
    hybrid_cache.clear_local()
    await catalog.ensure_seed()
    await support_repository.ensure_seed()
    yield
    hybrid_cache.clear_local()


@pytest.mark.asyncio
async def test_hybrid_cache_core_operations():
    """Test get, set, delete, and delete_pattern on hybrid_cache."""
    # 1. Set and Get
    await hybrid_cache.set("test:key1", {"msg": "hello", "count": 42}, ttl_seconds=60)
    cached = await hybrid_cache.get("test:key1")
    assert cached is not None
    assert cached["msg"] == "hello"
    assert cached["count"] == 42

    # 2. Delete single key
    await hybrid_cache.delete("test:key1")
    assert await hybrid_cache.get("test:key1") is None

    # 3. Delete pattern
    await hybrid_cache.set("test:pat:a", 100, ttl_seconds=60)
    await hybrid_cache.set("test:pat:b", 200, ttl_seconds=60)
    await hybrid_cache.set("other:pat:c", 300, ttl_seconds=60)

    purged = await hybrid_cache.delete_pattern("test:pat:*")
    assert purged >= 2
    assert await hybrid_cache.get("test:pat:a") is None
    assert await hybrid_cache.get("test:pat:b") is None
    assert await hybrid_cache.get("other:pat:c") == 300


@pytest.mark.asyncio
async def test_catalog_caching_and_sub_millisecond_speed():
    """Verify that catalog reads are cached and subsequent calls return instantly."""
    # 1. First call (populates cache)
    t0 = time.perf_counter()
    banners_1 = await catalog.banners()
    t_first = time.perf_counter() - t0
    assert len(banners_1) > 0

    # Verify cached in hybrid_cache
    raw_cache = await hybrid_cache.get("catalog:banners")
    assert raw_cache is not None
    assert isinstance(raw_cache, list)
    assert len(raw_cache) == len(banners_1)

    # 2. Second call (must be served from cache)
    t1 = time.perf_counter()
    banners_2 = await catalog.banners()
    t_cached = time.perf_counter() - t1
    assert len(banners_2) == len(banners_1)

    # Cached call is faster than first cold call
    assert t_cached <= t_first or t_cached < 0.01  # sub-10ms

    # 3. Categories Caching
    cat_1 = await catalog.categories()
    assert len(cat_1) > 0
    cat_cache = await hybrid_cache.get("catalog:categories")
    assert cat_cache is not None

    # 4. Offers Caching
    offers_1 = await catalog.offers()
    assert len(offers_1) > 0
    offers_cache = await hybrid_cache.get("catalog:offers")
    assert offers_cache is not None

    # 5. FAQs and Support Categories
    faqs = await support_repository.faqs()
    assert len(faqs.items) > 0
    faq_cache = await hybrid_cache.get("support:faqs::")
    assert faq_cache is not None


@pytest.mark.asyncio
async def test_catalog_invalidation_on_seed():
    """Verify that ensure_seed purges catalog cache keys."""
    await catalog.banners()
    assert await hybrid_cache.get("catalog:banners") is not None

    # Run seed
    await catalog.ensure_seed()
    # Cache must be wiped
    assert await hybrid_cache.get("catalog:banners") is None
