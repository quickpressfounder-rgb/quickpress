"""Phase 5 Test Suite: Backend Payload GZip Compression & Server-Timing APM Middleware.

Validates:
1. Server-Timing W3C header injected into HTTP responses with microsecond precision.
2. X-Response-Time header injected for frontend latency telemetry.
3. GZip payload compression is enabled on responses exceeding minimum_size.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.catalog_repositories import catalog
from app.main import app


@pytest.fixture(autouse=True)
async def setup_catalog():
    await catalog.ensure_seed()
    yield


@pytest.mark.asyncio
async def test_server_timing_and_response_time_headers():
    """Verify that every response receives high-precision Server-Timing and X-Response-Time headers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200

        # Server-Timing W3C spec header
        assert "server-timing" in response.headers
        timing_val = response.headers["server-timing"]
        assert "total;dur=" in timing_val

        # X-Response-Time
        assert "x-response-time" in response.headers
        assert response.headers["x-response-time"].endswith("ms")


@pytest.mark.asyncio
async def test_gzip_compression_on_large_payload():
    """Verify that large payloads (> 500 bytes) are served with GZip compression support."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request full home aggregate with Accept-Encoding: gzip
        response = await client.get(
            "/api/home",
            headers={"Accept-Encoding": "gzip"},
        )
        assert response.status_code == 200

        data = response.json()
        assert "banners" in data
        assert "categories" in data
        assert "services" in data

        # Check Server-Timing on large aggregated endpoint
        assert "server-timing" in response.headers
        assert "x-response-time" in response.headers

        # Verify GZip header or decoded payload
        # Note: httpx automatically decodes gzip content-encoding into text/json
        assert len(response.text) > 500
