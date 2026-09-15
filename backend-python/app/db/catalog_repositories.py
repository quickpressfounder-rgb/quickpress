"""Catalog repository — Home screen reads.

Documents live in MongoDB (`banners`, `categories`, `services`,
`catalog_partners`, `offers`) and are seeded once on startup.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from app.db.catalog_seed import SEED
from app.db.client import database
from app.models.catalog import (
    BannerResponse,
    CategoryResponse,
    FilterGroupResponse,
    FilterOptionResponse,
    FilterOptionsResponse,
    GalleryImageResponse,
    OfferBanner,
    OfferResponse,
    OffersPageResponse,
    OpeningHour,
    PartnerCardResponse,
    PartnerDetailResponse,
    PartnerFeatureResponse,
    PartnerProfileResponse,
    PartnerReviewResponse,
    PartnerServiceResponse,
    PriceRowResponse,
    ReviewSummaryResponse,
    ScratchCard,
    SearchResultResponse,
    ServiceCardResponse,
    SpecialOffer,
)
from app.models.user import utcnow


class CatalogRepository:
    async def ensure_seed(self) -> None:
        """Upsert the seed documents. Safe (and idempotent) on every boot."""
        for name, documents in SEED.items():
            collection = database.collection(name)
            for document in documents:
                await collection.update_one(
                    {"_id": document["_id"]},
                    {"$set": {k: v for k, v in document.items() if k != "_id"}},
                    upsert=True,
                )

    async def banners(self) -> List[BannerResponse]:
        docs = await database.find_many("banners", sort_key="priority")
        if not docs:
            docs = SEED.get("banners", [])
        return [
            BannerResponse(
                id=str(d.get("_id") or d.get("id") or "b1"),
                eyebrow=str(d.get("eyebrow") or d.get("badge") or d.get("tagline") or ""),
                badge=str(d.get("badge") or d.get("eyebrow") or ""),
                title=str(d.get("title") or "QuickPress Laundry"),
                subtitle=str(d.get("subtitle") or d.get("description") or ""),
                cta=str(d.get("cta") or d.get("buttonText") or "Explore"),
                image=d.get("image") or d.get("imageUrl"),
                tone=str(d.get("tone") or "primary"),
                redirectUrl=d.get("redirectUrl") or d.get("actionUrl") or "/home",
                actionUrl=d.get("actionUrl") or d.get("redirectUrl") or "/home",
                priority=int(d.get("priority") or 99),
            )
            for d in docs
        ]


    async def categories(self) -> List[CategoryResponse]:
        try:
            docs = await database.find_many("categories", sort_key="sortOrder")
        except Exception:
            docs = []
        if not docs:
            docs = SEED.get("categories", [])

        res: List[CategoryResponse] = []
        for d in docs:
            if d.get("status", "active") == "inactive":
                continue
            cat_id = str(d.get("_id") or d.get("id") or "")
            if not cat_id:
                continue
            res.append(
                CategoryResponse(
                    id=cat_id,
                    title=str(d.get("title") or d.get("name") or "Laundry Service"),
                    description=str(d.get("description") or ""),
                    icon=str(d.get("icon") or "sparkles"),
                    image=str(d.get("image") or d.get("imageUrl") or ""),
                    sortOrder=int(d.get("sortOrder") or 99),
                    status=str(d.get("status") or "active"),
                )
            )

        if not res:
            res = [
                CategoryResponse(
                    id=str(c["_id"]),
                    title=str(c.get("title") or "Laundry"),
                    description=str(c.get("description") or ""),
                    icon=str(c.get("icon") or "sparkles"),
                    image=str(c.get("image") or ""),
                    sortOrder=int(c.get("sortOrder") or 99),
                    status="active",
                )
                for c in SEED.get("categories", [])
            ]
        return res

    async def services(
        self,
        *,
        category_id: Optional[str] = None,
        popular_only: bool = False,
        city: Optional[str] = None,
        area: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> List[ServiceCardResponse]:
        # 1. Fetch approved live partners
        all_approved = await self._approved_partner_profiles()
        if not all_approved:
            all_approved = await database.find_many("partner_profiles")

        # Filter by customer city / area if requested
        approved_partners = list(all_approved)
        city_clean = str(city or area or "").strip().lower()
        if city_clean:
            scoped = [
                p for p in all_approved
                if city_clean in str(p.get("city") or "").lower()
                or city_clean in str(p.get("area") or "").lower()
                or city_clean in str(p.get("address") or "").lower()
            ]
            if scoped:
                approved_partners = scoped

        total_partners = len(approved_partners) or 1
        approved_ids = {str(p["_id"]) for p in approved_partners}

        # 2. Fetch active partner services
        partner_services_docs = await database.find_many("partner_services")
        active_partner_services = [
            s for s in partner_services_docs
            if s.get("isActive", True) is not False
            and s.get("enabled", True) is not False
            and not s.get("pendingApproval", False)
            and s.get("approvalStatus", "approved") == "approved"
        ]

        # Prioritize services offered by partners in this city
        if approved_ids:
            city_services = [s for s in active_partner_services if str(s.get("partnerId")) in approved_ids]
            if city_services:
                active_partner_services = city_services

        cards: List[ServiceCardResponse] = []

        # Category mapping helper
        def _resolve_category(name: str, existing_cat: Optional[str]) -> str:
            if existing_cat and existing_cat in _ICONS:
                return existing_cat
            nl = name.lower()
            if "iron" in nl and "wash" not in nl:
                return "c3"
            if "dry" in nl or "suit" in nl:
                return "c2"
            if "shoe" in nl or "sneaker" in nl:
                return "c5"
            if "curtain" in nl:
                return "c6"
            if "blanket" in nl or "quilt" in nl:
                return "c7"
            if "carpet" in nl:
                return "c8"
            if "saree" in nl or "silk" in nl or "premium" in nl:
                return "c4"
            if "express" in nl:
                return "c9"
            return "c1"

        # Popularity score for ranking high selling services
        def _sales_rank(name: str) -> int:
            nl = name.lower()
            if "steam iron" in nl:
                return 100
            if "wash & fold" in nl:
                return 95
            if "wash & iron" in nl or "wash & steam" in nl:
                return 90
            if "dry clean" in nl or "suit" in nl:
                return 85
            if "shoe" in nl or "sneaker" in nl:
                return 80
            if "curtain" in nl:
                return 75
            if "saree" in nl:
                return 70
            if "express" in nl:
                return 65
            if "blanket" in nl:
                return 60
            return 50

        if active_partner_services:
            # Group services by normalized name
            grouped: Dict[str, List[Dict[str, Any]]] = {}
            for s in active_partner_services:
                key = str(s.get("name") or s.get("title") or s.get("_id")).strip().lower()
                grouped.setdefault(key, []).append(s)

            seen_keys = set()
            for s in active_partner_services:
                key = str(s.get("name") or s.get("title") or s.get("_id")).strip().lower()
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                siblings = grouped.get(key, [s])
                distinct_partner_ids = {str(item.get("partnerId")) for item in siblings if item.get("partnerId")}
                p_count = len(distinct_partner_ids) or max(1, total_partners)

                valid_prices = [int(item.get("price", 0)) for item in siblings if int(item.get("price", 0)) > 0]
                min_price = min(valid_prices) if valid_prices else int(s.get("price") or 49)
                discount = int(s.get("discountPercent") or 0)
                final_price = round(min_price * (100 - discount) / 100) if discount else min_price
                service_name = str(s.get("name") or s.get("title"))
                cat_id = _resolve_category(service_name, s.get("categoryId"))

                badge = None
                rank = _sales_rank(service_name)
                if rank >= 95:
                    badge = "Best Seller"
                elif rank >= 80:
                    badge = "Trending"

                partner_id_val = str(s.get("partnerId") or "")
                partner_doc = next((p for p in approved_partners if str(p.get("_id")) == partner_id_val or str(p.get("partnerId")) == partner_id_val), None)
                if not partner_doc and approved_partners:
                    partner_doc = approved_partners[0]
                    partner_id_val = str(partner_doc.get("_id") or "")
                partner_name_val = (partner_doc.get("businessName") or partner_doc.get("name")) if partner_doc else None

                card = ServiceCardResponse(
                    id=str(s.get("_id") or s.get("id")),
                    title=service_name,
                    name=service_name,
                    description=str(s.get("description") or f"Professional {service_name} by verified partner stores."),
                    icon=_ICONS.get(cat_id, "sparkles"),
                    image=s.get("image") or s.get("imageUrl"),
                    categoryId=cat_id,
                    unit=str(s.get("unit") or "piece"),
                    price=min_price,
                    basePrice=min_price,
                    discountPercent=discount,
                    discountLabel=f"{discount}% OFF" if discount else None,
                    finalPrice=final_price,
                    processingTime=str(s.get("processingTime") or s.get("turnaroundHours") or "24 hrs"),
                    partnerCount=p_count,
                    partnerId=partner_id_val or None,
                    partnerName=partner_name_val or None,
                    badge=badge,
                    popular=True,
                )
                cards.append(card)

            # Sort cards by sales demand rank
            cards.sort(key=lambda c: -_sales_rank(c.title))

        # Fallback to master catalog seed with real partner count
        if not cards:
            docs = await database.find_many("services")
            cards = [_service_card(d, total_partners) for d in docs]

        if category_id:
            cards = [card for card in cards if card.categoryId == category_id]
        if popular_only:
            cards = [card for card in cards if card.popular]

        return cards

    # ------------------------------------------------------------------
    # Sprint 2.2 — Partner Listing & Partner Details (Live MongoDB Atlas)
    # ------------------------------------------------------------------

    async def _approved_partner_profiles(self) -> List[Dict[str, Any]]:
        """Fetch all approved, verified, non-suspended real partner stores from MongoDB Atlas."""
        profiles = await database.find_many("partner_profiles")
        approved = []
        for p in profiles:
            st = str(p.get("status") or "").lower()
            if st not in ("active", "approved"):
                continue
            approved.append(p)
        return approved

    async def partner_cards(
        self,
        *,
        q: Optional[str] = None,
        city: Optional[str] = None,
        area: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        min_rating: float = 0,
        max_distance: float = 0,
        max_price: int = 0,
        max_pickup_minutes: int = 0,
        offers_only: bool = False,
        open_now: bool = False,
        sort: str = "recommended",
    ) -> List[PartnerCardResponse]:
        """GET /api/partners — filtered, sorted and searched live partner cards."""
        profiles = await self._approved_partner_profiles()
        cards: List[PartnerCardResponse] = []

        for p in profiles:
            pid = str(p["_id"])
            services_docs = await database.find_many("partner_services", {"partnerId": pid})
            active_services = [
                s for s in services_docs
                if s.get("isActive", True) is not False
                and s.get("enabled", True) is not False
                and not s.get("pendingApproval", False)
                and s.get("approvalStatus", "approved") == "approved"
            ]
            settings = await database.find_one("partner_settings", {"_id": pid}) or {}

            reviews_count = int(
                p.get("totalOrders")
                or p.get("reviewsCount")
                or p.get("ratingCount")
                or p.get("reviewCount")
                or 0
            )
            reviews = f"{reviews_count / 1000:.1f}k" if reviews_count >= 1000 else str(reviews_count)

            pickup = int(settings.get("pickupMinutes") or 30)
            is_open = bool(p.get("isOnline", True) and settings.get("isStoreOpen", True))
            banner = p.get("banner") or p.get("bannerUrl") or p.get("banner_url") or p.get("cover") or p.get("coverImage")
            logo = p.get("logo") or p.get("logoUrl") or p.get("logo_url") or p.get("photo_url") or p.get("image")
            image = banner or logo or "store-1"
            service_names = [s.get("name") for s in active_services if s.get("name")]
            min_price = min([int(s.get("price", 0)) for s in active_services if int(s.get("price", 0)) > 0] or [49])

            distance_km = float(p.get("distanceKm") or 1.5)
            p_lat = p.get("latitude")
            p_lng = p.get("longitude")
            if lat is not None and lng is not None and p_lat is not None and p_lng is not None:
                from app.core.maps import haversine_km
                distance_km = round(haversine_km((lat, lng), (float(p_lat), float(p_lng))), 1)

            card = PartnerCardResponse(
                id=pid,
                name=p.get("businessName") or p.get("name") or "QuickPress Partner",
                logo=logo or image,
                image=image,
                rating=float(p.get("rating") or 5.0),
                reviews=reviews,
                reviewsCount=reviews_count,
                distanceKm=distance_km,
                eta=f"{pickup} min pickup",
                pickupTime=f"{pickup} min",
                deliveryTime="24 hrs",
                minPrice=min_price,
                minOrderValue=int(p.get("minOrderValue") or 0),
                services=service_names,
                servicesCount=len(service_names),
                open=is_open,
                status="open" if is_open else "closed",
                city=str(p.get("city") or "").strip(),
                area=str(p.get("area") or p.get("address") or p.get("city") or "").strip(),
                cover=p.get("bannerUrl") or p.get("cover") or image,
                verified=bool(p.get("isVerified", True)),
                offerLabel=p.get("offerLabel"),
                popularity=int(p.get("totalOrders") or 0),
                joinedDaysAgo=int(p.get("joinedDaysAgo") or 30),
                pickupMinutes=pickup,
                tagline=p.get("tagline", "Professional Laundry & Dry Cleaning"),
            )
            cards.append(card)

        if q:
            needle = q.strip().lower()
            cards = [
                card
                for card in cards
                if needle in card.name.lower()
                or needle in card.city.lower()
                or needle in card.area.lower()
                or any(needle in service.lower() for service in card.services)
            ]
        if city:
            c_low = city.strip().lower()
            city_matched = [
                card
                for card in cards
                if (card.city and (c_low in card.city.lower() or card.city.lower() in c_low))
                or (card.area and c_low in card.area.lower())
            ]
            cards = city_matched
        elif area:
            a_low = area.strip().lower()
            area_matched = [
                card
                for card in cards
                if (card.area and a_low in card.area.lower())
                or (card.city and a_low in card.city.lower())
            ]
            cards = area_matched
        if min_rating > 0:
            cards = [card for card in cards if card.rating >= min_rating]
        if max_distance > 0:
            cards = [card for card in cards if card.distanceKm <= max_distance]
        if max_price > 0:
            cards = [card for card in cards if card.minPrice <= max_price]
        if max_pickup_minutes > 0:
            cards = [card for card in cards if card.pickupMinutes <= max_pickup_minutes]
        if offers_only:
            cards = [card for card in cards if card.offerLabel]
        if open_now:
            cards = [card for card in cards if card.open]

        return _sort_cards(cards, sort)

    async def partners(
        self,
        *,
        city: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        area: Optional[str] = None,
        limit: int = 10,
    ) -> List[PartnerCardResponse]:
        cards = await self.partner_cards(city=city, area=area, lat=lat, lng=lng, sort="recommended")
        return cards[:limit] if limit > 0 else cards

    async def partner_document(self, partner_id: str) -> Optional[Dict[str, Any]]:
        if not partner_id:
            return None
        pid = str(partner_id).strip()
        doc = await database.find_one("partner_profiles", {"_id": pid})
        if doc: return doc
        doc = await database.find_one("partner_profiles", {"id": pid})
        if doc: return doc
        doc = await database.find_one("partner_profiles", {"partnerId": pid})
        if doc: return doc

        # If it's a service ID or has svc- prefix:
        if pid.startswith("svc-"):
            clean = pid.replace("svc-", "")
            doc = await database.find_one("partner_profiles", {"_id": clean})
            if doc: return doc
            doc = await database.find_one("partner_profiles", {"partnerId": clean})
            if doc: return doc

        # Check if pid belongs to a service
        svc = await database.find_one("partner_services", {"_id": pid}) or await database.find_one("partner_services", {"id": pid})
        if svc and svc.get("partnerId"):
            return await database.find_one("partner_profiles", {"_id": svc.get("partnerId")})

        return None

    async def partner_profile(self, partner_id: str) -> Optional[PartnerProfileResponse]:
        detail = await self.partner_detail(partner_id)
        return detail.partner if detail else None

    async def partner_services(self, partner_id: str) -> Optional[List[PartnerServiceResponse]]:
        doc = await self.partner_document(partner_id)
        if doc is None:
            return None
        actual_pid = str(doc.get("_id") or doc.get("partnerId") or partner_id)
        services_docs = await database.find_many("partner_services", {"partnerId": actual_pid})
        if not services_docs:
            services_docs = await database.find_many("partner_services", {"partnerId": partner_id})
        active_services = [
            s for s in services_docs
            if bool(s.get("enabled", s.get("isActive", True))) is True
            and not s.get("pendingApproval", False)
            and s.get("approvalStatus", "approved") == "approved"
        ]
        services: List[PartnerServiceResponse] = []
        for s in active_services:
            price = int(s.get("price") or 0)
            discount = int(s.get("discountPercent") or 0)
            turnaround = int(s.get("turnaroundHours") or 24)
            services.append(
                PartnerServiceResponse(
                    id=str(s.get("_id") or s.get("id")),
                    name=s.get("name", "Laundry Service"),
                    description=s.get("description", ""),
                    image=s.get("image", ""),
                    icon=s.get("icon", "sparkles"),
                    basePrice=price,
                    discountPercent=discount,
                    discountLabel=f"{discount}% OFF" if discount else None,
                    finalPrice=round(price * (100 - discount) / 100) if discount else price,
                    startingPrice=price,
                    unit=s.get("unit", "kg"),
                    processingTime=f"{turnaround} hrs",
                    deliveryEta=f"{turnaround} hrs",
                    available=True,
                )
            )
        return services

    async def partner_reviews(self, partner_id: str) -> List[PartnerReviewResponse]:
        doc = await self.partner_document(partner_id)
        actual_pid = str(doc.get("_id") or partner_id) if doc else partner_id
        docs = await database.find_many("partner_reviews", {"partnerId": actual_pid})
        res: List[PartnerReviewResponse] = []
        for d in docs:
            c_name = d.get("name") or d.get("authorName") or d.get("customerName") or "Customer"
            c_init = d.get("initials") or (c_name[0].upper() if c_name else "C")
            c_text = d.get("text") or d.get("comment") or "Great laundry service!"
            c_photo = d.get("photo") or d.get("avatar") or ""
            c_date = str(d.get("createdAt") or d.get("date") or "Recently")
            res.append(
                PartnerReviewResponse(
                    id=str(d.get("_id") or d.get("id")),
                    partnerId=actual_pid,
                    name=c_name,
                    initials=c_init,
                    photo=c_photo,
                    avatar=c_photo,
                    rating=float(d.get("rating", 5.0)),
                    date=c_date,
                    text=c_text,
                    comment=c_text,
                    verified=bool(d.get("verified", True)),
                    service=d.get("service", "Laundry"),
                    images=d.get("images") or [],
                )
            )
        return res

    async def partner_detail(self, partner_id: str) -> Optional[PartnerDetailResponse]:
        doc = await self.partner_document(partner_id)
        if doc is None:
            return None
        actual_pid = str(doc.get("_id") or partner_id)
        st = str(doc.get("status") or "").lower()
        if st in ("pending", "rejected", "suspended", "blocked"):
            return None

        services = await self.partner_services(partner_id) or []
        settings = await database.find_one("partner_settings", {"_id": actual_pid}) or {}
        reviews = await self.partner_reviews(partner_id)

        reviews_count = int(doc.get("totalOrders") or doc.get("reviewsCount") or len(reviews))
        reviews_str = f"{reviews_count / 1000:.1f}k" if reviews_count >= 1000 else str(reviews_count)
        is_open = bool(doc.get("isOnline", True) and settings.get("isStoreOpen", True))
        banner = doc.get("banner") or doc.get("bannerUrl") or doc.get("banner_url") or doc.get("cover") or doc.get("coverImage")
        logo = doc.get("logo") or doc.get("logoUrl") or doc.get("logo_url") or doc.get("photo_url") or doc.get("image")
        image = banner or logo or "store-1"
        radius = int(settings.get("pickupRadiusKm") or 8)

        partner_profile = PartnerProfileResponse(
            id=str(doc["_id"]),
            name=doc.get("businessName") or doc.get("name") or "QuickPress Partner",
            cover=banner or image,
            logo=logo or image,
            image=image,
            verified=bool(doc.get("isVerified", True)),
            rating=float(doc.get("rating") or 5.0),
            reviewCount=reviews_str,
            reviewsCount=reviews_count,
            distanceKm=1.5,
            pickupEta="30 min",
            deliveryEta="24 hrs",
            open=is_open,
            status="open" if is_open else "closed",
            ownerName=doc.get("ownerName", "Partner"),
            address=doc.get("address", ""),
            city=doc.get("city", "Bengaluru"),
            area=doc.get("address") or doc.get("area") or doc.get("city", "Bengaluru"),
            latitude=doc.get("latitude"),
            longitude=doc.get("longitude"),
            pickupRadius=f"{radius} km around {doc.get('city', 'store')}",
            deliveryRadiusKm=radius,
            workingHours=f"{settings.get('openingTime', '08:00')} – {settings.get('closingTime', '21:00')}",
            openingHours=[],
            phone=doc.get("phone", ""),
            about=doc.get("about", "Trusted QuickPress laundry partner providing professional cleaning."),
            yearsInBusiness=int(doc.get("yearsInBusiness") or 2),
            tagline=doc.get("tagline", "Professional Laundry & Dry Cleaning"),
            policies=["Hygienic processing", "Safe color care", "On-time doorstep delivery"],
            offerLabel=doc.get("offerLabel"),
            minPrice=min((s.basePrice for s in services), default=49),
            minOrderValue=int(doc.get("minOrderValue") or 0),
            servicesCount=len(services),
        )

        features = [
            PartnerFeatureResponse(id="f1", title="Doorstep Pickup & Delivery", icon="truck"),
            PartnerFeatureResponse(id="f2", title="Eco-friendly detergent", icon="leaf"),
            PartnerFeatureResponse(id="f3", title="Fabric-safe steam pressing", icon="sparkles"),
            PartnerFeatureResponse(id="f4", title="Express 24 hr turnaround", icon="zap"),
        ]

        return PartnerDetailResponse(
            partner=partner_profile,
            services=services,
            features=features,
            reviews=reviews,
            reviewSummary=review_summary(reviews, doc),
            gallery=[],
            priceList=[
                PriceRowResponse(
                    id=f"pl-{s.id}",
                    service=s.name,
                    unit=f"per {s.unit}",
                    price=s.basePrice,
                )
                for s in services
            ],
        )

    async def filter_options(self) -> FilterOptionsResponse:
        profiles = await self._approved_partner_profiles()
        cities = sorted({p.get("city", "") for p in profiles if p.get("city")})
        return FilterOptionsResponse(
            sorts=[
                FilterOptionResponse(id="recommended", label="Recommended"),
                FilterOptionResponse(id="distance", label="Nearest"),
                FilterOptionResponse(id="rating", label="Highest rated"),
                FilterOptionResponse(id="price-low", label="Lowest price"),
                FilterOptionResponse(id="pickup", label="Fastest pickup"),
                FilterOptionResponse(id="popular", label="Most popular"),
            ],
            toggles=[
                FilterOptionResponse(id="openNow", label="Open now"),
                FilterOptionResponse(id="offers", label="Offers"),
            ],
            groups=[
                FilterGroupResponse(
                    id="maxDistance",
                    label="Distance",
                    kind="single",
                    options=[
                        FilterOptionResponse(id="0", label="Any", value=0),
                        FilterOptionResponse(id="2", label="2 km", value=2),
                        FilterOptionResponse(id="5", label="5 km", value=5),
                        FilterOptionResponse(id="10", label="10 km", value=10),
                    ],
                ),
                FilterGroupResponse(
                    id="minRating",
                    label="Rating",
                    kind="single",
                    options=[
                        FilterOptionResponse(id="0", label="Any", value=0),
                        FilterOptionResponse(id="4", label="4.0+", value=4),
                        FilterOptionResponse(id="4.5", label="4.5+", value=4.5),
                    ],
                ),
                FilterGroupResponse(
                    id="maxPrice",
                    label="Starting price",
                    kind="single",
                    options=[
                        FilterOptionResponse(id="0", label="Any", value=0),
                        FilterOptionResponse(id="20", label="Under ₹20", value=20),
                        FilterOptionResponse(id="50", label="Under ₹50", value=50),
                        FilterOptionResponse(id="100", label="Under ₹100", value=100),
                    ],
                ),
                FilterGroupResponse(
                    id="maxPickupMinutes",
                    label="Pickup time",
                    kind="single",
                    options=[
                        FilterOptionResponse(id="0", label="Any", value=0),
                        FilterOptionResponse(id="20", label="Under 20 min", value=20),
                        FilterOptionResponse(id="30", label="Under 30 min", value=30),
                        FilterOptionResponse(id="45", label="Under 45 min", value=45),
                    ],
                ),
            ],
            cities=cities,
        )

    async def search(self, q: str, scopes: Optional[List[str]] = None) -> List[SearchResultResponse]:
        needle = (q or "").strip().lower()
        if not needle:
            return []
        wanted = set(scopes or ["partners", "categories", "services", "offers"])
        results: List[SearchResultResponse] = []

        if "partners" in wanted:
            for card in await self.partner_cards(q=needle):
                results.append(
                    SearchResultResponse(
                        id=card.id,
                        scope="partners",
                        title=card.name,
                        subtitle=f"{card.area}, {card.city}".strip(", "),
                        image=card.image,
                    )
                )
        if "categories" in wanted:
            for category in await self.categories():
                if needle in category.title.lower() or needle in category.description.lower():
                    results.append(
                        SearchResultResponse(
                            id=category.id,
                            scope="categories",
                            title=category.title,
                            subtitle=category.description,
                            image=category.image or None,
                        )
                    )
        if "services" in wanted:
            for service in await self.services():
                if needle in service.name.lower() or needle in service.description.lower():
                    results.append(
                        SearchResultResponse(
                            id=service.id,
                            scope="services",
                            title=service.name,
                            subtitle=f"₹{service.price} {service.unit}",
                            image=service.image,
                        )
                    )
        if "offers" in wanted:
            for offer in await self.offers():
                if needle in offer.title.lower() or needle in offer.description.lower():
                    results.append(
                        SearchResultResponse(
                            id=offer.id,
                            scope="offers",
                            title=offer.title,
                            subtitle=offer.description,
                            image=offer.banner,
                        )
                    )
        return results

    async def offers(self) -> List[OfferResponse]:
        docs = await database.find_many("admin_coupons")
        active_docs = [
            d
            for d in docs
            if str(d.get("status", "")).lower() in ("active", "live", "enabled", "")
        ]
        
        if not active_docs:
            # High-value default active coupons
            return [
                OfferResponse(
                    id="coupon-welcome-50",
                    code="WELCOME50",
                    title="50% OFF with WELCOME50",
                    description="50% OFF up to ₹150 on your first laundry pickup",
                    kind="discount",
                    discount="50% OFF",
                    discountLabel="50% OFF",
                    expiresAt="31 Dec 2026",
                    expiry="31 Dec 2026",
                    minOrder=199,
                ),
                OfferResponse(
                    id="coupon-quick-50",
                    code="QUICK50",
                    title="₹50 OFF with QUICK50",
                    description="Flat ₹50 OFF on orders above ₹199",
                    kind="discount",
                    discount="₹50 OFF",
                    discountLabel="₹50 OFF",
                    expiresAt="31 Dec 2026",
                    expiry="31 Dec 2026",
                    minOrder=199,
                ),
                OfferResponse(
                    id="coupon-festive-100",
                    code="FESTIVE100",
                    title="₹100 OFF with FESTIVE100",
                    description="Special Festival Discount on orders above ₹499",
                    kind="festival",
                    discount="₹100 OFF",
                    discountLabel="₹100 OFF",
                    expiresAt="31 Dec 2026",
                    expiry="31 Dec 2026",
                    minOrder=499,
                ),
                OfferResponse(
                    id="coupon-express-free",
                    code="EXPRESSFREE",
                    title="FREE DELIVERY with EXPRESSFREE",
                    description="Free express pickup & delivery on orders above ₹299",
                    kind="delivery",
                    discount="FREE DELIVERY",
                    discountLabel="FREE DELIVERY",
                    expiresAt="31 Dec 2026",
                    expiry="31 Dec 2026",
                    minOrder=299,
                ),
                OfferResponse(
                    id="coupon-premium-25",
                    code="PREMIUM25",
                    title="25% OFF with PREMIUM25",
                    description="25% OFF on Premium Dry Cleaning & Woolens",
                    kind="premium",
                    discount="25% OFF",
                    discountLabel="25% OFF",
                    expiresAt="31 Dec 2026",
                    expiry="31 Dec 2026",
                    minOrder=399,
                ),
            ]

        results: List[OfferResponse] = []
        for d in active_docs:
            code = str(d.get("code") or "").strip().upper()
            if not code:
                continue
            discount_raw = str(d.get("discount") or "").strip()
            discount_label = discount_raw if discount_raw else "Special Offer"
            title = f"{discount_label} with {code}" if discount_raw else f"Special Offer: {code}"
            desc = str(d.get("description") or f"Valid on orders above ₹{d.get('minOrder', 99)}")
            min_order = int(d.get("minOrder") or 0)
            expiry_val = str(d.get("expiry")) if d.get("expiry") else "31 Dec 2026"
            results.append(
                OfferResponse(
                    id=str(d.get("_id") or f"c-{code}"),
                    code=code,
                    title=title,
                    description=desc,
                    kind="discount",
                    discount=discount_label,
                    discountLabel=discount_label,
                    expiresAt=expiry_val,
                    expiry=expiry_val,
                    minOrder=min_order,
                    banner=None,
                )
            )
        return results

    async def offers_page(self, user_id: Optional[str] = None) -> OffersPageResponse:
        """Complete dynamic payload for /offers screen."""
        reward_points = 0
        scratch_cards: list[ScratchCard] = []

        if user_id:
            try:
                from app.db.loyalty_repositories import loyalty_repository
                account = await loyalty_repository.get_or_create_account(user_id)
                reward_points = int(account.get("pointsBalance") or 0)
                cards = await loyalty_repository.get_user_cards(user_id)
                for c in cards:
                    scratch_cards.append(
                        ScratchCard(
                            id=c["id"],
                            reward=c["reward"],
                            caption=c["caption"],
                        )
                    )
            except Exception as err:
                logger.warning(f"Error fetching real user loyalty cards in offers_page: {err}")

        banners = [
            OfferBanner(
                id="banner-festival",
                eyebrow="FESTIVAL SPECIAL",
                title="Flat 50% OFF",
                subtitle="On your first 3 premium laundry & dry cleaning orders",
                tone="festival",
            ),
            OfferBanner(
                id="banner-express",
                eyebrow="WEEKEND SPECIAL",
                title="Free Express Delivery",
                subtitle="Zero delivery charge on orders above ₹299",
                tone="discount",
            ),
            OfferBanner(
                id="banner-wallet",
                eyebrow="WALLET REWARDS",
                title="Earn ₹150 Cashback",
                subtitle="Invite friends and get ₹150 in your wallet on their 1st order",
                tone="cashback",
            ),
        ]

        special_offers = [
            SpecialOffer(
                id="offer-first-order",
                kind="first-order",
                title="50% First Order Welcome",
                description="New to QuickPress? Use code WELCOME50 for up to ₹150 off your first laundry pickup.",
                highlight="50% OFF",
            ),
            SpecialOffer(
                id="offer-referral",
                kind="referral",
                title="Invite Friends & Earn ₹150",
                description="Share your referral code. Friends get 50% OFF on their 1st order, you get ₹150 wallet cash.",
                highlight="Earn ₹150",
            ),
            SpecialOffer(
                id="offer-membership",
                kind="membership",
                title="QuickPress VIP Club",
                description="Get 15% extra discount + priority 12-hr express turnaround on every order.",
                highlight="VIP Club",
            ),
            SpecialOffer(
                id="offer-festival",
                kind="festival",
                title="Monsoon Care Package",
                description="Special anti-bacterial wash & steam iron for heavy jackets, quilts and blankets.",
                highlight="Seasonal",
            ),
        ]

        return OffersPageResponse(
            banners=banners,
            specialOffers=special_offers,
            scratchCards=scratch_cards,
            rewardPoints=reward_points,
        )

    # ------------------------------------------------------------------
    # Customer Saved Services (MongoDB Atlas: `customer_saved_services`)
    # ------------------------------------------------------------------

    async def saved_services(self, user_id: str) -> List[Dict[str, Any]]:
        docs = await database.find_many("customer_saved_services", {"userId": user_id})
        docs.sort(key=lambda d: d.get("createdAt") or "", reverse=True)
        items = []
        for d in docs:
            items.append({
                "id": str(d.get("_id") or d.get("id")),
                "serviceId": str(d.get("serviceId")),
                "title": d.get("title") or d.get("name") or "Laundry Service",
                "name": d.get("name") or d.get("title") or "Laundry Service",
                "price": int(d.get("price") or d.get("basePrice") or 49),
                "basePrice": int(d.get("basePrice") or d.get("price") or 49),
                "finalPrice": int(d.get("finalPrice") or d.get("price") or 49),
                "discountLabel": d.get("discountLabel"),
                "image": d.get("image") or "",
                "icon": d.get("icon") or "sparkles",
                "categoryId": d.get("categoryId") or "c1",
                "processingTime": d.get("processingTime") or "24 hrs",
                "savedAt": d.get("createdAt") or "",
                "isSaved": True,
            })
        return items

    async def toggle_saved_service(self, user_id: str, service_id: str) -> Dict[str, Any]:
        collection = database.collection("customer_saved_services")
        existing = await collection.find_one({"userId": user_id, "serviceId": service_id})
        if existing:
            await collection.delete_many({"userId": user_id, "serviceId": service_id})
            return {"ok": True, "isSaved": False, "message": "Removed from saved services."}

        service_doc = await database.find_one("services", {"_id": service_id})
        if not service_doc:
            service_doc = await database.find_one("partner_services", {"_id": service_id})

        title = (service_doc.get("name") if service_doc else None) or service_id.replace("-", " ").title()
        price = int(service_doc.get("price") or 49) if service_doc else 49
        icon = (service_doc.get("icon") or "sparkles") if service_doc else "sparkles"
        image = (service_doc.get("image") or "") if service_doc else ""
        category_id = (service_doc.get("categoryId") or "c1") if service_doc else "c1"

        now = utcnow().isoformat()
        new_id = f"ss-{uuid.uuid4().hex[:10]}"
        doc = {
            "_id": new_id,
            "id": new_id,
            "userId": user_id,
            "serviceId": service_id,
            "title": title,
            "name": title,
            "price": price,
            "basePrice": price,
            "finalPrice": price,
            "icon": icon,
            "image": image,
            "categoryId": category_id,
            "processingTime": "24 hrs",
            "createdAt": now,
        }
        await collection.insert_one(doc)
        return {"ok": True, "isSaved": True, "message": "Saved to your favourites.", "service": doc}

    async def remove_saved_service(self, user_id: str, service_id: str) -> Dict[str, Any]:
        await database.collection("customer_saved_services").delete_many(
            {"userId": user_id, "serviceId": service_id}
        )
        return {"ok": True, "isSaved": False}

    # ------------------------------------------------------------------
    # Customer Favourite Stores (MongoDB Atlas: `customer_favourite_partners`)
    # ------------------------------------------------------------------

    async def favourite_partners(self, user_id: str) -> List[Dict[str, Any]]:
        docs = await database.find_many("customer_favourite_partners", {"userId": user_id})
        docs.sort(key=lambda d: d.get("createdAt") or "", reverse=True)
        items = []
        for d in docs:
            pid = str(d.get("partnerId") or d.get("_id"))
            store = (
                await database.find_one("partner_profiles", {"_id": pid})
                or await database.find_one("partner_profiles", {"partnerId": pid})
                or {}
            )
            name = d.get("name") or store.get("businessName") or store.get("name") or "Laundry Store"
            rating = float(store.get("rating") or d.get("rating") or 5.0)
            reviews_count = int(store.get("reviewsCount") or d.get("reviewsCount") or 1)
            city = store.get("city") or d.get("city") or "Kasganj"
            area = store.get("area") or d.get("area") or "Main Market"
            is_open = bool(store.get("isOnline", True))
            logo = store.get("logo") or store.get("logoUrl") or d.get("logo") or d.get("image") or "store-1"
            image = store.get("bannerUrl") or store.get("cover") or d.get("image") or "store-1"
            min_price = int(d.get("minPrice") or 49)

            items.append({
                "id": str(d.get("_id") or pid),
                "partnerId": pid,
                "name": name,
                "rating": rating,
                "reviews": f"{reviews_count} reviews",
                "reviewsCount": reviews_count,
                "city": city,
                "area": area,
                "open": is_open,
                "status": "open" if is_open else "closed",
                "logo": logo,
                "image": image,
                "minPrice": min_price,
                "eta": "30 min pickup",
                "isFavourite": True,
                "savedAt": d.get("createdAt") or "",
            })
        return items

    async def toggle_favourite_partner(self, user_id: str, partner_id: str) -> Dict[str, Any]:
        collection = database.collection("customer_favourite_partners")
        existing = await collection.find_one({"userId": user_id, "partnerId": partner_id})
        if existing:
            await collection.delete_many({"userId": user_id, "partnerId": partner_id})
            return {"ok": True, "isFavourite": False, "message": "Removed from favourite stores."}

        store = (
            await database.find_one("partner_profiles", {"_id": partner_id})
            or await database.find_one("partner_profiles", {"partnerId": partner_id})
            or {}
        )
        name = store.get("businessName") or store.get("name") or "QuickPress Partner Store"
        rating = float(store.get("rating") or 5.0)
        city = store.get("city") or "Kasganj"
        area = store.get("area") or "Main Market"
        logo = store.get("logo") or store.get("logoUrl") or "store-1"
        image = store.get("bannerUrl") or store.get("cover") or "store-1"

        now = utcnow().isoformat()
        new_id = f"fp-{uuid.uuid4().hex[:10]}"
        doc = {
            "_id": new_id,
            "id": new_id,
            "userId": user_id,
            "partnerId": partner_id,
            "name": name,
            "rating": rating,
            "city": city,
            "area": area,
            "logo": logo,
            "image": image,
            "createdAt": now,
        }
        await collection.insert_one(doc)
        return {
            "ok": True,
            "isFavourite": True,
            "message": f"Added {name} to your favourite stores ❤️",
            "partner": doc,
        }

    async def remove_favourite_partner(self, user_id: str, partner_id: str) -> Dict[str, Any]:
        await database.collection("customer_favourite_partners").delete_many(
            {"userId": user_id, "partnerId": partner_id}
        )
        return {"ok": True, "isFavourite": False}


def _without_id(document: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in document.items() if key != "_id"}


def _service_card(document: Dict[str, Any], partner_count: int) -> ServiceCardResponse:
    price = int(document["price"])
    discount = int(document.get("discountPercent") or 0)
    return ServiceCardResponse(
        id=document["_id"],
        title=document["name"],
        name=document["name"],
        description=document.get("description", ""),
        icon=_ICONS.get(document["categoryId"], "sparkles"),
        image=document.get("image"),
        categoryId=document["categoryId"],
        unit=document.get("unit", ""),
        price=price,
        basePrice=price,
        discountPercent=discount,
        discountLabel=f"{discount}% OFF" if discount else None,
        finalPrice=round(price * (100 - discount) / 100),
        processingTime=document.get("processingTime", "24 hrs"),
        partnerCount=partner_count,
        badge=document.get("badge"),
        popular=bool(document.get("popular")),
    )


def _partner_card(document: Dict[str, Any]) -> PartnerCardResponse:
    reviews_count = int(document.get("reviewsCount") or 0)
    reviews = f"{reviews_count / 1000:.1f}k" if reviews_count >= 1000 else str(reviews_count)
    pickup = int(document.get("pickupMinutes") or 30)
    is_open = bool(document.get("isOpen", True))
    image = document.get("image") or document.get("logo") or ""
    services = list(document.get("services") or [])
    return PartnerCardResponse(
        id=document["_id"],
        name=document["name"],
        logo=image,
        image=image,
        rating=float(document.get("rating") or 0),
        reviews=reviews,
        reviewsCount=reviews_count,
        distanceKm=float(document.get("distanceKm") or 0),
        eta=f"{pickup} min pickup",
        pickupTime=f"{pickup} min",
        deliveryTime=document.get("deliveryTime", "24 hrs"),
        minPrice=int(document.get("minPrice") or 0),
        minOrderValue=int(document.get("minOrderValue") or 0),
        services=services,
        servicesCount=len(services),
        open=is_open,
        status="open" if is_open else "closed",
        city=document.get("city", ""),
        area=document.get("area", ""),
        cover=document.get("cover") or image,
        verified=bool(document.get("verified", False)),
        offerLabel=document.get("offerLabel"),
        popularity=int(document.get("popularity") or 0),
        joinedDaysAgo=int(document.get("joinedDaysAgo") or 999),
        pickupMinutes=pickup,
        tagline=document.get("tagline", ""),
    )


_ICONS = {
    "c1": "washing-machine",
    "c2": "shirt",
    "c3": "flame",
    "c4": "sparkles",
    "c5": "footprints",
    "c6": "blinds",
    "c7": "bed-double",
    "c8": "layout-grid",
    "c9": "zap",
}


def _sort_cards(cards: List[PartnerCardResponse], sort: str) -> List[PartnerCardResponse]:
    """Sorting contract prioritizing top-rated, highly-reviewed active partners."""
    if sort == "distance" or sort == "nearest":
        return sorted(cards, key=lambda c: (not c.open, c.distanceKm, -c.rating))
    if sort == "rating":
        return sorted(cards, key=lambda c: (-c.rating, -c.reviewsCount, c.distanceKm))
    if sort == "price-low":
        return sorted(cards, key=lambda c: (c.minPrice, -c.rating))
    if sort == "price-high":
        return sorted(cards, key=lambda c: (-c.minPrice, -c.rating))
    if sort in {"pickup", "delivery", "fastest"}:
        return sorted(cards, key=lambda c: (c.pickupMinutes, -c.rating))
    if sort == "popular":
        return sorted(cards, key=lambda c: (-c.popularity, -c.reviewsCount, -c.rating))
    return sorted(cards, key=lambda c: (not c.open, -c.rating, -c.reviewsCount, c.distanceKm))


def _partner_service(item: Dict[str, Any]) -> PartnerServiceResponse:
    price = int(item.get("price") or 0)
    discount = int(item.get("discountPercent") or 0)
    processing = item.get("processingTime", "24 hrs")
    return PartnerServiceResponse(
        id=item["id"],
        name=item["name"],
        description=item.get("description", ""),
        image=item.get("image", ""),
        icon=item.get("icon", "sparkles"),
        basePrice=price,
        discountPercent=discount,
        discountLabel=f"{discount}% OFF" if discount else None,
        finalPrice=round(price * (100 - discount) / 100),
        startingPrice=price,
        unit=item.get("unit", ""),
        processingTime=processing,
        deliveryEta=processing,
        available=bool(item.get("available", True)),
    )


def _partner_profile(document: Dict[str, Any]) -> PartnerProfileResponse:
    card = _partner_card(document)
    hours = [OpeningHour(**entry) for entry in document.get("openingHours") or []]
    working = " · ".join(f"{entry.day} {entry.hours}" for entry in hours) or "Mon – Sun · 8:00 AM to 9:00 PM"
    radius = int(document.get("deliveryRadiusKm") or 0)
    return PartnerProfileResponse(
        id=card.id,
        name=card.name,
        cover=card.cover or card.image,
        logo=document.get("logo") or card.image,
        image=card.image,
        verified=card.verified,
        rating=card.rating,
        reviewCount=card.reviews,
        reviewsCount=card.reviewsCount,
        distanceKm=card.distanceKm,
        pickupEta=card.pickupTime,
        deliveryEta=card.deliveryTime,
        open=card.open,
        status=card.status,
        ownerName=document.get("ownerName", ""),
        address=document.get("address", ""),
        city=card.city,
        area=card.area,
        latitude=document.get("latitude"),
        longitude=document.get("longitude"),
        pickupRadius=f"{radius} km around {card.area}" if radius else "Nearby areas",
        deliveryRadiusKm=radius,
        workingHours=working,
        openingHours=hours,
        phone=document.get("phone", ""),
        about=document.get("about", ""),
        yearsInBusiness=int(document.get("yearsInBusiness") or 0),
        tagline=document.get("tagline", ""),
        policies=list(document.get("policies") or []),
        offerLabel=card.offerLabel,
        minPrice=card.minPrice,
        minOrderValue=card.minOrderValue,
        servicesCount=len(document.get("serviceItems") or []) or card.servicesCount,
    )


def review_summary(
    reviews: List[PartnerReviewResponse], document: Dict[str, Any]
) -> ReviewSummaryResponse:
    breakdown = {str(star): 0 for star in range(1, 6)}
    for review in reviews:
        bucket = str(max(1, min(5, round(review.rating))))
        breakdown[bucket] += 1
    average = (
        round(sum(review.rating for review in reviews) / len(reviews), 1)
        if reviews
        else float(document.get("rating") or 0)
    )
    total = int(document.get("reviewsCount") or len(reviews))
    return ReviewSummaryResponse(average=average, total=total, breakdown=breakdown)


catalog = CatalogRepository()
