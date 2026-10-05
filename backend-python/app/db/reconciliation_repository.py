"""3-Way Automated Reconciliation Repository for QuickPress.

Tracks:
1. Payment Gateway vs QuickPress vs Bank.
2. Rider COD Cash vs CDM Deposit vs Bank Statement.
3. Partner/Rider Settlements vs Bank Payout API vs General Ledger.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger(__name__)

COLLECTION = "reconciliation_runs"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class ReconciliationRepository:
    """Repository managing 3-way financial reconciliation runs and variance matching."""

    async def record_run(
        self,
        *,
        recon_type: str,           # 'GATEWAY_VS_BANK', 'COD_VS_BANK', 'SETTLEMENT_VS_BANK'
        external_source: str,      # 'RAZORPAY', 'CASHFREE', 'HDFC_STATEMENT', 'RIDER_CDM'
        external_reference: str,   # Gateway UTR, bank ref, deposit slip UTR
        internal_reference: str,   # Order ID, Settlement ID, COD ID
        external_amount: float,
        internal_amount: float,
        discrepancy_reason: Optional[str] = None,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Records a reconciliation comparison run and calculates variance."""
        now = _now_iso()
        ext_amt = round(float(external_amount), 2)
        int_amt = round(float(internal_amount), 2)
        variance = round(ext_amt - int_amt, 2)

        if abs(variance) < 0.01:
            status = "MATCHED"
        elif abs(variance) > 0 and ext_amt > 0 and int_amt > 0:
            status = "PARTIALLY_MATCHED" if abs(variance) <= (int_amt * 0.05) else "MISMATCH"
        else:
            status = "MISMATCH"

        rec_id = f"REC-{uuid.uuid4().hex[:12].upper()}"

        doc = {
            "_id": rec_id,
            "id": rec_id,
            "recon_type": recon_type.upper(),
            "external_source": external_source.upper(),
            "external_reference": external_reference.strip(),
            "internal_reference": internal_reference.strip(),
            "external_amount": ext_amt,
            "internal_amount": int_amt,
            "variance": variance,
            "status": status,  # MATCHED, PARTIALLY_MATCHED, MISMATCH, RESOLVED
            "discrepancy_reason": discrepancy_reason or ("Exact match" if status == "MATCHED" else f"Variance of ₹{variance:.2f}"),
            "resolved_by": None,
            "resolved_at": None,
            "resolution_notes": None,
            "notes": notes,
            "created_at": now,
            "updated_at": now,
        }

        await database.collection(COLLECTION).insert_one(doc)
        logger.info(
            "Reconciliation run recorded: id=%s, type=%s, ext=₹%.2f, int=₹%.2f, status=%s, var=₹%.2f",
            rec_id, recon_type, ext_amt, int_amt, status, variance
        )
        return doc

    async def resolve_run(
        self,
        *,
        run_id: str,
        resolved_by: str,
        resolution_notes: str,
    ) -> Dict[str, Any]:
        """Admin marks a mismatched reconciliation item as RESOLVED with audit note."""
        now = _now_iso()
        rec = await database.collection(COLLECTION).find_one({"id": run_id})
        if not rec:
            raise ValueError(f"Reconciliation record {run_id} not found.")

        await database.collection(COLLECTION).update_one(
            {"id": run_id},
            {
                "$set": {
                    "status": "RESOLVED",
                    "resolved_by": resolved_by,
                    "resolved_at": now,
                    "resolution_notes": resolution_notes,
                    "updated_at": now,
                }
            },
        )
        logger.info("Reconciliation mismatch %s RESOLVED by %s: %s", run_id, resolved_by, resolution_notes)
        return {"run_id": run_id, "status": "RESOLVED", "resolved_by": resolved_by, "resolved_at": now}

    async def list_runs(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        recon_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Server-side paginated list of reconciliation records."""
        query: Dict[str, Any] = {}
        if recon_type:
            query["recon_type"] = recon_type.upper()
        if status:
            query["status"] = status.upper()
        if search:
            query["$or"] = [
                {"external_reference": {"$regex": search, "$options": "i"}},
                {"internal_reference": {"$regex": search, "$options": "i"}},
                {"discrepancy_reason": {"$regex": search, "$options": "i"}},
            ]

        all_matching = await database.find_many(COLLECTION, query)
        total_count = len(all_matching)
        all_matching.sort(key=lambda d: d.get("created_at") or "", reverse=True)
        return all_matching[skip : skip + limit], total_count

    async def get_summary(self) -> Dict[str, Any]:
        """Calculates 3-way reconciliation totals and mismatch counts."""
        all_runs = await database.find_many(COLLECTION, {})
        matched = [r for r in all_runs if r.get("status") == "MATCHED"]
        mismatched = [r for r in all_runs if r.get("status") in ("MISMATCH", "PARTIALLY_MATCHED")]
        resolved = [r for r in all_runs if r.get("status") == "RESOLVED"]

        total_variance = sum(abs(float(r.get("variance", 0.0))) for r in mismatched)

        return {
            "total_runs": len(all_runs),
            "matched_count": len(matched),
            "mismatch_count": len(mismatched),
            "resolved_count": len(resolved),
            "total_unresolved_variance": round(total_variance, 2),
            "match_rate_percentage": round((len(matched) / len(all_runs) * 100), 1) if all_runs else 100.0,
        }


reconciliation_repository = ReconciliationRepository()
