"""Notification repository — Sprint 2.7.

Collection
----------
`notifications`  one document per notification, per user.

    {
      "_id":        "ntf-<uuid>",
      "user_id":    "<users._id>",
      "role":       "customer",
      "kind":       "out-for-delivery",
      "category":   "order",
      "title":      "Out for delivery",
      "description":"Your order is on its way.",
      "created_at": "2026-08-05T09:10:00+00:00",
      "read":       false,
      "read_at":    null,
      "order_id":   "ord-1029" | null,
      "order_code": "QP-1029" | null
    }

Reads are always scoped to the signed-in user, support search + type filter and
are paginated. Nothing is ever returned across users.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.models.notification import (
    CATEGORY_BY_KIND,
    NotificationItem,
    NotificationListResponse,
)
from app.models.user import utcnow

COLLECTION = "notifications"


def category_for(kind: str) -> str:
    return CATEGORY_BY_KIND.get(kind, "system")


def _iso(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value or utcnow().isoformat())


def to_item(document: Dict[str, Any]) -> NotificationItem:
    kind = document.get("kind") or "system"
    return NotificationItem(
        id=str(document.get("_id")),
        accountId=str(document.get("user_id") or ""),
        role=str(document.get("role") or "customer"),
        kind=kind if kind in CATEGORY_BY_KIND else "system",
        category=document.get("category") or category_for(kind),
        title=str(document.get("title") or ""),
        description=str(document.get("description") or ""),
        createdAt=_iso(document.get("created_at")),
        read=bool(document.get("read")),
        orderId=document.get("order_id"),
        orderCode=document.get("order_code"),
    )


class NotificationRepository:
    @property
    def _c(self):
        return database.collection(COLLECTION)

    async def _all_for(self, user_id: str) -> List[Dict[str, Any]]:
        documents = await database.find_many(COLLECTION, {"user_id": user_id})
        documents.sort(key=lambda doc: _iso(doc.get("created_at")), reverse=True)
        return documents

    async def create(
        self,
        user_id: str,
        *,
        kind: str,
        title: str,
        description: str = "",
        role: str = "customer",
        order_id: Optional[str] = None,
        order_code: Optional[str] = None,
    ) -> NotificationItem:
        document = {
            "_id": f"ntf-{uuid.uuid4().hex[:16]}",
            "user_id": user_id,
            "role": role,
            "kind": kind,
            "category": category_for(kind),
            "title": title,
            "description": description,
            "created_at": utcnow().isoformat(),
            "read": False,
            "read_at": None,
            "order_id": order_id,
            "order_code": order_code,
        }
        await self._c.insert_one(document)
        return to_item(document)

    async def list(
        self,
        user_id: str,
        *,
        page: int = 1,
        limit: int = 15,
        search: str = "",
        type_filter: str = "all",
    ) -> NotificationListResponse:
        documents = await self._all_for(user_id)
        unread = sum(1 for doc in documents if not doc.get("read"))

        needle = (search or "").strip().lower()
        wanted = (type_filter or "all").strip().lower()

        def matches(doc: Dict[str, Any]) -> bool:
            category = doc.get("category") or category_for(str(doc.get("kind")))
            if wanted and wanted != "all" and category != wanted:
                return False
            if not needle:
                return True
            haystack = " ".join(
                str(doc.get(key) or "") for key in ("title", "description", "order_code")
            ).lower()
            return needle in haystack

        matching = [doc for doc in documents if matches(doc)]
        page = max(1, page)
        limit = max(1, min(limit, 50))
        window = matching[(page - 1) * limit : page * limit]

        return NotificationListResponse(
            items=[to_item(doc) for doc in window],
            page=page,
            limit=limit,
            total=len(matching),
            hasMore=page * limit < len(matching),
            unread=unread,
        )

    async def unread_count(self, user_id: str) -> int:
        return await self._c.count_documents({"user_id": user_id, "read": False})

    async def mark_read(self, user_id: str, notification_id: str) -> bool:
        document = await self._c.find_one({"_id": notification_id, "user_id": user_id})
        if not document:
            return False
        await self._c.update_one(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"read": True, "read_at": utcnow().isoformat()}},
        )
        return True

    async def mark_all_read(self, user_id: str) -> int:
        documents = await self._all_for(user_id)
        changed = 0
        for document in documents:
            if document.get("read"):
                continue
            await self._c.update_one(
                {"_id": document.get("_id"), "user_id": user_id},
                {"$set": {"read": True, "read_at": utcnow().isoformat()}},
            )
            changed += 1
        return changed

    async def delete(self, user_id: str, notification_id: str) -> bool:
        removed = await self._c.delete_many({"_id": notification_id, "user_id": user_id})
        return bool(removed)

    async def _all_for_partner(self, user_id: str, partner_id: Optional[str] = None) -> List[Dict[str, Any]]:
        ids = [str(user_id)] if user_id else []
        if partner_id:
            p_str = str(partner_id).strip()
            if p_str and p_str not in ids:
                ids.append(p_str)
            if p_str.upper().startswith("PRT-"):
                raw_num = p_str[4:]
                if raw_num and raw_num not in ids:
                    ids.append(raw_num)
            elif p_str.isalnum():
                prefixed = f"PRT-{p_str}"
                if prefixed not in ids:
                    ids.append(prefixed)

        query = {
            "$or": [
                {"user_id": {"$in": ids}},
                {"accountId": {"$in": ids}},
                {"partner_id": {"$in": ids}},
                {"partnerId": {"$in": ids}},
                {"audience": {"$in": ["all", "everyone", "partner", "partners", "all_partner"]}},
                {"role": "partner", "user_id": {"$in": [*ids, "all"]}},
            ]
        }
        documents = await database.find_many(COLLECTION, query)
        seen = set()
        deduped = []
        for doc in documents:
            doc_id = str(doc.get("_id") or doc.get("id") or "")
            if doc_id and doc_id in seen:
                continue
            if doc_id:
                seen.add(doc_id)
            deduped.append(doc)

        deduped.sort(key=lambda doc: _iso(doc.get("created_at") or doc.get("createdAt")), reverse=True)
        return deduped

    async def list_for_partner(
        self,
        user_id: str,
        partner_id: Optional[str] = None,
        *,
        page: int = 1,
        limit: int = 50,
        search: str = "",
        type_filter: str = "all",
    ) -> List[Dict[str, Any]]:
        documents = await self._all_for_partner(user_id, partner_id)
        needle = (search or "").strip().lower()
        wanted = (type_filter or "all").strip().lower()

        def map_kind(doc: Dict[str, Any]) -> str:
            raw_kind = str(doc.get("kind") or "").lower().strip()
            cat = str(doc.get("category") or "").lower().strip()
            title = str(doc.get("title") or "").lower()

            if any(k in raw_kind for k in ("order", "pickup", "delivered", "rider", "processing", "accepted")):
                return "order"
            if any(k in raw_kind for k in ("payout", "wallet", "settle", "transfer", "withdraw")):
                return "payout"
            if any(k in raw_kind for k in ("promo", "offer", "discount", "sale", "campaign", "broadcast")) or cat in ("promotional", "promo", "offer"):
                return "promo"
            if "payout" in title or "settle" in title or "wallet" in title or "earning" in title:
                return "payout"
            if "order" in title or "cloth" in title or "garment" in title or "pickup" in title:
                return "order"
            if "offer" in title or "discount" in title or "deal" in title or "voucher" in title:
                return "promo"
            return "alert"

        results = []
        for doc in documents:
            k = map_kind(doc)
            if wanted and wanted != "all" and k != wanted:
                continue
            if needle:
                haystack = f"{doc.get('title', '')} {doc.get('description', '')} {doc.get('message', '')} {doc.get('order_code', '')}".lower()
                if needle not in haystack:
                    continue
            results.append({
                "id": str(doc.get("_id") or doc.get("id")),
                "title": str(doc.get("title") or "Store Notification"),
                "body": str(doc.get("description") or doc.get("message") or doc.get("body") or ""),
                "date": _iso(doc.get("created_at") or doc.get("createdAt")),
                "read": bool(doc.get("read")),
                "kind": k,
                "category": str(doc.get("category") or "system"),
                "orderId": doc.get("order_id") or doc.get("orderId"),
                "orderCode": doc.get("order_code") or doc.get("orderCode"),
            })

        page = max(1, page)
        limit = max(1, min(limit, 100))
        return results[(page - 1) * limit : page * limit]

    async def unread_count_for_partner(self, user_id: str, partner_id: Optional[str] = None) -> int:
        documents = await self._all_for_partner(user_id, partner_id)
        return sum(1 for doc in documents if not doc.get("read"))

    async def mark_read_for_partner(self, user_id: str, partner_id: Optional[str], notification_id: str) -> bool:
        ids = [str(user_id)] if user_id else []
        if partner_id:
            ids.append(str(partner_id))
            p_str = str(partner_id).strip()
            if p_str.upper().startswith("PRT-"):
                ids.append(p_str[4:])
            elif p_str.isalnum():
                ids.append(f"PRT-{p_str}")

        query = {
            "_id": notification_id,
            "$or": [
                {"user_id": {"$in": ids}},
                {"accountId": {"$in": ids}},
                {"partner_id": {"$in": ids}},
                {"partnerId": {"$in": ids}},
                {"audience": {"$in": ["all", "everyone", "partner", "partners", "all_partner"]}},
            ],
        }
        res = await self._c.update_one(query, {"$set": {"read": True, "read_at": utcnow().isoformat()}})
        return bool(res)

    async def mark_all_read_for_partner(self, user_id: str, partner_id: Optional[str]) -> int:
        documents = await self._all_for_partner(user_id, partner_id)
        changed = 0
        for doc in documents:
            if doc.get("read"):
                continue
            doc_id = str(doc.get("_id") or doc.get("id"))
            if doc_id:
                await self._c.update_one({"_id": doc_id}, {"$set": {"read": True, "read_at": utcnow().isoformat()}})
                changed += 1
        return changed


notification_repository = NotificationRepository()
