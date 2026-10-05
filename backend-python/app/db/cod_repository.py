"""COD (Cash On Delivery) Repository — Cash Custody & Deposit Tracking for QuickPress.

Manages:
1. Per-Order COD cash collections by Riders.
2. Rider Cash Custody Liabilities.
3. CDM / Bank Deposit slips and UTR references.
4. Finance Admin verification and status progression:
   CASH_COLLECTED -> DEPOSITED -> VERIFIED / DISPUTED
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger(__name__)

COLLECTION_COLLECTIONS = "cod_collections"
COLLECTION_DEPOSITS = "cod_deposits"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _calc_deadline(hours: float = 24.0) -> str:
    dl = datetime.now(timezone.utc) + timedelta(hours=hours)
    return dl.replace(microsecond=0).isoformat().replace("+00:00", "Z")


class CodRepository:
    """Production Repository for tracking Hyperlocal COD cash lifecycle."""

    async def record_collection(
        self,
        *,
        order_id: str,
        customer_id: str,
        rider_id: str,
        partner_id: Optional[str] = None,
        order_amount: float,
        collected_amount: float,
        deadline_hours: float = 24.0,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Records initial cash custody liability when rider completes a COD delivery."""
        existing = await database.collection(COLLECTION_COLLECTIONS).find_one({"order_id": order_id})
        if existing:
            return existing

        now = _now_iso()
        deadline = _calc_deadline(deadline_hours)
        coll_id = f"COD-{uuid.uuid4().hex[:12].upper()}"

        collected = round(float(collected_amount), 2)
        doc = {
            "_id": coll_id,
            "id": coll_id,
            "order_id": order_id,
            "customer_id": customer_id,
            "rider_id": rider_id,
            "partner_id": partner_id or "unassigned",
            "order_amount": round(float(order_amount), 2),
            "collected_amount": collected,
            "deposited_amount": 0.0,
            "pending_amount": collected,
            "collected_at": now,
            "deposit_deadline": deadline,
            "status": "CASH_COLLECTED",  # CASH_COLLECTED, DEPOSITED, PARTIALLY_DEPOSITED, VERIFIED, DISPUTED, OVERDUE
            "deposit_id": None,
            "deposit_slip_url": None,
            "bank_utr": None,
            "verified_by": None,
            "verified_at": None,
            "notes": notes,
            "created_at": now,
            "updated_at": now,
        }

        await database.collection(COLLECTION_COLLECTIONS).insert_one(doc)
        logger.info(
            "COD cash collection recorded: order=%s, rider=%s, amount=₹%.2f, deadline=%s",
            order_id, rider_id, collected, deadline
        )
        return doc

    async def submit_deposit(
        self,
        *,
        rider_id: str,
        collection_ids: List[str],
        deposited_amount: float,
        deposit_slip_url: Optional[str] = None,
        bank_utr: str,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Rider submits proof of cash deposit into Bank CDM or Hub."""
        now = _now_iso()
        deposit_id = f"DEP-{uuid.uuid4().hex[:12].upper()}"

        dep_doc = {
            "_id": deposit_id,
            "id": deposit_id,
            "rider_id": rider_id,
            "collection_ids": collection_ids,
            "deposited_amount": round(float(deposited_amount), 2),
            "deposit_slip_url": deposit_slip_url,
            "bank_utr": bank_utr.strip(),
            "status": "SUBMITTED",  # SUBMITTED, VERIFIED, REJECTED, DISPUTED
            "submitted_at": now,
            "verified_by": None,
            "verified_at": None,
            "variance_amount": 0.0,
            "notes": notes,
            "created_at": now,
            "updated_at": now,
        }

        await database.collection(COLLECTION_DEPOSITS).insert_one(dep_doc)

        # Update linked collection records to DEPOSITED status
        for c_id in collection_ids:
            await database.collection(COLLECTION_COLLECTIONS).update_one(
                {"id": c_id},
                {
                    "$set": {
                        "status": "DEPOSITED",
                        "deposit_id": deposit_id,
                        "deposit_slip_url": deposit_slip_url,
                        "bank_utr": bank_utr.strip(),
                        "updated_at": now,
                    }
                },
            )

        logger.info(
            "Rider %s submitted COD deposit %s for ₹%.2f (UTR: %s)",
            rider_id, deposit_id, deposited_amount, bank_utr
        )
        return dep_doc

    async def verify_deposit(
        self,
        *,
        deposit_id: str,
        verified_by: str,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Finance Admin verifies that cash arrived in Bank Operating Account."""
        now = _now_iso()
        dep = await database.collection(COLLECTION_DEPOSITS).find_one({"id": deposit_id})
        if not dep:
            raise ValueError(f"Deposit {deposit_id} not found.")

        await database.collection(COLLECTION_DEPOSITS).update_one(
            {"id": deposit_id},
            {
                "$set": {
                    "status": "VERIFIED",
                    "verified_by": verified_by,
                    "verified_at": now,
                    "notes": notes or dep.get("notes", ""),
                    "updated_at": now,
                }
            },
        )

        collection_ids = dep.get("collection_ids") or []
        for c_id in collection_ids:
            coll = await database.collection(COLLECTION_COLLECTIONS).find_one({"id": c_id})
            if coll:
                coll_amt = float(coll.get("collected_amount", 0.0))
                await database.collection(COLLECTION_COLLECTIONS).update_one(
                    {"id": c_id},
                    {
                        "$set": {
                            "status": "VERIFIED",
                            "deposited_amount": coll_amt,
                            "pending_amount": 0.0,
                            "verified_by": verified_by,
                            "verified_at": now,
                            "updated_at": now,
                        }
                    },
                )

        logger.info("COD deposit %s VERIFIED by %s", deposit_id, verified_by)
        return {"deposit_id": deposit_id, "status": "VERIFIED", "verified_by": verified_by, "verified_at": now}

    async def dispute_deposit(
        self,
        *,
        deposit_id: str,
        disputed_by: str,
        reason: str,
        variance_amount: float,
    ) -> Dict[str, Any]:
        """Flags deposit discrepancy (e.g. rider claimed ₹2,000, bank statement shows ₹1,800)."""
        now = _now_iso()
        await database.collection(COLLECTION_DEPOSITS).update_one(
            {"id": deposit_id},
            {
                "$set": {
                    "status": "DISPUTED",
                    "variance_amount": round(float(variance_amount), 2),
                    "dispute_reason": reason,
                    "disputed_by": disputed_by,
                    "updated_at": now,
                }
            },
        )
        return {"deposit_id": deposit_id, "status": "DISPUTED", "variance": variance_amount, "reason": reason}

    async def get_rider_active_collections(self, rider_id: str) -> List[Dict[str, Any]]:
        """Fetches all unsettled COD collections for a specific rider."""
        docs = await database.find_many(
            COLLECTION_COLLECTIONS,
            {
                "rider_id": rider_id,
                "status": {"$in": ["CASH_COLLECTED", "DEPOSITED", "PARTIALLY_DEPOSITED", "OVERDUE"]},
            },
        )
        docs.sort(key=lambda d: d.get("collected_at") or "")
        return docs

    async def get_rider_cod_outstanding(self, rider_id: str) -> float:
        """Calculates total unsettled cash liability currently in rider custody."""
        active = await self.get_rider_active_collections(rider_id)
        # Outstanding is cash not yet verified
        unverified = [c for c in active if c.get("status") in ("CASH_COLLECTED", "OVERDUE")]
        total_pending = sum(float(c.get("pending_amount", 0.0)) for c in unverified)
        return round(total_pending, 2)

    async def list_collections(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        rider_id: Optional[str] = None,
        overdue_only: bool = False,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Server-side paginated list of COD collections with filter and search."""
        now = _now_iso()
        query: Dict[str, Any] = {}

        if status:
            query["status"] = status.upper()
        if rider_id:
            query["rider_id"] = rider_id
        if overdue_only:
            query["deposit_deadline"] = {"$lt": now}
            query["status"] = {"$in": ["CASH_COLLECTED", "OVERDUE"]}
        if search:
            query["$or"] = [
                {"order_id": {"$regex": search, "$options": "i"}},
                {"rider_id": {"$regex": search, "$options": "i"}},
                {"customer_id": {"$regex": search, "$options": "i"}},
                {"bank_utr": {"$regex": search, "$options": "i"}},
            ]

        all_matching = await database.find_many(COLLECTION_COLLECTIONS, query)

        # Dynamic overdue tag evaluation
        for doc in all_matching:
            if doc.get("status") == "CASH_COLLECTED":
                deadline = doc.get("deposit_deadline") or ""
                if deadline and deadline < now:
                    doc["status"] = "OVERDUE"

        total_count = len(all_matching)
        all_matching.sort(key=lambda d: d.get("collected_at") or "", reverse=True)
        return all_matching[skip : skip + limit], total_count

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Calculates top-level COD metrics for Finance Dashboard."""
        now = _now_iso()
        all_colls = await database.find_many(COLLECTION_COLLECTIONS, {})

        total_orders = len(all_colls)
        total_collected = sum(float(c.get("collected_amount", 0.0)) for c in all_colls)
        total_deposited_verified = sum(
            float(c.get("deposited_amount", 0.0)) for c in all_colls if c.get("status") == "VERIFIED"
        )
        total_outstanding = sum(
            float(c.get("pending_amount", 0.0)) for c in all_colls if c.get("status") in ("CASH_COLLECTED", "OVERDUE")
        )

        overdue_colls = [
            c for c in all_colls
            if c.get("status") in ("CASH_COLLECTED", "OVERDUE") and (c.get("deposit_deadline") or "") < now
        ]
        total_overdue = sum(float(c.get("pending_amount", 0.0)) for c in overdue_colls)
        overdue_riders = set(c.get("rider_id") for c in overdue_colls if c.get("rider_id"))

        pending_verification = await database.find_many(COLLECTION_DEPOSITS, {"status": "SUBMITTED"})

        return {
            "total_cod_orders": total_orders,
            "total_cod_collected": round(total_collected, 2),
            "total_deposited_verified": round(total_deposited_verified, 2),
            "total_outstanding": round(total_outstanding, 2),
            "total_overdue": round(total_overdue, 2),
            "overdue_orders_count": len(overdue_colls),
            "overdue_riders_count": len(overdue_riders),
            "pending_verifications_count": len(pending_verification),
        }


cod_repository = CodRepository()
