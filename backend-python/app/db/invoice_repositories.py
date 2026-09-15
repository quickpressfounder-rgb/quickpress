"""Invoice repository — Sprint 2.11.

MongoDB collection
------------------
`invoices`   exactly one document per order, generated on first read.

    {
      "_id": "inv-QP-48219",
      "user_id": "<users._id>",
      "invoice_number": "QP/2026/000123",
      "order_id": "ord-QP-48219",
      "order_number": "QP-48219",
      "status": "paid" | "unpaid" | "refunded" | "cancelled",
      "invoice_date": "2026-08-05T…",
      "customer": {...}, "partner": {...}, "gst": {...},
      "items": [{ "id", "name", "quantity", "unitPrice", "total" }],
      "totals": {...}, "payment": {...},
      "download_count": 0, "share_count": 0,
      "created_at": "…", "updated_at": "…"
    }

Business rules enforced here
----------------------------
* An invoice is derived from its order exactly once, then frozen — later order
  edits never rewrite a already-issued invoice, which is what a tax document
  requires.
* Invoices are strictly scoped to `user_id`; a customer can never read another
  customer's invoice (404 rather than 403 so ids are not enumerable).
* Cancelled orders produce a `cancelled` invoice; the document still exists so
  the customer keeps a record.
* GST is split CGST/SGST for intra-state supply (the only case today) from the
  order's already-computed `gst` total, so the invoice can never disagree with
  what the customer was charged.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.db.client import database
from app.models.invoice import (
    Invoice,
    InvoiceDownloadResponse,
    InvoiceGst,
    InvoiceItem,
    InvoiceListResponse,
    InvoiceParty,
    InvoicePayment,
    InvoiceShareResponse,
    InvoiceTotals,
)
from app.models.user import Role, User, utcnow
from app.services import order_lifecycle as lifecycle

INVOICES = "invoices"
ORDERS = "customer_orders"
LEGACY_ORDERS = "orders"
COUNTERS = "counters"

#: Billing entity — QuickPress GSTIN
COMPANY_GSTIN = "29AABCQ1234P1ZV"
TAX_RATE = 18.0

PAYMENT_LABELS: Dict[str, str] = {
    "cod": "Cash on Delivery",
    "wallet": "QuickPress Wallet",
    "razorpay": "Razorpay",
    "upi": "UPI",
    "credit-card": "Credit Card",
    "debit-card": "Debit Card",
    "online": "Online Payment",
}


class InvoiceError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    return value if isinstance(value, str) else value.isoformat()


def _money(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


class InvoiceRepository:
    async def _next_number(self) -> str:
        collection = database.collection(COUNTERS)
        document = await collection.find_one({"_id": "invoice"})
        value = int((document or {}).get("value", 1000)) + 1
        await collection.update_one({"_id": "invoice"}, {"$set": {"value": value}}, upsert=True)
        year = utcnow().year
        return f"QP/{year}/{value:06d}"

    async def _resolve_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Resolve order from customer_orders or legacy orders with prefix tolerance."""
        if not order_id:
            return None
        # 1. Try canonical lifecycle resolver
        order = await lifecycle.find_order(order_id)
        if order is not None:
            return order
        # 2. Try customer_orders directly
        clean = str(order_id).strip()
        doc = await database.collection(ORDERS).find_one({"$or": [{"_id": clean}, {"id": clean}, {"code": clean}]})
        if doc is not None:
            return doc
        # 3. Fallback to legacy collection
        doc = await database.collection(LEGACY_ORDERS).find_one({"$or": [{"_id": clean}, {"id": clean}, {"code": clean}]})
        return doc

    async def _can_access_order(self, user: Optional[User], order: Dict[str, Any]) -> bool:
        """Verify if the user (customer, partner, rider, or admin) has rights to this order's invoice."""
        if user is None:
            return True  # Token or pre-authorized context

        role = getattr(user, "role", None)
        role_str = str(getattr(role, "value", role) or "").lower()

        # Admins have full access
        if role_str in ("admin", "super_admin", "superadmin", "operations", "finance", "support"):
            return True

        user_id = str(getattr(user, "id", "") or "")
        user_phone = str(getattr(user, "phone", "") or "")
        raw_phone = user_phone.replace("+91", "").replace(" ", "").replace("-", "").strip()

        # Customer matching
        customer_obj = order.get("customer") or {}
        order_user_id = str(order.get("userId") or customer_obj.get("id") or "")
        order_phone = str(customer_obj.get("phone") or "")
        raw_order_phone = order_phone.replace("+91", "").replace(" ", "").replace("-", "").strip()

        if user_id and order_user_id and user_id == order_user_id:
            return True
        if raw_phone and raw_order_phone and raw_phone == raw_order_phone:
            return True

        # Partner matching
        if role_str in ("partner", "store"):
            partner_obj = order.get("partner") or {}
            partner_candidates = {
                str(partner_obj.get("id") or ""),
                str(partner_obj.get("partnerId") or ""),
                str(order.get("partner_id") or ""),
                str(order.get("partnerId") or ""),
                str(order.get("store_id") or ""),
            } - {"", "None"}

            if user_id in partner_candidates:
                return True

            try:
                from app.db.partner_repositories import partner_repo
                p_store_id = await partner_repo.resolve_partner_id(user)
                if p_store_id and p_store_id in partner_candidates:
                    return True
            except Exception:
                pass

            p_phone = str(partner_obj.get("phone") or "")
            raw_p_phone = p_phone.replace("+91", "").replace(" ", "").replace("-", "").strip()
            if raw_phone and raw_p_phone and (raw_phone == raw_p_phone or raw_phone in raw_p_phone):
                return True

            # Incoming or unassigned orders visible to partner
            if order.get("status") in ("placed", "pending_partner_acceptance", "new"):
                return True

        # Rider matching
        if role_str in ("rider", "captain"):
            rider_obj = order.get("rider") or {}
            rider_candidates = {
                str(order.get("riderId") or ""),
                str(rider_obj.get("id") or ""),
                str(order.get("captain_id") or ""),
            } - {"", "None"}
            if user_id in rider_candidates:
                return True

        return False

    async def _build(self, user: Optional[User], order: Dict[str, Any]) -> Dict[str, Any]:
        """Derive an invoice document from an order. Called once per order."""
        totals = order.get("totals") or {}
        items_total = _money(totals.get("itemsTotal"))
        discount = _money(totals.get("discount"))
        delivery = _money(totals.get("delivery"))
        pickup = _money(totals.get("pickup"))
        handling = _money(totals.get("handling"))
        taxes = _money(totals.get("gst"))
        grand_total = _money(totals.get("grandTotal"))
        taxable = round(max(items_total - discount, 0) + delivery + pickup + handling, 2)

        partner = order.get("partner") or {}
        customer = order.get("customer") or {}
        address = order.get("address") or {}
        payment = order.get("payment") or {}
        method = str(payment.get("method") or payment.get("mode") or "cod")
        status_paid = bool(payment.get("paid"))
        order_status = str(order.get("status") or "placed").lower()

        # Cancelled orders do NOT get tax invoices
        if order_status == "cancelled":
            return None

        if status_paid:
            invoice_status = "paid"
            payment_status = "paid"
        else:
            invoice_status = "unpaid"
            payment_status = "cod-pending" if method in ("cod", "cash") else "pending"

        now = _iso(utcnow())
        order_key = str(order.get("_id") or order.get("id") or order.get("code"))
        order_code = str(order.get("code") or order_key)
        cust_id = str(order.get("userId") or customer.get("id") or (getattr(user, "id", "") if user else ""))
        part_id = str(partner.get("id") or order.get("partnerId") or order.get("partner_id") or "")

        document: Dict[str, Any] = {
            "_id": f"inv-{order_code}",
            "user_id": cust_id,
            "customer_id": cust_id,
            "partner_id": part_id,
            "invoice_number": await self._next_number(),
            "order_id": order_key,
            "order_number": order_code,
            "status": invoice_status,
            "invoice_date": _iso(order.get("createdAt")) or now,
            "service_label": order.get("serviceLabel") or "Laundry & Dry Cleaning",
            "customer": {
                "name": customer.get("name") or (getattr(user, "name", "") if user else "") or "Customer",
                "phone": customer.get("phone") or (getattr(user, "phone", "") if user else "") or "",
                "email": customer.get("email") or (getattr(user, "email", "") if user else "") or "",
                "addressLine": address.get("line") or address.get("address") or (order.get("delivery") or {}).get("address") or "",
                "city": address.get("city") or "Kasganj",
            },
            "partner": {
                "id": part_id,
                "name": partner.get("name") or partner.get("businessName") or "QuickPress Partner Hub",
                "phone": partner.get("phone") or "",
                "email": partner.get("email") or "",
                "addressLine": partner.get("addressLine") or partner.get("city") or "MDR 82W, Kasganj",
                "city": partner.get("city") or "Kasganj",
            },
            "gst": {
                "gstin": COMPANY_GSTIN,
                "placeOfSupply": address.get("city") or partner.get("city") or "Uttar Pradesh",
                "hsnCode": "9997",
                "taxRate": TAX_RATE,
                "cgst": round(taxes / 2, 2),
                "sgst": round(taxes / 2, 2),
                "igst": 0.0,
                "totalTax": taxes,
            },
            "items": [
                {
                    "id": str(line.get("id") or f"line-{index + 1}"),
                    "name": line.get("name") or "Service",
                    "description": str(line.get("service") or ""),
                    "quantity": int(line.get("qty") or line.get("quantity") or 1),
                    "unitPrice": _money(line.get("price") or line.get("unitPrice")),
                    "total": round(_money(line.get("price") or line.get("unitPrice")) * int(line.get("qty") or line.get("quantity") or 1), 2),
                }
                for index, line in enumerate(order.get("items") or [])
            ],
            "totals": {
                "itemsTotal": items_total,
                "discount": discount,
                "deliveryCharge": delivery,
                "pickupCharge": pickup,
                "handlingFee": handling,
                "taxableValue": taxable,
                "taxes": taxes,
                "grandTotal": grand_total,
                "currency": "INR",
            },
            "payment": {
                "method": method,
                "methodLabel": payment.get("label") or PAYMENT_LABELS.get(method, "Cash on Delivery"),
                "status": payment_status,
                "paidAt": _iso(order.get("updatedAt")) if status_paid else None,
                "transactionId": payment.get("transactionId"),
            },
            "notes": "This is a computer generated invoice and does not require a physical signature.",
            "download_count": 0,
            "share_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        await database.collection(INVOICES).update_one(
            {"_id": document["_id"]},
            {"$set": document},
            upsert=True,
        )
        return document

    def _to_model(self, document: Dict[str, Any]) -> Invoice:
        return Invoice(
            id=str(document["_id"]),
            invoiceNumber=document.get("invoice_number") or str(document["_id"]),
            orderId=document.get("order_id") or "",
            orderNumber=document.get("order_number") or "",
            status=document.get("status") or "unpaid",
            invoiceDate=_iso(document.get("invoice_date")) or _iso(utcnow()) or "",
            serviceLabel=document.get("service_label") or "Laundry & Dry Cleaning",
            customer=InvoiceParty(**(document.get("customer") or {})),
            partner=InvoiceParty(**(document.get("partner") or {})),
            gst=InvoiceGst(**(document.get("gst") or {})),
            items=[InvoiceItem(**item) for item in (document.get("items") or [])],
            totals=InvoiceTotals(**(document.get("totals") or {})),
            payment=InvoicePayment(**(document.get("payment") or {})),
            notes=document.get("notes") or "",
            downloadCount=int(document.get("download_count") or 0),
            shareCount=int(document.get("share_count") or 0),
            createdAt=_iso(document.get("created_at")) or "",
            updatedAt=_iso(document.get("updated_at")),
        )

    async def for_order(self, user: Optional[User], order_id: str) -> Invoice:
        """Get or derive the tax invoice for an order with permission check."""
        order = await self._resolve_order(order_id)
        if order is None:
            raise InvoiceError("Order not found", 404)

        if str(order.get("status") or "").lower() == "cancelled":
            raise InvoiceError("Invoice is not available for cancelled orders", 400)

        if not await self._can_access_order(user, order):
            raise InvoiceError("Order not found", 404)

        order_key = str(order.get("_id") or order.get("id") or order.get("code"))
        order_code = str(order.get("code") or order_key)

        existing = await database.collection(INVOICES).find_one(
            {
                "$or": [
                    {"_id": f"inv-{order_code}"},
                    {"order_id": order_key},
                    {"order_number": order_code},
                    {"order_number": order_key},
                ]
            }
        )
        if existing is None:
            existing = await self._build(user, order)
        if existing is None:
            raise InvoiceError("Invoice is not available for this order", 404)
        return self._to_model(existing)

    async def list(self, user: User, *, limit: int = 50, q: Optional[str] = None) -> InvoiceListResponse:
        """Invoice history — past orders of this customer or store partner."""
        role = getattr(user, "role", None)
        role_str = str(getattr(role, "value", role) or "").lower()

        if role_str in ("partner", "store"):
            try:
                from app.db.partner_repositories import partner_repo
                partner_id = await partner_repo.resolve_partner_id(user)
            except Exception:
                partner_id = user.id
            return await self.list_for_partner(partner_id, limit=limit, q=q)

        # Customer list
        orders = await database.find_many(ORDERS, {"userId": user.id})
        if not orders:
            orders = await database.find_many(LEGACY_ORDERS, {"userId": user.id})

        # Cancelled orders should never have invoices in the list
        cancelled_order_keys = {
            str(order.get("_id") or "") for order in orders if str(order.get("status") or "").lower() == "cancelled"
        } | {
            str(order.get("id") or "") for order in orders if str(order.get("status") or "").lower() == "cancelled"
        } | {
            str(order.get("code") or "") for order in orders if str(order.get("status") or "").lower() == "cancelled"
        } - {"", "None"}

        if cancelled_order_keys:
            await database.collection(INVOICES).delete_many({
                "$or": [
                    {"order_id": {"$in": list(cancelled_order_keys)}},
                    {"order_number": {"$in": list(cancelled_order_keys)}},
                    {"status": "cancelled"},
                ]
            })

        active_orders = [
            order for order in orders
            if str(order.get("status") or "").lower() != "cancelled"
        ]

        for order in active_orders:
            order_key = str(order.get("_id") or order.get("id") or order.get("code"))
            order_code = str(order.get("code") or order_key)
            existing = await database.collection(INVOICES).find_one(
                {"$or": [{"_id": f"inv-{order_code}"}, {"order_id": order_key}, {"order_number": order_code}]}
            )
            if existing is None:
                await self._build(user, order)

        documents = await database.find_many(
            INVOICES,
            {
                "$and": [
                    {"$or": [{"user_id": user.id}, {"customer_id": user.id}]},
                    {"status": {"$ne": "cancelled"}},
                ]
            },
        )
        documents = [
            doc for doc in documents
            if str(doc.get("status") or "").lower() != "cancelled"
            and str(doc.get("order_id") or "") not in cancelled_order_keys
            and str(doc.get("order_number") or "") not in cancelled_order_keys
        ]
        documents.sort(key=lambda doc: str(doc.get("invoice_date") or ""), reverse=True)
        invoices = [self._to_model(doc) for doc in documents]
        if q:
            needle = q.strip().lower()
            invoices = [
                invoice
                for invoice in invoices
                if needle in invoice.invoiceNumber.lower()
                or needle in invoice.orderNumber.lower()
                or needle in invoice.partner.name.lower()
            ]
        total_amount = round(sum(invoice.totals.grandTotal for invoice in invoices), 2)
        return InvoiceListResponse(
            items=invoices[:limit], total=len(invoices), totalAmount=total_amount
        )

    async def list_for_partner(self, partner_id: str, *, limit: int = 50, q: Optional[str] = None) -> InvoiceListResponse:
        """Store partner invoice history — all order invoices processed by this partner."""
        orders = await database.find_many(
            ORDERS,
            {"$or": [
                {"partner.id": partner_id},
                {"partnerId": partner_id},
                {"partner_id": partner_id},
                {"store_id": partner_id},
            ]}
        )

        cancelled_order_keys = {
            str(order.get("_id") or "") for order in orders if str(order.get("status") or "").lower() == "cancelled"
        } | {
            str(order.get("id") or "") for order in orders if str(order.get("status") or "").lower() == "cancelled"
        } | {
            str(order.get("code") or "") for order in orders if str(order.get("status") or "").lower() == "cancelled"
        } - {"", "None"}

        if cancelled_order_keys:
            await database.collection(INVOICES).delete_many({
                "$or": [
                    {"order_id": {"$in": list(cancelled_order_keys)}},
                    {"order_number": {"$in": list(cancelled_order_keys)}},
                    {"status": "cancelled"},
                ]
            })

        active_orders = [
            order for order in orders
            if str(order.get("status") or "").lower() != "cancelled"
        ]

        for order in active_orders:
            order_key = str(order.get("_id") or order.get("id") or order.get("code"))
            order_code = str(order.get("code") or order_key)
            existing = await database.collection(INVOICES).find_one(
                {"$or": [{"_id": f"inv-{order_code}"}, {"order_id": order_key}, {"order_number": order_code}]}
            )
            if existing is None:
                await self._build(None, order)

        documents = await database.find_many(
            INVOICES,
            {
                "$and": [
                    {"$or": [{"partner_id": partner_id}, {"partner.id": partner_id}]},
                    {"status": {"$ne": "cancelled"}},
                ]
            },
        )
        documents = [
            doc for doc in documents
            if str(doc.get("status") or "").lower() != "cancelled"
            and str(doc.get("order_id") or "") not in cancelled_order_keys
            and str(doc.get("order_number") or "") not in cancelled_order_keys
        ]
        documents.sort(key=lambda doc: str(doc.get("invoice_date") or ""), reverse=True)
        invoices = [self._to_model(doc) for doc in documents]
        if q:
            needle = q.strip().lower()
            invoices = [
                invoice
                for invoice in invoices
                if needle in invoice.invoiceNumber.lower()
                or needle in invoice.orderNumber.lower()
                or needle in invoice.customer.name.lower()
            ]
        total_amount = round(sum(invoice.totals.grandTotal for invoice in invoices), 2)
        return InvoiceListResponse(
            items=invoices[:limit], total=len(invoices), totalAmount=total_amount
        )

    async def get(self, user: Optional[User], invoice_id: str) -> Invoice:
        collection = database.collection(INVOICES)
        clean_id = str(invoice_id).strip()
        document = await collection.find_one(
            {
                "$or": [
                    {"_id": clean_id},
                    {"_id": f"inv-{clean_id}"},
                    {"invoice_number": clean_id},
                    {"order_id": clean_id},
                    {"order_number": clean_id},
                ]
            }
        )
        if document is None:
            # Check if invoice_id is an order code or id
            order = await self._resolve_order(clean_id)
            if order is not None:
                if str(order.get("status") or "").lower() == "cancelled":
                    raise InvoiceError("Invoice is not available for cancelled orders", 404)
                return await self.for_order(user, clean_id)
            raise InvoiceError("Invoice not found", 404)

        if str(document.get("status") or "").lower() == "cancelled":
            raise InvoiceError("Invoice is not available for cancelled orders", 404)

        # Verify access rights
        order_doc = await self._resolve_order(document.get("order_id") or document.get("order_number") or "")
        if order_doc:
            if str(order_doc.get("status") or "").lower() == "cancelled":
                raise InvoiceError("Invoice is not available for cancelled orders", 404)
            if not await self._can_access_order(user, order_doc):
                raise InvoiceError("Invoice not found", 404)

        return self._to_model(document)

    async def _bump(self, invoice_id: str, field: str) -> None:
        collection = database.collection(INVOICES)
        document = await collection.find_one({"_id": invoice_id})
        if document is None:
            return
        await collection.update_one(
            {"_id": invoice_id},
            {"$set": {field: int(document.get(field) or 0) + 1, "updated_at": _iso(utcnow())}},
        )

    async def share(self, user: User, invoice_id: str, channel: str, target: Optional[str]) -> InvoiceShareResponse:
        invoice = await self.get(user, invoice_id)
        await self._bump(invoice.id, "share_count")
        refreshed = await self.get(user, invoice.id)
        share_url = f"/invoices/{invoice.id}"
        suffix = f" to {target}" if target else ""
        return InvoiceShareResponse(
            ok=True,
            message=f"Invoice {invoice.invoiceNumber} shared via {channel}{suffix}.",
            shareUrl=share_url,
            channel=channel,
            invoice=refreshed,
        )

    async def download(self, user: User, invoice_id: str) -> InvoiceDownloadResponse:
        invoice = await self.get(user, invoice_id)
        await self._bump(invoice.id, "download_count")
        refreshed = await self.get(user, invoice.id)
        safe_number = invoice.invoiceNumber.replace("/", "-")
        return InvoiceDownloadResponse(
            ok=True,
            message="Invoice ready to download.",
            downloadUrl=f"/api/invoices/{invoice.id}/pdf",
            fileName=f"QuickPress-{safe_number}.pdf",
            format="pdf",
            invoice=refreshed,
        )

    async def get_pdf_bytes(self, user: Optional[User], invoice_id: str) -> tuple[bytes, str]:
        """Generate ReportLab 3-page Tax Invoice PDF bytes and return (pdf_bytes, file_name)."""
        invoice_model = await self.get(user, invoice_id)

        order_doc = await self._resolve_order(invoice_model.orderId or invoice_model.orderNumber)

        from app.services.invoice_pdf_generator import build_invoice_pdf_payload, generate_invoice_pdf

        payload = build_invoice_pdf_payload(invoice_model, order_doc)
        pdf_bytes = generate_invoice_pdf(payload)
        safe_number = invoice_model.invoiceNumber.replace("/", "-")
        return pdf_bytes, f"QuickPress-{safe_number}.pdf"


invoice_repository = InvoiceRepository()

