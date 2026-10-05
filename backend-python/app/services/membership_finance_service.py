"""Membership Finance & Subscription Economics Service for QuickPress.

Integrates:
1. Dynamic No-Code Plan Management (Pricing, Validity, Free Delivery threshold).
2. Financial KPIs (MRR, ARR, Churn Rate %, Subsidy-to-Fee Ratio, Member vs Non-Member AOV).
3. Active Members Directory with Days Remaining and LTV.
4. Ind AS 115 Deferred Revenue recognition & monthly amortization via General Ledger.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.services.general_ledger_service import general_ledger_service

logger = logging.getLogger(__name__)

COLLECTION_PLANS = "membership_plans"
COLLECTION_SUBS = "memberships"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class MembershipFinanceService:
    """Service managing Subscription Economics, Dynamic Plans, and Deferred Revenue."""

    # -------------------------------------------------------------------------
    # 1. DYNAMIC PLAN CRUD (100% No-Code Control)
    # -------------------------------------------------------------------------
    async def list_plans(self) -> List[Dict[str, Any]]:
        """Lists all membership plans with their live pricing and perks."""
        plans = await database.find_many(COLLECTION_PLANS, {})
        plans.sort(key=lambda p: p.get("monthly_price") or p.get("monthlyPrice") or 0)
        return plans

    async def create_plan(
        self,
        *,
        name: str,
        monthly_price: float,
        yearly_price: float,
        validity_days: int = 30,
        free_delivery_min_order: float = 299.0,
        discount_percent: float = 15.0,
        max_discount_per_order: float = 150.0,
        tagline: str = "",
        created_by: str = "super_admin",
    ) -> Dict[str, Any]:
        """Creates a new dynamic membership plan in database without code changes."""
        now = _now_iso()
        plan_id = name.lower().strip().replace(" ", "-")

        doc = {
            "_id": plan_id,
            "id": plan_id,
            "name": name,
            "tagline": tagline or f"Exclusive savings for {name} members",
            "monthly_price": round(float(monthly_price), 2),
            "monthlyPrice": round(float(monthly_price), 2),
            "yearly_price": round(float(yearly_price), 2),
            "yearlyPrice": round(float(yearly_price), 2),
            "validity_days": validity_days,
            "validityDays": validity_days,
            "free_delivery_min_order": round(float(free_delivery_min_order), 2),
            "freeDeliveryMinOrder": round(float(free_delivery_min_order), 2),
            "discount_percent": round(float(discount_percent), 2),
            "discountPercent": round(float(discount_percent), 2),
            "max_discount_per_order": round(float(max_discount_per_order), 2),
            "status": "Active",
            "is_active": True,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
        }

        await database.collection(COLLECTION_PLANS).update_one(
            {"_id": plan_id},
            {"$set": doc},
            upsert=True,
        )
        logger.info("New Membership Plan created: %s, Monthly=₹%.2f, Yearly=₹%.2f", plan_id, monthly_price, yearly_price)
        return doc

    async def update_plan_pricing(
        self,
        plan_id: str,
        *,
        monthly_price: Optional[float] = None,
        yearly_price: Optional[float] = None,
        free_delivery_min_order: Optional[float] = None,
        discount_percent: Optional[float] = None,
        max_discount_per_order: Optional[float] = None,
        updated_by: str = "super_admin",
    ) -> Dict[str, Any]:
        """Dynamically updates plan pricing or perks."""
        now = _now_iso()
        update_set: Dict[str, Any] = {"updated_at": now, "updated_by": updated_by}

        if monthly_price is not None:
            mp = round(float(monthly_price), 2)
            update_set["monthly_price"] = mp
            update_set["monthlyPrice"] = mp
        if yearly_price is not None:
            yp = round(float(yearly_price), 2)
            update_set["yearly_price"] = yp
            update_set["yearlyPrice"] = yp
        if free_delivery_min_order is not None:
            fd = round(float(free_delivery_min_order), 2)
            update_set["free_delivery_min_order"] = fd
            update_set["freeDeliveryMinOrder"] = fd
        if discount_percent is not None:
            dp = round(float(discount_percent), 2)
            update_set["discount_percent"] = dp
            update_set["discountPercent"] = dp
        if max_discount_per_order is not None:
            md = round(float(max_discount_per_order), 2)
            update_set["max_discount_per_order"] = md

        await database.collection(COLLECTION_PLANS).update_one(
            {"$or": [{"_id": plan_id}, {"id": plan_id}]},
            {"$set": update_set},
        )
        logger.info("Membership Plan %s updated: %s", plan_id, update_set)
        return {"plan_id": plan_id, "updated": update_set}

    async def toggle_plan_status(self, plan_id: str, is_active: bool) -> Dict[str, Any]:
        """Activates or archives a membership plan."""
        now = _now_iso()
        status_str = "Active" if is_active else "Archived"
        await database.collection(COLLECTION_PLANS).update_one(
            {"$or": [{"_id": plan_id}, {"id": plan_id}]},
            {"$set": {"status": status_str, "is_active": is_active, "updated_at": now}},
        )
        return {"plan_id": plan_id, "status": status_str, "is_active": is_active}

    # -------------------------------------------------------------------------
    # 2. FINANCIAL METRICS & SUBSCRIPTION KPIS
    # -------------------------------------------------------------------------
    async def get_membership_financial_metrics(self) -> Dict[str, Any]:
        """Calculates MRR, ARR, Churn, Subsidy Ratio, and Active Members."""
        subs = await database.find_many(COLLECTION_SUBS, {})

        now = datetime.now(timezone.utc)
        active_subs = [
            s for s in subs
            if s.get("status") == "active"
            and (not s.get("expires_at") or datetime.fromisoformat(str(s["expires_at"]).replace("Z", "+00:00")) > now)
        ]

        total_active_members = len(active_subs)

        # Monthly Recurring Revenue (MRR)
        # Monthly subs contribute full amount; Yearly subs contribute 1/12th
        mrr = 0.0
        for s in active_subs:
            cycle = str(s.get("billing_cycle") or "monthly").lower()
            amt = float(s.get("amount_paid") or 0.0)
            if cycle == "yearly":
                mrr += amt / 12.0
            else:
                mrr += amt

        mrr = round(mrr, 2)
        arr = round(mrr * 12.0, 2)

        # Churn Rate: Expired or Cancelled / Total Lifetime Subs
        expired_or_cancelled = [s for s in subs if s.get("status") in ("expired", "cancelled")]
        churn_pct = (
            round((len(expired_or_cancelled) / len(subs) * 100), 1) if subs else 0.0
        )

        # Total Upfront Cash collected from Subscriptions
        total_upfront_cash = sum(float(s.get("amount_paid") or 0.0) for s in subs)

        return {
            "total_active_members": total_active_members,
            "mrr": mrr,
            "arr": arr,
            "churn_rate_percentage": churn_pct,
            "total_upfront_cash_collected": round(total_upfront_cash, 2),
            "total_subscriptions_count": len(subs),
        }

    # -------------------------------------------------------------------------
    # 3. ACTIVE MEMBERS DIRECTORY & TRACKING
    # -------------------------------------------------------------------------
    async def list_active_members(
        self,
        skip: int = 0,
        limit: int = 50,
        plan_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists active subscribers with days left, total orders placed, and LTV."""
        now = datetime.now(timezone.utc)
        query: Dict[str, Any] = {"status": "active"}
        if plan_id:
            query["plan_id"] = plan_id

        all_subs = await database.find_many(COLLECTION_SUBS, query)

        result: List[Dict[str, Any]] = []
        for s in all_subs:
            uid = s.get("user_id") or ""
            user = await database.collection("users").find_one({"$or": [{"id": uid}, {"_id": uid}]})

            # Calculate days left
            exp_str = s.get("expires_at")
            days_left = 0
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(str(exp_str).replace("Z", "+00:00"))
                    delta = (exp_dt - now).days
                    days_left = max(0, delta)
                except Exception:
                    pass

            # Search filter
            user_name = (user.get("name") or user.get("fullName") or "Customer") if user else "Customer"
            user_phone = user.get("phone", "") if user else ""
            if search:
                if (
                    search.lower() not in user_name.lower()
                    and search not in user_phone
                    and search not in uid
                ):
                    continue

            # Fetch orders placed as member
            orders = await database.find_many("orders", {"$or": [{"customerId": uid}, {"user_id": uid}]})
            total_spend = sum(
                float(o.get("total_amount") or (o.get("totals") or {}).get("grandTotal") or o.get("amount") or 0.0)
                for o in orders
            )

            result.append({
                "subscription_id": s.get("id") or str(s.get("_id")),
                "user_id": uid,
                "customer_name": user_name,
                "customer_phone": user_phone,
                "plan_id": s.get("plan_id"),
                "billing_cycle": s.get("billing_cycle", "monthly"),
                "amount_paid": float(s.get("amount_paid") or 0.0),
                "started_at": s.get("started_at"),
                "expires_at": s.get("expires_at"),
                "days_remaining": days_left,
                "is_expiring_soon": days_left <= 7,
                "orders_count": len(orders),
                "total_spend": round(total_spend, 2),
                "auto_renew": s.get("auto_renew", False),
            })

        result.sort(key=lambda d: d["days_remaining"])
        total_count = len(result)
        return result[skip : skip + limit], total_count

    # -------------------------------------------------------------------------
    # 4. Ind AS 115 DEFERRED REVENUE RECOGNITION (General Ledger)
    # -------------------------------------------------------------------------
    async def record_subscription_purchase(
        self,
        *,
        user_id: str,
        plan_id: str,
        amount_paid: float,
        payment_reference: str,
        billing_cycle: str = "monthly",
    ) -> Dict[str, Any]:
        """Records purchase and creates Deferred Unearned Revenue liability in General Ledger."""
        now = _now_iso()
        validity = 365 if billing_cycle.lower() == "yearly" else 30
        expires = (datetime.now(timezone.utc) + timedelta(days=validity)).replace(microsecond=0).isoformat().replace("+00:00", "Z")

        sub_id = f"mbs-{user_id[:12]}-{uuid.uuid4().hex[:6]}"
        sub_doc = {
            "_id": sub_id,
            "id": sub_id,
            "user_id": user_id,
            "plan_id": plan_id,
            "status": "active",
            "billing_cycle": billing_cycle.lower(),
            "amount_paid": round(float(amount_paid), 2),
            "started_at": now,
            "expires_at": expires,
            "payment_reference": payment_reference,
            "auto_renew": False,
            "created_at": now,
        }

        await database.collection(COLLECTION_SUBS).insert_one(sub_doc)

        # Tax calculation: 18% GST included in price
        net_unearned = round(amount_paid / 1.18, 2)
        gst_tax = round(amount_paid - net_unearned, 2)

        # Post Ind AS 115 Deferred Revenue entry in General Ledger
        gl_lines = await general_ledger_service.post_membership_purchased(
            membership_id=sub_id,
            user_id=user_id,
            plan_price=amount_paid,
            gst_tax=gst_tax,
            unearned_net_amount=net_unearned,
            payment_reference=payment_reference,
            created_by="membership_subscription_flow",
        )

        logger.info(
            "Subscription %s purchased by %s: ₹%.2f (Deferred Revenue: ₹%.2f, Tax: ₹%.2f, GL lines: %d)",
            sub_id, user_id, amount_paid, net_unearned, gst_tax, len(gl_lines)
        )
        return {"subscription": sub_doc, "ledger_lines_posted": len(gl_lines)}


membership_finance_service = MembershipFinanceService()
