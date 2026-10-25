"""Order Notification Dispatcher — Real-time in-app notifications for QuickPress.

Dispatches notifications across all roles (Customer, Partner, Rider, Admin)
upon order creation and lifecycle status transitions.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.db.client import database
from app.models.notification import CATEGORY_BY_KIND


def category_for(kind: str) -> str:
    return CATEGORY_BY_KIND.get(kind, "order")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _dispatch_external_pushes(
    recipient_id: str,
    *,
    title: str,
    body: str,
    deep_link: str,
    data: Dict[str, Any],
    role: str = "customer",
) -> None:
    """Dispatches OneSignal, FCM, and Native WebPush concurrently without blocking or crashing."""
    if not recipient_id:
        return

    async def _safe_onesignal():
        try:
            from app.core.onesignal import send_onesignal_notification
            await send_onesignal_notification(
                recipient_id,
                title=title,
                body=body,
                data=data,
                url=deep_link,
            )
        except Exception:
            pass

    async def _safe_fcm():
        try:
            from app.core.fcm import send_fcm_push
            await send_fcm_push(
                recipient_id,
                title=title,
                body=body,
                data=data,
                role=role,
            )
        except Exception:
            pass

    async def _safe_webpush():
        try:
            from app.core.webpush import send_native_webpush
            await send_native_webpush(
                recipient_id,
                title=title,
                body=body,
                data=data,
            )
        except Exception:
            pass

    await asyncio.gather(_safe_onesignal(), _safe_fcm(), _safe_webpush(), return_exceptions=True)


async def send_customer_notification(
    user_id: str,
    *,
    kind: str,
    title: str,
    description: str = "",
    order_id: Optional[str] = None,
    order_code: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert an in-app notification and trigger concurrent real FCM push for the customer."""
    if not user_id:
        return {}
    doc = {
        "_id": f"ntf-{uuid.uuid4().hex[:16]}",
        "user_id": str(user_id),
        "role": "customer",
        "kind": kind,
        "category": category_for(kind) if kind else "order",
        "title": title,
        "description": description,
        "created_at": _now_iso(),
        "read": False,
        "read_at": None,
        "order_id": order_id,
        "order_code": order_code,
    }
    await database.collection("notifications").insert_one(doc)

    deep_link = f"/track/{order_id}" if order_id else "/history"
    await _dispatch_external_pushes(
        user_id,
        title=title,
        body=description,
        deep_link=deep_link,
        data={"orderId": str(order_id or ""), "orderCode": str(order_code or ""), "url": deep_link, "kind": kind},
        role="customer",
    )

    return doc


async def send_partner_notification(
    partner_id: str,
    *,
    title: str,
    description: str = "",
    kind: str = "order",
    category: Optional[str] = None,
    order_id: Optional[str] = None,
    order_code: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert an in-app notification and trigger concurrent real FCM push & realtime Socket for the partner."""
    if not partner_id:
        return {}
    now = _now_iso()
    p_str = str(partner_id).strip()
    effective_category = category or ("order" if "order" in kind else "wallet" if "payout" in kind else "system")

    # Resolve linked user_id if this is a partner profile ID
    linked_user_id = ""
    try:
        profile = await database.find_one("partner_profiles", {"$or": [{"_id": p_str}, {"partnerId": p_str}]})
        if profile and profile.get("userId"):
            linked_user_id = str(profile["userId"])
    except Exception:
        pass

    doc = {
        "_id": f"pntf-{uuid.uuid4().hex[:16]}",
        "user_id": p_str,
        "accountId": p_str,
        "partner_id": p_str,
        "partnerId": p_str,
        "linked_user_id": linked_user_id,
        "role": "partner",
        "kind": kind,
        "category": effective_category,
        "title": title,
        "description": description,
        "message": description,
        "created_at": now,
        "createdAt": now,
        "read": False,
        "read_at": None,
        "order_id": order_id,
        "orderId": order_id,
        "order_code": order_code,
        "orderCode": order_code,
    }
    await database.collection("notifications").insert_one(doc)

    # Real-time Socket.IO emission to partner console
    try:
        from app.services.socket_service import sio, EVENT_NOTIFICATION_CREATED
        socket_payload = {
            "id": doc["_id"],
            "title": title,
            "body": description,
            "description": description,
            "message": description,
            "date": now,
            "time": "Just now",
            "read": False,
            "kind": kind,
            "category": effective_category,
            "orderId": order_id,
            "orderCode": order_code,
        }
        await sio.emit(EVENT_NOTIFICATION_CREATED, socket_payload, room=f"partner:{p_str}")
        await sio.emit("notification:created", socket_payload, room=f"partner:{p_str}")
        if p_str.upper().startswith("PRT-"):
            raw_num = p_str[4:]
            await sio.emit(EVENT_NOTIFICATION_CREATED, socket_payload, room=f"partner:{raw_num}")
            await sio.emit("notification:created", socket_payload, room=f"partner:{raw_num}")
        if linked_user_id:
            await sio.emit(EVENT_NOTIFICATION_CREATED, socket_payload, room=f"user:{linked_user_id}")
            await sio.emit("notification:created", socket_payload, room=f"user:{linked_user_id}")
        await sio.emit(EVENT_NOTIFICATION_CREATED, socket_payload, room="partners")
        await sio.emit("notification:created", socket_payload, room="partners")
    except Exception:
        pass

    deep_link = f"/orders/{order_id}" if order_id else "/orders"
    await _dispatch_external_pushes(
        p_str,
        title=title,
        body=description,
        deep_link=deep_link,
        data={"orderId": str(order_id or ""), "orderCode": str(order_code or ""), "url": deep_link, "role": "partner", "kind": kind},
        role="partner",
    )
    if linked_user_id and linked_user_id != p_str:
        await _dispatch_external_pushes(
            linked_user_id,
            title=title,
            body=description,
            deep_link=deep_link,
            data={"orderId": str(order_id or ""), "orderCode": str(order_code or ""), "url": deep_link, "role": "partner", "kind": kind},
            role="partner",
        )

    return doc


async def send_rider_notification(
    rider_id: str,
    *,
    title: str,
    message: str = "",
    order_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert an in-app notification and trigger real FCM push for the assigned rider."""
    if not rider_id:
        return {}
    now = _now_iso()
    time_str = datetime.now(timezone.utc).strftime("%I:%M %p")
    doc = {
        "_id": f"rntf-{uuid.uuid4().hex[:16]}",
        "accountId": str(rider_id),
        "riderId": str(rider_id),
        "title": title,
        "message": message,
        "description": message,
        "date": now,
        "time": time_str,
        "read": False,
        "orderId": order_id,
    }
    await database.collection("rider_notifications").insert_one(doc)
    await database.collection("notifications").insert_one(
        {
            "_id": doc["_id"],
            "user_id": str(rider_id),
            "role": "rider",
            "kind": "rider-assigned",
            "category": "order",
            "title": title,
            "description": message,
            "created_at": now,
            "read": False,
            "order_id": order_id,
        }
    )

    deep_link = f"/deliveries/{order_id}" if order_id else "/deliveries"
    await _dispatch_external_pushes(
        rider_id,
        title=title,
        body=message,
        deep_link=deep_link,
        data={"orderId": str(order_id or ""), "url": deep_link, "role": "rider", "kind": "rider-assigned"},
        role="rider",
    )

    return doc


async def send_admin_notification(
    *,
    title: str,
    description: str = "",
    order_id: Optional[str] = None,
    order_code: Optional[str] = None,
) -> Dict[str, Any]:
    """Insert an admin alert notification."""
    now = _now_iso()
    doc = {
        "_id": f"antf-{uuid.uuid4().hex[:16]}",
        "accountId": "admin",
        "role": "admin",
        "kind": "order",
        "title": title,
        "description": description,
        "createdAt": now,
        "created_at": now,
        "read": False,
        "orderId": order_id,
        "orderCode": order_code,
    }
    await database.collection("admin_notifications").insert_one(doc)
    return doc


async def dispatch_order_created_notifications(order: Dict[str, Any]) -> None:
    """Dispatches notifications across roles concurrently when an order is first placed."""
    try:
        user_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")
        code = str(order.get("code") or order.get("_id") or "")
        order_id = str(order.get("_id") or "")
        totals = order.get("totals") or {}
        grand_total = totals.get("grandTotal") or 0
        customer = order.get("customer") or {}
        customer_name = customer.get("name") or "Customer"
        partner = order.get("partner") or {}
        partner_id = str(partner.get("id") or order.get("partner_id") or order.get("partnerId") or "")
        partner_name = str(partner.get("name") or "Store Partner")

        tasks = []
        # 1. Customer Notification
        if user_id:
            tasks.append(
                send_customer_notification(
                    user_id,
                    kind="order-new",
                    title=f"Order #{code} Placed Successfully",
                    description=f"Your order of ₹{grand_total} has been confirmed. Waiting for {partner_name} to accept.",
                    order_id=order_id,
                    order_code=code,
                )
            )

        # 2. Partner Notification
        if partner_id:
            tasks.append(
                send_partner_notification(
                    partner_id,
                    title=f"New Order #{code} Received!",
                    description=f"New laundry order of ₹{grand_total} from {customer_name}. Please accept or reject.",
                    kind="order-new",
                    order_id=order_id,
                    order_code=code,
                )
            )

        # 3. Admin Notification
        tasks.append(
            send_admin_notification(
                title=f"New Order #{code} Placed",
                description=f"Customer {customer_name} placed order #{code} for ₹{grand_total} with {partner_name}.",
                order_id=order_id,
                order_code=code,
            )
        )

        await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as e:
        # Notifications should never crash the main transaction
        print(f"[Notifications] Error dispatching order created: {e}")


async def dispatch_order_transition_notifications(
    order: Dict[str, Any],
    target: str,
    *,
    actor_id: str = "",
    actor_role: str = "system",
    metadata: Optional[Dict[str, Any]] = None,
    changes: Optional[Dict[str, Any]] = None,
) -> None:
    """Dispatches notifications across roles for order status transitions."""
    try:
        user_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")
        code = str(order.get("code") or order.get("_id") or "")
        order_id = str(order.get("_id") or "")
        partner = order.get("partner") or {}
        partner_id = str(partner.get("id") or order.get("partner_id") or order.get("partnerId") or "")
        partner_name = str(partner.get("name") or "Store Partner")
        customer = order.get("customer") or {}
        customer_name = customer.get("name") or "Customer"
        rider = (changes or {}).get("rider") or order.get("rider") or {}
        rider_id = str(rider.get("id") or "")
        rider_name = str(rider.get("name") or "Delivery Rider")
        otp = order.get("otp") or {}
        pickup_otp = str(otp.get("pickup") or "")
        delivery_otp = str(otp.get("delivery") or "")
        reason = str(
            (changes or {}).get("cancelledReason")
            or (metadata or {}).get("reason")
            or ""
        ).strip()

        # ---------------- PARTNER_ACCEPTED ----------------
        if target == "partner_accepted":
            tasks = []
            if user_id:
                tasks.append(
                    send_customer_notification(
                        user_id,
                        kind="partner-accepted",
                        title=f"Order #{code} Accepted",
                        description=f"{partner_name} has accepted your order and is preparing for pickup.",
                        order_id=order_id,
                        order_code=code,
                    )
                )
            tasks.append(
                send_admin_notification(
                    title=f"Order #{code} Accepted",
                    description=f"{partner_name} accepted order #{code}.",
                    order_id=order_id,
                    order_code=code,
                )
            )
            await asyncio.gather(*tasks, return_exceptions=True)

            # Instantly offload order offer dispatch to background worker queue
            try:
                from app.core.async_queue import async_task_queue
                from app.services.smart_2ride_engine import smart_2ride_engine

                async_task_queue.enqueue(smart_2ride_engine.create_ride_1_pickup, order_id)
            except Exception as dispatch_err:
                print(f"[RiderDispatch] Auto dispatch on partner_accepted error: {dispatch_err}")

        # ---------------- RIDER_ASSIGNED ----------------
        elif target == "rider_assigned":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="rider-assigned",
                    title=f"Rider Assigned for #{code}",
                    description=f"{rider_name} has been assigned to pick up your laundry.",
                    order_id=order_id,
                    order_code=code,
                )
            if rider_id:
                await send_rider_notification(
                    rider_id,
                    title=f"New Pickup Task: #{code}",
                    message=f"You have been assigned to pick up Order #{code} from {customer_name}.",
                    order_id=order_id,
                )
            await send_admin_notification(
                title=f"Rider Assigned for #{code}",
                description=f"{rider_name} assigned to Order #{code}.",
                order_id=order_id,
                order_code=code,
            )

        # ---------------- RIDER_ACCEPTED ----------------
        elif target == "rider_accepted":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="rider-assigned",
                    title=f"Rider on the Way for #{code}",
                    description=f"{rider_name} is arriving for pickup. Pickup OTP: {pickup_otp}.",
                    order_id=order_id,
                    order_code=code,
                )
            if partner_id:
                await send_partner_notification(
                    partner_id,
                    title=f"Rider en route for #{code}",
                    description=f"{rider_name} accepted pickup for #{code}.",
                    order_id=order_id,
                    order_code=code,
                )

        # ---------------- PICKED_UP ----------------
        elif target == "picked_up":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="pickup-completed",
                    title=f"Order #{code} Picked Up",
                    description=f"Your clothes have been picked up by {rider_name} and are on the way to {partner_name}.",
                    order_id=order_id,
                    order_code=code,
                )
            if partner_id:
                await send_partner_notification(
                    partner_id,
                    title=f"Order #{code} Picked Up",
                    description=f"{rider_name} picked up #{code} and is bringing garments to your store.",
                    order_id=order_id,
                    order_code=code,
                )
            await send_admin_notification(
                title=f"Order #{code} Picked Up",
                description=f"{rider_name} completed pickup for Order #{code}.",
                order_id=order_id,
                order_code=code,
            )

        # ---------------- AT_PARTNER ----------------
        elif target == "at_partner":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="processing",
                    title=f"Order #{code} Reached Store",
                    description=f"Your garments have reached {partner_name} store for inspection.",
                    order_id=order_id,
                    order_code=code,
                )
            if partner_id:
                await send_partner_notification(
                    partner_id,
                    title=f"Order #{code} Arrived at Store",
                    description=f"Order #{code} has arrived at store. Please start cleaning.",
                    order_id=order_id,
                    order_code=code,
                )

        # ---------------- PROCESSING ----------------
        elif target == "processing":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="processing",
                    title=f"Order #{code} is being Cleaned",
                    description=f"{partner_name} is actively washing and pressing your garments with care.",
                    order_id=order_id,
                    order_code=code,
                )
            await send_admin_notification(
                title=f"Order #{code} in Processing",
                description=f"{partner_name} started cleaning Order #{code}.",
                order_id=order_id,
                order_code=code,
            )

        # ---------------- COMPLETED (READY) ----------------
        elif target == "completed":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="processing",
                    title=f"Order #{code} is Ready!",
                    description="Your laundry is washed, pressed, packed and ready for delivery.",
                    order_id=order_id,
                    order_code=code,
                )
            await send_admin_notification(
                title=f"Order #{code} Ready",
                description=f"{partner_name} finished processing Order #{code}.",
                order_id=order_id,
                order_code=code,
            )

        # ---------------- OUT_FOR_DELIVERY ----------------
        elif target == "out_for_delivery":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="out-for-delivery",
                    title=f"Order #{code} is Out for Delivery!",
                    description=f"{rider_name} is on the way with your fresh laundry. Share Delivery OTP: {delivery_otp}.",
                    order_id=order_id,
                    order_code=code,
                )
            if partner_id:
                await send_partner_notification(
                    partner_id,
                    title=f"Order #{code} Out for Delivery",
                    description=f"{rider_name} is delivering Order #{code} to {customer_name}.",
                    order_id=order_id,
                    order_code=code,
                )
            await send_admin_notification(
                title=f"Order #{code} Out for Delivery",
                description=f"Order #{code} is out for delivery with {rider_name}.",
                order_id=order_id,
                order_code=code,
            )

        # ---------------- DELIVERED ----------------
        elif target == "delivered":
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="delivered",
                    title=f"Order #{code} Delivered!",
                    description="Your laundry has been successfully delivered. Thank you for choosing QuickPress!",
                    order_id=order_id,
                    order_code=code,
                )
            if partner_id:
                await send_partner_notification(
                    partner_id,
                    title=f"Order #{code} Delivered Successfully",
                    description=f"Order #{code} has been delivered to customer. Store earnings credited.",
                    kind="delivered",
                    order_id=order_id,
                    order_code=code,
                )
            if rider_id:
                await send_rider_notification(
                    rider_id,
                    title=f"Order #{code} Delivered",
                    message=f"Order #{code} delivery completed. Earnings added to your wallet.",
                    order_id=order_id,
                )
            await send_admin_notification(
                title=f"Order #{code} Delivered",
                description=f"Order #{code} was delivered successfully by {rider_name}.",
                order_id=order_id,
                order_code=code,
            )

        # ---------------- CANCELLED ----------------
        elif target == "cancelled":
            cancel_detail = f"Reason: {reason}" if reason else "If amount was deducted, it will be refunded to your wallet."
            if user_id:
                await send_customer_notification(
                    user_id,
                    kind="order-cancelled",
                    title=f"Order #{code} Cancelled",
                    description=f"Your order #{code} has been cancelled. {cancel_detail}",
                    order_id=order_id,
                    order_code=code,
                )
            if partner_id:
                await send_partner_notification(
                    partner_id,
                    title=f"Order #{code} Cancelled",
                    description=f"Order #{code} was cancelled. {reason or ''}",
                    kind="order-cancelled",
                    order_id=order_id,
                    order_code=code,
                )
            if rider_id:
                await send_rider_notification(
                    rider_id,
                    title=f"Order #{code} Cancelled",
                    message=f"Order #{code} delivery task was cancelled.",
                    order_id=order_id,
                )
            await send_admin_notification(
                title=f"Order #{code} Cancelled",
                description=f"Order #{code} was cancelled by {actor_role}. {reason or ''}",
                order_id=order_id,
                order_code=code,
            )
    except Exception as e:
        print(f"[Notifications] Error dispatching order transition ({target}): {e}")


async def push_defect_alert_to_customer(order: Dict[str, Any], defect: Dict[str, Any]) -> None:
    """Sends notification to customer when a pre-wash defect/stain is tagged by store."""
    try:
        user_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")
        code = order.get("code") or order.get("orderCode") or order.get("_id")
        order_id = str(order.get("_id") or order.get("id"))
        item_name = defect.get("item_name") or "garment"
        defect_type = (defect.get("defect_type") or "stain").replace("_", " ").title()

        if user_id:
            await send_customer_notification(
                user_id,
                kind="defect-tagged",
                title=f"⚠️ Pre-wash Notice: Order #{code}",
                description=f"Store noticed a pre-existing {defect_type} on your {item_name}. Please review photo in app.",
                order_id=order_id,
                order_code=code,
                data={"defect_id": defect.get("defect_id"), "type": "defect_tagged"},
            )
    except Exception as e:
        print(f"[Notifications] Error sending defect alert: {e}")
