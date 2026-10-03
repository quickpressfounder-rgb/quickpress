"""HTTP Caching & CDN Edge Response Headers for QuickPress."""

from __future__ import annotations

from typing import Optional
from fastapi import Response

# Pre-defined Cache Profiles:
# 1. STATIC_CATALOG: Banners, Categories, FAQs, Popular Services, Recommendations (5m fresh, 10m SWR)
CACHE_STATIC_CATALOG = "public, max-age=300, stale-while-revalidate=600"

# 2. SHORT_LIVED: Services list, nearby partners, guest home payload (60s fresh, 120s SWR)
CACHE_SHORT_LIVED = "public, max-age=60, stale-while-revalidate=120"

# 3. LONG_LIVED: App metadata, system terms, immutable configs (1 hour fresh, 24h SWR)
CACHE_LONG_LIVED = "public, max-age=3600, stale-while-revalidate=86400"

# 4. PRIVATE: Authenticated endpoints, personal profiles, cart, orders (strictly private, no CDN cache)
CACHE_PRIVATE = "private, no-cache, no-store, must-revalidate"


def apply_cache_headers(response: Optional[Response], profile: str = CACHE_STATIC_CATALOG) -> None:
    """Sets standard HTTP Cache-Control and Vary headers for CDN edge and browser caching."""
    if response is not None:
        response.headers["Cache-Control"] = profile
        response.headers["Vary"] = "Accept-Encoding"
