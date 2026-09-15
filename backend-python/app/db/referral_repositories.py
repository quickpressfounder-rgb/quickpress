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
    AdminReferralItem,
    AdminReferralListResponse,
    AdminReferralStats,
    ApplyReferralResponse,
    InviteReferralResponse,
    ReferralHistoryItem,
    ReferralHistoryResponse,
    ReferralProgramSettings,
    ReferralResponse,
    ReferralRewardItem,
    ReferralRewardsResponse,
    ReferralStatsResponse,
    UpdateReferralSettingsPayload,
    WelcomeReferralOffer,
)
from app.models.user import User, utcnow

REFERRALS = "referrals"
TRANSACTIONS = "referral_transactions"
REWARDS = "referral_rewards"
ORDERS = "customer_orders"
PROGRAM_SETTINGS = "referral_program_settings"

SHARE_BASE = "https://quickpress.app/invite"
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


referral_repository = ReferralRepository()

