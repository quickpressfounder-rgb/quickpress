"""Pagination Limit & Memory Exhaustion Guard for QuickPress Platform.

Ensures that no API caller can request arbitrary, unbounded limits that trigger
Out-Of-Memory (OOM) crashes on the server or flood DB query buffers.
"""

from __future__ import annotations

import logging
from urllib.parse import parse_qs, urlencode
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("quickpress.security.pagination")

DEFAULT_PAGE_SIZE = 20
MAX_STANDARD_PAGE_SIZE = 100
MAX_FINANCIAL_PAGE_SIZE = 200

FINANCIAL_PATH_PREFIXES = (
    "/api/invoices",
    "/api/finance",
    "/api/ledger",
    "/api/wallet/transactions",
    "/api/reconciliation",
    "/api/admin/audit-logs",
)


def clamp_pagination(limit: int, max_allowed: int = MAX_STANDARD_PAGE_SIZE) -> int:
    """Safely clamp a requested page limit between 1 and max_allowed."""
    if limit < 1:
        return 1
    if limit > max_allowed:
        return max_allowed
    return limit


class PaginationGuardMiddleware(BaseHTTPMiddleware):
    """Intercepts and clamps pagination query parameters globally across all endpoints."""

    async def dispatch(self, request: Request, call_next):
        query_params = request.query_params
        has_limit = "limit" in query_params or "page_size" in query_params

        if has_limit:
            path = request.url.path
            is_financial = any(path.startswith(prefix) for prefix in FINANCIAL_PATH_PREFIXES)
            max_ceiling = MAX_FINANCIAL_PAGE_SIZE if is_financial else MAX_STANDARD_PAGE_SIZE

            # Parse query dictionary
            parsed = parse_qs(request.url.query, keep_blank_values=True)
            modified = False

            for key in ("limit", "page_size"):
                if key in parsed and parsed[key]:
                    try:
                        raw_val = int(parsed[key][0])
                        clamped_val = clamp_pagination(raw_val, max_ceiling)
                        if clamped_val != raw_val:
                            parsed[key] = [str(clamped_val)]
                            modified = True
                    except ValueError:
                        # Non-integer limit; let FastAPI validation handle it
                        pass

            if modified:
                # Flat list of items for clean urlencode
                flat_pairs = []
                for k, v_list in parsed.items():
                    for v in v_list:
                        flat_pairs.append((k, v))
                new_query_string = urlencode(flat_pairs).encode("utf-8")
                request.scope["query_string"] = new_query_string
                from starlette.datastructures import QueryParams
                request._query_params = QueryParams(new_query_string)

        return await call_next(request)

