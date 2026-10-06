"""Security Headers Middleware for QuickPress API.

Implements Defense-in-Depth HTTP security headers:
- Anti-Clickjacking: X-Frame-Options: DENY
- Anti-MIME Sniffing: X-Content-Type-Options: nosniff
- Cross-Site Scripting Filter: X-XSS-Protection: 1; mode=block
- Strict Transport Security: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
- Referrer Leak Protection: Referrer-Policy: strict-origin-when-cross-origin
- Feature Policy: Permissions-Policy: camera=(), microphone=(), geolocation=(self)
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme).lower()
        host = request.headers.get("host", "").lower()
        
        # 1. Enforce HTTPS in production: redirect plain HTTP to HTTPS
        from app.config import get_settings
        settings = get_settings()
        is_prod = (settings.app_env or "development").strip().lower() == "production"
        is_local = "localhost" in host or "127.0.0.1" in host or host.startswith("testclient")

        if is_prod and not is_local and proto == "http":
            https_url = str(request.url).replace("http://", "https://", 1)
            redirect_res = RedirectResponse(url=https_url, status_code=301)
            redirect_res.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            return redirect_res

        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
        if proto == "https" or is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

