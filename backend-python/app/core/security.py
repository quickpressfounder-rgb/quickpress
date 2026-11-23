"""JWT access / refresh token issuing and verification."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import get_settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, role: str) -> Tuple[str, datetime]:
    settings = get_settings()
    ttl_minutes = max(settings.access_token_ttl_minutes, 43200)
    expires_at = _now() + timedelta(minutes=ttl_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": int(_now().timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_at


def create_refresh_token(user_id: str, role: str) -> Tuple[str, str, datetime]:
    settings = get_settings()
    token_id = str(uuid.uuid4())
    ttl_days = max(settings.refresh_token_ttl_days, 180)
    expires_at = _now() + timedelta(days=ttl_days)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "refresh",
        "jti": token_id,
        "iat": int(_now().timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.refresh_secret, algorithm=settings.jwt_algorithm)
    return token, token_id, expires_at


def decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    settings = get_settings()
    secret = settings.refresh_secret if expected_type == "refresh" else settings.jwt_secret
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid",
        ) from exc
    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type"
        )
    return payload
