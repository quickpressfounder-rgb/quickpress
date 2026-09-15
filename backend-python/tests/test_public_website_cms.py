"""Tests for QuickPress Public Information Website APIs."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.catalog_repositories import catalog
from app.db.cms_repositories import cms_repo
from app.db.client import database


@pytest.fixture(autouse=True)
async def ensure_seeds():
    await catalog.ensure_seed()
    await cms_repo.ensure_seed()
    await database.collection("admin_cities").update_one(
        {"_id": "city-kasganj"},
        {
            "$set": {
                "_id": "city-kasganj",
                "city": "Kasganj",
                "state": "Uttar Pradesh",
                "status": "Live",
                "zones": [{"name": "Soron Gate"}],
            }
        },
        upsert=True,
    )


@pytest.mark.asyncio
async def test_public_legal_doc_privacy_policy():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/public/legal/privacy-policy")
        assert resp.status_code == 200
        data = resp.json()
        assert data["slug"] == "privacy-policy"
        assert "Privacy Policy" in data["title"]
        assert "currentVersion" in data
        assert "content" in data


@pytest.mark.asyncio
async def test_all_app_legal_docs_and_aliases():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Partner Agreement
        resp = await client.get("/api/public/legal/partner-agreement")
        assert resp.status_code == 200
        assert "Partner Merchant" in resp.json()["title"]

        # 2. Rider Agreement
        resp = await client.get("/api/public/legal/rider-agreement")
        assert resp.status_code == 200
        assert "Captain Delivery" in resp.json()["title"]

        # 3. Grievance Redressal
        resp = await client.get("/api/public/legal/grievance-redressal")
        assert resp.status_code == 200
        assert "Grievance" in resp.json()["title"]

        # 4. Cancellation & Refund Policy
        resp = await client.get("/api/public/legal/cancellation-refund-policy")
        assert resp.status_code == 200
        assert "Refund" in resp.json()["title"]

        # 5. Terms of Service alias
        resp = await client.get("/api/public/legal/terms-of-service")
        assert resp.status_code == 200
        assert "Terms" in resp.json()["title"]


@pytest.mark.asyncio
async def test_public_services_list_and_detail():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/public/services")
        assert resp.status_code == 200
        services = resp.json()
        assert len(services) > 0
        slug = services[0]["slug"]

        detail_resp = await client.get(f"/api/public/services/{slug}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["slug"] == slug
        assert "careInstructions" in detail
        assert "workflow" in detail


@pytest.mark.asyncio
async def test_public_cities_and_faqs():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Cities
        resp = await client.get("/api/public/cities")
        assert resp.status_code == 200
        cities = resp.json()
        assert len(cities) > 0

        # FAQs
        faq_resp = await client.get("/api/public/faqs")
        assert faq_resp.status_code == 200
        faqs = faq_resp.json()
        assert len(faqs) > 0


@pytest.mark.asyncio
async def test_public_contact_submission():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "Test User",
            "email": "testuser@example.com",
            "phone": "9876543210",
            "subject": "Laundry Inquiries",
            "message": "Hello, I want to know about your pickup services in Kasganj.",
        }
        resp = await client.post("/api/public/contact", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert "id" in data
