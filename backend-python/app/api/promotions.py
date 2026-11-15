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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.deps import require_roles
from app.db.client import database
from app.models.user import Role, User

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
        "ctaAction": "https://www.instagram.com/with.quickpress",
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


DEFAULT_BLOGS: List[Dict[str, Any]] = [
    {
        "_id": "blog_kasganj_mission",
        "id": "blog_kasganj_mission",
        "slug": "how-quickpress-is-organizing-bharats-laundry-economy",
        "title": "How QuickPress is Organizing Bharat's ₹2.5 Lakh Crore Laundry Economy",
        "excerpt": "From the historic streets of Kasganj to Western UP, how our proprietary 3-way app grid connects everyday households with local dhobi entrepreneurs.",
        "content": (
            "We didn't conceive QuickPress sitting in an air-conditioned glass skyscraper in Bangalore or Gurgaon. "
            "It was built on the ground in Kasganj, listening to mothers scrub heavy cotton uniforms with sore hands, "
            "students rushing for early morning college, and traditional iron-wallahs battling erratic voltage fluctuations.\n\n"
            "India's garment care market is overwhelmingly fragmented. Over 96% of neighborhood dry cleaners and local dhobis "
            "operate without digital order tracking, industrial steam tables, or predictable customer flow. QuickPress bridges this "
            "divide by equipping existing hubs with Italian vacuum steam pressing tables, medical-grade hygiene chemicals, "
            "and an algorithmic 10-minute captain dispatch network.\n\n"
            "Today, every garment processed through QuickPress carries a digital barcode audit trail, verified on calibrated scales "
            "right at the customer's doorstep with ₹5,000 zero-loss protection. This is how deep-tech solves real grassroots problems."
        ),
        "category": "Company News",
        "coverImage": "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80",
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "author": "Himanshu Pal",
        "authorRole": "Founder & Chief Executive Officer",
        "readTime": "4 min read",
        "isSlider": True,
        "isFeatured": True,
        "priority": 1,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "blog_fabric_science",
        "id": "blog_fabric_science",
        "slug": "the-science-of-garment-care-80c-thermal-sanitization",
        "title": "The Science of Garment Care: 80°C Thermal Sanitization vs Conventional Washing",
        "excerpt": "Why boiling detergents damage delicate weaves while our hypoallergenic enzymatic wash cycle eliminates 99.9% of dust mites and bacteria safely.",
        "content": (
            "Garment longevity depends entirely on water chemistry and thermal control. Traditional household washing machines "
            "frequently mix hard groundwater with harsh alkaline detergents, stripping textile fibers and causing early fabric fraying.\n\n"
            "At QuickPress certified hubs, we implement a multi-stage RO water treatment system paired with German hypoallergenic enzymes. "
            "For heavy quilts, bed linens, and hospital uniforms, our computerized commercial drums achieve medical-grade 80°C anti-bacterial "
            "thermal sanitization without fabric scorch or color bleeding.\n\n"
            "Delicate garments, silk sarees, and corporate blazers are processed with hydrocarbon eco-solvents—100% free of carcinogenic perchloroethylene (PERC)."
        ),
        "category": "Fabric Care",
        "coverImage": "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80",
        "videoUrl": "",
        "author": "Garment Science Desk",
        "authorRole": "Textile Engineering Lead",
        "readTime": "5 min read",
        "isSlider": True,
        "isFeatured": True,
        "priority": 2,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "blog_dhobi_empowerment",
        "id": "blog_dhobi_empowerment",
        "slug": "from-charcoal-irons-to-italian-vacuum-tables",
        "title": "From Charcoal Irons to Italian Vacuum Steam Tables: Empowering Local Dhobi Partners",
        "excerpt": "Meet Ramesh Kumar, whose neighborhood shop in Kasganj transformed from earning ₹800 a day to managing a ₹1.2 Lakh monthly digitally routed hub.",
        "content": (
            "For three generations, Ramesh Kumar and his family heated heavy 6kg charcoal irons inside a tiny 100 sq ft stall. "
            "Charcoal dust constantly threatened clean white shirts, and power cuts in the afternoon meant zero work could be done.\n\n"
            "When Ramesh onboarded with QuickPress in 2024, our partner operations team installed an industrial vacuum steam pressing table "
            "powered by high-efficiency boilers. With orders routed directly to his store tablet from nearby neighborhoods, "
            "his daily processing output tripled while physical fatigue dropped dramatically.\n\n"
            "'QuickPress did not replace our shop; it made our shop modern,' says Ramesh. We are proud to expand this model across hundreds of micro-entrepreneurs in Uttar Pradesh."
        ),
        "category": "Partner Stories",
        "coverImage": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80",
        "videoUrl": "",
        "author": "Partner Success Team",
        "authorRole": "Hyperlocal Hub Operations",
        "readTime": "6 min read",
        "isSlider": True,
        "isFeatured": True,
        "priority": 3,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "blog_dispatch_algorithm",
        "id": "blog_dispatch_algorithm",
        "slug": "inside-the-quickpress-10-minute-captain-dispatch-grid",
        "title": "Inside the QuickPress 10-Minute Captain Dispatch Grid",
        "excerpt": "How our geo-fenced batching algorithm groups nearby pickups and drop-offs to maintain sub-12 minute door arrival with zero carbon waste.",
        "content": (
            "Hyperlocal logistics in Tier 2 and Tier 3 cities require a radically different architectural approach than Tier 1 metros. "
            "Streets are narrower, GPS waypoints are frequently offset, and road conditions change rapidly during monsoons.\n\n"
            "Our routing engine calculates multi-order clustering based on live rider coordinates, partner hub capacity, and delivery deadlines. "
            "When a customer books a 45-minute pickup, the system dispatches the nearest active Captain within 30 seconds, "
            "complete with turn-by-turn navigation and digital weight scale pairing via Bluetooth.\n\n"
            "The result: 99.8% on-time execution and sustainable per-kilometer captain earnings."
        ),
        "category": "Technology",
        "coverImage": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        "videoUrl": "",
        "author": "QuickPress Engineering",
        "authorRole": "Logistics Systems Team",
        "readTime": "5 min read",
        "isSlider": False,
        "isFeatured": False,
        "priority": 4,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "blog_sneaker_spa",
        "id": "blog_sneaker_spa",
        "slug": "sneaker-spa-how-we-restore-suede-leather-and-knit-kicks",
        "title": "Sneaker Spa: How We Restore Suede, Premium Leather, and Knit Kicks",
        "excerpt": "A deep dive into deep foam cleaning, sole groove disinfection, suede nap revival, and hydrophobic nano-coating protection.",
        "content": (
            "Sneakers are an investment. Throwing high-grade leather kicks or delicate suede into a standard household washing machine "
            "ruins internal adhesives, stiffens suede fibers, and discolors white midsoles.\n\n"
            "At the QuickPress Sneaker Spa, our trained shoe craftsmen perform a manual 7-stage restoration: dry brush surface dirt removal, "
            "hypoallergenic conditioning foam scrub, unyellowing UV sole oxidation, deep inner-lining disinfection, and a water-repellent nano shield.\n\n"
            "Your favorite sneakers return fresh, odor-free, and sealed in breathable dust bags."
        ),
        "category": "Fabric Care",
        "coverImage": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
        "videoUrl": "",
        "author": "Sneaker Spa Craftsmen",
        "authorRole": "Footwear Care Specialists",
        "readTime": "3 min read",
        "isSlider": False,
        "isFeatured": False,
        "priority": 5,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
    {
        "_id": "blog_sustainability",
        "id": "blog_sustainability",
        "slug": "saving-1-million-liters-of-clean-water-our-green-pledge",
        "title": "Saving 1 Million Liters of Clean Water: Our Green Eco-Care Pledge",
        "excerpt": "How water recycling filtration, low-temp bio detergents, and reusable waterproof laundry bags cut single-use plastic by 100%.",
        "content": (
            "Garment care cannot come at the expense of our planet. Traditional home washing consumes upwards of 60 liters of water per 5kg load, "
            "often discharging unfiltered chemical residue into local waterways.\n\n"
            "QuickPress partner hubs employ closed-loop water treatment units that filter and recirculate rinse water, cutting net consumption by 45%. "
            "Moreover, we have eliminated single-use polythene wrapping across all daily orders, replacing them with multi-use waterproof nylon bags "
            "that customers keep and exchange on every order.\n\n"
            "Clean clothes, clean consciousness."
        ),
        "category": "Sustainability",
        "coverImage": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
        "videoUrl": "",
        "author": "Eco-Care Initiative",
        "authorRole": "Sustainability & ESG Desk",
        "readTime": "4 min read",
        "isSlider": False,
        "isFeatured": False,
        "priority": 6,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    },
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


class BlogPayload(BaseModel):
    title: str = Field(..., min_length=2)
    slug: Optional[str] = ""
    excerpt: str = ""
    content: str = ""
    category: str = "Company News"
    coverImage: str = ""
    videoUrl: Optional[str] = ""
    author: str = "QuickPress Editorial Team"
    authorRole: str = "Staff Writer"
    readTime: str = "4 min read"
    isSlider: bool = False
    isFeatured: bool = False
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
async def admin_list_stories(_user: User = Depends(require_roles(Role.admin))):
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
async def admin_create_story(payload: StoryPayload, _user: User = Depends(require_roles(Role.admin))):
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
async def admin_update_story(story_id: str, payload: StoryPayload, _user: User = Depends(require_roles(Role.admin))):
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
async def admin_delete_story(story_id: str, _user: User = Depends(require_roles(Role.admin))):
    """Admin: Delete a story."""
    res = await database.delete_one("promotions_stories", {"_id": story_id})
    if not res:
        res = await database.delete_one("promotions_stories", {"id": story_id})
    return {"ok": True, "deleted": story_id}


@router.get("/admin/promotions/banners")
async def admin_list_banners(_user: User = Depends(require_roles(Role.admin))):
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
async def admin_create_banner(payload: BannerPayload, _user: User = Depends(require_roles(Role.admin))):
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
async def admin_update_banner(banner_id: str, payload: BannerPayload, _user: User = Depends(require_roles(Role.admin))):
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
async def admin_delete_banner(banner_id: str, _user: User = Depends(require_roles(Role.admin))):
    """Admin: Delete an offer banner."""
    res = await database.delete_one("promotions_banners", {"_id": banner_id})
    if not res:
        res = await database.delete_one("promotions_banners", {"id": banner_id})
    return {"ok": True, "deleted": banner_id}


# =========================================================================
#  BLOG ENDPOINTS (Public & Admin Blog Management with Slider & Video)
# =========================================================================

@router.get("/promotions/blogs")
async def get_public_blogs(
    category: Optional[str] = Query(None),
    isSlider: Optional[bool] = Query(None),
):
    """Public: Get active blogs with optional category and slider filter."""
    try:
        query: Dict[str, Any] = {"isActive": True}
        if category and category.lower() != "all":
            query["category"] = category
        if isSlider is not None:
            query["isSlider"] = isSlider

        docs = await database.find_many("promotions_blogs", query)
        if not docs:
            # Seed default blogs
            for b in DEFAULT_BLOGS:
                await database.insert("promotions_blogs", b)
            docs = [
                b for b in DEFAULT_BLOGS
                if (not category or category.lower() == "all" or b.get("category") == category)
                and (isSlider is None or b.get("isSlider") == isSlider)
            ]

        docs.sort(key=lambda x: int(x.get("priority", 99)))
        return docs
    except Exception as err:
        logger.warning("Error fetching public blogs: %s", err)
        return [
            b for b in DEFAULT_BLOGS
            if (not category or category.lower() == "all" or b.get("category") == category)
            and (isSlider is None or b.get("isSlider") == isSlider)
        ]


@router.get("/promotions/blogs/{blog_id_or_slug}")
async def get_public_blog_detail(blog_id_or_slug: str):
    """Public: Get single blog post by slug or ID."""
    try:
        doc = await database.find_one("promotions_blogs", {"slug": blog_id_or_slug})
        if not doc:
            doc = await database.find_one("promotions_blogs", {"_id": blog_id_or_slug})
        if not doc:
            doc = await database.find_one("promotions_blogs", {"id": blog_id_or_slug})
        if not doc:
            # Check default seed blogs
            doc = next(
                (b for b in DEFAULT_BLOGS if b.get("slug") == blog_id_or_slug or b.get("id") == blog_id_or_slug or b.get("_id") == blog_id_or_slug),
                None
            )
        if not doc:
            raise HTTPException(status_code=404, detail="Blog post not found.")
        return doc
    except HTTPException:
        raise
    except Exception as err:
        logger.warning("Error fetching blog post detail: %s", err)
        doc = next(
            (b for b in DEFAULT_BLOGS if b.get("slug") == blog_id_or_slug or b.get("id") == blog_id_or_slug or b.get("_id") == blog_id_or_slug),
            None
        )
        if doc:
            return doc
        raise HTTPException(status_code=404, detail="Blog post not found.")


@router.get("/admin/promotions/blogs")
async def admin_list_blogs(_user: User = Depends(require_roles(Role.admin))):
    """Admin: List all blog posts (active & inactive)."""
    try:
        docs = await database.find_many("promotions_blogs")
        if not docs:
            for b in DEFAULT_BLOGS:
                await database.insert("promotions_blogs", b)
            docs = list(DEFAULT_BLOGS)
        docs.sort(key=lambda x: int(x.get("priority", 99)))
        return docs
    except Exception as err:
        logger.warning("Admin list blogs error: %s", err)
        return DEFAULT_BLOGS


@router.post("/admin/promotions/blogs", status_code=status.HTTP_201_CREATED)
async def admin_create_blog(payload: BlogPayload, _user: User = Depends(require_roles(Role.admin))):
    """Admin: Create a new blog post."""
    blog_id = f"blog_{uuid4().hex[:10]}"
    slug = payload.slug.strip() if payload.slug and payload.slug.strip() else payload.title.lower().replace(" ", "-").replace(":", "").replace("?", "")
    doc = {
        "_id": blog_id,
        "id": blog_id,
        **payload.model_dump(),
        "slug": slug,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await database.insert("promotions_blogs", doc)
    return doc


@router.put("/admin/promotions/blogs/{blog_id}")
async def admin_update_blog(blog_id: str, payload: BlogPayload, _user: User = Depends(require_roles(Role.admin))):
    """Admin: Update an existing blog post."""
    slug = payload.slug.strip() if payload.slug and payload.slug.strip() else payload.title.lower().replace(" ", "-").replace(":", "").replace("?", "")
    changes = {
        **payload.model_dump(),
        "slug": slug,
        "updatedAt": now_iso(),
    }
    updated = await database.update("promotions_blogs", {"_id": blog_id}, changes)
    if not updated:
        updated = await database.update("promotions_blogs", {"id": blog_id}, changes)
    if not updated:
        changes["_id"] = blog_id
        changes["id"] = blog_id
        changes["createdAt"] = now_iso()
        await database.insert("promotions_blogs", changes)
        return changes
    return updated


@router.delete("/admin/promotions/blogs/{blog_id}")
async def admin_delete_blog(blog_id: str, _user: User = Depends(require_roles(Role.admin))):
    """Admin: Delete a blog post."""
    res = await database.delete_one("promotions_blogs", {"_id": blog_id})
    if not res:
        res = await database.delete_one("promotions_blogs", {"id": blog_id})
    return {"ok": True, "deleted": blog_id}
