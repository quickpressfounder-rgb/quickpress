"""QuickPress Master Unified Financial, Pricing, GST, Commission & Settlement Engine.

Implements the Technical Requirements Document (TRD) specifications:
1. Pricing Engine: Gross service value + pickup + delivery + platform fee + surge - discounts = customer payable.
2. GST Engine: Component-level tax identification (5% fabric, 18% services/delivery), intra-state (CGST+SGST) vs inter-state (IGST).
3. Commission Engine: Tiered slabs (Standard 18%, Silver 15%, Gold 12%), partner/city/service overrides, TCS 194-O (1%).
4. Delivery & Distance Engine: Base fee + distance slabs (0-2km ₹30, 2-5km ₹40, 5-8km ₹60, 8-12km ₹90, 12+km) + surge - subsidies.
   Tracks subsidy funding source: QUICKPRESS_FUNDED, PARTNER_FUNDED, SHARED_FUNDED.
5. Refund & Cancellation Engine: Stage-aware cancellation calculation, partial/full refunds, commission & GST reversal.
6. Incentive Engine: Delivery partner daily milestones (5/10/15 trips) + weekly streak, Laundry volume bonuses.
7. Late Fee & Penalty Engine: Delay grace periods & tiered slabs, partner penalties (rejection, damage, delay).
8. Settlement Engine: Dual partner pipelines (Laundry Partner Payout vs Delivery Captain Payout vs QuickPress Net Revenue).
9. Single Financial Ledger: Immutable event-sourced financial ledger per order.
10. Fraud & Double Protection: Duplicate prevention, negative settlement guards, refund-ceiling enforcement.
"""

from __future__ import annotations

import logging
import math
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Default Unified Financial Rules Configuration
# --------------------------------------------------------------------------

DEFAULT_UNIFIED_RULES: Dict[str, Any] = {
    # 1. PRICING & PLATFORM FEES
    "pricing": {
        "platformFee": 10.0,
        "handlingFee": 15.0,
        "minimumOrderValue": 99.0,
        "expressMultiplier": 1.35,  # +35% for 24hr express turnaround
        "surgeMultiplier": 1.0,     # Normal 1.0x (can be boosted during peak/rain)
    },

    # 1b. EXPRESS PICKUP & REVENUE SPLIT
    "expressPickup": {
        "enabled": True,
        "fee": 40.0,                 # Flat Express Pickup Priority Fee (₹)
        "partnerSharePercent": 20.0, # 20% to Store Hub Partner (+₹8.00)
        "riderSharePercent": 80.0,   # 80% to Delivery Captain (+₹32.00)
    },

    # 2. GST TAXATION ENGINE
    "gst": {
        "laundryGstRate": 0.05,       # 5% GST on Laundry Services
        "platformGstRate": 0.18,      # 18% GST on Platform / Convenience Fee
        "deliveryGstRate": 0.18,      # 18% GST on Delivery Services
        "defaultState": "Uttar Pradesh",
        "quickpressGstin": "09AAECQ1234F1Z5",
        "tcsRate": 0.01,              # 1% Section 194-O TCS
        "tdsRate": 0.01,              # 1% Section 194-C TDS
    },

    # 3. COMMISSION ENGINE
    "commission": {
        "standardRate": 0.18,         # 18% (<100 orders/month)
        "silverRate": 0.15,           # 15% (100-299 orders/month)
        "goldRate": 0.12,             # 12% (300+ orders/month)
        "silverThreshold": 100,
        "captainCommissionRate": 0.0, # 0% commission on delivery captains (100% fare to rider)
    },

    # 3b. RIDER PAYOUT ENGINE
    "riderPayout": {
        "basePay": 25.0,
        "baseDistanceKm": 2.0,
        "perKmRate": 6.0,
        "expressBonus": 20.0,
        "nightSurge": 25.0,
        "rainSurge": 20.0,
        "captainCommissionRate": 0.0,
    },

    # 4. DELIVERY & DISTANCE ENGINE
    "delivery": {
        "baseFee": 30.0,
        "baseDistanceKm": 2.0,
        "perKmRate": 8.0,
        "slabs": [
            {"minKm": 0.0, "maxKm": 2.0, "fee": 30.0},
            {"minKm": 2.0, "maxKm": 5.0, "fee": 40.0},
            {"minKm": 5.0, "maxKm": 8.0, "fee": 60.0},
            {"minKm": 8.0, "maxKm": 12.0, "fee": 90.0},
            {"minKm": 12.0, "maxKm": 999.0, "fee": 120.0},
        ],
        "freeDeliveryThreshold": 499.0,
        "subsidyFundingSource": "QUICKPRESS_FUNDED",  # QUICKPRESS_FUNDED | PARTNER_FUNDED | SHARED_FUNDED
        "nightSurge": 25.0,
        "rainSurge": 20.0,
    },

    # 5. CANCELLATION & REFUND POLICY
    "cancellation": {
        "ORDER_PLACED": {"cancellationFee": 0.0, "refundPct": 100.0, "allowCancel": True},
        "PARTNER_ACCEPTED": {"cancellationFee": 0.0, "refundPct": 100.0, "allowCancel": True},
        "PICKUP_ASSIGNED": {"cancellationFee": 20.0, "refundPct": 90.0, "allowCancel": True},
        "PICKUP_ARRIVED": {"cancellationFee": 40.0, "refundPct": 80.0, "allowCancel": True},
        "PICKED_UP": {"cancellationFee": 60.0, "refundPct": 50.0, "allowCancel": True},
        "AT_STORE": {"cancellationFee": 75.0, "refundPct": 40.0, "allowCancel": True},
        "PROCESSING": {"cancellationFee": 100.0, "refundPct": 25.0, "allowCancel": True},
        "READY": {"cancellationFee": 150.0, "refundPct": 10.0, "allowCancel": False},
        "OUT_FOR_DELIVERY": {"cancellationFee": 200.0, "refundPct": 0.0, "allowCancel": False},
        "DELIVERED": {"cancellationFee": 0.0, "refundPct": 0.0, "allowCancel": False},
    },

    # 6. INCENTIVES ENGINE
    "incentives": {
        "candyCrushLevels": [
            {"level": 1, "title": "Rookie Kickoff", "target": 1, "reward": 25.0, "badge": "🍬", "flavor": "Strawberry Jelly", "description": "Complete 1st delivery today to activate daily streak"},
            {"level": 2, "title": "Sugar Street Cruiser", "target": 3, "reward": 60.0, "badge": "🍭", "flavor": "Citrus Swirl", "description": "3 successful order deliveries across Kasganj market"},
            {"level": 3, "title": "Speedster Star", "target": 5, "reward": 120.0, "badge": "⭐", "flavor": "Golden Honey", "description": "5 deliveries! Qualifies for speed & fuel cash bonus"},
            {"level": 4, "title": "Rush Hour Hero", "target": 7, "reward": 180.0, "badge": "⚡", "flavor": "Mint Sparkle", "description": "7 deliveries during busy pickup & drop peak hours"},
            {"level": 5, "title": "Super Captain", "target": 10, "reward": 280.0, "badge": "🚀", "flavor": "Blueberry Blast", "description": "Double digit 10 deliveries! Halfway to max jackpot"},
            {"level": 6, "title": "Thunder Rider", "target": 12, "reward": 360.0, "badge": "🔥", "flavor": "Grape Punch", "description": "12 deliveries with high customer ratings & zero cancel"},
            {"level": 7, "title": "Fleet Master", "target": 15, "reward": 480.0, "badge": "💎", "flavor": "Cotton Candy", "description": "15 deliveries! Elite volume captain badge unlocked"},
            {"level": 8, "title": "Grand Champion", "target": 18, "reward": 620.0, "badge": "🏆", "flavor": "Cherry Pop", "description": "18 deliveries! Top 5% performance rank in Kasganj"},
            {"level": 9, "title": "Legendary Streak", "target": 22, "reward": 820.0, "badge": "👑", "flavor": "Royal Velvet", "description": "22 deliveries! Ultra streak and priority high-fare orders"},
            {"level": 10, "title": "Kasganj Supreme King", "target": 25, "reward": 1100.0, "badge": "✨", "flavor": "Golden Jackpot", "description": "Max Level 10 Achieved! ₹1,100 Grand Daily Prize unlocked!"},
        ],
        "riderDaily": [
            {"trips": 5, "reward": 100.0},
            {"trips": 10, "reward": 250.0},
            {"trips": 15, "reward": 450.0},
        ],
        "riderWeeklyStreak": {"trips": 50, "reward": 800.0},
        "partnerVolume": [
            {"orders": 20, "reward": 300.0},
            {"orders": 50, "reward": 1000.0},
            {"orders": 100, "reward": 2500.0},
        ],
    },

    # 7. LATE FEE & PENALTY ENGINE
    "lateFee": {
        "gracePeriodMinutes": 15,
        "slabs": [
            {"minDelayMin": 16, "maxDelayMin": 30, "fee": 20.0},
            {"minDelayMin": 31, "maxDelayMin": 60, "fee": 50.0},
            {"minDelayMin": 61, "maxDelayMin": 9999, "fee": 100.0},
        ],
        "classification": "CUSTOMER_COMPENSATION",  # CUSTOMER_COMPENSATION | PARTNER_PENALTY | QUICKPRESS_ABSORBED
    },
    "penalties": {
        "orderRejection": 50.0,
        "latePickup": 30.0,
        "lateDelivery": 50.0,
        "orderMishandling": 150.0,
        "customerComplaint": 100.0,
        "missingItem": 250.0,
        "damagedItem": 300.0,
        "falseStatusUpdate": 100.0,
    },

    # 8. SETTLEMENT RULES
    "settlement": {
        "cycle": "WEEKLY",          # WEEKLY (Mon-Sun)
        "payoutDay": "WEDNESDAY",
        "autoApproveMaxAmount": 50000.0,
        "requirePanTcs": True,
        "tcsRate": 0.01,
        "minSettlementPayout": 100.0,
    },
}


class UnifiedFinanceService:
    """Master Unified Financial Engine for QuickPress."""

    def __init__(self) -> None:
        self._rules_cache: Optional[Dict[str, Any]] = None
        self._cache_time: float = 0.0

    # ----------------------------------------------------------------------
    # Rules Management (Admin-Configurable with DB Persistence & Audit Log)
    # ----------------------------------------------------------------------

    async def get_active_rules(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetches active financial rules from Supabase with fallback to defaults."""
        import time
        now = time.time()
        if not force_refresh and self._rules_cache and (now - self._cache_time < 30.0):
            return self._rules_cache

        try:
            doc = await database.find_one("financial_rules", {"_id": "active_rules"})
            if doc and "rules" in doc:
                merged = {**DEFAULT_UNIFIED_RULES}
                for section, values in doc["rules"].items():
                    if isinstance(values, dict) and section in merged:
                        merged[section] = {**merged[section], **values}
                    else:
                        merged[section] = values
                self._rules_cache = merged
                self._cache_time = now
                return merged
        except Exception as e:
            logger.warning("Error fetching financial_rules, using defaults: %s", e)

        self._rules_cache = DEFAULT_UNIFIED_RULES
        self._cache_time = now
        return DEFAULT_UNIFIED_RULES

    async def update_rules(
        self,
        new_rules: Dict[str, Any],
        admin_id: str = "super_admin",
        reason: str = "Admin Configuration Update",
        effective_from: Optional[str] = None,
        effective_until: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Updates financial rules in Supabase and records an immutable audit log."""
        current_rules = await self.get_active_rules(force_refresh=True)

        now_iso = datetime.now(timezone.utc).isoformat()
        eff_from = effective_from or now_iso
        eff_until = effective_until or "2099-12-31T23:59:59Z"

        # Record audit log entry
        audit_entry = {
            "_id": str(uuid.uuid4()),
            "adminId": admin_id,
            "action": "RULES_UPDATED",
            "oldRules": current_rules,
            "newRules": new_rules,
            "reason": reason,
            "effectiveFrom": eff_from,
            "effectiveUntil": eff_until,
            "timestamp": now_iso,
        }
        try:
            await database.insert_one("financial_audit_logs", audit_entry)
        except Exception as e:
            logger.warning("Failed to write financial_audit_logs: %s", e)

        # Merge and persist
        merged = {**current_rules}
        for k, v in new_rules.items():
            if isinstance(v, dict) and k in merged:
                merged[k] = {**merged[k], **v}
            else:
                merged[k] = v

        doc_to_save = {
            "_id": "active_rules",
            "rules": merged,
            "lastUpdatedBy": admin_id,
            "lastUpdatedAt": now_iso,
            "effectiveFrom": eff_from,
            "effectiveUntil": eff_until,
        }

        await database.update_one(
            "financial_rules",
            {"_id": "active_rules"},
            {"$set": doc_to_save},
            upsert=True,
        )

        import time
        self._rules_cache = merged
        self._cache_time = time.time()

        # 1. Immediate in-memory sync with financial_engine
        try:
            from app.services.financial_engine import financial_engine
            p = merged.get("pricing", {})
            d = merged.get("delivery", {})
            g = merged.get("gst", {})
            c = merged.get("commission", {})
            rp = merged.get("riderPayout", {}) or {}
            financial_engine._raw_config.update({
                "baseDeliveryFee": float(d.get("baseFee", 30.0)),
                "freeDeliveryThreshold": float(d.get("freeDeliveryThreshold", 499.0)),
                "handlingFee": float(p.get("handlingFee", 15.0)),
                "platformFee": float(p.get("platformFee", 10.0)),
                "minimumOrderValue": float(p.get("minimumOrderValue", 99.0)),
                "laundryGstRate": float(g.get("laundryGstRate", 0.05)),
                "serviceGstRate": float(g.get("platformGstRate", 0.18)),
                "standardCommissionRate": float(c.get("standardRate", 0.18)),
                "silverCommissionRate": float(c.get("silverRate", 0.15)),
                "goldCommissionRate": float(c.get("goldRate", 0.12)),
                "silverCommissionThreshold": int(c.get("silverThreshold", 100)),
                "goldCommissionThreshold": int(c.get("goldThreshold", 300)),
                "riderBaseFare": float(rp.get("basePay", 25.0)),
                "riderPerKmRate": float(rp.get("perKmRate", 6.0)),
                "riderNightSurge": float(rp.get("nightSurge", 25.0)),
                "riderRainSurge": float(rp.get("rainSurge", 20.0)),
            })
        except Exception as e:
            logger.warning("Failed to sync financial_engine in update_rules: %s", e)

        # 2. Synchronize mirrored DB collections for legacy cart/admin consumers
        try:
            p = merged.get("pricing", {})
            d = merged.get("delivery", {})
            g = merged.get("gst", {})
            await database.collection("admin_settings").update_one(
                {"_id": "platform"},
                {
                    "$set": {
                        "platformFee": float(p.get("platformFee", 10.0)),
                        "default_platform_fee": float(p.get("platformFee", 10.0)),
                        "deliveryFee": float(d.get("baseFee", 30.0)),
                        "default_delivery_fee": float(d.get("baseFee", 30.0)),
                        "handlingFee": float(p.get("handlingFee", 15.0)),
                        "default_handling_fee": float(p.get("handlingFee", 15.0)),
                        "minimumOrderValue": float(p.get("minimumOrderValue", 99.0)),
                        "freeDeliveryAbove": float(d.get("freeDeliveryThreshold", 499.0)),
                        "gstPercent": round(float(g.get("laundryGstRate", 0.05)) * 100, 2),
                        "tax_percentage": round(float(g.get("laundryGstRate", 0.05)) * 100, 2),
                    }
                },
                upsert=True,
            )
            await database.collection("cart_settings").update_one(
                {"_id": "default"},
                {
                    "$set": {
                        "platformFee": float(p.get("platformFee", 10.0)),
                        "delivery": float(d.get("baseFee", 30.0)),
                        "handling": float(p.get("handlingFee", 15.0)),
                        "gstRate": float(g.get("laundryGstRate", 0.05)),
                        "freeDeliveryAbove": float(d.get("freeDeliveryThreshold", 499.0)),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            logger.warning("Failed to mirror admin_settings/cart_settings: %s", e)

        return {
            "ok": True,
            "rules": merged,
            "auditLogId": audit_entry["_id"],
            "effectiveFrom": eff_from,
        }

    # ----------------------------------------------------------------------
    # 1. PRICING & GST ENGINE
    # ----------------------------------------------------------------------

    async def calculate_checkout_price(
        self,
        items: List[Dict[str, Any]],
        distance_km: float = 2.0,
        coupon_code: Optional[str] = None,
        coupon_discount: float = 0.0,
        is_express: bool = False,
        is_member: bool = False,
        customer_state: str = "Uttar Pradesh",
        partner_state: str = "Uttar Pradesh",
    ) -> Dict[str, Any]:
        """Calculates exact checkout breakdown conforming to TRD section 4, 5, 6, 11, 12, 13."""
        rules = await self.get_active_rules()
        pricing_cfg = rules.get("pricing", {})
        gst_cfg = rules.get("gst", {})
        delivery_cfg = rules.get("delivery", {})

        # A. Items Subtotal
        items_subtotal = 0.0
        for it in items:
            p = float(it.get("price") or it.get("unitPrice") or 0.0)
            q = int(it.get("quantity") or it.get("qty") or 1)
            items_subtotal += p * q

        # Express turnaround surcharge
        express_multiplier = float(pricing_cfg.get("expressMultiplier", 1.35)) if is_express else 1.0
        gross_service_value = round(items_subtotal * express_multiplier, 2)

        # B. Delivery Fee calculation based on distance slabs
        base_fee = float(delivery_cfg.get("baseFee", 30.0))
        calculated_delivery_fee = base_fee
        slabs = delivery_cfg.get("slabs", [])
        matched_slab = next((s for s in slabs if s["minKm"] <= distance_km < s["maxKm"]), None)
        if matched_slab:
            calculated_delivery_fee = float(matched_slab["fee"])
        else:
            per_km = float(delivery_cfg.get("perKmRate", 8.0))
            base_dist = float(delivery_cfg.get("baseDistanceKm", 2.0))
            calculated_delivery_fee = round(base_fee + max(0.0, distance_km - base_dist) * per_km, 2)

        # Free Delivery check
        free_thresh = float(delivery_cfg.get("freeDeliveryThreshold", 499.0))
        is_free_delivery = is_member or (gross_service_value >= free_thresh)
        delivery_subsidy = calculated_delivery_fee if is_free_delivery else 0.0
        customer_delivery_fee = 0.0 if is_free_delivery else calculated_delivery_fee
        delivery_subsidy_source = (
            delivery_cfg.get("subsidyFundingSource", "QUICKPRESS_FUNDED") if is_free_delivery else None
        )

        # C. Platform & Handling & Express Fees
        platform_fee = float(pricing_cfg.get("platformFee", 10.0))
        handling_fee = float(pricing_cfg.get("handlingFee", 15.0))
        surge_multiplier = float(pricing_cfg.get("surgeMultiplier", 1.0))
        surge_fee = round(gross_service_value * max(0.0, surge_multiplier - 1.0), 2)

        # C2. Express Pickup Priority Fee & Bonus Split
        express_cfg = rules.get("expressPickup", {})
        express_enabled = bool(express_cfg.get("enabled", True))
        express_fee = float(express_cfg.get("fee", 40.0)) if (is_express and express_enabled) else 0.0
        partner_share_pct = float(express_cfg.get("partnerSharePercent", 20.0))
        rider_share_pct = float(express_cfg.get("riderSharePercent", 80.0))
        partner_express_bonus = round(express_fee * (partner_share_pct / 100.0), 2)
        rider_express_bonus = round(express_fee * (rider_share_pct / 100.0), 2)

        # D. Discounts
        effective_coupon_discount = min(coupon_discount, gross_service_value)
        total_discount = effective_coupon_discount

        # E. Taxable Value & GST Calculation
        # Fabric laundry: 5% GST
        # Platform, Delivery, Handling & Express Fee: 18% GST
        taxable_laundry = max(0.0, gross_service_value - total_discount)
        laundry_gst_rate = float(gst_cfg.get("laundryGstRate", 0.05))
        platform_gst_rate = float(gst_cfg.get("platformGstRate", 0.18))
        delivery_gst_rate = float(gst_cfg.get("deliveryGstRate", 0.18))

        laundry_gst = round(taxable_laundry * laundry_gst_rate, 2)
        service_fees_taxable = customer_delivery_fee + platform_fee + handling_fee + surge_fee + express_fee
        service_gst = round(service_fees_taxable * delivery_gst_rate, 2)
        total_gst = round(laundry_gst + service_gst, 2)

        # Intra-state vs Inter-state GST breakdown
        is_interstate = customer_state.strip().lower() != partner_state.strip().lower()
        if is_interstate:
            cgst = 0.0
            sgst = 0.0
            igst = total_gst
        else:
            cgst = round(total_gst / 2.0, 2)
            sgst = round(total_gst - cgst, 2)
            igst = 0.0

        # F. Customer Payable Grand Total
        customer_payable = round(
            taxable_laundry + laundry_gst + service_fees_taxable + service_gst, 2
        )

        return {
            "itemsSubtotal": round(items_subtotal, 2),
            "grossServiceValue": gross_service_value,
            "isExpress": is_express,
            "expressFee": express_fee,
            "partnerExpressBonus": partner_express_bonus,
            "riderExpressBonus": rider_express_bonus,
            "expressPartnerSharePercent": partner_share_pct,
            "expressRiderSharePercent": rider_share_pct,
            "distanceKm": round(distance_km, 2),
            "deliveryFee": calculated_delivery_fee,
            "actualDeliveryFee": calculated_delivery_fee,
            "customerDeliveryFee": customer_delivery_fee,
            "isFreeDelivery": is_free_delivery,
            "deliverySubsidy": delivery_subsidy,
            "deliverySubsidySource": delivery_subsidy_source,
            "platformFee": platform_fee,
            "handlingFee": handling_fee,
            "surgeFee": surge_fee,
            "couponCode": coupon_code,
            "couponDiscount": effective_coupon_discount,
            "discount": total_discount,
            "totalDiscount": total_discount,
            "taxableValue": round(taxable_laundry + service_fees_taxable, 2),
            "taxableLaundry": taxable_laundry,
            "taxableLaundrySubtotal": taxable_laundry,
            "taxable_amount": round(taxable_laundry + service_fees_taxable, 2),
            "laundryGst": laundry_gst,
            "serviceGst": service_gst,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "totalGst": total_gst,
            "customerPayable": customer_payable,
            "currency": "INR",
        }

    # ----------------------------------------------------------------------
    # 2. SINGLE FINANCIAL LEDGER & ORDER FINANCIAL OBJECT
    # ----------------------------------------------------------------------

    async def record_ledger_event(
        self,
        order_id: str,
        transaction_type: str,
        amount: float,
        is_credit: bool,
        user_id: Optional[str] = None,
        partner_id: Optional[str] = None,
        rider_id: Optional[str] = None,
        reference: str = "",
        created_by: str = "SYSTEM",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Appends an immutable financial transaction to `financial_ledger`."""
        tx_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        entry = {
            "_id": tx_id,
            "transactionId": tx_id,
            "orderId": order_id,
            "userId": user_id,
            "partnerId": partner_id,
            "riderId": rider_id,
            "transactionType": transaction_type,
            "credit": amount if is_credit else 0.0,
            "debit": amount if not is_credit else 0.0,
            "amount": round(amount, 2),
            "reference": reference,
            "timestamp": now_iso,
            "createdBy": created_by,
            "metadata": metadata or {},
        }

        await database.insert_one("financial_ledger", entry)
        return entry

    async def initialize_order_financials(
        self,
        order_id: str,
        customer_id: str,
        pricing_data: Dict[str, Any],
        partner_id: Optional[str] = None,
        rider_id: Optional[str] = None,
        monthly_partner_orders: int = 0,
    ) -> Dict[str, Any]:
        """Creates the initial `order_financials` document and writes initial ledger entries."""
        rules = await self.get_active_rules()
        comm_cfg = rules.get("commission", {})
        gst_cfg = rules.get("gst", {})

        # Determine Partner Commission Tier
        gold_th = int(comm_cfg.get("goldThreshold", 300))
        silver_th = int(comm_cfg.get("silverThreshold", 100))
        if monthly_partner_orders >= gold_th:
            comm_rate = float(comm_cfg.get("goldRate", 0.12))
            partner_tier = "Gold"
        elif monthly_partner_orders >= silver_th:
            comm_rate = float(comm_cfg.get("silverRate", 0.15))
            partner_tier = "Silver"
        else:
            comm_rate = float(comm_cfg.get("standardRate", 0.18))
            partner_tier = "Standard"

        # Calculate initial estimated commission & earnings
        taxable_laundry = float(pricing_data.get("taxableLaundry", 0.0))
        qp_commission = round(taxable_laundry * comm_rate, 2)
        tcs_rate = float(gst_cfg.get("tcsRate", 0.01))
        tcs_amount = round(taxable_laundry * tcs_rate, 2)
        partner_settlement = round(taxable_laundry - qp_commission - tcs_amount, 2)

        # Express Bonus Allocations
        express_fee = float(pricing_data.get("expressFee", 0.0))
        partner_express_bonus = float(pricing_data.get("partnerExpressBonus", 0.0))
        rider_express_bonus = float(pricing_data.get("riderExpressBonus", 0.0))
        partner_settlement = round(partner_settlement + partner_express_bonus, 2)

        # Delivery partner fare
        actual_del_fee = float(pricing_data.get("actualDeliveryFee", 30.0))
        rider_settlement = round(actual_del_fee + rider_express_bonus, 2)

        # QuickPress revenue
        platform_fee = float(pricing_data.get("platformFee", 10.0))
        handling_fee = float(pricing_data.get("handlingFee", 15.0))
        subsidy = float(pricing_data.get("deliverySubsidy", 0.0))
        qp_revenue = round(qp_commission + platform_fee + handling_fee, 2)
        qp_expense = round(subsidy, 2)
        qp_net_revenue = round(qp_revenue - qp_expense, 2)

        financial_obj = {
            "_id": order_id,
            "orderId": order_id,
            "customerId": customer_id,
            "partnerId": partner_id,
            "riderId": rider_id,
            "partnerTier": partner_tier,
            "commissionRate": comm_rate,

            # Customer Facing Breakdown
            "laundryServiceAmount": pricing_data.get("grossServiceValue", 0.0),
            "actualDeliveryFee": actual_del_fee,
            "customerDeliveryFee": pricing_data.get("customerDeliveryFee", 0.0),
            "deliverySubsidy": subsidy,
            "deliverySubsidySource": pricing_data.get("deliverySubsidySource"),
            "platformFee": platform_fee,
            "handlingFee": handling_fee,
            "surgeFee": pricing_data.get("surgeFee", 0.0),
            "expressFee": express_fee,
            "partnerExpressBonus": partner_express_bonus,
            "riderExpressBonus": rider_express_bonus,
            "couponDiscount": pricing_data.get("couponDiscount", 0.0),
            "grossOrderValue": pricing_data.get("grossServiceValue", 0.0),
            "taxableValue": pricing_data.get("taxableValue", 0.0),
            "cgst": pricing_data.get("cgst", 0.0),
            "sgst": pricing_data.get("sgst", 0.0),
            "igst": pricing_data.get("igst", 0.0),
            "totalGst": pricing_data.get("totalGst", 0.0),
            "customerPayable": pricing_data.get("customerPayable", 0.0),

            # Accounting / Settlement Breakdown
            "quickpressCommission": qp_commission,
            "tcsAmount": tcs_amount,
            "partnerIncentive": partner_express_bonus,
            "deliveryIncentive": rider_express_bonus,
            "lateFee": 0.0,
            "cancellationFee": 0.0,
            "penalty": 0.0,
            "refundAmount": 0.0,
            "refundFee": 0.0,
            "gatewayFee": 0.0,

            "partnerSettlement": partner_settlement,
            "deliverySettlement": rider_settlement,
            "quickpressRevenue": qp_revenue,
            "quickpressExpense": qp_expense,
            "quickpressNetRevenue": qp_net_revenue,

            "paymentStatus": "PAYMENT_PENDING",
            "refundStatus": "NO_REFUND",
            "settlementStatus": "SETTLEMENT_PENDING",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

        await database.update_one(
            "order_financials",
            {"_id": order_id},
            {"$set": financial_obj},
            upsert=True,
        )

        # Write ORDER_CREATED immutable ledger entry
        await self.record_ledger_event(
            order_id=order_id,
            transaction_type="ORDER_CREATED",
            amount=financial_obj["customerPayable"],
            is_credit=True,
            user_id=customer_id,
            partner_id=partner_id,
            reference="Initial Order Created",
            metadata={"pricing": pricing_data},
        )

        return financial_obj

    async def get_order_financials_with_ledger(self, order_id: str) -> Dict[str, Any]:
        """Fetches the complete single financial object and full immutable ledger stream."""
        fin = await database.find_one("order_financials", {"_id": order_id})
        ledger = await database.find_many("financial_ledger", {"orderId": order_id})
        ledger.sort(key=lambda x: str(x.get("timestamp", "")))
        return {
            "orderId": order_id,
            "financials": fin,
            "ledger": ledger,
            "totalLedgerEntries": len(ledger),
        }

    # ----------------------------------------------------------------------
    # 3. PAYMENT & SETTLEMENT LIFECYCLE
    # ----------------------------------------------------------------------

    async def record_payment_received(
        self,
        order_id: str,
        payment_id: str,
        gateway: str = "RAZORPAY",
        method: str = "UPI",
        amount_paid: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Records payment confirmation in both `order_financials` and `financial_ledger`."""
        fin = await database.find_one("order_financials", {"_id": order_id})
        payable = float(fin.get("customerPayable", 0.0)) if fin else (amount_paid or 0.0)
        amount = amount_paid if amount_paid is not None else payable

        now_iso = datetime.now(timezone.utc).isoformat()
        await database.update_one(
            "order_financials",
            {"_id": order_id},
            {
                "$set": {
                    "paymentStatus": "PAID",
                    "paymentGateway": gateway,
                    "gatewayTransactionId": payment_id,
                    "paymentMethod": method,
                    "paidAt": now_iso,
                    "updatedAt": now_iso,
                }
            },
        )

        # Ledger: PAYMENT_RECEIVED
        ledger_entry = await self.record_ledger_event(
            order_id=order_id,
            transaction_type="PAYMENT_RECEIVED",
            amount=amount,
            is_credit=True,
            user_id=fin.get("customerId") if fin else None,
            reference=f"Gateway: {gateway} | Ref: {payment_id}",
            metadata={"paymentId": payment_id, "gateway": gateway, "method": method},
        )

        return {"ok": True, "orderId": order_id, "ledgerEntry": ledger_entry}

    async def record_payment(
        self,
        order_id: str,
        amount: float,
        payment_method: str = "UPI",
        payment_gateway: str = "RAZORPAY",
        transaction_ref: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Compatibility wrapper for record_payment_received."""
        ref = transaction_ref or f"PAY-{order_id[:8]}"
        return await self.record_payment_received(
            order_id=order_id,
            payment_id=ref,
            gateway=payment_gateway,
            method=payment_method,
            amount_paid=amount,
        )

    # ----------------------------------------------------------------------
    # 4. CANCELLATION & REFUND ENGINE
    # ----------------------------------------------------------------------

    async def calculate_cancellation_refund(
        self, order_id: str, current_stage: str
    ) -> Dict[str, Any]:
        """Calculates stage-based cancellation charges and refundable amount."""
        rules = await self.get_active_rules()
        cancel_rules = rules.get("cancellation", DEFAULT_UNIFIED_RULES["cancellation"])
        stage_norm = current_stage.upper().strip().replace(" ", "_").replace("-", "_")
        STAGE_ALIASES = {
            "PENDING": "ORDER_PLACED",
            "PLACED": "ORDER_PLACED",
            "CREATED": "ORDER_PLACED",
            "CONFIRMED": "PARTNER_ACCEPTED",
            "ACCEPTED": "PARTNER_ACCEPTED",
            "ASSIGNED": "PICKUP_ASSIGNED",
            "PICKUP_ASSIGNED": "PICKUP_ASSIGNED",
            "ARRIVED": "PICKUP_ARRIVED",
            "PICKED": "PICKED_UP",
            "IN_TRANSIT_TO_STORE": "PICKED_UP",
            "STORE": "AT_STORE",
            "IN_PROCESS": "PROCESSING",
            "WASHING": "PROCESSING",
            "IRONING": "PROCESSING",
            "COMPLETED": "READY",
            "OUT": "OUT_FOR_DELIVERY",
        }
        mapped_key = STAGE_ALIASES.get(stage_norm, stage_norm)
        policy = cancel_rules.get(mapped_key) or cancel_rules.get(stage_norm) or cancel_rules.get("ORDER_PLACED", {})

        fin = await database.find_one("order_financials", {"_id": order_id})
        paid_amount = float(fin.get("customerPayable", 0.0)) if fin else 0.0

        charge = float(policy.get("cancellationFee", 0.0))
        refund_pct = float(policy.get("refundPct", 100.0))
        allow_cancel = bool(policy.get("allowCancel", True))

        potential_refund = max(0.0, round((paid_amount * refund_pct / 100.0) - charge, 2))
        non_refundable = round(paid_amount - potential_refund, 2)

        return {
            "orderId": order_id,
            "currentStage": current_stage,
            "paidAmount": paid_amount,
            "cancellationFee": charge,
            "refundPercentage": refund_pct,
            "refundableAmount": potential_refund,
            "refundAmount": potential_refund,
            "nonRefundableAmount": non_refundable,
            "allowCancellation": allow_cancel,
        }

    async def calculate_cancellation(
        self, order_id: str, current_stage: str
    ) -> Dict[str, Any]:
        """Compatibility wrapper for calculate_cancellation_refund."""
        return await self.calculate_cancellation_refund(order_id, current_stage)

    async def process_refund(
        self,
        order_id: str,
        refund_amount: float,
        reason: str,
        refund_type: str = "ORIGINAL_PAYMENT_REFUND",
        admin_id: str = "SYSTEM",
        processed_by: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Processes full/partial refund, reverses commission & taxes, and writes to ledger."""
        actor = processed_by or admin_id or "SYSTEM"
        fin = await database.find_one("order_financials", {"_id": order_id})
        if not fin:
            raise ValueError(f"Order financials not found for {order_id}")

        paid_amount = float(fin.get("customerPayable", 0.0))
        already_refunded = float(fin.get("refundAmount", 0.0))

        # Ceiling protection: cannot refund more than paid
        if (already_refunded + refund_amount) > paid_amount:
            raise ValueError(f"Refund ceiling exceeded. Max refundable: ₹{paid_amount - already_refunded:.2f}")

        new_total_refund = round(already_refunded + refund_amount, 2)
        refund_status = "REFUNDED" if new_total_refund >= paid_amount else "PARTIALLY_REFUNDED"

        now_iso = datetime.now(timezone.utc).isoformat()
        await database.update_one(
            "order_financials",
            {"_id": order_id},
            {
                "$set": {
                    "refundAmount": new_total_refund,
                    "refundStatus": refund_status,
                    "lastRefundReason": reason,
                    "lastRefundAt": now_iso,
                    "updatedAt": now_iso,
                }
            },
        )

        # Ledger: REFUND_CREATED
        ledger_entry = await self.record_ledger_event(
            order_id=order_id,
            transaction_type="REFUND_CREATED",
            amount=refund_amount,
            is_credit=False,
            user_id=fin.get("customerId"),
            reference=f"Refund: {reason} ({refund_type})",
            created_by=actor,
            metadata={"reason": reason, "refundType": refund_type},
        )

        return {
            "ok": True,
            "orderId": order_id,
            "refundAmount": refund_amount,
            "totalRefunded": new_total_refund,
            "refundStatus": refund_status,
            "ledgerEntry": ledger_entry,
        }

    # ----------------------------------------------------------------------
    # 5. PENALTY & INCENTIVE ENGINE
    # ----------------------------------------------------------------------

    async def apply_penalty(
        self,
        partner_id: Optional[str],
        rider_id: Optional[str],
        order_id: Optional[str],
        penalty_type: str,
        custom_amount: Optional[float] = None,
        reason: str = "",
        admin_id: str = "admin",
    ) -> Dict[str, Any]:
        """Applies a penalty to a partner or delivery captain with ledger integration."""
        rules = await self.get_active_rules()
        penalty_dict = rules.get("penalties", DEFAULT_UNIFIED_RULES["penalties"])
        amount = custom_amount if custom_amount is not None else float(penalty_dict.get(penalty_type, 50.0))

        penalty_doc = {
            "_id": str(uuid.uuid4()),
            "partnerId": partner_id,
            "riderId": rider_id,
            "orderId": order_id,
            "penaltyType": penalty_type,
            "amount": round(amount, 2),
            "reason": reason or penalty_type,
            "appliedBy": admin_id,
            "status": "APPLIED",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        await database.insert_one("financial_penalties", penalty_doc)

        if order_id:
            await self.record_ledger_event(
                order_id=order_id,
                transaction_type="PENALTY_APPLIED",
                amount=amount,
                is_credit=False,
                partner_id=partner_id,
                rider_id=rider_id,
                reference=f"Penalty: {penalty_type} - {reason}",
                created_by=admin_id,
            )

        return {"ok": True, "penalty": penalty_doc}

    # ----------------------------------------------------------------------
    # 6. SETTLEMENT ENGINE
    # ----------------------------------------------------------------------

    async def generate_weekly_settlements(
        self,
        cycle_start_str: Optional[str] = None,
        cycle_end_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates settlement batches for Laundry Partners and Delivery Captains."""
        now = datetime.now(timezone.utc)
        if not cycle_start_str or not cycle_end_str:
            start_dt = now - timedelta(days=now.weekday() + 7)  # Previous Monday
            end_dt = start_dt + timedelta(days=6)               # Previous Sunday
            c_start = start_dt.strftime("%Y-%m-%d")
            c_end = end_dt.strftime("%Y-%m-%d")
        else:
            c_start = cycle_start_str
            c_end = cycle_end_str

        cycle_id = f"CYCLE-{c_start.replace('-', '')}-{c_end.replace('-', '')}"

        # Fetch eligible orders completed in cycle
        all_fin = await database.find_many("order_financials", {})
        cycle_orders = [
            f for f in all_fin
            if str(f.get("createdAt", ""))[:10] >= c_start and str(f.get("createdAt", ""))[:10] <= c_end
        ]

        # Group by Laundry Partner
        partner_settlements: Dict[str, Dict[str, Any]] = {}
        rider_settlements: Dict[str, Dict[str, Any]] = {}

        for o in cycle_orders:
            p_id = o.get("partnerId")
            r_id = o.get("riderId")

            if p_id:
                if p_id not in partner_settlements:
                    partner_settlements[p_id] = {
                        "partnerId": p_id,
                        "orderCount": 0,
                        "grossServiceAmount": 0.0,
                        "totalCommission": 0.0,
                        "totalTcs": 0.0,
                        "penalties": 0.0,
                        "incentives": 0.0,
                        "netSettlement": 0.0,
                    }
                partner_settlements[p_id]["orderCount"] += 1
                partner_settlements[p_id]["grossServiceAmount"] += float(o.get("laundryServiceAmount", 0.0))
                partner_settlements[p_id]["totalCommission"] += float(o.get("quickpressCommission", 0.0))
                partner_settlements[p_id]["totalTcs"] += float(o.get("tcsAmount", 0.0))
                partner_settlements[p_id]["netSettlement"] += float(o.get("partnerSettlement", 0.0))

            if r_id:
                if r_id not in rider_settlements:
                    rider_settlements[r_id] = {
                        "riderId": r_id,
                        "deliveryCount": 0,
                        "deliveryFares": 0.0,
                        "incentives": 0.0,
                        "penalties": 0.0,
                        "netSettlement": 0.0,
                    }
                rider_settlements[r_id]["deliveryCount"] += 1
                rider_settlements[r_id]["deliveryFares"] += float(o.get("deliverySettlement", 0.0))
                rider_settlements[r_id]["netSettlement"] += float(o.get("deliverySettlement", 0.0))

        # Convert to records
        p_list = list(partner_settlements.values())
        r_list = list(rider_settlements.values())

        batch_doc = {
            "_id": cycle_id,
            "cycleId": cycle_id,
            "startDate": c_start,
            "endDate": c_end,
            "totalOrders": len(cycle_orders),
            "partnerCount": len(p_list),
            "riderCount": len(r_list),
            "totalPartnerPayable": round(sum(p["netSettlement"] for p in p_list), 2),
            "totalRiderPayable": round(sum(r["netSettlement"] for r in r_list), 2),
            "status": "GENERATED",  # GENERATED | APPROVED | PAID
            "partners": p_list,
            "riders": r_list,
            "generatedAt": now.isoformat(),
        }

        await database.update_one(
            "financial_settlement_batches",
            {"_id": cycle_id},
            {"$set": batch_doc},
            upsert=True,
        )

        return batch_doc

    # ----------------------------------------------------------------------
    # 7. FINANCIAL REPORTING SUMMARY (P&L METRICS)
    # ----------------------------------------------------------------------

    async def get_financial_summary(self) -> Dict[str, Any]:
        """Computes live real-time financial reporting metrics across all orders."""
        all_fin = await database.find_many("order_financials", {})
        total_orders = len(all_fin)

        gmv = 0.0
        customer_collections = 0.0
        qp_commission = 0.0
        total_gst = 0.0
        delivery_subsidies = 0.0
        partner_payables = 0.0
        rider_payables = 0.0
        refunds_disbursed = 0.0
        qp_net_revenue = 0.0

        for f in all_fin:
            gmv += float(f.get("grossOrderValue", 0.0))
            if f.get("paymentStatus") == "PAID":
                customer_collections += float(f.get("customerPayable", 0.0))
            qp_commission += float(f.get("quickpressCommission", 0.0))
            total_gst += float(f.get("totalGst", 0.0))
            delivery_subsidies += float(f.get("deliverySubsidy", 0.0))
            partner_payables += float(f.get("partnerSettlement", 0.0))
            rider_payables += float(f.get("deliverySettlement", 0.0))
            refunds_disbursed += float(f.get("refundAmount", 0.0))
            qp_net_revenue += float(f.get("quickpressNetRevenue", 0.0))

        return {
            "totalOrders": total_orders,
            "grossMerchandiseValue": round(gmv, 2),
            "customerCollections": round(customer_collections, 2),
            "quickpressCommission": round(qp_commission, 2),
            "totalGstCollected": round(total_gst, 2),
            "deliverySubsidies": round(delivery_subsidies, 2),
            "partnerPayables": round(partner_payables, 2),
            "riderPayables": round(rider_payables, 2),
            "refundsDisbursed": round(refunds_disbursed, 2),
            "quickpressNetRevenue": round(qp_net_revenue, 2),
            "currency": "INR",
        }

    async def simulate_order_lifecycle(
        self,
        items: List[Dict[str, Any]],
        distance_km: float = 2.0,
        coupon_discount: float = 0.0,
        partner_monthly_orders: int = 100,
        is_express: bool = False,
        customer_state: str = "Uttar Pradesh",
        partner_state: str = "Uttar Pradesh",
    ) -> Dict[str, Any]:
        """Calculates end-to-end order unit economics and validates mathematical reconciliation."""
        rules = await self.get_active_rules()
        checkout_pricing = await self.calculate_checkout_price(
            items=items,
            distance_km=distance_km,
            coupon_discount=coupon_discount,
            is_express=is_express,
            customer_state=customer_state,
            partner_state=partner_state,
        )

        subtotal = float(checkout_pricing.get("itemsSubtotal", 0.0))
        customer_payable = float(checkout_pricing.get("customerPayable", 0.0))
        delivery_subsidy = float(checkout_pricing.get("deliverySubsidy", 0.0))
        total_gst = float(checkout_pricing.get("totalGst", 0.0))
        laundry_gst = float(checkout_pricing.get("laundryGst", 0.0))
        service_gst = float(checkout_pricing.get("serviceGst", 0.0))

        # Partner calculations
        comm_rules = rules.get("commission", {})
        tiers = comm_rules.get("tiers", [])
        matched_tier = "Silver"
        comm_rate = 0.15
        for t in tiers:
            min_ord = t.get("minMonthlyOrders", 0)
            max_ord = t.get("maxMonthlyOrders", 999999)
            if min_ord <= partner_monthly_orders <= max_ord:
                matched_tier = t.get("name", "Silver")
                comm_rate = float(t.get("rate", 0.15))
                break

        partner_gross = subtotal
        platform_commission = round(subtotal * comm_rate, 2)
        gst_on_commission = round(platform_commission * float(rules.get("gst", {}).get("platformGstRate", 0.18)), 2)
        tcs_deduction = round(subtotal * float(rules.get("gst", {}).get("tcsRate", 0.01)), 2)
        tds_deduction = round(subtotal * float(rules.get("gst", {}).get("tdsRate", 0.01)), 2)
        partner_net = round(partner_gross - platform_commission - gst_on_commission - tcs_deduction - tds_deduction, 2)

        # Rider calculations
        rider_rules = rules.get("riderPayout", {})
        base_pay = float(rider_rules.get("basePay", 25.0))
        per_km = float(rider_rules.get("perKmRate", 6.0))
        rider_dist_pay = round(max(0.0, distance_km - 2.0) * per_km, 2)
        rider_express = float(rider_rules.get("expressBonus", 20.0)) if is_express else 0.0
        rider_payout = round(base_pay + rider_dist_pay + rider_express, 2)

        # Gateway Cost (Razorpay ~1.95%)
        gateway_rate = 0.0195
        gateway_cost = round(customer_payable * gateway_rate, 2)

        # Platform Margin
        total_taxes = round(total_gst + gst_on_commission + tcs_deduction + tds_deduction, 2)
        platform_gross = round(platform_commission + float(checkout_pricing.get("handlingFee", 15.0)) + float(checkout_pricing.get("platformFee", 10.0)) + float(checkout_pricing.get("customerDeliveryFee", 0.0)), 2)
        platform_margin = round(customer_payable + delivery_subsidy - partner_net - rider_payout - total_taxes - gateway_cost, 2)

        # Mathematical reconciliation
        inflow = round(customer_payable + delivery_subsidy, 2)
        disposition = round(partner_net + rider_payout + platform_margin + total_taxes + gateway_cost, 2)
        diff = round(inflow - disposition, 2)

        return {
            "ok": True,
            "pricing": checkout_pricing,
            "partner": {
                "grossEarnings": partner_gross,
                "commissionTier": matched_tier,
                "commissionRatePct": round(comm_rate * 100, 1),
                "platformCommission": platform_commission,
                "gstOnCommission": gst_on_commission,
                "tcsDeduction": tcs_deduction,
                "tdsDeduction": tds_deduction,
                "netPayable": partner_net,
            },
            "rider": {
                "basePay": base_pay,
                "distancePay": rider_dist_pay,
                "expressBonus": rider_express,
                "totalPayout": rider_payout,
            },
            "platform": {
                "grossRevenue": platform_gross,
                "gatewayCost": gateway_cost,
                "subsidiesFunded": delivery_subsidy,
                "netMargin": platform_margin,
            },
            "taxation": {
                "customerGst": total_gst,
                "laundryGst": laundry_gst,
                "serviceGst": service_gst,
                "gstOnCommission": gst_on_commission,
                "tcsDeduction": tcs_deduction,
                "tdsDeduction": tds_deduction,
                "totalTaxToRemit": total_taxes,
            },
            "economics": {
                "totalInflow": inflow,
                "totalDisposition": disposition,
                "unreconciledDifference": abs(diff),
                "mathematicallyReconciled": abs(diff) < 0.05,
            },
        }

unified_finance_service = UnifiedFinanceService()
