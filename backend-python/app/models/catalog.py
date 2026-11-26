"""Home Screen response models.

These mirror `backend/src/customer/home-api.ts` exactly, so the Customer Home
screen renders identical data from the mock router and from FastAPI.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: Optional[str] = None
    name: str
    initials: str
    avatarUrl: Optional[str] = None
    phone: Optional[str] = None
    unreadNotifications: int = 0


class LocationResponse(BaseModel):
    area: str
    city: str
    state: str


class BannerResponse(BaseModel):
    id: str
    eyebrow: str = ""
    badge: str = ""
    title: str = ""
    subtitle: str = ""
    cta: str = "Explore"
    image: Optional[str] = None
    tone: str = "primary"
    redirectUrl: Optional[str] = None
    actionUrl: Optional[str] = None
    priority: int = 99



class CategoryResponse(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    image: str = ""
    sortOrder: int = 99
    status: str = "active"


class ServiceCardResponse(BaseModel):
    """Service card: icon, name, description, base price, discount,
    processing time and partner count."""

    id: str
    title: str
    name: str
    description: str
    icon: str
    image: Optional[str] = None
    categoryId: str
    unit: str
    price: int
    basePrice: int
    discountPercent: int = 0
    discountLabel: Optional[str] = None
    finalPrice: int
    processingTime: str
    partnerCount: int
    partnerId: Optional[str] = None
    partnerName: Optional[str] = None
    badge: Optional[str] = None
    popular: bool = False


class PartnerCardResponse(BaseModel):
    """Partner card: logo, name, rating, reviews, distance, pickup time,
    starting price, services and status."""

    id: str
    name: str
    logo: str
    image: str
    rating: float
    reviews: str
    reviewsCount: int
    distanceKm: float
    eta: str
    pickupTime: str
    deliveryTime: str
    minPrice: int
    minOrderValue: int
    services: List[str] = []
    servicesCount: int = 0
    open: bool = True
    status: str = "open"
    city: str = ""
    area: str = ""
    # Sprint 2.2 — listing card extras
    cover: str = ""
    verified: bool = False
    offerLabel: Optional[str] = None
    popularity: int = 0
    joinedDaysAgo: int = 999
    pickupMinutes: int = 30
    tagline: str = ""


class OfferResponse(BaseModel):
    id: str
    code: str
    title: str
    description: str
    kind: str
    discount: Optional[str] = None
    discountLabel: Optional[str] = None
    expiresAt: Optional[str] = None
    expiry: Optional[str] = None
    minOrder: Optional[int] = 0
    banner: Optional[str] = None


class OfferBanner(BaseModel):
    id: str
    eyebrow: str
    title: str
    subtitle: str
    tone: str = "festival"  # "festival" | "discount" | "cashback"


class SpecialOffer(BaseModel):
    id: str
    kind: str = "first-order"  # "first-order" | "referral" | "membership" | "festival"
    title: str
    description: str
    highlight: str


class ScratchCard(BaseModel):
    id: str
    reward: str
    caption: str


class OffersPageResponse(BaseModel):
    banners: List[OfferBanner]
    specialOffers: List[SpecialOffer]
    scratchCards: List[ScratchCard]
    rewardPoints: int = 0


class HomeResponse(BaseModel):
    profile: ProfileResponse
    location: LocationResponse
    banners: List[BannerResponse]
    categories: List[CategoryResponse]
    services: List[ServiceCardResponse]
    popularServices: List[ServiceCardResponse]
    recommendedServices: List[ServiceCardResponse]
    partners: List[PartnerCardResponse]
    offers: List[OfferResponse]
    unreadNotifications: int = 0


# --------------------------------------------------------------------------
# Sprint 2.2 — Partner Listing & Partner Details
# --------------------------------------------------------------------------


class OpeningHour(BaseModel):
    day: str
    hours: str


class PartnerFeatureResponse(BaseModel):
    id: str
    title: str
    icon: str


class GalleryImageResponse(BaseModel):
    id: str
    image: str
    caption: str


class PartnerServiceResponse(BaseModel):
    """One service offered by a partner: icon/image, name, description,
    base price, discount, processing time and availability."""

    id: str
    name: str
    description: str
    image: str
    icon: str = "sparkles"
    basePrice: int
    discountPercent: int = 0
    discountLabel: Optional[str] = None
    finalPrice: int
    startingPrice: int
    unit: str
    processingTime: str
    deliveryEta: str
    available: bool = True


class PartnerReviewResponse(BaseModel):
    id: str
    partnerId: str
    name: str = "Customer"
    initials: str = "C"
    photo: Optional[str] = ""
    avatar: Optional[str] = ""
    rating: float = 5.0
    text: Optional[str] = ""
    comment: Optional[str] = ""
    date: str = "Recently"
    verified: bool = True
    service: Optional[str] = "Laundry"
    images: List[str] = []
    tags: List[str] = []
    reply: Optional[str] = None
    repliedAt: Optional[str] = None


class ReviewSummaryResponse(BaseModel):
    average: float
    total: int
    breakdown: dict[str, int]


class PartnerReviewsResponse(BaseModel):
    summary: ReviewSummaryResponse
    reviews: List[PartnerReviewResponse]


class PartnerProfileResponse(BaseModel):
    """Full partner profile behind the Partner Details screen."""

    id: str
    name: str
    cover: str
    logo: str
    image: str
    verified: bool = False
    rating: float
    reviewCount: str
    reviewsCount: int
    distanceKm: float
    pickupEta: str
    deliveryEta: str
    open: bool
    status: str
    ownerName: str
    address: str
    city: str = ""
    area: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pickupRadius: str
    deliveryRadiusKm: int = 0
    workingHours: str
    openingHours: List[OpeningHour] = []
    phone: str
    about: str
    yearsInBusiness: int = 0
    tagline: str
    policies: List[str] = []
    offerLabel: Optional[str] = None
    minPrice: int = 0
    minOrderValue: int = 0
    servicesCount: int = 0


class PriceRowResponse(BaseModel):
    id: str
    service: str
    unit: str
    price: int


class PartnerDetailResponse(BaseModel):
    partner: PartnerProfileResponse
    services: List[PartnerServiceResponse]
    features: List[PartnerFeatureResponse]
    reviews: List[PartnerReviewResponse]
    reviewSummary: ReviewSummaryResponse
    gallery: List[GalleryImageResponse]
    priceList: List[PriceRowResponse]


class FilterOptionResponse(BaseModel):
    id: str
    label: str
    value: Optional[float] = None


class FilterGroupResponse(BaseModel):
    id: str
    label: str
    kind: str
    options: List[FilterOptionResponse] = []


class FilterOptionsResponse(BaseModel):
    """GET /api/filter — everything the listing filter sheet renders."""

    sorts: List[FilterOptionResponse]
    toggles: List[FilterOptionResponse]
    groups: List[FilterGroupResponse]
    cities: List[str] = []


class SearchResultResponse(BaseModel):
    id: str
    scope: str
    title: str
    subtitle: str
    image: Optional[str] = None
