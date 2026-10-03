"""Firebase Cloud Messaging (FCM) — Real push notification dispatcher for QuickPress.

Sends real push notifications to Android / iOS / Web clients with deep linking.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Union

from app.core.firebase import _firebase_app
from app.db.client import database

logger = logging.getLogger(__name__)


async def register_fcm_token(user_id: str, fcm_token: str, device_type: str = "web") -> None:
    """Register or update an FCM token for a user."""
    if not user_id or not fcm_token:
        return
    try:
        user = await database.find_one("users", {"_id": user_id})
        if not user:
            return
        tokens = list(user.get("fcm_tokens") or [])
        if fcm_token not in tokens:
            tokens.append(fcm_token)
            # Keep at most last 5 active device tokens per user
            tokens = tokens[-5:]
            await database.collection("users").update_one(
                {"_id": user_id},
                {"$set": {"fcm_tokens": tokens, "fcm_token": fcm_token, "device_type": device_type}}
            )
    except Exception as e:
        logger.warning("Failed to register FCM token for user %s: %s", user_id, e)


async def unregister_fcm_token(user_id: str, fcm_token: Optional[str] = None) -> None:
    """Unregister an FCM token on user logout."""
    if not user_id:
        return
    try:
        if fcm_token:
            user = await database.find_one("users", {"_id": user_id})
            if user:
                tokens = [t for t in (user.get("fcm_tokens") or []) if t != fcm_token]
                single_token = user.get("fcm_token")
                if single_token == fcm_token:
                    single_token = tokens[-1] if tokens else None
                await database.collection("users").update_one(
                    {"_id": user_id},
                    {
                        "$set": {"fcm_tokens": tokens, "fcm_token": single_token},
                        "$pull": {"fcm_tokens": fcm_token},
                    }
                )
        else:
            # Clear all tokens for this user
            await database.collection("users").update_one(
                {"_id": user_id},
                {"$set": {"fcm_tokens": [], "fcm_token": None}}
            )
    except Exception as e:
        logger.warning("Failed to unregister FCM token for user %s: %s", user_id, e)


async def send_fcm_push(
    user_id_or_ids: Union[str, List[str]],
    *,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    badge: Optional[int] = None,
    icon: Optional[str] = None,
    role: Optional[str] = None,
) -> int:
    """Send FCM push notification to one or multiple users.
    
    Returns the number of successfully delivered messages.
    """
    app = _firebase_app()
    if not app:
        logger.debug("Firebase App not initialized; skipping live FCM push.")
        return 0

    try:
        from firebase_admin import messaging
    except ImportError:
        logger.warning("firebase_admin.messaging not available.")
        return 0

    user_ids = [user_id_or_ids] if isinstance(user_id_or_ids, str) else user_id_or_ids
    if not user_ids:
        return 0

    # Collect all FCM tokens for these users
    tokens: List[str] = []
    for uid in user_ids:
        if not uid:
            continue
        try:
            u = (
                await database.find_one("users", {"_id": uid})
                or await database.find_one("users", {"linked_id": uid})
                or await database.find_one("users", {"linked_partner_id": uid})
                or await database.find_one("users", {"firebase_uid": uid})
            )
            if u:
                for t in (u.get("fcm_tokens") or []):
                    if t and t not in tokens:
                        tokens.append(t)
                single = u.get("fcm_token")
                if single and single not in tokens:
                    tokens.append(single)
        except Exception:
            pass

    if not tokens:
        return 0

    # Determine if urgent alert channel is needed (Partner & Rider order dispatch)
    target_role = (role or (data or {}).get("role") or "customer").lower()
    is_urgent = target_role in ("partner", "rider", "captain") or (data or {}).get("type") in (
        "new_order_offer", "order.rider_offer", "order-new", "dispatch.offer"
    )

    # Clean data payload (FCM only accepts string values in data dict)
    clean_data: Dict[str, str] = {}
    if data:
        for k, v in data.items():
            if v is not None:
                clean_data[str(k)] = str(v)

    # Ensure click_action / deep link URL is present
    click_url = clean_data.get("url") or "/"
    if "url" in clean_data and "click_action" not in clean_data:
        clean_data["click_action"] = clean_data["url"]

    if is_urgent:
        clean_data["channel_id"] = "quickpress_urgent_dispatch"
        clean_data["priority"] = "high"
        clean_data["wake_screen"] = "true"
        clean_data["ring_bell"] = "true"
        clean_data["sound"] = "order_alarm"

    notification_icon = icon or "/favicon.png"
    notification = messaging.Notification(title=title, body=body, image=icon)

    import datetime

    if is_urgent:
        android_notification = messaging.AndroidNotification(
            channel_id="quickpress_urgent_dispatch",
            sound="order_alarm",
            default_sound=True,
            priority="max",
            visibility="public",
            icon="ic_notification",
            color="#ef4444",
            click_action=click_url or "FLUTTER_NOTIFICATION_CLICK",
            vibrate_timings_millis=[0, 1000, 500, 1000, 500, 1000, 500, 1000],
            default_vibrate_timings=False,
            tag=f"order_{clean_data.get('orderId', '')}",
        )
        android_config = messaging.AndroidConfig(
            priority="high",
            ttl=datetime.timedelta(seconds=300),
            notification=android_notification,
        )
        apns_config = messaging.APNSConfig(
            headers={"apns-priority": "10"},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="order_alarm.caf",
                    badge=badge or 1,
                    category=clean_data.get("category", "order_alert"),
                    content_available=True,
                )
            ),
        )
    else:
        android_notification = messaging.AndroidNotification(
            channel_id="quickpress_orders",
            sound="default",
            default_sound=True,
            priority="high",
            visibility="private",
            icon="ic_notification",
            color="#2563eb",
            click_action=click_url or "FLUTTER_NOTIFICATION_CLICK",
        )
        android_config = messaging.AndroidConfig(
            priority="high",
            notification=android_notification,
        )
        apns_config = messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="default",
                    badge=badge,
                    category=clean_data.get("category", "order"),
                )
            )
        )

    webpush_config = messaging.WebpushConfig(
        notification=messaging.WebpushNotification(
            title=title,
            body=body,
            icon=notification_icon,
            badge="/favicon.png",
            require_interaction=is_urgent,
            vibrate=[500, 200, 500, 200, 1000] if is_urgent else [200, 100, 200],
            data={"url": click_url, **clean_data},
        ),
        fcm_options=messaging.WebpushFCMOptions(link=click_url),
    )

    sent_count = 0
    # Send individually or multicast
    if len(tokens) == 1:
        try:
            msg = messaging.Message(
                token=tokens[0],
                notification=notification,
                data=clean_data,
                android=android_config,
                apns=apns_config,
                webpush=webpush_config,
            )
            messaging.send(msg)
            sent_count += 1
        except Exception as err:
            logger.debug("Failed sending FCM to single token: %s", err)
    else:
        try:
            multicast = messaging.MulticastMessage(
                tokens=tokens[:500],
                notification=notification,
                data=clean_data,
                android=android_config,
                apns=apns_config,
                webpush=webpush_config,
            )
            response = messaging.send_each_for_multicast(multicast)
            sent_count = response.success_count
        except Exception as err:
            logger.debug("Failed sending multicast FCM: %s", err)

    return sent_count


async def send_topic_push(
    topic: str,
    *,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    icon: Optional[str] = None,
) -> bool:
    """Send push notification to a subscribed topic (e.g. 'all_riders_kasganj', 'partners_kasganj')."""
    app = _firebase_app()
    if not app:
        return False

    try:
        from firebase_admin import messaging
    except ImportError:
        return False

    clean_data: Dict[str, str] = {str(k): str(v) for k, v in (data or {}).items() if v is not None}
    click_url = clean_data.get("url") or "/"

    notification = messaging.Notification(title=title, body=body, image=icon)
    msg = messaging.Message(
        topic=topic,
        notification=notification,
        data=clean_data,
        webpush=messaging.WebpushConfig(
            fcm_options=messaging.WebpushFCMOptions(link=click_url)
        ),
    )
    try:
        messaging.send(msg)
        return True
    except Exception as err:
        logger.warning("Failed sending topic push to %s: %s", topic, err)
        return False

