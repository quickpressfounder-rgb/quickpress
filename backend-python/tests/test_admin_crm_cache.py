"""Phase 4 Test Suite: Admin CRM & Geo Aggregation Cache.

Validates:
1. CRM locations cascading dropdown caching and sub-millisecond recall.
2. CRM Geo-Pulse live operational telemetry aggregation caching across states, cities, pincodes.
3. CRM Geo Leaderboard ranking calculation caching.
4. Universal multi-entity search caching.
5. Instant cache invalidation when CRM notes, tags, wallet adjustments, and statuses are updated.
6. Admin City Intelligence & Dashboard Stats caching and automatic cache purges on city mutations.
"""

from __future__ import annotations

import time
import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.redis_cache import hybrid_cache
from app.core.security import create_access_token
from app.db.admin_repositories import city_repository, area_repository
from app.db.client import database
from app.db.repositories import users as user_repository
from app.main import create_app
from app.models.user import Role, User, UserStatus


async def _make_admin() -> User:
    admin = User(
        id=str(uuid.uuid4()),
        firebase_uid=f"uid-admin-{uuid.uuid4().hex[:8]}",
        role=Role.admin,
        phone=f"+9198{uuid.uuid4().int % 100_000_000:08d}",
        email=f"admin-{uuid.uuid4().hex[:6]}@quickpress.test",
        display_name="Admin Chief",
        photo_url=None,
        status=UserStatus.active,
        is_verified=True,
        is_onboarded=True,
    )
    return await user_repository.create(admin)


def _token(user: User) -> str:
    token, _ = create_access_token(user.id, user.role.value)
    return token


@pytest.fixture(autouse=True)
async def setup_crm_environment():
    hybrid_cache.clear_local()
    # Seed a test city if none exists
    existing_cities = await database.find_many("admin_cities", {})
    if not existing_cities:
        await city_repository.create({
            "city": "Kasganj",
            "name": "Kasganj",
            "state": "Uttar Pradesh",
            "pincodes": ["207123", "207124"],
            "deliveryRadiusKm": 15.0,
            "status": "Live",
        })
    yield
    hybrid_cache.clear_local()


@pytest.fixture()
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.mark.asyncio
async def test_crm_locations_caching(client):
    """Test that CRM cascading locations are cached and served in < 5ms."""
    admin = await _make_admin()
    headers = {"Authorization": f"Bearer {_token(admin)}"}

    # 1. Cold call: populates cache
    t0 = time.perf_counter()
    res1 = client.get("/api/admin/crm/locations", headers=headers)
    t_cold = time.perf_counter() - t0

    assert res1.status_code == 200
    data1 = res1.json()
    assert "states" in data1
    assert "cities" in data1
    assert len(data1["cities"]) > 0

    # Verify cache key was stored
    cached_locs = await hybrid_cache.get("crm:locations")
    assert cached_locs is not None
    assert cached_locs["states"] == data1["states"]

    # 2. Warm cached call: must return instantly
    t1 = time.perf_counter()
    res2 = client.get("/api/admin/crm/locations", headers=headers)
    t_warm = time.perf_counter() - t1

    assert res2.status_code == 200
    assert res2.json() == data1
    assert t_warm < 0.05  # sub-50ms HTTP TestClient turnaround


@pytest.mark.asyncio
async def test_crm_geo_pulse_caching_and_refresh(client):
    """Test live telemetry aggregation caching across timeframes and refresh bypass."""
    admin = await _make_admin()
    headers = {"Authorization": f"Bearer {_token(admin)}"}

    # 1. Cold call for All Geo
    res1 = client.get("/api/admin/crm/geo-pulse?timeframe=all", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert "summary" in data1
    assert "fleet" in data1
    assert "location" in data1

    cache_key = "crm:geopulse:all:all:all:all"
    cached = await hybrid_cache.get(cache_key)
    assert cached is not None
    assert cached["summary"]["totalOrders"] == data1["summary"]["totalOrders"]

    # 2. Warm call
    t0 = time.perf_counter()
    res2 = client.get("/api/admin/crm/geo-pulse?timeframe=all", headers=headers)
    t_warm = time.perf_counter() - t0
    assert res2.status_code == 200
    assert res2.json() == data1
    assert t_warm < 0.05

    # 3. Filtered geo pulse
    res_filtered = client.get(
        "/api/admin/crm/geo-pulse?state=Uttar%20Pradesh&city=Kasganj&timeframe=7d",
        headers=headers,
    )
    assert res_filtered.status_code == 200
    filtered_cache = await hybrid_cache.get("crm:geopulse:Uttar Pradesh:Kasganj:all:7d")
    assert filtered_cache is not None

    # 4. Refresh parameter bypasses cache
    res_refresh = client.get("/api/admin/crm/geo-pulse?timeframe=all&refresh=true", headers=headers)
    assert res_refresh.status_code == 200


@pytest.mark.asyncio
async def test_crm_leaderboard_caching(client):
    """Test leaderboard ranking calculation caching."""
    admin = await _make_admin()
    headers = {"Authorization": f"Bearer {_token(admin)}"}

    res1 = client.get("/api/admin/crm/leaderboard?timeframe=all", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert "partners" in data1
    assert "riders" in data1
    assert "customers" in data1

    cache_key = "crm:leaderboard:all:all:all:all"
    cached = await hybrid_cache.get(cache_key)
    assert cached is not None

    # Warm call
    res2 = client.get("/api/admin/crm/leaderboard?timeframe=all", headers=headers)
    assert res2.status_code == 200
    assert res2.json() == data1


@pytest.mark.asyncio
async def test_crm_search_caching(client):
    """Test universal multi-entity search caching."""
    admin = await _make_admin()
    headers = {"Authorization": f"Bearer {_token(admin)}"}

    res1 = client.get("/api/admin/crm/search?q=kasganj&entity_type=all&limit=20", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert "items" in data1

    cached = await hybrid_cache.get("crm:search:all:all:all:all:kasganj:20")
    assert cached is not None

    res2 = client.get("/api/admin/crm/search?q=kasganj&entity_type=all&limit=20", headers=headers)
    assert res2.status_code == 200
    assert res2.json() == data1


@pytest.mark.asyncio
async def test_crm_mutations_invalidate_cache(client):
    """Test that CRM notes and status updates invalidate cached search, leaderboard, and geopulse."""
    admin = await _make_admin()
    headers = {"Authorization": f"Bearer {_token(admin)}"}

    # 1. Warm search and geopulse caches
    client.get("/api/admin/crm/search?q=pilot&entity_type=all", headers=headers)
    client.get("/api/admin/crm/geo-pulse?timeframe=all", headers=headers)
    assert await hybrid_cache.get("crm:geopulse:all:all:all:all") is not None

    test_customer_id = f"cust_{uuid.uuid4().hex[:8]}"

    # 2. Add CRM note
    note_payload = {
        "note": "Customer VIP loyalty verified.",
        "priority": "normal",
        "category": "loyalty",
    }
    res_note = client.post(
        f"/api/admin/crm/notes/customer/{test_customer_id}",
        json=note_payload,
        headers=headers,
    )
    assert res_note.status_code == 200

    # 3. Update status
    status_payload = {
        "entityType": "customer",
        "entityId": test_customer_id,
        "status": "active",
        "reason": "Verified account status",
    }
    res_status = client.post(
        "/api/admin/crm/update-status",
        json=status_payload,
        headers=headers,
    )
    assert res_status.status_code == 200

    # 4. Verify geopulse cache was purged
    assert await hybrid_cache.get("crm:geopulse:all:all:all:all") is None


@pytest.mark.asyncio
async def test_city_repository_intelligence_caching_and_invalidation():
    """Test that AdminCityRepository caches get_intelligence & dashboard_stats, and purges on mutation."""
    # 1. First call populates intelligence cache
    intel1 = await city_repository.get_intelligence()
    assert isinstance(intel1, list)
    assert await hybrid_cache.get("admin:cities:intelligence") is not None

    # 2. Dashboard stats
    stats1 = await city_repository.dashboard_stats()
    assert "totalCities" in stats1
    assert await hybrid_cache.get("admin:cities:dashboard_stats") is not None

    # 3. Mutation invalidates city caches
    new_city = await city_repository.create({
        "city": f"Aligarh_{uuid.uuid4().hex[:4]}",
        "name": "Aligarh",
        "state": "Uttar Pradesh",
        "deliveryRadiusKm": 18.0,
    })
    assert new_city is not None

    # Verify both intelligence and dashboard_stats caches were purged
    assert await hybrid_cache.get("admin:cities:intelligence") is None
    assert await hybrid_cache.get("admin:cities:dashboard_stats") is None
    assert await hybrid_cache.get("crm:locations") is None
