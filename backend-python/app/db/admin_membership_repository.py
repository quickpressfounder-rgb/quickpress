"""Admin Membership Repository — Complete management engine for plans, subscribers, and stats."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.db.admin_repositories import audit_repository
from app.models.membership import (
    AdminGrantPayload,
    AdminPlanPayload,
    MembershipBenefit,
    MembershipPlan,
    MembershipStatsResponse,
    MembershipSubscriberItem,
    MembershipSubscribersResponse,
    MembershipTransaction,
    MembershipHistoryResponse,
)
from app.models.user import User, utcnow

PLANS = "membership_plans"
MEMBERSHIPS = "memberships"
TRANSACTIONS = "membership_transactions"
BENEFITS = "membership_benefits"
USERS = "users"


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _parse_iso(val: Any) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None


def _slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text).strip("-")


def _admin_actor_name(user: User) -> str:
    name = user.display_name or user.email or user.phone or "Admin"
    return f"{name} ({user.id})"


class AdminMembershipRepository:
    async def get_stats(self) -> MembershipStatsResponse:
        """Aggregate total subscribers, MRR, tier distribution, member savings, and expiring soon."""
        now = utcnow()
        memberships = await database.find_many(MEMBERSHIPS)
        orders = await database.find_many("customer_orders")
        if not orders:
            orders = await database.find_many("orders")

        active_count = 0
        total_count = 0
        mrr = 0
        expiring_soon = 0
        tier_counts: Dict[str, int] = {}

        plans = await database.find_many(PLANS)
        plan_names = {str(p["_id"]): p.get("name", str(p["_id"]).title()) for p in plans}

        active_user_ids = set()
        for m in (memberships or []):
            plan_id = str(m.get("plan_id") or "")
            if not plan_id or plan_id == "free":
                continue

            total_count += 1
            status = str(m.get("status") or "none")
            expires_at = _parse_iso(m.get("expires_at"))

            is_active = status == "active" and (expires_at is None or expires_at > now)
            if is_active:
                active_count += 1
                uid = str(m.get("user_id") or "")
                if uid:
                    active_user_ids.add(uid)

                cycle = str(m.get("billing_cycle") or "monthly")
                amount = int(m.get("amount_paid") or 0)
                if cycle == "yearly":
                    mrr += round(amount / 12)
                elif cycle == "quarterly":
                    mrr += round(amount / 3)
                else:
                    mrr += amount

                pname = plan_names.get(plan_id, plan_id.title())
                tier_counts[pname] = tier_counts.get(pname, 0) + 1

                if expires_at and (expires_at - now).total_seconds() <= 7 * 86400:
                    expiring_soon += 1

        # Calculate member orders and total savings
        member_orders = 0
        total_savings = 0.0
        for o in (orders or []):
            ouid = str(o.get("userId") or o.get("user_id") or (o.get("customer") or {}).get("id") or "")
            if ouid in active_user_ids or o.get("isMember") or o.get("membershipDiscount", 0) > 0:
                member_orders += 1
                discount = float(o.get("membershipDiscount") or o.get("discount") or o.get("couponDiscount") or 0.0)
                total_savings += discount

        avg_ltv = (mrr * 12 / max(1, active_count)) if active_count > 0 else 0.0

        top_plan = "Gold"
        if tier_counts:
            top_plan = max(tier_counts.items(), key=lambda x: x[1])[0]

        return MembershipStatsResponse(
            totalSubscribers=total_count,
            activeMembers=active_count,
            monthlyRecurringRevenue=mrr,
            annualRunRate=mrr * 12,
            topPlanName=top_plan,
            expiringSoonCount=expiring_soon,
            totalSavingsGiven=round(total_savings, 2),
            memberOrdersCount=member_orders,
            averageLtv=round(avg_ltv, 2),
            tierBreakdown=tier_counts,
        )

    async def list_plans(self, include_inactive: bool = True) -> List[MembershipPlan]:
        """List all membership plans sorted by order."""
        from app.db.membership_repositories import PLAN_SEED, BENEFIT_SEED
        for b in BENEFIT_SEED:
            await database.update_one(BENEFITS, {"_id": b["_id"]}, {"$setOnInsert": dict(b)}, upsert=True)
        for p in PLAN_SEED:
            if str(p.get("_id")) != "free":
                await database.update_one(PLANS, {"_id": p["_id"]}, {"$setOnInsert": dict(p)}, upsert=True)

        query = {} if include_inactive else {"status": {"$in": ["Active", "active"]}}
        docs = await database.find_many(PLANS, query)
        if not docs:
            docs = [dict(item) for item in PLAN_SEED]
        
        # Filter out legacy free plan if present
        docs = [d for d in (docs or []) if str(d.get("_id")) != "free"]
        docs.sort(key=lambda d: (int(d.get("order") or 99), d.get("name") or ""))

        all_benefits = await database.find_many(BENEFITS)
        if not all_benefits:
            from app.db.membership_repositories import BENEFIT_SEED
            all_benefits = BENEFIT_SEED
        benefits_map = {str(b["_id"]): b for b in all_benefits}

        plans_list: List[MembershipPlan] = []
        for d in docs:
            plan_id = str(d["_id"])
            benefit_ids = d.get("benefit_ids") or []
            plan_benefits = []
            for bid in benefit_ids:
                if bid in benefits_map:
                    bdoc = benefits_map[bid]
                    plan_benefits.append(
                        MembershipBenefit(
                            id=str(bdoc["_id"]),
                            title=bdoc.get("title", ""),
                            description=bdoc.get("description", ""),
                            icon=bdoc.get("icon", "sparkles"),
                            plans=bdoc.get("plans", []),
                        )
                    )

            m_price = int(d.get("monthly_price") or 0)
            q_price = int(d.get("quarterly_price") or (m_price * 3 - 30 if m_price else 0))
            y_price = int(d.get("yearly_price") or (m_price * 10 if m_price else 0))
            y_savings = max(0, (m_price * 12) - y_price) if y_price and m_price else 0
            savings_lbl = f"Save ₹{y_savings}/yr" if y_savings > 0 else ""

            plans_list.append(
                MembershipPlan(
                    id=plan_id,
                    name=d.get("name") or plan_id.title(),
                    tagline=d.get("tagline") or "",
                    monthlyPrice=m_price,
                    quarterlyPrice=q_price,
                    yearlyPrice=y_price,
                    yearlySavings=y_savings,
                    savingsLabel=savings_lbl,
                    validityDays=int(d.get("validity_days") or 30),
                    yearlyValidityDays=int(d.get("yearly_validity_days") or 365),
                    popular=bool(d.get("popular", False)),
                    status=d.get("status", "Active"),
                    badge=d.get("badge", ""),
                    color=d.get("color", "emerald"),
                    order=int(d.get("order") or 0),
                    discountPercent=int(d.get("discount_percent") or 0),
                    cashbackPercent=int(d.get("cashback_percent") or 0),
                    freeDeliveryMinOrder=int(d.get("free_delivery_min_order") or 0),
                    freePickup=bool(d.get("free_pickup", True)),
                    priorityProcessing=bool(d.get("priority_processing", False)),
                    surgeWaiver=bool(d.get("surge_waiver", False)),
                    supportTier=d.get("support_tier", "Standard Support"),
                    monthlyOrderLimit=int(d.get("monthly_order_limit") or 0),
                    monthlyWeightLimitKg=int(d.get("monthly_weight_limit_kg") or 0),
                    freeExpressCount=int(d.get("free_express_count") or 0),
                    description=d.get("description", ""),
                    benefits=plan_benefits,
                )
            )
        return plans_list

    async def get_plan(self, plan_id: str) -> Optional[MembershipPlan]:
        plans = await self.list_plans(include_inactive=True)
        for p in plans:
            if p.id == plan_id or p.id.lower() == plan_id.lower():
                return p
        return None

    async def create_plan(self, payload: AdminPlanPayload, admin_user: User) -> MembershipPlan:
        """Create a new membership plan in MongoDB."""
        plan_id = _slugify(payload.id or payload.name)
        if not plan_id:
            plan_id = f"plan-{uuid.uuid4().hex[:6]}"

        existing = await database.find_one(PLANS, {"_id": plan_id})
        if existing:
            plan_id = f"{plan_id}-{uuid.uuid4().hex[:4]}"

        benefit_ids = []
        for b in payload.benefits or []:
            bid = b.id or _slugify(b.title)
            benefit_ids.append(bid)
            await database.collection(BENEFITS).update_one(
                {"_id": bid},
                {
                    "$set": {
                        "title": b.title,
                        "description": b.description,
                        "icon": b.icon or "sparkles",
                        "updated_at": _iso(utcnow()),
                    },
                    "$addToSet": {"plans": plan_id},
                },
                upsert=True,
            )

        now = utcnow()
        doc = {
            "_id": plan_id,
            "name": payload.name,
            "tagline": payload.tagline,
            "monthly_price": payload.monthlyPrice,
            "quarterly_price": payload.quarterlyPrice or round(payload.monthlyPrice * 2.8),
            "yearly_price": payload.yearlyPrice or round(payload.monthlyPrice * 10),
            "validity_days": payload.validityDays or 30,
            "yearly_validity_days": payload.yearlyValidityDays or 365,
            "benefit_ids": benefit_ids,
            "order": payload.order or 1,
            "popular": payload.popular,
            "status": payload.status or "Active",
            "badge": payload.badge or "",
            "color": payload.color or "emerald",
            "discount_percent": payload.discountPercent,
            "cashback_percent": payload.cashbackPercent,
            "free_delivery_min_order": payload.freeDeliveryMinOrder,
            "free_pickup": payload.freePickup,
            "priority_processing": payload.priorityProcessing,
            "surge_waiver": payload.surgeWaiver,
            "support_tier": payload.supportTier,
            "monthly_order_limit": payload.monthlyOrderLimit,
            "monthly_weight_limit_kg": payload.monthlyWeightLimitKg or 0,
            "free_express_count": payload.freeExpressCount,
            "description": payload.description,
            "created_at": _iso(now),
            "updated_at": _iso(now),
        }

        await database.collection(PLANS).insert_one(doc)

        await audit_repository.log(
            actor=_admin_actor_name(admin_user),
            action="membership.plan.create",
            target=plan_id,
            meta={"plan_id": plan_id, "name": payload.name, "monthly_price": payload.monthlyPrice},
        )

        created = await self.get_plan(plan_id)
        return created or MembershipPlan(id=plan_id, name=payload.name)

    async def update_plan(self, plan_id: str, payload: AdminPlanPayload, admin_user: User) -> Optional[MembershipPlan]:
        """Update an existing membership plan."""
        doc = await database.find_one(PLANS, {"_id": plan_id})
        if not doc:
            return None

        benefit_ids = []
        for b in payload.benefits or []:
            bid = b.id or _slugify(b.title)
            benefit_ids.append(bid)
            await database.collection(BENEFITS).update_one(
                {"_id": bid},
                {
                    "$set": {
                        "title": b.title,
                        "description": b.description,
                        "icon": b.icon or "sparkles",
                        "updated_at": _iso(utcnow()),
                    },
                    "$addToSet": {"plans": plan_id},
                },
                upsert=True,
            )

        update_fields = {
            "name": payload.name,
            "tagline": payload.tagline,
            "monthly_price": payload.monthlyPrice,
            "quarterly_price": payload.quarterlyPrice,
            "yearly_price": payload.yearlyPrice,
            "validity_days": payload.validityDays,
            "yearly_validity_days": payload.yearlyValidityDays,
            "benefit_ids": benefit_ids,
            "order": payload.order,
            "popular": payload.popular,
            "status": payload.status,
            "badge": payload.badge,
            "color": payload.color,
            "discount_percent": payload.discountPercent,
            "cashback_percent": payload.cashbackPercent,
            "free_delivery_min_order": payload.freeDeliveryMinOrder,
            "free_pickup": payload.freePickup,
            "priority_processing": payload.priorityProcessing,
            "surge_waiver": payload.surgeWaiver,
            "support_tier": payload.supportTier,
            "monthly_order_limit": payload.monthlyOrderLimit,
            "monthly_weight_limit_kg": payload.monthlyWeightLimitKg or 0,
            "free_express_count": payload.freeExpressCount,
            "description": payload.description,
            "updated_at": _iso(utcnow()),
        }

        await database.collection(PLANS).update_one({"_id": plan_id}, {"$set": update_fields})

        await audit_repository.log(
            actor=_admin_actor_name(admin_user),
            action="membership.plan.update",
            target=plan_id,
            meta={"plan_id": plan_id, "name": payload.name},
        )

        return await self.get_plan(plan_id)

    async def delete_plan(self, plan_id: str, admin_user: User) -> bool:
        """Archive or delete a membership plan."""
        doc = await database.find_one(PLANS, {"_id": plan_id})
        if not doc:
            return False

        # If subscribers exist, mark as Archived instead of hard deletion
        subs = await database.find_many(MEMBERSHIPS, {"plan_id": plan_id})
        if subs:
            await database.collection(PLANS).update_one({"_id": plan_id}, {"$set": {"status": "Archived", "updated_at": _iso(utcnow())}})
        else:
            await database.collection(PLANS).delete_one({"_id": plan_id})

        await audit_repository.log(
            actor=_admin_actor_name(admin_user),
            action="membership.plan.delete",
            target=plan_id,
            meta={"plan_id": plan_id},
        )
        return True

    async def list_subscribers(
        self,
        q: Optional[str] = None,
        status: Optional[str] = None,
        plan_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> MembershipSubscribersResponse:
        """Paginated list of all customer memberships with user profiles, order stats & savings."""
        now = utcnow()
        memberships = await database.find_many(MEMBERSHIPS)

        plans = await database.find_many(PLANS)
        plan_names = {str(p["_id"]): p.get("name", str(p["_id"]).title()) for p in plans}

        users = await database.find_many(USERS)
        users_map = {str(u["_id"]): u for u in users}

        orders = await database.find_many("customer_orders")
        if not orders:
            orders = await database.find_many("orders")

        user_order_stats: Dict[str, Dict[str, Any]] = {}
        for o in (orders or []):
            ouid = str(o.get("userId") or o.get("user_id") or (o.get("customer") or {}).get("id") or "")
            if ouid:
                st = user_order_stats.setdefault(ouid, {"orders": 0, "savings": 0.0, "city": o.get("city")})
                st["orders"] += 1
                discount = float(o.get("membershipDiscount") or o.get("discount") or o.get("couponDiscount") or 0.0)
                st["savings"] += discount

        items: List[MembershipSubscriberItem] = []
        for m in (memberships or []):
            pid = str(m.get("plan_id") or "")
            if not pid or pid == "free":
                continue

            m_status = str(m.get("status") or "none")
            exp_at = _parse_iso(m.get("expires_at"))

            # Real-time status calculation
            if m_status == "active" and exp_at and exp_at < now:
                m_status = "expired"

            if status and status.lower() != "all" and m_status != status.lower():
                continue
            if plan_id and plan_id.lower() != "all" and pid.lower() != plan_id.lower():
                continue

            uid = str(m.get("user_id") or "")
            uinfo = users_map.get(uid, {})
            uname = uinfo.get("name") or uinfo.get("display_name") or "QuickPress Member"
            uphone = uinfo.get("phone") or ""
            uemail = uinfo.get("email") or ""
            ucity = uinfo.get("city") or (user_order_stats.get(uid, {}).get("city")) or "Kasganj"

            if q:
                needle = q.strip().lower()
                if (
                    needle not in uid.lower()
                    and needle not in uname.lower()
                    and needle not in uphone.lower()
                    and needle not in uemail.lower()
                    and needle not in pid.lower()
                ):
                    continue

            remaining_days = max(0, (exp_at - now).days) if (exp_at and exp_at > now) else 0
            u_stats = user_order_stats.get(uid, {"orders": 0, "savings": 0.0})

            items.append(
                MembershipSubscriberItem(
                    userId=uid,
                    userName=uname,
                    userPhone=uphone,
                    userEmail=uemail,
                    planId=pid,
                    planName=plan_names.get(pid, pid.title()),
                    status=m_status,
                    billingCycle=str(m.get("billing_cycle") or "monthly"),
                    amountPaid=int(m.get("amount_paid") or 0),
                    startedAt=str(m.get("started_at") or ""),
                    expiresAt=str(m.get("expires_at") or ""),
                    autoRenew=bool(m.get("auto_renew", False)),
                    remainingDays=remaining_days,
                    totalOrders=u_stats["orders"],
                    totalSaved=round(u_stats["savings"], 2),
                    city=ucity,
                )
            )

        items.sort(key=lambda x: x.startedAt or "", reverse=True)
        total = len(items)
        return MembershipSubscribersResponse(items=items[offset : offset + limit], total=total)

    async def grant_membership(
        self,
        user_id: str,
        payload: AdminGrantPayload,
        admin_user: User,
    ) -> MembershipSubscriberItem:
        """Admin manually grants / extends a membership to any customer."""
        plan = await self.get_plan(payload.planId)
        plan_name = plan.name if plan else payload.planId.title()

        # Resolve real user id if admin entered phone or email
        user_doc = (
            await database.find_one(USERS, {"_id": user_id})
            or await database.find_one(USERS, {"id": user_id})
            or await database.find_one(USERS, {"phone": user_id})
            or await database.find_one(USERS, {"email": user_id})
        ) or {}
        real_user_id = str(user_doc.get("_id") or user_doc.get("id") or user_id)

        now = utcnow()
        validity = payload.validityDays
        if not validity:
            validity = plan.yearlyValidityDays if payload.billingCycle == "yearly" and plan else (plan.validityDays if plan else 30)

        expires_at = now + timedelta(days=validity)

        m_doc = {
            "_id": f"mbs-{real_user_id}",
            "user_id": real_user_id,
            "plan_id": payload.planId,
            "status": "active",
            "billing_cycle": payload.billingCycle,
            "amount_paid": 0,
            "started_at": _iso(now),
            "expires_at": _iso(expires_at),
            "cancelled_at": None,
            "auto_renew": False,
            "granted_by_admin": admin_user.id,
            "updated_at": _iso(now),
        }

        await database.collection(MEMBERSHIPS).update_one({"user_id": real_user_id}, {"$set": m_doc}, upsert=True)

        # Log transaction
        tx_id = f"tx-{uuid.uuid4().hex[:12]}"
        tx_doc = {
            "_id": tx_id,
            "user_id": real_user_id,
            "plan_id": payload.planId,
            "plan_name": plan_name,
            "type": "admin_grant",
            "billing_cycle": payload.billingCycle,
            "amount": 0,
            "payment_status": "free",
            "payment_reference": payload.reason or f"Granted by {_admin_actor_name(admin_user)}",
            "subscribed_at": _iso(now),
            "renewal_at": None,
            "expires_at": _iso(expires_at),
        }
        await database.collection(TRANSACTIONS).insert_one(tx_doc)

        await audit_repository.log(
            actor=_admin_actor_name(admin_user),
            action="membership.subscriber.grant",
            target=real_user_id,
            meta={"user_id": real_user_id, "plan_id": payload.planId, "days": validity},
        )

        final_user = await database.find_one(USERS, {"_id": real_user_id}) or user_doc
        return MembershipSubscriberItem(
            userId=real_user_id,
            userName=final_user.get("display_name") or final_user.get("name") or "Customer",
            userPhone=final_user.get("phone") or "",
            userEmail=final_user.get("email") or "",
            planId=payload.planId,
            planName=plan_name,
            status="active",
            billingCycle=payload.billingCycle,
            amountPaid=0,
            startedAt=_iso(now),
            expiresAt=_iso(expires_at),
            autoRenew=False,
            remainingDays=validity,
        )

    async def revoke_membership(
        self,
        user_id: str,
        reason: Optional[str],
        admin_user: User,
    ) -> bool:
        """Cancel/revoke a customer's active membership."""
        now = utcnow()
        existing = await database.find_one(MEMBERSHIPS, {"user_id": user_id})
        target_uid = user_id
        if not existing:
            user_doc = (
                await database.find_one(USERS, {"phone": user_id})
                or await database.find_one(USERS, {"email": user_id})
                or await database.find_one(USERS, {"id": user_id})
            )
            if user_doc:
                target_uid = str(user_doc.get("_id") or user_doc.get("id"))
                existing = await database.find_one(MEMBERSHIPS, {"user_id": target_uid})
        if not existing:
            return False

        await database.collection(MEMBERSHIPS).update_one(
            {"user_id": target_uid},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": _iso(now),
                    "auto_renew": False,
                    "revoked_by_admin": admin_user.id,
                    "updated_at": _iso(now),
                }
            },
        )

        # Log transaction
        tx_id = f"tx-{uuid.uuid4().hex[:12]}"
        tx_doc = {
            "_id": tx_id,
            "user_id": user_id,
            "plan_id": existing.get("plan_id") or "free",
            "plan_name": existing.get("plan_id", "Free").title(),
            "type": "admin_revoke",
            "billing_cycle": existing.get("billing_cycle") or "monthly",
            "amount": 0,
            "payment_status": "refunded",
            "payment_reference": reason or f"Revoked by {_admin_actor_name(admin_user)}",
            "subscribed_at": _iso(now),
            "renewal_at": None,
            "expires_at": existing.get("expires_at"),
        }
        await database.collection(TRANSACTIONS).insert_one(tx_doc)

        await audit_repository.log(
            actor=_admin_actor_name(admin_user),
            action="membership.subscriber.revoke",
            target=user_id,
            meta={"user_id": user_id, "reason": reason},
        )
        return True

    async def list_transactions(self, limit: int = 50, offset: int = 0) -> MembershipHistoryResponse:
        """Audit list of all membership subscribe/renew/cancel transactions."""
        docs = await database.find_many(TRANSACTIONS)
        docs.sort(key=lambda d: str(d.get("subscribed_at") or ""), reverse=True)

        users = await database.find_many(USERS)
        users_map = {str(u["_id"]): u for u in users}

        items: List[MembershipTransaction] = []
        for d in docs:
            uid = str(d.get("user_id") or "")
            udoc = users_map.get(uid, {})
            uname = udoc.get("name") or udoc.get("display_name") or udoc.get("phone") or uid
            items.append(
                MembershipTransaction(
                    id=str(d["_id"]),
                    userId=uid or None,
                    userName=uname if uid else None,
                    planId=str(d.get("plan_id") or "free"),
                    planName=str(d.get("plan_name") or "Free"),
                    type=d.get("type", "subscribe"),
                    billingCycle=d.get("billing_cycle", "monthly"),
                    amount=int(d.get("amount") or 0),
                    paymentStatus=d.get("payment_status", "paid"),
                    paymentReference=d.get("payment_reference"),
                    subscribedAt=str(d.get("subscribed_at") or ""),
                    renewalAt=d.get("renewal_at"),
                    expiresAt=d.get("expires_at"),
                )
            )
        return MembershipHistoryResponse(items=items[offset : offset + limit], total=len(items))


admin_membership_repository = AdminMembershipRepository()
