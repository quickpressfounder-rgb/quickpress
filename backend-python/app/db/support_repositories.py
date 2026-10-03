"""Help Center / support repository — Sprint 2.11.

MongoDB collections
-------------------
`faq_categories`   seeded catalogue used by the category filter.

    { "_id": "orders", "name": "Orders & Delivery", "description": "…",
      "icon": "package", "order": 1 }

`faqs`             seeded question / answer content.

    { "_id": "faq-track-order", "category_id": "orders",
      "question": "…", "answer": "…", "tags": ["track"], "order": 1 }

`support_tickets`  one document per raised ticket, scoped to the customer.

    { "_id": "tkt-<uuid>", "user_id": "…", "ticket_number": "TKT-100234",
      "category": "order", "subject": "…", "description": "…",
      "priority": "medium", "status": "open", "order_id": null,
      "attachment_name": null, "created_at": "…", "updated_at": "…",
      "last_message_at": "…" }

`support_messages` append-only conversation thread for a ticket.

    { "_id": "msg-<uuid>", "ticket_id": "tkt-…", "user_id": "…",
      "author": "customer" | "support" | "system", "author_name": "…",
      "body": "…", "attachment_name": null, "created_at": "…" }

Chat architecture note
----------------------
`support_messages` is already an append-only, ticket-scoped, timestamp-ordered
log — exactly the shape a websocket / change-stream consumer needs. Real-time
chat in a later sprint only adds a transport on top of `add_message()`; no
document or API contract changes.

Business rules enforced here
----------------------------
* Tickets and messages are strictly scoped to `user_id` — cross-customer reads
  return 404 rather than 403 so ids are not enumerable.
* Replying to a resolved / closed ticket reopens it as `awaiting-customer` →
  `open`, so a customer is never stuck without a channel.
* Every ticket starts with a system acknowledgement message, so the
  conversation view is never empty.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from app.core.redis_cache import hybrid_cache
from app.db.client import database
from app.models.support import (
    CreateTicketPayload,
    Faq,
    FaqCategoriesResponse,
    FaqCategory,
    FaqListResponse,
    SupportTicket,
    TicketListResponse,
    TicketMessage,
    TicketReplyPayload,
)
from app.models.user import User, utcnow

logger = logging.getLogger(__name__)

CATEGORIES = "faq_categories"
FAQS = "faqs"
TICKETS = "support_tickets"
MESSAGES = "support_messages"

CATEGORY_LABELS: Dict[str, str] = {
    "order": "Order Related",
    "payment": "Payment Related",
    "refund": "Refund Related",
    "partner-complaint": "Partner Complaint",
    "general": "General Issue",
}

FIRST_RESPONSE = (
    "Thanks for reaching out — your ticket is with our support team. "
    "You'll get a reply here within 24 hours."
)

FAQ_CATEGORY_SEED: List[Dict[str, Any]] = [
    {"_id": "orders", "name": "Orders & Delivery", "description": "Pickups, delivery slots and tracking", "icon": "package", "order": 1},
    {"_id": "payments", "name": "Payments & Wallet", "description": "Paying, wallet top-ups and receipts", "icon": "credit-card", "order": 2},
    {"_id": "refunds", "name": "Refunds & Cancellation", "description": "Cancelling orders and getting money back", "icon": "refresh-ccw", "order": 3},
    {"_id": "invoices", "name": "Invoices & GST", "description": "Downloading and sharing tax invoices", "icon": "file-text", "order": 4},
    {"_id": "membership", "name": "Membership & Offers", "description": "Plans, benefits and coupons", "icon": "sparkles", "order": 5},
    {"_id": "account", "name": "Account & Privacy", "description": "Profile, addresses and data", "icon": "settings", "order": 6},
]

FAQ_SEED: List[Dict[str, Any]] = [
    {"_id": "faq-track", "category_id": "orders", "question": "How do I track my laundry order?", "answer": "Open Orders from the bottom navigation and tap any active order. The live tracking screen shows pickup, in-store processing and delivery in real time.", "tags": ["track", "order", "delivery"], "order": 1},
    {"_id": "faq-reschedule", "category_id": "orders", "question": "Can I reschedule a pickup slot?", "answer": "Yes. Until the rider is assigned you can reschedule from the order screen. After assignment, raise an Order Related ticket and support will move the slot for you.", "tags": ["pickup", "slot"], "order": 2},
    {"_id": "faq-delay", "category_id": "orders", "question": "My pickup is delayed. What should I do?", "answer": "Delays are usually under 30 minutes at peak hours. If it has been longer, raise an Order Related ticket with your order number and we'll dispatch another rider.", "tags": ["delay"], "order": 3},
    {"_id": "faq-payment-methods", "category_id": "payments", "question": "Which payment methods can I use?", "answer": "Cash on Delivery and the QuickPress Wallet are live today. UPI, cards and Razorpay are wired and switch on once online payments are enabled for your city.", "tags": ["payment", "upi", "wallet"], "order": 1},
    {"_id": "faq-wallet-topup", "category_id": "payments", "question": "How do I add money to my wallet?", "answer": "Go to Wallet, tap Add Funds and pick a quick amount or enter your own. The balance updates instantly and every top-up appears in your transaction history.", "tags": ["wallet", "add funds"], "order": 2},
    {"_id": "faq-payment-failed", "category_id": "payments", "question": "My payment failed but money was deducted.", "answer": "Failed payments are auto-reversed by your bank within 5–7 working days. Raise a Payment Related ticket with the transaction id and we'll follow it up for you.", "tags": ["failed", "deducted"], "order": 3},
    {"_id": "faq-cancel", "category_id": "refunds", "question": "How do I cancel an order?", "answer": "You can cancel free of charge any time before pickup from the order screen. Once your clothes reach the store, cancellation is handled by support.", "tags": ["cancel"], "order": 1},
    {"_id": "faq-refund-time", "category_id": "refunds", "question": "How long does a refund take?", "answer": "Wallet refunds are instant. Refunds to a bank account or card take 5–7 working days depending on your bank.", "tags": ["refund", "time"], "order": 2},
    {"_id": "faq-damaged", "category_id": "refunds", "question": "An item came back damaged or missing.", "answer": "Raise a Partner Complaint ticket within 48 hours of delivery with a photo. Verified claims are compensated up to 10x the service value of the item.", "tags": ["damage", "missing"], "order": 3},
    {"_id": "faq-invoice-download", "category_id": "invoices", "question": "Where can I download my invoice?", "answer": "Every order gets a GST invoice. Open Invoices from the Help Center or your profile, pick the invoice and tap Download PDF.", "tags": ["invoice", "download", "pdf"], "order": 1},
    {"_id": "faq-invoice-gst", "category_id": "invoices", "question": "Does the invoice include GST details?", "answer": "Yes. Each invoice shows the QuickPress GSTIN, place of supply, HSN code and the CGST / SGST split at the applicable rate.", "tags": ["gst", "tax"], "order": 2},
    {"_id": "faq-invoice-share", "category_id": "invoices", "question": "Can I share an invoice with someone else?", "answer": "Open the invoice and tap Share. You can send it over WhatsApp, email or copy a link for your records or for reimbursement.", "tags": ["share"], "order": 3},
    {"_id": "faq-membership", "category_id": "membership", "question": "What do I get with a membership?", "answer": "Paid plans include free pickup and delivery, extra discounts, priority processing and priority support. Compare all plans on the Membership screen.", "tags": ["membership", "plan"], "order": 1},
    {"_id": "faq-coupon", "category_id": "membership", "question": "My coupon code isn't applying.", "answer": "Check the minimum order value and the expiry date on the Offers screen. If it still fails, raise a General Issue ticket with the code and we'll fix it.", "tags": ["coupon", "offer"], "order": 2},
    {"_id": "faq-address", "category_id": "account", "question": "How do I change my default address?", "answer": "Open Addresses from your profile, tap any saved address and set it as default. Checkout will use it automatically from your next order.", "tags": ["address"], "order": 1},
    {"_id": "faq-delete-account", "category_id": "account", "question": "How do I delete my account?", "answer": "Raise a General Issue ticket asking for account deletion. We remove personal data within 30 days, keeping only invoices required by tax law.", "tags": ["delete", "privacy"], "order": 2},
]

#: Consumed by the FastAPI startup seed loop in `app.main`.
SUPPORT_SEED: Dict[str, List[Dict[str, Any]]] = {
    CATEGORIES: FAQ_CATEGORY_SEED,
    FAQS: FAQ_SEED,
}


class SupportError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    return value if isinstance(value, str) else value.isoformat()


class SupportRepository:
    async def ensure_seed(self) -> None:
        """Upsert support seed documents and invalidate cache."""
        for name, documents in SUPPORT_SEED.items():
            collection = database.collection(name)
            for document in documents:
                await collection.update_one(
                    {"_id": document["_id"]},
                    {"$set": {k: v for k, v in document.items() if k != "_id"}},
                    upsert=True,
                )
        await hybrid_cache.delete_pattern("support:*")

    # ------------------------------------------------------------------ FAQs
    async def categories(self) -> FaqCategoriesResponse:
        cached = await hybrid_cache.get("support:categories")
        if cached is not None and isinstance(cached, dict):
            try:
                return FaqCategoriesResponse(**cached)
            except Exception:
                pass

        documents = await database.find_many(CATEGORIES, {}, sort_key="order")
        if not documents:
            documents = FAQ_CATEGORY_SEED
        faqs = await database.find_many(FAQS, {})
        if not faqs:
            faqs = FAQ_SEED
        counts: Dict[str, int] = {}
        for faq in faqs:
            key = str(faq.get("category_id") or "general")
            counts[key] = counts.get(key, 0) + 1
        items = [
            FaqCategory(
                id=str(document["_id"]),
                name=document.get("name") or str(document["_id"]),
                description=document.get("description") or "",
                icon=document.get("icon") or "life-buoy",
                order=int(document.get("order") or 0),
                faqCount=counts.get(str(document["_id"]), 0),
            )
            for document in documents
        ]
        resp = FaqCategoriesResponse(items=items, total=len(items))
        await hybrid_cache.set("support:categories", resp.model_dump(), ttl_seconds=600)
        return resp

    async def faqs(self, *, category_id: Optional[str] = None, q: Optional[str] = None) -> FaqListResponse:
        cache_key = f"support:faqs:{category_id or ''}:{q or ''}"
        cached = await hybrid_cache.get(cache_key)
        if cached is not None and isinstance(cached, dict):
            try:
                return FaqListResponse(**cached)
            except Exception:
                pass

        categories = await self.categories()
        names = {category.id: category.name for category in categories.items}
        documents = await database.find_many(FAQS, {}, sort_key="order")
        if not documents:
            documents = FAQ_SEED
        items = [
            Faq(
                id=str(document["_id"]),
                categoryId=str(document.get("category_id") or "general"),
                categoryName=names.get(str(document.get("category_id") or ""), "General"),
                question=document.get("question") or "",
                answer=document.get("answer") or "",
                tags=list(document.get("tags") or []),
                order=int(document.get("order") or 0),
                helpfulCount=int(document.get("helpful_count") or 0),
            )
            for document in documents
        ]
        if category_id and category_id != "all":
            items = [faq for faq in items if faq.categoryId == category_id]
        if q:
            needle = q.strip().lower()
            items = [
                faq
                for faq in items
                if needle in faq.question.lower()
                or needle in faq.answer.lower()
                or any(needle in tag.lower() for tag in faq.tags)
            ]
        resp = FaqListResponse(items=items, total=len(items), categories=categories.items)
        await hybrid_cache.set(cache_key, resp.model_dump(), ttl_seconds=600)
        return resp

    # --------------------------------------------------------------- tickets
    async def _next_ticket_number(self) -> str:
        collection = database.collection("counters")
        document = await collection.find_one({"_id": "support_ticket"})
        value = int((document or {}).get("value", 100000)) + 1
        await collection.update_one(
            {"_id": "support_ticket"}, {"$set": {"value": value}}, upsert=True
        )
        return f"TKT-{value}"

    async def _messages(self, ticket_id: str) -> List[TicketMessage]:
        documents = await database.find_many(MESSAGES, {"ticket_id": ticket_id})
        documents.sort(key=lambda doc: str(doc.get("created_at") or ""))
        return [
            TicketMessage(
                id=str(document["_id"]),
                ticketId=ticket_id,
                author=document.get("author") or "customer",
                authorName=document.get("author_name") or "",
                body=document.get("body") or "",
                attachmentName=document.get("attachment_name"),
                createdAt=_iso(document.get("created_at")) or "",
            )
            for document in documents
        ]

    async def _to_model(self, document: Dict[str, Any], *, with_messages: bool) -> SupportTicket:
        ticket_id = str(document["_id"])
        messages = await self._messages(ticket_id) if with_messages else []
        message_count = (
            len(messages)
            if with_messages
            else await database.collection(MESSAGES).count_documents({"ticket_id": ticket_id})
        )
        return SupportTicket(
            id=ticket_id,
            ticketNumber=document.get("ticket_number") or ticket_id,
            category=document.get("category") or "general",
            categoryLabel=CATEGORY_LABELS.get(str(document.get("category") or "general"), "General Issue"),
            subject=document.get("subject") or "",
            description=document.get("description") or "",
            priority=document.get("priority") or "medium",
            status=document.get("status") or "open",
            orderId=document.get("order_id"),
            orderNumber=document.get("order_number"),
            attachmentName=document.get("attachment_name"),
            messageCount=int(message_count or 0),
            unreadCount=int(document.get("unread_count") or 0),
            lastMessageAt=_iso(document.get("last_message_at")),
            createdAt=_iso(document.get("created_at")) or "",
            updatedAt=_iso(document.get("updated_at")),
            messages=messages,
        )

    async def add_message(
        self,
        ticket_id: str,
        *,
        user_id: str,
        author: str,
        author_name: str,
        body: str,
        attachment_name: Optional[str] = None,
    ) -> TicketMessage:
        """Single seam a real-time transport will hook into later."""
        now = _iso(utcnow())
        document = {
            "_id": f"msg-{uuid.uuid4().hex[:12]}",
            "ticket_id": ticket_id,
            "user_id": user_id,
            "author": author,
            "author_name": author_name,
            "body": body,
            "attachment_name": attachment_name,
            "created_at": now,
        }
        await database.collection(MESSAGES).insert_one(document)
        await database.collection(TICKETS).update_one(
            {"_id": ticket_id}, {"$set": {"last_message_at": now, "updated_at": now}}
        )
        return TicketMessage(
            id=str(document["_id"]),
            ticketId=ticket_id,
            author=author,  # type: ignore[arg-type]
            authorName=author_name,
            body=body,
            attachmentName=attachment_name,
            createdAt=now or "",
        )

    async def create_ticket(self, user: User, payload: CreateTicketPayload) -> SupportTicket:
        now = _iso(utcnow())
        ticket_id = f"tkt-{uuid.uuid4().hex[:12]}"
        order_number: Optional[str] = None
        if payload.orderId:
            order = await database.collection("orders").find_one({"_id": payload.orderId})
            if order is None or order.get("userId") != user.id:
                raise SupportError("Order not found", 404)
            order_number = str(order.get("code") or order.get("_id"))

        document = {
            "_id": ticket_id,
            "user_id": user.id,
            "ticket_number": await self._next_ticket_number(),
            "category": payload.category,
            "subject": payload.subject.strip(),
            "description": payload.description.strip(),
            "priority": payload.priority,
            "status": "open",
            "order_id": payload.orderId,
            "order_number": order_number,
            "attachment_name": payload.attachmentName,
            "unread_count": 0,
            "created_at": now,
            "updated_at": now,
            "last_message_at": now,
        }
        await database.collection(TICKETS).insert_one(document)
        await self.add_message(
            ticket_id,
            user_id=user.id,
            author="customer",
            author_name=user.name or "You",
            body=payload.description.strip(),
            attachment_name=payload.attachmentName,
        )
        await self.add_message(
            ticket_id,
            user_id=user.id,
            author="system",
            author_name="QuickPress Support",
            body=FIRST_RESPONSE,
        )

        # 1. Notify Admin Panel in real time via admin_notifications
        try:
            await database.collection("admin_notifications").insert_one({
                "_id": f"notif-{uuid.uuid4().hex[:12]}",
                "type": "support_ticket",
                "title": f"New Support Ticket: {payload.subject.strip()[:60]}",
                "message": f"Customer {user.name or user.phone or 'Customer'} raised #{document['ticket_number']}: {payload.description.strip()[:90]}",
                "category": "support",
                "priority": (payload.priority or "medium").capitalize(),
                "ticketId": ticket_id,
                "ticketNumber": document["ticket_number"],
                "read": False,
                "createdAt": now,
            })
        except Exception as e:
            logger.warning("Could not dispatch admin_notifications for ticket %s: %s", ticket_id, e)

        # 2. Mirror into admin_support_tickets for instant multi-role visibility
        try:
            await database.collection("admin_support_tickets").insert_one({
                "_id": ticket_id,
                "id": ticket_id,
                "ticketNumber": document["ticket_number"],
                "subject": payload.subject.strip(),
                "description": payload.description.strip(),
                "raisedBy": user.name or "Customer",
                "phone": user.phone or "+91 98719 62596",
                "email": user.email or "",
                "userId": user.id,
                "role": "Customer",
                "source": "Customer",
                "priority": (payload.priority or "Medium").capitalize(),
                "status": "Open",
                "category": payload.category or "General Issue",
                "refOrder": payload.orderId or "—",
                "city": getattr(user, "city", None) or "Kasganj",
                "assignee": "Himanshu (Lead Admin)",
                "compensationAmount": 0.0,
                "createdAt": now,
                "updatedAt": now,
                "replies": [
                    {
                        "_id": f"msg-{uuid.uuid4().hex[:8]}",
                        "author": user.name or "Customer",
                        "role": "Customer",
                        "body": payload.description.strip(),
                        "at": now,
                    }
                ],
            })
        except Exception as e:
            logger.warning("Could not mirror ticket %s into admin_support_tickets: %s", ticket_id, e)

        refreshed = await database.collection(TICKETS).find_one({"_id": ticket_id})
        return await self._to_model(refreshed or document, with_messages=True)

    async def list_tickets(self, user: User, *, status: Optional[str] = None) -> TicketListResponse:
        documents = await database.find_many(TICKETS, {"user_id": user.id})
        documents.sort(key=lambda doc: str(doc.get("created_at") or ""), reverse=True)
        tickets = [await self._to_model(document, with_messages=False) for document in documents]
        open_count = sum(1 for ticket in tickets if ticket.status in ("open", "in-progress", "awaiting-customer"))
        resolved_count = sum(1 for ticket in tickets if ticket.status in ("resolved", "closed"))
        if status and status != "all":
            tickets = [ticket for ticket in tickets if ticket.status == status]
        return TicketListResponse(
            items=tickets,
            total=len(tickets),
            openCount=open_count,
            resolvedCount=resolved_count,
        )

    async def get_ticket(self, user: User, ticket_id: str) -> SupportTicket:
        collection = database.collection(TICKETS)
        document = await collection.find_one({"_id": ticket_id})
        if document is None:
            document = await collection.find_one({"ticket_number": ticket_id})
        if document is None or document.get("user_id") != user.id:
            raise SupportError("Ticket not found", 404)
        return await self._to_model(document, with_messages=True)

    async def reply(self, user: User, ticket_id: str, payload: TicketReplyPayload) -> SupportTicket:
        ticket = await self.get_ticket(user, ticket_id)
        if ticket.status == "closed":
            # A closed ticket reopens on a customer reply rather than rejecting it.
            await database.collection(TICKETS).update_one(
                {"_id": ticket.id}, {"$set": {"status": "open"}}
            )
        elif ticket.status in ("resolved", "awaiting-customer"):
            await database.collection(TICKETS).update_one(
                {"_id": ticket.id}, {"$set": {"status": "in-progress"}}
            )
        await self.add_message(
            ticket.id,
            user_id=user.id,
            author="customer",
            author_name=user.name or "You",
            body=payload.body.strip(),
            attachment_name=payload.attachmentName,
        )
        return await self.get_ticket(user, ticket.id)


support_repository = SupportRepository()
