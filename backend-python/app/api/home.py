"""Customer Home API — Sprint 2.1.

    GET /api/home         aggregate payload for the Home screen
    GET /api/banners      slider banners, ordered by priority
    GET /api/categories   active service categories
    GET /api/services     service cards (?categoryId=, ?popular=true)
    GET /api/partners     partner cards (?city=), nearest first
    GET /api/offers       active coupons
    GET /api/profile      signed-in customer profile

Only `/api/profile` and the profile block of `/api/home` require a bearer
token; the catalog reads stay public so the Home screen renders for guests.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.deps import current_user
from app.core.security import decode_token
from app.db.catalog_repositories import catalog
from app.db.client import database
from app.db.repositories import users
from app.models.catalog import (
    BannerResponse,
    CategoryResponse,
    HomeResponse,
    LocationResponse,
    OfferResponse,
    OffersPageResponse,
    PartnerCardResponse,
    ProfileResponse,
    ServiceCardResponse,
)
from app.models.user import User

router = APIRouter(tags=["home"])
optional_bearer = HTTPBearer(auto_error=False)

GUEST_PROFILE = ProfileResponse(name="Guest", initials="G", unreadNotifications=0)
DEFAULT_LOCATION = LocationResponse(area="Awas Vikas", city="Kasganj", state="Uttar Pradesh")


def _initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    return "".join(part[0].upper() for part in parts[:2]) or "G"


def _profile(user: User) -> ProfileResponse:
    name = getattr(user, "display_name", None) or getattr(user, "name", None) or "Customer"
    return ProfileResponse(
        id=user.id,
        name=name,
        initials=_initials(name),
        avatarUrl=getattr(user, "photo_url", None),
        phone=getattr(user, "phone", None),
        unreadNotifications=0,
    )


async def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
) -> Optional[User]:
    """Resolve the caller when a valid token is present, otherwise None."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        return await users.by_id(str(payload.get("sub")))
    except Exception:  # noqa: BLE001 — an invalid token is treated as a guest
        return None


@router.get("/banners", response_model=list[BannerResponse])
async def get_banners() -> list[BannerResponse]:
    return await catalog.banners()


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories() -> list[CategoryResponse]:
    return await catalog.categories()


@router.get("/services", response_model=list[ServiceCardResponse])
async def get_services(
    categoryId: Optional[str] = Query(default=None),
    popular: bool = Query(default=False),
    city: Optional[str] = Query(default=None),
    area: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
) -> list[ServiceCardResponse]:
    return await catalog.services(
        category_id=categoryId,
        popular_only=popular,
        city=city,
        area=area,
        lat=lat,
        lng=lng,
    )


@router.get("/services/popular", response_model=list[ServiceCardResponse])
async def get_popular_services(
    city: Optional[str] = Query(default=None),
    area: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
) -> list[ServiceCardResponse]:
    return await catalog.services(
        popular_only=True,
        city=city,
        area=area,
        lat=lat,
        lng=lng,
    )


@router.get("/partners/nearby", response_model=list[PartnerCardResponse])
async def get_nearby_partners(
    city: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
    area: Optional[str] = Query(default=None),
    limit: int = Query(default=10),
) -> list[PartnerCardResponse]:
    return await catalog.partners(city=city, lat=lat, lng=lng, area=area, limit=limit)


@router.get("/offers/page", response_model=OffersPageResponse)
async def get_offers_page(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
) -> OffersPageResponse:
    user_id = None
    if credentials and credentials.credentials:
        try:
            token_data = decode_token(credentials.credentials, expected_type="access")
            if token_data:
                user_id = token_data.get("sub")
        except Exception:
            user_id = None
    return await catalog.offers_page(user_id=user_id)


@router.get("/offers", response_model=list[OfferResponse])
async def get_offers() -> list[OfferResponse]:
    return await catalog.offers()


@router.get("/coupons", response_model=list[OfferResponse])
async def get_coupons() -> list[OfferResponse]:
    return await catalog.offers()


@router.post("/offers/{code}/apply")
@router.post("/coupon/apply")
async def apply_coupon_endpoint(
    code: Optional[str] = None,
    body: Optional[dict] = None,
) -> dict:
    code_target = (code or (body.get("code") or body.get("couponCode") if body else "") or "").strip().upper()
    cart_total = float((body.get("cartTotal") or body.get("subtotal") or body.get("amount") or 0.0) if body else 0.0)
    customer_city = str((body.get("city") or "") if body else "").strip().lower()
    customer_pincode = str((body.get("pincode") or "") if body else "").strip()
    user_id = str((body.get("userId") or body.get("customerId") or "") if body else "")

    if not code_target:
        return {"ok": False, "discount": 0, "message": "Please enter a valid coupon code."}

    admin_docs = await database.find_many("admin_coupons")
    if not admin_docs:
        admin_docs = await database.find_many("coupons")

    matched = next(
        (c for c in (admin_docs or []) if str(c.get("code", "")).strip().upper() == code_target),
        None,
    )

    if not matched:
        return {"ok": False, "discount": 0, "message": f"Coupon code '{code_target}' is invalid."}

    # Status check
    if str(matched.get("status", "Active")).lower() not in ("active", "live"):
        return {"ok": False, "discount": 0, "message": f"Coupon '{code_target}' is currently inactive or expired."}

    # Minimum order check
    min_order = float(matched.get("minOrder") or 0.0)
    if cart_total > 0 and cart_total < min_order:
        return {
            "ok": False,
            "discount": 0,
            "message": f"Minimum order value for '{code_target}' is ₹{int(min_order)} (current cart: ₹{int(cart_total)}).",
        }

    # City-wise targeting check
    coupon_cities = [str(c).strip().lower() for c in (matched.get("cities") or []) if str(c).strip()]
    if coupon_cities and customer_city:
        if customer_city not in coupon_cities:
            city_names = ", ".join(c.capitalize() for c in (matched.get("cities") or []))
            return {
                "ok": False,
                "discount": 0,
                "message": f"Coupon '{code_target}' is exclusively available in {city_names}.",
            }

    # Pincode-wise targeting check
    coupon_pincodes = [str(p).strip() for p in (matched.get("pincodes") or []) if str(p).strip()]
    if coupon_pincodes and customer_pincode:
        if customer_pincode not in coupon_pincodes:
            return {
                "ok": False,
                "discount": 0,
                "message": f"Coupon '{code_target}' is not serviceable in PIN {customer_pincode}.",
            }

    # Per-user limit check
    per_user_limit = int(matched.get("perUserLimit") or 1)
    if user_id:
        user_redemptions = await database.count(
            "coupon_redemptions",
            {"$or": [{"couponCode": code_target}, {"couponId": matched.get("_id")}], "userId": user_id},
        )
        if user_redemptions >= per_user_limit:
            return {
                "ok": False,
                "discount": 0,
                "message": f"You have already reached the maximum limit ({per_user_limit}x) for coupon '{code_target}'.",
            }

    # Calculate accurate discount
    c_type = str(matched.get("type", "percentage")).lower()
    pct = float(matched.get("discountPct") or 0)
    max_discount = float(matched.get("maxDiscount") or 0) if matched.get("maxDiscount") else None
    flat_discount = float(matched.get("flatDiscount") or matched.get("maxDiscount") or 0)

    calculated_discount = 0.0
    if c_type == "percentage":
        if cart_total > 0 and pct > 0:
            calculated_discount = (cart_total * pct) / 100.0
            if max_discount is not None and max_discount > 0:
                calculated_discount = min(calculated_discount, max_discount)
        else:
            calculated_discount = max_discount or 50.0
    elif c_type == "flat":
        calculated_discount = flat_discount or 100.0
    elif c_type == "free_delivery":
        calculated_discount = float(matched.get("maxDiscount") or 40.0)
    else:
        calculated_discount = 50.0

    return {
        "ok": True,
        "code": code_target,
        "discount": round(calculated_discount, 2),
        "discountType": c_type,
        "type": c_type,
        "couponId": str(matched.get("_id")),
        "description": matched.get("description") or matched.get("value") or "",
        "message": f"Coupon {code_target} applied! You save ₹{round(calculated_discount, 2)}.",
    }


@router.get("/app-meta")
async def get_app_meta() -> dict:
    return {
        "appVersion": "1.0.0",
        "memberSince": "Aug 2026",
        "supportPhone": "+91 80 4000 5000",
        "supportEmail": "support@quickpress.in",
    }


@router.get("/location", response_model=LocationResponse)
async def get_location() -> LocationResponse:
    return DEFAULT_LOCATION


@router.get("/home", response_model=HomeResponse)
async def get_home(
    city: Optional[str] = Query(default=None),
    area: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
    user: Optional[User] = Depends(optional_user),
) -> HomeResponse:
    """Single round-trip payload behind the Customer Home screen."""
    banners = await catalog.banners()
    categories = await catalog.categories()
    services = await catalog.services(city=city, area=area, lat=lat, lng=lng)
    partners = await catalog.partners(city=city, area=area, lat=lat, lng=lng)
    offers = await catalog.offers()

    current_loc = LocationResponse(
        area=area or "Awas Vikas",
        city=city or "Kasganj",
        state="Uttar Pradesh",
        latitude=lat,
        longitude=lng,
    ) if (city or area or lat or lng) else DEFAULT_LOCATION

    return HomeResponse(
        profile=_profile(user) if user else GUEST_PROFILE,
        location=current_loc,
        banners=banners,
        categories=categories,
        services=services,
        popularServices=[service for service in services if service.popular],
        recommendedServices=[service for service in services if not service.popular][:4],
        partners=partners,
        offers=offers,
        unreadNotifications=0,
    )


@router.get("/recommendations")
async def get_recommendations() -> list[dict]:
    return [
        {"id": "rec-1", "title": "5-Shirt Steam Iron Combo", "reason": "Based on your recent dry cleaning", "price": 199, "icon": "shirt"},
        {"id": "rec-2", "title": "Weekend Bedding Refresh", "reason": "Popular in your neighbourhood", "price": 449, "icon": "bed"},
        {"id": "rec-3", "title": "Express Shoe Spa", "reason": "Monsoon essential", "price": 299, "icon": "footprints"},
        {"id": "rec-4", "title": "Curtain Deep Clean", "reason": "Special 20% off", "price": 599, "icon": "home"},
    ]


def format_real_order_status(raw: str) -> str:
    if not raw:
        return "Order Placed"
    r = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "placed": "Order Placed",
        "order_placed": "Order Placed",
        "pending": "Order Placed",
        "pending_partner_acceptance": "Awaiting Confirmation",
        "partner_accepted": "Store Accepted",
        "accepted": "Accepted",
        "pickup_rider_assigned": "Pickup Driver Assigned",
        "pickup_assigned": "Pickup Driver Assigned",
        "pickup_rider_accepted": "Driver On The Way",
        "driver_arrived": "Driver Arrived",
        "pickup_otp": "Pickup Verification",
        "picked_up": "Picked Up",
        "pickup_completed": "Picked Up",
        "in_store": "Received at Store",
        "processing": "Washing & Cleaning",
        "cleaning": "Washing & Cleaning",
        "washing": "Washing",
        "ironing": "Ironing & Pressing",
        "ready": "Ready for Delivery",
        "ready_for_delivery": "Ready for Delivery",
        "delivery_rider_assigned": "Delivery Driver Assigned",
        "delivery_assigned": "Delivery Driver Assigned",
        "delivery_rider_accepted": "Out for Delivery",
        "out_for_delivery": "Out for Delivery",
        "delivery_otp": "Delivery Verification",
        "delivered": "Delivered",
        "completed": "Delivered",
        "cancelled": "Cancelled",
        "canceled": "Cancelled",
        "failed": "Cancelled",
    }
    if r in mapping:
        return mapping[r]
    return raw.replace("_", " ").title()


@router.get("/orders/recent")
async def get_recent_orders(user: Optional[User] = Depends(optional_user)) -> list[dict]:
    if user:
        from app.db.order_repositories import order_repository
        try:
            orders = await order_repository.list(user.id)
            if orders:
                result = []
                for o in orders[:5]:
                    if hasattr(o, "id"):
                        raw_status = str(getattr(o, "status", "")).strip()
                        status_str = format_real_order_status(raw_status)
                        result.append({
                            "id": o.id,
                            "reference": getattr(o, "code", o.id[:8]),
                            "title": getattr(o.partner, "name", "Laundry Order") if hasattr(o, "partner") else "Laundry Order",
                            "items": f"{len(getattr(o, 'items', []))} items",
                            "placed": str(getattr(o, "createdAt", "Recently"))[:10],
                            "status": status_str,
                            "rawStatus": raw_status,
                            "total": float(getattr(o.totals, "grandTotal", 0) if hasattr(o, "totals") else 0),
                        })
                    elif isinstance(o, dict):
                        raw_status = str(o.get("status") or "").strip()
                        status_str = format_real_order_status(raw_status)
                        result.append({
                            "id": o.get("id") or o.get("_id"),
                            "reference": o.get("code") or (o.get("id") or o.get("_id"))[:8],
                            "title": (o.get("partner") or {}).get("name") or "Laundry Order",
                            "items": f"{len(o.get('items', []))} items",
                            "placed": str(o.get("createdAt") or "Recently")[:10],
                            "status": status_str,
                            "rawStatus": raw_status,
                            "total": float(o.get("totals", {}).get("grandTotal") or o.get("total") or 0),
                        })
                return result
        except Exception:
            return []
    return []


@router.get("/locations")
async def get_locations(creds: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer)) -> dict:
    from app.db.client import database
    saved_places = []
    if creds and creds.credentials:
        try:
            payload = decode_token(creds.credentials, expected_type="access")
            user_id = payload.get("sub")
            if user_id:
                user_addresses = await database.find_many("customer_addresses", {"userId": user_id})
                for addr in user_addresses:
                    saved_places.append({
                        "id": str(addr.get("_id")),
                        "area": addr.get("area") or addr.get("street") or "Home",
                        "city": addr.get("city") or "Kasganj",
                        "state": addr.get("state") or "Uttar Pradesh",
                        "label": addr.get("label") or "Saved Address",
                        "type": addr.get("type") or "home",
                    })
        except Exception:
            pass

    admin_cities = await database.find_many("admin_cities")
    approved_live_cities = [
        c for c in admin_cities
        if str(c.get("status") or "").strip().lower() in ("live", "active", "approved")
    ]

    popular_places = [
        {
            "id": str(c.get("_id") or c.get("id")),
            "area": c.get("city") or "Kasganj",
            "city": c.get("city") or "Kasganj",
            "state": c.get("state") or "Uttar Pradesh",
        }
        for c in approved_live_cities
    ]

    all_active_profiles = await catalog._approved_partner_profiles()
    nearby_places = []
    for p in all_active_profiles:
        c = (p.get("city") or "").strip()
        a = (p.get("area") or "").strip()
        if c or a:
            nearby_places.append({
                "id": str(p.get("_id")),
                "area": a.split(",")[0].strip() if a else c,
                "city": c,
                "state": "Uttar Pradesh",
            })

    return {
        "recent": saved_places[:2],
        "saved": saved_places,
        "nearby": nearby_places if nearby_places else popular_places,
        "popular": popular_places,
    }


@router.get("/locations/search")
async def search_locations(q: str = Query(default="")) -> list[dict]:
    from app.db.client import database
    query = q.lower().strip()
    admin_cities = await database.find_many("admin_cities")
    approved_live_cities = [
        c for c in admin_cities
        if str(c.get("status") or "").strip().lower() in ("live", "active", "approved")
    ]

    popular_places = [
        {
            "id": str(c.get("_id") or c.get("id")),
            "area": c.get("city") or "Kasganj",
            "city": c.get("city") or "Kasganj",
            "state": c.get("state") or "Uttar Pradesh",
        }
        for c in approved_live_cities
    ]

    if not query:
        return popular_places

    return [
        p for p in popular_places
        if query in p["area"].lower() or query in p["city"].lower() or query in p["state"].lower()
    ]
