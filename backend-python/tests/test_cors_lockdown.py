import os
import pytest
from starlette.testclient import TestClient
from app.main import create_app
from app.config import get_settings


def test_cors_production_lockdown(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    
    app = create_app()
    client = TestClient(app)
    
    # 1. Allowed Production Origin
    res_valid = client.options(
        "/api/app-meta",
        headers={
            "Origin": "https://quickpress.online",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_valid.status_code == 200
    assert res_valid.headers.get("access-control-allow-origin") == "https://quickpress.online"
    
    # 2. Allowed Vercel Frontend Origin
    res_vercel = client.options(
        "/api/app-meta",
        headers={
            "Origin": "https://appk-mu.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_vercel.status_code == 200
    assert res_vercel.headers.get("access-control-allow-origin") == "https://appk-mu.vercel.app"
    
    # 3. Disallowed Malicious Origin (Should NOT get Access-Control-Allow-Origin header)
    res_evil = client.options(
        "/api/app-meta",
        headers={
            "Origin": "https://evil-hacker-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_evil.headers.get("access-control-allow-origin") is None


def test_cors_development_localhost(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    get_settings.cache_clear()
    
    app = create_app()
    client = TestClient(app)
    
    # 1. Localhost dev origin allowed
    res_local = client.options(
        "/api/app-meta",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_local.status_code == 200
    assert res_local.headers.get("access-control-allow-origin") == "http://localhost:8081"
    
    # 2. Foreign malicious domain in dev is still blocked
    res_evil = client.options(
        "/api/app-meta",
        headers={
            "Origin": "https://evil-hacker-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_evil.headers.get("access-control-allow-origin") is None
