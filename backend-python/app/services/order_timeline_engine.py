"""Order Timeline & SLA Auto-Cancellation Engine.

Enforces strict platform SLA guarantees:
1. Partner Acceptance SLA (5 minutes / 300s):
   - Orders placed must be accepted by the assigned partner store within 5 minutes.
   - If 5 minutes elapse without acceptance, the order is automatically cancelled,
     refunded, and real-time alerts are broadcasted to all parties.

2. Rider Acceptance SLA (2 minutes / 120s):
   - Once the partner accepts, a nearby delivery captain must accept the pickup ride
     within 2 minutes.
   - If 2 minutes elapse without rider acceptance, the ride search terminates, the rider
     assignment is cancelled, the order is automatically cancelled and refunded, with instant notifications sent.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database
from app.services import order_lifecycle as lifecycle
from app.services.socket_service import (
    EVENT_ORDER_CANCELLED,
    broadcast_order_event,
    sio,
)

logger = logging.getLogger(__name__)


def _parse_iso_utc(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        clean = str(ts).replace("Z", "+00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return None


class OrderTimelineEngine:
    def __init__(self) -> None:
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    def start(self, interval_seconds: int = 5) -> None:
        """Start the background SLA heartbeat worker."""
        if self._running and self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._ticker_loop(interval_seconds))
        logger.info("⏱️ Order Timeline SLA Engine background ticker started (interval=%ds)", interval_seconds)

    def stop(self) -> None:
        """Stop the background SLA worker."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("⏱️ Order Timeline SLA Engine background ticker stopped")

    async def _ticker_loop(self, interval_seconds: int) -> None:
        """Periodic loop checking and expiring breached order SLAs."""
        while self._running:
            try:
                await self.check_and_expire_sla_timeouts()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Error in Order Timeline SLA Engine loop: %s", exc, exc_info=True)
            await asyncio.sleep(interval_seconds)

    async def tick(self) -> Dict[str, List[str]]:
        """Alias for check_and_expire_sla_timeouts."""
        return await self.check_and_expire_sla_timeouts()

    async def _process_auto_refund(self, order: Dict[str, Any], reason: str) -> None:
        """Process automatic wallet/online refund when an order is cancelled by SLA timeout."""
        try:
            user_id = str(
                order.get("userId")
                or order.get("customerId")
                or (order.get("customer") or {}).get("id")
                or ""
            )
            if not user_id:
                return

            payment = order.get("payment") or {}
            is_paid = bool(payment.get("paid") or payment.get("status") in ("paid", "completed", "success"))
            pay_mode = str(payment.get("mode") or payment.get("method") or "").lower()
            totals = order.get("totals") or order.get("pricing") or {}
            grand_total = float(totals.get("grandTotal") or totals.get("total") or totals.get("payable") or 0.0)

            if grand_total <= 0:
                return

            order_code = order.get("code") or lifecycle.order_id_of(order)

            # 1. Wallet or Online Refund
            if is_paid or pay_mode in ("wallet", "online", "upi", "card"):
                from app.db.repositories import users
                user = await users.by_id(user_id)
                if user:
                    from app.db.wallet_repositories import wallet_repository
                    await wallet_repository.credit(
                        user,
                        grand_total,
                        kind="refund",
                        title="Order SLA Auto-Refund",
                        description=f"Auto-refund for cancelled Order #{order_code} ({reason})",
                        method="refund",
                        reference=f"ord-{order_code}",
                    )
                    logger.info("Auto-refunded ₹%.2f to wallet for user %s on Order #%s", grand_total, user_id, order_code)
                else:
                    # Also try updating customer_wallets directly if standard user doc not found in test harness
                    cust_wallet = await database.find_one("customer_wallets", {"customerId": user_id})
                    if cust_wallet:
                        new_bal = float(cust_wallet.get("balance", 0.0)) + grand_total
                        await database.update_one(
                            "customer_wallets",
                            {"customerId": user_id},
                            {
                                "$set": {
                                    "balance": new_bal,
                                    "updatedAt": lifecycle.now_iso(),
                                },
                                "$push": {
                                    "transactions": {
                                        "type": "credit",
                                        "amount": grand_total,
                                        "title": "Order SLA Auto-Refund",
                                        "reference": f"ord-{order_code}",
                                        "timestamp": lifecycle.now_iso(),
                                    }
                                }
                            }
                        )
                        logger.info("Direct credited ₹%.2f to customer_wallets for %s", grand_total, user_id)

            # 2. Update order payment status
            await database.collection(lifecycle.ORDERS).update_one(
                {"_id": order["_id"]},
                {
                    "$set": {
                        "paymentStatus": "refunded",
                        "payment.status": "refunded",
                        "payment.refundStatus": "refunded",
                        "refundAmount": grand_total,
                        "refundDate": lifecycle.now_iso(),
                        "refundReason": reason,
                    }
                },
            )
        except Exception as exc:
            logger.warning("Failed to process auto-refund for order %s: %s", order.get("code"), exc)

    async def check_and_expire_sla_timeouts(self) -> Dict[str, List[str]]:
        """Scan active orders and trigger auto-cancellations for breached SLAs."""
        async with self._lock:
            now = datetime.now(timezone.utc)
            expired_partner_orders: List[str] = []
            expired_rider_orders: List[str] = []

            # =========================================================================
            # SLA RULE 1: Partner Acceptance Timeout (5 Minutes / 300 Seconds)
            # =========================================================================
            pending_partner_orders = await database.find_many(
                lifecycle.ORDERS,
                {
                    "status": {
                        "$in": [
                            lifecycle.PLACED,
                            lifecycle.PENDING,
                            "new",
                            "ORDER_CREATED",
                            "order_created",
                        ]
                    }
                },
            )

            for order in (pending_partner_orders or []):
                order_id = lifecycle.order_id_of(order)
                created_dt = _parse_iso_utc(order.get("placedAt") or order.get("createdAt"))
                if not created_dt:
                    continue

                age_seconds = (now - created_dt).total_seconds()
                if age_seconds >= lifecycle.PARTNER_ACCEPT_SLA_SECONDS:
                    logger.warning(
                        "⏰ Partner SLA BREACHED for Order %s (age=%.1fs >= %ds). Executing auto-cancellation.",
                        order_id,
                        age_seconds,
                        lifecycle.PARTNER_ACCEPT_SLA_SECONDS,
                    )
                    try:
                        reason = "Auto-cancelled: Store did not accept order within 5 minutes SLA"
                        updated = await lifecycle.transition(
                            order_id,
                            lifecycle.CANCELLED,
                            actor_id="system-sla-engine",
                            actor_role="system",
                            metadata={
                                "reason": reason,
                                "sla": "partner_acceptance",
                                "timeoutSeconds": lifecycle.PARTNER_ACCEPT_SLA_SECONDS,
                                "elapsedSeconds": int(age_seconds),
                            },
                            changes={
                                "cancelledReason": reason,
                                "cancellationReason": reason,
                                "cancelledBy": "system",
                                "autoCancelled": True,
                                "slaBreached": "partner_acceptance",
                                "refundInitiated": True,
                            },
                        )

                        await self._process_auto_refund(updated, "Store did not accept in 5 min")
                        expired_partner_orders.append(order_id)

                        # Broadcast cancellation event via Socket.IO
                        await broadcast_order_event(
                            EVENT_ORDER_CANCELLED,
                            updated,
                            extra_data={
                                "reason": reason,
                                "slaBreached": "partner_acceptance",
                                "autoCancelled": True,
                            },
                        )

                        # Emit specific partner expiration notice
                        partner_id = str(
                            (updated.get("partner") or {}).get("id")
                            or updated.get("partnerId")
                            or ""
                        )
                        if partner_id:
                            await sio.emit(
                                "partner.order_expired",
                                {
                                    "orderId": order_id,
                                    "orderCode": updated.get("code"),
                                    "reason": "5-Minute Acceptance SLA Expired",
                                },
                                room=f"partner:{partner_id}",
                            )
                    except Exception as exc:
                        logger.error("Failed to auto-cancel order %s on partner SLA: %s", order_id, exc)

            # =========================================================================
            # SLA RULE 2: Rider Acceptance Timeout (2 Minutes / 120 Seconds)
            # =========================================================================
            pending_rider_orders = await database.find_many(
                lifecycle.ORDERS,
                {
                    "status": {
                        "$in": [
                            lifecycle.PARTNER_ACCEPTED,
                            lifecycle.RIDER_SEARCHING,
                            lifecycle.PICKUP_RIDER_ASSIGNED,
                            lifecycle.RIDER_ASSIGNED,
                        ]
                    }
                },
            )

            for order in (pending_rider_orders or []):
                order_id = lifecycle.order_id_of(order)
                st = lifecycle.order_status(order)

                # Skip if a rider has already claimed/accepted the pickup
                r_info = order.get("rider")
                if isinstance(r_info, dict) and r_info.get("id") and st in (
                    lifecycle.PICKUP_RIDER_ACCEPTED,
                    lifecycle.RIDER_ACCEPTED,
                    lifecycle.PICKUP_OTP_PENDING,
                    lifecycle.PICKED_UP,
                    lifecycle.AT_PARTNER,
                ):
                    continue

                accepted_dt = _parse_iso_utc(
                    order.get("partnerAcceptedAt")
                    or order.get("riderDispatchStartedAt")
                    or order.get("updatedAt")
                )
                if not accepted_dt:
                    continue

                age_seconds = (now - accepted_dt).total_seconds()
                # Continuous dispatch heartbeat: re-broadcast to online captains every 15s so offers never go stale
                if int(age_seconds) % 15 == 0 or age_seconds < 60:
                    try:
                        from app.services.smart_2ride_engine import smart_2ride_engine
                        ride = await database.find_one("rides", {"orderId": order_id, "status": {"$in": ["SEARCHING_RIDER", "OFFER_SENT", "NO_RIDER_FOUND"]}})
                        if ride:
                            await database.collection("rides").update_one(
                                {"_id": ride["_id"]},
                                {"$set": {"status": "SEARCHING_RIDER", "attemptedRiderIds": []}},
                            )
                            asyncio.create_task(smart_2ride_engine.dispatch_next_offer(ride["_id"]))
                    except Exception:
                        pass

                if age_seconds < lifecycle.RIDER_ACCEPT_SLA_SECONDS:
                    continue

                logger.warning(
                    "⏰ Rider SLA limit reached for Order %s (age=%.1fs >= %ds).",
                    order_id,
                    age_seconds,
                    lifecycle.RIDER_ACCEPT_SLA_SECONDS,
                )
                try:
                    sla_mins = max(1, lifecycle.RIDER_ACCEPT_SLA_SECONDS // 60)
                    reason = f"Auto-cancelled: Delivery captain did not accept within {sla_mins} minutes SLA"

                    # 1. Terminate pending rides in rides collection
                    await database.collection("rides").update_many(
                        {
                            "orderId": order_id,
                            "status": {
                                "$in": [
                                    "SEARCHING_RIDER",
                                    "OFFER_SENT",
                                    "ASSIGNED",
                                    "searching",
                                    "searching_rider",
                                    "assigned",
                                    "pending",
                                    "created",
                                ]
                            },
                        },
                        {
                            "$set": {
                                "status": "cancelled",
                                "cancellationReason": reason,
                                "updatedAt": lifecycle.now_iso(),
                            }
                        },
                    )

                    # 2. Cancel pending rider offers
                    await database.collection("rider_offers").update_many(
                        {"orderId": order_id, "status": "pending"},
                        {"$set": {"status": "expired", "updatedAt": lifecycle.now_iso()}},
                    )

                    # 3. Transition order to CANCELLED and unassign rider
                    updated = await lifecycle.transition(
                        order_id,
                        lifecycle.CANCELLED,
                        actor_id="system-sla-engine",
                        actor_role="system",
                        metadata={
                            "reason": reason,
                            "sla": "rider_acceptance",
                            "timeoutSeconds": lifecycle.RIDER_ACCEPT_SLA_SECONDS,
                            "elapsedSeconds": int(age_seconds),
                        },
                        changes={
                            "cancelledReason": reason,
                            "cancellationReason": reason,
                            "cancelledBy": "system",
                            "autoCancelled": True,
                            "slaBreached": "rider_acceptance",
                            "refundInitiated": True,
                            "rider": None,
                            "assignedRiderId": None,
                        },
                    )

                    await self._process_auto_refund(updated, f"No delivery captain in {sla_mins} min")
                    expired_rider_orders.append(order_id)

                    # Broadcast cancellation event via Socket.IO
                    await broadcast_order_event(
                        EVENT_ORDER_CANCELLED,
                        updated,
                        extra_data={
                            "reason": reason,
                            "slaBreached": "rider_acceptance",
                            "autoCancelled": True,
                        },
                    )

                    # Notify riders channel that ride is cancelled
                    await sio.emit(
                        "rider.ride_cancelled",
                        {"orderId": order_id, "reason": f"{sla_mins}-Minute Rider SLA Expired"},
                        room="riders",
                    )
                except Exception as exc:
                    logger.error("Failed to auto-cancel order %s on rider SLA: %s", order_id, exc)

            return {
                "expiredPartnerOrders": expired_partner_orders,
                "expiredRiderOrders": expired_rider_orders,
            }


order_timeline_engine = OrderTimelineEngine()
