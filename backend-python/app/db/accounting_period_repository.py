"""Accounting Period Repository — Financial Period Lock Governance for QuickPress.

Controls financial closing of fiscal months and years:
1. 'OPEN': Active transactions and ledger postings are permitted.
2. 'SOFT_CLOSE': Only designated finance admins can post adjustment entries.
3. 'LOCKED': Complete hard lock. No new ledger entries or edits can be posted
   with transaction dates in this period. Prior period adjustments must post
   to the current open period.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database

logger = logging.getLogger(__name__)

COLLECTION = "accounting_periods"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _get_period_key(date_str_or_period: Optional[str] = None) -> str:
    if not date_str_or_period:
        return datetime.now(timezone.utc).strftime("%Y-%m")
    clean = date_str_or_period.strip()
    if len(clean) == 7 and clean[4] == "-":
        return clean
    try:
        dt = datetime.fromisoformat(clean.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m")


class AccountingPeriodRepository:
    """Repository managing financial period locks and monthly closing books."""

    async def ensure_default_periods(self) -> None:
        """Seeds current and surrounding monthly periods if not already initialized."""
        now = datetime.now(timezone.utc)
        curr_period = now.strftime("%Y-%m")

        existing = await database.collection(COLLECTION).find_one({"period": curr_period})
        if not existing:
            doc = {
                "_id": curr_period,
                "period": curr_period,
                "status": "OPEN",
                "locked_by": None,
                "locked_at": None,
                "closing_notes": "Automatically initialized current open period",
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
            await database.insert_one(COLLECTION, doc)
            logger.info("Initialized default open accounting period: %s", curr_period)

    async def is_period_locked(self, date_or_period: Optional[str] = None) -> bool:
        """Returns True if the accounting period is LOCKED."""
        period_key = _get_period_key(date_or_period)
        period = await database.collection(COLLECTION).find_one({"period": period_key})
        if not period:
            # If not yet defined, treat as OPEN by default
            return False
        return period.get("status") == "LOCKED"

    async def lock_period(
        self,
        period_str: str,
        locked_by: str,
        closing_notes: str = "",
    ) -> Dict[str, Any]:
        """Hard-locks an accounting period."""
        period_key = _get_period_key(period_str)
        now = _now_iso()

        existing = await database.collection(COLLECTION).find_one({"period": period_key})
        if existing:
            update = {
                "$set": {
                    "status": "LOCKED",
                    "locked_by": locked_by,
                    "locked_at": now,
                    "closing_notes": closing_notes,
                    "updated_at": now,
                }
            }
            await database.collection(COLLECTION).update_one({"period": period_key}, update)
        else:
            doc = {
                "_id": period_key,
                "period": period_key,
                "status": "LOCKED",
                "locked_by": locked_by,
                "locked_at": now,
                "closing_notes": closing_notes,
                "created_at": now,
                "updated_at": now,
            }
            await database.insert_one(COLLECTION, doc)

        logger.warning(
            "Accounting period %s LOCKED by %s. Reason: %s", period_key, locked_by, closing_notes
        )
        return {"period": period_key, "status": "LOCKED", "locked_by": locked_by, "locked_at": now}

    async def unlock_period(
        self,
        period_str: str,
        unlocked_by: str,
        reason: str,
    ) -> Dict[str, Any]:
        """Unlocks an accounting period with required audit justification."""
        period_key = _get_period_key(period_str)
        now = _now_iso()

        update = {
            "$set": {
                "status": "OPEN",
                "unlocked_by": unlocked_by,
                "unlocked_at": now,
                "unlock_reason": reason,
                "updated_at": now,
            }
        }
        await database.collection(COLLECTION).update_one({"period": period_key}, update)
        logger.warning(
            "Accounting period %s UNLOCKED by %s. Reason: %s", period_key, unlocked_by, reason
        )
        return {"period": period_key, "status": "OPEN", "unlocked_by": unlocked_by, "unlocked_at": now}

    async def list_periods(self) -> List[Dict[str, Any]]:
        """Lists all recorded accounting periods sorted chronologically."""
        await self.ensure_default_periods()
        docs = await database.find_many(COLLECTION, {})
        docs.sort(key=lambda d: d.get("period") or "", reverse=True)
        return docs

    async def get_period(self, period_str: str) -> Optional[Dict[str, Any]]:
        period_key = _get_period_key(period_str)
        return await database.collection(COLLECTION).find_one({"period": period_key})


accounting_period_repository = AccountingPeriodRepository()
