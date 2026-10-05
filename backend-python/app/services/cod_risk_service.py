"""COD Risk & Rider Guardrails Engine for QuickPress.

Enforces:
1. Dynamic Cash Ceiling: Rider cannot accumulate > ₹5,000 (configurable) in unverified cash.
2. 24-Hour Overdue Rule: If any unverified cash collection is > 24 hours old,
   rider is automatically blocked from receiving new COD orders.
3. Automatic Reconciliation: When deposit is verified, automatically triggers
   General Ledger posting (Debit 1010 Bank Operating Account / Credit 1030 Rider Cash Custody).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database
from app.db.cod_repository import cod_repository
from app.services.general_ledger_service import general_ledger_service

logger = logging.getLogger(__name__)

DEFAULT_COD_CEILING = 5000.0  # ₹5,000 maximum cash in custody
DEFAULT_MAX_HOURS = 24.0      # 24 hours deposit deadline


class CodRiskService:
    """Service governing Rider COD custody risk, dispatch limits, and verification."""

    async def get_system_cod_rules(self) -> Dict[str, float]:
        """Fetches dynamic COD limits from database or falls back to system defaults."""
        rules = await database.collection("system_finance_settings").find_one({"_id": "cod_rules"})
        if not rules:
            return {"max_holding_limit": DEFAULT_COD_CEILING, "overdue_hours": DEFAULT_MAX_HOURS}
        return {
            "max_holding_limit": float(rules.get("maxHoldingLimit", DEFAULT_COD_CEILING)),
            "overdue_hours": float(rules.get("overdueHours", DEFAULT_MAX_HOURS)),
        }

    async def check_rider_cod_eligibility(
        self,
        rider_id: str,
        new_order_amount: float = 0.0,
    ) -> Dict[str, Any]:
        """Checks if a rider is eligible to be assigned a new Cash on Delivery order."""
        rules = await self.get_system_cod_rules()
        max_limit = rules["max_holding_limit"]

        active_colls = await cod_repository.get_rider_active_collections(rider_id)
        now_dt = datetime.now(timezone.utc)

        # 1. Check for overdue cash collections (> 24 hours)
        overdue_colls = []
        for coll in active_colls:
            if coll.get("status") in ("CASH_COLLECTED", "OVERDUE"):
                deadline_str = coll.get("deposit_deadline")
                if deadline_str:
                    try:
                        dl_dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                        if now_dt > dl_dt:
                            overdue_colls.append(coll)
                    except Exception:
                        pass

        if overdue_colls:
            oldest = overdue_colls[0]
            overdue_sum = sum(float(c.get("pending_amount", 0.0)) for c in overdue_colls)
            return {
                "is_eligible": False,
                "reason": f"Rider has ₹{overdue_sum:.2f} in overdue COD exceeding 24h deadline (Order: {oldest.get('order_id')}).",
                "risk_flag": "OVERDUE_RESTRICTED",
                "current_outstanding": await cod_repository.get_rider_cod_outstanding(rider_id),
                "max_limit": max_limit,
                "overdue_count": len(overdue_colls),
            }

        # 2. Check cumulative cash ceiling (Current Pending + New Order Amount > Limit)
        current_pending = await cod_repository.get_rider_cod_outstanding(rider_id)
        projected_total = current_pending + new_order_amount

        if projected_total > max_limit:
            return {
                "is_eligible": False,
                "reason": f"Projected COD holding of ₹{projected_total:.2f} exceeds rider ceiling of ₹{max_limit:.2f}.",
                "risk_flag": "LIMIT_EXCEEDED",
                "current_outstanding": current_pending,
                "max_limit": max_limit,
                "overdue_count": 0,
            }

        return {
            "is_eligible": True,
            "reason": "Rider is within allowable cash holding limits and has no overdue collections.",
            "risk_flag": "OK",
            "current_outstanding": current_pending,
            "max_limit": max_limit,
            "overdue_count": 0,
        }

    async def verify_and_reconcile_deposit(
        self,
        *,
        deposit_id: str,
        verified_by: str,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Finance Admin verifies deposit; posts double-entry ledger lines and relieves rider custody."""
        dep = await database.collection("cod_deposits").find_one({"id": deposit_id})
        if not dep:
            raise ValueError(f"Deposit record {deposit_id} not found.")

        rider_id = dep["rider_id"]
        deposited_amount = float(dep.get("deposited_amount", 0.0))
        bank_utr = dep.get("bank_utr") or f"UTR-{deposit_id[:8]}"

        # 1. Update COD repository verification status
        verif_res = await cod_repository.verify_deposit(
            deposit_id=deposit_id,
            verified_by=verified_by,
            notes=notes,
        )

        # 2. Post balanced Double-Entry General Ledger batch
        # Debit: Bank Operating Account (1010)
        # Credit: Rider Cash-in-Hand (1030)
        ledger_lines = await general_ledger_service.post_cod_cash_deposited_to_bank(
            deposit_id=deposit_id,
            rider_id=rider_id,
            deposited_amount=deposited_amount,
            bank_utr=bank_utr,
            verified_by=verified_by,
        )

        # 3. Re-evaluate rider eligibility
        eligibility = await self.check_rider_cod_eligibility(rider_id)

        # If eligible, unblock rider profile
        if eligibility["is_eligible"]:
            await database.collection("rider_profiles").update_one(
                {"id": rider_id},
                {"$set": {"is_cod_blocked": False, "cod_blocked_reason": None}},
            )

        logger.info(
            "Deposit %s verified: ₹%.2f reconciled via General Ledger into Bank. Rider %s new outstanding: ₹%.2f",
            deposit_id, deposited_amount, rider_id, eligibility["current_outstanding"]
        )

        return {
            "ok": True,
            "deposit_id": deposit_id,
            "deposited_amount": deposited_amount,
            "rider_id": rider_id,
            "bank_utr": bank_utr,
            "ledger_lines_posted": len(ledger_lines),
            "rider_eligibility": eligibility,
        }

    async def get_overdue_riders_report(self) -> List[Dict[str, Any]]:
        """Generates list of all riders with overdue unverified cash for fleet reminders."""
        now = datetime.now(timezone.utc)
        now_iso = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")

        # Find all unverified collections past deadline
        overdue_colls = await database.find_many(
            "cod_collections",
            {
                "status": {"$in": ["CASH_COLLECTED", "OVERDUE"]},
                "deposit_deadline": {"$lt": now_iso},
            },
        )

        rider_map: Dict[str, Dict[str, Any]] = {}
        for coll in overdue_colls:
            r_id = coll.get("rider_id", "unknown")
            if r_id not in rider_map:
                rider_map[r_id] = {
                    "rider_id": r_id,
                    "total_overdue_amount": 0.0,
                    "orders_count": 0,
                    "oldest_collection_time": coll.get("collected_at"),
                    "order_ids": [],
                }
            amt = float(coll.get("pending_amount", 0.0))
            rider_map[r_id]["total_overdue_amount"] += amt
            rider_map[r_id]["orders_count"] += 1
            rider_map[r_id]["order_ids"].append(coll.get("order_id"))

        # Fetch rider profiles for names and phone numbers
        result = []
        for r_id, data in rider_map.items():
            profile = await database.collection("rider_profiles").find_one({"id": r_id})
            data["rider_name"] = profile.get("name") if profile else f"Rider {r_id}"
            data["rider_phone"] = profile.get("phone") if profile else ""
            data["city"] = profile.get("city") if profile else "Unknown"
            data["total_overdue_amount"] = round(data["total_overdue_amount"], 2)
            result.append(data)

        result.sort(key=lambda d: d["total_overdue_amount"], reverse=True)
        return result


cod_risk_service = CodRiskService()
