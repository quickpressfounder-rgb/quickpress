"""Tests for Parallel I/O and HTTP Cache-Control headers."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.catalog_repositories import catalog


@pytest.fixture(autouse=True)
async def seed_data():
    await catalog.ensure_seed()


@pytest.mark.asyncio
async def test_home_and_catalog_caching_headers():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Banners
        resp_banners = await client.get("/api/banners")
        assert resp_banners.status_code == 200
        assert "Cache-Control" in resp_banners.headers
        assert "public" in resp_banners.headers["Cache-Control"]

        # 2. Categories
        resp_cat = await client.get("/api/categories")
        assert resp_cat.status_code == 200
        assert "Cache-Control" in resp_cat.headers
        assert "public" in resp_cat.headers["Cache-Control"]

        # 3. Services
        resp_srv = await client.get("/api/services")
        assert resp_srv.status_code == 200
        assert "Cache-Control" in resp_srv.headers
        assert "public" in resp_srv.headers["Cache-Control"]

        # 4. App Meta (Long Lived)
        resp_meta = await client.get("/api/app-meta")
        assert resp_meta.status_code == 200
        assert "Cache-Control" in resp_meta.headers
        assert "max-age=3600" in resp_meta.headers["Cache-Control"]

        # 5. FAQs
        resp_faqs = await client.get("/api/help/faqs")
        assert resp_faqs.status_code == 200
        assert "Cache-Control" in resp_faqs.headers
        assert "public" in resp_faqs.headers["Cache-Control"]

        # 6. Guest Home Screen (Concurrent Parallel I/O aggregate)
        resp_home = await client.get("/api/home")
        assert resp_home.status_code == 200
        data = resp_home.json()
        assert "banners" in data
        assert "categories" in data
        assert "services" in data
        assert "partners" in data
        assert "offers" in data
        assert "Cache-Control" in resp_home.headers
        assert "public" in resp_home.headers["Cache-Control"]
