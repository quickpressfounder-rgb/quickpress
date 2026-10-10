"""Membership repository — Sprint 2.9.

Collections
-----------
`membership_plans`         catalogue of Free / Silver / Gold / Premium plans.

    {
      "_id": "free" | "silver" | "gold" | "premium",
      "name": "Gold",
      "tagline": "…",
      "monthly_price": 199,
      "yearly_price": 1990,
      "validity_days": 30,
      "yearly_validity_days": 365,
      "benefit_ids": ["free-pickup", "free-delivery", …],
      "order": 3,
      "popular": true
    }

`membership_benefits`      catalogue of benefits and the plans that unlock them.

    {
      "_id": "free-delivery",
      "title": "Free delivery above ₹299",
      "description": "…",
      "icon": "truck",
      "plans": ["silver", "gold", "premium"]
    }

`memberships`              exactly one document per customer (the active one).

    {
      "_id": "mbs-<user_id>",
      "user_id": "<users._id>",
      "plan_id": "gold",
      "status": "active" | "expired" | "cancelled" | "none",
      "billing_cycle": "monthly" | "yearly",
      "amount_paid": 199,
      "started_at": "…", "expires_at": "…", "cancelled_at": null,
      "auto_renew": true
    }

`membership_transactions`  append-only ledger of subscribe / renew / upgrade /
                           cancel / expire events with a payment status.

Business rules enforced here
----------------------------
* Only one active membership per customer (single `memberships` document).
* Duplicate subscriptions to the same active plan are rejected (409).
* Expiry is evaluated on every read; expired memberships fall back to Free and
  write an `expire` ledger entry exactly once.
* Paid plans record `payment_status="paid"` today; the `payment_reference`
  field and `pending` status are already wired for a real gateway later.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.models.membership import (
    CancelResponse,
    MembershipBenefit,
    MembershipBenefitsResponse,
    MembershipHistoryResponse,
    MembershipPlan,
    MembershipPlansResponse,
    MembershipResponse,
    MembershipTransaction,
    SubscribeResponse,
)
from app.models.user import User, utcnow

MEMBERSHIPS = "memberships"
PLANS = "membership_plans"
TRANSACTIONS = "membership_transactions"
BENEFITS = "membership_benefits"

FREE_PLAN_ID = "free"


class MembershipConflict(Exception):
    """Raised for business-rule violations (duplicate / unknown plan / no plan)."""

    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# --------------------------------------------------------------------- seed

BENEFIT_SEED: List[Dict[str, Any]] = [
    {
        "_id": "free-pickup",
        "title": "Free Doorstep Pickup",
        "description": "Doorstep pickup at ₹0 on every order.",
        "icon": "package",
        "plans": ["silver", "gold", "platinum", "elite"],
        "order": 1,
    },
    {
        "_id": "free-delivery",
        "title": "Free Deliveries Quota",
        "description": "Zero delivery fee on qualifying membership orders.",
        "icon": "truck",
        "plans": ["silver", "gold", "platinum", "elite"],
        "order": 2,
    },
    {
        "_id": "extra-discount",
        "title": "Extra Member Discounts",
        "description": "Flat 10% to 25% extra discount across all laundry services.",
        "icon": "percent",
        "plans": ["silver", "gold", "platinum", "elite"],
        "order": 3,
    },
    {
        "_id": "free-express",
        "title": "Express Turnaround Pass",
        "description": "Complimentary express priority 4-8 hr order processing.",
        "icon": "zap",
        "plans": ["silver", "gold", "platinum", "elite"],
        "order": 4,
    },
    {
        "_id": "priority-processing",
        "title": "Priority Queue Processing",
        "description": "Your laundry jumps the partner facility processing queue.",
        "icon": "sparkles",
        "plans": ["gold", "platinum", "elite"],
        "order": 5,
    },
    {
        "_id": "priority-support",
        "title": "Dedicated VIP Support",
        "description": "Direct VIP hotline and expedited priority chat support.",
        "icon": "headphones",
        "plans": ["gold", "platinum", "elite"],
        "order": 6,
    },
    {
        "_id": "surge-waiver",
        "title": "100% Surge & Rain Fee Exemption",
        "description": "Zero peak surge or bad weather fees on all deliveries.",
        "icon": "shield-check",
        "plans": ["platinum", "elite"],
        "order": 7,
    },
    {
        "_id": "concierge-support",
        "title": "Personal VIP Relationship Manager",
        "description": "Dedicated concierge agent for white-glove custom laundry care.",
        "icon": "crown",
        "plans": ["elite"],
        "order": 8,
    },
    {
        "_id": "exclusive-offers",
        "title": "Private Elite Drops & Vouchers",
        "description": "Early access to secret flash drops, partner perks, and monthly vouchers.",
        "icon": "gift",
        "plans": ["platinum", "elite"],
        "order": 9,
    },
]

PLAN_SEED: List[Dict[str, Any]] = [
    {
        "_id": "silver",
        "name": "Silver",
        "tagline": "5 Free deliveries/mo + 10% member savings",
        "monthly_price": 99,
        "quarterly_price": 269,
        "yearly_price": 999,
        "validity_days": 30,
        "yearly_validity_days": 365,
        "monthly_order_limit": 5,
        "monthly_weight_limit_kg": 20,
        "free_express_count": 1,
        "discount_percent": 10,
        "cashback_percent": 2,
        "free_delivery_min_order": 199,
        "free_pickup": True,
        "priority_processing": False,
        "surge_waiver": False,
        "support_tier": "Standard Support",
        "color": "slate",
        "badge": "Starter VIP",
        "status": "Active",
        "benefit_ids": ["free-pickup", "free-delivery", "extra-discount", "free-express"],
        "order": 1,
        "popular": False,
    },
    {
        "_id": "gold",
        "name": "Gold",
        "tagline": "15 Free deliveries/mo + 15% discount & priority queue",
        "monthly_price": 199,
        "quarterly_price": 549,
        "yearly_price": 1990,
        "validity_days": 30,
        "yearly_validity_days": 365,
        "monthly_order_limit": 15,
        "monthly_weight_limit_kg": 50,
        "free_express_count": 3,
        "discount_percent": 15,
        "cashback_percent": 5,
        "free_delivery_min_order": 99,
        "free_pickup": True,
        "priority_processing": True,
        "surge_waiver": False,
        "support_tier": "Priority Chat & Phone",
        "color": "amber",
        "badge": "Most Popular",
        "status": "Active",
        "benefit_ids": [
            "free-pickup",
            "free-delivery",
            "extra-discount",
            "free-express",
            "priority-processing",
            "priority-support",
        ],
        "order": 2,
        "popular": True,
    },
    {
        "_id": "platinum",
        "name": "Platinum",
        "tagline": "30 Free deliveries/mo + 20% discount & Free Surge waiver",
        "monthly_price": 349,
        "quarterly_price": 949,
        "yearly_price": 3490,
        "validity_days": 30,
        "yearly_validity_days": 365,
        "monthly_order_limit": 30,
        "monthly_weight_limit_kg": 100,
        "free_express_count": 10,
        "discount_percent": 20,
        "cashback_percent": 8,
        "free_delivery_min_order": 0,
        "free_pickup": True,
        "priority_processing": True,
        "surge_waiver": True,
        "support_tier": "24x7 VIP Hotline",
        "color": "indigo",
        "badge": "Premium Choice",
        "status": "Active",
        "benefit_ids": [
            "free-pickup",
            "free-delivery",
            "extra-discount",
            "free-express",
            "priority-processing",
            "priority-support",
            "surge-waiver",
            "exclusive-offers",
        ],
        "order": 3,
        "popular": False,
    },
    {
        "_id": "elite",
        "name": "Elite VIP",
        "tagline": "Unlimited Free Deliveries + 25% Off + Personal Concierge",
        "monthly_price": 599,
        "quarterly_price": 1599,
        "yearly_price": 5990,
        "validity_days": 30,
        "yearly_validity_days": 365,
        "monthly_order_limit": 999,
        "monthly_weight_limit_kg": 999,
        "free_express_count": 999,
        "discount_percent": 25,
        "cashback_percent": 10,
        "free_delivery_min_order": 0,
        "free_pickup": True,
        "priority_processing": True,
        "surge_waiver": True,
        "support_tier": "Personal Relationship Manager",
        "color": "purple",
        "badge": "Ultimate Luxury",
        "status": "Active",
        "benefit_ids": [
            "free-pickup",
            "free-delivery",
            "extra-discount",
            "free-express",
            "priority-processing",
            "priority-support",
            "surge-waiver",
            "concierge-support",
            "exclusive-offers",
        ],
        "order": 4,
        "popular": False,
    },
]


#: Consumed by the FastAPI lifespan seed loop in `app.main`.
MEMBERSHIP_SEED: Dict[str, List[Dict[str, Any]]] = {
    BENEFITS: BENEFIT_SEED,
    PLANS: PLAN_SEED,
}


# -------------------------------------------------------------------- utils


def _iso(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value or utcnow().isoformat())


def _parse(value: Any):
    from datetime import datetime, timezone

    if value is None:
        return None
    if hasattr(value, "isoformat") and not isinstance(value, str):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


class MembershipRepository:
    # ------------------------------------------------------------- catalogue

    async def _benefit_documents(self) -> List[Dict[str, Any]]:
        documents = await database.find_many(BENEFITS, {})
        if not documents:
            documents = [dict(item) for item in BENEFIT_SEED]
            for doc in documents:
                try:
                    await database.insert_one(BENEFITS, dict(doc))
                except Exception:
                    pass
        documents.sort(key=lambda doc: int(doc.get("order") or 0))
        return documents

    async def _plan_documents(self) -> List[Dict[str, Any]]:
        documents = await database.find_many(PLANS, {"status": {"$ne": "Archived"}})
        if not documents:
            documents = [dict(item) for item in PLAN_SEED]
            for doc in documents:
                try:
                    await database.insert_one(PLANS, dict(doc))
                except Exception:
                    pass
        documents = [
            d for d in documents
            if str(d.get("_id") or d.get("id") or "").lower() != "free"
        ]
        documents.sort(key=lambda doc: int(doc.get("order") or 0))
        return documents


    def _benefit_model(self, document: Dict[str, Any]) -> MembershipBenefit:
        return MembershipBenefit(
            id=str(document.get("_id")),
            title=str(document.get("title") or "Member benefit"),
            description=str(document.get("description") or ""),
            icon=str(document.get("icon") or "sparkles"),
            plans=[str(plan) for plan in (document.get("plans") or [])],
        )

    def _plan_model(
        self, document: Dict[str, Any], benefits: List[Dict[str, Any]]
    ) -> MembershipPlan:
        plan_id = str(document.get("_id"))
        benefit_ids = [str(item) for item in (document.get("benefit_ids") or [])]
        matched = [
            self._benefit_model(benefit)
            for benefit in benefits
            if str(benefit.get("_id")) in benefit_ids or plan_id in (benefit.get("plans") or [])
        ]
        seen: set[str] = set()
        unique: List[MembershipBenefit] = []
        for benefit in matched:
            if benefit.id in seen:
                continue
            seen.add(benefit.id)
            unique.append(benefit)

        monthly = int(document.get("monthly_price") or 0)
        yearly = int(document.get("yearly_price") or 0)
        savings = max(monthly * 12 - yearly, 0)
        return MembershipPlan(
            id=plan_id,
            name=str(document.get("name") or plan_id.title()),
            tagline=str(document.get("tagline") or ""),
            monthlyPrice=monthly,
            yearlyPrice=yearly,
            yearlySavings=savings,
            savingsLabel=(f"Save ₹{savings} a year" if savings > 0 else "Always free"),
            validityDays=int(document.get("validity_days") or 30),
            yearlyValidityDays=int(document.get("yearly_validity_days") or 365),
            popular=bool(document.get("popular")),
            status=str(document.get("status") or "Active"),
            badge=str(document.get("badge") or ""),
            color=str(document.get("color") or "emerald"),
            order=int(document.get("order") or 0),
            discountPercent=int(document.get("discount_percent") or 0),
            freeDeliveryMinOrder=int(document.get("free_delivery_min_order") or 0),
            freePickup=bool(document.get("free_pickup", False)),
            priorityProcessing=bool(document.get("priority_processing", False)),
            supportTier=str(document.get("support_tier") or "Standard"),
            monthlyOrderLimit=int(document.get("monthly_order_limit") or 0),
            monthlyWeightLimitKg=int(document.get("monthly_weight_limit_kg") or 0),
            freeExpressCount=int(document.get("free_express_count") or 0),
            benefits=unique,
        )

    async def plans(self, user: Optional[User] = None) -> MembershipPlansResponse:
        benefits = await self._benefit_documents()
        plans = [self._plan_model(doc, benefits) for doc in await self._plan_documents()]
        current_plan_id = "free"
        if user is not None:
            try:
                membership = await self.current(user)
                current_plan_id = membership.planId
            except Exception:
                current_plan_id = "free"
        return MembershipPlansResponse(plans=plans, currentPlanId=current_plan_id)

    async def get_user_membership_perks(self, user_id: str) -> Dict[str, Any]:
        """Evaluate active membership perks for cart & checkout."""
        m = await database.collection(MEMBERSHIPS).find_one({"user_id": user_id})
        if not m or m.get("status") != "active":
            return {
                "active": False,
                "plan_id": "free",
                "plan_name": "Free",
                "discount_percent": 0,
                "free_pickup": False,
                "free_delivery_min": 0,
                "priority_processing": False,
                "remaining_orders": 0,
                "total_orders": 0,
            }
        expires_at = _parse(m.get("expires_at"))
        if expires_at and expires_at <= utcnow():
            return {
                "active": False,
                "plan_id": "free",
                "plan_name": "Free",
                "discount_percent": 0,
                "free_pickup": False,
                "free_delivery_min": 0,
                "priority_processing": False,
                "remaining_orders": 0,
                "total_orders": 0,
            }

        plan_id = str(m.get("plan_id") or "free")
        plan_doc = await database.collection(PLANS).find_one({"_id": plan_id})
        if not plan_doc:
            # Fallback to seed
            plan_doc = next((p for p in PLAN_SEED if p["_id"] == plan_id), {})

        order_limit = int(plan_doc.get("monthly_order_limit") or (15 if plan_id == "gold" else (5 if plan_id == "silver" else 30)))
        
        # Calculate used orders in this cycle
        started_iso = _iso(m.get("started_at")) or ""
        user_orders = await database.find_many("customer_orders", {"userId": user_id})
        used_count = sum(
            1 for o in user_orders
            if not started_iso or (o.get("createdAt") or o.get("created_at") or "") >= started_iso
        )
        remaining = max(0, order_limit - used_count) if order_limit > 0 else 999

        return {
            "active": True,
            "plan_id": plan_id,
            "plan_name": plan_doc.get("name") or plan_id.title(),
            "discount_percent": int(plan_doc.get("discount_percent") or (15 if plan_id == "gold" else (10 if plan_id == "silver" else 20))),
            "free_pickup": bool(plan_doc.get("free_pickup", True)),
            "free_delivery_min": int(plan_doc.get("free_delivery_min_order") or 0),
            "priority_processing": bool(plan_doc.get("priority_processing") or plan_id in ("gold", "premium")),
            "remaining_orders": remaining,
            "total_orders": order_limit,
        }

    async def benefits(self, user: Optional[User] = None) -> MembershipBenefitsResponse:
        documents = await self._benefit_documents()
        items = [self._benefit_model(doc) for doc in documents]
        plan_id = "free"
        if user is not None:
            try:
                membership = await self.current(user)
                plan_id = membership.planId
            except Exception:
                plan_id = "free"
        active = [item for item in items if plan_id in item.plans]
        return MembershipBenefitsResponse(
            items=items, activeBenefits=active, planId=plan_id
        )

    async def _plan_by_id(self, plan_id: str) -> Optional[MembershipPlan]:
        benefits = await self._benefit_documents()
        for document in await self._plan_documents():
            if str(document.get("_id")) == plan_id:
                return self._plan_model(document, benefits)
        return None

    # ------------------------------------------------------------ membership

    async def _document(self, user: User) -> Optional[Dict[str, Any]]:
        return await database.collection(MEMBERSHIPS).find_one({"user_id": user.id})

    async def _expire_if_needed(self, document: Dict[str, Any]) -> Dict[str, Any]:
        if str(document.get("status")) != "active":
            return document
        expires_at = _parse(document.get("expires_at"))
        if expires_at is None or expires_at > utcnow():
            return document

        now = utcnow().isoformat()
        await database.collection(MEMBERSHIPS).update_one(
            {"_id": str(document.get("_id"))},
            {"$set": {"status": "expired", "auto_renew": False, "expired_at": now}},
        )
        await self._record(
            user_id=str(document.get("user_id")),
            plan_id=str(document.get("plan_id") or FREE_PLAN_ID),
            plan_name=str(document.get("plan_name") or "Membership"),
            kind="expire",
            billing_cycle=str(document.get("billing_cycle") or "monthly"),
            amount=0,
            payment_status="free",
            expires_at=_iso(document.get("expires_at")),
        )
        document = {**document, "status": "expired", "auto_renew": False}
        return document

    def _remaining_days(self, document: Dict[str, Any]) -> int:
        expires_at = _parse(document.get("expires_at"))
        if expires_at is None:
            return 0
        delta = expires_at - utcnow()
        return max(int(delta.total_seconds() // 86400) + (1 if delta.total_seconds() > 0 else 0), 0)

    async def _project(self, document: Optional[Dict[str, Any]]) -> MembershipResponse:
        from app.models.membership import MembershipQuota, MembershipOrderLog

        if document is None or str(document.get("status") or "") != "active":
            return MembershipResponse(
                planId="silver",
                planName="No Active Plan",
                status="none",
                active=False,
                canRenew=False,
                canCancel=False,
                plan=None,
                benefits=[],
                quota=MembershipQuota(),
                membershipOrders=[],
            )

        status = str(document.get("status") or "none")
        active = status == "active"
        plan_id = str(document.get("plan_id") or "silver")
        effective_plan = await self._plan_by_id(plan_id)
        billing = document.get("billing_cycle")


        # Calculate Real-Time Quota & Order Usage from customer_orders
        quota = MembershipQuota(
            totalOrders=effective_plan.monthlyOrderLimit if effective_plan else 0,
            remainingOrders=effective_plan.monthlyOrderLimit if effective_plan else 0,
            totalWeightKg=effective_plan.monthlyWeightLimitKg if effective_plan else 0,
            remainingWeightKg=effective_plan.monthlyWeightLimitKg if effective_plan else 0,
            freeExpressTotal=effective_plan.freeExpressCount if effective_plan else 0,
            freeExpressRemaining=effective_plan.freeExpressCount if effective_plan else 0,
        )
        membership_orders_list: List[MembershipOrderLog] = []

        if active and document and document.get("user_id"):
            user_id = str(document["user_id"])
            started_iso = _iso(document.get("started_at")) or ""
            user_orders = await database.find_many("customer_orders", {"userId": user_id})
            
            used_orders = 0
            used_weight = 0
            used_express = 0
            total_savings = 0.0

            for ord_doc in user_orders:
                ord_created = ord_doc.get("createdAt") or ord_doc.get("created_at") or ""
                if started_iso and ord_created < started_iso:
                    continue

                used_orders += 1
                items = ord_doc.get("items") or []
                for it in items:
                    unit = str(it.get("unit") or "").lower()
                    if "kg" in unit:
                        used_weight += int(it.get("qty", 1))

                pickup_info = ord_doc.get("pickup") or {}
                if isinstance(pickup_info, dict) and pickup_info.get("express"):
                    used_express += 1

                fin = ord_doc.get("financialSnapshot") or {}
                m_disc = float(fin.get("membershipDiscount") or 0.0)
                del_saved = 39.0 if (effective_plan and effective_plan.freePickup) or ord_doc.get("membership", {}).get("freeDeliveryApplied") else 0.0
                order_saved = m_disc + del_saved
                total_savings += order_saved

                services_list = [str(it.get("name") or "Laundry Service") for it in items]
                membership_orders_list.append(
                    MembershipOrderLog(
                        orderId=str(ord_doc.get("_id") or ord_doc.get("id")),
                        orderCode=str(ord_doc.get("code") or "QP-ORD"),
                        placedAt=str(ord_created),
                        services=services_list[:3],
                        itemCount=len(items) or 1,
                        totalAmount=float((ord_doc.get("totals") or {}).get("grandTotal") or fin.get("grandTotal") or 0.0),
                        discountSaved=m_disc,
                        deliverySaved=del_saved,
                        totalSaved=order_saved,
                        status=str(ord_doc.get("status") or "placed"),
                    )
                )

            total_orders_cap = effective_plan.monthlyOrderLimit if effective_plan else 0
            total_weight_cap = effective_plan.monthlyWeightLimitKg if effective_plan else 0
            total_express_cap = effective_plan.freeExpressCount if effective_plan else 0

            quota = MembershipQuota(
                totalOrders=total_orders_cap,
                usedOrders=used_orders,
                remainingOrders=max(0, total_orders_cap - used_orders) if total_orders_cap > 0 else 0,
                totalWeightKg=total_weight_cap,
                usedWeightKg=used_weight,
                remainingWeightKg=max(0, total_weight_cap - used_weight) if total_weight_cap > 0 else 0,
                freeExpressTotal=total_express_cap,
                freeExpressUsed=used_express,
                freeExpressRemaining=max(0, total_express_cap - used_express) if total_express_cap > 0 else 0,
                totalSavings=round(total_savings, 2),
            )

        return MembershipResponse(
            planId=plan_id,  # type: ignore[arg-type]
            planName=(effective_plan.name if effective_plan else "Free"),
            status=status,  # type: ignore[arg-type]
            active=active,
            billingCycle=billing if billing in ("monthly", "quarterly", "yearly") else None,
            amountPaid=int(document.get("amount_paid") or 0),
            startedAt=_iso(document.get("started_at")) if document.get("started_at") else None,
            expiresAt=_iso(document.get("expires_at")) if document.get("expires_at") else None,
            cancelledAt=(
                _iso(document.get("cancelled_at")) if document.get("cancelled_at") else None
            ),
            autoRenew=bool(document.get("auto_renew")),
            remainingDays=self._remaining_days(document) if active else 0,
            canRenew=True,
            canCancel=active and plan_id != FREE_PLAN_ID,
            plan=effective_plan,
            benefits=effective_plan.benefits if effective_plan else [],
            quota=quota,
            membershipOrders=membership_orders_list,
        )


    async def current(self, user: Optional[User] = None) -> MembershipResponse:
        if user is None:
            return await self._project(None)
        document = await self._document(user)
        if document is not None:
            document = await self._expire_if_needed(document)
        return await self._project(document)

    # ------------------------------------------------------------- mutations

    async def _record(
        self,
        *,
        user_id: str,
        plan_id: str,
        plan_name: str,
        kind: str,
        billing_cycle: str,
        amount: int,
        payment_status: str,
        expires_at: Optional[str] = None,
        payment_reference: Optional[str] = None,
        renewal_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        document = {
            "_id": f"mtx-{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "plan_id": plan_id,
            "plan_name": plan_name,
            "type": kind,
            "billing_cycle": billing_cycle,
            "amount": amount,
            "payment_status": payment_status,
            "payment_reference": payment_reference,
            "subscribed_at": utcnow().isoformat(),
            "renewal_at": renewal_at,
            "expires_at": expires_at,
        }
        await database.collection(TRANSACTIONS).insert_one(document)
        return document

    def _transaction_model(self, document: Dict[str, Any]) -> MembershipTransaction:
        kind = str(document.get("type") or "subscribe")
        payment_status = str(document.get("payment_status") or "paid")
        billing = str(document.get("billing_cycle") or "monthly")
        return MembershipTransaction(
            id=str(document.get("_id")),
            planId=str(document.get("plan_id") or FREE_PLAN_ID),  # type: ignore[arg-type]
            planName=str(document.get("plan_name") or "Membership"),
            type=kind if kind in ("subscribe", "renew", "upgrade", "cancel", "expire") else "subscribe",  # type: ignore[arg-type]
            billingCycle=billing if billing in ("monthly", "quarterly", "yearly") else "monthly",  # type: ignore[arg-type]
            amount=int(document.get("amount") or 0),
            paymentStatus=(  # type: ignore[arg-type]
                payment_status
                if payment_status in ("paid", "pending", "failed", "free", "refunded")
                else "paid"
            ),
            paymentReference=document.get("payment_reference"),
            subscribedAt=_iso(document.get("subscribed_at")),
            renewalAt=_iso(document.get("renewal_at")) if document.get("renewal_at") else None,
            expiresAt=_iso(document.get("expires_at")) if document.get("expires_at") else None,
        )

    async def history(self, user: User) -> MembershipHistoryResponse:
        # Settle expiry first so the ledger the customer reads is up to date.
        await self.current(user)
        documents = await database.find_many(TRANSACTIONS, {"user_id": user.id})
        documents.sort(key=lambda doc: _iso(doc.get("subscribed_at")), reverse=True)
        items = [self._transaction_model(doc) for doc in documents]
        return MembershipHistoryResponse(items=items, total=len(items))

    async def subscribe(
        self,
        user: User,
        plan_id: str,
        billing_cycle: str,
        payment_reference: Optional[str] = None,
    ) -> SubscribeResponse:
        plan = await self._plan_by_id(plan_id)
        if plan is None:
            raise MembershipConflict("That membership plan doesn't exist.", status_code=404)

        existing = await self._document(user)
        if existing is not None:
            existing = await self._expire_if_needed(existing)

        was_active = existing is not None and str(existing.get("status")) == "active"
        previous_plan = str(existing.get("plan_id")) if existing else None
        previous_cycle = str(existing.get("billing_cycle") or "monthly") if existing else None

        # Business rule: no duplicate subscription to the same live plan.
        if was_active and previous_plan == plan_id and previous_cycle == billing_cycle:
            raise MembershipConflict(
                f"You already have an active {plan.name} membership.", status_code=409
            )

        yearly = billing_cycle == "yearly"
        quarterly = billing_cycle == "quarterly"
        if yearly:
            amount = plan.yearlyPrice
            days = plan.yearlyValidityDays
        elif quarterly:
            amount = plan.quarterlyPrice if plan.quarterlyPrice > 0 else (plan.monthlyPrice * 3)
            days = 90
        else:
            amount = plan.monthlyPrice
            days = plan.validityDays
        now = utcnow()
        expires_at = now + timedelta(days=days)

        kind = "subscribe"
        if was_active and previous_plan == plan_id:
            kind = "renew"
        elif was_active:
            kind = "upgrade"

        document = {
            "_id": existing.get("_id") if existing else f"mbs-{user.id}",
            "user_id": user.id,
            "plan_id": plan.id,
            "plan_name": plan.name,
            "status": "active",
            "billing_cycle": billing_cycle,
            "amount_paid": amount,
            "started_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "cancelled_at": None,
            "auto_renew": amount > 0,
            "payment_reference": payment_reference,
            "updated_at": now.isoformat(),
        }
        # Only one active membership per customer: a single upserted document.
        await database.collection(MEMBERSHIPS).update_one(
            {"user_id": user.id},
            {"$set": {k: v for k, v in document.items() if k != "_id"}, "$setOnInsert": {"_id": document["_id"]}},
            upsert=True,
        )

        transaction = await self._record(
            user_id=user.id,
            plan_id=plan.id,
            plan_name=plan.name,
            kind=kind,
            billing_cycle=billing_cycle,
            amount=amount,
            # Free plans need no payment; paid plans are marked paid until a
            # real gateway flips them from `pending` in a later sprint.
            payment_status="free" if amount == 0 else "paid",
            expires_at=expires_at.isoformat(),
            payment_reference=payment_reference,
            renewal_at=now.isoformat() if kind == "renew" else None,
        )

        membership = await self.current(user)
        message = {
            "subscribe": f"{plan.name} membership activated.",
            "renew": f"{plan.name} membership renewed.",
            "upgrade": f"You're now on {plan.name}.",
        }[kind]
        return SubscribeResponse(
            ok=True,
            message=message,
            membership=membership,
            transaction=self._transaction_model(transaction),
        )

    async def cancel(self, user: User, reason: Optional[str] = None) -> CancelResponse:
        existing = await self._document(user)
        if existing is not None:
            existing = await self._expire_if_needed(existing)
        if existing is None or str(existing.get("status")) != "active":
            raise MembershipConflict("You don't have an active membership to cancel.", 409)
        if str(existing.get("plan_id")) == FREE_PLAN_ID:
            raise MembershipConflict("The Free plan can't be cancelled.", 409)

        now = utcnow().isoformat()
        await database.collection(MEMBERSHIPS).update_one(
            {"user_id": user.id},
            {
                "$set": {
                    "status": "cancelled",
                    "auto_renew": False,
                    "cancelled_at": now,
                    "cancel_reason": reason,
                    "updated_at": now,
                }
            },
        )
        await self._record(
            user_id=user.id,
            plan_id=str(existing.get("plan_id") or FREE_PLAN_ID),
            plan_name=str(existing.get("plan_name") or "Membership"),
            kind="cancel",
            billing_cycle=str(existing.get("billing_cycle") or "monthly"),
            amount=0,
            payment_status="refunded" if int(existing.get("amount_paid") or 0) > 0 else "free",
            expires_at=_iso(existing.get("expires_at")),
        )
        membership = await self.current(user)
        return CancelResponse(
            ok=True, message="Membership cancelled. You're back on the Free plan.", membership=membership
        )


membership_repository = MembershipRepository()
