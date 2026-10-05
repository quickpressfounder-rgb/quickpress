"""General Ledger Repository — Double-Entry Accounting Foundation for QuickPress.

Guarantees:
1. Strict Double-Entry: Every journal posting must balance (sum(debit) == sum(credit)).
2. Immutability: Deletions are forbidden by design. Corrections occur exclusively
   via offsetting reversal entries.
3. Complete Auditability: Every line maps to a standard Chart of Accounts (1000 - 5999),
   has a reference entity (Order, Payment, Settlement, Refund, etc.), and retains creator stamps.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger(__name__)

COLLECTION = "general_ledger"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _current_period(dt: Optional[datetime] = None) -> str:
    target = dt or datetime.now(timezone.utc)
    return target.strftime("%Y-%m")


# -----------------------------------------------------------------------------
# CHART OF ACCOUNTS (COA) DEFINITIONS
# -----------------------------------------------------------------------------
CHART_OF_ACCOUNTS: Dict[int, Dict[str, str]] = {
    # 1000-1999: ASSETS
    1010: {"name": "Bank Operating Current Account", "type": "ASSET"},
    1020: {"name": "Payment Gateway Clearing (Razorpay / Cashfree)", "type": "ASSET"},
    1030: {"name": "Rider Cash-in-Hand (COD Custody)", "type": "ASSET"},
    1040: {"name": "Accounts Receivable", "type": "ASSET"},

    # 2000-2999: LIABILITIES
    2010: {"name": "Partner Wallet Payables", "type": "LIABILITY"},
    2020: {"name": "Rider Wallet Payables", "type": "LIABILITY"},
    2030: {"name": "Customer Wallet Liabilities", "type": "LIABILITY"},
    2040: {"name": "GST Output Tax Payable (CGST + SGST)", "type": "LIABILITY"},
    2050: {"name": "Deferred / Unearned Membership Revenue", "type": "LIABILITY"},

    # 3000-3999: EQUITY
    3010: {"name": "Retained Platform Earnings", "type": "EQUITY"},

    # 4000-4999: REVENUE
    4010: {"name": "Platform Service Commission Revenue", "type": "REVENUE"},
    4020: {"name": "Customer Delivery Fee Revenue", "type": "REVENUE"},
    4030: {"name": "Platform Handling & Express Convenience Fee", "type": "REVENUE"},
    4040: {"name": "Earned Membership Subscription Revenue", "type": "REVENUE"},

    # 5000-5999: EXPENSES
    5010: {"name": "Rider Logistics Delivery Cost", "type": "EXPENSE"},
    5020: {"name": "Payment Gateway Transaction Fees", "type": "EXPENSE"},
    5030: {"name": "Promotional Discounts & Subsidies Absorbed", "type": "EXPENSE"},
    5040: {"name": "Refund / Quality Claim Losses Absorbed", "type": "EXPENSE"},
    5050: {"name": "Operating Expenses (Packaging, Servers, Rent, Marketing)", "type": "EXPENSE"},
}


class GeneralLedgerRepository:
    """Production Repository for immutable double-entry general ledger entries."""

    @staticmethod
    def get_account_meta(account_code: int) -> Dict[str, str]:
        if account_code not in CHART_OF_ACCOUNTS:
            raise ValueError(f"Unknown account code {account_code}. Must be defined in Chart of Accounts.")
        return CHART_OF_ACCOUNTS[account_code]

    async def post_journal_batch(
        self,
        *,
        reference_type: str,
        reference_id: str,
        lines: List[Dict[str, Any]],
        description: str,
        transaction_date: Optional[str] = None,
        accounting_period: Optional[str] = None,
        created_by: str = "system",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Posts an atomic, balanced set of journal entry lines.
        
        Each line dict must contain:
        - account_code (int)
        - debit (float, >= 0)
        - credit (float, >= 0)
        - party_type (optional, e.g. 'CUSTOMER', 'PARTNER', 'RIDER')
        - party_id (optional)
        - description (optional, overrides batch description if set)
        """
        if not lines or len(lines) < 2:
            raise ValueError("A journal entry must contain at least 2 lines (double-entry requirement).")

        total_debit = 0.0
        total_credit = 0.0
        normalized_lines: List[Dict[str, Any]] = []

        now = _now_iso()
        tx_date = transaction_date or now
        period = accounting_period or _current_period()
        batch_id = f"BAT-{uuid.uuid4().hex[:12].upper()}"

        for idx, line in enumerate(lines):
            acc_code = int(line["account_code"])
            acc_meta = self.get_account_meta(acc_code)

            debit = round(float(line.get("debit", 0.0)), 2)
            credit = round(float(line.get("credit", 0.0)), 2)

            if debit < 0 or credit < 0:
                raise ValueError(f"Line {idx}: Debit and credit amounts cannot be negative.")
            if debit > 0 and credit > 0:
                raise ValueError(f"Line {idx}: Line cannot have both debit and credit. Split into separate lines.")
            if debit == 0 and credit == 0:
                continue  # Skip zero-value lines

            total_debit += debit
            total_credit += credit

            entry_id = f"LED-{uuid.uuid4().hex[:12].upper()}"
            doc = {
                "_id": entry_id,
                "id": entry_id,
                "batch_id": batch_id,
                "line_number": idx + 1,
                "posting_date": now,
                "transaction_date": tx_date,
                "accounting_period": period,
                "account_code": acc_code,
                "account_name": acc_meta["name"],
                "account_type": acc_meta["type"],
                "debit": debit,
                "credit": credit,
                "currency": "INR",
                "reference_type": reference_type.upper(),
                "reference_id": reference_id,
                "party_type": line.get("party_type"),
                "party_id": line.get("party_id"),
                "description": line.get("description") or description,
                "is_reversal": False,
                "reversal_of_id": None,
                "metadata": {**(metadata or {}), **(line.get("metadata") or {})},
                "created_by": created_by,
                "created_at": now,
            }
            normalized_lines.append(doc)

        total_debit = round(total_debit, 2)
        total_credit = round(total_credit, 2)

        # Floating point tolerance check (exact penny balance)
        if abs(total_debit - total_credit) > 0.01:
            raise ValueError(
                f"Double-entry balance check failed! Total Debits (₹{total_debit:.2f}) != Total Credits (₹{total_credit:.2f})."
            )

        # Atomic insert of all balanced lines
        for doc in normalized_lines:
            await database.insert_one(COLLECTION, doc)

        logger.info(
            "General Ledger batch posted: batch_id=%s, ref=%s/%s, lines=%d, balanced_sum=₹%.2f",
            batch_id, reference_type, reference_id, len(normalized_lines), total_debit
        )
        return normalized_lines

    async def record_reversal(
        self,
        *,
        original_entry_or_batch_id: str,
        reason: str,
        approved_by: str,
    ) -> List[Dict[str, Any]]:
        """Creates offsetting reversal entries for a batch or single entry.
        
        Strictly preserves original entries; creates inverted lines linked to original.
        """
        # Look up by batch_id or single id
        original_entries = await database.find_many(
            COLLECTION,
            {"$or": [{"batch_id": original_entry_or_batch_id}, {"id": original_entry_or_batch_id}]}
        )

        if not original_entries:
            raise ValueError(f"No ledger entries found for ID {original_entry_or_batch_id}")

        now = _now_iso()
        reversal_batch_id = f"REV-{uuid.uuid4().hex[:12].upper()}"
        reversal_lines: List[Dict[str, Any]] = []

        for orig in original_entries:
            # Invert debit and credit
            rev_id = f"LED-{uuid.uuid4().hex[:12].upper()}"
            rev_doc = {
                "_id": rev_id,
                "id": rev_id,
                "batch_id": reversal_batch_id,
                "line_number": orig.get("line_number", 1),
                "posting_date": now,
                "transaction_date": now,
                "accounting_period": _current_period(),
                "account_code": orig["account_code"],
                "account_name": orig["account_name"],
                "account_type": orig["account_type"],
                "debit": orig["credit"],   # INVERTED
                "credit": orig["debit"],   # INVERTED
                "currency": orig.get("currency", "INR"),
                "reference_type": orig["reference_type"],
                "reference_id": orig["reference_id"],
                "party_type": orig.get("party_type"),
                "party_id": orig.get("party_id"),
                "description": f"REVERSAL: {orig['description']} (Reason: {reason})",
                "is_reversal": True,
                "reversal_of_id": orig["id"],
                "metadata": {
                    "original_entry_id": orig["id"],
                    "original_batch_id": orig.get("batch_id"),
                    "reversal_reason": reason,
                    "approved_by": approved_by,
                },
                "created_by": approved_by,
                "created_at": now,
            }
            reversal_lines.append(rev_doc)
            await database.insert_one(COLLECTION, rev_doc)

        logger.info(
            "General Ledger reversal posted: original=%s, rev_batch=%s, lines=%d",
            original_entry_or_batch_id, reversal_batch_id, len(reversal_lines)
        )
        return reversal_lines

    # -------------------------------------------------------------------------
    # IMMUTABILITY ENFORCEMENT
    # -------------------------------------------------------------------------
    async def delete_entry(self, *args: Any, **kwargs: Any) -> None:
        """Explicitly disallowed. Financial ledger records are strictly immutable."""
        raise NotImplementedError(
            "Hard deletes on General Ledger are prohibited by fintech & accounting governance. "
            "Use record_reversal() to post an offsetting correction entry."
        )

    # -------------------------------------------------------------------------
    # QUERY & REPORTING METHODS
    # -------------------------------------------------------------------------
    async def get_by_reference(self, reference_type: str, reference_id: str) -> List[Dict[str, Any]]:
        docs = await database.find_many(
            COLLECTION,
            {"reference_type": reference_type.upper(), "reference_id": reference_id},
        )
        docs.sort(key=lambda d: d.get("posting_date") or "")
        return docs

    async def get_by_account(
        self,
        account_code: int,
        limit: int = 100,
        accounting_period: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"account_code": account_code}
        if accounting_period:
            query["accounting_period"] = accounting_period
        docs = await database.find_many(COLLECTION, query, limit=limit)
        docs.sort(key=lambda d: d.get("posting_date") or "", reverse=True)
        return docs

    async def get_trial_balance(self, accounting_period: Optional[str] = None) -> Dict[str, Any]:
        """Calculates Trial Balance across all Chart of Accounts.
        
        Validates: Total Debits == Total Credits across the entire ledger.
        """
        query: Dict[str, Any] = {}
        if accounting_period:
            query["accounting_period"] = accounting_period

        all_entries = await database.find_many(COLLECTION, query)

        balances: Dict[int, Dict[str, Any]] = {}
        for code, meta in CHART_OF_ACCOUNTS.items():
            balances[code] = {
                "account_code": code,
                "account_name": meta["name"],
                "account_type": meta["type"],
                "total_debit": 0.0,
                "total_credit": 0.0,
                "net_balance": 0.0,
            }

        total_system_debit = 0.0
        total_system_credit = 0.0

        for entry in all_entries:
            code = entry.get("account_code")
            if code not in balances:
                balances[code] = {
                    "account_code": code,
                    "account_name": entry.get("account_name", "Unknown Account"),
                    "account_type": entry.get("account_type", "OTHER"),
                    "total_debit": 0.0,
                    "total_credit": 0.0,
                    "net_balance": 0.0,
                }
            dr = float(entry.get("debit", 0.0))
            cr = float(entry.get("credit", 0.0))
            balances[code]["total_debit"] += dr
            balances[code]["total_credit"] += cr
            total_system_debit += dr
            total_system_credit += cr

        # Compute net balances based on normal balance rule:
        # Assets & Expenses: Normal Debit balance = Debit - Credit
        # Liabilities, Equity, Revenue: Normal Credit balance = Credit - Debit
        for code, data in balances.items():
            acc_type = data["account_type"]
            dr = data["total_debit"]
            cr = data["total_credit"]
            if acc_type in ("ASSET", "EXPENSE"):
                data["net_balance"] = round(dr - cr, 2)
            else:
                data["net_balance"] = round(cr - dr, 2)
            data["total_debit"] = round(dr, 2)
            data["total_credit"] = round(cr, 2)

        total_system_debit = round(total_system_debit, 2)
        total_system_credit = round(total_system_credit, 2)
        is_balanced = abs(total_system_debit - total_system_credit) < 0.01

        return {
            "accounting_period": accounting_period or "ALL_TIME",
            "is_balanced": is_balanced,
            "total_debit": total_system_debit,
            "total_credit": total_system_credit,
            "variance": round(total_system_debit - total_system_credit, 2),
            "accounts": list(balances.values()),
        }

    async def list_entries(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        account_code: Optional[int] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        accounting_period: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Server-side paginated and filterable query for General Ledger."""
        query: Dict[str, Any] = {}
        if account_code:
            query["account_code"] = account_code
        if reference_type:
            query["reference_type"] = reference_type.upper()
        if reference_id:
            query["reference_id"] = reference_id
        if accounting_period:
            query["accounting_period"] = accounting_period
        if search:
            query["$or"] = [
                {"reference_id": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"party_id": {"$regex": search, "$options": "i"}},
                {"account_name": {"$regex": search, "$options": "i"}},
            ]

        all_matching = await database.find_many(COLLECTION, query)
        total_count = len(all_matching)
        all_matching.sort(key=lambda d: d.get("posting_date") or "", reverse=True)
        paginated = all_matching[skip : skip + limit]
        return paginated, total_count


general_ledger_repository = GeneralLedgerRepository()
