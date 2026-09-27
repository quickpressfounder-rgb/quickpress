"""Rider Earnings Ledger — Production Ledger for QuickPress Orders.

Maintains immutable, isolated per-leg earnings for:
- PICKUP LEG (100% full earning upon Store Drop Confirmation, 0% deduction)
- DELIVERY LEG (100% full earning upon Customer Delivery, 0% deduction)
- FAILED DELIVERY (20% deduction applied ONLY to the failed delivery leg)
- REASSIGNED DELIVERY (Rider 2 receives normal delivery fare + transferred 20% pool)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database

logger = logging.getLogger(__name__)

COLLECTION = "rider_earnings_ledger"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class RiderEarningsLedgerRepository:
    async def record_entry(
        self,
        *,
        order_id: str,
        rider_id: str,
        trip_type: str,  # "PICKUP" or "DELIVERY"
        base_earning: float,
        deduction: float = 0.0,
        deduction_percentage: float = 0.0,
        transfer_amount: float = 0.0,
        final_earning: float,
        reason: str = "",
        status: str = "SETTLED",  # "SETTLED", "FROZEN", "DEDUCTED", "TRANSFERRED"
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Record an immutable entry in the rider earnings ledger."""
        now = _now_iso()
        entry_id = f"rel-{order_id}-{trip_type.lower()}-{uuid.uuid4().hex[:8]}"

        doc = {
            "_id": entry_id,
            "id": entry_id,
            "order_id": order_id,
            "rider_id": rider_id,
            "trip_type": trip_type.upper(),
            "base_earning": round(float(base_earning), 2),
            "deduction": round(float(deduction), 2),
            "deduction_percentage": round(float(deduction_percentage), 2),
            "transfer_amount": round(float(transfer_amount), 2),
            "final_earning": round(float(final_earning), 2),
            "reason": reason,
            "status": status,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
        }

        await database.collection(COLLECTION).insert_one(doc)
        logger.info(
            "Rider earnings ledger recorded: order=%s, rider=%s, leg=%s, base=₹%.2f, ded=₹%.2f, xfer=₹%.2f, final=₹%.2f",
            order_id, rider_id, trip_type, base_earning, deduction, transfer_amount, final_earning
        )
        return doc

    async def get_by_order(self, order_id: str) -> List[Dict[str, Any]]:
        """Get all ledger entries for a specific order."""
        docs = await database.find_many(COLLECTION, {"order_id": order_id})
        docs.sort(key=lambda d: d.get("created_at") or "")
        return docs

    get_ledger_for_order = get_by_order

    async def get_by_rider(self, rider_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get earnings ledger for a specific rider."""
        docs = await database.find_many(COLLECTION, {"rider_id": rider_id})
        docs.sort(key=lambda d: d.get("created_at") or "", reverse=True)
        return docs[:limit]

    async def get_reassignment_pool(self, order_id: str) -> float:
        """Find the reassignment pool created for this order's failed delivery."""
        entries = await database.find_many(
            COLLECTION,
            {"order_id": order_id, "trip_type": "DELIVERY", "deduction": {"$gt": 0}}
        )
        total_pool = sum(float(e.get("deduction", 0.0)) for e in entries)
        return round(total_pool, 2)


rider_earnings_ledger = RiderEarningsLedgerRepository()
