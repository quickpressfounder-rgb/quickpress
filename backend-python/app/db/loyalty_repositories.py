"""QuickPress Loyalty Program Repository.

Manages:
1. Admin Campaign Configuration (Total Budget, Target Users, Min/Max Points, 100 pts = ₹10).
2. Order Delivery Scratch Card Generation (Triggered when order is delivered).
3. Scratch Card Reveal & Points Crediting.
4. Real Money Wallet Conversion (100 points = ₹10.00 wallet credit).
"""

from __future__ import annotations

import logging
import random
import uuid
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.db.wallet_repositories import wallet_repository
from app.models.user import User, utcnow

logger = logging.getLogger(__name__)

LOYALTY_CAMPAIGN = "loyalty_campaign"
LOYALTY_SCRATCH_CARDS = "loyalty_scratch_cards"
LOYALTY_ACCOUNTS = "loyalty_accounts"
LOYALTY_LEDGER = "loyalty_ledger"

GLOBAL_CAMPAIGN_ID = "global_loyalty_campaign"
DEFAULT_POINTS_PER_RUPEE = 10  # 100 points = ₹10 (1 point = ₹0.10)
DEFAULT_TOTAL_BUDGET = 5000.0   # ₹5,000 default budget
DEFAULT_TARGET_USERS = 500     # 500 orders / customers


def _iso(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value or utcnow().isoformat())


class LoyaltyRepository:
    async def get_campaign_config(self) -> Dict[str, Any]:
        """Fetch active loyalty campaign config with auto-calculated economics."""
        doc = await database.collection(LOYALTY_CAMPAIGN).find_one({"_id": GLOBAL_CAMPAIGN_ID})
        if not doc:
            doc = {
                "_id": GLOBAL_CAMPAIGN_ID,
                "enabled": True,
                "campaignName": "Delivered Orders Scratch & Win",
                "totalBudget": DEFAULT_TOTAL_BUDGET,
                "targetUserCount": DEFAULT_TARGET_USERS,
                "pointsPerRupee": DEFAULT_POINTS_PER_RUPEE,
                "conversionRateLabel": "100 Points = ₹10 Real Cash",
                "spentBudget": 0.0,
                "cardsIssued": 0,
                "cardsScratched": 0,
                "pointsAwarded": 0,
                "pointsRedeemed": 0,
                "createdAt": _iso(utcnow()),
                "updatedAt": _iso(utcnow()),
            }
            await database.collection(LOYALTY_CAMPAIGN).update_one(
                {"_id": GLOBAL_CAMPAIGN_ID}, {"$set": doc}, upsert=True
            )

        total_budget = float(doc.get("totalBudget") or DEFAULT_TOTAL_BUDGET)
        target_count = max(1, int(doc.get("targetUserCount") or DEFAULT_TARGET_USERS))
        spent_budget = float(doc.get("spentBudget") or 0.0)
        points_per_rupee = int(doc.get("pointsPerRupee") or DEFAULT_POINTS_PER_RUPEE)

        # Average economics derived from budget / target user count
        avg_rupees_per_user = round(total_budget / target_count, 2)
        avg_points_per_user = int(avg_rupees_per_user * points_per_rupee)

        min_pts = int(doc.get("minPoints") or max(10, int(avg_points_per_user * 0.5)))
        max_pts = int(doc.get("maxPoints") or max(min_pts + 10, int(avg_points_per_user * 1.5)))

        remaining_budget = max(0.0, round(total_budget - spent_budget, 2))

        return {
            "id": GLOBAL_CAMPAIGN_ID,
            "enabled": bool(doc.get("enabled", True)),
            "campaignName": doc.get("campaignName", "Delivered Orders Scratch & Win"),
            "totalBudget": total_budget,
            "targetUserCount": target_count,
            "pointsPerRupee": points_per_rupee,
            "conversionRateLabel": "100 Points = ₹10 Real Cash",
            "avgRupeesPerOrder": avg_rupees_per_user,
            "avgPointsPerOrder": avg_points_per_user,
            "minPoints": min_pts,
            "maxPoints": max_pts,
            "spentBudget": round(spent_budget, 2),
            "remainingBudget": remaining_budget,
            "cardsIssued": int(doc.get("cardsIssued") or 0),
            "cardsScratched": int(doc.get("cardsScratched") or 0),
            "pointsAwarded": int(doc.get("pointsAwarded") or 0),
            "pointsRedeemed": int(doc.get("pointsRedeemed") or 0),
            "updatedAt": doc.get("updatedAt") or _iso(utcnow()),
        }

    async def update_campaign_config(
        self, payload: Dict[str, Any], admin_id: str = "super_admin"
    ) -> Dict[str, Any]:
        """Update campaign settings in DB."""
        updates: Dict[str, Any] = {"updatedAt": _iso(utcnow()), "updatedBy": admin_id}

        if "enabled" in payload:
            updates["enabled"] = bool(payload["enabled"])
        if "campaignName" in payload and payload["campaignName"]:
            updates["campaignName"] = str(payload["campaignName"]).strip()
        if "totalBudget" in payload:
            updates["totalBudget"] = max(0.0, round(float(payload["totalBudget"]), 2))
        if "targetUserCount" in payload:
            updates["targetUserCount"] = max(1, int(payload["targetUserCount"]))
        if "minPoints" in payload:
            updates["minPoints"] = max(1, int(payload["minPoints"]))
        if "maxPoints" in payload:
            updates["maxPoints"] = max(int(payload.get("minPoints", 1)), int(payload["maxPoints"]))

        await database.collection(LOYALTY_CAMPAIGN).update_one(
            {"_id": GLOBAL_CAMPAIGN_ID}, {"$set": updates}, upsert=True
        )
        return await self.get_campaign_config()

    async def get_or_create_account(self, user_id: str) -> Dict[str, Any]:
        """Fetch or initialize a customer's loyalty balance account."""
        clean_uid = str(user_id).strip()
        doc = await database.collection(LOYALTY_ACCOUNTS).find_one({"_id": clean_uid})
        if not doc:
            doc = {
                "_id": clean_uid,
                "userId": clean_uid,
                "pointsBalance": 0,
                "lifetimeEarned": 0,
                "lifetimeRedeemed": 0,
                "createdAt": _iso(utcnow()),
                "updatedAt": _iso(utcnow()),
            }
            await database.collection(LOYALTY_ACCOUNTS).update_one(
                {"_id": clean_uid}, {"$set": doc}, upsert=True
            )
        return doc

    async def issue_order_scratch_card(self, order: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Issue a scratch card to the customer when an order is DELIVERED."""
        config = await self.get_campaign_config()
        if not config["enabled"]:
            logger.info("Loyalty scratch card skipped: campaign is disabled.")
            return None

        if config["remainingBudget"] <= 0:
            logger.info("Loyalty scratch card skipped: campaign budget exhausted.")
            return None

        order_key = str(order.get("_id") or order.get("id") or order.get("code"))
        order_code = str(order.get("code") or order_key)

        customer = order.get("customer") or {}
        user_id = str(order.get("userId") or customer.get("id") or "")
        if not user_id:
            logger.warning(f"Could not resolve user_id for order {order_code} scratch card.")
            return None

        # Idempotency check: Don't issue multiple cards for the same order
        existing = await database.collection(LOYALTY_SCRATCH_CARDS).find_one(
            {"$or": [{"orderId": order_key}, {"orderCode": order_code}]}
        )
        if existing:
            return existing

        # Calculate randomized points within [minPoints, maxPoints] based on campaign budget
        min_pts = config["minPoints"]
        max_pts = config["maxPoints"]
        points = random.randint(min_pts, max_pts)
        worth_rupees = round(points / config["pointsPerRupee"], 2)

        card_id = f"sc-{uuid.uuid4().hex[:10]}"
        now = _iso(utcnow())

        card_doc: Dict[str, Any] = {
            "_id": card_id,
            "id": card_id,
            "userId": user_id,
            "orderId": order_key,
            "orderCode": order_code,
            "points": points,
            "worthRupees": worth_rupees,
            "status": "unscratched",
            "title": "Delivered Order Reward",
            "caption": f"Order #{order_code} Delivery Reward",
            "createdAt": now,
            "scratchedAt": None,
        }

        await database.collection(LOYALTY_SCRATCH_CARDS).insert_one(card_doc)

        # Increment campaign cards issued
        await database.collection(LOYALTY_CAMPAIGN).update_one(
            {"_id": GLOBAL_CAMPAIGN_ID},
            {"$inc": {"cardsIssued": 1}},
            upsert=True,
        )

        logger.info(
            f"Issued scratch card {card_id} with {points} points (₹{worth_rupees}) for delivered order {order_code} to user {user_id}"
        )
        return card_doc

    async def get_user_cards(self, user_id: str) -> List[Dict[str, Any]]:
        """List all scratch cards of a user, newest first."""
        clean_uid = str(user_id).strip()
        docs = await database.find_many(LOYALTY_SCRATCH_CARDS, {"userId": clean_uid})
        docs.sort(key=lambda d: str(d.get("createdAt") or ""), reverse=True)
        return [
            {
                "id": str(d.get("id") or d.get("_id")),
                "orderId": d.get("orderId", ""),
                "orderCode": d.get("orderCode", ""),
                "points": int(d.get("points") or 0),
                "worthRupees": float(d.get("worthRupees") or 0.0),
                "reward": f"{int(d.get('points') or 0)} Points (₹{float(d.get('worthRupees') or 0):.2f})",
                "caption": d.get("caption") or "Delivered Order Reward",
                "status": d.get("status", "unscratched"),
                "scratched": d.get("status") == "scratched",
                "createdAt": d.get("createdAt") or "",
                "scratchedAt": d.get("scratchedAt"),
            }
            for d in docs
        ]

    async def scratch_card(self, user_id: str, card_id: str) -> Dict[str, Any]:
        """Reveal scratch card and credit loyalty points to the user's account."""
        clean_uid = str(user_id).strip()
        clean_cid = str(card_id).strip()

        card = await database.collection(LOYALTY_SCRATCH_CARDS).find_one(
            {"$or": [{"_id": clean_cid}, {"id": clean_cid}]}
        )
        if not card:
            raise ValueError("Scratch card not found")

        if str(card.get("userId")) != clean_uid:
            raise ValueError("Not authorized to scratch this card")

        points = int(card.get("points") or 0)
        worth_rupees = float(card.get("worthRupees") or round(points / DEFAULT_POINTS_PER_RUPEE, 2))

        # If already scratched, just return current state
        if card.get("status") == "scratched":
            account = await self.get_or_create_account(clean_uid)
            return {
                "ok": True,
                "alreadyScratched": True,
                "cardId": clean_cid,
                "pointsAwarded": points,
                "worthRupees": worth_rupees,
                "totalPointsBalance": int(account.get("pointsBalance") or 0),
                "totalWorthRupees": round(int(account.get("pointsBalance") or 0) / DEFAULT_POINTS_PER_RUPEE, 2),
            }

        now = _iso(utcnow())

        # 1. Mark card scratched
        await database.collection(LOYALTY_SCRATCH_CARDS).update_one(
            {"_id": card["_id"]},
            {"$set": {"status": "scratched", "scratchedAt": now}},
        )

        # 2. Credit points to user loyalty account
        await database.collection(LOYALTY_ACCOUNTS).update_one(
            {"_id": clean_uid},
            {
                "$inc": {"pointsBalance": points, "lifetimeEarned": points},
                "$set": {"updatedAt": now},
            },
            upsert=True,
        )

        # 3. Record in loyalty ledger
        await database.collection(LOYALTY_LEDGER).insert_one(
            {
                "_id": f"lgt-{uuid.uuid4().hex[:12]}",
                "userId": clean_uid,
                "kind": "scratch_card",
                "cardId": clean_cid,
                "orderCode": card.get("orderCode"),
                "points": points,
                "rupeesEquivalent": worth_rupees,
                "description": f"Revealed Scratch Card for Order #{card.get('orderCode')}",
                "createdAt": now,
            }
        )

        # 4. Update campaign aggregates
        await database.collection(LOYALTY_CAMPAIGN).update_one(
            {"_id": GLOBAL_CAMPAIGN_ID},
            {
                "$inc": {"cardsScratched": 1, "pointsAwarded": points},
                "$set": {"updatedAt": now},
            },
            upsert=True,
        )

        updated_account = await self.get_or_create_account(clean_uid)
        new_balance = int(updated_account.get("pointsBalance") or 0)

        return {
            "ok": True,
            "alreadyScratched": False,
            "cardId": clean_cid,
            "pointsAwarded": points,
            "worthRupees": worth_rupees,
            "totalPointsBalance": new_balance,
            "totalWorthRupees": round(new_balance / DEFAULT_POINTS_PER_RUPEE, 2),
        }

    async def redeem_points_to_wallet(self, user: User, points: int) -> Dict[str, Any]:
        """Convert loyalty points to Real Money in QuickPress Wallet at 100 points = ₹10."""
        user_id = str(user.id).strip()
        points_to_redeem = int(points)

        if points_to_redeem < 10:
            raise ValueError("Minimum 10 loyalty points required to redeem")

        account = await self.get_or_create_account(user_id)
        current_points = int(account.get("pointsBalance") or 0)

        if points_to_redeem > current_points:
            raise ValueError(f"Insufficient points. You have {current_points} points.")

        # Rate: 100 points = ₹10 -> rupees = points / 10.0
        rupees = round(points_to_redeem / float(DEFAULT_POINTS_PER_RUPEE), 2)
        if rupees <= 0:
            raise ValueError("Redemption amount must be greater than ₹0")

        now = _iso(utcnow())

        # 1. Deduct points from loyalty account
        await database.collection(LOYALTY_ACCOUNTS).update_one(
            {"_id": user_id},
            {
                "$inc": {"pointsBalance": -points_to_redeem, "lifetimeRedeemed": points_to_redeem},
                "$set": {"updatedAt": now},
            },
        )

        # 2. Credit real money to user's QuickPress Wallet
        ref_code = f"loyalty-redeem-{uuid.uuid4().hex[:8]}"
        wallet_doc, _tx = await wallet_repository.credit(
            user,
            rupees,
            kind="reward-credit",
            title="Loyalty Points Redeemed",
            description=f"Converted {points_to_redeem} Loyalty Points to ₹{rupees:.2f} Wallet Cash (100 pts = ₹10)",
            method="wallet",
            reference=ref_code,
        )

        # 3. Log to loyalty ledger
        await database.collection(LOYALTY_LEDGER).insert_one(
            {
                "_id": f"lgt-{uuid.uuid4().hex[:12]}",
                "userId": user_id,
                "kind": "wallet_redemption",
                "points": -points_to_redeem,
                "rupeesEquivalent": rupees,
                "reference": ref_code,
                "description": f"Transferred {points_to_redeem} points to wallet as ₹{rupees:.2f}",
                "createdAt": now,
            }
        )

        # 4. Update campaign aggregates
        await database.collection(LOYALTY_CAMPAIGN).update_one(
            {"_id": GLOBAL_CAMPAIGN_ID},
            {
                "$inc": {"pointsRedeemed": points_to_redeem, "spentBudget": rupees},
                "$set": {"updatedAt": now},
            },
            upsert=True,
        )

        updated_account = await self.get_or_create_account(user_id)
        points_left = int(updated_account.get("pointsBalance") or 0)

        return {
            "ok": True,
            "pointsRedeemed": points_to_redeem,
            "rupeesCredited": rupees,
            "newPointsBalance": points_left,
            "newPointsWorth": round(points_left / DEFAULT_POINTS_PER_RUPEE, 2),
            "newWalletBalance": float(wallet_doc.get("balance") or 0.0),
            "message": f"Successfully transferred {points_to_redeem} points (₹{rupees:.2f}) into your Wallet!",
        }

    async def get_dashboard(self, user: User) -> Dict[str, Any]:
        """Full customer loyalty state: balance, value in ₹, and scratch cards."""
        user_id = str(user.id).strip()
        account = await self.get_or_create_account(user_id)
        points = int(account.get("pointsBalance") or 0)
        worth = round(points / DEFAULT_POINTS_PER_RUPEE, 2)
        cards = await self.get_user_cards(user_id)
        config = await self.get_campaign_config()

        unscratched_count = sum(1 for c in cards if not c.get("scratched"))

        return {
            "pointsBalance": points,
            "worthRupees": worth,
            "conversionRateLabel": config["conversionRateLabel"],
            "pointsPerRupee": config["pointsPerRupee"],
            "scratchCards": cards,
            "unscratchedCount": unscratched_count,
            "campaignActive": config["enabled"],
        }


loyalty_repository = LoyaltyRepository()
