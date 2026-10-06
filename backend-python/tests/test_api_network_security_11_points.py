"""Comprehensive Test Suite for 11 Bank-Grade API & Network Gateway Security Controls.

Validates:
1. HTTPS only & HSTS enforcement
2. CORS strict whitelisting & anti-reflection defense
3. Request schema validation (FastAPI / Pydantic 422)
4. Sliding window rate limiting & 429 throttle
5. API authentication (401 on missing/invalid JWT)
6. API authorization (403 on role mismatch)
7. Input sanitization (blocking SQLi, XSS, Path Traversal, NoSQL)
8. Pagination limits & memory exhaustion clamping
9. Request payload size limits (413 Payload Too Large)
10. Idempotency keys via RFC HTTP header
11. Sensitive API endpoints & Sudo-mode re-auth protection
"""

from __future__ import annotations

import json
import pytest
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.pagination import PaginationGuardMiddleware, clamp_pagination
from app.core.rate_limiter import GlobalRateLimiterMiddleware, rate_limiter
from app.core.request_size_limiter import RequestSizeLimitMiddleware
from app.core.sanitizer import (
    InputSanitizerMiddleware,
    is_malicious_payload,
    sanitize_input,
)
from app.core.security_headers import SecurityHeadersMiddleware
from app.main import create_app


@pytest.fixture
def app_instance():
    return create_app()


# -----------------------------------------------------------------------------
# 1. HTTPS Only & HSTS
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_01_security_headers_and_hsts():
    """Verify HSTS and security defense headers are injected."""
    middleware = SecurityHeadersMiddleware(app=None)

    async def dummy_next(request: Request) -> Response:
        return Response("ok", status_code=200)

    # Simulated HTTPS request
    req = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/health",
            "headers": [(b"host", b"api.quickpress.in"), (b"x-forwarded-proto", b"https")],
        }
    )
    res = await middleware.dispatch(req, dummy_next)
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-XSS-Protection"] == "1; mode=block"
    assert "Strict-Transport-Security" in res.headers
    assert "max-age=31536000" in res.headers["Strict-Transport-Security"]


# -----------------------------------------------------------------------------
# 2. CORS Strictly Restricted
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_02_cors_unauthorized_origin_blocked(app_instance):
    """Verify that unauthorized hacker origin is NOT reflected on error responses."""
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Request with malicious origin
        res = await client.get(
            "/api/health",
            headers={"Origin": "https://evil-attacker-site.com"},
        )
        # Should not allow the evil attacker origin
        allowed_origin = res.headers.get("access-control-allow-origin")
        assert allowed_origin != "https://evil-attacker-site.com"


# -----------------------------------------------------------------------------
# 3. Request Validation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_03_request_validation_rejection(app_instance):
    """Verify that malformed or negative payloads return structured 422 Unprocessable Entity."""
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Send bad JSON with missing required fields
        res = await client.post(
            "/api/auth/phone/send-otp",
            json={"invalidKey": 123},
        )
        assert res.status_code == 422
        data = res.json()
        assert "detail" in data


# -----------------------------------------------------------------------------
# 4. Rate Limiting
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_04_rate_limiting_throttle():
    """Verify sliding window rate limiter returns 429 when quota is exceeded."""
    limiter = rate_limiter
    test_key = "test_rate_client:192.168.1.50"
    limiter.reset_failed_attempts(test_key)

    # Consume allowed requests
    for _ in range(5):
        allowed, remaining, _ = limiter.check_limit_with_info(test_key, max_requests=5, window_seconds=60)
        assert allowed is True

    # 6th request must be blocked
    allowed, remaining, reset_sec = limiter.check_limit_with_info(test_key, max_requests=5, window_seconds=60)
    assert allowed is False
    assert remaining == 0
    assert reset_sec > 0


# -----------------------------------------------------------------------------
# 5. API Authentication
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_05_api_authentication_required(app_instance):
    """Verify unauthenticated calls to protected routes return 401 Unauthorized."""
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/profile")
        assert res.status_code == 401


# -----------------------------------------------------------------------------
# 6. API Authorization & Segregation of Duties
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_06_api_authorization_support_blocked_from_refund():
    """Verify that Support Agent role is strictly rejected with 403 Forbidden on finance refund."""
    from app.core.admin_security import (
        PERM_FINANCE_REFUND,
        ROLE_SUPPORT,
        check_admin_permission,
    )
    from app.models.user import User

    support_user = User(
        id="usr_supp_test",
        phone="9876543210",
        role=ROLE_SUPPORT,
    )

    with pytest.raises(Exception) as excinfo:
        check_admin_permission(support_user, PERM_FINANCE_REFUND)
    assert excinfo.value.status_code == 403


# -----------------------------------------------------------------------------
# 7. Input Sanitization (SQLi, XSS, NoSQL)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_07_input_sanitization_defense():
    """Verify that SQL Injection, XSS, and NoSQL attack vectors are intercepted."""
    # Test malicious pattern detector
    assert is_malicious_payload("1' UNION SELECT * FROM users--") is True
    assert is_malicious_payload("<script>alert('pwned')</script>") is True
    assert is_malicious_payload("../../etc/passwd") is True
    assert is_malicious_payload("regular safe customer note") is False

    # Test InputSanitizerMiddleware
    sanitizer_middleware = InputSanitizerMiddleware(app=None)

    async def dummy_next(request: Request) -> Response:
        return Response("ok", status_code=200)

    # 1. SQL Injection attempt via query parameter
    sqli_req = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/partners/nearby",
            "query_string": b"q=test'%20OR%20'1'='1",
            "headers": [],
        }
    )
    sqli_res = await sanitizer_middleware.dispatch(sqli_req, dummy_next)
    assert sqli_res.status_code == 400

    # 2. XSS attempt via query parameter
    xss_req = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/search",
            "query_string": b"q=%3Cscript%3Ealert(1)%3C/script%3E",
            "headers": [],
        }
    )
    xss_res = await sanitizer_middleware.dispatch(xss_req, dummy_next)
    assert xss_res.status_code == 400

    # 3. NoSQL operator injection attempt
    nosql_req = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/catalog",
            "query_string": b"$where=this.password.length>0",
            "headers": [],
        }
    )
    nosql_res = await sanitizer_middleware.dispatch(nosql_req, dummy_next)
    assert nosql_res.status_code == 400


# -----------------------------------------------------------------------------
# 8. Pagination Limits & Clamping
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_08_pagination_limits_guard():
    """Verify that requested pagination limit is clamped to safe max ceiling."""
    assert clamp_pagination(999999, max_allowed=100) == 100
    assert clamp_pagination(-50, max_allowed=100) == 1
    assert clamp_pagination(25, max_allowed=100) == 25

    guard_middleware = PaginationGuardMiddleware(app=None)

    async def capture_next(request: Request) -> Response:
        # Downstream receives clamped query params
        return JSONResponse({"received_limit": request.query_params.get("limit")})

    req = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/orders",
            "query_string": b"limit=999999&page=1",
            "headers": [],
        }
    )
    res = await guard_middleware.dispatch(req, capture_next)
    body = json.loads(res.body.decode("utf-8"))
    assert body["received_limit"] == "100"


# -----------------------------------------------------------------------------
# 9. Request-Size Limits
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_09_request_size_limits():
    """Verify that request bodies exceeding 2MB are rejected with 413 Payload Too Large."""
    size_middleware = RequestSizeLimitMiddleware(app=None)

    async def dummy_next(request: Request) -> Response:
        return Response("ok", status_code=200)

    # 5MB payload on standard JSON route
    oversized_req = Request(
        scope={
            "type": "http",
            "method": "POST",
            "path": "/api/orders",
            "headers": [(b"content-length", str(5 * 1024 * 1024).encode("utf-8"))],
        }
    )
    res = await size_middleware.dispatch(oversized_req, dummy_next)
    assert res.status_code == 413

    # Normal 1KB payload allowed
    normal_req = Request(
        scope={
            "type": "http",
            "method": "POST",
            "path": "/api/orders",
            "headers": [(b"content-length", b"1024")],
        }
    )
    res_normal = await size_middleware.dispatch(normal_req, dummy_next)
    assert res_normal.status_code == 200


# -----------------------------------------------------------------------------
# 10. Idempotency Keys via HTTP Header
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_10_idempotency_key_header_support():
    """Verify Idempotency-Key HTTP header prevents duplicate processing."""
    from app.core.idempotency import idempotency_engine

    import uuid
    user_id = f"usr_idem_{uuid.uuid4().hex[:6]}"
    idem_key = f"idemp-hdr-{uuid.uuid4().hex}"

    # 1. First acquisition succeeds
    result1 = await idempotency_engine.acquire("payment", f"{user_id}:{idem_key}")
    assert result1.is_duplicate is False

    # 2. Concurrent second acquisition is flagged as processing duplicate
    result2 = await idempotency_engine.acquire("payment", f"{user_id}:{idem_key}")
    assert result2.is_duplicate is True
    assert result2.is_processing is True

    # 3. Complete first transaction
    cached_payload = {"transactionId": "tx_999", "amount": 499.0, "status": "SUCCESS"}
    await idempotency_engine.complete("payment", f"{user_id}:{idem_key}", cached_payload)

    # 4. Third acquisition returns cached result without re-charging
    result3 = await idempotency_engine.acquire("payment", f"{user_id}:{idem_key}")
    assert result3.is_duplicate is True
    assert result3.is_processing is False
    assert result3.cached_data == cached_payload


# -----------------------------------------------------------------------------
# 11. Sensitive API Endpoints & Sudo-Mode Protection
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_11_sensitive_endpoint_sudo_mode():
    """Verify that sensitive administrative operations require valid Sudo Token."""
    from app.core.admin_security import (
        issue_sudo_token,
        require_sudo_mode,
        verify_sudo_token,
    )

    admin_id = "adm_super_001"

    # Missing Sudo Token raises 403 Forbidden
    with pytest.raises(Exception) as exc_missing:
        await require_sudo_mode(admin_id, None)
    assert exc_missing.value.status_code == 403

    # Invalid Sudo Token raises 403 Forbidden
    with pytest.raises(Exception) as exc_invalid:
        await require_sudo_mode(admin_id, "invalid_sudo_token_123")
    assert exc_invalid.value.status_code == 403

    # Valid Sudo Token passes authorization
    valid_token = await issue_sudo_token(admin_id)
    assert await verify_sudo_token(admin_id, valid_token) is True
    assert await require_sudo_mode(admin_id, valid_token) is True
