"""Database Security, Environment Isolation & Credentials Posture Guard.

Verifies:
1. Strong credentials & rejection of default passwords
2. Environment separation (Production vs Development/Testing)
3. SSL transport encryption verification
4. Prevention of test suites wiping production database
"""

from __future__ import annotations

import logging
import re
from typing import List, Tuple
from urllib.parse import urlparse

logger = logging.getLogger("quickpress.db_security")

DEFAULT_WEAK_PASSWORDS = {
    "postgres",
    "password",
    "password123",
    "admin",
    "root",
    "123456",
    "qwerty",
}

DEFAULT_WEAK_USERS = {"root"}


def validate_database_security_posture(
    database_url: str, app_env: str
) -> Tuple[bool, List[str]]:
    """Audits database connection parameters for security posture compliance.

    Returns:
        (is_secure: bool, violations: List[str])
    """
    violations: List[str] = []
    if not database_url:
        return True, violations

    env_clean = (app_env or "development").strip().lower()
    is_production = env_clean == "production"

    try:
        parsed = urlparse(database_url)
    except Exception as exc:
        return False, [f"Invalid database URL format: {exc}"]

    # 1. Weak Default Credentials Audit
    username = parsed.username or ""
    password = parsed.password or ""

    if password.lower() in DEFAULT_WEAK_PASSWORDS:
        violations.append("Weak or default database password detected. Use a high-entropy secret.")

    if username.lower() in DEFAULT_WEAK_USERS and is_production:
        violations.append("Production database must not connect as root user. Use a dedicated app role.")

    # 2. Environment Isolation Guard
    host = (parsed.hostname or "").lower()
    is_localhost = host in ("localhost", "127.0.0.1", "0.0.0.0")

    if is_production and is_localhost:
        violations.append("Production environment cannot bind to localhost/unsecured local database.")

    # Prevent accidental destruction: Dev/test pointing to live production URL
    if not is_production and "supabase.co" in host and "quickpress-prod" in host:
        violations.append("Development environment cannot point directly to production Supabase cluster.")

    # 3. Transport Encryption (SSL) Audit
    query = (parsed.query or "").lower()
    has_ssl = "sslmode=require" in query or "sslmode=verify-full" in query or "ssl=true" in query

    if is_production and not is_localhost and not has_ssl and "supabase" not in host:
        violations.append("Production database connections must enforce SSL/TLS encryption (sslmode=require).")

    is_secure = len(violations) == 0
    return is_secure, violations
