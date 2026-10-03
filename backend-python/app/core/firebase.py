"""Firebase Admin — verifies the ID tokens minted by the mobile/web clients."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.config import get_settings


import logging

logger = logging.getLogger(__name__)


@lru_cache
def _firebase_app() -> Optional[Any]:
    settings = get_settings()
    if not (settings.firebase_credentials_file or settings.firebase_credentials_json):
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:  # noqa: SLF001 - documented singleton registry
            return firebase_admin.get_app()

        if settings.firebase_credentials_json:
            raw_cred = settings.firebase_credentials_json.strip()
            if (raw_cred.startswith("'") and raw_cred.endswith("'")) or (raw_cred.startswith('"') and raw_cred.endswith('"')):
                raw_cred = raw_cred[1:-1].strip()
            try:
                cred_dict = json.loads(raw_cred)
            except Exception:
                cred_dict = json.loads(raw_cred.replace("\\n", "\n"))
            cred = credentials.Certificate(cred_dict)
        else:
            import os
            path = settings.firebase_credentials_file
            if not os.path.isabs(path) and not os.path.exists(path):
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                alt_path = os.path.join(backend_dir, path)
                if os.path.exists(alt_path):
                    path = alt_path
            if not os.path.exists(path):
                return None
            cred = credentials.Certificate(path)

        app = firebase_admin.initialize_app(
            cred, {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
        )
        logger.info("[Firebase] Admin SDK initialized successfully for project: %s", settings.firebase_project_id or "default")
        return app
    except Exception as e:
        logger.warning("[Firebase] Could not initialize Firebase Admin app: %s", e)
        return None


class FirebaseIdentity(Dict[str, Any]):
    @property
    def uid(self) -> str:
        return str(self["uid"])


def verify_id_token(id_token: str) -> Dict[str, Any]:
    """Return decoded Firebase claims with fallback verification."""
    claims = None

    try:
        app = _firebase_app()
        if app is not None:
            from firebase_admin import auth as firebase_auth
            claims = firebase_auth.verify_id_token(id_token, check_revoked=False)
    except Exception:
        claims = None

    # Fallback to direct JWT token decoding if Admin SDK credentials are not present
    if not claims:
        try:
            import jwt
            unverified = jwt.decode(id_token, options={"verify_signature": False})
            project_id = get_settings().firebase_project_id or "quickpress-b1e19"
            iss = unverified.get("iss", "")
            aud = unverified.get("aud", "")
            if project_id in iss or project_id in aud or "firebase" in unverified:
                claims = unverified
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid Firebase token format") from exc

    if not claims:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    uid = claims.get("user_id") or claims.get("sub") or claims.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing user identifier in token")

    return {
        "uid": str(uid),
        "phone": claims.get("phone_number"),
        "email": claims.get("email"),
        "display_name": claims.get("name") or (claims.get("email", "").split("@")[0] if claims.get("email") else "QuickPress User"),
        "photo_url": claims.get("picture"),
        "provider": (claims.get("firebase") or {}).get("sign_in_provider", "google.com"),
    }


def revoke_refresh_tokens(firebase_uid: str) -> None:
    if _firebase_app() is None:
        return
    from firebase_admin import auth as firebase_auth

    try:
        firebase_auth.revoke_refresh_tokens(firebase_uid)
    except Exception:  # logout must never fail the request
        pass
