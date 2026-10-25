from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

from app.db.client import database
from app.models.referral import (
    DEFAULT_REFEREE_DISCOUNT_PERCENT,
    DEFAULT_REFEREE_MAX_DISCOUNT,
    DEFAULT_REFEREE_MIN_ORDER,
    DEFAULT_REFERRER_REWARD,
    AdminMultiRoleReferralOverview,
    AdminMultiRoleReferralStats,
    AdminReferralItem,
    AdminReferralListResponse,
    AdminReferralStats,
    ApplyReferralResponse,
    ClaimReferralRewardPayload,
    ClaimReferralRewardResponse,
    InviteReferralResponse,
    ReferralHistoryItem,
    ReferralHistoryResponse,
    ReferralLedgerItem,
    ReferralMilestoneStatus,
    ReferralProgramSettings,
    ReferralResponse,
    ReferralRewardItem,
    ReferralRewardsResponse,
    ReferralRuleItem,
    ReferralStatsResponse,
    RoleType,
    UpdateReferralRulePayload,
    UpdateReferralSettingsPayload,
    UserReferralHubResponse,
    WelcomeReferralOffer,
)
from app.models.user import User, utcnow

REFERRALS = "referrals"
TRANSACTIONS = "referral_transactions"
REWARDS = "referral_rewards"
MULTI_ROLE_RULES = "multi_role_referral_rules"
MULTI_ROLE_LEDGER = "multi_role_referral_ledger"
ORDERS = "customer_orders"
PROGRAM_SETTINGS = "referral_program_settings"

SHARE_BASE = "https://withquickpress.com/invite"
COMPLETED_ORDER_STATUSES = ("delivered", "completed")
GLOBAL_CONFIG_ID = "global_referral_config"


class ReferralConflict(Exception):
    """Raised for business-rule violations (self / duplicate / invalid code)."""

    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _iso(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value or utcnow().isoformat())


def _slug(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z]", "", str(name or "")).upper()
    return cleaned[:5] or "FRIEND"


def _link_for(code: str) -> str:
    return f"{SHARE_BASE}/{code}"


def _qr_for(code: str) -> str:
    """Deterministic QR image for the referral link (no extra dependency)."""
    from urllib.parse import quote

    return (
        "https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data="
        f"{quote(_link_for(code), safe='')}"
    )


def _share_message(code: str, reward: float = 150.0, discount: float = 50.0) -> str:
    return (
        f"I use QuickPress for premium laundry & dry cleaning! Use my code {code} "
        f"to get {int(discount)}% OFF on your 1st order. {_link_for(code)}"
    )


class ReferralRepository:
    # ------------------------------------------------------------------ Settings
    async def get_settings(self) -> ReferralProgramSettings:
        """Fetch global referral program configuration from MongoDB."""
        doc = await database.collection(PROGRAM_SETTINGS).find_one({"_id": GLOBAL_CONFIG_ID})
        if doc is None:
            default_settings = ReferralProgramSettings()
            doc = default_settings.model_dump()
            doc["_id"] = GLOBAL_CONFIG_ID
            doc["updatedAt"] = utcnow().isoformat()
            await database.collection(PROGRAM_SETTINGS).insert_one(doc)
            return default_settings
        
        return ReferralProgramSettings(
            id=GLOBAL_CONFIG_ID,
            enabled=bool(doc.get("enabled", True)),
            refereeDiscountPercent=float(doc.get("refereeDiscountPercent", DEFAULT_REFEREE_DISCOUNT_PERCENT)),
            refereeMaxDiscount=float(doc.get("refereeMaxDiscount", DEFAULT_REFEREE_MAX_DISCOUNT)),
            refereeMinOrderValue=float(doc.get("refereeMinOrderValue", DEFAULT_REFEREE_MIN_ORDER)),
            referrerRewardAmount=float(doc.get("referrerRewardAmount", DEFAULT_REFERRER_REWARD)),
            referrerRewardType=str(doc.get("referrerRewardType", "wallet")),
            headline=str(doc.get("headline", "Invite Friends & Earn ₹150")),
            subheadline=str(doc.get("subheadline", "Friends get 50% OFF on their 1st order. You get ₹150 wallet cash.")),
            terms=list(doc.get("terms") or [
                "50% discount automatically applies to your first order (up to max ₹150).",
                "Minimum order value of ₹199 required.",
                "Referrer receives ₹150 in QuickPress wallet immediately after referee's first order is delivered.",
                "Valid for new customer accounts only.",
            ]),
            updatedAt=doc.get("updatedAt"),
            updatedBy=doc.get("updatedBy"),
        )

    async def update_settings(
        self, payload: UpdateReferralSettingsPayload, admin_user: User
    ) -> ReferralProgramSettings:
        """Admin mutation to update referral program rules, discounts, and rewards."""
        current = await self.get_settings()
        updates = payload.model_dump(exclude_unset=True)
        updates["updatedAt"] = utcnow().isoformat()
        updates["updatedBy"] = admin_user.id or admin_user.email or "admin"

        await database.collection(PROGRAM_SETTINGS).update_one(
            {"_id": GLOBAL_CONFIG_ID},
            {"$set": updates},
            upsert=True,
        )
        return await self.get_settings()

    # ------------------------------------------------------------------ code
    async def _code_taken(self, code: str) -> bool:
        found = await database.collection(REFERRALS).find_one({"code": code})
        return found is not None

    async def _generate_code(self, user: User) -> str:
        base = f"QP{_slug(user.display_name or 'FRIEND')}"
        for _ in range(25):
            candidate = f"{base}{uuid.uuid4().hex[:3].upper()}"
            if not await self._code_taken(candidate):
                return candidate
        return f"QP{uuid.uuid4().hex[:8].upper()}"

    async def ensure_profile(self, user: User) -> Dict[str, Any]:
        """Return (creating if needed) the caller's referral document."""
        collection = database.collection(REFERRALS)
        document = await collection.find_one({"user_id": user.id})
        if document is not None:
            return document
        document = {
            "_id": f"rfl-{user.id}",
            "user_id": user.id,
            "code": await self._generate_code(user),
            "active": True,
            "invites": 0,
            "applied_code": None,
            "referred_by": None,
            "created_at": utcnow().isoformat(),
        }
        await collection.insert_one(document)
        return document

    async def by_code(self, code: str) -> Optional[Dict[str, Any]]:
        normalised = str(code or "").strip().upper()
        if not normalised:
            return None
        return await database.collection(REFERRALS).find_one({"code": normalised})

    # ------------------------------------------------------- Welcome Offer Check
    async def get_welcome_offer_for_user(self, user_id: str) -> WelcomeReferralOffer:
        """Check if customer is eligible for First-Order 50% referral welcome discount."""
        settings = await self.get_settings()
        if not settings.enabled:
            return WelcomeReferralOffer(isEligible=False)

        profile = await database.collection(REFERRALS).find_one({"user_id": user_id})
        if not profile or not profile.get("applied_code"):
            return WelcomeReferralOffer(isEligible=False)

        # Check if user has already completed any order
        if await self._has_completed_order(user_id):
            return WelcomeReferralOffer(isEligible=False)

        applied_code = str(profile.get("applied_code"))
        return WelcomeReferralOffer(
            isEligible=True,
            appliedCode=applied_code,
            discountPercent=settings.refereeDiscountPercent,
            maxDiscount=settings.refereeMaxDiscount,
            minOrderValue=settings.refereeMinOrderValue,
            headline=f"{int(settings.refereeDiscountPercent)}% OFF Welcome Offer",
            description=f"Get {int(settings.refereeDiscountPercent)}% OFF up to ₹{int(settings.refereeMaxDiscount)} on your 1st order using referral code {applied_code}",
        )

    # ------------------------------------------------------- reward settling
    async def _has_completed_order(self, user_id: str) -> bool:
        orders = await database.find_many(ORDERS, {"userId": user_id})
        return any(
            str(order.get("status") or "").lower() in COMPLETED_ORDER_STATUSES for order in orders
        )

    async def settle(self, user_id: str) -> None:
        """Credit pending rewards whose referee finished their first order."""
        pending = await database.find_many(
            TRANSACTIONS, {"referrer_id": user_id, "status": "pending"}
        )
        pending += await database.find_many(
            TRANSACTIONS, {"referee_id": user_id, "status": "pending"}
        )
        seen: set[str] = set()
        for transaction in pending:
            transaction_id = str(transaction.get("_id"))
            if transaction_id in seen:
                continue
            seen.add(transaction_id)
            referee_id = str(transaction.get("referee_id") or "")
            if not referee_id or not await self._has_completed_order(referee_id):
                continue
            
            # Auto-disburse reward to referrer
            referrer_id = str(transaction.get("referrer_id") or "")
            reward_amount = float(transaction.get("reward_amount") or DEFAULT_REFERRER_REWARD)
            now = utcnow().isoformat()

            await database.collection(TRANSACTIONS).update_one(
                {"_id": transaction_id},
                {"$set": {"status": "completed", "completed_at": now}},
            )

            # Credit wallet of referrer directly
            if referrer_id:
                try:
                    from app.db.wallet_repositories import wallet_repository
                    await wallet_repository.credit(
                        account_id=referrer_id,
                        amount=reward_amount,
                        kind="referral-bonus",
                        reference=f"Referral reward for {transaction.get('referee_name', 'friend')}",
                    )
                except Exception:
                    pass

            for reward in await database.find_many(REWARDS, {"transaction_id": transaction_id}):
                if str(reward.get("status")) == "completed":
                    continue
                await database.collection(REWARDS).update_one(
                    {"_id": str(reward.get("_id"))},
                    {"$set": {"status": "completed", "credited_at": now}},
                )

    async def on_order_delivered(self, order: Dict[str, Any]) -> None:
        """Hook called when order transition reaches DELIVERED / COMPLETED."""
        referee_id = str(order.get("userId") or "")
        if not referee_id:
            return

        # Find pending referral transaction for this referee
        tx = await database.collection(TRANSACTIONS).find_one({
            "referee_id": referee_id,
            "status": "pending",
        })
        if not tx:
            return

        now = utcnow().isoformat()
        transaction_id = str(tx.get("_id"))
        referrer_id = str(tx.get("referrer_id") or "")
        reward_amount = float(tx.get("reward_amount") or DEFAULT_REFERRER_REWARD)
        referee_name = str(tx.get("referee_name") or "Your friend")
        order_id = str(order.get("_id") or order.get("id") or "")

        # 1. Mark transaction completed
        await database.collection(TRANSACTIONS).update_one(
            {"_id": transaction_id},
            {"$set": {
                "status": "completed",
                "completed_at": now,
                "first_order_id": order_id,
            }},
        )

        # 2. Credit referrer's wallet with dual-entry ledger
        if referrer_id:
            try:
                from app.db.wallet_repositories import wallet_repository
                await wallet_repository.credit(
                    account_id=referrer_id,
                    amount=reward_amount,
                    kind="referral-bonus",
                    reference=f"Referral bonus: {referee_name} first order delivered",
                )
            except Exception:
                pass

            # 3. Create In-App Notification for Referrer
            notif_id = f"notif-ref-{uuid.uuid4().hex[:10]}"
            await database.collection("notifications").insert_one({
                "_id": notif_id,
                "id": notif_id,
                "user_id": referrer_id,
                "userId": referrer_id,
                "title": "🎉 Referral Reward Credited!",
                "description": f"Your friend {referee_name} completed their first order! ₹{int(reward_amount)} has been added to your QuickPress wallet.",
                "type": "wallet",
                "read": False,
                "created_at": now,
                "createdAt": now,
            })

            # 4. Socket.IO Realtime Broadcast to referrer
            try:
                from app.services.socket_service import emit_to_user
                await emit_to_user(referrer_id, "wallet.updated", {
                    "reason": "referral-bonus",
                    "amount": reward_amount,
                    "refereeName": referee_name,
                })
                await emit_to_user(referrer_id, "notification.created", {
                    "title": "🎉 Referral Reward Credited!",
                    "message": f"₹{int(reward_amount)} added for referring {referee_name}",
                })
            except Exception:
                pass

        # 5. Mark rewards as completed
        for reward in await database.find_many(REWARDS, {"transaction_id": transaction_id}):
            await database.collection(REWARDS).update_one(
                {"_id": str(reward.get("_id"))},
                {"$set": {"status": "completed", "credited_at": now}},
            )

    # --------------------------------------------------------- projections
    async def _transactions(self, user_id: str) -> List[Dict[str, Any]]:
        documents = await database.find_many(TRANSACTIONS, {"referrer_id": user_id})
        documents.sort(key=lambda doc: _iso(doc.get("created_at")), reverse=True)
        return documents

    async def _rewards(self, user_id: str) -> List[Dict[str, Any]]:
        documents = await database.find_many(REWARDS, {"user_id": user_id})
        documents.sort(key=lambda doc: _iso(doc.get("created_at")), reverse=True)
        return documents

    def _history_item(self, document: Dict[str, Any], default_reward: float = DEFAULT_REFERRER_REWARD) -> ReferralHistoryItem:
        status = str(document.get("status") or "pending")
        return ReferralHistoryItem(
            id=str(document.get("_id")),
            friendName=str(document.get("referee_name") or "QuickPress friend"),
            joinedAt=_iso(document.get("created_at")),
            status=status if status in ("pending", "completed", "expired") else "pending",
            rewardEarned=(
                int(document.get("reward_amount") or default_reward)
                if status == "completed"
                else 0
            ),
            completedAt=(
                _iso(document.get("completed_at")) if document.get("completed_at") else None
            ),
        )

    def _reward_item(self, document: Dict[str, Any]) -> ReferralRewardItem:
        status = "completed" if str(document.get("status")) == "completed" else "pending"
        return ReferralRewardItem(
            id=str(document.get("_id")),
            title=str(document.get("title") or "Referral reward"),
            description=str(document.get("description") or ""),
            amount=int(document.get("amount") or 0),
            status=status,
            createdAt=_iso(document.get("created_at")),
            creditedAt=_iso(document.get("credited_at")) if document.get("credited_at") else None,
            referralId=document.get("transaction_id"),
            friendName=document.get("friend_name"),
        )

    async def _stats(
        self, profile: Dict[str, Any], transactions: List[Dict[str, Any]], rewards: List[Dict[str, Any]], settings: ReferralProgramSettings
    ) -> ReferralStatsResponse:
        successful = sum(1 for item in transactions if str(item.get("status")) == "completed")
        pending_referrals = sum(1 for item in transactions if str(item.get("status")) == "pending")
        earned = sum(
            int(item.get("amount") or 0) for item in rewards if str(item.get("status")) == "completed"
        )
        pending_amount = sum(
            int(item.get("amount") or 0) for item in rewards if str(item.get("status")) != "completed"
        )
        return ReferralStatsResponse(
            totalInvites=max(int(profile.get("invites") or 0), len(transactions)),
            successfulReferrals=successful,
            pendingReferrals=pending_referrals,
            totalRewardsEarned=earned,
            pendingRewards=pending_amount,
            walletRewards=earned,
            referrerReward=int(settings.referrerRewardAmount),
            refereeReward=int(settings.refereeMaxDiscount),
            refereeDiscountPercent=settings.refereeDiscountPercent,
            refereeMaxDiscount=settings.refereeMaxDiscount,
            refereeMinOrderValue=settings.refereeMinOrderValue,
        )

    # --------------------------------------------------------------- reads
    async def dashboard(self, user: User) -> ReferralResponse:
        settings = await self.get_settings()
        profile = await self.ensure_profile(user)
        await self.settle(user.id)
        transactions = await self._transactions(user.id)
        rewards = await self._rewards(user.id)
        code = str(profile.get("code"))
        return ReferralResponse(
            code=code,
            link=_link_for(code),
            qrCodeUrl=_qr_for(code),
            active=bool(profile.get("active", True) and settings.enabled),
            appliedCode=profile.get("applied_code"),
            canApply=profile.get("applied_code") is None,
            shareMessage=_share_message(code, settings.referrerRewardAmount, settings.refereeDiscountPercent),
            program=settings,
            stats=await self._stats(profile, transactions, rewards, settings),
            history=[self._history_item(item, settings.referrerRewardAmount) for item in transactions],
            rewards=[self._reward_item(item) for item in rewards],
        )

    async def history(self, user: User) -> ReferralHistoryResponse:
        settings = await self.get_settings()
        await self.ensure_profile(user)
        await self.settle(user.id)
        transactions = await self._transactions(user.id)
        items = [self._history_item(item, settings.referrerRewardAmount) for item in transactions]
        return ReferralHistoryResponse(items=items, total=len(items))

    async def rewards(self, user: User) -> ReferralRewardsResponse:
        await self.ensure_profile(user)
        await self.settle(user.id)
        documents = await self._rewards(user.id)
        items = [self._reward_item(item) for item in documents]
        completed = sum(item.amount for item in items if item.status == "completed")
        pending = sum(item.amount for item in items if item.status == "pending")
        return ReferralRewardsResponse(
            items=items,
            pendingRewards=pending,
            completedRewards=completed,
            walletRewards=completed,
        )

    async def stats(self, user: User) -> ReferralStatsResponse:
        settings = await self.get_settings()
        profile = await self.ensure_profile(user)
        await self.settle(user.id)
        return await self._stats(
            profile, await self._transactions(user.id), await self._rewards(user.id), settings
        )

    # ------------------------------------------------------------ mutations
    async def invite(
        self, user: User, channel: str, contact: Optional[str]
    ) -> InviteReferralResponse:
        settings = await self.get_settings()
        profile = await self.ensure_profile(user)
        invites = int(profile.get("invites") or 0) + 1
        await database.collection(REFERRALS).update_one(
            {"user_id": user.id},
            {"$set": {"invites": invites, "last_invited_at": utcnow().isoformat()}},
        )
        code = str(profile.get("code"))
        await database.collection(TRANSACTIONS).insert_one(
            {
                "_id": f"inv-{uuid.uuid4().hex[:12]}",
                "kind": "invite",
                "referrer_id": user.id,
                "referee_id": None,
                "channel": channel,
                "contact": contact,
                "code": code,
                "created_at": utcnow().isoformat(),
            }
        )
        return InviteReferralResponse(
            ok=True,
            channel=channel,  # type: ignore[arg-type]
            totalInvites=invites,
            link=_link_for(code),
            shareMessage=_share_message(code, settings.referrerRewardAmount, settings.refereeDiscountPercent),
        )

    async def apply(self, user: User, raw_code: str) -> ApplyReferralResponse:
        settings = await self.get_settings()
        if not settings.enabled:
            raise ReferralConflict("The referral program is currently paused.")

        profile = await self.ensure_profile(user)
        code = str(raw_code or "").strip().upper()

        if profile.get("applied_code"):
            raise ReferralConflict("You have already applied a referral code.")

        owner = await self.by_code(code)
        if owner is None:
            raise ReferralConflict("That referral code doesn't exist.", 404)
        if not bool(owner.get("active", True)):
            raise ReferralConflict("That referral code is no longer active.")
        if str(owner.get("user_id")) == user.id or code == str(profile.get("code")):
            raise ReferralConflict("You can't use your own referral code.")

        existing = await database.collection(TRANSACTIONS).find_one({"referee_id": user.id})
        if existing is not None:
            raise ReferralConflict("This account has already used a referral code.")

        referrer_id = str(owner.get("user_id"))
        now = utcnow().isoformat()
        transaction_id = f"rtx-{uuid.uuid4().hex[:12]}"
        friend_name = user.display_name or "QuickPress friend"

        await database.collection(TRANSACTIONS).insert_one(
            {
                "_id": transaction_id,
                "kind": "referral",
                "referrer_id": referrer_id,
                "referee_id": user.id,
                "referee_name": friend_name,
                "code": code,
                "status": "pending",
                "created_at": now,
                "completed_at": None,
                "reward_amount": settings.referrerRewardAmount,
                "discount_percent": settings.refereeDiscountPercent,
                "max_discount": settings.refereeMaxDiscount,
                "min_order_value": settings.refereeMinOrderValue,
            }
        )
        await database.collection(REFERRALS).update_one(
            {"user_id": user.id},
            {"$set": {"applied_code": code, "referred_by": referrer_id, "applied_at": now}},
        )
        await database.collection(REWARDS).insert_one(
            {
                "_id": f"rwd-{uuid.uuid4().hex[:12]}",
                "user_id": referrer_id,
                "transaction_id": transaction_id,
                "role": "referrer",
                "title": "Referral bonus",
                "description": f"{friend_name} joined with your code",
                "friend_name": friend_name,
                "amount": int(settings.referrerRewardAmount),
                "status": "pending",
                "created_at": now,
                "credited_at": None,
            }
        )

        # Referee Welcome In-App Notification
        notif_id = f"notif-wel-{uuid.uuid4().hex[:10]}"
        await database.collection("notifications").insert_one({
            "_id": notif_id,
            "id": notif_id,
            "user_id": user.id,
            "userId": user.id,
            "title": f"🎉 {int(settings.refereeDiscountPercent)}% Welcome Discount Unlocked!",
            "description": f"Referral code {code} applied. Get up to {int(settings.refereeDiscountPercent)}% OFF (max ₹{int(settings.refereeMaxDiscount)}) on your first order.",
            "type": "offer",
            "read": False,
            "created_at": now,
            "createdAt": now,
        })

        await self.settle(user.id)
        return ApplyReferralResponse(
            ok=True,
            message=(
                f"Referral code {code} applied! You've unlocked {int(settings.refereeDiscountPercent)}% OFF "
                f"(up to ₹{int(settings.refereeMaxDiscount)}) on your first order."
            ),
            code=code,
            rewardAmount=int(settings.referrerRewardAmount),
            discountPercent=settings.refereeDiscountPercent,
            maxDiscount=settings.refereeMaxDiscount,
            minOrderValue=settings.refereeMinOrderValue,
            appliedCode=code,
        )

    async def apply_login_referral(
        self, user: User, raw_code: str, device_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Applies referral code upon user login / signup:
        - Referrer gets +50 Loyalty Points credited immediately.
        - Referee (new user) gets +25 Loyalty Points credited immediately.
        - In-app notification sent to both users.
        - Records in transactions and loyalty_transactions.
        - Enforces device fingerprint uniqueness (Anti-Fraud).
        """
        if not raw_code:
            return None
        code = str(raw_code).strip().upper()
        if not code:
            return None

        owner = await self.by_code(code)
        if not owner:
            return None

        referrer_id = str(owner.get("user_id"))
        if referrer_id == user.id:
            return None  # Cannot refer self

        # Check if referee has already applied any referral
        existing_tx = await database.collection(TRANSACTIONS).find_one({"referee_id": user.id})
        if existing_tx:
            return None  # Already applied

        # Device Fingerprint Anti-Fraud Check: Prevent multiple referrals on the same physical phone
        if device_id:
            from app.core.anti_fraud import is_device_promo_claimed
            if await is_device_promo_claimed(device_id, promo_type="referral"):
                logger.warning(
                    "Device %s attempted multiple referral claims across accounts (User %s). Blocked.",
                    device_id,
                    user.id,
                )
                raise ValueError(f"Referral reward already claimed on this device ({device_id[:8]}...). Multiple accounts per device are restricted.")

        now = utcnow().isoformat()
        transaction_id = f"rtx-{uuid.uuid4().hex[:12]}"
        referee_name = user.display_name or user.phone or "New Customer"
        referrer_name = owner.get("name") or "Friend"

        # 1. Record Referral Transaction
        await database.collection(TRANSACTIONS).insert_one({
            "_id": transaction_id,
            "kind": "referral",
            "referrer_id": referrer_id,
            "referee_id": user.id,
            "referee_name": referee_name,
            "referrer_name": referrer_name,
            "code": code,
            "status": "completed",
            "created_at": now,
            "completed_at": now,
            "reward_amount": 50,
            "referrer_points": 50,
            "referee_points": 25,
        })

        # 2. Update user profile referral mapping
        await database.collection(REFERRALS).update_one(
            {"user_id": user.id},
            {"$set": {"applied_code": code, "referred_by": referrer_id, "applied_at": now}},
            upsert=True,
        )

        # 3. Credit +50 Loyalty Points to Referrer
        await database.collection("users").update_one(
            {"_id": referrer_id},
            {
                "$inc": {"loyalty_points": 50, "loyaltyPoints": 50},
                "$set": {"updated_at": now},
            },
        )
        await database.collection("loyalty_transactions").insert_one({
            "_id": f"ltx-{uuid.uuid4().hex[:12]}",
            "userId": referrer_id,
            "user_id": referrer_id,
            "points": 50,
            "type": "credit",
            "reason": f"Referral Bonus: {referee_name} joined using your code {code}",
            "createdAt": now,
            "created_at": now,
        })
        notif_referrer_id = f"notif-ref-{uuid.uuid4().hex[:10]}"
        await database.collection("notifications").insert_one({
            "_id": notif_referrer_id,
            "id": notif_referrer_id,
            "user_id": referrer_id,
            "userId": referrer_id,
            "title": "🎉 +50 Loyalty Points Earned!",
            "description": f"{referee_name} joined using your referral code ({code})! 50 Loyalty Points have been added to your account.",
            "type": "rewards",
            "read": False,
            "created_at": now,
            "createdAt": now,
        })

        # 4. Credit +25 Loyalty Points to Referee (New User)
        await database.collection("users").update_one(
            {"_id": user.id},
            {
                "$inc": {"loyalty_points": 25, "loyaltyPoints": 25},
                "$set": {"updated_at": now},
            },
        )
        await database.collection("loyalty_transactions").insert_one({
            "_id": f"ltx-{uuid.uuid4().hex[:12]}",
            "userId": user.id,
            "user_id": user.id,
            "points": 25,
            "type": "credit",
            "reason": f"Welcome Bonus: Joined with friend referral code {code} (+25 pts)",
            "createdAt": now,
            "created_at": now,
        })
        notif_referee_id = f"notif-wel-{uuid.uuid4().hex[:10]}"
        await database.collection("notifications").insert_one({
            "_id": notif_referee_id,
            "id": notif_referee_id,
            "user_id": user.id,
            "userId": user.id,
            "title": "🎁 +25 Loyalty Points Welcome Bonus!",
            "description": f"Welcome to QuickPress! You've received 25 Loyalty Points for joining with referral code {code}.",
            "type": "rewards",
            "read": False,
            "created_at": now,
            "createdAt": now,
        })

        try:
            from app.services.socket_service import emit_to_user
            await emit_to_user(referrer_id, "loyalty.updated", {"points": 50, "reason": "referral-bonus"})
            await emit_to_user(user.id, "loyalty.updated", {"points": 25, "reason": "welcome-bonus"})
        except Exception:
            pass

        if device_id:
            try:
                from app.core.anti_fraud import record_device_promo_claim
                await record_device_promo_claim(device_id, user.id, promo_type="referral", reference_code=code)
            except Exception as err:
                logger.warning(f"Failed to record device promo claim: {err}")

        return {"ok": True, "referrer_id": referrer_id, "code": code}

    # ------------------------------------------------------------ Admin Reporting
    async def admin_stats(self) -> AdminReferralStats:
        """Admin metrics for the referral engine."""
        settings = await self.get_settings()
        referral_docs = await database.find_many(REFERRALS)
        tx_docs = await database.find_many(TRANSACTIONS, {"kind": "referral"})

        total_invites = sum(int(doc.get("invites") or 0) for doc in referral_docs)
        registered_referrals = len(tx_docs)
        converted = sum(1 for tx in tx_docs if str(tx.get("status")) == "completed")
        rewards_paid = sum(
            float(tx.get("reward_amount") or DEFAULT_REFERRER_REWARD)
            for tx in tx_docs
            if str(tx.get("status")) == "completed"
        )
        total_discount_given = converted * (settings.refereeMaxDiscount * 0.75)  # estimated/actual discount

        return AdminReferralStats(
            totalInvites=total_invites,
            totalRegisteredReferrals=registered_referrals,
            convertedFirstOrders=converted,
            totalDiscountGiven=total_discount_given,
            totalRewardsPaid=rewards_paid,
            activeSettings=settings,
        )

    async def admin_list(self) -> AdminReferralListResponse:
        """List of all referral records for the admin panel table."""
        settings = await self.get_settings()
        stats = await self.admin_stats()
        tx_docs = await database.find_many(TRANSACTIONS, {"kind": "referral"})
        tx_docs.sort(key=lambda d: _iso(d.get("created_at")), reverse=True)

        users_map = {
            u["_id"]: u for u in await database.find_many("users")
        }

        items: List[AdminReferralItem] = []
        for doc in tx_docs:
            ref_id = str(doc.get("referrer_id") or "")
            referee_id = str(doc.get("referee_id") or "")
            referrer_user = users_map.get(ref_id, {})
            referee_user = users_map.get(referee_id, {})

            items.append(
                AdminReferralItem(
                    id=str(doc.get("_id")),
                    referrerId=ref_id,
                    referrerName=referrer_user.get("display_name") or referrer_user.get("displayName") or "Referrer",
                    referrerPhone=referrer_user.get("phone") or "—",
                    refereeId=referee_id,
                    refereeName=doc.get("referee_name") or referee_user.get("display_name") or "New Friend",
                    refereePhone=referee_user.get("phone") or "—",
                    code=str(doc.get("code") or ""),
                    status=str(doc.get("status") or "pending"),  # type: ignore[arg-type]
                    rewardAmount=float(doc.get("reward_amount") or settings.referrerRewardAmount),
                    discountApplied=float(doc.get("max_discount") or settings.refereeMaxDiscount),
                    firstOrderId=doc.get("first_order_id"),
                    createdAt=_iso(doc.get("created_at")),
                    completedAt=_iso(doc.get("completed_at")) if doc.get("completed_at") else None,
                )
            )

        return AdminReferralListResponse(items=items, total=len(items), stats=stats)

    # ------------------------------------------------------------------
    # Multi-Role Referral Engine (Partner, Rider & Customer)
    # ------------------------------------------------------------------
    async def get_multi_role_rules(self) -> List[ReferralRuleItem]:
        """Fetch all configured rules across roles & cities, seeding defaults if empty."""
        docs = await database.find_many(MULTI_ROLE_RULES)
        if not docs:
            # Seed 3 standard rules
            defaults = [
                ReferralRuleItem(
                    id="rule_partner_all",
                    role="partner",
                    city="All Cities",
                    referrerReward=500.0,
                    targetOrdersCount=10,
                    headline="Refer a Partner & Earn ₹500",
                    subheadline="Reward credited to your weekly payout after referred laundromat completes 10 orders.",
                    terms=[
                        "Referrer earns ₹500 per successfully onboarded Laundromat.",
                        "Reward unlocks automatically after the referred store completes 10 orders.",
                        "Claimed reward is disbursed directly in the weekly bank settlement cycle.",
                    ],
                    enabled=True,
                    createdAt=utcnow().isoformat(),
                    updatedAt=utcnow().isoformat(),
                ),
                ReferralRuleItem(
                    id="rule_rider_all",
                    role="rider",
                    city="All Cities",
                    referrerReward=300.0,
                    targetOrdersCount=20,
                    headline="Refer a Delivery Captain & Earn ₹300",
                    subheadline="Reward credited to your wallet float after referred rider completes 20 deliveries.",
                    terms=[
                        "Referrer earns ₹300 per onboarded Delivery Captain.",
                        "Reward unlocks automatically after the referred captain completes 20 deliveries.",
                        "Claimed reward is credited directly to rider wallet float.",
                    ],
                    enabled=True,
                    createdAt=utcnow().isoformat(),
                    updatedAt=utcnow().isoformat(),
                ),
                ReferralRuleItem(
                    id="rule_customer_all",
                    role="customer",
                    city="All Cities",
                    referrerReward=150.0,
                    targetOrdersCount=1,
                    refereeDiscountPercent=50.0,
                    refereeMaxDiscount=150.0,
                    headline="Invite Friends & Earn ₹150",
                    subheadline="Friends get 50% OFF on 1st order. You get ₹150 wallet cash.",
                    terms=[
                        "Friends get 50% discount automatically on their first laundry order (up to ₹150).",
                        "Referrer gets ₹150 in QuickPress wallet immediately after 1st order is delivered.",
                    ],
                    enabled=True,
                    createdAt=utcnow().isoformat(),
                    updatedAt=utcnow().isoformat(),
                ),
            ]
            for d in defaults:
                dump = d.model_dump()
                dump["_id"] = d.id
                await database.collection(MULTI_ROLE_RULES).insert_one(dump)
            return defaults

        return [
            ReferralRuleItem(
                id=str(d.get("_id") or d.get("id")),
                role=d.get("role", "partner"),
                city=d.get("city", "All Cities"),
                referrerReward=float(d.get("referrerReward") or 0.0),
                targetOrdersCount=int(d.get("targetOrdersCount") or 1),
                minOrderValue=float(d.get("minOrderValue") or 199.0),
                refereeJoiningBonus=float(d.get("refereeJoiningBonus") or 0.0),
                refereeDiscountPercent=float(d.get("refereeDiscountPercent") or 0.0),
                refereeMaxDiscount=float(d.get("refereeMaxDiscount") or 0.0),
                headline=d.get("headline") or "Refer & Earn",
                subheadline=d.get("subheadline") or "",
                terms=d.get("terms") or [],
                enabled=bool(d.get("enabled", True)),
                createdAt=d.get("createdAt"),
                updatedAt=d.get("updatedAt"),
            )
            for d in docs
        ]

    async def get_active_rule(self, role: str, city: Optional[str] = None) -> ReferralRuleItem:
        """Find matching rule for role & city (falls back to All Cities)."""
        rules = await self.get_multi_role_rules()
        role_clean = role.lower().strip()
        city_clean = (city or "").strip().lower()

        # 1. Look for city-specific override
        if city_clean and city_clean != "all cities":
            for r in rules:
                if r.role.lower() == role_clean and r.city.strip().lower() == city_clean and r.enabled:
                    return r

        # 2. Look for "All Cities" default
        for r in rules:
            if r.role.lower() == role_clean and r.city.strip().lower() in ("all cities", "all", "") and r.enabled:
                return r

        # 3. Fallback to any rule for role
        for r in rules:
            if r.role.lower() == role_clean:
                return r

        # 4. Ultimate fallback
        return ReferralRuleItem(id="fallback", role="partner", city="All Cities")

    async def upsert_multi_role_rule(self, payload: UpdateReferralRulePayload) -> ReferralRuleItem:
        """Create or update a rule for specific role and city."""
        role = payload.role.lower().strip()
        city = (payload.city or "All Cities").strip()
        rule_id = f"rule_{role}_{re.sub(r'[^a-zA-Z0-9]', '_', city.lower())}"

        existing = await database.collection(MULTI_ROLE_RULES).find_one({"_id": rule_id})
        now = utcnow().isoformat()

        doc: Dict[str, Any] = {
            "_id": rule_id,
            "id": rule_id,
            "role": role,
            "city": city,
            "updatedAt": now,
        }

        if existing:
            doc = {**existing, **doc}

        if payload.referrerReward is not None: doc["referrerReward"] = payload.referrerReward
        if payload.targetOrdersCount is not None: doc["targetOrdersCount"] = payload.targetOrdersCount
        if payload.minOrderValue is not None: doc["minOrderValue"] = payload.minOrderValue
        if payload.refereeJoiningBonus is not None: doc["refereeJoiningBonus"] = payload.refereeJoiningBonus
        if payload.refereeDiscountPercent is not None: doc["refereeDiscountPercent"] = payload.refereeDiscountPercent
        if payload.refereeMaxDiscount is not None: doc["refereeMaxDiscount"] = payload.refereeMaxDiscount
        if payload.headline is not None: doc["headline"] = payload.headline
        if payload.subheadline is not None: doc["subheadline"] = payload.subheadline
        if payload.terms is not None: doc["terms"] = payload.terms
        if payload.enabled is not None: doc["enabled"] = payload.enabled
        if not existing: doc["createdAt"] = now

        await database.collection(MULTI_ROLE_RULES).update_one({"_id": rule_id}, {"$set": doc}, upsert=True)

        # Two-way sync: If customer rule is updated by Admin, sync to legacy customer PROGRAM_SETTINGS
        if role == "customer":
            try:
                sync_settings: Dict[str, Any] = {"updatedAt": now}
                if payload.refereeDiscountPercent is not None: sync_settings["refereeDiscountPercent"] = payload.refereeDiscountPercent
                if payload.refereeMaxDiscount is not None: sync_settings["refereeMaxDiscount"] = payload.refereeMaxDiscount
                if payload.minOrderValue is not None: sync_settings["refereeMinOrderValue"] = payload.minOrderValue
                if payload.referrerReward is not None: sync_settings["referrerRewardAmount"] = payload.referrerReward
                if payload.headline is not None: sync_settings["headline"] = payload.headline
                if payload.subheadline is not None: sync_settings["subheadline"] = payload.subheadline
                if payload.terms is not None: sync_settings["terms"] = payload.terms
                await database.collection(PROGRAM_SETTINGS).update_one({"_id": GLOBAL_CONFIG_ID}, {"$set": sync_settings}, upsert=True)
            except Exception as sync_err:
                logger.warning(f"Failed to sync customer referral settings: {sync_err}")

        return await self.get_active_rule(role, city)

    async def delete_multi_role_rule(self, rule_id: str) -> bool:
        await database.collection(MULTI_ROLE_RULES).delete_one({"_id": rule_id})
        return True

    async def get_user_referral_hub(
        self, user: User, role: str, city: Optional[str] = None
    ) -> UserReferralHubResponse:
        """Dashboard for Partner, Rider or Customer Referral Hub."""
        role_clean = role.lower().strip()
        # Generate clean role-based code if not set
        uid_clean = re.sub(r"[^A-Za-z0-9]", "", str(user.id))[-4:].upper() or "1001"
        code_prefix = "QP-PRT" if role_clean == "partner" else ("QP-RDR" if role_clean == "rider" else "QP-CST")
        code = str(getattr(user, "referral_code", None) or getattr(user, "referralCode", None) or f"{code_prefix}-{uid_clean}")

        # Persist referral code on user/partner/rider doc so referees can immediately match it
        try:
            await database.collection("users").update_one(
                {"_id": user.id},
                {"$set": {"referral_code": code, "referralCode": code}},
            )
            if role_clean == "partner":
                await database.collection("partner_profiles").update_one(
                    {"$or": [{"_id": user.id}, {"partnerId": user.id}, {"userId": user.id}]},
                    {"$set": {"referralCode": code, "referral_code": code}},
                )
            elif role_clean == "rider":
                await database.collection("rider_profiles").update_one(
                    {"$or": [{"_id": user.id}, {"riderId": user.id}, {"phone": user.phone}]},
                    {"$set": {"referralCode": code, "referral_code": code}},
                )
        except Exception:
            pass

        # Resolve partner / store city if applicable
        user_city = city or "All Cities"
        if role_clean == "partner":
            p_doc = await database.collection("partner_stores").find_one({"$or": [{"_id": user.id}, {"userId": user.id}, {"partnerId": user.id}]})
            if p_doc and p_doc.get("city"):
                user_city = p_doc.get("city")

        active_rule = await self.get_active_rule(role_clean, user_city)

        # Share message & link
        if role_clean == "partner":
            share_link = f"https://withquickpress.com/partner-onboarding?ref={code}"
            share_msg = f"QuickPress Partner banein aur apna Laundry/Dry Clean business grow karein! Join using my referral code: {code} 👉 {share_link}"
        elif role_clean == "rider":
            share_link = f"https://withquickpress.com/rider-onboarding?ref={code}"
            share_msg = f"QuickPress Delivery Captain banein aur daily payouts payein! Join using my referral code: {code} 👉 {share_link}"
        else:
            share_link = f"https://withquickpress.com/invite/{code}"
            share_msg = f"Use my QuickPress code {code} to get 50% OFF on your first laundry order! 👉 {share_link}"

        qr_code = _qr_for(code)

        # Query Multi-Role Ledger for referrals made by this user
        cands = [user.id, getattr(user, "id", None)]
        if hasattr(user, "id"):
            cands.append(f"PRT-{user.id}")
        docs = await database.find_many(MULTI_ROLE_LEDGER, {"referrerId": {"$in": cands}})
        docs.sort(key=lambda d: _iso(d.get("createdAt")), reverse=True)

        ledger_items: List[ReferralLedgerItem] = []
        for d in docs:
            ledger_items.append(
                ReferralLedgerItem(
                    id=str(d.get("_id") or d.get("id")),
                    referrerId=str(d.get("referrerId")),
                    referrerName=str(d.get("referrerName") or user.display_name),
                    referrerPhone=str(d.get("referrerPhone") or user.phone or "—"),
                    referrerRole=d.get("referrerRole", role_clean),
                    refereeId=str(d.get("refereeId")),
                    refereeName=str(d.get("refereeName") or "Partner Store"),
                    refereePhone=str(d.get("refereePhone") or "—"),
                    refereeRole=d.get("refereeRole", role_clean),
                    city=str(d.get("city") or "All Cities"),
                    code=str(d.get("code") or code),
                    targetOrders=int(d.get("targetOrders") or active_rule.targetOrdersCount),
                    completedOrders=int(d.get("completedOrders") or 0),
                    rewardAmount=float(d.get("rewardAmount") or active_rule.referrerReward),
                    status=d.get("status", "pending_milestone"),
                    createdAt=_iso(d.get("createdAt")),
                    unlockedAt=_iso(d.get("unlockedAt")) if d.get("unlockedAt") else None,
                    claimedAt=_iso(d.get("claimedAt")) if d.get("claimedAt") else None,
                    settlementCycleId=d.get("settlementCycleId"),
                )
            )

        total_referred = len(ledger_items)
        pending_count = sum(1 for l in ledger_items if l.status == "pending_milestone")
        unlocked_count = sum(1 for l in ledger_items if l.status == "unlocked")
        claimable_balance = sum(l.rewardAmount for l in ledger_items if l.status == "unlocked")
        claimed_balance = sum(l.rewardAmount for l in ledger_items if l.status in ("claimed_to_cycle", "settled"))

        return UserReferralHubResponse(
            role=role_clean,
            code=code,
            shareLink=share_link,
            qrCodeUrl=qr_code,
            shareMessage=share_msg,
            activeRule=active_rule,
            totalReferred=total_referred,
            pendingMilestoneCount=pending_count,
            unlockedMilestoneCount=unlocked_count,
            claimableBalance=claimable_balance,
            totalClaimedBalance=claimed_balance,
            ledger=ledger_items,
        )

    async def claim_referral_rewards(
        self, user: User, role: str, reward_id: Optional[str] = None
    ) -> ClaimReferralRewardResponse:
        """Transfers unlocked referral rewards into weekly settlement cycle (partner) or wallet (rider)."""
        role_clean = role.lower().strip()
        cands = [user.id, getattr(user, "id", None)]
        if hasattr(user, "id"):
            cands.append(f"PRT-{user.id}")

        query: Dict[str, Any] = {"referrerId": {"$in": cands}, "status": "unlocked"}
        if reward_id:
            query["$or"] = [{"_id": reward_id}, {"id": reward_id}]

        unlocked_docs = await database.find_many(MULTI_ROLE_LEDGER, query)
        if not unlocked_docs:
            return ClaimReferralRewardResponse(
                ok=False,
                claimedAmount=0.0,
                cycleId="current",
                message="No unlocked referral rewards found to claim.",
            )

        total_amount = sum(float(d.get("rewardAmount") or 0.0) for d in unlocked_docs)
        now_str = utcnow().isoformat()

        # Update status in ledger
        for d in unlocked_docs:
            d_id = str(d.get("_id") or d.get("id"))
            await database.collection(MULTI_ROLE_LEDGER).update_one(
                {"$or": [{"_id": d_id}, {"id": d_id}]},
                {"$set": {"status": "claimed_to_cycle", "claimedAt": now_str, "settlementCycleId": "current"}},
            )

        # Partner settlement credit
        if role_clean == "partner":
            await database.collection("partner_settlement_additions").insert_one({
                "partnerId": user.id,
                "type": "referral_incentive",
                "amount": total_amount,
                "cycleId": "current",
                "description": f"Referral Reward ({len(unlocked_docs)} stores milestone reached)",
                "createdAt": now_str,
            })
            msg = f"₹{int(total_amount)} referral bonus credited to your Current Weekly Settlement Cycle! Will be paid out in your weekly bank transfer."
        elif role_clean == "rider":
            await database.collection("rider_wallets").update_one(
                {"riderId": user.id},
                {"$inc": {"balance": total_amount}},
                upsert=True,
            )
            msg = f"₹{int(total_amount)} referral reward credited to your Rider Wallet Float!"
        else:
            await database.collection("customer_wallets").update_one(
                {"userId": user.id},
                {"$inc": {"balance": total_amount}},
                upsert=True,
            )
            msg = f"₹{int(total_amount)} referral credit added to your QuickPress Wallet!"

        return ClaimReferralRewardResponse(
            ok=True,
            claimedAmount=total_amount,
            cycleId="current",
            message=msg,
        )

    async def process_order_milestones(self, order: Dict[str, Any]) -> None:
        """Triggered when an order is completed. Advances referral milestone counters for referred partner/rider/customer."""
        try:
            partner_id = str(order.get("partnerId") or order.get("storeId") or "")
            rider_id = str(order.get("deliveryRiderId") or order.get("riderId") or "")
            cust = order.get("customer") or {}
            customer_id = str(order.get("userId") or order.get("customerId") or cust.get("id") or cust.get("userId") or "")

            # 1. Check partner milestone
            if partner_id:
                p_cands = [partner_id]
                if partner_id.startswith("PRT-"):
                    p_cands.append(partner_id[4:])
                else:
                    p_cands.append(f"PRT-{partner_id}")

                entry = await database.collection(MULTI_ROLE_LEDGER).find_one({
                    "refereeId": {"$in": p_cands},
                    "refereeRole": "partner",
                    "status": "pending_milestone",
                })
                if entry:
                    curr_completed = int(entry.get("completedOrders") or 0) + 1
                    target = int(entry.get("targetOrders") or 10)
                    up_doc: Dict[str, Any] = {"completedOrders": curr_completed}
                    just_unlocked = False
                    if curr_completed >= target:
                        up_doc["status"] = "unlocked"
                        up_doc["unlockedAt"] = utcnow().isoformat()
                        just_unlocked = True

                    await database.collection(MULTI_ROLE_LEDGER).update_one(
                        {"_id": entry["_id"]},
                        {"$set": up_doc},
                    )

                    if just_unlocked:
                        try:
                            from app.services.order_notifications import send_partner_notification
                            ref_id = str(entry.get("referrerId"))
                            ref_amt = float(entry.get("rewardAmount") or 500.0)
                            p_name = entry.get("refereeName") or "Partner Store"
                            await send_partner_notification(
                                ref_id,
                                title="🎁 Partner Referral Milestone Unlocked!",
                                description=f"Great news! Your referred partner {p_name} completed {target} orders. ₹{int(ref_amt)} is now unlocked and ready to claim to your weekly cycle!",
                                kind="referral",
                            )
                        except Exception as notif_err:
                            logger.warning(f"Failed to dispatch partner referral unlock notification: {notif_err}")

            # 2. Check rider milestone
            if rider_id:
                r_entry = await database.collection(MULTI_ROLE_LEDGER).find_one({
                    "refereeId": rider_id,
                    "refereeRole": "rider",
                    "status": "pending_milestone",
                })
                if r_entry:
                    curr_completed = int(r_entry.get("completedOrders") or 0) + 1
                    target = int(r_entry.get("targetOrders") or 20)
                    up_doc = {"completedOrders": curr_completed}
                    just_unlocked_rider = False
                    if curr_completed >= target:
                        up_doc["status"] = "unlocked"
                        up_doc["unlockedAt"] = utcnow().isoformat()
                        just_unlocked_rider = True

                    await database.collection(MULTI_ROLE_LEDGER).update_one(
                        {"_id": r_entry["_id"]},
                        {"$set": up_doc},
                    )

                    if just_unlocked_rider:
                        try:
                            from app.services.order_notifications import send_rider_notification
                            ref_id = str(r_entry.get("referrerId"))
                            ref_amt = float(r_entry.get("rewardAmount") or 300.0)
                            r_name = r_entry.get("refereeName") or "Captain"
                            await send_rider_notification(
                                ref_id,
                                title="🎁 Captain Referral Reward Unlocked!",
                                message=f"Captain! Your referred captain {r_name} completed {target} trips. ₹{int(ref_amt)} referral reward is now ready to claim!",
                            )
                        except Exception as r_notif_err:
                            logger.warning(f"Failed to dispatch rider referral unlock notification: {r_notif_err}")

            # 3. Check customer milestone
            if customer_id:
                c_entry = await database.collection(MULTI_ROLE_LEDGER).find_one({
                    "refereeId": customer_id,
                    "refereeRole": "customer",
                    "status": "pending_milestone",
                })
                if c_entry:
                    curr_completed = int(c_entry.get("completedOrders") or 0) + 1
                    target = int(c_entry.get("targetOrders") or 1)
                    up_doc = {"completedOrders": curr_completed}
                    if curr_completed >= target:
                        up_doc["status"] = "unlocked"
                        up_doc["unlockedAt"] = utcnow().isoformat()
                    await database.collection(MULTI_ROLE_LEDGER).update_one(
                        {"_id": c_entry["_id"]},
                        {"$set": up_doc},
                    )
        except Exception as e:
            logger.warning(f"Error processing referral order milestone: {e}")

    async def apply_partner_or_rider_referral(
        self, referrer_code: str, referee_user: User, referee_role: str, city: str = "All Cities"
    ) -> dict:
        """Links newly registered partner or rider with their referrer using multi-source matching."""
        clean_code = str(referrer_code or "").upper().strip()
        referee_role_clean = referee_role.lower().strip()

        referrer_doc = None

        # 1. Look in users collection
        referrer_doc = await database.collection("users").find_one({
            "$or": [
                {"referral_code": clean_code},
                {"referralCode": clean_code},
                {"code": clean_code},
            ]
        })

        # 2. Look in partner_profiles / admin_partners
        if not referrer_doc and "PRT" in clean_code:
            p_prof = (
                await database.collection("partner_profiles").find_one({"$or": [{"referralCode": clean_code}, {"referral_code": clean_code}]})
                or await database.collection("admin_partners").find_one({"$or": [{"referralCode": clean_code}, {"referral_code": clean_code}]})
            )
            if p_prof:
                referrer_doc = {
                    "_id": str(p_prof.get("_id") or p_prof.get("partnerId") or p_prof.get("userId")),
                    "display_name": p_prof.get("businessName") or p_prof.get("ownerName") or "Partner",
                    "phone": p_prof.get("phone") or "—",
                    "role": "partner",
                }

        # 3. Look in rider_profiles / admin_riders
        if not referrer_doc and "RDR" in clean_code:
            r_prof = (
                await database.collection("rider_profiles").find_one({"$or": [{"referralCode": clean_code}, {"referral_code": clean_code}]})
                or await database.collection("admin_riders").find_one({"$or": [{"referralCode": clean_code}, {"referral_code": clean_code}]})
            )
            if r_prof:
                referrer_doc = {
                    "_id": str(r_prof.get("_id") or r_prof.get("riderId") or r_prof.get("userId")),
                    "display_name": r_prof.get("fullName") or r_prof.get("name") or "Captain",
                    "phone": r_prof.get("phone") or "—",
                    "role": "rider",
                }

        # 4. Suffix match fallback (e.g. QP-PRT-ABCD or QP-RDR-ABCD where ABCD is last 4 characters of ID)
        if not referrer_doc and "-" in clean_code:
            suffix = clean_code.split("-")[-1].strip().upper()
            if len(suffix) >= 3:
                if "PRT" in clean_code:
                    partners = await database.find_many("partner_profiles")
                    for p in partners:
                        pid = re.sub(r"[^A-Za-z0-9]", "", str(p.get("_id") or p.get("partnerId") or ""))[-4:].upper()
                        if pid == suffix:
                            referrer_doc = {
                                "_id": str(p.get("_id") or p.get("partnerId")),
                                "display_name": p.get("businessName") or p.get("ownerName") or "Partner",
                                "phone": p.get("phone") or "—",
                                "role": "partner",
                            }
                            break
                elif "RDR" in clean_code:
                    riders = await database.find_many("rider_profiles")
                    for r in riders:
                        rid = re.sub(r"[^A-Za-z0-9]", "", str(r.get("_id") or r.get("riderId") or ""))[-4:].upper()
                        if rid == suffix:
                            referrer_doc = {
                                "_id": str(r.get("_id") or r.get("riderId")),
                                "display_name": r.get("fullName") or r.get("name") or "Captain",
                                "phone": r.get("phone") or "—",
                                "role": "rider",
                            }
                            break

        # 5. Look in existing multi_role_ledger entries
        if not referrer_doc:
            existing_ref = await database.collection(MULTI_ROLE_LEDGER).find_one({"code": clean_code})
            if existing_ref:
                referrer_id = existing_ref.get("referrerId")
                referrer_doc = await database.collection("users").find_one({"_id": referrer_id}) or {
                    "_id": referrer_id,
                    "display_name": existing_ref.get("referrerName") or "Referrer",
                    "phone": existing_ref.get("referrerPhone") or "—",
                    "role": existing_ref.get("referrerRole") or referee_role_clean,
                }

        if not referrer_doc:
            raise ReferralConflict("Invalid referral code.", status_code=404)

        referrer_id = str(referrer_doc.get("_id"))
        if referrer_id == referee_user.id:
            raise ReferralConflict("You cannot use your own referral code.", status_code=400)

        # Check if referee already applied
        existing_applied = await database.collection(MULTI_ROLE_LEDGER).find_one({
            "refereeId": referee_user.id
        })
        if existing_applied:
            raise ReferralConflict("Referral already applied for this account.", status_code=409)

        active_rule = await self.get_active_rule(referee_role_clean, city)

        ledger_entry = {
            "_id": f"ref_{uuid.uuid4().hex[:12]}",
            "referrerId": referrer_id,
            "referrerName": referrer_doc.get("display_name") or referrer_doc.get("displayName") or "Referrer",
            "referrerPhone": referrer_doc.get("phone") or "—",
            "referrerRole": referrer_doc.get("role") or referee_role_clean,
            "refereeId": referee_user.id,
            "refereeName": referee_user.display_name or ("New Registered Laundromat" if referee_role_clean == "partner" else "New Delivery Captain"),
            "refereePhone": referee_user.phone or "—",
            "refereeRole": referee_role_clean,
            "city": city or "All Cities",
            "code": clean_code,
            "targetOrders": active_rule.targetOrdersCount,
            "completedOrders": 0,
            "rewardAmount": active_rule.referrerReward,
            "status": "pending_milestone",
            "createdAt": utcnow().isoformat(),
        }

        await database.collection(MULTI_ROLE_LEDGER).insert_one(ledger_entry)
        return {"ok": True, "code": clean_code, "targetOrders": active_rule.targetOrdersCount, "reward": active_rule.referrerReward}

    async def admin_action_ledger_item(self, ledger_id: str, action: str) -> Dict[str, Any]:
        """Admin manual override on referral ledger entry (force unlock, disburse, or cancel)."""
        entry = await database.collection(MULTI_ROLE_LEDGER).find_one({"_id": ledger_id})
        if not entry:
            raise ReferralConflict("Referral ledger item not found.", status_code=404)

        now = utcnow().isoformat()
        if action == "unlock":
            await database.collection(MULTI_ROLE_LEDGER).update_one(
                {"_id": ledger_id},
                {
                    "$set": {
                        "status": "unlocked",
                        "unlockedAt": now,
                        "completedOrders": entry.get("targetOrders", 10),
                    }
                },
            )
            return {"ok": True, "status": "unlocked", "message": "Referral milestone marked unlocked by admin."}

        elif action == "credit":
            referrer_id = str(entry.get("referrerId"))
            role = str(entry.get("referrerRole", "partner"))
            reward = float(entry.get("rewardAmount") or 500.0)

            fake_user = User(
                id=referrer_id,
                email=f"{referrer_id}@quickpress.internal",
                role=role,
                display_name=str(entry.get("referrerName", "Partner")),
            )
            res = await self.claim_referral_rewards(fake_user, role=role, reward_id=ledger_id)
            return {"ok": True, "status": "claimed_to_cycle", "message": f"₹{int(reward)} successfully credited to settlement cycle."}

        elif action == "cancel":
            await database.collection(MULTI_ROLE_LEDGER).update_one(
                {"_id": ledger_id},
                {"$set": {"status": "cancelled", "cancelledAt": now}},
            )
            return {"ok": True, "status": "cancelled", "message": "Referral record cancelled."}

        raise ReferralConflict("Invalid action specified.", status_code=400)

    async def get_admin_multi_role_overview(
        self, role: Optional[str] = None, city: Optional[str] = None, status: Optional[str] = None
    ) -> AdminMultiRoleReferralOverview:
        """Admin panel comprehensive overview across Partner, Rider, and Customer referrals."""
        rules = await self.get_multi_role_rules()

        filter_q: Dict[str, Any] = {}
        if role and role.lower() != "all":
            filter_q["refereeRole"] = role.lower()
        if city and city.lower() != "all cities":
            filter_q["city"] = city
        if status and status.lower() != "all":
            filter_q["status"] = status.lower()

        docs = await database.find_many(MULTI_ROLE_LEDGER, filter_q)
        docs.sort(key=lambda d: _iso(d.get("createdAt")), reverse=True)

        ledger_items: List[ReferralLedgerItem] = []
        for d in docs:
            ledger_items.append(
                ReferralLedgerItem(
                    id=str(d.get("_id") or d.get("id")),
                    referrerId=str(d.get("referrerId")),
                    referrerName=str(d.get("referrerName") or "Referrer"),
                    referrerPhone=str(d.get("referrerPhone") or "—"),
                    referrerRole=d.get("referrerRole", "partner"),
                    refereeId=str(d.get("refereeId")),
                    refereeName=str(d.get("refereeName") or "Referee"),
                    refereePhone=str(d.get("refereePhone") or "—"),
                    refereeRole=d.get("refereeRole", "partner"),
                    city=str(d.get("city") or "All Cities"),
                    code=str(d.get("code") or "QP-100"),
                    targetOrders=int(d.get("targetOrders") or 10),
                    completedOrders=int(d.get("completedOrders") or 0),
                    rewardAmount=float(d.get("rewardAmount") or 500.0),
                    status=d.get("status", "pending_milestone"),
                    createdAt=_iso(d.get("createdAt")),
                    unlockedAt=_iso(d.get("unlockedAt")) if d.get("unlockedAt") else None,
                    claimedAt=_iso(d.get("claimedAt")) if d.get("claimedAt") else None,
                    settlementCycleId=d.get("settlementCycleId"),
                )
            )

        # Calculate high-level metrics
        all_docs = await database.find_many(MULTI_ROLE_LEDGER)
        p_inv = sum(1 for d in all_docs if d.get("refereeRole") == "partner")
        p_unlocked = sum(1 for d in all_docs if d.get("refereeRole") == "partner" and d.get("status") in ("unlocked", "claimed_to_cycle", "settled"))
        r_inv = sum(1 for d in all_docs if d.get("refereeRole") == "rider")
        r_unlocked = sum(1 for d in all_docs if d.get("refereeRole") == "rider" and d.get("status") in ("unlocked", "claimed_to_cycle", "settled"))
        c_inv = sum(1 for d in all_docs if d.get("refereeRole") == "customer")
        c_unlocked = sum(1 for d in all_docs if d.get("refereeRole") == "customer" and d.get("status") in ("unlocked", "claimed_to_cycle", "settled"))
        disbursed = sum(float(d.get("rewardAmount") or 0.0) for d in all_docs if d.get("status") in ("claimed_to_cycle", "settled"))

        stats = AdminMultiRoleReferralStats(
            totalPartnerInvites=p_inv,
            unlockedPartnerRewards=p_unlocked,
            totalRiderInvites=r_inv,
            unlockedRiderRewards=r_unlocked,
            totalCustomerInvites=c_inv,
            unlockedCustomerRewards=c_unlocked,
            totalDisbursedToSettlements=disbursed,
            activeRulesCount=len([r for r in rules if r.enabled]),
        )

        return AdminMultiRoleReferralOverview(stats=stats, rules=rules, ledger=ledger_items)


referral_repository = ReferralRepository()

