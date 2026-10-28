"""Customer notification API — Sprint 2.7.

    GET    /api/notifications              paginated feed + search + type filter
    GET    /api/notifications/unread-count badge count for the header
    PUT    /api/notifications/{id}/read    mark one as read
    PUT    /api/notifications/read-all     mark every notification as read
    DELETE /api/notifications/{id}         remove one notification

Every route requires a bearer token and is scoped to `current_user`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Any, Dict, List, Optional, Union

from app.core.deps import current_user
from app.db.notification_repositories import notification_repository
from app.models.notification import (
    NotificationActionResponse,
    NotificationListResponse,
    UnreadCountResponse,
)
from app.models.user import Role, User

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=50),
    search: str = Query("", max_length=120),
    type: str = Query("all", max_length=32),
    user: User = Depends(current_user),
) -> NotificationListResponse:
    return await notification_repository.list(
        user.id, page=page, limit=limit, search=search, type_filter=type
    )


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def unread_count(user: User = Depends(current_user)) -> UnreadCountResponse:
    return UnreadCountResponse(count=await notification_repository.unread_count(user.id))


# Declared before `/notifications/{id}/read` so the literal path always wins.
@router.put("/notifications/read-all", response_model=NotificationActionResponse)
@router.post("/notifications/read-all", response_model=NotificationActionResponse)
async def mark_all_read(user: User = Depends(current_user)) -> NotificationActionResponse:
    await notification_repository.mark_all_read(user.id)
    return NotificationActionResponse(ok=True, unread=0)


@router.put("/notifications/{notification_id}/read", response_model=NotificationActionResponse)
@router.post("/notifications/{notification_id}/read", response_model=NotificationActionResponse)
async def mark_read(
    notification_id: str, user: User = Depends(current_user)
) -> NotificationActionResponse:
    found = await notification_repository.mark_read(user.id, notification_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return NotificationActionResponse(
        ok=True,
        id=notification_id,
        unread=await notification_repository.unread_count(user.id),
    )


@router.post("/notifications/fcm-token")
async def save_fcm_token(
    payload: dict,
    user: User = Depends(current_user),
) -> dict:
    """Save user FCM push notification token."""
    token = str(payload.get("token") or payload.get("fcmToken") or "").strip()
    device = str(payload.get("device") or payload.get("deviceType") or "web").strip()
    if token:
        from app.core.fcm import register_fcm_token
        await register_fcm_token(user.id, token, device)
    return {"ok": True, "registered": bool(token), "device": device}


@router.delete("/notifications/fcm-token")
async def delete_fcm_token(
    token: Optional[str] = Query(None, description="Specific token to remove; omit to clear all"),
    user: User = Depends(current_user),
) -> dict:
    """Unregister FCM token on logout."""
    from app.core.fcm import unregister_fcm_token
    await unregister_fcm_token(user.id, token)
    return {"ok": True, "unregistered": True}


@router.delete("/notifications/{notification_id}", response_model=NotificationActionResponse)
async def delete_notification(
    notification_id: str, user: User = Depends(current_user)
) -> NotificationActionResponse:
    removed = await notification_repository.delete(user.id, notification_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return NotificationActionResponse(
        ok=True,
        id=notification_id,
        unread=await notification_repository.unread_count(user.id),
    )


@router.get("/notifications/onesignal/config")
async def get_onesignal_config() -> dict:
    """Return OneSignal App ID for client SDK initialization."""
    from app.config import get_settings
    settings = get_settings()
    return {"ok": True, "appId": settings.onesignal_app_id}


@router.post("/notifications/onesignal/player-id")
async def save_onesignal_player(
    payload: dict,
    user: User = Depends(current_user),
) -> dict:
    """Register OneSignal subscription / player ID for current user."""
    from app.core.onesignal import register_user_onesignal_player
    player_id = str(payload.get("playerId") or payload.get("player_id") or payload.get("subscriptionId") or "").strip()
    device = str(payload.get("device") or payload.get("deviceType") or "web").strip()
    role_val = getattr(user.role, "value", str(user.role))
    success = False
    if player_id:
        success = await register_user_onesignal_player(user.id, player_id, role=role_val, device_type=device)
    return {"ok": success, "registered": success, "playerId": player_id}


def _assert_test_allowed(user: User) -> None:
    from app.config import get_settings
    settings = get_settings()
    is_prod = (settings.app_env or "development").strip().lower() == "production"
    if is_prod and getattr(user, "role", None) not in (Role.admin, Role.super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test notification endpoints are disabled in production for non-administrative roles.",
        )


@router.post("/notifications/onesignal/test")
async def send_test_onesignal(
    payload: Optional[dict] = None,
    user: User = Depends(current_user),
) -> dict:
    """Send a test high-priority push notification via OneSignal."""
    _assert_test_allowed(user)
    from app.core.onesignal import send_onesignal_notification
    body_data = payload or {}
    title = str(body_data.get("title") or "🔔 QuickPress OneSignal Push")
    body = str(body_data.get("body") or "OneSignal High-Priority Alert pipeline is active & verified!")
    deep_link = str(body_data.get("url") or "/notifications")

    result = await send_onesignal_notification(
        user.id,
        title=title,
        body=body,
        data={"url": deep_link, "type": "test_onesignal", "userId": user.id},
        url=deep_link,
    )

    return {
        "ok": result.get("status") in ("delivered", "skipped"),
        "result": result,
        "user": user.id,
    }


@router.post("/notifications/test-push")
async def send_test_push(
    payload: Optional[dict] = None,
    user: User = Depends(current_user),
) -> dict:
    """Send a test push notification to the calling user via OneSignal and WebPush."""
    _assert_test_allowed(user)
    from app.core.onesignal import send_onesignal_notification
    from app.core.webpush import send_native_webpush

    body_data = payload or {}
    title = str(body_data.get("title") or "🔔 QuickPress Test Alert")
    body = str(body_data.get("body") or "OneSignal & WebPush notification pipeline is active!")
    deep_link = str(body_data.get("url") or "/notifications")

    os_res = await send_onesignal_notification(
        user.id,
        title=title,
        body=body,
        data={"url": deep_link, "type": "test_push", "userId": user.id},
        url=deep_link,
    )
    wp_count = await send_native_webpush(
        user.id,
        title=title,
        body=body,
        data={"url": deep_link, "type": "test_push", "userId": user.id},
    )

    return {
        "ok": True,
        "sentCount": wp_count,
        "onesignal": os_res,
        "webpushSentCount": wp_count,
        "user": user.id,
    }


# --------------------------------------------------------------------------
# Native WebPush (VAPID / Zero-3rd-party) Endpoints
# --------------------------------------------------------------------------


@router.get("/notifications/webpush/vapid-public-key")
async def get_webpush_public_key() -> dict:
    """Return the VAPID public key for native browser PushManager subscriptions."""
    from app.core.webpush import get_vapid_public_key
    return {"ok": True, "publicKey": get_vapid_public_key()}


@router.post("/notifications/webpush/subscribe")
async def subscribe_webpush(
    payload: dict,
    user: User = Depends(current_user),
) -> dict:
    """Save standard browser PushSubscription object (endpoint, keys.p256dh, keys.auth)."""
    from app.core.webpush import save_webpush_subscription
    subscription = payload.get("subscription") or payload
    device = str(payload.get("device") or payload.get("deviceType") or "web").strip()
    success = await save_webpush_subscription(user.id, subscription, device)
    return {"ok": success, "subscribed": success}


@router.delete("/notifications/webpush/unsubscribe")
async def unsubscribe_webpush(
    endpoint: Optional[str] = Query(None, description="Specific endpoint to remove; omit to clear all"),
    user: User = Depends(current_user),
) -> dict:
    """Remove browser PushSubscription on user logout."""
    from app.core.webpush import delete_webpush_subscription
    success = await delete_webpush_subscription(user.id, endpoint)
    return {"ok": success, "unsubscribed": success}


@router.post("/notifications/webpush/test")
async def send_test_webpush(
    payload: Optional[dict] = None,
    user: User = Depends(current_user),
) -> dict:
    """Send an instant native WebPush notification directly to the user's browser."""
    _assert_test_allowed(user)
    from app.core.webpush import send_native_webpush
    body_data = payload or {}
    title = str(body_data.get("title") or "🔔 QuickPress Native WebPush")
    body = str(body_data.get("body") or "Native VAPID push notification pipeline is active & verified!")
    deep_link = str(body_data.get("url") or "/notifications")

    delivered_count = await send_native_webpush(
        user.id,
        title=title,
        body=body,
        data={"url": deep_link, "type": "test_webpush", "userId": user.id},
    )

    return {
        "ok": True,
        "sentCount": delivered_count,
        "message": f"Dispatched native webpush to {delivered_count} browser subscription(s).",
        "user": user.id,
    }


