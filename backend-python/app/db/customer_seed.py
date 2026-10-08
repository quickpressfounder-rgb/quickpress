"""Safe customer account initialization for live operations (e.g. +919258730561)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.db.client import database

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


async def seed_customer_account(phone: str = "+919258730561") -> str:
    """Ensure customer user exists and has live profile, wallet, and initial operational setup."""
    users_coll = database.collection("users")
    customers_coll = database.collection("customers")
    addresses_coll = database.collection("customer_addresses")
    orders_coll = database.collection("customer_orders")
    wallets_coll = database.collection("wallets")
    wallet_tx_coll = database.collection("wallet_transactions")
    notif_coll = database.collection("notifications")
    memberships_coll = database.collection("memberships")

    # 1. User & Customer Profile (only if not already setup)
    existing_user = await users_coll.find_one({"phone": phone, "role": "customer"})
    user_id = str(existing_user["_id"]) if existing_user else str(uuid.uuid4())
    linked_id = (existing_user or {}).get("linked_id") or f"CUST-{uuid.uuid4().hex[:6].upper()}"

    if not existing_user:
        user_doc = {
            "_id": user_id,
            "id": user_id,
            "firebase_uid": f"phone-{phone}",
            "role": "customer",
            "phone": phone,
            "email": "customer@quickpress.online",
            "display_name": "Demo Customer",
            "city": "",
            "status": "active",
            "is_verified": True,
            "is_onboarded": True,
            "linked_id": linked_id,
            "created_at": _iso(_now()),
        }
        await users_coll.insert_one(user_doc)

        customer_profile = {
            "_id": user_id,
            "user_id": user_id,
            "id": linked_id,
            "name": "Demo Customer",
            "phone": phone,
            "email": "customer@quickpress.online",
            "city": "",
            "status": "active",
            "createdAt": _iso(_now()),
        }
        await customers_coll.insert_one(customer_profile)

    # 2. Saved Addresses (only initialize if none exist)
    existing_addrs = await database.find_many("customer_addresses", {"userId": user_id})
    if not existing_addrs:
        addr_home_id = f"addr_home_{user_id[:8]}"
        home_address = {
            "_id": addr_home_id,
            "id": addr_home_id,
            "userId": user_id,
            "type": "home",
            "label": "Home",
            "houseNumber": "Apartment 101",
            "building": "Residency Tower",
            "street": "Main Road",
            "area": "Central Sector",
            "landmark": "Near Metro Station",
            "city": "Operational Area",
            "state": "Uttar Pradesh",
            "pincode": "201301",
            "contactName": "Demo Customer",
            "phone": phone,
            "isDefault": True,
            "latitude": 28.5355,
            "longitude": 77.3910,
            "createdAt": _iso(_now() - timedelta(days=5)),
        }
        await addresses_coll.insert_one(home_address)

    # 3. Live Wallet (only initialize if not present)
    existing_wallet = await database.find_one("wallets", {"user_id": user_id})
    if not existing_wallet:
        wallet_doc = {
            "_id": f"wlt-{user_id}",
            "user_id": user_id,
            "userId": user_id,
            "balance": 500.0,
            "pending_balance": 0.0,
            "reward_balance": 150.0,
            "membership_credits": 100.0,
            "currency": "INR",
            "created_at": _iso(_now() - timedelta(days=5)),
            "updated_at": _iso(_now()),
        }
        await wallets_coll.insert_one(wallet_doc)

        # Initial live top-up transaction
        tx_doc = {
            "_id": f"tx_topup_{user_id[:8]}",
            "user_id": user_id,
            "userId": user_id,
            "title": "Welcome Wallet Bonus & Top-up",
            "description": "Initial credit balance for laundry bookings",
            "amount": 500.0,
            "kind": "add-funds",
            "direction": "credit",
            "status": "success",
            "balance_after": 500.0,
            "method": "upi",
            "reference": "WELCOME-CREDIT-500",
            "created_at": _iso(_now() - timedelta(days=5)),
        }
        await wallet_tx_coll.insert_one(tx_doc)

    # 4. VIP Gold Membership
    existing_mbs = await database.find_one("memberships", {"user_id": user_id})
    if not existing_mbs:
        mbs_doc = {
            "_id": f"mbs-{user_id}",
            "user_id": user_id,
            "plan_id": "gold",
            "status": "active",
            "billing_cycle": "yearly",
            "amount_paid": 1990.0,
            "started_at": _iso(_now() - timedelta(days=10)),
            "expires_at": _iso(_now() + timedelta(days=355)),
            "cancelled_at": None,
            "auto_renew": True,
        }
        await memberships_coll.insert_one(mbs_doc)

    # 5. Live Notifications
    existing_notifs = await database.find_many("notifications", {"user_id": user_id})
    if not existing_notifs:
        notif_doc = {
            "_id": f"notif_welcome_{user_id[:8]}",
            "user_id": user_id,
            "role": "customer",
            "kind": "system",
            "category": "system",
            "title": "👑 Welcome to QuickPress!",
            "description": "Your account is active. Explore nearby Kasganj partners and book door-to-door laundry.",
            "read": False,
            "read_at": None,
            "created_at": _iso(_now()),
            "order_id": None,
            "order_code": None,
        }
        await notif_coll.insert_one(notif_doc)

    logger.info("Live customer account ready for %s (user_id=%s)", phone, user_id)
    return user_id
