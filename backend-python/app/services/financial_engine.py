"""QuickPress Master Financial, Pricing & Incentive Engine.

Single source of truth for:
1. Dynamic Service Pricing (Per-kg, Per-piece, Express +35%).
2. Tiered Partner Commissions (18% / 15% / 12%) & Section 194-O TCS (1%).
3. Customer Delivery & Convenience Pricing (Base ₹29, Distance surge ₹6/km, Free above ₹499).
4. Rider Trip Fare Matrix (Base ₹30 + ₹8/km + Surge + Tips).
5. Dynamic Incentive Engine (Daily targets: 5/10/15 trips, Weekly streaks).
6. Late Delivery / SLA Guarantee (₹50 auto-cashback on >60 min delay).
7. GST & Taxation Compliance (5% Laundry, 18% Platform Services).
8. Membership Benefits (QuickPress Plus: ₹0 Delivery, ₹0 Handling, 10% Dry Clean Discount).
9. Zonal / City-Tier Adjustments (Tier 1 Metro vs Tier 2/3 Cities).
10. Unit Economics & Platform Net Margin Calculations.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Default Financial Master Configuration (Can be overridden by admin_settings)
# --------------------------------------------------------------------------

DEFAULT_FINANCIAL_CONFIG: Dict[str, Any] = {
    # Platform Commissions
    "standardCommissionRate": 0.18,  # 18% for <100 orders/month
    "silverCommissionRate": 0.15,    # 15% for 100-300 orders/month
    "goldCommissionRate": 0.12,      # 12% for >300 orders/month
    "tcsRate": 0.01,                 # 1% Section 194-O TCS
    "tdsRate": 0.01,                 # 1% Section 194-C TDS

    # Customer Delivery & Convenience
    "baseDeliveryFee": 29.0,         # Within base distance
    "baseDeliveryRadiusKm": 5.0,     # Base radius in KM
    "extraKmRate": 6.0,              # Per KM above base radius
    "freeDeliveryThreshold": 499.0,  # Free delivery order minimum
    "handlingFee": 15.0,             # Platform handling & packaging
    "expressTurnaroundMultiplier": 1.35, # +35% for 24-hr express

    # Taxes
    "laundryGstRate": 0.05,          # 5% GST on fabric cleaning
    "serviceGstRate": 0.18,          # 18% GST on delivery & handling

    # Rider Trip Earnings
    "riderBaseFare": 30.0,           # Minimum base pickup/drop fare
    "riderPerKmRate": 8.0,           # Per KM rate
    "riderWaitingFeePerMin": 1.5,     # Waiting fee after 10 mins
    "riderRainSurge": 20.0,          # Extra during rain
    "riderNightSurge": 25.0,         # Extra between 10 PM - 6 AM

    # Daily Incentive Target Rewards
    "incentiveTier1Trips": 5,
    "incentiveTier1Reward": 100.0,   # +₹100 for 5 trips
    "incentiveTier2Trips": 10,
    "incentiveTier2Reward": 250.0,   # +₹250 for 10 trips
    "incentiveTier3Trips": 15,
    "incentiveTier3Reward": 450.0,   # +₹450 for 15 trips
    "weeklyStreakTrips": 50,
    "weeklyStreakReward": 800.0,     # +₹800 for 50 trips in a week

    # SLA Late Delivery Compensation
    "slaDelayThresholdMinutes": 60,
    "slaCustomerCashback": 50.0,     # ₹50 auto wallet cashback
    "slaPartnerPenaltyRate": 0.02,   # 2% partner deduction on delayed ready

    # Membership VIP Club
    "membershipFreeDeliveryMin": 199.0, # ₹0 delivery for members
    "membershipDryCleanDiscount": 0.10,  # 10% off dry clean for members
}

TIER_1_CITIES = {"bengaluru", "mumbai", "delhi ncr", "delhi", "pune", "hyderabad"}


@dataclass
class CheckoutPricingResult:
    itemsSubtotal: float
    couponDiscount: float
    membershipDiscount: float
    totalDiscount: float
    taxableLaundrySubtotal: float
    laundryGst: float
    pickupFee: float
    deliveryFee: float
    deliveryDiscount: float
    effectiveDeliveryFee: float
    handlingFee: float
    handlingDiscount: float
    effectiveHandlingFee: float
    serviceGst: float
    grandTotal: float
    isFreeDelivery: bool
    partnerEstimatedEarnings: float
    platformEstimatedCommission: float
    estimatedRiderPayout: float
    platformNetMargin: float
    currency: str = "INR"


@dataclass
class RiderTripFareResult:
    baseFare: float
    distanceKm: float
    distanceFare: float
    surgeAmount: float
    surgeReason: str
    waitingFare: float
    tipAmount: float
    totalTripEarnings: float
    dailyIncentiveEligible: bool


class FinancialEngine:
    """Core financial computation engine orchestrating all pricing and payouts."""

    def __init__(self, custom_config: Optional[Dict[str, Any]] = None):
        self._raw_config = {**DEFAULT_FINANCIAL_CONFIG, **(custom_config or {})}

    @property
    def config(self) -> Dict[str, Any]:
        cfg = dict(self._raw_config)
        try:
            from app.services.unified_finance_service import DEFAULT_UNIFIED_RULES, unified_finance_service
            rules = getattr(unified_finance_service, "_rules_cache", None) or DEFAULT_UNIFIED_RULES
            if rules:
                p = rules.get("pricing", {})
                d = rules.get("delivery", {})
                g = rules.get("gst", {})
                c = rules.get("commission", {})
                rp = rules.get("riderPayout", {})
                inc = rules.get("incentives", {})
                if "baseFee" in d: cfg["baseDeliveryFee"] = float(d["baseFee"])
                if "freeDeliveryThreshold" in d: cfg["freeDeliveryThreshold"] = float(d["freeDeliveryThreshold"])
                if "perKmRate" in d: cfg["extraKmRate"] = float(d["perKmRate"])
                if "handlingFee" in p: cfg["handlingFee"] = float(p["handlingFee"])
                if "platformFee" in p: cfg["platformFee"] = float(p["platformFee"])
                if "minimumOrderValue" in p: cfg["minimumOrderValue"] = float(p["minimumOrderValue"])
                if "expressMultiplier" in p: cfg["expressTurnaroundMultiplier"] = float(p["expressMultiplier"])
                if "laundryGstRate" in g: cfg["laundryGstRate"] = float(g["laundryGstRate"])
                if "platformGstRate" in g: cfg["serviceGstRate"] = float(g["platformGstRate"])
                if "standardRate" in c: cfg["standardCommissionRate"] = float(c["standardRate"])
                if "silverRate" in c: cfg["silverCommissionRate"] = float(c["silverRate"])
                if "goldRate" in c: cfg["goldCommissionRate"] = float(c["goldRate"])
                if "silverThreshold" in c: cfg["silverCommissionThreshold"] = int(c["silverThreshold"])
                if "goldThreshold" in c: cfg["goldCommissionThreshold"] = int(c["goldThreshold"])
                if "basePay" in rp: cfg["riderBaseFare"] = float(rp["basePay"])
                if "perKmRate" in rp: cfg["riderPerKmRate"] = float(rp["perKmRate"])
                if "nightSurge" in rp: cfg["riderNightSurge"] = float(rp["nightSurge"])
                if "rainSurge" in rp: cfg["riderRainSurge"] = float(rp["rainSurge"])
                rider_daily = inc.get("riderDaily") or []
                if len(rider_daily) >= 1:
                    cfg["incentiveTier1Trips"] = int(rider_daily[0]["trips"])
                    cfg["incentiveTier1Reward"] = float(rider_daily[0]["reward"])
                if len(rider_daily) >= 2:
                    cfg["incentiveTier2Trips"] = int(rider_daily[1]["trips"])
                    cfg["incentiveTier2Reward"] = float(rider_daily[1]["reward"])
                if len(rider_daily) >= 3:
                    cfg["incentiveTier3Trips"] = int(rider_daily[2]["trips"])
                    cfg["incentiveTier3Reward"] = float(rider_daily[2]["reward"])
                if "riderWeeklyStreak" in inc:
                    cfg["weeklyStreakTrips"] = int(inc["riderWeeklyStreak"].get("trips", 50))
                    cfg["weeklyStreakReward"] = float(inc["riderWeeklyStreak"].get("reward", 800))
        except Exception:
            pass
        return cfg

    @config.setter
    def config(self, val: Dict[str, Any]):
        self._raw_config = val

    def get_commission_rate(self, monthly_order_count: int = 50, order_count: Optional[int] = None) -> float:
        orders = order_count if order_count is not None else monthly_order_count
        gold_th = int(self.config.get("goldCommissionThreshold", 300))
        silver_th = int(self.config.get("silverCommissionThreshold", 100))
        if orders >= gold_th:
            return float(self.config.get("goldCommissionRate", 0.12))
        elif orders >= silver_th:
            return float(self.config.get("silverCommissionRate", 0.15))
        return float(self.config.get("standardCommissionRate", 0.18))

    def compute_delivery_fee(
        self,
        distance_km: float,
        items_subtotal: float,
        is_member: bool = False,
        city: str = "Kasganj",
    ) -> Tuple[float, float, bool]:
        """Calculates standard delivery fee, member/cart discounts, and free delivery flag."""
        city_lower = (city or "").strip().lower()
        is_tier_1 = city_lower in TIER_1_CITIES

        base_fee = 39.0 if is_tier_1 else float(self.config["baseDeliveryFee"])
        free_min = 599.0 if is_tier_1 else float(self.config["freeDeliveryThreshold"])
        base_radius = float(self.config["baseDeliveryRadiusKm"])
        extra_rate = float(self.config["extraKmRate"])

        # Distance calculation
        distance = max(0.0, float(distance_km or 2.5))
        if distance > base_radius:
            raw_delivery = base_fee + ((distance - base_radius) * extra_rate)
        else:
            raw_delivery = base_fee

        raw_delivery = round(raw_delivery, 2)

        # Free Delivery checks
        is_free = False
        discount = 0.0

        if is_member and items_subtotal >= float(self.config["membershipFreeDeliveryMin"]):
            is_free = True
            discount = raw_delivery
        elif items_subtotal >= free_min:
            is_free = True
            discount = raw_delivery

        effective_delivery = max(0.0, raw_delivery - discount)
        return raw_delivery, discount, is_free

    def compute_checkout_pricing(
        self,
        items: List[Dict[str, Any]],
        coupon_discount: float = 0.0,
        is_express: bool = False,
        is_member: bool = False,
        distance_km: float = 3.0,
        city: str = "Kasganj",
        partner_monthly_orders: int = 50,
    ) -> CheckoutPricingResult:
        """Complete, mathematically sound computation of the customer checkout invoice."""
        # 1. Items subtotal
        raw_items_subtotal = 0.0
        dry_clean_subtotal = 0.0

        for item in items:
            qty = max(1, int(item.get("qty", 1)))
            price = float(item.get("price", 0.0))
            sub = qty * price
            raw_items_subtotal += sub

            name_lower = str(item.get("name", "")).lower()
            if "dry clean" in name_lower or "suit" in name_lower or "saree" in name_lower or "shoe" in name_lower:
                dry_clean_subtotal += sub

        # Express Turnaround Surcharge (+35%)
        if is_express:
            express_multiplier = float(self.config.get("expressTurnaroundMultiplier", 1.35))
            items_subtotal = round(raw_items_subtotal * express_multiplier, 2)
        else:
            items_subtotal = round(raw_items_subtotal, 2)

        # 2. Member Discounts
        membership_discount = 0.0
        if is_member and dry_clean_subtotal > 0:
            membership_discount = round(
                dry_clean_subtotal * float(self.config["membershipDryCleanDiscount"]), 2
            )

        total_discount = min(items_subtotal, round(float(coupon_discount or 0.0) + membership_discount, 2))
        taxable_laundry = max(0.0, items_subtotal - total_discount)

        # 3. GST on Laundry (5%)
        laundry_gst = round(taxable_laundry * float(self.config["laundryGstRate"]), 2)

        # 4. Delivery Fee Calculation
        raw_delivery, del_discount, is_free = self.compute_delivery_fee(
            distance_km=distance_km,
            items_subtotal=taxable_laundry,
            is_member=is_member,
            city=city,
        )
        effective_delivery = max(0.0, round(raw_delivery - del_discount, 2))

        # 5. Handling Fee Calculation (Waived for Plus members)
        raw_handling = float(self.config["handlingFee"])
        handling_discount = raw_handling if is_member else 0.0
        effective_handling = max(0.0, raw_handling - handling_discount)

        # 6. Service GST on (Delivery + Handling) @ 18%
        taxable_services = effective_delivery + effective_handling
        service_gst = round(taxable_services * float(self.config["serviceGstRate"]), 2)

        # 7. Grand Total
        grand_total = round(taxable_laundry + laundry_gst + effective_delivery + effective_handling + service_gst, 2)

        # 8. Partner Settlement & Platform Revenue Breakdown
        comm_rate = self.get_commission_rate(partner_monthly_orders)
        platform_commission = round(taxable_laundry * comm_rate, 2)
        tcs_deduction = round(taxable_laundry * float(self.config["tcsRate"]), 2)
        partner_net_earning = round(taxable_laundry - platform_commission - tcs_deduction, 2)

        # 9. Estimated Rider Trip Payout (Base ₹30 + ₹8/km)
        est_rider_pay = round(float(self.config["riderBaseFare"]) + (distance_km * float(self.config["riderPerKmRate"])), 2)

        # 10. Platform Net Margin
        platform_revenue = platform_commission + effective_handling + (effective_delivery - est_rider_pay)
        platform_net_margin = round(platform_revenue, 2)

        return CheckoutPricingResult(
            itemsSubtotal=items_subtotal,
            couponDiscount=float(coupon_discount or 0.0),
            membershipDiscount=membership_discount,
            totalDiscount=total_discount,
            taxableLaundrySubtotal=taxable_laundry,
            laundryGst=laundry_gst,
            pickupFee=0.0,
            deliveryFee=raw_delivery,
            deliveryDiscount=del_discount,
            effectiveDeliveryFee=effective_delivery,
            handlingFee=raw_handling,
            handlingDiscount=handling_discount,
            effectiveHandlingFee=effective_handling,
            serviceGst=service_gst,
            grandTotal=grand_total,
            isFreeDelivery=is_free,
            partnerEstimatedEarnings=partner_net_earning,
            platformEstimatedCommission=platform_commission,
            estimatedRiderPayout=est_rider_pay,
            platformNetMargin=platform_net_margin,
        )

    def compute_rider_trip_fare(
        self,
        distance_km: float,
        is_rain: bool = False,
        is_night: bool = False,
        waiting_minutes: int = 0,
        tip_amount: float = 0.0,
        city: str = "Kasganj",
    ) -> RiderTripFareResult:
        """Calculates precise trip fare, distance rate, surge, and tips for a rider."""
        city_lower = (city or "").strip().lower()
        is_tier_1 = city_lower in TIER_1_CITIES

        base = 35.0 if is_tier_1 else float(self.config["riderBaseFare"])
        per_km = float(self.config["riderPerKmRate"])
        dist = max(0.5, float(distance_km or 2.5))
        distance_fare = round(dist * per_km, 2)

        surge_amount = 0.0
        surge_reasons = []

        if is_rain:
            surge_amount += float(self.config["riderRainSurge"])
            surge_reasons.append("Rain Surge (+₹20)")
        if is_night:
            surge_amount += float(self.config["riderNightSurge"])
            surge_reasons.append("Night Shift (+₹25)")

        waiting_fare = 0.0
        if waiting_minutes > 10:
            extra_mins = waiting_minutes - 10
            waiting_fare = round(extra_mins * float(self.config["riderWaitingFeePerMin"]), 2)

        tip = max(0.0, float(tip_amount or 0.0))
        total_fare = round(base + distance_fare + surge_amount + waiting_fare + tip, 2)

        return RiderTripFareResult(
            baseFare=base,
            distanceKm=dist,
            distanceFare=distance_fare,
            surgeAmount=surge_amount,
            surgeReason=", ".join(surge_reasons) if surge_reasons else "Normal Traffic",
            waitingFare=waiting_fare,
            tipAmount=tip,
            totalTripEarnings=total_fare,
            dailyIncentiveEligible=True,
        )

    def compute_daily_incentives(self, completed_trips_today: int) -> Dict[str, Any]:
        """Calculates rider daily target progression and bonus unlock status."""
        t1_target = int(self.config["incentiveTier1Trips"])
        t1_reward = float(self.config["incentiveTier1Reward"])
        t2_target = int(self.config["incentiveTier2Trips"])
        t2_reward = float(self.config["incentiveTier2Reward"])
        t3_target = int(self.config["incentiveTier3Trips"])
        t3_reward = float(self.config["incentiveTier3Reward"])

        trips = max(0, int(completed_trips_today or 0))
        earned_bonus = 0.0
        next_target = t1_target
        next_target_reward = t1_reward

        if trips >= t3_target:
            earned_bonus = t3_reward
            next_target = t3_target
            next_target_reward = 0.0
        elif trips >= t2_target:
            earned_bonus = t2_reward
            next_target = t3_target
            next_target_reward = t3_reward - t2_reward
        elif trips >= t1_target:
            earned_bonus = t1_reward
            next_target = t2_target
            next_target_reward = t2_reward - t1_reward

        progress_pct = min(100.0, round((trips / t3_target) * 100.0, 1))

        return {
            "completedTripsToday": trips,
            "earnedBonusToday": earned_bonus,
            "nextTargetTrips": next_target,
            "nextTargetReward": next_target_reward,
            "tripsRemainingForNextTarget": max(0, next_target - trips),
            "progressPercent": progress_pct,
            "tiers": [
                {"trips": t1_target, "bonus": t1_reward, "unlocked": trips >= t1_target},
                {"trips": t2_target, "bonus": t2_reward, "unlocked": trips >= t2_target},
                {"trips": t3_target, "bonus": t3_reward, "unlocked": trips >= t3_target},
            ],
        }


# Global singleton instance
financial_engine = FinancialEngine()
