"""QuickPress Email Surveillance & Audit Repository (Supabase / MongoDB).

Maintains complete historical audit trail for all outbound transactional and
manual emails, tracking delivery status, rendered HTML previews, recipient metadata,
and live Socket.IO broadcasts to the Admin Surveillance Console.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.db.client import database
from app.services.socket_service import sio

logger = logging.getLogger(__name__)

EMAIL_LOGS_COLLECTION = "email_logs"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EmailRepository:
    """Repository managing audit trail, queries, and analytics for all platform emails."""

    async def log_email(
        self,
        recipient: str,
        subject: str,
        html_body: str,
        plain_text: Optional[str] = None,
        recipient_name: Optional[str] = None,
        audience: str = "customer",  # "customer" | "partner" | "rider" | "admin"
        category: str = "order",     # "order" | "finance" | "onboarding" | "security" | "alert" | "manual"
        status: str = "sent",        # "sent" | "failed"
        method: str = "smtp",        # "smtp" | "resend"
        sender: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        is_reply: bool = False,
        reply_to_id: Optional[str] = None,
        has_attachment: bool = False,
        attachment_name: Optional[str] = None,
        cc: Optional[List[str] | str] = None,
        email_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record an outbound email dispatch in the database and emit real-time event."""
        clean_id = email_id or f"eml-{uuid.uuid4().hex[:12]}"
        created_at = now_iso()

        clean_cc: List[str] = []
        if cc:
            if isinstance(cc, str):
                clean_cc = [c.strip().lower() for c in cc.split(",") if c.strip()]
            elif isinstance(cc, list):
                clean_cc = [str(c).strip().lower() for c in cc if str(c).strip()]

        email_doc: Dict[str, Any] = {
            "_id": clean_id,
            "id": clean_id,
            "recipient": recipient.strip().lower(),
            "recipientName": recipient_name or recipient.split("@")[0].capitalize(),
            "cc": clean_cc,
            "audience": audience.strip().lower(),
            "category": category.strip().lower(),
            "subject": subject,
            "htmlBody": html_body,
            "plainText": plain_text or "",
            "status": status,
            "method": method,
            "sender": sender or "official.quickpress@gmail.com",
            "errorMessage": error_message,
            "metadata": metadata or {},
            "isReply": is_reply,
            "replyToId": reply_to_id,
            "hasAttachment": has_attachment,
            "attachmentName": attachment_name,
            "createdAt": created_at,
            "updatedAt": created_at,
        }

        try:
            await database.insert_one(EMAIL_LOGS_COLLECTION, email_doc)
        except Exception as exc:
            logger.error("Failed to insert email log in database: %s", exc, exc_info=True)

        # Broadcast live event to admin socket room
        try:
            summary = {
                "id": clean_id,
                "recipient": email_doc["recipient"],
                "recipientName": email_doc["recipientName"],
                "audience": email_doc["audience"],
                "category": email_doc["category"],
                "subject": email_doc["subject"],
                "status": email_doc["status"],
                "hasAttachment": email_doc["hasAttachment"],
                "createdAt": created_at,
            }
            await sio.emit("email.dispatched", summary, room="admin")
        except Exception as err:
            logger.debug("Socket broadcast for email log skipped: %s", err)

        return email_doc

    async def find_emails(
        self,
        audience: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """Query email logs with optional filtering and search."""
        query: Dict[str, Any] = {}

        if audience and audience.lower() not in ("all", "*"):
            query["audience"] = audience.lower().strip()

        if category and category.lower() not in ("all", "*"):
            query["category"] = category.lower().strip()

        if status and status.lower() not in ("all", "*"):
            query["status"] = status.lower().strip()

        if search and search.strip():
            term = search.strip().lower()
            query["$or"] = [
                {"recipient": {"$regex": term, "$options": "i"}},
                {"recipientName": {"$regex": term, "$options": "i"}},
                {"subject": {"$regex": term, "$options": "i"}},
                {"orderCode": {"$regex": term, "$options": "i"}},
                {"metadata.orderCode": {"$regex": term, "$options": "i"}},
            ]

        docs = await database.find_sorted(
            EMAIL_LOGS_COLLECTION,
            query,
            sort=[("createdAt", -1)],
            skip=skip,
            limit=limit,
        )

        # Ensure id is always stringified
        cleaned: List[Dict[str, Any]] = []
        for doc in docs:
            doc["id"] = str(doc.get("_id") or doc.get("id"))
            cleaned.append(doc)
        return cleaned

    async def get_by_id(self, email_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single email log by ID including full rendered HTML."""
        doc = await database.find_one(
            EMAIL_LOGS_COLLECTION,
            {"$or": [{"_id": email_id}, {"id": email_id}]},
        )
        if doc:
            doc["id"] = str(doc.get("_id") or doc.get("id"))
        return doc

    async def record_open(
        self,
        email_id: str,
        ip: str = "127.0.0.1",
        user_agent: str = "Unknown",
    ) -> Optional[Dict[str, Any]]:
        """Record an open event triggered by the 1x1 tracking pixel."""
        clean_id = email_id.strip()
        doc = await self.get_by_id(clean_id)
        if not doc:
            return None

        now = now_iso()
        first_opened = doc.get("firstOpenedAt") or now
        current_opens = int(doc.get("openCount") or 0) + 1

        open_event = {
            "timestamp": now,
            "ip": ip,
            "userAgent": user_agent,
        }

        existing_events = list(doc.get("openEvents") or [])
        existing_events.append(open_event)

        update_fields: Dict[str, Any] = {
            "opened": True,
            "openCount": current_opens,
            "firstOpenedAt": first_opened,
            "lastOpenedAt": now,
            "openEvents": existing_events[-20:],  # keep last 20 events
            "updatedAt": now,
        }

        await database.update_one(
            EMAIL_LOGS_COLLECTION,
            {"$or": [{"_id": clean_id}, {"id": clean_id}]},
            {"$set": update_fields},
        )

        # Broadcast live open event to admin console
        try:
            await sio.emit(
                "email.opened",
                {
                    "id": clean_id,
                    "recipient": doc.get("recipient"),
                    "subject": doc.get("subject"),
                    "openCount": current_opens,
                    "lastOpenedAt": now,
                },
                room="admin",
            )
        except Exception as err:
            logger.debug("Socket emit email.opened failed: %s", err)

        doc.update(update_fields)
        return doc

    async def record_click(
        self,
        email_id: str,
        target_url: str,
        ip: str = "127.0.0.1",
        user_agent: str = "Unknown",
    ) -> Optional[Dict[str, Any]]:
        """Record a link click event from CTA wrapper."""
        clean_id = email_id.strip()
        doc = await self.get_by_id(clean_id)
        if not doc:
            return None

        now = now_iso()
        click_event = {
            "url": target_url,
            "timestamp": now,
            "ip": ip,
            "userAgent": user_agent,
        }

        existing_clicks = list(doc.get("clicks") or [])
        existing_clicks.append(click_event)

        update_fields: Dict[str, Any] = {
            "clicked": True,
            "lastClickedAt": now,
            "clickCount": int(doc.get("clickCount") or 0) + 1,
            "clicks": existing_clicks[-20:],
            "updatedAt": now,
        }

        await database.update_one(
            EMAIL_LOGS_COLLECTION,
            {"$or": [{"_id": clean_id}, {"id": clean_id}]},
            {"$set": update_fields},
        )

        try:
            await sio.emit(
                "email.clicked",
                {
                    "id": clean_id,
                    "recipient": doc.get("recipient"),
                    "url": target_url,
                    "lastClickedAt": now,
                },
                room="admin",
            )
        except Exception as err:
            logger.debug("Socket emit email.clicked failed: %s", err)

        doc.update(update_fields)
        return doc

    async def get_thread(self, email_id: str) -> List[Dict[str, Any]]:
        """Retrieve complete conversation thread between admin and recipient."""
        clean_id = email_id.strip()
        root = await self.get_by_id(clean_id)
        if not root:
            return []

        # Find all messages related to this thread
        parent_id = root.get("replyToId") or clean_id
        docs = await database.find_sorted(
            EMAIL_LOGS_COLLECTION,
            {
                "$or": [
                    {"_id": parent_id},
                    {"id": parent_id},
                    {"replyToId": parent_id},
                    {"_id": clean_id},
                    {"replyToId": clean_id},
                ]
            },
            sort=[("createdAt", 1)],
            limit=50,
        )

        seen_ids = set()
        thread: List[Dict[str, Any]] = []
        for d in docs:
            did = str(d.get("_id") or d.get("id"))
            if did not in seen_ids:
                seen_ids.add(did)
                d["id"] = did
                thread.append(d)
        return thread

    # =========================================================================
    # TEMPLATE STUDIO METHODS
    # =========================================================================
    async def list_templates(self) -> List[Dict[str, Any]]:
        """Return all customizable templates with fallback defaults."""
        docs = await database.find_many("email_templates", {})
        templates_map = {d.get("id"): d for d in docs if d.get("id")}

        result = []
        for default_tmpl in DEFAULT_SYSTEM_TEMPLATES:
            tid = default_tmpl["id"]
            if tid in templates_map:
                merged = dict(default_tmpl)
                merged.update(templates_map[tid])
                merged["isCustomized"] = True
                result.append(merged)
            else:
                default_copy = dict(default_tmpl)
                default_copy["isCustomized"] = False
                result.append(default_copy)
        return result

    async def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template by ID, falling back to default configuration."""
        doc = await database.find_one("email_templates", {"_id": template_id})
        default_tmpl = next((t for t in DEFAULT_SYSTEM_TEMPLATES if t["id"] == template_id), None)
        if not default_tmpl:
            return doc

        if doc:
            merged = dict(default_tmpl)
            merged.update(doc)
            merged["isCustomized"] = True
            return merged
        default_copy = dict(default_tmpl)
        default_copy["isCustomized"] = False
        return default_copy

    async def update_template(self, template_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Save customized template properties into Supabase PostgreSQL."""
        clean_id = template_id.strip()
        now = now_iso()
        updates["_id"] = clean_id
        updates["id"] = clean_id
        updates["updatedAt"] = now
        await database.update_one(
            "email_templates",
            {"_id": clean_id},
            {"$set": updates},
            upsert=True,
        )
        return await self.get_template(clean_id) or updates

    async def reset_template(self, template_id: str) -> Dict[str, Any]:
        """Revert template to default system configuration."""
        clean_id = template_id.strip()
        await database.delete_many("email_templates", {"_id": clean_id})
        default_tmpl = next((t for t in DEFAULT_SYSTEM_TEMPLATES if t["id"] == clean_id), None)
        return default_tmpl or {"id": clean_id, "reset": True}

    # =========================================================================
    # BULK MARKETING CAMPAIGNS METHODS
    # =========================================================================
    async def list_campaigns(self, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """Retrieve historical marketing campaigns."""
        docs = await database.find_sorted(
            "email_campaigns",
            {},
            sort=[("createdAt", -1)],
            limit=limit,
            skip=skip,
        )
        for d in docs:
            d["id"] = str(d.get("_id") or d.get("id"))
        return docs

    async def get_campaign(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """Get single campaign details and live progress metrics."""
        doc = await database.find_one("email_campaigns", {"_id": campaign_id})
        if doc:
            doc["id"] = str(doc.get("_id") or doc.get("id"))
        return doc

    async def create_campaign(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new marketing campaign record."""
        camp_id = f"cmp-{uuid.uuid4().hex[:10]}"
        now = now_iso()
        doc = {
            "_id": camp_id,
            "id": camp_id,
            "title": data.get("title") or "Promotional Broadcast",
            "audience": data.get("audience") or "all_customers",
            "subject": data.get("subject") or "QuickPress Exclusive Offer",
            "message": data.get("message") or "",
            "couponCode": data.get("couponCode") or "",
            "status": "queued",  # "queued" | "sending" | "completed" | "failed"
            "totalRecipients": int(data.get("totalRecipients") or 0),
            "sentCount": 0,
            "failedCount": 0,
            "openCount": 0,
            "clickCount": 0,
            "createdAt": now,
            "updatedAt": now,
        }
        await database.insert_one("email_campaigns", doc)
        return doc

    async def update_campaign_progress(
        self,
        campaign_id: str,
        sent_delta: int = 0,
        failed_delta: int = 0,
        status: Optional[str] = None,
    ) -> None:
        """Increment progress counters for active batch campaign."""
        now = now_iso()
        doc = await self.get_campaign(campaign_id)
        if not doc:
            return
        new_sent = int(doc.get("sentCount") or 0) + sent_delta
        new_failed = int(doc.get("failedCount") or 0) + failed_delta
        updates: Dict[str, Any] = {
            "sentCount": new_sent,
            "failedCount": new_failed,
            "updatedAt": now,
        }
        if status:
            updates["status"] = status
            if status == "completed":
                updates["completedAt"] = now

        await database.update_one(
            "email_campaigns",
            {"_id": campaign_id},
            {"$set": updates},
        )

    async def get_email_stats(self) -> Dict[str, Any]:
        """Aggregate high-level surveillance metrics, open rates, and CTR."""
        all_logs = await database.find_many(EMAIL_LOGS_COLLECTION, {}, limit=2000)

        now = datetime.now(timezone.utc)
        today_prefix = now.strftime("%Y-%m-%d")

        total = len(all_logs)
        sent = 0
        failed = 0
        today_sent = 0
        opened_count = 0
        clicked_count = 0

        audience_counts: Dict[str, int] = {"customer": 0, "partner": 0, "rider": 0, "admin": 0}
        category_counts: Dict[str, int] = {
            "order": 0,
            "finance": 0,
            "onboarding": 0,
            "security": 0,
            "alert": 0,
            "manual": 0,
        }

        for log in all_logs:
            st = str(log.get("status") or "").lower()
            if st == "sent":
                sent += 1
            elif st == "failed":
                failed += 1

            if log.get("opened"):
                opened_count += 1
            if log.get("clicked"):
                clicked_count += 1

            created = str(log.get("createdAt") or "")
            if created.startswith(today_prefix):
                today_sent += 1

            aud = str(log.get("audience") or "").lower()
            if aud in audience_counts:
                audience_counts[aud] += 1
            else:
                audience_counts[aud] = 1

            cat = str(log.get("category") or "").lower()
            if cat in category_counts:
                category_counts[cat] += 1
            else:
                category_counts[cat] = 1

        success_rate = round((sent / total * 100), 1) if total > 0 else 100.0
        open_rate = round((opened_count / sent * 100), 1) if sent > 0 else 0.0
        click_rate = round((clicked_count / opened_count * 100), 1) if opened_count > 0 else 0.0

        settings = get_settings()
        gateway_name = (
            "Gmail SMTP"
            if "gmail" in (settings.smtp_host or "").lower()
            else (settings.smtp_host or "SMTP Gateway")
        )

        return {
            "total": total,
            "sent": sent,
            "failed": failed,
            "todaySent": today_sent,
            "successRate": success_rate,
            "totalOpens": opened_count,
            "openRate": open_rate,
            "totalClicks": clicked_count,
            "clickRate": click_rate,
            "byAudience": audience_counts,
            "byCategory": category_counts,
            "gateway": gateway_name if settings.smtp_host else "Unconfigured Gateway",
            "senderEmail": settings.smtp_user or "",
        }

    async def delete_email(self, email_id: str) -> bool:
        """Permanently delete an email record from the collection."""
        res = await database.delete_many(EMAIL_LOGS_COLLECTION, {"$or": [{"_id": email_id}, {"id": email_id}]})
        return res > 0

    async def clear_all(self) -> int:
        """Purge all email records (clearing all test data)."""
        return await database.delete_many(EMAIL_LOGS_COLLECTION, {})


# Default definitions for Template Studio (16 System Templates)
DEFAULT_SYSTEM_TEMPLATES = [
    {
        "id": "welcome_email",
        "name": "Customer Welcome & Gift",
        "audience": "customer",
        "category": "onboarding",
        "badgeLabel": "Welcome to QuickPress",
        "headline": "Fresh Clothes, Zero Hassle! ✨",
        "subheadline": "Your on-demand doorstep laundry partner",
        "subject": "Welcome to QuickPress! Here is Flat ₹50 Off ✨🧺",
        "couponCode": "WELCOME50",
        "primaryColor": "#059669",
        "accentColor": "#10b981",
        "footerNote": "Questions? Reach us anytime at official.quickpress@gmail.com",
    },
    {
        "id": "order_confirmation",
        "name": "Order Placement Receipt",
        "audience": "customer",
        "category": "order",
        "badgeLabel": "Order Confirmed",
        "headline": "We've Got Your Laundry! 🧺",
        "subheadline": "Order is booked and processing",
        "subject": "Order Confirmed #{order_code} — QuickPress Laundry",
        "couponCode": "",
        "primaryColor": "#047857",
        "accentColor": "#059669",
        "footerNote": "Keep your garments ready for doorstep captain pickup.",
    },
    {
        "id": "clothes_inspected",
        "name": "Garments Inspected & Verified",
        "audience": "customer",
        "category": "order",
        "badgeLabel": "Store Handover Complete",
        "headline": "Clothes Verified & Cleaning Started! 🫧",
        "subheadline": "Undergoing 7-step inspection and treatment",
        "subject": "Clothes Verified & In-Process #{order_code} — QuickPress",
        "couponCode": "",
        "primaryColor": "#0284c7",
        "accentColor": "#38bdf8",
        "footerNote": "Cleaned strictly per garment care labels.",
    },
    {
        "id": "order_delivered",
        "name": "Order Delivered with GST Invoice",
        "audience": "customer",
        "category": "order",
        "badgeLabel": "Delivery Complete",
        "headline": "Delivered Crisp & Fresh! 👔",
        "subheadline": "Tax invoice attached for your expense records",
        "subject": "Order #{order_code} Delivered — Your QuickPress Tax Invoice & Summary",
        "couponCode": "",
        "primaryColor": "#059669",
        "accentColor": "#34d399",
        "footerNote": "Thank you for choosing QuickPress eco-safe care.",
    },
    {
        "id": "order_cancelled",
        "name": "Order Cancellation & Instant Refund",
        "audience": "customer",
        "category": "finance",
        "badgeLabel": "Order Cancelled",
        "headline": "Order Cancelled & Refund Initiated",
        "subheadline": "Your refund has been credited or processing",
        "subject": "Order Cancelled & Refund Notice #{order_code}",
        "couponCode": "",
        "primaryColor": "#dc2626",
        "accentColor": "#f87171",
        "footerNote": "Reach out to support if you did not initiate this.",
    },
    {
        "id": "wallet_credit",
        "name": "Wallet Cashback Credit Notice",
        "audience": "customer",
        "category": "finance",
        "badgeLabel": "Wallet Cashback",
        "headline": "QuickPress Wallet Balance Credited! 💰",
        "subheadline": "Instant cashback credited to your account",
        "subject": "₹{amount} Credited to Your QuickPress Wallet! ✨",
        "couponCode": "",
        "primaryColor": "#d97706",
        "accentColor": "#fbbf24",
        "footerNote": "Usable 100% on your next laundry order at checkout.",
    },
    {
        "id": "abandoned_cart",
        "name": "Incomplete Booking Reminder",
        "audience": "customer",
        "category": "onboarding",
        "badgeLabel": "Don't Forget Your Clothes",
        "headline": "Your Laundry is Waiting! 🧺",
        "subheadline": "Complete your booking with an extra 10% discount",
        "subject": "Did you forget your clothes? Here is 10% Off to complete booking!",
        "couponCode": "SAVE10",
        "primaryColor": "#7c3aed",
        "accentColor": "#a78bfa",
        "footerNote": "Valid for the next 24 hours.",
    },
    {
        "id": "partner_welcome",
        "name": "Partner Store Agreement Welcome",
        "audience": "partner",
        "category": "onboarding",
        "badgeLabel": "Partner Network",
        "headline": "Welcome to the QuickPress Laundromat Fleet!",
        "subheadline": "Merchant credentials and operating standards",
        "subject": "Welcome to QuickPress Laundromat Network, {partner_name}!",
        "couponCode": "",
        "primaryColor": "#0f766e",
        "accentColor": "#14b8a6",
        "footerNote": "Dedicated merchant support: partners.quickpress@gmail.com",
    },
    {
        "id": "partner_kyc",
        "name": "Partner KYC & Bank Status",
        "audience": "partner",
        "category": "security",
        "badgeLabel": "Merchant Compliance",
        "headline": "KYC & Bank Verification Status",
        "subheadline": "Official update on store compliance clearance",
        "subject": "KYC Verification Status: {status} — QuickPress Partner",
        "couponCode": "",
        "primaryColor": "#2563eb",
        "accentColor": "#60a5fa",
        "footerNote": "Government compliance team: compliance@quickpress.in",
    },
    {
        "id": "partner_settlement",
        "name": "Weekly Payout Statement",
        "audience": "partner",
        "category": "finance",
        "badgeLabel": "Finance & Settlement",
        "headline": "Weekly Payout Statement & TDS Summary",
        "subheadline": "Automated net settlement transfer",
        "subject": "Weekly Payout Statement #{statement_no} — ₹{net_amount}",
        "couponCode": "",
        "primaryColor": "#059669",
        "accentColor": "#10b981",
        "footerNote": "1% TDS under Section 194-O deposited with Govt.",
    },
    {
        "id": "rider_welcome",
        "name": "Captain Account Activation",
        "audience": "rider",
        "category": "onboarding",
        "badgeLabel": "Delivery Fleet",
        "headline": "Welcome Captain! Account Approved 🛵",
        "subheadline": "You are cleared for doorstep pickups and deliveries",
        "subject": "Captain Account Approved! Welcome to QuickPress Fleet 🛵",
        "couponCode": "",
        "primaryColor": "#ea580c",
        "accentColor": "#fb923c",
        "footerNote": "Always wear helmet and display QuickPress badge.",
    },
    {
        "id": "rider_payout",
        "name": "Captain Weekly Trip Earnings",
        "audience": "rider",
        "category": "finance",
        "badgeLabel": "Captain Earnings",
        "headline": "Weekly Trip Payout & Distance Fare",
        "subheadline": "100% customer tips + distance earnings credited",
        "subject": "Weekly Captain Earnings: ₹{amount} Transferred 💰",
        "couponCode": "",
        "primaryColor": "#16a34a",
        "accentColor": "#4ade80",
        "footerNote": "Weekly earnings transferred directly to registered UPI/Bank.",
    },
    {
        "id": "rider_cod_warning",
        "name": "Captain COD Limit Warning",
        "audience": "rider",
        "category": "alert",
        "badgeLabel": "Cash Collection Warning",
        "headline": "Cash Collection Threshold Alert ⚠️",
        "subheadline": "Deposit cash to prevent account freeze",
        "subject": "⚠️ Urgent: Cash in Hand ₹{cash} Reached Threshold",
        "couponCode": "",
        "primaryColor": "#dc2626",
        "accentColor": "#f87171",
        "footerNote": "Deposit cash at nearest Hub or via UPI deposit link.",
    },
    {
        "id": "sla_breach",
        "name": "SLA Breach Operational Alert",
        "audience": "admin",
        "category": "alert",
        "badgeLabel": "Operations Alert",
        "headline": "Emergency: Order SLA Breach Flagged 🚨",
        "subheadline": "Immediate escalation required by operations team",
        "subject": "🚨 SLA BREACH: Order #{order_code} Overdue ({delay_mins}m)",
        "couponCode": "",
        "primaryColor": "#b91c1c",
        "accentColor": "#ef4444",
        "footerNote": "Automated SLA tracking daemon: Kasganj Hub.",
    },
    {
        "id": "daily_digest",
        "name": "Executive Daily Business Digest",
        "audience": "admin",
        "category": "finance",
        "badgeLabel": "Executive Summary",
        "headline": "Daily Business Performance 📊",
        "subheadline": "GMV, order volume, and fleet SLA summary",
        "subject": "QuickPress Daily Performance Digest: ₹{gmv} GMV",
        "couponCode": "",
        "primaryColor": "#0f172a",
        "accentColor": "#334155",
        "footerNote": "QuickPress Automated Analytics Engine.",
    },
]

# Global singleton instance
email_repository = EmailRepository()


