"""General Ledger Service — Orchestrator for Double-Entry Accounting Events.

Translates high-level business events across QuickPress into mathematically
balanced, immutable journal entries adhering to the Chart of Accounts (1000 - 5999).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.accounting_period_repository import accounting_period_repository
from app.db.general_ledger_repository import general_ledger_repository

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class GeneralLedgerService:
    """Service orchestrating balanced double-entry accounting transactions."""

    async def _check_period_lock(self, transaction_date: Optional[str]) -> None:
        """Enforces Financial Period Lock. Rejects postings into locked periods."""
        if await accounting_period_repository.is_period_locked(transaction_date):
            raise ValueError(
                f"Financial Period Lock Active: Cannot post entries into locked period ({transaction_date}). "
                "Audit adjustments must be booked in the current open period with prior period adjustment notation."
            )

    # -------------------------------------------------------------------------
    # 1. ORDER PAYMENT (PREPAID ONLINE VIA GATEWAY)
    # -------------------------------------------------------------------------
    async def post_online_order_paid(
        self,
        *,
        order_id: str,
        customer_id: str,
        partner_id: Optional[str],
        customer_paid_total: float,
        partner_payable: float,
        commission_revenue: float,
        delivery_fee: float = 0.0,
        handling_fee: float = 0.0,
        gst_tax: float = 0.0,
        gateway_fee: float = 0.0,
        platform_discount_subsidy: float = 0.0,
        payment_reference: str = "",
        created_by: str = "payment_webhook",
    ) -> List[Dict[str, Any]]:
        """Records double-entry ledger lines for a captured online order payment."""
        await self._check_period_lock(_now_iso())

        lines: List[Dict[str, Any]] = []

        # Debit: Gateway Clearing (Asset increased by customer total)
        lines.append({
            "account_code": 1020,
            "debit": customer_paid_total,
            "credit": 0.0,
            "party_type": "CUSTOMER",
            "party_id": customer_id,
            "description": f"Payment captured via Gateway for Order #{order_id}",
        })

        # If platform subsidized a discount (e.g. coupon): Debit platform expense
        if platform_discount_subsidy > 0:
            lines.append({
                "account_code": 5030,
                "debit": platform_discount_subsidy,
                "credit": 0.0,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Platform discount subsidy absorbed for Order #{order_id}",
            })

        # Credit: Partner Wallet Payable (Liability)
        if partner_payable > 0:
            lines.append({
                "account_code": 2010,
                "debit": 0.0,
                "credit": partner_payable,
                "party_type": "PARTNER",
                "party_id": partner_id or "unassigned",
                "description": f"Partner payable credited for Order #{order_id}",
            })

        # Credit: QuickPress Commission Revenue
        if commission_revenue > 0:
            lines.append({
                "account_code": 4010,
                "debit": 0.0,
                "credit": commission_revenue,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"QuickPress take-rate commission for Order #{order_id}",
            })

        # Credit: Customer Delivery Fee Revenue
        if delivery_fee > 0:
            lines.append({
                "account_code": 4020,
                "debit": 0.0,
                "credit": delivery_fee,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Delivery logistics fee revenue for Order #{order_id}",
            })

        # Credit: Handling & Convenience Fee Revenue
        if handling_fee > 0:
            lines.append({
                "account_code": 4030,
                "debit": 0.0,
                "credit": handling_fee,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Platform handling/express fee for Order #{order_id}",
            })

        # Credit: GST Output Tax Payable (Liability owed to Govt)
        if gst_tax > 0:
            lines.append({
                "account_code": 2040,
                "debit": 0.0,
                "credit": gst_tax,
                "party_type": "TAX_AUTHORITY",
                "party_id": "GSTIN_UP",
                "description": f"Output GST (CGST+SGST) payable on Order #{order_id}",
            })

        # Post balanced batch
        return await general_ledger_repository.post_journal_batch(
            reference_type="ORDER_PAYMENT",
            reference_id=order_id,
            lines=lines,
            description=f"Online payment captured for Order #{order_id} (Ref: {payment_reference})",
            created_by=created_by,
            metadata={"payment_ref": payment_reference, "gateway_fee": gateway_fee},
        )

    # -------------------------------------------------------------------------
    # 2. ORDER PAYMENT (COD COLLECTED BY RIDER)
    # -------------------------------------------------------------------------
    async def post_cod_order_collected(
        self,
        *,
        order_id: str,
        customer_id: str,
        rider_id: str,
        partner_id: Optional[str],
        cash_collected_total: float,
        partner_payable: float,
        commission_revenue: float,
        delivery_fee: float = 0.0,
        handling_fee: float = 0.0,
        gst_tax: float = 0.0,
        created_by: str = "rider_app",
    ) -> List[Dict[str, Any]]:
        """Records double-entry ledger lines when a Rider collects cash on delivery."""
        await self._check_period_lock(_now_iso())

        lines: List[Dict[str, Any]] = [
            # Debit: Rider Cash-in-Hand (Asset in custody of rider)
            {
                "account_code": 1030,
                "debit": cash_collected_total,
                "credit": 0.0,
                "party_type": "RIDER",
                "party_id": rider_id,
                "description": f"COD cash collected by Rider {rider_id} for Order #{order_id}",
            }
        ]

        if partner_payable > 0:
            lines.append({
                "account_code": 2010,
                "debit": 0.0,
                "credit": partner_payable,
                "party_type": "PARTNER",
                "party_id": partner_id or "unassigned",
                "description": f"Partner payable credited on COD Order #{order_id}",
            })

        if commission_revenue > 0:
            lines.append({
                "account_code": 4010,
                "debit": 0.0,
                "credit": commission_revenue,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"QuickPress commission on COD Order #{order_id}",
            })

        if delivery_fee > 0:
            lines.append({
                "account_code": 4020,
                "debit": 0.0,
                "credit": delivery_fee,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Delivery fee revenue on COD Order #{order_id}",
            })

        if handling_fee > 0:
            lines.append({
                "account_code": 4030,
                "debit": 0.0,
                "credit": handling_fee,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Handling fee revenue on COD Order #{order_id}",
            })

        if gst_tax > 0:
            lines.append({
                "account_code": 2040,
                "debit": 0.0,
                "credit": gst_tax,
                "party_type": "TAX_AUTHORITY",
                "party_id": "GSTIN_UP",
                "description": f"Output GST payable on COD Order #{order_id}",
            })

        return await general_ledger_repository.post_journal_batch(
            reference_type="COD_COLLECTION",
            reference_id=order_id,
            lines=lines,
            description=f"COD collected by Rider {rider_id} for Order #{order_id}",
            created_by=created_by,
            metadata={"rider_id": rider_id},
        )

    # -------------------------------------------------------------------------
    # 3. COD DEPOSIT TO BANK (RIDER DEPOSITS COLLECTED CASH)
    # -------------------------------------------------------------------------
    async def post_cod_cash_deposited_to_bank(
        self,
        *,
        deposit_id: str,
        rider_id: str,
        deposited_amount: float,
        bank_utr: str,
        verified_by: str,
    ) -> List[Dict[str, Any]]:
        """Records clearing of Rider Cash Custody when deposited into Bank Operating Account."""
        await self._check_period_lock(_now_iso())

        lines = [
            # Debit: Bank Operating Account (Bank balance increases)
            {
                "account_code": 1010,
                "debit": deposited_amount,
                "credit": 0.0,
                "party_type": "PLATFORM",
                "party_id": "bank_operating",
                "description": f"CDM / Bank Deposit verified from Rider {rider_id} (UTR: {bank_utr})",
            },
            # Credit: Rider Cash-in-Hand (Asset relieved from rider custody)
            {
                "account_code": 1030,
                "debit": 0.0,
                "credit": deposited_amount,
                "party_type": "RIDER",
                "party_id": rider_id,
                "description": f"Rider {rider_id} cash liability relieved via Bank Deposit (UTR: {bank_utr})",
            },
        ]

        return await general_ledger_repository.post_journal_batch(
            reference_type="COD_DEPOSIT",
            reference_id=deposit_id,
            lines=lines,
            description=f"COD cash deposit confirmed for Rider {rider_id} (UTR: {bank_utr})",
            created_by=verified_by,
            metadata={"rider_id": rider_id, "bank_utr": bank_utr},
        )

    # -------------------------------------------------------------------------
    # 4. RIDER TRIP EARNINGS CONFIRMATION (DELIVERY COMPLETED)
    # -------------------------------------------------------------------------
    async def post_rider_delivery_earning(
        self,
        *,
        order_id: str,
        rider_id: str,
        trip_type: str,  # "PICKUP" or "DELIVERY"
        earning_amount: float,
        created_by: str = "order_lifecycle",
    ) -> List[Dict[str, Any]]:
        """Records Rider earnings upon trip leg completion."""
        if earning_amount <= 0:
            return []

        await self._check_period_lock(_now_iso())

        lines = [
            # Debit: Rider Logistics Delivery Cost (Expense)
            {
                "account_code": 5010,
                "debit": earning_amount,
                "credit": 0.0,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Logistics expense for {trip_type} leg on Order #{order_id}",
            },
            # Credit: Rider Wallet Payable (Liability)
            {
                "account_code": 2020,
                "debit": 0.0,
                "credit": earning_amount,
                "party_type": "RIDER",
                "party_id": rider_id,
                "description": f"Rider earning credited for {trip_type} leg on Order #{order_id}",
            },
        ]

        return await general_ledger_repository.post_journal_batch(
            reference_type="RIDER_EARNING",
            reference_id=f"{order_id}_{trip_type.lower()}",
            lines=lines,
            description=f"Rider {rider_id} earning for {trip_type} leg on Order #{order_id}",
            created_by=created_by,
            metadata={"rider_id": rider_id, "trip_type": trip_type},
        )

    # -------------------------------------------------------------------------
    # 5. PARTNER SETTLEMENT DISBURSEMENT (BANK PAYOUT)
    # -------------------------------------------------------------------------
    async def post_partner_settlement_disbursed(
        self,
        *,
        settlement_id: str,
        partner_id: str,
        payout_amount: float,
        bank_utr: str,
        approved_by: str,
    ) -> List[Dict[str, Any]]:
        """Records Partner settlement payout from Bank Operating Account."""
        await self._check_period_lock(_now_iso())

        lines = [
            # Debit: Partner Wallet Payable (Liability cleared)
            {
                "account_code": 2010,
                "debit": payout_amount,
                "credit": 0.0,
                "party_type": "PARTNER",
                "party_id": partner_id,
                "description": f"Partner payable discharged via settlement #{settlement_id}",
            },
            # Credit: Bank Operating Account (Cash outflow)
            {
                "account_code": 1010,
                "debit": 0.0,
                "credit": payout_amount,
                "party_type": "PLATFORM",
                "party_id": "bank_operating",
                "description": f"Bank payout transfer for Partner {partner_id} (UTR: {bank_utr})",
            },
        ]

        return await general_ledger_repository.post_journal_batch(
            reference_type="PARTNER_SETTLEMENT",
            reference_id=settlement_id,
            lines=lines,
            description=f"Partner settlement payout disbursed to Partner {partner_id} (UTR: {bank_utr})",
            created_by=approved_by,
            metadata={"partner_id": partner_id, "bank_utr": bank_utr},
        )

    # -------------------------------------------------------------------------
    # 6. RIDER SETTLEMENT DISBURSEMENT (BANK PAYOUT)
    # -------------------------------------------------------------------------
    async def post_rider_settlement_disbursed(
        self,
        *,
        settlement_id: str,
        rider_id: str,
        payout_amount: float,
        bank_utr: str,
        approved_by: str,
    ) -> List[Dict[str, Any]]:
        """Records Rider settlement payout from Bank Operating Account."""
        await self._check_period_lock(_now_iso())

        lines = [
            # Debit: Rider Wallet Payable (Liability cleared)
            {
                "account_code": 2020,
                "debit": payout_amount,
                "credit": 0.0,
                "party_type": "RIDER",
                "party_id": rider_id,
                "description": f"Rider payable discharged via settlement #{settlement_id}",
            },
            # Credit: Bank Operating Account (Cash outflow)
            {
                "account_code": 1010,
                "debit": 0.0,
                "credit": payout_amount,
                "party_type": "PLATFORM",
                "party_id": "bank_operating",
                "description": f"Bank payout transfer for Rider {rider_id} (UTR: {bank_utr})",
            },
        ]

        return await general_ledger_repository.post_journal_batch(
            reference_type="RIDER_SETTLEMENT",
            reference_id=settlement_id,
            lines=lines,
            description=f"Rider settlement payout disbursed to Rider {rider_id} (UTR: {bank_utr})",
            created_by=approved_by,
            metadata={"rider_id": rider_id, "bank_utr": bank_utr},
        )

    # -------------------------------------------------------------------------
    # 7. MEMBERSHIP SUBSCRIPTION PURCHASE (Ind AS 115 Deferred Revenue)
    # -------------------------------------------------------------------------
    async def post_membership_purchased(
        self,
        *,
        membership_id: str,
        user_id: str,
        plan_price: float,
        gst_tax: float,
        unearned_net_amount: float,
        payment_reference: str,
        created_by: str = "membership_webhook",
    ) -> List[Dict[str, Any]]:
        """Records membership subscription purchase adhering to Ind AS 115 deferred revenue."""
        await self._check_period_lock(_now_iso())

        lines = [
            # Debit: Gateway Clearing (Cash received)
            {
                "account_code": 1020,
                "debit": plan_price,
                "credit": 0.0,
                "party_type": "CUSTOMER",
                "party_id": user_id,
                "description": f"Membership purchase captured (Ref: {payment_reference})",
            },
            # Credit: GST Output Tax Payable
            {
                "account_code": 2040,
                "debit": 0.0,
                "credit": gst_tax,
                "party_type": "TAX_AUTHORITY",
                "party_id": "GSTIN_UP",
                "description": f"GST collected on membership #{membership_id}",
            },
            # Credit: Deferred / Unearned Membership Revenue (Liability until services rendered)
            {
                "account_code": 2050,
                "debit": 0.0,
                "credit": unearned_net_amount,
                "party_type": "CUSTOMER",
                "party_id": user_id,
                "description": f"Unearned subscription revenue deferred for membership #{membership_id}",
            },
        ]

        return await general_ledger_repository.post_journal_batch(
            reference_type="MEMBERSHIP_PURCHASE",
            reference_id=membership_id,
            lines=lines,
            description=f"Membership #{membership_id} subscription purchase recorded",
            created_by=created_by,
            metadata={"user_id": user_id, "payment_ref": payment_reference},
        )

    # -------------------------------------------------------------------------
    # 8. MEMBERSHIP MONTHLY REVENUE AMORTIZATION (Earned Revenue recognition)
    # -------------------------------------------------------------------------
    async def post_monthly_membership_amortization(
        self,
        *,
        membership_id: str,
        monthly_portion_amount: float,
        month_period: str,
        created_by: str = "membership_amortization_cron",
    ) -> List[Dict[str, Any]]:
        """Amortizes monthly portion of deferred membership revenue into P&L."""
        await self._check_period_lock(_now_iso())

        lines = [
            # Debit: Deferred Revenue (Liability reduced)
            {
                "account_code": 2050,
                "debit": monthly_portion_amount,
                "credit": 0.0,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Deferred revenue amortized for period {month_period}",
            },
            # Credit: Earned Membership Revenue (Recognized in P&L)
            {
                "account_code": 4040,
                "debit": 0.0,
                "credit": monthly_portion_amount,
                "party_type": "PLATFORM",
                "party_id": "quickpress",
                "description": f"Earned membership revenue recognized for period {month_period}",
            },
        ]

        return await general_ledger_repository.post_journal_batch(
            reference_type="MEMBERSHIP_AMORTIZATION",
            reference_id=f"{membership_id}_{month_period}",
            lines=lines,
            description=f"Monthly membership revenue amortization for {month_period}",
            created_by=created_by,
            metadata={"membership_id": membership_id, "period": month_period},
        )


general_ledger_service = GeneralLedgerService()
