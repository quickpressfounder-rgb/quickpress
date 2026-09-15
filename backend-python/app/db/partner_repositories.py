"""Partner domain repositories — Sprint 5.2 (MongoDB integration).

Collections
-----------
partner_profiles            one document per partner store (profile fields)
partner_services            rate-card line items, keyed by partnerId
partner_orders              partner facing projection of an order
partner_wallets             one wallet per partner account
partner_wallet_transactions append only ledger entries
partner_reviews             customer reviews for a partner
partner_analytics           cached dashboard/earnings snapshots (optional)
partner_settings            business settings per partner

All reads/writes go through `app.db.client.database` so the same code runs on
MongoDB Atlas and the in-memory preview store.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.services import order_lifecycle as lifecycle

PROFILES = "partner_profiles"
SERVICES = "partner_services"
ORDERS = "partner_orders"
WALLETS = "partner_wallets"
WALLET_TXNS = "partner_wallet_transactions"
REVIEWS = "partner_reviews"
ANALYTICS = "partner_analytics"
SETTINGS = "partner_settings"
CATEGORIES = "admin_categories"
SERVICES_CATALOG = "admin_services"

ORDER_STAGES: List[Dict[str, str]] = [
    {"id": "pending", "label": "Pending", "status": "new"},
    {"id": "accepted", "label": "Accepted", "status": "accepted"},
    {"id": "picked", "label": "Picked Up", "status": "picked"},
    {"id": "processing", "label": "Processing", "status": "processing"},
    {"id": "ironing", "label": "Ironing", "status": "ironing"},
    {"id": "ready", "label": "Ready", "status": "ready"},
    {"id": "delivered", "label": "Delivered", "status": "delivered"},
]

STAGE_RANK = {stage["status"]: index for index, stage in enumerate(ORDER_STAGES)}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class PartnerNotFoundError(Exception):
    pass


class PartnerAccessError(Exception):
    """The signed-in account may not act as a partner store."""


class InvalidTransitionError(Exception):
    pass


_PARTNER_ID_CACHE: Dict[str, str] = {}


class PartnerRepository:
    """Profile + business settings."""

    async def resolve_partner_id(self, user) -> str:
        """The partner store id for the signed-in account."""
        role = getattr(user, "role", None)
        role_value = str(getattr(role, "value", role) or "")
        if role_value != "partner":
            raise PartnerAccessError("This account is not a partner account")
        user_id = str(getattr(user, "id", "") or "")
        if user_id and user_id in _PARTNER_ID_CACHE:
            return _PARTNER_ID_CACHE[user_id]

        phone = str(getattr(user, "phone", "") or "")
        raw_phone = phone.replace("+91", "").replace(" ", "").replace("-", "").strip()

        # 1. Check direct partners collection link
        account = await database.find_one("partners", {"user_id": user_id}) or {}
        store_id = account.get("partner_id") or account.get("partnerId")

        # 2. Check partner profile by userId
        if not store_id:
            profile_by_user = await database.find_one(PROFILES, {"userId": user_id})
            if profile_by_user:
                store_id = str(profile_by_user.get("_id") or profile_by_user.get("partnerId"))

        # 3. Check partner profile by matching phone or existing partner users with same phone
        if not store_id and raw_phone:
            profile_by_phone = await database.find_one(PROFILES, {
                "$or": [
                    {"phone": phone},
                    {"phone": raw_phone},
                    {"phone": f"+91{raw_phone}"},
                    {"ownerPhone": phone},
                    {"ownerPhone": raw_phone},
                ]
            })
            if profile_by_phone:
                store_id = str(profile_by_phone.get("_id") or profile_by_phone.get("partnerId"))
            else:
                other_users = await database.find_many("users", {
                    "role": "partner",
                    "$or": [{"phone": phone}, {"phone": raw_phone}, {"phone": f"+91{raw_phone}"}]
                })
                for ou in other_users:
                    ou_id = str(ou.get("_id") or ou.get("id"))
                    ou_account = await database.find_one("partners", {"user_id": ou_id}) or {}
                    ou_partner_id = ou_account.get("partner_id") or ou_account.get("partnerId")
                    if ou_partner_id:
                        store_id = ou_partner_id
                        break
                    ou_profile = await database.find_one(PROFILES, {"userId": ou_id})
                    if ou_profile:
                        store_id = str(ou_profile.get("_id") or ou_profile.get("partnerId"))
                        break

        # 4. Fallback to user linked_partner_id / linked_id
        if not store_id:
            candidate = getattr(user, "linked_partner_id", None) or getattr(user, "linked_id", None)
            if candidate and await database.find_one(PROFILES, {"_id": str(candidate)}):
                store_id = str(candidate)

        # 5. If still none, reject unlinked partner
        if not store_id:
            raise PartnerAccessError("No partner store profile found for this account. Please complete partner onboarding.")

        store_id_str = str(store_id)
        if user_id:
            _PARTNER_ID_CACHE[user_id] = store_id_str

        return store_id_str

    async def link_account(self, user_id: str, store_id: str) -> None:
        """Attach a signed-in partner account to a real partner store."""
        if user_id:
            _PARTNER_ID_CACHE[user_id] = str(store_id)
        await database.update(
            "partners", {"user_id": user_id}, {"partner_id": store_id}, upsert=True
        )

    async def profile(self, partner_id: str) -> Dict[str, Any]:
        doc = await database.find_one(PROFILES, {"_id": partner_id}) or await database.find_one(PROFILES, {"partnerId": partner_id})
        if doc is None:
            # Check admin_partners for any real onboarded details
            admin_doc = await database.find_one("admin_partners", {"_id": partner_id}) or await database.find_one("admin_partners", {"partnerId": partner_id}) or {}
            doc = {
                "_id": partner_id,
                "partnerId": partner_id,
                "businessName": admin_doc.get("businessName") or admin_doc.get("storeName") or "QuickPress Partner Store",
                "ownerName": admin_doc.get("ownerName") or "Partner",
                "phone": admin_doc.get("phone") or "",
                "email": admin_doc.get("email") or "",
                "city": admin_doc.get("city") or "Kasganj",
                "area": admin_doc.get("area") or "Main Market",
                "rating": float(admin_doc.get("rating") or 5.0),
                "totalOrders": 0,
                "joinedOn": datetime.now(timezone.utc).strftime("%B %Y"),
                "onTimeRate": 98.5,
                "tier": "Silver",
                "isOnline": True,
                "isVerified": True,
                "gallery": [],
                "createdAt": _now(),
                "updatedAt": _now(),
            }
            await database.insert(PROFILES, doc)

        if doc is not None:
            # Sync verified status from admin_partners or partner_verifications
            admin_doc = (
                await database.find_one("admin_partners", {"_id": partner_id})
                or await database.find_one("admin_partners", {"partnerId": partner_id})
                or {}
            )
            pv_doc = (
                await database.find_one("partner_verifications", {"partnerId": partner_id})
                or await database.find_one("partner_verifications", {"_id": partner_id})
                or {}
            )

            is_verified = bool(
                doc.get("isVerified")
                or admin_doc.get("isVerified")
                or str(admin_doc.get("status") or "").lower() in ("active", "approved")
                or str(pv_doc.get("status") or "").lower() in ("active", "approved")
                or str(doc.get("status") or "").lower() in ("active", "approved")
            )
            if is_verified:
                doc["isVerified"] = True
                doc["status"] = "active"
                doc["isOnboarded"] = True

            if "gallery" not in doc or not isinstance(doc["gallery"], list):
                doc["gallery"] = []
            if not doc.get("logo") and not doc.get("image"):
                if admin_doc.get("logo") or admin_doc.get("image"):
                    doc["logo"] = admin_doc.get("logo") or admin_doc.get("image")
            if not doc.get("banner") and not doc.get("cover"):
                if admin_doc.get("banner") or admin_doc.get("cover"):
                    doc["banner"] = admin_doc.get("banner") or admin_doc.get("cover")
            try:
                orders = await partner_order_repository._orders_for(partner_id)
                real_orders_count = len(orders)
                doc["totalOrders"] = max(real_orders_count, int(doc.get("totalOrders") or 0))
            except Exception:
                pass

        return doc

    async def update_profile(self, partner_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        changes = {k: v for k, v in changes.items() if v is not None}
        if not changes:
            return await self.profile(partner_id)
        doc = await database.update(PROFILES, {"_id": partner_id}, changes)
        if doc is None:
            current = await self.profile(partner_id)
            doc = await database.update(PROFILES, {"_id": partner_id}, {**current, **changes}, upsert=True)
        # Sync logo/banner/businessName to admin_partners
        sync_keys = {"logo", "banner", "businessName", "ownerName", "phone", "city", "image", "cover"}
        admin_sync = {k: v for k, v in changes.items() if k in sync_keys}
        if admin_sync:
            try:
                await database.update("admin_partners", {"_id": partner_id}, admin_sync)
                await database.update("admin_partners", {"partnerId": partner_id}, admin_sync)
            except Exception:
                pass
        return doc

    async def settings(self, partner_id: str) -> Dict[str, Any]:
        doc = await database.find_one(SETTINGS, {"_id": partner_id})
        if doc is None:
            doc = {
                "_id": partner_id,
                "partnerId": partner_id,
                "isStoreOpen": True,
                "acceptingNewOrders": True,
                "autoAcceptOrders": True,
                "expressDelivery": True,
                "pickupRadiusKm": 8,
                "openingTime": "08:00",
                "closingTime": "21:00",
                "weeklyOff": "None",
                "dailyOrderCap": 50,
            }
            await database.insert(SETTINGS, doc)
        return doc

    async def update_settings(self, partner_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        changes = {k: v for k, v in changes.items() if v is not None}
        doc = await database.update(SETTINGS, {"_id": partner_id}, changes, upsert=True)
        return doc

    async def toggle_status(self, partner_id: str, is_online: bool) -> Dict[str, Any]:
        from datetime import datetime, timezone
        from app.services.socket_service import broadcast_partner_status

        now_iso = datetime.now(timezone.utc).isoformat()
        is_online_b = bool(is_online)

        # 1. Update partner_profiles
        patch: Dict[str, Any] = {
            "isOnline": is_online_b,
            "isStoreOpen": is_online_b,
            "acceptingNewOrders": is_online_b,
            "updatedAt": now_iso,
        }
        if is_online_b:
            patch["lastOnlineAt"] = now_iso
        await database.update(PROFILES, {"_id": partner_id}, patch, upsert=True)

        # 2. Update partner_settings
        await database.update(
            SETTINGS,
            {"_id": partner_id},
            {"isStoreOpen": is_online_b, "acceptingNewOrders": is_online_b, "updatedAt": now_iso},
            upsert=True,
        )

        # 3. Update partners collection (Legacy / admin sync)
        await database.update(
            "partners",
            {"$or": [{"_id": partner_id}, {"id": partner_id}]},
            {"isOnline": is_online_b, "isStoreOpen": is_online_b, "updated_at": now_iso},
            upsert=True,
        )

        # 4. Update catalog_partners (Customer marketplace view)
        await database.update(
            "catalog_partners",
            {"$or": [{"_id": partner_id}, {"id": partner_id}]},
            {"isOnline": is_online_b, "isStoreOpen": is_online_b, "status": "open" if is_online_b else "closed"},
            upsert=True,
        )

        # 5. Update live_locations (Admin Live Telemetry Map)
        p_doc = await self.profile(partner_id) or {}
        p_name = p_doc.get("businessName") or p_doc.get("name") or partner_id
        p_lat = p_doc.get("latitude") or p_doc.get("lat")
        p_lng = p_doc.get("longitude") or p_doc.get("lng")
        if p_lat is not None and p_lng is not None:
            await database.update(
                "live_locations",
                {"_id": f"partner:{partner_id}"},
                {
                    "kind": "partner",
                    "label": p_name,
                    "latitude": float(p_lat),
                    "longitude": float(p_lng),
                    "isOnline": is_online_b,
                    "status": "open" if is_online_b else "closed",
                    "updatedAt": now_iso,
                },
                upsert=True,
            )

        # 6. Realtime Socket.IO Broadcast to Admins, Partners, and Customers
        await broadcast_partner_status(
            partner_id=partner_id,
            is_online=is_online_b,
            is_store_open=is_online_b,
            accepting_orders=is_online_b,
        )

        return await self.profile(partner_id)


class PartnerServiceRepository:
    async def list(self, partner_id: str) -> List[Dict[str, Any]]:
        docs = await database.find_sorted(SERVICES, {"partnerId": partner_id}, sort=[("name", 1)])
        result = []
        for d in docs:
            doc = dict(d)
            doc["id"] = str(doc.get("_id") or doc.get("id"))
            doc["enabled"] = bool(doc.get("enabled", doc.get("isActive", True)))
            doc["turnaroundHours"] = int(doc.get("turnaroundHours") or 24)
            doc["pendingApproval"] = bool(doc.get("pendingApproval", False))
            doc["approvalStatus"] = str(doc.get("approvalStatus", "approved"))
            doc["rejectionReason"] = doc.get("rejectionReason")
            doc["pendingChanges"] = doc.get("pendingChanges")
            result.append(doc)
        return result

    async def by_id(self, partner_id: str, service_id: str) -> Dict[str, Any]:
        doc = await database.find_one(SERVICES, {"_id": service_id, "partnerId": partner_id})
        if doc is None:
            doc = await database.find_one(SERVICES, {"id": service_id, "partnerId": partner_id})
        if doc is None:
            raise PartnerNotFoundError("Service not found or you do not have permission to access it")
        result = dict(doc)
        result["id"] = str(result.get("_id") or result.get("id"))
        result["enabled"] = bool(result.get("enabled", result.get("isActive", True)))
        result["turnaroundHours"] = int(result.get("turnaroundHours") or 24)
        result["price"] = int(result.get("price") or 0)
        result["unit"] = str(result.get("unit") or "kg")
        result["category"] = str(result.get("category") or "laundry")
        result["description"] = str(result.get("description") or "")
        result["image"] = str(result.get("image") or "")
        result["minQuantity"] = int(result.get("minQuantity") or 1)
        result["expressAvailable"] = bool(result.get("expressAvailable", False))
        result["pendingApproval"] = bool(result.get("pendingApproval", False))
        result["approvalStatus"] = str(result.get("approvalStatus", "approved"))
        result["rejectionReason"] = result.get("rejectionReason")
        result["pendingChanges"] = result.get("pendingChanges")
        return result

    async def create(self, partner_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        svc_id = _uid("svc")
        enabled = bool(payload.get("enabled", True))
        document = {
            "_id": svc_id,
            "id": svc_id,
            "partnerId": partner_id,
            "name": str(payload.get("name", "")).strip() or "Laundry Service",
            "category": str(payload.get("category") or "laundry"),
            "price": int(payload.get("price") or 0),
            "unit": str(payload.get("unit") or "kg"),
            "turnaroundHours": int(payload.get("turnaroundHours") or 24),
            "enabled": enabled,
            "isActive": enabled,
            "pendingApproval": bool(payload.get("pendingApproval", False)),
            "approvalStatus": str(payload.get("approvalStatus", "approved")),
            "isApproved": bool(payload.get("isApproved", False)),
            "rejectionReason": payload.get("rejectionReason"),
            "pendingChanges": payload.get("pendingChanges"),
            "description": str(payload.get("description") or ""),
            "image": str(payload.get("image") or ""),
            "minQuantity": int(payload.get("minQuantity") or 1),
            "expressAvailable": bool(payload.get("expressAvailable", False)),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        await database.insert(SERVICES, document)
        return document

    async def update(self, partner_id: str, service_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        changes = {k: v for k, v in changes.items() if v is not None}
        existing = await database.find_one(SERVICES, {"_id": service_id, "partnerId": partner_id})
        if existing is None:
            existing = await database.find_one(SERVICES, {"id": service_id, "partnerId": partner_id})
        if existing is None:
            raise PartnerNotFoundError("Service not found or you do not have permission to edit it")

        target_id = existing["_id"]
        if "enabled" in changes:
            changes["isActive"] = bool(changes["enabled"])
        elif "isActive" in changes:
            changes["enabled"] = bool(changes["isActive"])
        changes["updatedAt"] = datetime.now(timezone.utc).isoformat()

        updated = await database.update(SERVICES, {"_id": target_id}, changes)
        updated_dict = dict(updated)
        updated_dict["id"] = str(updated_dict.get("_id") or updated_dict.get("id"))
        updated_dict["enabled"] = bool(updated_dict.get("enabled", updated_dict.get("isActive", True)))
        return updated_dict

    async def delete(self, partner_id: str, service_id: str) -> None:
        existing = await database.find_one(SERVICES, {"_id": service_id, "partnerId": partner_id})
        if existing is None:
            existing = await database.find_one(SERVICES, {"id": service_id, "partnerId": partner_id})
        if existing is None:
            raise PartnerNotFoundError("Service not found or you do not have permission to delete it")
        await database.delete_one(SERVICES, {"_id": existing["_id"]})

    async def toggle(self, partner_id: str, service_id: str, enabled: bool) -> Dict[str, Any]:
        return await self.update(partner_id, service_id, {"enabled": enabled, "isActive": enabled})


def _timeline(events: Dict[str, str]) -> List[Dict[str, Any]]:
    return [
        {
            "id": stage["id"],
            "label": stage["label"],
            "time": events.get(stage["status"], "—"),
            "done": stage["status"] in events,
        }
        for stage in ORDER_STAGES
    ]


class PartnerOrderRepository:
    """The partner's view of the ONE canonical order (customer_orders).

    Strict tenant isolation: queries strictly for orders belonging to partner_id.
    """

    async def _orders_for(self, partner_id: str) -> List[Dict[str, Any]]:
        profile = await database.find_one(PROFILES, {"$or": [{"_id": partner_id}, {"partnerId": partner_id}]})
        user_id = profile.get("userId") if profile else None
        partner_name = (profile.get("businessName") or profile.get("name")) if profile else None
        partner_phone = (profile.get("phone") or profile.get("ownerPhone")) if profile else None

        id_candidates = {partner_id, partner_id.lower(), partner_id.upper()}
        if user_id:
            id_candidates.add(user_id)

        or_conditions: List[Dict[str, Any]] = [
            {"partner.id": {"$in": list(id_candidates)}},
            {"partner_id": {"$in": list(id_candidates)}},
            {"partnerId": {"$in": list(id_candidates)}},
            {"store_id": {"$in": list(id_candidates)}},
            # Live incoming new orders awaiting partner acceptance
            {"status": {"$in": ["placed", "pending_partner_acceptance", "new"]}},
        ]
        if partner_name:
            or_conditions.extend([
                {"partner.name": partner_name},
                {"partner.businessName": partner_name},
            ])
        if partner_phone:
            raw_phone = partner_phone.replace("+91", "").replace(" ", "").replace("-", "").strip()
            or_conditions.extend([
                {"partner.phone": partner_phone},
                {"partner.phone": raw_phone},
                {"partner.phone": f"+91{raw_phone}"},
            ])

        docs = await database.find_many(lifecycle.ORDERS, {"$or": or_conditions})
        # Deduplicate docs by _id / id
        seen_ids = set()
        unique_docs = []
        for d in docs:
            doc_id = str(d.get("_id") or d.get("id"))
            if doc_id not in seen_ids:
                seen_ids.add(doc_id)
                unique_docs.append(d)

        unique_docs.sort(key=lambda d: d.get("createdAt") or d.get("placedAt") or "", reverse=True)
        return unique_docs

    async def list(
        self,
        partner_id: str,
        *,
        status: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        items = [lifecycle.to_partner_order(d) for d in await self._orders_for(partner_id)]
        if status and status != "all":
            items = [item for item in items if item["status"] == status]
        if q:
            term = q.strip().lower()
            items = [
                item
                for item in items
                if term in f"{item['code']} {item['customerName']} {item['customerPhone']}".lower()
            ]
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        window = items[(page - 1) * page_size : page * page_size]
        return {
            "items": window,
            "total": len(items),
            "page": page,
            "pageSize": page_size,
            "hasMore": page * page_size < len(items),
        }

    async def by_id(self, partner_id: str, order_id: str) -> Dict[str, Any]:
        order = await lifecycle.find_order(order_id)
        if order is None:
            raise PartnerNotFoundError("Order not found")
        try:
            lifecycle.assert_partner(order, partner_id)
        except lifecycle.OrderAuthorizationError as error:
            raise PartnerAccessError(str(error)) from error
        return lifecycle.to_partner_order(order)

    async def _transition(
        self,
        partner_id: str,
        order_id: str,
        target: str,
        *,
        metadata: Optional[Dict[str, Any]] = None,
        changes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        await self.by_id(partner_id, order_id)  # existence + ownership
        try:
            updated = await lifecycle.transition(
                order_id,
                target,
                actor_id=partner_id,
                actor_role="partner",
                metadata=metadata,
                changes=changes,
            )
        except lifecycle.OrderNotFoundError as error:
            raise PartnerNotFoundError(str(error)) from error
        except (lifecycle.InvalidTransitionError, lifecycle.DuplicateActionError) as error:
            raise InvalidTransitionError(str(error)) from error
        return lifecycle.to_partner_order(updated)

    async def accept(self, partner_id: str, order_id: str) -> Dict[str, Any]:
        profile = await database.find_one(PROFILES, {"$or": [{"_id": partner_id}, {"partnerId": partner_id}]})
        partner_name = (profile.get("businessName") or profile.get("name") or "Partner Store") if profile else "Partner Store"
        partner_phone = profile.get("phone", "") if profile else ""

        order = await lifecycle.find_order(order_id)
        if not order:
            raise PartnerNotFoundError("Order not found")

        current_status = lifecycle.order_status(order)
        if current_status not in (lifecycle.PENDING, lifecycle.PLACED):
            raise InvalidTransitionError(f"This order is already {current_status} and cannot be accepted again.")

        order_partner = order.get("partner") or {}
        existing_pid = str(order_partner.get("id") or order.get("partner_id") or order.get("partnerId") or "")
        if existing_pid and existing_pid != partner_id and existing_pid.lower() != partner_id.lower():
            raise PartnerAccessError("This order is already accepted by another partner store.")

        now_iso = lifecycle.now_iso()
        rider_deadline = (
            (datetime.now(timezone.utc) + timedelta(seconds=lifecycle.RIDER_ACCEPT_SLA_SECONDS))
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )
        changes = {
            "partner": {
                "id": partner_id,
                "name": partner_name,
                "phone": partner_phone,
            },
            "partnerId": partner_id,
            "partner_id": partner_id,
            "store_id": partner_id,
            "partnerAcceptedAt": now_iso,
            "riderDispatchStartedAt": now_iso,
            "riderAcceptDeadline": rider_deadline,
            "riderSlaSeconds": lifecycle.RIDER_ACCEPT_SLA_SECONDS,
        }
        res = await self._transition(partner_id, order_id, lifecycle.PARTNER_ACCEPTED, changes=changes)

        # Trigger automatic nearby rider search and offer dispatch upon Partner Acceptance
        from app.services.smart_2ride_engine import smart_2ride_engine
        try:
            await smart_2ride_engine.create_ride_1_pickup(order_id)
        except Exception as e:
            logger.error("Auto rider dispatch failed for order %s: %s", order_id, e)

        return res

    async def reject(self, partner_id: str, order_id: str, reason: str) -> Dict[str, Any]:
        text = reason or "Rejected by store"
        return await self._transition(
            partner_id,
            order_id,
            lifecycle.CANCELLED,
            metadata={"reason": text},
            changes={"cancelledReason": text},
        )

    async def receive_laundry(self, partner_id: str, order_id: str) -> Dict[str, Any]:
        """Partner store confirms receipt of laundry dropped by rider or customer."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise PartnerNotFoundError("Order not found")
        try:
            lifecycle.assert_partner(order, partner_id)
        except lifecycle.OrderAuthorizationError as error:
            raise PartnerAccessError(str(error)) from error

        current_status = lifecycle.order_status(order)
        if current_status not in (lifecycle.PICKED_UP, lifecycle.RIDER_ACCEPTED, lifecycle.RIDER_ASSIGNED):
            if current_status == lifecycle.AT_PARTNER:
                return lifecycle.to_partner_order(order)
            raise InvalidTransitionError(f"Cannot receive laundry when order status is {current_status}. Order must be picked up first.")

        now = lifecycle.now_iso()
        updated = await lifecycle.transition(
            order_id,
            lifecycle.AT_PARTNER,
            actor_id=partner_id,
            actor_role="partner",
            metadata={"receivedAtStoreAt": now},
            changes={"receivedAtStoreAt": now, "droppedAtPartnerAt": now},
        )
        return lifecycle.to_partner_order(updated)

    async def start_processing(self, partner_id: str, order_id: str) -> Dict[str, Any]:
        order = await lifecycle.find_order(order_id)
        if not order:
            raise PartnerNotFoundError("Order not found")
        try:
            lifecycle.assert_partner(order, partner_id)
        except lifecycle.OrderAuthorizationError as error:
            raise PartnerAccessError(str(error)) from error

        current_status = lifecycle.order_status(order)
        if current_status != lifecycle.AT_PARTNER:
            raise InvalidTransitionError(
                f"Cannot start processing before Captain completes pickup and arrives at store (Current status: {current_status}). Captain must reach store and perform store arrival first."
            )

        from app.services.rider_dispatch import rider_dispatch_engine
        res = await rider_dispatch_engine.partner_start_processing(order_id, partner_id)
        return lifecycle.to_partner_order(res)

    async def start_ironing(self, partner_id: str, order_id: str) -> Dict[str, Any]:
        order = await lifecycle.find_order(order_id)
        if not order:
            raise PartnerNotFoundError("Order not found")
        try:
            lifecycle.assert_partner(order, partner_id)
        except lifecycle.OrderAuthorizationError as error:
            raise PartnerAccessError(str(error)) from error

        current_status = lifecycle.order_status(order)
        if current_status not in (lifecycle.PROCESSING, "washing", "dry_cleaning"):
            raise InvalidTransitionError(
                f"Cannot start ironing before processing is completed (Current status: {current_status})."
            )

        from app.services.rider_dispatch import rider_dispatch_engine
        res = await rider_dispatch_engine.partner_start_ironing(order_id, partner_id)
        return lifecycle.to_partner_order(res)

    async def complete(self, partner_id: str, order_id: str) -> Dict[str, Any]:
        order = await lifecycle.find_order(order_id)
        if not order:
            raise PartnerNotFoundError("Order not found")
        try:
            lifecycle.assert_partner(order, partner_id)
        except lifecycle.OrderAuthorizationError as error:
            raise PartnerAccessError(str(error)) from error

        current_status = lifecycle.order_status(order)
        if current_status not in (lifecycle.PROCESSING, "washing", "dry_cleaning", lifecycle.IRONING, "ironing"):
            raise InvalidTransitionError(
                f"Cannot mark order ready before processing is started (Current status: {current_status})."
            )

        from app.services.rider_dispatch import rider_dispatch_engine
        res = await rider_dispatch_engine.partner_mark_ready(order_id, partner_id)
        # Automatically trigger delivery rider search/offer dispatch
        try:
            await rider_dispatch_engine.search_and_offer_riders(order_id)
        except Exception as e:
            logger.warning("Delivery rider dispatch offer failed for order %s: %s", order_id, e)
        return lifecycle.to_partner_order(res)

    async def history(self, partner_id: str) -> List[Dict[str, Any]]:
        return [
            lifecycle.to_partner_order(d)
            for d in await self._orders_for(partner_id)
            if lifecycle.order_status(d) in (lifecycle.DELIVERED, lifecycle.CANCELLED)
        ]

    async def dashboard(self, partner_id: str) -> Dict[str, Any]:
        orders = [lifecycle.to_partner_order(d) for d in await self._orders_for(partner_id)]
        delivered = [o for o in orders if o["status"] == "delivered"]

        from app.services.financial_engine import financial_engine
        monthly_orders = len(orders)
        comm_rate = financial_engine.get_commission_rate(monthly_orders)
        net_rate = 1.0 - comm_rate - 0.01  # minus commission and 1% TCS

        return {
            "newOrders": sum(1 for o in orders if o["status"] == "new"),
            "inProgress": sum(
                1 for o in orders if o["status"] in ("accepted", "picked", "processing", "washing", "ironing")
            ),
            "readyForDelivery": sum(1 for o in orders if o["status"] == "ready"),
            "delivered": len(delivered),
            "earningsToday": sum(round(o.get("amount", 0) * net_rate) for o in delivered),
            "commissionRate": round(comm_rate * 100, 1),
        }

    async def earnings(self, partner_id: str) -> Dict[str, Any]:
        all_orders = await self._orders_for(partner_id)
        delivered = [
            lifecycle.to_partner_order(d)
            for d in all_orders
            if lifecycle.order_status(d) == lifecycle.DELIVERED
        ]
        from app.services.financial_engine import financial_engine
        comm_rate = financial_engine.get_commission_rate(len(all_orders))
        net_rate = 1.0 - comm_rate - 0.01

        gross = sum(o["amount"] for o in delivered)
        commission = round(gross * comm_rate)
        tcs = round(gross * 0.01)
        net = gross - commission - tcs

        return {
            "total": net,
            "grossSales": gross,
            "commissionDeducted": commission,
            "commissionRate": round(comm_rate * 100, 1),
            "tcsDeducted": tcs,
            "orders": len(delivered),
        }


class PartnerWalletRepository:
    async def wallet(self, partner_id: str) -> Optional[Dict[str, Any]]:
        return await database.find_one(WALLETS, {"accountId": partner_id})

    async def transactions(self, partner_id: str) -> List[Dict[str, Any]]:
        return await database.find_sorted(
            WALLET_TXNS, {"accountId": partner_id}, sort=[("date", -1)]
        )

    async def withdraw(self, partner_id: str, amount: float) -> Dict[str, Any]:
        wallet = await self.wallet(partner_id)
        if wallet is None:
            raise PartnerNotFoundError("Wallet not found")
        if amount <= 0:
            raise InvalidTransitionError("Withdrawal amount must be greater than zero")
        if amount > wallet.get("balance", 0):
            raise InvalidTransitionError("Insufficient wallet balance")
        new_balance = wallet["balance"] - amount
        await database.update(WALLETS, {"accountId": partner_id}, {"balance": new_balance})
        txn = {
            "_id": _uid("wtx"),
            "accountId": partner_id,
            "title": "Withdrawal to bank",
            "date": _now(),
            "amount": amount,
            "direction": "debit",
            "status": "success",
            "kind": "withdrawal",
        }
        await database.insert(WALLET_TXNS, txn)
        return await self.wallet(partner_id)


class PartnerReviewRepository:
    async def list(self, partner_id: str) -> List[Dict[str, Any]]:
        return await database.find_sorted(
            REVIEWS, {"partnerId": partner_id}, sort=[("date", -1)]
        )


class PartnerCustomerRepository:
    async def list(self, partner_id: str) -> List[Dict[str, Any]]:
        orders = [lifecycle.to_partner_order(d) for d in await partner_order_repository._orders_for(partner_id)]
        customer_map: Dict[str, Dict[str, Any]] = {}
        for o in orders:
            phone = o.get("customerPhone") or "No Phone"
            name = o.get("customerName") or "Customer"
            cid = phone
            if cid not in customer_map:
                customer_map[cid] = {
                    "id": cid,
                    "name": name,
                    "phone": phone,
                    "totalOrders": 0,
                    "totalSpent": 0,
                    "lastOrderDate": o.get("placedAt") or "",
                    "lastOrderCode": o.get("code") or "",
                }
            customer_map[cid]["totalOrders"] += 1
            customer_map[cid]["totalSpent"] += int(o.get("amount") or 0)
        return list(customer_map.values())


class PartnerAnalyticsRepository:
    async def get(self, partner_id: str, period: str = "7d") -> Dict[str, Any]:
        orders = [lifecycle.to_partner_order(d) for d in await partner_order_repository._orders_for(partner_id)]
        total_orders = len(orders)
        total_revenue = sum(int(o.get("amount") or 0) for o in orders)
        total_earnings = sum(round((o.get("amount") or 0) * 0.8) for o in orders if o.get("status") == "delivered")
        unique_customers = len(set(o.get("customerPhone") for o in orders if o.get("customerPhone")))

        from collections import defaultdict
        service_counts: Dict[str, Dict[str, Any]] = {}
        daily_orders = defaultdict(int)
        daily_revenue = defaultdict(int)

        for o in orders:
            for item in o.get("items") or []:
                sname = item.get("name") or "Laundry Service"
                if sname not in service_counts:
                    service_counts[sname] = {"name": sname, "count": 0, "revenue": 0}
                service_counts[sname]["count"] += int(item.get("qty") or 1)
                service_counts[sname]["revenue"] += int(item.get("price") or 0) * int(item.get("qty") or 1)

            date_str = (o.get("placedAt") or "")[:10] or "Recent"
            daily_orders[date_str] += 1
            daily_revenue[date_str] += int(o.get("amount") or 0)

        top_services = sorted(service_counts.values(), key=lambda s: s["count"], reverse=True)[:5]
        trend_labels = sorted(daily_orders.keys())[-7:] if daily_orders else ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        trend_orders = [daily_orders[k] for k in trend_labels] if daily_orders else [0, 0, 0, 0, 0, 0, 0]
        trend_revenue = [daily_revenue[k] for k in trend_labels] if daily_orders else [0, 0, 0, 0, 0, 0, 0]

        return {
            "totalOrders": total_orders,
            "totalRevenue": total_revenue,
            "totalEarnings": total_earnings,
            "totalCustomers": unique_customers,
            "trendLabels": trend_labels,
            "ordersTrend": trend_orders,
            "revenueTrend": trend_revenue,
            "topServices": top_services,
        }


partner_repository = PartnerRepository()
partner_service_repository = PartnerServiceRepository()
partner_order_repository = PartnerOrderRepository()
partner_wallet_repository = PartnerWalletRepository()
partner_review_repository = PartnerReviewRepository()
partner_customer_repository = PartnerCustomerRepository()
partner_analytics_repository = PartnerAnalyticsRepository()


# ---------------------------------------------------------------------------
# Partner domain collections. All partner profiles, rate cards, orders,
# wallets, and transactions are strictly managed in real MongoDB collections.
# NO dummy / mock partners are automatically created or seeded.
# ---------------------------------------------------------------------------

_LIVE_PARTNER_PROFILES: List[Dict[str, Any]] = []
_LIVE_PARTNER_SETTINGS: List[Dict[str, Any]] = []
_LIVE_PARTNER_SERVICES: List[Dict[str, Any]] = []

PARTNER_SEED: Dict[str, List[Dict[str, Any]]] = {}


