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


def _get_partner_room_variants(partner_id: str) -> list[str]:
    """Generate both raw and 'PRT-' prefixed room names so socket events are never lost."""
    if not partner_id:
        return []
    p = str(partner_id).strip()
    rooms = {f"partner:{p}"}
    if p.upper().startswith("PRT-"):
        rooms.add(f"partner:{p[4:]}")
    elif p.isalnum():
        rooms.add(f"partner:PRT-{p}")
    return list(rooms)


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
            for r in _get_partner_room_variants(partner_id):
                await sio.enter_room(sid, r)
        if rider_id:
            await sio.enter_room(sid, f"rider:{rider_id}")
            await sio.enter_room(sid, f"rider_{rider_id}")
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
        room_str = str(room).strip()
        await sio.enter_room(sid, room_str)
        if room_str.startswith("partner:"):
            pid = room_str[8:]
            for r in _get_partner_room_variants(pid):
                await sio.enter_room(sid, r)
        elif room_str.startswith("rider:"):
            await sio.enter_room(sid, f"rider_{room_str[6:]}")
        elif room_str.startswith("rider_"):
            await sio.enter_room(sid, f"rider:{room_str[6:]}")


@sio.on("room.join")
async def room_join(sid: str, data: Any) -> None:
    room = data if isinstance(data, str) else (data or {}).get("room")
    if room:
        room_str = str(room).strip()
        await sio.enter_room(sid, room_str)
        if room_str.startswith("partner:"):
            pid = room_str[8:]
            for r in _get_partner_room_variants(pid):
                await sio.enter_room(sid, r)
        elif room_str.startswith("rider:"):
            await sio.enter_room(sid, f"rider_{room_str[6:]}")
        elif room_str.startswith("rider_"):
            await sio.enter_room(sid, f"rider:{room_str[6:]}")


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
    from app.db.client import database
    data = data or {}
    rider_id = data.get("riderId") or data.get("rider_id")
    order_id = data.get("orderId") or data.get("order_id")
    order_code = data.get("orderCode") or data.get("order_code") or data.get("code")
    coords = data.get("coords") or {
        "lat": data.get("lat") or data.get("latitude"),
        "lng": data.get("lng") or data.get("longitude"),
    }
    lat = float(coords.get("lat")) if coords.get("lat") is not None else None
    lng = float(coords.get("lng")) if coords.get("lng") is not None else None
    heading = data.get("heading")
    speed = data.get("speed")
    now_iso = datetime.now(timezone.utc).isoformat()

    # Look up active order document in customer_orders
    active_order = None
    query_clauses = []
    if order_id:
        query_clauses.extend([
            {"_id": str(order_id)},
            {"id": str(order_id)},
            {"orderId": str(order_id)},
            {"orderCode": str(order_id)},
            {"code": str(order_id)},
        ])
    if order_code:
        query_clauses.extend([
            {"orderCode": str(order_code)},
            {"code": str(order_code)},
            {"_id": str(order_code)},
        ])
    
    if query_clauses:
        try:
            active_order = await database.find_one("customer_orders", {"$or": query_clauses})
        except Exception:
            active_order = None

    if not active_order and rider_id:
        try:
            active_order = await database.find_one(
                "customer_orders",
                {
                    "$or": [
                        {"riderId": str(rider_id)},
                        {"rider_id": str(rider_id)},
                        {"assignedRiderId": str(rider_id)},
                        {"rider.id": str(rider_id)},
                        {"rider.riderId": str(rider_id)},
                    ],
                    "status": {
                        "$nin": ["delivered", "cancelled", "completed", "refunded"]
                    },
                },
            )
        except Exception:
            active_order = None

    # Fallback to rides collection if active_order is not in customer_orders
    if not active_order and rider_id:
        try:
            active_ride = await database.find_one(
                "rides",
                {
                    "riderId": str(rider_id),
                    "status": {"$in": ["ACCEPTED", "STARTED", "ARRIVED", "IN_PROGRESS", "PICKED_UP", "OUT_FOR_DELIVERY"]},
                },
            )
            if active_ride and active_ride.get("orderId"):
                order_id = str(active_ride["orderId"])
        except Exception:
            pass

    o_id = str(active_order.get("_id") or active_order.get("id") or order_id or "") if active_order else str(order_id or "")
    o_code = str(active_order.get("orderCode") or active_order.get("code") or order_code or "") if active_order else str(order_code or "")
    c_id = str(active_order.get("userId") or (active_order.get("customer") or {}).get("id") or "") if active_order else ""
    p_id = str((active_order.get("partner") or {}).get("id") or active_order.get("partnerId") or "") if active_order else ""

    payload = {
        "riderId": str(rider_id) if rider_id else None,
        "orderId": o_id or o_code,
        "orderCode": o_code or o_id,
        "id": o_id or o_code,
        "code": o_code or o_id,
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

    # 1. Update customer_orders in database so REST endpoints and page reloads have fresh telemetry
    if active_order and lat is not None and lng is not None:
        try:
            loc_update = {
                "riderLocation": {
                    "lat": lat,
                    "lng": lng,
                    "latitude": lat,
                    "longitude": lng,
                    "heading": heading,
                    "speed": speed,
                    "updatedAt": now_iso,
                },
                "rider.latitude": lat,
                "rider.longitude": lng,
                "rider.location": {"latitude": lat, "longitude": lng},
            }
            await database.update("customer_orders", {"_id": active_order["_id"]}, loc_update)
        except Exception as exc:
            logger.debug("Failed to update rider location in customer_orders: %s", exc)

    # 2. Update rider profile and live locations
    if rider_id and lat is not None and lng is not None:
        try:
            await database.update(
                "rider_profiles",
                {"$or": [{"_id": str(rider_id)}, {"riderId": str(rider_id)}]},
                {"latitude": lat, "longitude": lng, "lat": lat, "lng": lng, "heading": heading, "speed": speed, "lastLocationAt": now_iso},
                upsert=True,
            )
            await database.update(
                "live_locations",
                {"_id": f"rider:{rider_id}"},
                {
                    "kind": "rider",
                    "latitude": lat,
                    "longitude": lng,
                    "heading": heading,
                    "speedKmph": float(speed * 3.6) if speed else 0.0,
                    "status": "online",
                    "updatedAt": now_iso,
                },
                upsert=True,
            )
        except Exception as exc:
            logger.debug("Failed to update rider_profiles / live_locations: %s", exc)

    # 3. Broadcast to all relevant order rooms (by ID and by Code)
    target_rooms = set()
    if o_id:
        target_rooms.add(f"order:{o_id}")
    if o_code:
        target_rooms.add(f"order:{o_code}")
    if c_id:
        target_rooms.add(f"customer:{c_id}")
    if p_id:
        target_rooms.add(f"partner:{p_id}")
    if rider_id:
        target_rooms.add(f"rider:{rider_id}")

    for room_name in target_rooms:
        await sio.emit(EVENT_LOCATION_UPDATED, payload, room=room_name)
        await sio.emit("captain_location_update", payload, room=room_name)
        await sio.emit("rider.location", payload, room=room_name)

    # Broadcast to admin & partner telemetry rooms
    await sio.emit(EVENT_LOCATION_UPDATED, payload, room="admins")
    await sio.emit("captain_location_update", payload, room="admins")
    await sio.emit("rider.location", payload, room="admins")
    await sio.emit(EVENT_LOCATION_UPDATED, payload, room="partners")
    await sio.emit("captain_location_update", payload, room="partners")


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
        await sio.emit("catalog.updated", payload)

        logger.info("Broadcasted partner %s online status: %s (store_open=%s)", partner_id, is_online, store_open)
    except Exception as exc:
        logger.warning("Failed to broadcast partner status for %s: %s", partner_id, exc)


async def notify_partner_status_changed(
    partner_id: str,
    is_online: bool,
    store_open: bool = True,
    accepting: bool = True,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Notify and broadcast partner status change across platform."""
    await broadcast_partner_status(
        partner_id=partner_id,
        is_online=is_online,
        is_store_open=store_open,
        accepting_orders=accepting,
        extra=extra,
    )


async def broadcast_order_event(
    event_name: str,
    order: Dict[str, Any],
    *,
    extra_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Broadcast an order transition to the canonical order room and interested roles."""
    order_id = str(order.get("_id") or order.get("id") or "")
    customer_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")
    partner_id = str(
        (order.get("partner") or {}).get("id")
        or order.get("partnerId")
        or order.get("partner_id")
        or order.get("store_id")
        or (order.get("partner") or {}).get("_id")
        or ""
    ).strip()
    rider_id = str((order.get("rider") or {}).get("id") or order.get("riderId") or "")

    cust = order.get("customer") or {}
    addr = (order.get("pickup") or {}).get("address") or order.get("pickupAddress") or {}
    pricing = order.get("pricing") or {}
    items = order.get("items") or []

    order_summary = {
        "id": order_id,
        "orderId": order_id,
        "code": order.get("code") or order.get("order_code") or order_id,
        "status": order.get("status") or "pending_partner_acceptance",
        "stage": "new" if (order.get("status") or "pending_partner_acceptance") in ("placed", "pending_partner_acceptance", "new", "created") else order.get("status"),
        "amount": float(
            order.get("payableAmount")
            or pricing.get("grandTotal")
            or pricing.get("total")
            or (order.get("totals") or {}).get("grandTotal")
            or (order.get("financialSnapshot") or {}).get("grandTotal")
            or (order.get("pricingSnapshot") or {}).get("grandTotal")
            or order.get("total")
            or order.get("amount")
            or 0.0
        ),
        "customerName": cust.get("name") or order.get("customerName") or "Customer",
        "customerPhone": cust.get("phone") or order.get("customerPhone") or (order.get("address") or {}).get("phone") or "",
        "address": addr.get("formatted") or addr.get("address") or (str(addr) if isinstance(addr, str) else ""),
        "partnerId": partner_id,
        "riderId": rider_id,
        "items": items,
        "itemCount": len(items) if items else (order.get("itemCount") or 1),
        "serviceLabel": (order.get("pickup") or {}).get("serviceLabel") or order.get("serviceLabel") or "Laundry Service",
        "slot": (order.get("pickup") or {}).get("slot") or order.get("slot") or "Today",
        "paymentMode": (order.get("payment") or {}).get("mode") or order.get("paymentMode") or "cod",
        "isExpress": bool(order.get("isExpress") or (order.get("pickup") or {}).get("express")),
        "placedAt": order.get("createdAt") or order.get("created_at"),
    }

    payload = {
        "orderId": order_id,
        "id": order_id,
        "code": order.get("code") or order.get("order_code") or order_id,
        "status": order.get("status") or "pending_partner_acceptance",
        "stage": order_summary["stage"],
        "partnerId": partner_id,
        "amount": order_summary["amount"],
        "customerName": order_summary["customerName"],
        "customerPhone": order_summary["customerPhone"],
        "address": order_summary["address"],
        "items": items,
        "timestamp": order.get("updatedAt") or order.get("createdAt"),
        "order": order_summary,
        **(extra_data or {}),
    }

    # Determine event aliases so any frontend event listener captures the event instantaneously
    events_to_emit = [event_name]
    if event_name in (EVENT_ORDER_CREATED, "order.created", "new_order", "order:created", "ORDER_CREATED"):
        events_to_emit = list(dict.fromkeys([
            event_name,
            "order.created",
            "order:created",
            "new_order",
            "ORDER_CREATED",
            "partner:order_created",
            "order_created",
        ]))

    for ev in events_to_emit:
        # 1. Emit to order specific room
        if order_id:
            await sio.emit(ev, payload, room=f"order:{order_id}")

        # 2. Emit to customer room
        if customer_id:
            await sio.emit(ev, payload, room=f"user:{customer_id}")
            await sio.emit(ev, payload, room=f"customer:{customer_id}")

        # 3. Emit to partner room variants and partners channel
        if partner_id:
            for r in _get_partner_room_variants(partner_id):
                await sio.emit(ev, payload, room=r)
        await sio.emit(ev, payload, room="partners")

        # 4. Emit to assigned rider room and riders channel
        if rider_id:
            await sio.emit(ev, payload, room=f"rider:{rider_id}")
        await sio.emit(ev, payload, room="riders")

        # 5. Emit to admin room
        await sio.emit(ev, payload, room="admins")

    # 6. Publish to RealtimeEventBus for SSE streams and pub/sub workers
    try:
        from app.core.realtime_bus import realtime_bus
        target_rooms = ["admins"]
        if order_id:
            target_rooms.append(f"order:{order_id}")
        if customer_id:
            target_rooms.extend([f"user:{customer_id}", f"customer:{customer_id}"])
        if partner_id:
            target_rooms.append(f"partner:{partner_id}")
        if rider_id:
            target_rooms.append(f"rider:{rider_id}")
        await realtime_bus.broadcast(event_name, payload, target_rooms)
    except Exception as bus_err:
        logger.debug("RealtimeEventBus broadcast error: %s", bus_err)


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
        from app.core.realtime_bus import realtime_bus
        await realtime_bus.broadcast(
            EVENT_WALLET_UPDATED,
            wallet_data,
            [f"user:{user_id}", f"customer:{user_id}"],
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


