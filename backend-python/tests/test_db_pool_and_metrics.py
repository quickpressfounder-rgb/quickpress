"""Tests for Phase 10: Database Connection Pool Tuning and Query APM Telemetry."""

import pytest
from app.db.client import database
from app.main import fastapi_app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_database_pool_metrics():
    """Verify database exposes pool utilization and query metrics."""
    metrics = database.get_pool_metrics()
    assert "engine" in metrics
    assert "min_pool_size" in metrics
    assert "max_pool_size" in metrics
    assert "active_connections" in metrics
    assert "idle_connections" in metrics
    assert "total_queries" in metrics
    assert "slow_queries" in metrics
    assert "avg_query_time_ms" in metrics


@pytest.mark.asyncio
async def test_health_db_metrics_endpoint():
    """Verify /api/health/db-metrics endpoint returns 200 with pool stats."""
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health/db-metrics")
        assert res.status_code == 200
        data = res.json()
        assert "engine" in data
        assert "max_pool_size" in data
        assert data["max_pool_size"] >= 1
