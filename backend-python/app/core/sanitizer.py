"""Input Sanitization, SQLi, XSS & NoSQL Injection Protection for QuickPress API."""

from __future__ import annotations

import html
import re
from typing import Any, Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# Attack signatures
SQL_INJECTION_PATTERN = re.compile(
    r"(\b(UNION\s+SELECT|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|EXEC(\s|\()|BENCHMARK\(|WAITFOR\s+DELAY)\b|'\s*OR\s*'1'\s*=\s*'1|;\s*--)",
    re.IGNORECASE,
)

XSS_PATTERN = re.compile(
    r"(<script\b|javascript\s*:|\bonerror\s*=|\bonload\s*=|<iframe\b|<svg\b[^>]*\bon\w+\s*=)",
    re.IGNORECASE,
)

PATH_TRAVERSAL_PATTERN = re.compile(
    r"(\.\./|\.\.\\|/etc/passwd|/windows/win\.ini)",
    re.IGNORECASE,
)

NOSQL_OPERATORS = ("$where", "$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin", "$regex", "$or")


def sanitize_input(value: Any) -> Any:
    """Recursively strip MongoDB injection operators and escape dangerous HTML scripts."""
    if isinstance(value, str):
        # Escape potential script tags and strip leading $ operators
        cleaned = html.escape(value.strip())
        if cleaned.startswith("$"):
            cleaned = cleaned.lstrip("$")
        return cleaned
    elif isinstance(value, dict):
        # Disallow keys starting with $ (e.g. $gt, $ne, $where)
        safe_dict = {}
        for k, v in value.items():
            safe_key = str(k).lstrip("$")
            safe_dict[safe_key] = sanitize_input(v)
        return safe_dict
    elif isinstance(value, list):
        return [sanitize_input(item) for item in value]
    return value


def is_malicious_payload(text: str) -> bool:
    """Detects SQL Injection, XSS, or Path Traversal signatures."""
    if not text:
        return False
    if SQL_INJECTION_PATTERN.search(text):
        return True
    if XSS_PATTERN.search(text):
        return True
    if PATH_TRAVERSAL_PATTERN.search(text):
        return True
    return False


class InputSanitizerMiddleware(BaseHTTPMiddleware):
    """Sanitizes query parameters & path to prevent SQLi, XSS, and NoSQL operator injection."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path in ("/", "/health", "/api/health") or path.startswith("/health") or path.startswith("/api/health"):
            return await call_next(request)

        # 1. Inspect URL path for traversal or embedded script payloads
        if is_malicious_payload(path):
            return JSONResponse(
                status_code=400,
                content={"detail": "Security violation: Malicious payload pattern detected in request path."},
            )

        # 2. Inspect query parameters for NoSQL, SQLi, and XSS
        for key, val in request.query_params.items():
            val_str = str(val)
            # Check for NoSQL operators
            if key.startswith("$") or any(op in val_str for op in NOSQL_OPERATORS):
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Security violation: Invalid NoSQL query operator detected."},
                )

            # Check for SQL injection and XSS
            if is_malicious_payload(key) or is_malicious_payload(val_str):
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Security violation: Potential SQL Injection or XSS vector blocked."},
                )

        return await call_next(request)

