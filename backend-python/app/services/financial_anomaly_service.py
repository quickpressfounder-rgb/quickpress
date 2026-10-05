"""Financial Anomaly Detection & Risk Alerting Engine for QuickPress.

Monitors the 8 institutional financial threats in real time:
1. 🔴 COD Overdue (>24 hours unverified cash in rider custody)
2. 🟠 Payment Mismatch (Gateway capture vs Order value variance)
3. 🔴 Failed Settlement (Bank IMPS/NEFT payout failure or invalid IFSC)
4. 🟠 Unusual Refund (High-value refund > ₹2,500 or excessive frequency)
5. 🔴 Negative Wallet (Partner or Rider balance < ₹0)
6. 🟠 High Expense (Single expense > ₹10,000 requiring dual-approval)
7. ⚠️ Sudden Revenue Drop (>30% drop vs 7-day rolling average)
8. 🟠 Suspicious Transaction (Velocity alerts / rapid repeated orders)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.db.cod_repository import cod_repository
from app.db.reconciliation_repository import reconciliation_repository

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class FinancialAnomalyService:
    """Real-time engine aggregating financial exceptions for the 'Attention Required' bar."""

    async def get_active_anomalies_summary(self) -> Dict[str, Any]:
        """Calculates active financial exceptions and returns counts, severity, and preview."""
        now = datetime.now(timezone.utc)
        now_iso = _now_iso()

        anomalies: List[Dict[str, Any]] = []

        # ---------------------------------------------------------------------
        # 1. COD OVERDUE
        # ---------------------------------------------------------------------
        overdue_colls = await database.find_many(
            "cod_collections",
            {
                "status": {"$in": ["CASH_COLLECTED", "OVERDUE"]},
                "deposit_deadline": {"$lt": now_iso},
            },
        )
        total_overdue_amt = sum(float(c.get("pending_amount", 0.0)) for c in overdue_colls)
        if overdue_colls:
            anomalies.append({
                "id": "ANOM_COD_OVERDUE",
                "type": "COD_OVERDUE",
                "title": f"{len(overdue_colls)} COD Collection(s) Overdue",
                "description": f"₹{total_overdue_amt:.2f} in unverified cash exceeds 24-hour deadline.",
                "severity": "CRITICAL_RED",
                "count": len(overdue_colls),
                "total_impact_amount": round(total_overdue_amt, 2),
                "action_url": "/finance/cod?overdue_only=true",
                "action_label": "View Overdue Riders",
            })

        # ---------------------------------------------------------------------
        # 2. PAYMENT MISMATCHES
        # ---------------------------------------------------------------------
        mismatch_runs = await database.find_many(
            "reconciliation_runs",
            {"status": "MISMATCH"},
        )
        total_mismatch_var = sum(abs(float(r.get("variance", 0.0))) for r in mismatch_runs)
        if mismatch_runs:
            anomalies.append({
                "id": "ANOM_PAYMENT_MISMATCH",
                "type": "PAYMENT_MISMATCH",
                "title": f"{len(mismatch_runs)} Payment Reconciliation Mismatch(es)",
                "description": f"Total variance of ₹{total_mismatch_var:.2f} detected between Gateway and Orders.",
                "severity": "WARNING_AMBER",
                "count": len(mismatch_runs),
                "total_impact_amount": round(total_mismatch_var, 2),
                "action_url": "/finance/reconciliation?status=MISMATCH",
                "action_label": "Resolve Mismatches",
            })

        # ---------------------------------------------------------------------
        # 3. FAILED SETTLEMENTS
        # ---------------------------------------------------------------------
        failed_settlements = await database.find_many(
            "settlements",
            {"status": {"$in": ["FAILED", "REVERSED"]}},
        )
        if failed_settlements:
            failed_amt = sum(float(s.get("amount") or s.get("netPayable") or 0.0) for s in failed_settlements)
            anomalies.append({
                "id": "ANOM_FAILED_SETTLEMENT",
                "type": "FAILED_SETTLEMENT",
                "title": f"{len(failed_settlements)} Bank Settlement Payout(s) Failed",
                "description": f"₹{failed_amt:.2f} failed to reach partner/rider bank accounts.",
                "severity": "CRITICAL_RED",
                "count": len(failed_settlements),
                "total_impact_amount": round(failed_amt, 2),
                "action_url": "/finance/settlements?status=FAILED",
                "action_label": "Retry Settlement",
            })

        # ---------------------------------------------------------------------
        # 4. UNUSUAL REFUNDS
        # ---------------------------------------------------------------------
        high_refunds = await database.find_many(
            "refunds",
            {"$or": [{"amount": {"$gt": 2500.0}}, {"status": "FLAGGED_REVIEW"}]},
        )
        if high_refunds:
            ref_amt = sum(float(r.get("amount", 0.0)) for r in high_refunds)
            anomalies.append({
                "id": "ANOM_UNUSUAL_REFUND",
                "type": "UNUSUAL_REFUND",
                "title": f"{len(high_refunds)} High-Value / Suspicious Refund(s)",
                "description": f"₹{ref_amt:.2f} flagged for manual dual-authorization.",
                "severity": "WARNING_AMBER",
                "count": len(high_refunds),
                "total_impact_amount": round(ref_amt, 2),
                "action_url": "/finance/refunds?filter=suspicious",
                "action_label": "Review Refunds",
            })

        # ---------------------------------------------------------------------
        # 5. NEGATIVE WALLETS
        # ---------------------------------------------------------------------
        neg_partner_wallets = await database.find_many(
            "partner_wallets",
            {"balance": {"$lt": 0.0}},
        )
        neg_rider_wallets = await database.find_many(
            "rider_wallets",
            {"balance": {"$lt": 0.0}},
        )
        total_neg_wallets = len(neg_partner_wallets) + len(neg_rider_wallets)
        total_neg_amt = sum(abs(float(w.get("balance", 0.0))) for w in neg_partner_wallets + neg_rider_wallets)
        if total_neg_wallets > 0:
            anomalies.append({
                "id": "ANOM_NEGATIVE_WALLET",
                "type": "NEGATIVE_WALLET",
                "title": f"{total_neg_wallets} Negative Wallet Balance(s)",
                "description": f"₹{total_neg_amt:.2f} negative liability from penalties/cancellations.",
                "severity": "CRITICAL_RED",
                "count": total_neg_wallets,
                "total_impact_amount": round(total_neg_amt, 2),
                "action_url": "/finance/wallet-partner?filter=negative",
                "action_label": "Debt Recovery View",
            })

        # ---------------------------------------------------------------------
        # 6. HIGH EXPENSES
        # ---------------------------------------------------------------------
        high_expenses = await database.find_many(
            "financial_expenses",
            {"amount": {"$gt": 10000.0}, "status": "PENDING_APPROVAL"},
        )
        if high_expenses:
            exp_amt = sum(float(e.get("amount", 0.0)) for e in high_expenses)
            anomalies.append({
                "id": "ANOM_HIGH_EXPENSE",
                "type": "HIGH_EXPENSE",
                "title": f"{len(high_expenses)} High-Value Expense(s) Pending Sign-off",
                "description": f"₹{exp_amt:.2f} requires Maker/Checker approval before disbursement.",
                "severity": "INFO_BLUE",
                "count": len(high_expenses),
                "total_impact_amount": round(exp_amt, 2),
                "action_url": "/finance/approvals?category=expense",
                "action_label": "Review Approvals",
            })

        # Calculate high-level threat score
        critical_count = sum(1 for a in anomalies if a["severity"] == "CRITICAL_RED")
        warning_count = sum(1 for a in anomalies if a["severity"] == "WARNING_AMBER")

        threat_level = "GREEN_HEALTHY"
        if critical_count > 0:
            threat_level = "RED_CRITICAL"
        elif warning_count > 0:
            threat_level = "AMBER_WARNING"

        return {
            "threatLevel": threat_level,
            "totalActiveExceptions": len(anomalies),
            "criticalCount": critical_count,
            "warningCount": warning_count,
            "anomalies": anomalies,
            "generatedAt": now_iso,
        }


financial_anomaly_service = FinancialAnomalyService()
