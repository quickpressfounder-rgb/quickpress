"""QuickPress Realtime Socket.IO Service — Unified event dispatcher across roles."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import socketio

logger = logging.getLogger(__name__)

# Single AsyncServer instance shared across backend-python
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# Standard QuickPress Socket.IO event names
EVENT_ORDER_CREATED = "order.created"
EVENT_ORDER_ACCEPTED = "order.partner_accepted"
EVENT_ORDER_RIDER_SEARCHING = "order.rider_searching"
EVENT_ORDER_RIDER_OFFER = "order.rider_offer"
EVENT_ORDER_RIDER_ASSIGNED = "order.rider_assigned"
EVENT_ORDER_PICKUP_OTP_PENDING = "order.pickup_otp_pending"
EVENT_ORDER_PICKED_UP = "order.picked_up"
EVENT_ORDER_AT_PARTNER = "order.at_partner"
EVENT_ORDER_PROCESSING = "order.processing"
EVENT_ORDER_READY = "order.ready"
EVENT_ORDER_DISPATCH_OTP_PENDING = "order.dispatch_otp_pending"
EVENT_ORDER_OUT_FOR_DELIVERY = "order.out_for_delivery"
EVENT_ORDER_DELIVERY_OTP_PENDING = "order.delivery_otp_pending"
EVENT_ORDER_DELIVERED = "order.delivered"
EVENT_ORDER_COMPLETED = "order.completed"
EVENT_ORDER_CANCELLED = "order.cancelled"
EVENT_LOCATION_UPDATED = "location.updated"

# Online / Offline and Fleet Lifecycle Events
EVENT_RIDER_STATUS_CHANGED = "rider.status_changed"
EVENT_RIDER_ONLINE_STATUS = "rider.online_status"
EVENT_PARTNER_STATUS_CHANGED = "partner.status_changed"
EVENT_PARTNER_ONLINE_STATUS = "partner.online_status"


@sio.event
async def connect(sid: str, environ: dict, auth: Optional[dict] = None) -> None:
    logger.info("Socket.IO client connected: sid=%s, auth=%s", sid, auth)
    if auth:
        user_id = str(auth.get("userId") or auth.get("id") or "").strip()
        role = str(auth.get("role") or "").lower().strip()
        partner_id = str(auth.get("partnerId") or auth.get("partner_id") or "").strip()
        rider_id = str(auth.get("riderId") or auth.get("rider_id") or "").strip()
        phone = str(auth.get("phone") or "").replace("+", "").strip()

        if user_id:
            await sio.enter_room(sid, f"user:{user_id}")
            await sio.enter_room(sid, f"customer:{user_id}")
        if role:
            await sio.enter_room(sid, f"role:{role}")
            if role == "admin":
                await sio.enter_room(sid, "admins")
            elif role == "partner":
                await sio.enter_room(sid, "partners")
            elif role == "rider":
                await sio.enter_room(sid, "riders")
        if partner_id:
            await sio.enter_room(sid, f"partner:{partner_id}")
        if rider_id:
            await sio.enter_room(sid, f"rider:{rider_id}")
        if phone:
            await sio.enter_room(sid, f"phone:{phone}")


@sio.event
async def disconnect(sid: str) -> None:
    logger.info("Socket.IO client disconnected: sid=%s", sid)


@sio.event
async def join(sid: str, data: Any) -> None:
    """Generic join room handler supporting string or dictionary payloads."""
    room = data if isinstance(data, str) else (data or {}).get("room")
    if room:
        await sio.enter_room(sid, str(room))


@sio.on("room.join")
async def room_join(sid: str, data: Any) -> None:
    room = data if isinstance(data, str) else (data or {}).get("room")
    if room:
        await sio.enter_room(sid, str(room))


@sio.event
async def leave(sid: str, data: Any) -> None:
    room = data if isinstance(data, str) else (data or {}).get("room")
    if room:
        await sio.leave_room(sid, str(room))


@sio.on("room.leave")
async def room_leave(sid: str, data: Any) -> None:
    room = data if isinstance(data, str) else (data or {}).get("room")
    if room:
        await sio.leave_room(sid, str(room))


@sio.event
async def join_order(sid: str, data: dict) -> None:
    order_id = (data or {}).get("orderId") or (data or {}).get("id")
    if order_id:
        await sio.enter_room(sid, f"order:{order_id}")


@sio.event
async def leave_order(sid: str, data: dict) -> None:
    order_id = (data or {}).get("orderId") or (data or {}).get("id")
    if order_id:
        await sio.leave_room(sid, f"order:{order_id}")


@sio.event
async def update_location(sid: str, data: dict) -> None:
    await _handle_location_update(sid, data)


@sio.on("captain_location_update")
async def captain_location_update(sid: str, data: dict) -> None:
    await _handle_location_update(sid, data)


@sio.on("location.update")
async def location_update(sid: str, data: dict) -> None:
    await _handle_location_update(sid, data)


async def _handle_location_update(sid: str, data: dict) -> None:
    from datetime import datetime, timezone
    data = data or {}
    rider_id = data.get("riderId")
    order_id = data.get("orderId")
    coords = data.get("coords") or {
        "lat": data.get("lat") or data.get("latitude"),
        "lng": data.get("lng") or data.get("longitude"),
    }
    lat = float(coords.get("lat")) if coords.get("lat") is not None else None
    lng = float(coords.get("lng")) if coords.get("lng") is not None else None
    heading = data.get("heading")
    speed = data.get("speed")
    now_iso = datetime.now(timezone.utc).isoformat()

    payload = {
        "riderId": rider_id,
        "orderId": order_id,
        "coords": {"lat": lat, "lng": lng},
        "lat": lat,
        "lng": lng,
        "latitude": lat,
        "longitude": lng,
        "heading": heading,
        "speed": speed,
        "at": now_iso,
        "updatedAt": now_iso,
    }

    # If order_id not explicitly given, try to find active ride for this rider
    if not order_id and rider_id:
        try:
            from app.db.client import database
            active_ride = await database.find_one(
                "rides",
                {"riderId": str(rider_id), "status": {"$in": ["ACCEPTED", "STARTED", "ARRIVED", "IN_PROGRESS", "PICKED_UP", "OUT_FOR_DELIVERY"]}}
            )
            if active_ride and active_ride.get("orderId"):
                order_id = active_ride["orderId"]
                payload["orderId"] = order_id
        except Exception:
            pass

    if order_id:
        await sio.emit(EVENT_LOCATION_UPDATED, payload, room=f"order:{order_id}")
        await sio.emit("captain_location_update", payload, room=f"order:{order_id}")

    if rider_id:
        await sio.emit(EVENT_LOCATION_UPDATED, payload, room=f"rider:{rider_id}")
        await sio.emit("captain_location_update", payload, room=f"rider:{rider_id}")

    # Also broadcast to admins telemetry room
    await sio.emit(EVENT_LOCATION_UPDATED, payload, room="admins")
    await sio.emit("captain_location_update", payload, room="admins")

    # Update database location asynchronously
    if rider_id and lat is not None and lng is not None:
        try:
            from app.db.client import database
            await database.collection("rider_profiles").update_one(
                {"_id": str(rider_id)},
                {"$set": {"latitude": lat, "longitude": lng, "lastLocationAt": now_iso}},
            )
        except Exception:
            pass


async def broadcast_rider_status(
    rider_id: str,
    is_online: bool,
    *,
    status: str = "online",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    last_active_at: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Broadcast real-time rider status transition across the entire platform."""
    from datetime import datetime, timezone
    now_iso = last_active_at or datetime.now(timezone.utc).isoformat()
    payload = {
        "riderId": str(rider_id),
        "id": str(rider_id),
        "isOnline": bool(is_online),
        "status": "online" if is_online else "offline",
        "liveState": "Online" if is_online else "Offline",
        "lat": lat,
        "lng": lng,
        "latitude": lat,
        "longitude": lng,
        "lastActiveAt": now_iso,
        "updatedAt": now_iso,
        **(extra or {}),
    }

    try:
        # 1. Emit to Admins (Fleet dashboard + live map)
        await sio.emit(EVENT_RIDER_STATUS_CHANGED, payload, room="admins")
        await sio.emit(EVENT_RIDER_ONLINE_STATUS, payload, room="admins")

        # 2. Emit to Riders channel and Rider's own room
        await sio.emit(EVENT_RIDER_STATUS_CHANGED, payload, room=f"rider:{rider_id}")
        await sio.emit(EVENT_RIDER_ONLINE_STATUS, payload, room=f"rider:{rider_id}")
        await sio.emit(EVENT_RIDER_STATUS_CHANGED, payload, room="riders")

        # 3. Emit globally for live maps and customer tracking
        await sio.emit(EVENT_RIDER_STATUS_CHANGED, payload)

        logger.info("Broadcasted rider %s online status: %s", rider_id, is_online)
    except Exception as exc:
        logger.warning("Failed to broadcast rider status for %s: %s", rider_id, exc)


async def broadcast_partner_status(
    partner_id: str,
    is_online: bool,
    *,
    is_store_open: Optional[bool] = None,
    accepting_orders: Optional[bool] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Broadcast real-time partner store status transition across the entire platform."""
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    store_open = is_online if is_store_open is None else bool(is_store_open)
    accepting = is_online if accepting_orders is None else bool(accepting_orders)

    payload = {
        "partnerId": str(partner_id),
        "id": str(partner_id),
        "isOnline": bool(is_online),
        "isStoreOpen": store_open,
        "isOpen": store_open,
        "acceptingNewOrders": accepting,
        "status": "open" if store_open else "closed",
        "updatedAt": now_iso,
        **(extra or {}),
    }

    try:
        # 1. Emit to Admins (Partner directory + live map + KPIs)
        await sio.emit(EVENT_PARTNER_STATUS_CHANGED, payload, room="admins")
        await sio.emit(EVENT_PARTNER_ONLINE_STATUS, payload, room="admins")

        # 2. Emit to Partner's room and Partners channel
        await sio.emit(EVENT_PARTNER_STATUS_CHANGED, payload, room=f"partner:{partner_id}")
        await sio.emit(EVENT_PARTNER_ONLINE_STATUS, payload, room=f"partner:{partner_id}")
        await sio.emit(EVENT_PARTNER_STATUS_CHANGED, payload, room="partners")

        # 3. Emit publicly so customer app store views update live
        await sio.emit(EVENT_PARTNER_STATUS_CHANGED, payload)

        logger.info("Broadcasted partner %s online status: %s (store_open=%s)", partner_id, is_online, store_open)
    except Exception as exc:
        logger.warning("Failed to broadcast partner status for %s: %s", partner_id, exc)


async def broadcast_order_event(
    event_name: str,
    order: Dict[str, Any],
    *,
    extra_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Broadcast an order transition to the canonical order room and interested roles."""
    order_id = str(order.get("_id") or order.get("id") or "")
    customer_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")
    partner_id = str((order.get("partner") or {}).get("id") or order.get("partnerId") or "")
    rider_id = str((order.get("rider") or {}).get("id") or order.get("riderId") or "")

    payload = {
        "orderId": order_id,
        "code": order.get("code") or order.get("order_code") or order_id,
        "status": order.get("status"),
        "timestamp": order.get("updatedAt"),
        **(extra_data or {}),
    }

    # 1. Emit to order specific room
    if order_id:
        await sio.emit(event_name, payload, room=f"order:{order_id}")

    # 2. Emit to customer room
    if customer_id:
        await sio.emit(event_name, payload, room=f"user:{customer_id}")
        await sio.emit(event_name, payload, room=f"customer:{customer_id}")

    # 3. Emit to partner room
    if partner_id:
        await sio.emit(event_name, payload, room=f"partner:{partner_id}")

    # 4. Emit to assigned rider room
    if rider_id:
        await sio.emit(event_name, payload, room=f"rider:{rider_id}")

    # 5. Emit to admin room
    await sio.emit(event_name, payload, room="admins")


EVENT_WALLET_UPDATED = "wallet.updated"


async def broadcast_wallet_event(
    user_id: str,
    wallet_data: Dict[str, Any],
) -> None:
    """Notify the user's connected clients about their new wallet balance in real-time."""
    if not user_id:
        return
    try:
        await sio.emit(
            EVENT_WALLET_UPDATED,
            wallet_data,
            room=f"user:{user_id}",
        )
        await sio.emit(
            EVENT_WALLET_UPDATED,
            wallet_data,
            room=f"customer:{user_id}",
        )
    except Exception as exc:
        logger.warning("Failed to broadcast wallet event to user %s: %s", user_id, exc)


EVENT_ADMIN_BROADCAST = "admin_broadcast"
EVENT_NOTIFICATION_CREATED = "notification_created"


async def broadcast_admin_notification_event(
    title: str,
    message: str,
    audience: str = "All",
    action_url: Optional[str] = None,
    image_url: Optional[str] = None,
) -> None:
    """Broadcast an administrative or promotional notification to all connected clients."""
    from datetime import datetime, timezone

    payload = {
        "title": title,
        "message": message,
        "description": message,
        "audience": audience,
        "actionUrl": action_url,
        "imageUrl": image_url,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await sio.emit(EVENT_ADMIN_BROADCAST, payload)
        await sio.emit(EVENT_NOTIFICATION_CREATED, payload)
        logger.info("Admin notification broadcasted to all active sockets: %s", title)
    except Exception as exc:
        logger.warning("Failed to broadcast admin notification: %s", exc)


EVENT_RIDER_LOCATION = "rider.location"


async def broadcast_rider_location(
    rider_id: str,
    latitude: float,
    longitude: float,
    heading: Optional[float] = None,
    speed_kmph: Optional[float] = None,
    order_id: Optional[str] = None,
    eta_mins: Optional[int] = None,
) -> None:
    """Broadcasts real-time rider location coordinates to active customer tracking map & admin fleet monitor."""
    from datetime import datetime, timezone
    payload = {
        "riderId": rider_id,
        "lat": latitude,
        "latitude": latitude,
        "lng": longitude,
        "longitude": longitude,
        "heading": heading or 0.0,
        "speedKmph": speed_kmph or 0.0,
        "orderId": order_id,
        "etaMinutes": eta_mins,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        # Broadcast to specific order room so customer live map receives it
        if order_id:
            await sio.emit(EVENT_RIDER_LOCATION, payload, room=f"order:{order_id}")
        # Broadcast to admins and fleet monitor
        await sio.emit(EVENT_RIDER_LOCATION, payload, room="admins")
        await sio.emit(EVENT_LOCATION_UPDATED, payload, room="admins")
    except Exception as exc:
        logger.warning("Failed to broadcast rider location: %s", exc)


@sio.on("rider.location_push")
async def handle_rider_location_push(sid: str, data: Any) -> None:
    """Socket.IO handler for real-time rider GPS fixes from Android APK / web."""
    if not isinstance(data, dict):
        return
    r_id = str(data.get("riderId") or "").strip()
    lat = data.get("lat") or data.get("latitude")
    lng = data.get("lng") or data.get("longitude")
    if not (r_id and lat is not None and lng is not None):
        return

    order_id = data.get("orderId")
    heading = float(data.get("heading", 0.0) or 0.0)
    speed = float(data.get("speedKmph", 0.0) or 0.0)

    # Broadcast immediately
    await broadcast_rider_location(
        rider_id=r_id,
        latitude=float(lat),
        longitude=float(lng),
        heading=heading,
        speed_kmph=speed,
        order_id=order_id,
    )


