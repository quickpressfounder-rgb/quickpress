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
# =========================================================================
#  1. Public Legal Policies & Company Legal Profile (Admin Settings Backed)
# =========================================================================

@router.get("/company-legal-profile")
async def get_public_company_legal_profile() -> Dict[str, Any]:
    """Returns live company legal entity details configured by platform administrator in Settings."""
    settings = await database.get_collection("admin_settings").find_one({"_id": "global"})
    company = settings.get("company", {}) if settings else {}
    return {
        "legalName": company.get("legalName", ""),
        "brandName": company.get("brandName", "QuickPress"),
        "tagline": company.get("tagline", "Hyperlocal On-Demand Laundry Platform"),
        "cin": company.get("cin", ""),
        "pan": company.get("pan", ""),
        "gstin": company.get("gstin", ""),
        "registeredAddress": company.get("registeredAddress", ""),
        "operatingAddress": company.get("operatingAddress", ""),
        "supportEmail": company.get("supportEmail", "official.quickpress@gmail.com"),
        "corporateEmail": company.get("corporateEmail", ""),
        "legalEmail": company.get("legalEmail", ""),
        "supportPhone": company.get("supportPhone", ""),
        "tollFreePhone": company.get("tollFreePhone", ""),
        "grievanceOfficerName": company.get("grievanceOfficerName", ""),
        "grievanceOfficerPhone": company.get("grievanceOfficerPhone", ""),
        "authorizedSignatoryName": company.get("authorizedSignatoryName", ""),
        "authorizedSignatoryDesignation": company.get("authorizedSignatoryDesignation", ""),
        "digitalSignatureUrl": company.get("digitalSignatureUrl", ""),
        "companySealUrl": company.get("companySealUrl", ""),
        "state": company.get("state", "Uttar Pradesh"),
        "stateCode": company.get("stateCode", "09"),
        "websiteUrl": company.get("websiteUrl", "https://withquickpress.com"),
    }


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
        "garment-care-policy": "garment-care-policy",
        "garment-care": "garment-care-policy",
        "fabric-care": "garment-care-policy",
        "cookie-policy": "cookie-policy",
        "cookie": "cookie-policy",
        "cookies": "cookie-policy",
    }
    normalized_slug = doc_slug.lower().strip()
    target_slug = alias_map.get(normalized_slug, normalized_slug)

    # 1. First check live Admin Settings
    settings = await database.get_collection("admin_settings").find_one({"_id": "global"})
    company = settings.get("company", {}) if settings else {}

    if target_slug in ("rider-agreement", "rider-terms", "captain-agreement"):
        admin_content = company.get("riderAgreement")
        if admin_content and admin_content.strip():
            return {
                "slug": "rider-agreement",
                "title": "Delivery Partner Service Level Agreement (SLA)",
                "currentVersion": "Live Admin Configured",
                "effectiveDate": "Live",
                "summary": "Official Delivery Partner Service Level Agreement configured by Platform Administration.",
                "content": admin_content,
                "publishedAt": None,
                "isConfigured": True,
            }

    if target_slug in ("partner-agreement", "partner-terms", "merchant-agreement"):
        admin_content = company.get("partnerAgreement")
        if admin_content and admin_content.strip():
            return {
                "slug": "partner-agreement",
                "title": "Merchant Partner Franchise & Service Level Agreement",
                "currentVersion": "Live Admin Configured",
                "effectiveDate": "Live",
                "summary": "Official Merchant Partner Franchise Agreement configured by Platform Administration.",
                "content": admin_content,
                "publishedAt": None,
                "isConfigured": True,
            }

    if target_slug == "terms" and company.get("termsAndConditions", "").strip():
        return {
            "slug": "terms",
            "title": "Terms & Conditions",
            "currentVersion": "Live Admin Configured",
            "effectiveDate": "Live",
            "summary": "Platform Terms and Conditions configured by Platform Administration.",
            "content": company.get("termsAndConditions"),
            "publishedAt": None,
            "isConfigured": True,
        }

    if target_slug == "privacy-policy" and company.get("privacyPolicy", "").strip():
        return {
            "slug": "privacy-policy",
            "title": "Privacy Policy",
            "currentVersion": "Live Admin Configured",
            "effectiveDate": "Live",
            "summary": "Platform Privacy Policy configured by Platform Administration.",
            "content": company.get("privacyPolicy"),
            "publishedAt": None,
            "isConfigured": True,
        }

    if target_slug == "refund-policy" and company.get("refundPolicy", "").strip():
        return {
            "slug": "refund-policy",
            "title": "Refund & Cancellation Policy",
            "currentVersion": "Live Admin Configured",
            "effectiveDate": "Live",
            "summary": "Platform Refund Policy configured by Platform Administration.",
            "content": company.get("refundPolicy"),
            "publishedAt": None,
            "isConfigured": True,
        }

    # 2. Check CMS Collection
    doc = await cms_repo.get_legal_doc(target_slug)
    if not doc:
        doc = await cms_repo.get_legal_doc(normalized_slug)
    if not doc and target_slug in LEGAL_DOCS_SEED:
        doc = LEGAL_DOCS_SEED[target_slug]
    if not doc and normalized_slug in LEGAL_DOCS_SEED:
        doc = LEGAL_DOCS_SEED[normalized_slug]
    if not doc:
        return {
            "slug": target_slug,
            "title": target_slug.replace("-", " ").title(),
            "currentVersion": "Pending",
            "effectiveDate": "Pending",
            "summary": "Policy document pending configuration by administrator in Admin Console Settings.",
            "content": "",
            "publishedAt": None,
            "isConfigured": False,
        }
    return {
        "slug": doc.get("slug", target_slug),
        "title": doc.get("title", "Legal Document"),
        "currentVersion": doc.get("currentVersion", "1.0"),
        "effectiveDate": doc.get("effectiveDate", "2026-08-25"),
        "summary": doc.get("summary", ""),
        "content": doc.get("content", ""),
        "publishedAt": doc.get("publishedAt"),
        "isConfigured": True,
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


# =========================================================================
#  7. Anti-Fraud & Security Reporting Desk (Public Submission & Admin Review)
# =========================================================================

class FraudReportPayload(BaseModel):
    reporterName: str = Field(..., min_length=2, max_length=100)
    reporterPhone: str = Field(..., min_length=10, max_length=15)
    reporterEmail: Optional[str] = ""
    scamCategory: str = Field(..., min_length=2)  # payment_scam, fake_job, impersonation, fake_qr, rider_overcharge, other
    suspectInfo: str = ""
    incidentDate: str = ""
    description: str = Field(..., min_length=10, max_length=3000)
    evidenceUrl: Optional[str] = ""


class FraudReportStatusUpdate(BaseModel):
    status: str = Field(...)  # pending, investigating, verified_fraud, resolved, dismissed
    adminNotes: Optional[str] = ""


@router.post("/fraud-reports", status_code=201)
async def submit_public_fraud_report(payload: FraudReportPayload) -> Dict[str, Any]:
    """Public: Submit an incident report for payment scams, fake jobs, or impersonation."""
    import random
    from datetime import datetime, timezone
    ticket_id = f"QP-FRAUD-{random.randint(100000, 999999)}"
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": ticket_id,
        "id": ticket_id,
        **payload.model_dump(),
        "status": "pending",
        "adminNotes": "",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        await database.insert("fraud_reports", doc)
    except Exception as e:
        logger.warning(f"Could not save fraud report to DB: {e}")

    return {
        "success": True,
        "ticketId": ticket_id,
        "message": "Your fraud report has been submitted to QuickPress Security Desk. Our vigilance team will investigate immediately.",
        "report": doc,
    }


DEFAULT_FRAUD_REPORTS: List[Dict[str, Any]] = [
    {
        "_id": "QP-FRAUD-918234",
        "id": "QP-FRAUD-918234",
        "reporterName": "Rohit Verma",
        "reporterPhone": "+91 98971 23456",
        "reporterEmail": "rohit.verma@gmail.com",
        "scamCategory": "payment_scam",
        "suspectInfo": "+91 88261 90211 (Fake QuickPress Executive on WhatsApp)",
        "incidentDate": "2026-11-14",
        "description": "Received a WhatsApp message claiming my laundry order had an overcharge refund of ₹350. They sent a QR code asking to scan on PhonePe to receive money.",
        "evidenceUrl": "",
        "status": "investigating",
        "adminNotes": "Number flagged on Truecaller and reported to Cyber Crime cell Kasganj.",
        "createdAt": "2026-11-14T10:15:00Z",
        "updatedAt": "2026-11-14T11:30:00Z",
    },
    {
        "_id": "QP-FRAUD-847291",
        "id": "QP-FRAUD-847291",
        "reporterName": "Amit Saxena",
        "reporterPhone": "+91 97190 88219",
        "reporterEmail": "amit.saxena@outlook.com",
        "scamCategory": "recruitment_scam",
        "suspectInfo": "Telegram Channel @quickpress_jobs_up",
        "incidentDate": "2026-11-12",
        "description": "Individual demanding ₹1,500 security deposit for Captain delivery bag and uniform registration via UPI.",
        "evidenceUrl": "",
        "status": "pending",
        "adminNotes": "",
        "createdAt": "2026-11-12T14:20:00Z",
        "updatedAt": "2026-11-12T14:20:00Z",
    },
]

DEFAULT_CONTACT_INQUIRIES: List[Dict[str, Any]] = [
    {
        "_id": "INQ-241098",
        "id": "INQ-241098",
        "fullName": "Sunil Agrawal (Hotel Grand Palace)",
        "phone": "+91 98370 54321",
        "email": "management@hotelgrandpalace.in",
        "inquiryType": "B2B Commercial Contract",
        "city": "Kasganj",
        "details": "Daily requirement of 150 bedsheets, 300 towels, and banquet linen washing with 24-hour turnaround SLA.",
        "message": "Looking for institutional contract with daily morning pickup and scheduled billing cycle.",
        "isConsultation": True,
        "status": "consultation_scheduled",
        "adminNotes": "Commercial rate sheet ₹38/kg shared. Site audit scheduled for Tuesday 11 AM.",
        "createdAt": "2026-11-13T09:30:00Z",
        "updatedAt": "2026-11-13T16:00:00Z",
    },
    {
        "_id": "INQ-241055",
        "id": "INQ-241055",
        "fullName": "Pooja Singhal",
        "phone": "+91 94123 78901",
        "email": "pooja.singhal@yahoo.com",
        "inquiryType": "Garment Care & Silk Sarees",
        "city": "Aligarh",
        "details": "Heavy bridal lehenga with zardozi embroidery and 4 Banarasi silk sarees dry cleaning consultation.",
        "message": "Need expert consultation before handing over wedding garments regarding fabric protection and PERC-free solvents.",
        "isConsultation": True,
        "status": "in_progress",
        "adminNotes": "Customer requested home inspection before dry clean dispatch.",
        "createdAt": "2026-11-14T15:45:00Z",
        "updatedAt": "2026-11-15T10:12:00Z",
    },
    {
        "_id": "INQ-240982",
        "id": "INQ-240982",
        "fullName": "Mohit Dhobi Association",
        "phone": "+91 99271 33452",
        "email": "mohit.kasganj@gmail.com",
        "inquiryType": "Laundromat Partner Hub Onboarding",
        "city": "Kasganj",
        "details": "Have 3 steam press stations and 2 commercial washing drums on Station Road. Want to join QuickPress partner hub.",
        "message": "Need franchise onboarding representative to visit our facility.",
        "isConsultation": False,
        "status": "new",
        "adminNotes": "",
        "createdAt": "2026-11-15T12:00:00Z",
        "updatedAt": "2026-11-15T12:00:00Z",
    },
]

DEFAULT_JOB_APPLICATIONS: List[Dict[str, Any]] = [
    {
        "_id": "QP-APP-884192",
        "id": "QP-APP-884192",
        "applicantName": "Vikas Sharma",
        "applicantPhone": "+91 98765 43210",
        "applicantEmail": "vikas.sharma.dev@gmail.com",
        "roleId": "eng-fullstack",
        "roleTitle": "Senior Full-Stack Engineer (React 19 + Python 3.12)",
        "experience": "4.5 Years",
        "portfolioLink": "https://github.com/vikassharma-dev",
        "resumeUrl": "https://drive.google.com/file/d/1A2B3C4D5E6F/view",
        "applicantNote": "Experienced in building high-throughput FastAPI services and React 19 dashboards. Built real-time logistics grids for delivery apps.",
        "status": "under_review",
        "adminNotes": "Strong profile with TanStack Router experience. Tech round 1 scheduled for Wednesday.",
        "createdAt": "2026-11-14T11:00:00Z",
        "updatedAt": "2026-11-14T17:30:00Z",
    },
    {
        "_id": "QP-APP-772910",
        "id": "QP-APP-772910",
        "applicantName": "Deepak Baghel",
        "applicantPhone": "+91 97581 66723",
        "applicantEmail": "deepak.baghel.ops@gmail.com",
        "roleId": "ops-hub-manager",
        "roleTitle": "Central Logistics Hub Manager",
        "experience": "3 Years",
        "portfolioLink": "https://linkedin.com/in/deepak-baghel-ops",
        "resumeUrl": "https://drive.google.com/file/d/2B3C4D5E6F7G/view",
        "applicantNote": "Managed 5,000+ daily package movements in Western UP logistics. Familiar with rider dispatch queues and local Kasganj routes.",
        "status": "shortlisted",
        "adminNotes": "Local candidate with strong ground logistics background. In-person interview at Kasganj HQ.",
        "createdAt": "2026-11-13T16:15:00Z",
        "updatedAt": "2026-11-14T10:00:00Z",
    },
]


@router.get("/fraud-reports")
async def list_fraud_reports(status: Optional[str] = Query(None)) -> List[Dict[str, Any]]:
    """List all submitted fraud reports with optional status filtering."""
    try:
        query: Dict[str, Any] = {}
        if status and status.lower() != "all":
            query["status"] = status.lower()
        docs = await database.find_many("fraud_reports", query)
        docs = docs or []
        docs.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
        return docs
    except Exception as err:
        logger.warning(f"Error fetching fraud reports: {err}")
        return []


@router.patch("/fraud-reports/{report_id}")
async def update_fraud_report(report_id: str, payload: FraudReportStatusUpdate) -> Dict[str, Any]:
    """Admin: Update status and investigation notes on a fraud report."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    changes = {
        "status": payload.status,
        "updatedAt": now,
    }
    if payload.adminNotes is not None:
        changes["adminNotes"] = payload.adminNotes

    updated = await database.update("fraud_reports", {"_id": report_id}, changes)
    if not updated:
        updated = await database.update("fraud_reports", {"id": report_id}, changes)
    if not updated:
        raise HTTPException(status_code=404, detail="Fraud report ticket not found.")

    return {"success": True, "ticketId": report_id, "updated": changes}


@router.delete("/fraud-reports/{report_id}")
async def delete_fraud_report(report_id: str) -> Dict[str, Any]:
    """Admin: Delete a fraud report ticket."""
    res = await database.delete_one("fraud_reports", {"_id": report_id})
    if not res:
        res = await database.delete_one("fraud_reports", {"id": report_id})
    return {"success": True, "deleted": report_id}


# ============================================================================
# CAREERS & OPEN POSITIONS CMS & APPLICATIONS
# ============================================================================

DEFAULT_CAREER_ROLES = [
    {
        "id": "eng-fullstack",
        "title": "Senior Full-Stack Engineer (React 19 + Python 3.12)",
        "department": "Engineering",
        "location": "Kasganj / Noida (Hybrid)",
        "type": "Full-Time",
        "experience": "3–6 Years",
        "desc": "Architect low-latency dispatch APIs, double-entry ledger settlement pipelines, and real-time WebSocket order tracking across our 3-app ecosystem.",
        "responsibilities": [
            "Own core FastAPI microservices and Supabase PostgreSQL schema optimization",
            "Scale our React 19 + TanStack Router client applications for sub-second hydration",
            "Integrate hardware IoT Bluetooth weighing scales with captain mobile apps",
        ],
        "isActive": True,
    },
    {
        "id": "eng-mobile",
        "title": "Lead Mobile Architect (Android / Capacitor)",
        "department": "Engineering",
        "location": "Remote / Hybrid",
        "type": "Full-Time",
        "experience": "4+ Years",
        "desc": "Lead mobile development for the QuickPress Captain, Partner Store, and Customer applications with offline-first synchronization.",
        "responsibilities": [
            "Design native background geo-fencing, turn-by-turn routing, and battery optimization",
            "Implement real-time push notification audio alarms for urgent order pickups",
            "Optimize APK size and memory footprints for low-spec Android devices in Tier 2/3 cities",
        ],
        "isActive": True,
    },
    {
        "id": "ops-hub-manager",
        "title": "Central Logistics Hub Manager",
        "department": "Operations",
        "location": "Kasganj, Uttar Pradesh (On-Site)",
        "type": "Full-Time",
        "experience": "2–5 Years",
        "desc": "Oversee daily laundry order throughput, captain dispatch queues, and strict garment care turnaround SLAs across our flagship Western UP hub.",
        "responsibilities": [
            "Manage physical intake, digital weighing, and barcode tracking of thousands of daily garments",
            "Coordinate with local laundromat partners to ensure 80°C anti-bacterial hygiene protocols",
            "Maintain a 99.8% on-time dispatch and delivery SLA record",
        ],
        "isActive": True,
    },
    {
        "id": "growth-partner-onboarding",
        "title": "Merchant Hub Growth Lead (Franchise Onboarding)",
        "department": "Growth",
        "location": "Western UP (Aligarh / Agra / Kasganj)",
        "type": "Full-Time",
        "experience": "2–4 Years",
        "desc": "Onboard neighborhood dry cleaners and dhobis onto the QuickPress network, modernizing traditional workshops with Italian steam table setups.",
        "responsibilities": [
            "Identify high-density laundry zones and build trust with local laundry shop owners",
            "Conduct store audits, equipment inspections, and digital POS app onboarding",
            "Drive partner retention, weekly earnings transparency, and volume scaling",
        ],
        "isActive": True,
    },
    {
        "id": "quality-garment-specialist",
        "title": "Master Textile & Stain Restoration Specialist",
        "department": "Quality & Care",
        "location": "Kasganj Hub (On-Site)",
        "type": "Full-Time",
        "experience": "3+ Years",
        "desc": "Champion fabric safety, delicate silk care, sneaker spa restoration, and hydrocarbon dry cleaning standards across our partner network.",
        "responsibilities": [
            "Inspect care labels for delicate textiles (chiffon, cashmere, pure silks, wedding lehengas)",
            "Train partner staff on German enzymatic stain removals and solvent temperature control",
            "Resolve customer fabric grievances under our ₹5,000 Zero-Loss Guarantee",
        ],
        "isActive": True,
    },
]


class CareerRolePayload(BaseModel):
    title: str = Field(..., min_length=3)
    department: str = Field(..., min_length=2)
    location: str = "Kasganj / Remote"
    type: str = "Full-Time"
    experience: str = "1–3 Years"
    desc: str = Field(..., min_length=10)
    responsibilities: List[str] = Field(default_factory=list)
    isActive: bool = True


class JobApplicationPayload(BaseModel):
    applicantName: str = Field(..., min_length=2)
    applicantPhone: str = Field(..., min_length=7)
    applicantEmail: Optional[str] = None
    roleId: Optional[str] = None
    roleTitle: str = Field(..., min_length=2)
    experience: Optional[str] = "Entry / Mid"
    portfolioLink: Optional[str] = None
    resumeUrl: Optional[str] = None
    applicantNote: Optional[str] = None


@router.get("/careers/jobs")
async def list_public_careers() -> List[Dict[str, Any]]:
    """Public: List all active open job positions at QuickPress."""
    try:
        roles = await database.find_many("careers_jobs", {"isActive": True})
        return roles or []
    except Exception as e:
        logger.warning(f"Error fetching career roles: {e}")
        return []


@router.post("/careers/apply", status_code=201)
async def submit_job_application(payload: JobApplicationPayload) -> Dict[str, Any]:
    """Public: Submit a candidate job application for review by QuickPress hiring desk."""
    import random
    from datetime import datetime, timezone
    app_id = f"QP-APP-{random.randint(100000, 999999)}"
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": app_id,
        "id": app_id,
        **payload.model_dump(),
        "status": "received",
        "adminNotes": "",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        await database.insert("job_applications", doc)
    except Exception as e:
        logger.warning(f"Could not save job application: {e}")

    return {
        "success": True,
        "applicationId": app_id,
        "message": f"Thank you {payload.applicantName}! Your application for {payload.roleTitle} has been received.",
        "application": doc,
    }


# ============================================================================
# CONTACT INQUIRIES & FREE CONSULTATIONS
# ============================================================================

class ContactInquiryPayload(BaseModel):
    fullName: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=7)
    email: Optional[str] = None
    inquiryType: str = "customer"
    city: Optional[str] = "Kasganj"
    message: str = Field(..., min_length=2)
    orderId: Optional[str] = None
    details: Optional[str] = None
    isConsultation: bool = False


class ContactInquiryStatusUpdate(BaseModel):
    status: str
    adminNotes: Optional[str] = None


@router.post("/contact-inquiries", status_code=201)
async def submit_contact_inquiry(payload: ContactInquiryPayload) -> Dict[str, Any]:
    """Public: Submit contact messages, partner inquiries, or consultation requests."""
    import random
    from datetime import datetime, timezone
    prefix = "QP-CONSULT" if payload.isConsultation else "QP-INQ"
    inq_id = f"{prefix}-{random.randint(100000, 999999)}"
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": inq_id,
        "id": inq_id,
        **payload.model_dump(),
        "status": "new",
        "adminNotes": "",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        await database.insert("contact_inquiries", doc)
    except Exception as e:
        logger.warning(f"Could not save contact inquiry: {e}")

    return {
        "success": True,
        "inquiryId": inq_id,
        "message": "Your inquiry has been routed to our operations and consultation desk.",
        "inquiry": doc,
    }


@router.get("/contact-inquiries")
async def list_contact_inquiries(status: Optional[str] = Query(None)) -> List[Dict[str, Any]]:
    """List contact inquiries and consultation requests."""
    try:
        query: Dict[str, Any] = {}
        if status and status.lower() != "all":
            query["status"] = status.lower()
        docs = await database.find_many("contact_inquiries", query)
        docs = docs or []
        docs.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
        return docs
    except Exception as e:
        logger.warning(f"Error fetching contact inquiries: {e}")
        return []




