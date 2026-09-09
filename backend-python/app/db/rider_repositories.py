"""Rider repositories — Sprint 5.2 (Rider MongoDB integration).

Collections
    rider_profiles              one document per rider (profile + online state)
    rider_deliveries             the rider's view of orders (pickup/delivery tasks)
    rider_earnings               per-day earnings ledger used to compute totals
    rider_wallets                one wallet document per rider
    rider_wallet_transactions    wallet ledger entries
    rider_notifications          the rider's notification feed
    rider_analytics              per-day delivery/earnings analytics
    rider_settings               online/vehicle/notification preferences

Every reader falls back to the seeded demo rider (`rider-demo-1`) so the
preview app is never blank even before a real rider signs in.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.services import order_lifecycle as lifecycle

PROFILES = "rider_profiles"
DELIVERIES = "rider_deliveries"
EARNINGS = "rider_earnings"
WALLETS = "rider_wallets"
WALLET_TXNS = "rider_wallet_transactions"
NOTIFICATIONS = "rider_notifications"
ANALYTICS = "rider_analytics"
SETTINGS = "rider_settings"

STATUS_LABEL = {
    "assigned": "Assigned",
    "accepted": "Accepted",
    "picked": "Picked up from customer",
    "at-partner": "Dropped at store",
    "ready-for-delivery": "Laundry completed",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    "failed": "Failed",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _public(document: Dict[str, Any], drop: tuple = ("_id",)) -> Dict[str, Any]:
    return {k: v for k, v in document.items() if k not in drop}


class RiderAccessError(Exception):
    """The signed-in account may not act as a rider."""


class RiderProfileRepository:
    async def get(self, rider_id: str) -> Optional[Dict[str, Any]]:
        return await database.find_one(PROFILES, {"_id": rider_id})

    async def resolve_rider_id(self, user) -> str:
        """The rider id for the signed-in account — no demo fallback.

        Deliveries are attached to this id on the canonical order, so an
        account that is not a linked rider gets a 403 instead of someone
        else's work queue.
        """
        role = getattr(user, "role", None)
        role_value = str(getattr(role, "value", role) or "")
        if role_value != "rider":
            raise RiderAccessError("This account is not a rider account")
        account = await database.find_one("riders", {"user_id": getattr(user, "id", "")}) or {}
        rider_id = account.get("rider_id") or account.get("riderId")
        if not rider_id:
            # A rider profile may already exist under the account id itself.
            candidate = getattr(user, "id", "")
            if candidate and await self.get(candidate) is not None:
                rider_id = candidate
        if not rider_id:
            profile = await database.find_one(PROFILES, {"userId": getattr(user, "id", "")})
            if profile:
                rider_id = profile.get("_id")
        if not rider_id:
            phone = getattr(user, "phone", "")
            if phone:
                clean_phone = phone.replace("+91", "").strip()
                profile = await database.find_one(
                    PROFILES,
                    {"$or": [{"phone": phone}, {"phone": clean_phone}, {"mobile": phone}, {"mobile": clean_phone}]},
                )
                if profile:
                    rider_id = profile.get("_id")
        if not rider_id:
            linked = getattr(user, "linked_id", None)
            if linked:
                rider_id = linked
        if not rider_id:
            rider_id = getattr(user, "id", "")
        return str(rider_id)

    async def link_account(self, user_id: str, rider_id: str) -> None:
        await database.update("riders", {"user_id": user_id}, {"rider_id": rider_id}, upsert=True)

    async def update(self, rider_id: str, changes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return await database.update(PROFILES, {"_id": rider_id}, changes)

    async def set_online(self, rider_id: str, is_online: Optional[bool]) -> Dict[str, Any]:
        from datetime import datetime, timezone
        from app.services.socket_service import broadcast_rider_status

        profile = await self.get(rider_id) or {}
        current = bool(profile.get("isOnline", False))
        next_value = bool(is_online) if is_online is not None else (not current)
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Update rider_profiles (Primary DB document)
        profile_patch: Dict[str, Any] = {
            "isOnline": next_value,
            "status": "active" if next_value else "offline",
            "lastActiveAt": now_iso,
            "updatedAt": now_iso,
        }
        if next_value:
            profile_patch["lastOnlineAt"] = now_iso
        await database.update(PROFILES, {"_id": rider_id}, profile_patch, upsert=True)

        # 2. Update riders collection (Legacy / multi-query sync)
        await database.update(
            "riders",
            {"$or": [{"_id": rider_id}, {"id": rider_id}, {"rider_id": rider_id}]},
            {
                "is_available": next_value,
                "isOnline": next_value,
                "status": "active" if next_value else "offline",
                "updated_at": now_iso,
            },
            upsert=True,
        )

        # 3. Update rider_settings
        await database.update(SETTINGS, {"_id": rider_id}, {"isOnline": next_value, "updatedAt": now_iso}, upsert=True)

        # 4. Update live_locations (For Admin Live Map Telemetry)
        r_name = profile.get("fullName") or profile.get("name") or rider_id
        r_lat = profile.get("lat") or profile.get("latitude")
        r_lng = profile.get("lng") or profile.get("longitude")
        await database.update(
            "live_locations",
            {"_id": f"rider:{rider_id}"},
            {
                "kind": "rider",
                "label": r_name,
                "isOnline": next_value,
                "status": "online" if next_value else "offline",
                "latitude": float(r_lat) if r_lat is not None else 27.8118,
                "longitude": float(r_lng) if r_lng is not None else 78.6477,
                "updatedAt": now_iso,
            },
            upsert=True,
        )

        # 5. Broadcast real-time event to Admin, Rider, and Global rooms
        await broadcast_rider_status(
            rider_id=rider_id,
            is_online=next_value,
            status="online" if next_value else "offline",
            lat=float(r_lat) if r_lat is not None else None,
            lng=float(r_lng) if r_lng is not None else None,
            last_active_at=now_iso,
        )

        return {
            "ok": True,
            "isOnline": next_value,
            "status": "online" if next_value else "offline",
            "lastActiveAt": now_iso,
        }


class RiderSettingsRepository:
    async def get(self, rider_id: str) -> Dict[str, Any]:
        settings = await database.find_one(SETTINGS, {"_id": rider_id})
        profile = await database.find_one(PROFILES, {"_id": rider_id}) or {}
        if settings is None:
            return {
                "isOnline": bool(profile.get("isOnline", False)),
                "vehicle": profile.get("vehicleType", ""),
                "plate": profile.get("vehicleNumber", ""),
                "notificationsEnabled": True,
            }
        return _public(settings)

    async def update(self, rider_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        await database.update(SETTINGS, {"_id": rider_id}, changes, upsert=True)
        return await self.get(rider_id)


class RiderDeliveryRepository:
    """The rider's view of the ONE canonical order (customer_orders).

    Tasks are not a separate record: they are the same order document the
    customer, partner and admin see, projected into the rider vocabulary and
    mutated only through the shared lifecycle service.
    """

    async def _orders_for(self, rider_id: str) -> List[Dict[str, Any]]:
        # 1. Orders already assigned or claimed by this rider in customer_orders
        all_orders = await database.find_many(lifecycle.ORDERS, {})
        assigned_docs = [
            d
            for d in all_orders
            if (d.get("rider") or {}).get("id") == rider_id
            or d.get("riderId") == rider_id
            or d.get("rider_id") == rider_id
            or d.get("assignedRiderId") == rider_id
            or (d.get("originalRiderId") == rider_id and not d.get("riderDeliveryOptOut"))
            or (d.get("reassignment") and (d.get("reassignment", {}).get("assignedTransferRiderId") == rider_id or (d.get("reassignment", {}).get("originalRiderId") == rider_id and not d.get("riderDeliveryOptOut"))))
        ]
        assigned_ids = {str(d.get("_id") or "") for d in assigned_docs}

        # Also check rides assigned to this rider in rides collection
        try:
            assigned_rides = await database.find_many("rides", {"$or": [{"riderId": rider_id}, {"assignedRiderId": rider_id}]})
            for ar in (assigned_rides or []):
                roid = ar.get("orderId")
                if roid and roid not in assigned_ids:
                    ord_doc = await lifecycle.find_order(roid)
                    if ord_doc:
                        assigned_docs.append(ord_doc)
                        assigned_ids.add(roid)
        except Exception:
            pass

        # 2. Pending trip offers dispatched to this rider in rider_offers
        now_iso = lifecycle.now_iso()
        offers = await database.find_many(
            "rider_offers",
            {"riderId": rider_id, "status": "pending"},
        )
        offer_order_ids = [
            str(o.get("orderId") or "")
            for o in offers
            if o.get("orderId")
            and str(o.get("orderId")) not in assigned_ids
            and str(o.get("expiresAt") or "9999") > now_iso
        ]

        offer_docs = []
        for oid in offer_order_ids:
            ord_doc = await lifecycle.find_order(oid)
            if ord_doc and ord_doc.get("status") in (
                lifecycle.PARTNER_ACCEPTED,
                lifecycle.RIDER_SEARCHING,
                lifecycle.PICKUP_RIDER_ASSIGNED,
                lifecycle.RIDER_ASSIGNED,
            ):
                doc_copy = dict(ord_doc)
                if not doc_copy.get("rider"):
                    doc_copy["rider"] = {"id": rider_id, "status": "assigned"}
                offer_docs.append(doc_copy)

        combined = offer_docs + assigned_docs
        combined.sort(key=lambda d: d.get("createdAt") or "", reverse=True)
        return combined


    async def list(
        self,
        rider_id: str,
        *,
        q: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        items = [lifecycle.to_rider_delivery(d) for d in await self._orders_for(rider_id)]
        if status and status != "all":
            items = [item for item in items if item["status"] == status]
        if q:
            term = q.strip().lower()
            items = [
                item
                for item in items
                if term
                in f"{item['code']} {item['customerName']} {item['partnerName']}".lower()
            ]
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        return {
            "items": items[(page - 1) * page_size : page * page_size],
            "total": len(items),
            "page": page,
            "pageSize": page_size,
            "hasMore": page * page_size < len(items),
        }

    async def all(self, rider_id: str) -> List[Dict[str, Any]]:
        return [lifecycle.to_rider_delivery(d) for d in await self._orders_for(rider_id)]

    async def by_id(self, order_id: str, rider_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        order = await lifecycle.find_order(order_id)
        if order is None:
            return None
        if rider_id is not None:
            lifecycle.assert_rider(order, rider_id)
        return lifecycle.to_rider_delivery(order)

    async def _transition(
        self,
        order_id: str,
        rider_id: str,
        target: str,
        *,
        metadata: Optional[Dict[str, Any]] = None,
        changes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            order = await lifecycle.get_order(order_id)
        except lifecycle.OrderNotFoundError as error:
            raise LookupError(str(error)) from error
        lifecycle.assert_rider(order, rider_id)
        try:
            updated = await lifecycle.transition(
                order_id,
                target,
                actor_id=rider_id,
                actor_role="rider",
                metadata=metadata,
                changes=changes,
            )
        except (lifecycle.InvalidTransitionError, lifecycle.DuplicateActionError) as error:
            raise ValueError(str(error)) from error
        return lifecycle.to_rider_delivery(updated)

    async def accept(self, order_id: str, rider_id: str) -> Dict[str, Any]:
        from app.services.rider_dispatch import rider_dispatch_engine
        updated = await rider_dispatch_engine.claim_rider_offer(order_id, rider_id)
        return lifecycle.to_rider_delivery(updated)

    async def reject(self, order_id: str, rider_id: str = "", reason: str = "Declined by rider") -> Dict[str, Any]:
        from app.services.rider_dispatch import rider_dispatch_engine
        try:
            return await rider_dispatch_engine.decline_rider_offer(order_id, rider_id)
        except Exception:
            return {"ok": True, "orderId": order_id}


    async def pickup(self, order_id: str, rider_id: str = "", otp: Optional[str] = None) -> Dict[str, Any]:
        from app.services.rider_dispatch import rider_dispatch_engine
        updated = await rider_dispatch_engine.verify_pickup_otp(order_id, rider_id, otp or "")
        return lifecycle.to_rider_delivery(updated)

    async def drop_at_partner(self, order_id: str, rider_id: str = "") -> Dict[str, Any]:
        from app.services.rider_dispatch import rider_dispatch_engine
        updated = await rider_dispatch_engine.rider_drop_at_partner(order_id, rider_id)
        return lifecycle.to_rider_delivery(updated)

    async def start_delivery(self, order_id: str, rider_id: str = "", otp: Optional[str] = None) -> Dict[str, Any]:
        from app.services.rider_dispatch import rider_dispatch_engine
        order = await lifecycle.get_order(order_id)
        dispatch_otp_obj = (order.get("otp") or {}).get("dispatch")
        
        # If dispatch OTP exists and code provided (or required), verify it
        if otp or dispatch_otp_obj:
            updated = await rider_dispatch_engine.verify_dispatch_otp(order_id, rider_id, otp or "")
        else:
            updated = await self._transition(order_id, rider_id, lifecycle.OUT_FOR_DELIVERY)
        return lifecycle.to_rider_delivery(updated)

    async def deliver(self, order_id: str, rider_id: str = "", otp: Optional[str] = None) -> Dict[str, Any]:
        from app.services.rider_dispatch import rider_dispatch_engine
        updated = await rider_dispatch_engine.verify_delivery_otp(order_id, rider_id, otp or "")
        return lifecycle.to_rider_delivery(updated)

    async def history(self, rider_id: str) -> List[Dict[str, Any]]:
        rows = []
        for document in await self._orders_for(rider_id):
            status = lifecycle.order_status(document)
            if status not in (lifecycle.DELIVERED, lifecycle.CANCELLED):
                continue
            task = lifecycle.to_rider_delivery(document)
            rows.append(
                {
                    "id": task["id"],
                    "code": task["code"],
                    "customerName": task["customerName"],
                    "partnerName": task["partnerName"],
                    "date": task["placedAt"],
                    "amount": task["estimatedEarning"] if status == lifecycle.DELIVERED else 0,
                    "distanceKm": task["distanceKm"],
                    "outcome": "completed" if status == lifecycle.DELIVERED else "cancelled",
                }
            )
        return rows

    async def dashboard(self, rider_id: str) -> Dict[str, Any]:
        tasks = [lifecycle.to_rider_delivery(d) for d in await self._orders_for(rider_id)]
        today = _now()[:10]
        completed_today = [
            t for t in tasks if t.get("status") in ("delivered", "completed") and (str(t.get("deliveredAt") or t.get("updatedAt") or t.get("placedAt") or ""))[:10] == today
        ]
        # Also check wallet transactions today for actual real earnings
        txns = await database.find_sorted(
            WALLET_TXNS, {"$or": [{"riderId": rider_id}, {"rider_id": rider_id}]}, sort=[("date", -1)]
        ) or []
        today_credits = [
            t for t in txns
            if t.get("direction") == "credit" and str(t.get("date") or "")[:10] == today
        ]
        earnings_today = round(sum(float(t.get("amount") or 0) for t in today_credits), 2)
        if earnings_today == 0.0 and completed_today:
            earnings_today = round(sum(float(t.get("estimatedEarning") or 0) for t in completed_today), 2)

        return {
            "assigned": sum(1 for t in tasks if t["status"] == "assigned"),
            "active": sum(
                1
                for t in tasks
                if t["status"] in ("accepted", "picked", "at-partner", "ready-for-delivery")
            ),
            "completedToday": len(completed_today),
            "earningsToday": earnings_today,
        }


class RiderEarningsRepository:
    async def summary(self, rider_id: str) -> Dict[str, Any]:
        wallet_doc = await rider_wallet_repository.get(rider_id) or {}
        txns = await database.find_sorted(
            WALLET_TXNS, {"$or": [{"riderId": rider_id}, {"rider_id": rider_id}]}, sort=[("date", -1)]
        ) or []
        today_prefix = _now()[:10]
        
        today_credits = [
            t for t in txns
            if t.get("direction") == "credit" and str(t.get("date") or "")[:10] == today_prefix
        ]
        today_amount = sum(float(t.get("amount") or 0) for t in today_credits)
        
        # Calculate category breakdown
        trip_fares = sum(float(t.get("amount") or 0) for t in today_credits if t.get("kind") == "trip")
        surge_pay = sum(float(t.get("amount") or 0) for t in today_credits if "surge" in (t.get("title") or "").lower())
        quest_bonus = sum(float(t.get("amount") or 0) for t in today_credits if t.get("kind") == "incentive" and "surge" not in (t.get("title") or "").lower())
        tips = sum(float(t.get("amount") or 0) for t in today_credits if t.get("kind") == "tip")

        # Query all orders assigned/completed by this rider
        all_orders = await rider_delivery_repository._orders_for(rider_id)
        completed_orders = [o for o in all_orders if o.get("status") in ("delivered", "completed")]
        today_deliveries = [
            o for o in completed_orders
            if str(o.get("deliveredAt") or o.get("updatedAt") or o.get("createdAt") or "")[:10] == today_prefix
        ]
        
        # Calculate this week's earnings (last 7 days)
        now = datetime.now(timezone.utc)
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        week_credits = [
            t for t in txns
            if t.get("direction") == "credit" and str(t.get("date") or "") >= seven_days_ago
        ]
        this_week = sum(float(t.get("amount") or 0) for t in week_credits)
        if this_week == 0 and wallet_doc.get("thisWeekEarned"):
            this_week = float(wallet_doc.get("thisWeekEarned", 0))

        lifetime = float(wallet_doc.get("lifetimeEarnings") or sum(float(t.get("amount") or 0) for t in txns if t.get("direction") == "credit"))

        # Generate real 7-day breakdown leading up to today
        weekly_days = []
        for i in range(6, -1, -1):
            day_dt = now - timedelta(days=i)
            day_str = day_dt.strftime("%Y-%m-%d")
            day_name = day_dt.strftime("%a")
            day_label = day_dt.strftime("%d %b")
            day_txns = [t for t in txns if t.get("direction") == "credit" and str(t.get("date") or "")[:10] == day_str]
            day_amount = sum(float(t.get("amount") or 0) for t in day_txns)
            day_trips = sum(1 for o in completed_orders if str(o.get("deliveredAt") or o.get("updatedAt") or o.get("createdAt") or "")[:10] == day_str)
            weekly_days.append({
                "day": day_name,
                "date": day_label,
                "amount": round(day_amount, 2),
                "trips": day_trips,
                "isToday": (i == 0),
            })

        completed_count = len(today_deliveries)

        return {
            "total": round(lifetime, 2),
            "today": round(today_amount, 2),
            "thisWeek": round(this_week, 2),
            "orders": len(completed_orders),
            "todayDeliveries": completed_count,
            "breakdown": {
                "tripFares": round(trip_fares, 2),
                "distancePay": round(tips, 2),
                "surgePay": round(surge_pay, 2),
                "questBonus": round(quest_bonus, 2),
            },
            "weeklyDays": weekly_days,
            "activeQuests": [
                {
                    "id": "quest-1",
                    "title": "Daily 10-Rides Milestone 🎯",
                    "reward": 150,
                    "target": 10,
                    "progress": min(10, completed_count),
                    "expiresIn": "Until midnight",
                    "completed": completed_count >= 10,
                },
                {
                    "id": "quest-2",
                    "title": "Kasganj Evening Peak Rush (6-9 PM) ⚡",
                    "reward": 100,
                    "target": 5,
                    "progress": min(5, completed_count),
                    "expiresIn": "2h 45m left",
                    "completed": completed_count >= 5,
                },
            ],
        }


class RiderWalletRepository:
    async def get(self, rider_id: str) -> Optional[Dict[str, Any]]:
        document = await database.find_one(WALLETS, {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]})
        
        if document is None:
            # Look up profile for real bank details if available
            prof = await database.find_one(PROFILES, {"$or": [{"_id": rider_id}, {"riderId": rider_id}]}) or {}
            base_doc = {
                "_id": rider_id,
                "rider_id": rider_id,
                "riderId": rider_id,
                "balance": 0.0,
                "pending": 0.0,
                "lifetimeEarnings": 0.0,
                "todayEarned": 0.0,
                "thisWeekEarned": 0.0,
                "totalWithdrawn": 0.0,
                "upiId": prof.get("upiId") or "",
                "bankName": prof.get("bankName") or "",
                "accountNumber": prof.get("accountNumber") or "",
                "accountHolder": prof.get("accountHolder") or prof.get("fullName") or "",
                "ifsc": prof.get("ifsc") or "",
                "createdAt": _now(),
                "updatedAt": _now(),
            }
            await database.insert(WALLETS, dict(base_doc))
            document = base_doc

        # Dynamically compute real today's and this week's earnings from credit transactions
        txns = await database.find_sorted(
            WALLET_TXNS, {"$or": [{"riderId": rider_id}, {"rider_id": rider_id}]}, sort=[("date", -1)]
        ) or []
        today_prefix = _now()[:10]
        now = datetime.now(timezone.utc)
        seven_days_ago = (now - timedelta(days=7)).isoformat()

        today_credits = [
            t for t in txns
            if t.get("direction") == "credit" and str(t.get("date") or "")[:10] == today_prefix
        ]
        today_earned = round(sum(float(t.get("amount") or 0) for t in today_credits), 2)

        week_credits = [
            t for t in txns
            if t.get("direction") == "credit" and str(t.get("date") or "") >= seven_days_ago
        ]
        this_week_earned = round(sum(float(t.get("amount") or 0) for t in week_credits), 2)

        all_credits = [t for t in txns if t.get("direction") == "credit"]
        total_lifetime = round(sum(float(t.get("amount") or 0) for t in all_credits), 2)
        if total_lifetime == 0.0:
            total_lifetime = float(document.get("lifetimeEarnings") or document.get("balance") or 0.0)

        pub = _public(document)
        pub["todayEarned"] = today_earned
        pub["thisWeekEarned"] = this_week_earned
        pub["lifetimeEarnings"] = max(total_lifetime, float(document.get("balance") or 0.0))
        return pub

    async def withdraw(self, rider_id: str, amount: float, upi_id: str = "") -> Dict[str, Any]:
        wallet = await database.find_one(WALLETS, {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]})
        if wallet is None:
            wallet = await self.get(rider_id)
        if wallet is None:
            raise LookupError("Wallet not found")
        if amount <= 0:
            raise ValueError("Enter a valid withdrawal amount (minimum ₹10)")
        curr_balance = float(wallet.get("balance", 0.0))
        if curr_balance < amount:
            raise ValueError(f"Insufficient wallet balance. Available: ₹{curr_balance:.2f}")

        target_upi = upi_id or wallet.get("upiId") or ""
        if not target_upi:
            raise ValueError("No valid UPI ID provided or registered to this account.")
        
        new_balance = round(curr_balance - amount, 2)
        curr_withdrawn = float(wallet.get("totalWithdrawn", 0.0))
        new_withdrawn = round(curr_withdrawn + amount, 2)
        
        now_iso = _now()
        await database.update(
            WALLETS,
            {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]},
            {"balance": new_balance, "totalWithdrawn": new_withdrawn, "updatedAt": now_iso},
            upsert=True,
        )
        
        now_ts = int(datetime.now(timezone.utc).timestamp())
        random_suffix = random.randint(1000, 9999)
        utr_number = f"REQ{now_ts}{random_suffix}"
        
        txn_doc = {
            "_id": f"rwtx-{rider_id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "rider_id": rider_id,
            "riderId": rider_id,
            "title": f"Payout Request (72 hrs) · {target_upi}",
            "date": now_iso,
            "amount": amount,
            "direction": "debit",
            "status": "pending",
            "kind": "withdrawal",
            "utr": utr_number,
            "upiId": target_upi,
            "method": "72-Hour Payout Cycle",
        }
        await database.insert(WALLET_TXNS, txn_doc)
        
        return {
            "ok": True,
            "amount": amount,
            "balance": new_balance,
            "totalWithdrawn": new_withdrawn,
            "utr": utr_number,
            "upiId": target_upi,
            "message": f"Withdrawal request for ₹{amount:.2f} to {target_upi} received. Settled within 72 hours.",
        }

    async def credit(self, rider_id: str, amount: float, title: str = "Bonus Incentive Credit", kind: str = "incentive", order_code: str = "", order_id: str = "", **kwargs) -> Dict[str, Any]:
        wallet = await database.find_one(WALLETS, {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]})
        if wallet is None:
            wallet = await self.get(rider_id)
        if wallet is None:
            wallet = {"_id": rider_id, "riderId": rider_id, "balance": 0.0, "lifetimeEarnings": 0.0, "todayEarned": 0.0}
        
        curr_balance = float(wallet.get("balance", 0.0))
        curr_lifetime = float(wallet.get("lifetimeEarnings", 0.0))
        curr_today = float(wallet.get("todayEarned", 0.0))
        
        new_balance = round(curr_balance + amount, 2)
        new_lifetime = round(curr_lifetime + amount, 2)
        new_today = round(curr_today + amount, 2)
        
        now_iso = _now()
        await database.update(
            WALLETS,
            {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]},
            {
                "balance": new_balance,
                "lifetimeEarnings": new_lifetime,
                "todayEarned": new_today,
                "updatedAt": now_iso,
            },
            upsert=True,
        )
        
        ord_id = order_id or kwargs.get("orderId") or ""
        txn_type = kwargs.get("type") or ("ORDER_PAYOUT" if kind == "payout" or ord_id else "CREDIT")
        txn_doc = {
            "_id": f"rwtx-{rider_id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "rider_id": rider_id,
            "riderId": rider_id,
            "title": title or kwargs.get("reason") or "Wallet Credit",
            "date": now_iso,
            "amount": amount,
            "direction": "credit",
            "status": "success",
            "kind": kind,
            "type": txn_type,
            "orderCode": order_code,
            "orderId": ord_id,
            "reason": kwargs.get("reason") or title,
        }
        await database.insert(WALLET_TXNS, txn_doc)
        return {"ok": True, "amount": amount, "balance": new_balance}

    async def debit(self, rider_id: str, amount: float, title: str = "Debit Adjustment", kind: str = "penalty", order_code: str = "") -> Dict[str, Any]:
        wallet = await database.find_one(WALLETS, {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]})
        if wallet is None:
            wallet = await self.get(rider_id)
        if wallet is None:
            raise LookupError("Wallet not found")

        curr_balance = float(wallet.get("balance", 0.0))
        new_balance = round(max(0.0, curr_balance - amount), 2)
        now_iso = _now()

        await database.update(
            WALLETS,
            {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"rider_id": rider_id}]},
            {
                "balance": new_balance,
                "updatedAt": now_iso,
            },
            upsert=True,
        )

        txn_doc = {
            "_id": f"rwtx-{rider_id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "rider_id": rider_id,
            "riderId": rider_id,
            "title": title,
            "date": now_iso,
            "amount": amount,
            "direction": "debit",
            "status": "success",
            "kind": kind,
            "orderCode": order_code,
        }
        await database.insert(WALLET_TXNS, txn_doc)
        return {"ok": True, "amount": amount, "balance": new_balance}

    async def transactions(self, rider_id: str) -> List[Dict[str, Any]]:
        # Ensure wallet/seed txns are loaded
        await self.get(rider_id)
        docs = await database.find_sorted(
            WALLET_TXNS, {"$or": [{"riderId": rider_id}, {"rider_id": rider_id}]}, sort=[("date", -1)]
        )
        return [_public(d) for d in docs]


class RiderNotificationRepository:
    async def list(self, rider_id: str) -> List[Dict[str, Any]]:
        query = {"$or": [{"accountId": rider_id}, {"riderId": rider_id}, {"user_id": rider_id}]}
        docs = await database.find_sorted(NOTIFICATIONS, query, sort=[("date", -1)])
        if not docs:
            now = _now()
            welcome_docs = [
                {
                    "_id": f"rntf-welcome-{rider_id}",
                    "accountId": rider_id,
                    "riderId": rider_id,
                    "title": "🎉 Welcome to QuickPress Captain!",
                    "message": "Your Captain profile is verified. Complete deliveries to earn up to ₹800 daily bonuses!",
                    "description": "Your Captain profile is verified. Complete deliveries to earn up to ₹800 daily bonuses!",
                    "date": now,
                    "time": "Just now",
                    "read": False,
                    "kind": "system",
                    "category": "system",
                },
                {
                    "_id": f"rntf-target-{rider_id}",
                    "accountId": rider_id,
                    "riderId": rider_id,
                    "title": "⚡ ₹200 Super Surge Target Active",
                    "message": "Complete 6 deliveries in Kasganj Hub today to claim ₹200 instant surge incentive.",
                    "description": "Complete 6 deliveries in Kasganj Hub today to claim ₹200 instant surge incentive.",
                    "date": now,
                    "time": "1 hr ago",
                    "read": False,
                    "kind": "payment",
                    "category": "payment",
                },
                {
                    "_id": f"rntf-safety-{rider_id}",
                    "accountId": rider_id,
                    "riderId": rider_id,
                    "title": "🛵 Helmet & Safe Ride Guidelines",
                    "message": "Always wear helmet and follow speed limits. 24/7 SOS helpline is available in drawer menu.",
                    "description": "Always wear helmet and follow speed limits. 24/7 SOS helpline is available in drawer menu.",
                    "date": now,
                    "time": "Today",
                    "read": True,
                    "kind": "system",
                    "category": "system",
                },
            ]
            for doc in welcome_docs:
                await database.insert(NOTIFICATIONS, doc)
            docs = welcome_docs
        return [_public(d) for d in docs]

    async def unread_count(self, rider_id: str) -> int:
        query = {
            "$and": [
                {"$or": [{"accountId": rider_id}, {"riderId": rider_id}, {"user_id": rider_id}]},
                {"read": False},
            ]
        }
        docs = await database.find_many(NOTIFICATIONS, query)
        return len(docs)

    async def mark_read(self, notification_id: str) -> Optional[Dict[str, Any]]:
        document = await database.find_one(NOTIFICATIONS, {"$or": [{"_id": notification_id}, {"id": notification_id}]})
        if document is None:
            return None
        doc_id = document.get("_id") or notification_id
        await database.update(NOTIFICATIONS, {"_id": doc_id}, {"read": True})
        return await database.find_one(NOTIFICATIONS, {"_id": doc_id})

    async def mark_all_read(self, rider_id: str) -> int:
        query = {
            "$and": [
                {"$or": [{"accountId": rider_id}, {"riderId": rider_id}, {"user_id": rider_id}]},
                {"read": False},
            ]
        }
        docs = await database.find_many(NOTIFICATIONS, query)
        for document in docs:
            await database.update(NOTIFICATIONS, {"_id": document["_id"]}, {"read": True})
        return len(docs)

    async def create(
        self,
        rider_id: str,
        title: str,
        message: str,
        kind: str = "system",
        order_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = _now()
        doc = {
            "_id": f"rntf-{uuid.uuid4().hex[:16]}",
            "accountId": rider_id,
            "riderId": rider_id,
            "user_id": rider_id,
            "title": title,
            "message": message,
            "description": message,
            "date": now,
            "time": "Just now",
            "read": False,
            "kind": kind,
            "category": kind,
            "orderId": order_id,
        }
        await database.insert(NOTIFICATIONS, doc)
        return _public(doc)

    async def push(
        self,
        rider_id: str,
        title: str,
        message: str,
        kind: str = "system",
        order_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self.create(
            rider_id=rider_id,
            title=title,
            message=message,
            kind=kind,
            order_id=order_id,
        )


class RiderAnalyticsRepository:
    async def list(self, rider_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        docs = await database.find_sorted(
            ANALYTICS, {"riderId": rider_id}, sort=[("date", -1)], limit=limit
        )
        return [_public(d) for d in docs]


rider_profile_repository = RiderProfileRepository()
rider_settings_repository = RiderSettingsRepository()
rider_delivery_repository = RiderDeliveryRepository()
rider_earnings_repository = RiderEarningsRepository()
rider_wallet_repository = RiderWalletRepository()
rider_notification_repository = RiderNotificationRepository()
rider_analytics_repository = RiderAnalyticsRepository()


# ---------------------------------------------------------------------------
# Rider domain collections. All rider profiles, work queues, wallets,
# earnings and notifications are strictly loaded and managed in real MongoDB.
# ---------------------------------------------------------------------------

RIDER_SEED: Dict[str, List[Dict[str, Any]]] = {}

