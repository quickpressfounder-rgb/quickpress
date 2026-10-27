"""Public-facing informational and legal endpoints for QuickPress Website.

No authentication required. Read-only and public contact form submission.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.db.catalog_repositories import catalog
from app.db.client import database
from app.db.cms_repositories import cms_repo, LEGAL_DOCS_SEED
from app.db.membership_repositories import membership_repository

router = APIRouter(prefix="/public", tags=["public-website"])


class ContactFormPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    phone: str = Field(..., min_length=10, max_length=15)
    subject: str = Field(..., min_length=3, max_length=150)
    message: str = Field(..., min_length=10, max_length=2000)


# =========================================================================
#  1. Public Legal Policies (Live CMS-backed)
# =========================================================================

@router.get("/legal/{doc_slug}")
async def get_public_legal_doc(doc_slug: str) -> Dict[str, Any]:
    alias_map = {
        "terms-and-conditions": "terms",
        "terms-of-service": "terms",
        "terms": "terms",
        "privacy": "privacy-policy",
        "privacy-policy": "privacy-policy",
        "refund-cancellation": "refund-policy",
        "cancellation-refund-policy": "refund-policy",
        "refund-policy": "refund-policy",
        "refund": "refund-policy",
        "partner-agreement": "partner-agreement",
        "partner-terms": "partner-agreement",
        "merchant-agreement": "partner-agreement",
        "rider-agreement": "rider-agreement",
        "rider-terms": "rider-agreement",
        "captain-agreement": "rider-agreement",
        "grievance-redressal": "grievance-redressal",
        "grievance": "grievance-redressal",
        "compliance": "grievance-redressal",
    }
    normalized_slug = doc_slug.lower().strip()
    target_slug = alias_map.get(normalized_slug, normalized_slug)
    doc = await cms_repo.get_legal_doc(target_slug)
    if not doc:
        doc = await cms_repo.get_legal_doc(normalized_slug)
    if not doc and target_slug in LEGAL_DOCS_SEED:
        doc = LEGAL_DOCS_SEED[target_slug]
    if not doc and normalized_slug in LEGAL_DOCS_SEED:
        doc = LEGAL_DOCS_SEED[normalized_slug]
    if not doc:
        raise HTTPException(status_code=404, detail="Legal document not found or unpublished.")
    return {
        "slug": doc.get("slug", target_slug),
        "title": doc.get("title", "Legal Document"),
        "currentVersion": doc.get("currentVersion", "1.0"),
        "effectiveDate": doc.get("effectiveDate", "2026-08-25"),
        "summary": doc.get("summary", ""),
        "content": doc.get("content", ""),
        "publishedAt": doc.get("publishedAt"),
    }


# =========================================================================
#  2. Public Services Catalog
# =========================================================================

@router.get("/services")
async def get_public_services() -> List[Dict[str, Any]]:
    """Return all active master services for the public website and partner onboarding."""
    admin_svcs = await database.find_many("admin_services")
    categories = await database.find_many("admin_categories")
    cat_map = {str(c.get("_id")): c.get("name") for c in (categories or [])}
    admin_map = {str(a.get("name", "")).strip().lower(): a for a in (admin_svcs or [])}

    services = await catalog.services()
    results = []
    seen = set()
    for s in services:
        s_name = s.name or getattr(s, "title", "Service")
        s_key = s_name.strip().lower()
        seen.add(s_key)
        admin_match = admin_map.get(s_key)
        img = (admin_match.get("image") if admin_match else None) or getattr(s, "image", None) or getattr(s, "imageUrl", "")
        turnaround = getattr(s, "processingTime", None) or getattr(s, "turnaround", "24-48 hours")
        cat_name = (admin_match.get("category") if admin_match else None) or (cat_map.get(admin_match.get("categoryId")) if admin_match else None) or getattr(s, "category", "Laundry")
        results.append({
            "id": s.id,
            "slug": s.id,
            "name": s_name,
            "category": cat_name,
            "categoryId": (admin_match.get("categoryId") if admin_match else None) or "cat-1",
            "description": s.description or f"Professional {s_name} with door-to-door pickup & delivery.",
            "tagline": getattr(s, "tagline", "Expert care for your garments"),
            "icon": getattr(s, "icon", "sparkles"),
            "image": img,
            "imageUrl": img,
            "price": getattr(s, "finalPrice", getattr(s, "price", 79)),
            "turnaround": turnaround,
            "defaultHours": int(getattr(s, "turnaroundHours", 24) or 24),
            "popular": getattr(s, "popular", False),
            "unit": getattr(s, "unit", "Item / Kg"),
            "features": [
                "Doorstep pickup & drop-off",
                "Color-separated washing",
                "Fabric-safe gentle detergent",
                "Crisp steam finish & safe packaging"
            ]
        })

    for a in (admin_svcs or []):
        a_name = str(a.get("name", "")).strip()
        if a_name and a_name.lower() not in seen:
            seen.add(a_name.lower())
            img = a.get("image", "")
            cat_name = a.get("category") or cat_map.get(a.get("categoryId")) or "Laundry"
            results.append({
                "id": str(a.get("_id", a_name)),
                "slug": str(a.get("_id", a_name)),
                "name": a_name,
                "category": cat_name,
                "categoryId": a.get("categoryId") or "cat-1",
                "description": a.get("description") or f"Professional {a_name} with door-to-door pickup & delivery.",
                "tagline": "Expert care for your garments",
                "icon": a.get("icon") or "sparkles",
                "image": img,
                "imageUrl": img,
                "price": float(a.get("price", 79)),
                "turnaround": f"{a.get('turnaroundHours', 24)} hours",
                "defaultHours": int(a.get("turnaroundHours", 24) or 24),
                "popular": bool(a.get("popular", False)),
                "unit": a.get("unit", "Item / Kg"),
                "features": [
                    "Doorstep pickup & drop-off",
                    "Color-separated washing",
                    "Fabric-safe gentle detergent",
                    "Crisp steam finish & safe packaging"
                ]
            })
    return results


@router.get("/services/{slug}")
async def get_public_service_detail(slug: str) -> Dict[str, Any]:
    """Return comprehensive public service details including process, fabric care, and FAQs."""
    services = await catalog.services()
    match = next((s for s in services if s.id == slug), None)
    if not match:
        raise HTTPException(status_code=404, detail="Service not found.")

    turnaround = getattr(match, "processingTime", None) or getattr(match, "turnaround", "24-48 hours")

    # Get editorial care instructions and FAQs if available
    content_doc = await database.find_one("service_content", {"_id": slug})

    care_instructions = content_doc.get("careInstructions") if content_doc else [
        "Whites and colours are washed in separate loads",
        "Temperature is carefully regulated per fabric care label",
        "Delicates and silks are hand-finished",
        "Stains are pre-treated before main washing cycles",
        "Garments are steam ironed and packed in breathable covers"
    ]

    faqs = content_doc.get("faq") if content_doc else [
        {"question": "How is the order verified?", "answer": "Garments are inspected and counted at pickup on a calibrated scale."},
        {"question": "What is the turnaround time?", "answer": f"Standard turnaround is {turnaround}. Express service is also available."},
        {"question": "Is pickup and delivery included?", "answer": "Yes, QuickPress riders handle pickup from and delivery back to your doorstep."}
    ]

    return {
        "id": match.id,
        "slug": match.id,
        "name": match.name or getattr(match, "title", "Service"),
        "description": match.description,
        "tagline": getattr(match, "tagline", "Expert care for your garments"),
        "icon": getattr(match, "icon", "sparkles"),
        "imageUrl": getattr(match, "image", None) or getattr(match, "imageUrl", ""),
        "turnaround": turnaround,
        "popular": getattr(match, "popular", False),
        "careInstructions": care_instructions,
        "faqs": faqs,
        "suitableItems": [
            "Shirts & T-shirts", "Trousers & Jeans", "Kurtas & Sarees",
            "Bed sheets & Linen", "Suits & Blazers", "Delicates & Woolens"
        ],
        "workflow": [
            {"step": "01", "title": "Doorstep Pickup", "desc": "Delivery rider collects your garments at your chosen slot."},
            {"step": "02", "title": "Inspection & Sorting", "desc": "Pre-treatment check for fabric type, color, and stains."},
            {"step": "03", "title": "Professional Care", "desc": "Washed, dry cleaned, or steam-pressed per garment specifications."},
            {"step": "04", "title": "Safe Delivery", "desc": "Freshly packed and delivered back to your home."}
        ]
    }


# =========================================================================
#  3. Public Cities & Service Coverage
# =========================================================================

@router.get("/cities")
async def get_public_cities() -> List[Dict[str, Any]]:
    """Return active published operating cities approved in the Admin Panel."""
    cities_docs = await database.find_many("admin_cities")
    if not cities_docs:
        cities_docs = await database.find_many("cities")
    
    # Filter ONLY approved / active / live / pilot cities
    active_cities = [
        c for c in (cities_docs or [])
        if str(c.get("status", "Live")).strip().lower() in ["live", "active", "pilot", "approved"]
    ]
    
    if not active_cities:
        return []

    # Fetch any granular sub-zones from admin_areas collection
    admin_areas = await database.find_many("admin_areas")

    results = []
    for c in active_cities:
        c_name = c.get("city") or c.get("name") or "Kasganj"
        cid = str(c.get("_id") or c.get("id") or c_name.lower())
        
        # Extract zone / locality names configured by Admin
        localities = []
        if isinstance(c.get("zones"), list) and c.get("zones"):
            for z in c["zones"]:
                if isinstance(z, dict):
                    name = z.get("name") or z.get("sector")
                    if name and name not in localities:
                        localities.append(name)
                elif isinstance(z, str) and z not in localities:
                    localities.append(z)
        elif isinstance(c.get("areas"), list) and c.get("areas"):
            for a in c["areas"]:
                if isinstance(a, str) and a not in localities:
                    localities.append(a)

        # Match from admin_areas collection
        for a in (admin_areas or []):
            if (a.get("cityId") == cid or str(a.get("city", "")).lower() == c_name.lower()) and str(a.get("status", "Live")).lower() in ["live", "active"]:
                area_name = a.get("area") or a.get("name")
                if area_name and area_name not in localities:
                    localities.append(area_name)

        if not localities:
            localities = ["City Center", "Main Market", "Railway Road", "Awas Vikas", "Central Hub"]

        results.append({
            "id": cid,
            "slug": c.get("slug") or cid.lower(),
            "name": c_name,
            "city": c_name,
            "state": c.get("state") or "Uttar Pradesh",
            "status": "Live",
            "areas": localities,
            "pickupRadius": c.get("pickupRadius") or "5 km",
            "deliveryRadiusKm": c.get("deliveryRadiusKm") or 8,
            "tagline": f"Doorstep laundry & dry cleaning across {c_name}",
            "availableServices": [
                "Wash & Fold", "Dry Cleaning", "Steam Iron", "Shoe Care", "Express 24H"
            ]
        })
    return results


@router.get("/cities/{slug}")
async def get_public_city_detail(slug: str) -> Dict[str, Any]:
    cities = await get_public_cities()
    match = next((c for c in cities if c["slug"] == slug or c["id"] == slug), None)
    if not match:
        raise HTTPException(status_code=404, detail="Service city not found or currently inactive.")
    return {
        **match,
        "description": f"QuickPress operates reliable door-to-door laundry and dry cleaning services across {match['name']}. Connect with top neighbourhood laundries and enjoy fast doorstep pickup and delivery.",
        "operatingHours": "7 Days a week · 8:00 AM – 8:00 PM",
        "turnaround": "Standard: 24-48 Hours | Express: Same Day / Next Morning"
    }


# =========================================================================
#  4. Public VIP Membership Information
# =========================================================================

@router.get("/membership")
async def get_public_membership() -> Dict[str, Any]:
    """Return public VIP club highlights without exposing internal financial formulas."""
    plan_docs = await membership_repository._plan_documents()
    public_plans = []
    for p in plan_docs:
        public_plans.append({
            "id": str(p.get("_id")),
            "name": str(p.get("name")),
            "tagline": str(p.get("tagline") or "VIP Club Experience"),
            "monthlyPrice": int(p.get("monthly_price") or 0),
            "yearlyPrice": int(p.get("yearly_price") or 0),
            "validityDays": int(p.get("validity_days") or 30),
            "popular": bool(p.get("popular")),
            "badge": str(p.get("badge") or ""),
            "benefits": [
                "Unlimited Zero-Fee Delivery" if p.get("free_pickup") or int(p.get("monthly_price") or 0) > 0 else "Standard Delivery",
                "Priority Express Processing" if p.get("priority_processing") else "Standard Turnaround",
                f"{p.get('discount_percent', 0)}% Exclusive Member Savings" if int(p.get("discount_percent") or 0) > 0 else "Standard Rates",
                f"{p.get('support_tier', 'Standard')} Customer Support Line",
                "Complimentary Garment Protection Coverage"
            ]
        })
    return {
        "title": "QuickPress VIP Club",
        "tagline": "Elevate your laundry experience with exclusive privileges and zero delivery fees.",
        "plans": public_plans,
        "features": [
            {"title": "Free Delivery Always", "desc": "Never pay standard delivery or surge fees on eligible orders."},
            {"title": "Priority Processing", "desc": "Your garments skip the queue and get processed first."},
            {"title": "Exclusive Discounts", "desc": "Special promotional rates and member-only coupons."},
            {"title": "Priority Support", "desc": "Dedicated assistance on WhatsApp and phone lines."}
        ]
    }


# =========================================================================
#  5. Public FAQs
# =========================================================================

@router.get("/faqs")
async def get_public_faqs(category: Optional[str] = Query(None)) -> List[Dict[str, Any]]:
    return await cms_repo.get_published_faqs(category)


# =========================================================================
#  6. Public Brand & Contact Settings
# =========================================================================

@router.get("/settings")
async def get_public_website_settings() -> Dict[str, Any]:
    return await cms_repo.get_website_settings()


@router.get("/company-profile")
async def get_public_company_profile() -> Dict[str, Any]:
    """Publicly accessible endpoint for apps and websites to render official company name, GSTIN, CIN, address, and legal links."""
    from app.db.admin_repositories import get_company_legal_profile
    return await get_company_legal_profile()


# =========================================================================
#  7. Public Landing Page & Testimonials (CMS-backed)
# =========================================================================

@router.get("/landing-content")
async def get_public_landing_content() -> Dict[str, Any]:
    return await cms_repo.get_landing_content()


@router.get("/testimonials")
async def get_public_testimonials() -> List[Dict[str, Any]]:
    return await cms_repo.list_testimonials(published_only=True)


# =========================================================================
#  8. Public Inbound Contact Form
# =========================================================================

@router.post("/contact")
async def submit_public_contact(payload: ContactFormPayload) -> Dict[str, Any]:
    # Basic phone format check
    clean_phone = re.sub(r"[^\d+]", "", payload.phone)
    if len(clean_phone) < 10:
        raise HTTPException(status_code=422, detail="Please enter a valid 10-digit Indian phone number.")

    return await cms_repo.save_contact_message(
        name=payload.name,
        email=payload.email,
        phone=clean_phone,
        subject=payload.subject,
        message=payload.message
    )


# =========================================================================
#  9. Public Mobile App Download Link Dispatcher (Email-only for 3 Apps)
# =========================================================================

class AppLinkEmailPayload(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    apps: List[str] = Field(default=["customer", "partner", "rider"])


@router.post("/send-app-link")
async def send_app_download_link(payload: AppLinkEmailPayload) -> Dict[str, Any]:
    """Send official direct download links for QuickPress Customer, Partner, and Captain Apps."""
    normalized_email = payload.email.strip().lower()
    chosen_apps = [a.lower().strip() for a in payload.apps] or ["customer", "partner", "rider"]

    lead_doc = {
        "email": normalized_email,
        "apps": chosen_apps,
        "status": "sent",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": "website_get_app_section"
    }

    try:
        await database.insert_one("app_download_leads", lead_doc)
    except Exception as e:
        logger.warning(f"Could not record app download lead: {e}")

    # Format human-friendly app names
    app_names = []
    if "customer" in chosen_apps:
        app_names.append("Customer App")
    if "partner" in chosen_apps:
        app_names.append("Partner Hub App")
    if "rider" in chosen_apps or "captain" in chosen_apps:
        app_names.append("Captain Fleet App")

    return {
        "success": True,
        "message": f"Download links for {', '.join(app_names)} have been sent to {normalized_email}!",
        "apps": chosen_apps,
        "links": {
            "customer": "/apks/QuickPress-Customer.apk",
            "partner": "/apks/QuickPress-Partner.apk",
            "captain": "/apks/QuickPress-Captain.apk",
            "playStore": "https://play.google.com"
        }
    }


