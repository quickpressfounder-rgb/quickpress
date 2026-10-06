"""QuickPress DPDP Act 2023 Compliance & Automated Data Anonymization Service.

Implements Phase 2 Rule 5:
In compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act):
1. Orders delivered > 180 days ago have customer PII scrubbed:
   - Phone numbers masked (+91 98••• ••210)
   - Full names sanitized (e.g. Rahul S.)
   - High-precision GPS coordinates rounded to 1 decimal place (~11 km regional centroid)
   - Doorstep gate codes & private pickup notes erased
2. Statutory Exemption Preserved:
   - CGST / SGST invoices and financial double-entry ledger records are retained
     untouched for the statutory 7-year audit requirement.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.privacy import mask_name, mask_phone
from app.db.client import database

logger = logging.getLogger("quickpress.dpdp_service")


class DPDPAnonymizationService:
    """Automated customer PII anonymization engine adhering to DPDP Act 2023."""

    RETENTION_DAYS_DEFAULT = 180

    async def anonymize_single_order(self, order_id: str) -> Dict[str, Any]:
        """Anonymizes PII for an individual delivered order while preserving tax records."""
        order = await database.find_one("customer_orders", {"_id": order_id})
        if not order:
            return {"status": "not_found", "orderId": order_id}

        if order.get("isDpdpAnonymized"):
            return {"status": "already_anonymized", "orderId": order_id}

        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Mask Phone Numbers
        raw_phone = str(order.get("customerPhone") or (order.get("customer") or {}).get("phone") or "")
        masked_phone = mask_phone(raw_phone)

        # 2. Mask Full Names
        raw_name = str(order.get("customerName") or (order.get("customer") or {}).get("name") or "Customer")
        masked_name = mask_name(raw_name)

        # 3. Reduce GPS coordinates to low-resolution regional centroid (~11 km)
        addr = order.get("address") or {}
        lat = addr.get("latitude") or addr.get("lat")
        lng = addr.get("longitude") or addr.get("lng")
        coarse_lat = round(float(lat), 1) if lat is not None else None
        coarse_lng = round(float(lng), 1) if lng is not None else None

        updated_address = dict(addr)
        if coarse_lat is not None and coarse_lng is not None:
            updated_address["latitude"] = coarse_lat
            updated_address["longitude"] = coarse_lng
            updated_address["lat"] = coarse_lat
            updated_address["lng"] = coarse_lng
        updated_address["line"] = "[Archived under DPDP Act 2023]"
        updated_address["landmark"] = "[Archived]"
        updated_address["doorNumber"] = "[Archived]"

        patch: Dict[str, Any] = {
            "customerPhone": masked_phone,
            "customerPhoneMasked": masked_phone,
            "customerName": masked_name,
            "address": updated_address,
            "deliveryNotes": "[Scrubbed under DPDP Act 2023]",
            "riderNotes": "[Scrubbed under DPDP Act 2023]",
            "chatTranscript": [],
            "isDpdpAnonymized": True,
            "dpdpAnonymizedAt": now_iso,
        }

        # Update customer sub-dict if present
        if "customer" in order and isinstance(order["customer"], dict):
            c_dict = dict(order["customer"])
            c_dict["phone"] = masked_phone
            c_dict["name"] = masked_name
            patch["customer"] = c_dict

        await database.update("customer_orders", {"_id": order_id}, patch)
        logger.info("Order %s anonymized under DPDP Act 2023", order_id)

        return {
            "status": "anonymized",
            "orderId": order_id,
            "anonymizedAt": now_iso,
            "taxInvoiceRetained": bool(order.get("invoiceNumber") or order.get("taxInvoice")),
        }

    async def run_batch_anonymization(self, retention_days: int = RETENTION_DAYS_DEFAULT) -> Dict[str, Any]:
        """Scans for delivered orders older than retention_days and anonymizes customer PII."""
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=retention_days)
        cutoff_iso = cutoff_dt.isoformat()

        # Query candidates: status is delivered/completed, older than retention threshold, not yet anonymized
        query = {
            "status": {"$in": ["delivered", "completed"]},
            "isDpdpAnonymized": {"$ne": True},
            "$or": [
                {"deliveredAt": {"$lte": cutoff_iso}},
                {"completedAt": {"$lte": cutoff_iso}},
                {"createdAt": {"$lte": cutoff_iso}},
            ],
        }

        candidates = await database.find_many("customer_orders", query)
        processed_count = 0

        for cand in candidates:
            c_id = cand.get("_id") or cand.get("orderId")
            if c_id:
                await self.anonymize_single_order(str(c_id))
                processed_count += 1

        logger.info(
            "DPDP Act Batch Anonymization finished: %d orders processed (Retention: %d days)",
            processed_count,
            retention_days,
        )

        return {
            "status": "success",
            "retentionDays": retention_days,
            "cutoffDate": cutoff_iso,
            "totalAnonymized": processed_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Singleton instance
dpdp_anonymization_service = DPDPAnonymizationService()
