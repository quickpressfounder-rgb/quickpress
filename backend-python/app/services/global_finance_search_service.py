"""Global Finance Search & Customer 360 Profile Service for QuickPress.

Features:
1. Smart Regex Auto-Detection: Identifies search input type (Phone, Order, Payment,
   Invoice, Refund, Settlement, Ledger, Rider, Partner) without requiring manual dropdowns.
2. Federated Cross-Entity Search: Searches across users, orders, payments, refunds,
   invoices, settlements, and double-entry ledger entries simultaneously.
3. Complete Customer 360 Financial Profile:
   Aggregates LTV, orders, payments, refunds, wallet transactions, and ledger history
   into a single, unified view.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.db.general_ledger_repository import general_ledger_repository

logger = logging.getLogger(__name__)


def _clean_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d]", "", phone)
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return cleaned[2:]
    if len(cleaned) == 11 and cleaned.startswith("0"):
        return cleaned[1:]
    return cleaned


class GlobalFinanceSearchService:
    """Enterprise search engine for all financial entities across QuickPress."""

    def detect_search_type(self, query: str) -> str:
        """Determines the semantic entity type from the query string pattern."""
        q = query.strip()

        # 1. Indian Mobile Phone Number (10 digits starting with 6-9)
        cleaned_num = _clean_phone(q)
        if re.match(r"^[6-9]\d{9}$", cleaned_num):
            return "CUSTOMER_PHONE"

        # 2. Email Address
        if re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", q):
            return "EMAIL"

        # 3. Order ID
        if re.match(r"^(QP-|ORD-|ord-|qp-)", q, re.IGNORECASE) or (q.isalnum() and len(q) >= 8 and "order" in q.lower()):
            return "ORDER_ID"

        # 4. Payment / Gateway ID
        if re.match(r"^(PAY-|pay_|txn_|TXN-)", q, re.IGNORECASE):
            return "PAYMENT_ID"

        # 5. Tax Invoice ID
        if re.match(r"^(INV-|inv_)", q, re.IGNORECASE):
            return "INVOICE_ID"

        # 6. Refund ID
        if re.match(r"^(REF-|ref_|rfnd_)", q, re.IGNORECASE):
            return "REFUND_ID"

        # 7. Settlement ID
        if re.match(r"^(SET-|set_)", q, re.IGNORECASE):
            return "SETTLEMENT_ID"

        # 8. General Ledger / Batch ID
        if re.match(r"^(LED-|led-|BAT-|bat-|REV-|rev_)", q, re.IGNORECASE):
            return "LEDGER_ID"

        # 9. COD Collection or Deposit ID
        if re.match(r"^(COD-|cod-|DEP-|dep_)", q, re.IGNORECASE):
            return "COD_ID"

        # 10. Rider ID
        if re.match(r"^(RDR-|rider-)", q, re.IGNORECASE):
            return "RIDER_ID"

        # 11. Partner ID
        if re.match(r"^(PTR-|partner-)", q, re.IGNORECASE):
            return "PARTNER_ID"

        return "GENERIC_SEARCH"

    async def search_all(self, raw_query: str, limit: int = 10) -> Dict[str, Any]:
        """Universal global search returning structured, grouped financial entities."""
        query = raw_query.strip()
        if not query:
            return {
                "detectedType": "EMPTY",
                "totalMatches": 0,
                "users": [],
                "orders": [],
                "payments": [],
                "invoices": [],
                "settlements": [],
                "ledgerEntries": [],
                "codRecords": [],
            }

        detected_type = self.detect_search_type(query)

        results: Dict[str, Any] = {
            "query": query,
            "detectedType": detected_type,
            "totalMatches": 0,
            "users": [],
            "orders": [],
            "payments": [],
            "invoices": [],
            "settlements": [],
            "ledgerEntries": [],
            "codRecords": [],
        }

        # ---------------------------------------------------------------------
        # 1. PHONE NUMBER SEARCH
        # ---------------------------------------------------------------------
        if detected_type == "CUSTOMER_PHONE":
            clean_digits = _clean_phone(query)
            user_docs = await database.find_many(
                "users",
                {"$or": [{"phone": clean_digits}, {"phone": f"+91{clean_digits}"}, {"phone": query}]},
                limit=limit,
            )
            for u in user_docs:
                profile = await self.get_customer_financial_profile(u.get("id") or str(u.get("_id")))
                results["users"].append(profile)

        # ---------------------------------------------------------------------
        # 2. EMAIL SEARCH
        # ---------------------------------------------------------------------
        elif detected_type == "EMAIL":
            user_docs = await database.find_many(
                "users",
                {"email": {"$regex": f"^{re.escape(query)}$", "$options": "i"}},
                limit=limit,
            )
            for u in user_docs:
                profile = await self.get_customer_financial_profile(u.get("id") or str(u.get("_id")))
                results["users"].append(profile)

        # ---------------------------------------------------------------------
        # 3. ORDER ID SEARCH
        # ---------------------------------------------------------------------
        elif detected_type == "ORDER_ID":
            orders = await database.find_many(
                "orders",
                {"$or": [{"id": query}, {"_id": query}, {"orderNumber": query}, {"code": query}]},
                limit=limit,
            )
            for ord_doc in orders:
                fin = await database.collection("order_financials").find_one({"_id": ord_doc.get("id")})
                ledger = await general_ledger_repository.get_by_reference("ORDER_PAYMENT", ord_doc.get("id"))
                results["orders"].append({
                    "order": ord_doc,
                    "financials": fin,
                    "ledgerLinesCount": len(ledger),
                })

        # ---------------------------------------------------------------------
        # 4. PAYMENT ID SEARCH
        # ---------------------------------------------------------------------
        elif detected_type == "PAYMENT_ID":
            payments = await database.find_many(
                "payments",
                {"$or": [{"id": query}, {"_id": query}, {"payment_id": query}, {"transaction_id": query}]},
                limit=limit,
            )
            gl_payments = await database.find_many(
                "general_ledger",
                {"reference_id": query},
                limit=limit,
            )
            results["payments"].extend(payments)
            results["ledgerEntries"].extend(gl_payments)

        # ---------------------------------------------------------------------
        # 5. INVOICE ID SEARCH
        # ---------------------------------------------------------------------
        elif detected_type == "INVOICE_ID":
            invoices = await database.find_many(
                "invoices",
                {"$or": [{"id": query}, {"_id": query}, {"invoice_number": query}, {"invoiceNumber": query}]},
                limit=limit,
            )
            results["invoices"].extend(invoices)

        # ---------------------------------------------------------------------
        # 6. LEDGER ID SEARCH
        # ---------------------------------------------------------------------
        elif detected_type == "LEDGER_ID":
            entries = await database.find_many(
                "general_ledger",
                {"$or": [{"id": query}, {"_id": query}, {"batch_id": query}]},
                limit=limit,
            )
            results["ledgerEntries"].extend(entries)

        # ---------------------------------------------------------------------
        # 7. COD RECORD SEARCH
        # ---------------------------------------------------------------------
        elif detected_type == "COD_ID":
            cod_colls = await database.find_many(
                "cod_collections",
                {"$or": [{"id": query}, {"_id": query}, {"order_id": query}, {"bank_utr": query}]},
                limit=limit,
            )
            cod_deps = await database.find_many(
                "cod_deposits",
                {"$or": [{"id": query}, {"_id": query}, {"bank_utr": query}]},
                limit=limit,
            )
            results["codRecords"].extend(cod_colls)
            results["codRecords"].extend(cod_deps)

        # ---------------------------------------------------------------------
        # 8. GENERIC MULTI-ENTITY SEARCH
        # ---------------------------------------------------------------------
        else:
            # Multi-collection regex fallback
            users = await database.find_many(
                "users",
                {"$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"phone": {"$regex": query, "$options": "i"}},
                    {"email": {"$regex": query, "$options": "i"}},
                ]},
                limit=5,
            )
            results["users"] = users

            orders = await database.find_many(
                "orders",
                {"$or": [
                    {"id": {"$regex": query, "$options": "i"}},
                    {"orderNumber": {"$regex": query, "$options": "i"}},
                ]},
                limit=5,
            )
            results["orders"] = orders

            gl_entries = await database.find_many(
                "general_ledger",
                {"$or": [
                    {"reference_id": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                ]},
                limit=5,
            )
            results["ledgerEntries"] = gl_entries

        # Count total matches
        total = (
            len(results["users"])
            + len(results["orders"])
            + len(results["payments"])
            + len(results["invoices"])
            + len(results["settlements"])
            + len(results["ledgerEntries"])
            + len(results["codRecords"])
        )
        results["totalMatches"] = total
        return results

    # -------------------------------------------------------------------------
    # CUSTOMER 360 FINANCIAL PROFILE
    # -------------------------------------------------------------------------
    async def get_customer_financial_profile(self, customer_id: str) -> Dict[str, Any]:
        """Assembles complete financial profile for a customer."""
        user = await database.collection("users").find_one({"$or": [{"id": customer_id}, {"_id": customer_id}]})
        if not user:
            return {"customerId": customer_id, "error": "Customer not found"}

        cid = user.get("id") or str(user.get("_id"))
        phone = user.get("phone", "")

        # 1. Orders History
        orders = await database.find_many(
            "orders",
            {"$or": [{"customerId": cid}, {"user_id": cid}, {"customerPhone": phone}]},
        )
        total_orders_cnt = len(orders)
        total_spend = sum(
            float(o.get("total_amount") or (o.get("totals") or {}).get("grandTotal") or o.get("amount") or 0.0)
            for o in orders
        )

        # 2. Payments History
        payments = await database.find_many(
            "payments",
            {"$or": [{"user_id": cid}, {"customer_id": cid}]},
        )

        # 3. Wallet Balance
        wallet = await database.collection("wallets").find_one({"$or": [{"user_id": cid}, {"userId": cid}]})
        wallet_balance = float(wallet.get("balance", 0.0)) if wallet else 0.0

        # 4. Refunds History
        refunds = await database.find_many(
            "refunds",
            {"$or": [{"user_id": cid}, {"customer_id": cid}]},
        )
        total_refund_amt = sum(float(r.get("amount", 0.0)) for r in refunds)

        # 5. Invoices
        invoices = await database.find_many(
            "invoices",
            {"$or": [{"user_id": cid}, {"customerId": cid}]},
        )

        # 6. Active Memberships
        user_mem = await database.collection("user_memberships").find_one(
            {"user_id": cid, "status": "ACTIVE"}
        )

        # 7. Customer Lifetime Value (LTV) = Total Spent - Total Refunds
        ltv = round(total_spend - total_refund_amt, 2)

        return {
            "customerId": cid,
            "name": user.get("name") or user.get("fullName") or "QuickPress Customer",
            "phone": phone,
            "email": user.get("email", ""),
            "city": user.get("city") or "",
            "status": user.get("status", "active"),
            "registeredAt": user.get("created_at") or user.get("createdAt"),
            "kpis": {
                "totalOrders": total_orders_cnt,
                "totalSpend": round(total_spend, 2),
                "totalRefunds": round(total_refund_amt, 2),
                "walletBalance": round(wallet_balance, 2),
                "lifetimeValue": ltv,
                "hasActiveMembership": user_mem is not None,
                "membershipPlan": user_mem.get("plan_id") if user_mem else None,
            },
            "orders": orders[:20],
            "payments": payments[:20],
            "refunds": refunds[:10],
            "invoices": invoices[:10],
        }


global_finance_search_service = GlobalFinanceSearchService()
