"""QuickPress Promotions & Stories API.

Provides centralized management for:
- App Stories (Instagram-style animated cards, bullet points, thumbnails & custom links like Google Forms)
- Offer Banners (Scratch & earn banners, festive promos, custom redirect links)

Supports targeting for Riders (Captains), Customers, Partners, or Platform-wide.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db.client import database

logger = logging.getLogger(__name__)

router = APIRouter(tags=["promotions"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# =========================================================================
#  Initial Seed Data
# =========================================================================

DEFAULT_STORIES: List[Dict[str, Any]] = [
    {
        "_id": "story_follow",
        "id": "story_follow",
        "title": "Join QuickPress Captains 🛵",
        "tagline": "Uttar Pradesh's Fastest Growing Rider Community",
        "badge": "CAPTAIN COMMUNITY",
        "badgeBg": "bg-rose-500",
        "gradient": "from-amber-600 via-rose-600 to-purple-800",
        "icon": "🛵",
        "imageUrl": "",
        "points": [
            "10,000+ active captains across Kasganj, Aligarh & UP",
            "Weekly fuel coupons & motorcycle repair discounts",
            "Watch daily tips & earnings hacks by top riders",
        ],
        "ctaText": "Follow on Instagram ➔",
        "ctaAction": "https://instagram.com",
        "actionType": "external_link",
        "audience": "riders",
        "priority": 1,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "story_transfer",
        "id": "story_transfer",
        "title": "Instant Bank Transfer ⚡",
        "tagline": "Direct IMPS Payouts with Zero Deductions",
        "badge": "INSTANT CASHOUT",
        "badgeBg": "bg-emerald-500",
        "gradient": "from-emerald-700 via-teal-800 to-slate-900",
        "icon": "🏦",
        "imageUrl": "",
        "points": [
            "Automatic daily settlements 3 times every day",
            "Instant one-tap withdrawal to your registered bank / UPI",
            "100% of order fare belongs to you — 0% commission",
        ],
        "ctaText": "Open Wallet ➔",
        "ctaAction": "/wallet",
        "actionType": "internal_route",
        "audience": "riders",
        "priority": 2,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "story_earn2000",
        "id": "story_earn2000",
        "title": "Refer Friends & Earn ₹2,000 💰",
        "tagline": "Exclusive Kasganj & UP Referral Bonanza",
        "badge": "REFER & EARN",
        "badgeBg": "bg-blue-500",
        "gradient": "from-blue-700 via-indigo-900 to-violet-950",
        "icon": "💸",
        "imageUrl": "",
        "points": [
            "Share your referral link with biker friends",
            "When they complete 25 orders, you get ₹2,000 cash",
            "No limit on referrals — refer 5 friends, get ₹10,000!",
        ],
        "ctaText": "Share Referral Link ➔",
        "ctaAction": "https://quickpress.in/captain",
        "actionType": "share",
        "audience": "riders",
        "priority": 3,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "story_autoboost",
        "id": "story_autoboost",
        "title": "Auto Boost 2.0 ⚡",
        "tagline": "Extra Fares During Peak Laundry Demand",
        "badge": "PEAK SURGE",
        "badgeBg": "bg-amber-500",
        "gradient": "from-amber-600 via-orange-600 to-red-900",
        "icon": "⚡",
        "imageUrl": "",
        "points": [
            "+₹20 to +₹45 extra per order during morning & evening rushes",
            "Rain surge activated automatically during bad weather",
            "Priority order dispatch in Kasganj high-demand zones",
        ],
        "ctaText": "View Live Boosts ➔",
        "ctaAction": "/incentives",
        "actionType": "internal_route",
        "audience": "riders",
        "priority": 4,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "story_performance",
        "id": "story_performance",
        "title": "Captain Performance Score 🏆",
        "tagline": "Maintain 4.8★ & Unlock Gold VIP Captain Perks",
        "badge": "VIP TIER",
        "badgeBg": "bg-purple-500",
        "gradient": "from-purple-700 via-fuchsia-900 to-zinc-950",
        "icon": "🏅",
        "imageUrl": "",
        "points": [
            "Gold Captain badge shown to store partners & customers",
            "Complimentary accidental medical insurance coverage",
            "Dedicated VIP Captain priority support phone helpline",
        ],
        "ctaText": "Check My Score ➔",
        "ctaAction": "/profile",
        "actionType": "internal_route",
        "audience": "riders",
        "priority": 5,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
]

DEFAULT_BANNERS: List[Dict[str, Any]] = [
    {
        "_id": "banner_mystery_reward",
        "id": "banner_mystery_reward",
        "title": "Tap to earn",
        "subtitle": "Guaranteed instant cash reward for active duty!",
        "badge": "CAPTAIN REWARD",
        "badgeColor": "#FFC107",
        "theme": "blue_mystery",
        "rewardAmount": 10,
        "ctaText": "Tap to earn",
        "ctaLink": "",
        "actionType": "reward_scratch",
        "audience": "riders",
        "priority": 1,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
]


# =========================================================================
#  Pydantic Models
# =========================================================================

class StoryPayload(BaseModel):
    title: str = Field(..., min_length=2)
    tagline: str = ""
    badge: str = "FEATURED"
    badgeBg: str = "bg-blue-500"
    gradient: str = "from-blue-600 to-indigo-900"
    icon: str = "✨"
    imageUrl: Optional[str] = ""
    points: List[str] = []
    ctaText: str = "Learn More ➔"
    ctaAction: str = "https://forms.google.com"
    actionType: str = "external_link"  # external_link, internal_route, share, google_form
    audience: str = "riders"  # riders, customers, partners, all
    priority: int = 1
    isActive: bool = True


class BannerPayload(BaseModel):
    title: str = Field(..., min_length=2)
    subtitle: str = ""
    badge: str = "OFFER"
    badgeColor: str = "#FFC107"
    theme: str = "blue_mystery"
    rewardAmount: float = 10.0
    ctaText: str = "Tap to earn"
    ctaLink: str = ""
    actionType: str = "reward_scratch"  # reward_scratch, external_link, google_form, internal_route
    audience: str = "riders"  # riders, customers, partners, all
    priority: int = 1
    isActive: bool = True


# =========================================================================
#  PUBLIC ENDPOINTS (Used by Rider / Customer / Partner Apps)
# =========================================================================

@router.get("/promotions/stories")
async def get_public_stories(audience: Optional[str] = Query("riders")):
    """Get active stories sorted by priority for app header / drawer."""
    try:
        query: Dict[str, Any] = {"isActive": True}
        if audience and audience != "all":
            query["$or"] = [{"audience": audience}, {"audience": "all"}]

        docs = await database.find_many("promotions_stories", query)
        if not docs:
            # Seed if empty
            for s in DEFAULT_STORIES:
                await database.insert("promotions_stories", s)
            docs = [s for s in DEFAULT_STORIES if s.get("audience") in (audience, "all") and s.get("isActive")]

        docs.sort(key=lambda x: int(x.get("priority", 99)))
        return docs
    except Exception as err:
        logger.warning("Error fetching stories: %s", err)
        return [s for s in DEFAULT_STORIES if s.get("audience") in (audience, "all")]


@router.get("/promotions/banners")
async def get_public_banners(audience: Optional[str] = Query("riders")):
    """Get active promotional & offer banners for drawer."""
    try:
        query: Dict[str, Any] = {"isActive": True}
        if audience and audience != "all":
            query["$or"] = [{"audience": audience}, {"audience": "all"}]

        docs = await database.find_many("promotions_banners", query)
        if not docs:
            for b in DEFAULT_BANNERS:
                await database.insert("promotions_banners", b)
            docs = [b for b in DEFAULT_BANNERS if b.get("audience") in (audience, "all") and b.get("isActive")]

        docs.sort(key=lambda x: int(x.get("priority", 99)))
        return docs
    except Exception as err:
        logger.warning("Error fetching banners: %s", err)
        return [b for b in DEFAULT_BANNERS if b.get("audience") in (audience, "all")]


# =========================================================================
#  ADMIN ENDPOINTS (Full Management: CRUD, Google Form links, Order)
# =========================================================================

@router.get("/admin/promotions/stories")
async def admin_list_stories():
    """Admin: List all stories (active & inactive)."""
    try:
        docs = await database.find_many("promotions_stories")
        if not docs:
            for s in DEFAULT_STORIES:
                await database.insert("promotions_stories", s)
            docs = list(DEFAULT_STORIES)
        docs.sort(key=lambda x: int(x.get("priority", 99)))
        return docs
    except Exception as err:
        logger.warning("Admin list stories error: %s", err)
        return DEFAULT_STORIES


@router.post("/admin/promotions/stories", status_code=status.HTTP_201_CREATED)
async def admin_create_story(payload: StoryPayload):
    """Admin: Create a new story."""
    story_id = f"story_{uuid4().hex[:10]}"
    doc = {
        "_id": story_id,
        "id": story_id,
        **payload.model_dump(),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await database.insert("promotions_stories", doc)
    return doc


@router.put("/admin/promotions/stories/{story_id}")
async def admin_update_story(story_id: str, payload: StoryPayload):
    """Admin: Update an existing story."""
    changes = {
        **payload.model_dump(),
        "updatedAt": now_iso(),
    }
    updated = await database.update("promotions_stories", {"_id": story_id}, changes)
    if not updated:
        # Check if matched by id
        updated = await database.update("promotions_stories", {"id": story_id}, changes)
    if not updated:
        # If seed item not yet in DB, insert it with updates
        changes["_id"] = story_id
        changes["id"] = story_id
        changes["createdAt"] = now_iso()
        await database.insert("promotions_stories", changes)
        return changes
    return updated


@router.delete("/admin/promotions/stories/{story_id}")
async def admin_delete_story(story_id: str):
    """Admin: Delete a story."""
    res = await database.delete_one("promotions_stories", {"_id": story_id})
    if not res:
        res = await database.delete_one("promotions_stories", {"id": story_id})
    return {"ok": True, "deleted": story_id}


@router.get("/admin/promotions/banners")
async def admin_list_banners():
    """Admin: List all offer banners."""
    try:
        docs = await database.find_many("promotions_banners")
        if not docs:
            for b in DEFAULT_BANNERS:
                await database.insert("promotions_banners", b)
            docs = list(DEFAULT_BANNERS)
        docs.sort(key=lambda x: int(x.get("priority", 99)))
        return docs
    except Exception as err:
        logger.warning("Admin list banners error: %s", err)
        return DEFAULT_BANNERS


@router.post("/admin/promotions/banners", status_code=status.HTTP_201_CREATED)
async def admin_create_banner(payload: BannerPayload):
    """Admin: Create an offer banner."""
    banner_id = f"banner_{uuid4().hex[:10]}"
    doc = {
        "_id": banner_id,
        "id": banner_id,
        **payload.model_dump(),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await database.insert("promotions_banners", doc)
    return doc


@router.put("/admin/promotions/banners/{banner_id}")
async def admin_update_banner(banner_id: str, payload: BannerPayload):
    """Admin: Update an offer banner."""
    changes = {
        **payload.model_dump(),
        "updatedAt": now_iso(),
    }
    updated = await database.update("promotions_banners", {"_id": banner_id}, changes)
    if not updated:
        updated = await database.update("promotions_banners", {"id": banner_id}, changes)
    if not updated:
        changes["_id"] = banner_id
        changes["id"] = banner_id
        changes["createdAt"] = now_iso()
        await database.insert("promotions_banners", changes)
        return changes
    return updated


@router.delete("/admin/promotions/banners/{banner_id}")
async def admin_delete_banner(banner_id: str):
    """Admin: Delete an offer banner."""
    res = await database.delete_one("promotions_banners", {"_id": banner_id})
    if not res:
        res = await database.delete_one("promotions_banners", {"id": banner_id})
    return {"ok": True, "deleted": banner_id}
