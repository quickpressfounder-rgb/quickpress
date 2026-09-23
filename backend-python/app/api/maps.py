"""Maps API — Sprint 5.4 (Google Maps production integration).

Every Google call is proxied here so GOOGLE_API_KEY never reaches a browser.
Live rider/partner positions are persisted in MongoDB (`live_locations`) so the
admin live map and customer order tracking read real coordinates.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import get_settings
from app.core import maps
from app.core.deps import current_user
from app.db.client import database
from app.models.maps import (
    DeliveryAreaRequest,
    DeliveryAreaResponse,
    PincodeServiceabilityRequest,
    PincodeServiceabilityResponse,
    GeocodeResult,
    LiveLocation,
    LiveLocationUpdate,
    LiveMapResponse,
    MapsStatus,
    MatrixElement,
    MatrixRequest,
    PlaceDetails,
    PlaceSuggestion,
    RouteRequest,
    RouteResult,
)
from app.models.user import User

router = APIRouter(prefix="/maps", tags=["maps"])

LIVE_LOCATIONS = "live_locations"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/status", response_model=MapsStatus)
async def maps_status() -> MapsStatus:
    settings = get_settings()
    return MapsStatus(
        configured=maps.maps_configured(),
        defaultRadiusKm=settings.delivery_radius_km,
        features=["geocode", "reverse-geocode", "autocomplete", "route", "matrix", "live-tracking"],
    )


# --------------------------------------------------------------------------
# Geocoding
# --------------------------------------------------------------------------


@router.get("/geocode", response_model=GeocodeResult)
async def geocode_address(address: str = Query(..., min_length=3, max_length=300)) -> GeocodeResult:
    return GeocodeResult(**await maps.geocode(address.strip()))


@router.get("/reverse-geocode", response_model=GeocodeResult)
async def reverse_geocode(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
) -> GeocodeResult:
    actual_lat = lat if lat is not None else latitude
    actual_lng = lng if lng is not None else longitude
    if actual_lat is None or actual_lng is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="latitude and longitude (or lat and lng) are required query parameters",
        )
    return GeocodeResult(**await maps.reverse_geocode(actual_lat, actual_lng))


# --------------------------------------------------------------------------
# Places (New) — autocomplete + details
# --------------------------------------------------------------------------


@router.get("/autocomplete", response_model=List[PlaceSuggestion])
async def autocomplete(
    q: str = Query(..., min_length=2, max_length=200),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    radius: int = Query(30_000, ge=100, le=50_000),
) -> List[PlaceSuggestion]:
    actual_lat = lat if lat is not None else latitude
    actual_lng = lng if lng is not None else longitude
    results = await maps.autocomplete(q.strip(), actual_lat, actual_lng, radius)
    return [PlaceSuggestion(**item) for item in results]


@router.get("/place/{place_id}", response_model=PlaceDetails)
async def place(place_id: str) -> PlaceDetails:
    return PlaceDetails(**await maps.place_details(place_id))


# --------------------------------------------------------------------------
# Routes, distance and ETA
# --------------------------------------------------------------------------


@router.post("/route", response_model=RouteResult)
async def compute_route(body: RouteRequest) -> RouteResult:
    result = await maps.compute_route(
        (body.origin.latitude, body.origin.longitude),
        (body.destination.latitude, body.destination.longitude),
        body.travelMode,
    )
    return RouteResult(**result)


@router.post("/distance-matrix", response_model=List[MatrixElement])
async def distance_matrix(body: MatrixRequest) -> List[MatrixElement]:
    if not body.origins or not body.destinations:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="origins and destinations are required")
    if len(body.origins) * len(body.destinations) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Matrix too large (max 100 pairs)")
    rows = await maps.route_matrix(
        [(o.latitude, o.longitude) for o in body.origins],
        [(d.latitude, d.longitude) for d in body.destinations],
        body.travelMode,
    )
    return [MatrixElement(**row) for row in rows]


@router.post("/eta", response_model=RouteResult)
async def compute_eta(body: RouteRequest) -> RouteResult:
    return await compute_route(body)


# --------------------------------------------------------------------------
# Delivery radius / serviceability
# --------------------------------------------------------------------------


@router.post("/delivery-area", response_model=DeliveryAreaResponse)
async def delivery_area(body: DeliveryAreaRequest) -> DeliveryAreaResponse:
    settings = get_settings()
    radius = float(body.radiusKm or settings.delivery_radius_km)
    partners: List[Dict[str, Any]] = await database.find_many("partners")
    if not partners:
        partners = await database.find_many("partner_profiles")

    # 1. Pincode-based resolution (Fast Territory Engine)
    req_pincode = (body.pincode or "").strip()
    if req_pincode:
        all_cities = await database.find_many("admin_cities")
        matched_city = None
        matched_detail = None
        for c in (all_cities or []):
            c_status = str(c.get("status", "Live")).strip().lower()
            if c_status not in ("live", "active", "pilot"):
                continue
            pins = [str(p).strip() for p in (c.get("pincodes") or []) if str(p).strip()]
            details = c.get("pincodeDetails") or []
            for d in details:
                if str(d.get("pincode", "")).strip() == req_pincode:
                    matched_city = c
                    matched_detail = d
                    break
            if matched_city:
                break
            if req_pincode in pins:
                matched_city = c
                break

        if not matched_city:
            return DeliveryAreaResponse(
                serviceable=False,
                radiusKm=radius,
                partnersInRange=0,
                nearest=None,
                pincode=req_pincode,
                cityName="",
                stateName="",
                baseDeliveryFee=0.0,
                estimatedSlaMinutes=0,
                message=f"Pincode {req_pincode} is not currently within our active service network.",
            )

        # Check partners covering this pincode
        matched_partners = [
            p for p in (partners or [])
            if req_pincode in [str(x).strip() for x in (p.get("servicePincodes") or p.get("pincodes") or [p.get("pincode")]) if x]
            or str(p.get("city", "")).strip().lower() == str(matched_city.get("city", "")).strip().lower()
        ]

        first_p = matched_partners[0] if matched_partners else (partners[0] if partners else {})
        c_name = str(matched_city.get("city") or matched_city.get("name") or "")
        s_name = str(matched_city.get("state") or "")
        base_fee = float((matched_detail.get("baseFee") if matched_detail else None) or matched_city.get("baseDeliveryFee") or 20.0)

        return DeliveryAreaResponse(
            serviceable=True,
            radiusKm=radius,
            partnersInRange=len(matched_partners),
            nearest={
                "id": str(first_p.get("_id") or first_p.get("id") or ""),
                "name": str(first_p.get("businessName") or first_p.get("name") or f"{c_name} Hub"),
                "distanceKm": 1.5,
                "withinRadius": True,
                "servicePincodes": first_p.get("servicePincodes") or [req_pincode],
            } if first_p else None,
            pincode=req_pincode,
            cityName=c_name,
            stateName=s_name,
            baseDeliveryFee=base_fee,
            estimatedSlaMinutes=30,
            message=f"Pincode {req_pincode} ({c_name}) is 100% serviceable.",
        )

    # 2. Coordinates-based resolution
    if body.partnerId:
        partners = [p for p in partners if p.get("_id") == body.partnerId or p.get("id") == body.partnerId]

    scored = []
    lat = body.latitude or 27.8083
    lng = body.longitude or 78.6473

    for partner in partners:
        latitude, longitude = partner.get("latitude"), partner.get("longitude")
        if latitude is None or longitude is None:
            continue
        distance = maps.haversine_km((lat, lng), (float(latitude), float(longitude)))
        scored.append((distance, partner))
    scored.sort(key=lambda item: item[0])

    in_range = [item for item in scored if item[0] <= radius]
    nearest = None
    if scored:
        distance, partner = scored[0]
        nearest = {
            "id": str(partner.get("_id") or partner.get("id") or ""),
            "name": str(partner.get("businessName") or partner.get("name") or ""),
            "distanceKm": distance,
            "withinRadius": distance <= radius,
            "servicePincodes": partner.get("servicePincodes") or [partner.get("pincode", "")],
        }

    serviceable = bool(in_range) or len(partners) > 0
    return DeliveryAreaResponse(
        serviceable=serviceable,
        radiusKm=radius,
        partnersInRange=len(in_range),
        nearest=nearest,  # type: ignore[arg-type]
        pincode=req_pincode,
        cityName="",
        stateName="",
        baseDeliveryFee=20.0,
        estimatedSlaMinutes=30,
        message=(
            f"{len(in_range)} partner(s) deliver to this location"
            if serviceable
            else f"No partner serves this location within {radius:g} km"
        ),
    )


@router.get("/pincode-serviceability", response_model=PincodeServiceabilityResponse)
@router.post("/pincode-serviceability", response_model=PincodeServiceabilityResponse)
async def check_pincode_serviceability(
    pincode: Optional[str] = Query(None),
    body: Optional[PincodeServiceabilityRequest] = None,
) -> PincodeServiceabilityResponse:
    target_pin = (pincode or (body.pincode if body else "") or "").strip()
    if not target_pin:
        return PincodeServiceabilityResponse(
            serviceable=False,
            pincode="",
            city="",
            state="",
            areaName="",
            baseDeliveryFee=0.0,
            surgeMultiplier=1.0,
            activePartnersCount=0,
            activeRidersCount=0,
            matchedPartners=[],
            stationedRiders=[],
            estimatedSlaMinutes=0,
            message="Please provide a valid 6-digit PIN code.",
        )

    all_cities_docs = await database.find_many("admin_cities")

    matched_city = None
    matched_detail = None
    for c in (all_cities_docs or []):
        c_status = str(c.get("status", "Live")).strip().lower()
        if c_status not in ("live", "active", "pilot"):
            continue
        pins = [str(p).strip() for p in (c.get("pincodes") or []) if str(p).strip()]
        details = c.get("pincodeDetails") or []
        for d in details:
            if str(d.get("pincode", "")).strip() == target_pin:
                matched_city = c
                matched_detail = d
                break
        if matched_city:
            break
        if target_pin in pins:
            matched_city = c
            break

    if not matched_city:
        return PincodeServiceabilityResponse(
            serviceable=False,
            pincode=target_pin,
            city="",
            state="",
            areaName="Not Serviceable",
            baseDeliveryFee=0.0,
            surgeMultiplier=1.0,
            activePartnersCount=0,
            activeRidersCount=0,
            matchedPartners=[],
            stationedRiders=[],
            estimatedSlaMinutes=0,
            message=f"Pincode {target_pin} is currently outside our active service network.",
        )

    city_name = str(matched_city.get("city") or matched_city.get("name") or "")
    state_name = str(matched_city.get("state") or "Uttar Pradesh")
    base_fee = float((matched_detail.get("baseFee") if matched_detail else None) or matched_city.get("baseDeliveryFee") or 20.0)
    surge = float((matched_detail.get("surgeMultiplier") if matched_detail else None) or matched_city.get("surgeMultiplier") or 1.0)
    area_name = (matched_detail.get("areaName") if matched_detail else None) or f"{city_name} Sector ({target_pin})"

    # Match real active Partner Stores covering this pincode
    all_partners = await database.find_many("partner_profiles")
    if not all_partners:
        all_partners = await database.find_many("partners")

    matched_partners = [
        p for p in (all_partners or [])
        if target_pin in [str(x).strip() for x in (p.get("servicePincodes") or p.get("pincodes") or [p.get("pincode")]) if x]
        or str(p.get("city", "")).strip().lower() == city_name.lower()
    ]

    # Match real Stationed Riders covering this pincode
    all_riders = await database.find_many("rider_profiles")
    if not all_riders:
        all_riders = await database.find_many("riders")

    stationed_riders = [
        r for r in (all_riders or [])
        if target_pin in [str(x).strip() for x in (r.get("operatingPincodes") or r.get("pincodes") or [r.get("pincode")]) if x]
        or str(r.get("city", "")).strip().lower() == city_name.lower()
    ]

    safe_partners = [
        {"id": str(p.get("_id") or p.get("id") or ""), "name": str(p.get("businessName") or p.get("name") or "")}
        for p in matched_partners[:5]
    ]
    safe_riders = [
        {"riderId": str(r.get("_id") or r.get("id") or ""), "name": str(r.get("name") or r.get("riderName") or "")}
        for r in stationed_riders[:5]
    ]

    return PincodeServiceabilityResponse(
        serviceable=True,
        pincode=target_pin,
        city=city_name,
        state=state_name,
        areaName=area_name,
        baseDeliveryFee=base_fee,
        surgeMultiplier=surge,
        activePartnersCount=len(matched_partners),
        activeRidersCount=len(stationed_riders),
        matchedPartners=safe_partners,
        stationedRiders=safe_riders,
        estimatedSlaMinutes=30,
        message=f"Pincode {target_pin} ({city_name}) is fully serviceable with instant pickup & dispatch coverage.",
    )


# --------------------------------------------------------------------------
# Live tracking
# --------------------------------------------------------------------------


@router.post("/live/rider", response_model=LiveLocation)
async def push_rider_location(
    body: LiveLocationUpdate,
    user: User = Depends(current_user),
) -> LiveLocation:
    from app.db.rider_repositories import rider_profile_repository

    rider_id = body.riderId or await rider_profile_repository.resolve_rider_id(user)
    document = {
        "_id": f"rider:{rider_id}",
        "kind": "rider",
        "label": rider_id,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "orderId": body.orderId,
        "heading": body.heading,
        "speedKmph": body.speedKmph,
        "status": "on-trip" if body.orderId else "online",
        "updatedAt": _now(),
    }
    await database.update(LIVE_LOCATIONS, {"_id": document["_id"]}, document, upsert=True)
    try:
        from app.services.socket_service import broadcast_rider_location
        await broadcast_rider_location(
            rider_id=str(rider_id),
            latitude=body.latitude,
            longitude=body.longitude,
            heading=body.heading,
            speed_kmph=body.speedKmph,
            order_id=body.orderId,
        )
    except Exception:
        pass
    return LiveLocation(id=str(rider_id), **{k: v for k, v in document.items() if k in {"kind", "label", "latitude", "longitude", "orderId", "status", "updatedAt"}})


@router.get("/live/rider/{rider_id}", response_model=Optional[LiveLocation])
async def read_rider_location(rider_id: str):
    document = await database.find_one(LIVE_LOCATIONS, {"_id": f"rider:{rider_id}"})
    if not document:
        return None
    return LiveLocation(
        id=rider_id,
        kind="rider",
        label=str(document.get("label") or rider_id),
        latitude=float(document.get("latitude", 0.0)),
        longitude=float(document.get("longitude", 0.0)),
        orderId=document.get("orderId"),
        status=document.get("status"),
        updatedAt=document.get("updatedAt"),
    )


@router.get("/live", response_model=LiveMapResponse)
async def live_map() -> LiveMapResponse:
    # 1. Fetch live locations from live_locations table
    documents: List[Dict[str, Any]] = await database.find_many(LIVE_LOCATIONS)
    riders_map: Dict[str, LiveLocation] = {}

    for doc in documents:
        if doc.get("kind") == "rider":
            r_id = str(doc.get("_id", "")).split(":", 1)[-1]
            st = str(doc.get("status") or "online").lower()
            if doc.get("isOnline") is False:
                st = "offline"
            riders_map[r_id] = LiveLocation(
                id=r_id,
                kind="rider",
                label=str(doc.get("label") or r_id),
                latitude=float(doc.get("latitude", 0.0)),
                longitude=float(doc.get("longitude", 0.0)),
                orderId=doc.get("orderId"),
                status=st,
                updatedAt=doc.get("updatedAt"),
            )

    # 2. Enrich/Supplement from rider_profiles (Supabase) for all registered riders
    profiles = await database.find_many("rider_profiles")
    for prof in profiles:
        p_id = str(prof.get("_id") or prof.get("riderId") or "")
        p_lat = prof.get("lat") or prof.get("latitude")
        p_lng = prof.get("lng") or prof.get("longitude")
        is_online = bool(prof.get("isOnline", False))
        if p_lat is not None and p_lng is not None:
            p_label = prof.get("fullName") or prof.get("name") or p_id
            existing = riders_map.get(p_id)
            current_st = ("on-trip" if (existing and existing.orderId) else ("online" if is_online else "offline"))
            riders_map[p_id] = LiveLocation(
                id=p_id,
                kind="rider",
                label=p_label,
                latitude=float(p_lat),
                longitude=float(p_lng),
                orderId=existing.orderId if existing else None,
                status=current_st,
                updatedAt=prof.get("lastLocationAt") or prof.get("lastActiveAt") or prof.get("updatedAt"),
            )

    riders = list(riders_map.values())

    # 3. Partner Store Hubs with accurate Open/Closed status
    partner_docs: List[Dict[str, Any]] = await database.find_many("partner_profiles")
    if not partner_docs:
        partner_docs = await database.find_many("partners")

    partners = []
    for partner in partner_docs:
        lat = partner.get("latitude") or partner.get("lat") or (partner.get("location") or {}).get("latitude")
        lng = partner.get("longitude") or partner.get("lng") or (partner.get("location") or {}).get("longitude")
        is_store_open = bool(partner.get("isOnline", True) and partner.get("isStoreOpen", True))
        if lat is not None and lng is not None:
            partners.append(
                LiveLocation(
                    id=str(partner.get("_id") or partner.get("id") or ""),
                    kind="partner",
                    label=str(partner.get("businessName") or partner.get("storeName") or partner.get("name") or "QuickPress Store"),
                    latitude=float(lat),
                    longitude=float(lng),
                    status="open" if is_store_open else "closed",
                    updatedAt=partner.get("updatedAt"),
                )
            )

    # 4. Active Orders in transit
    active_orders = await database.find_many("customer_orders", {"status": {"$in": ["picked_up", "out_for_delivery", "assigned"]}})
    active = []
    for ord_doc in active_orders:
        addr = ord_doc.get("address") or {}
        lat = addr.get("latitude") or addr.get("lat")
        lng = addr.get("longitude") or addr.get("lng")
        if lat is not None and lng is not None:
            active.append(
                LiveLocation(
                    id=str(ord_doc.get("_id") or ord_doc.get("id")),
                    kind="order",
                    label=f"#{ord_doc.get('code', 'Order')} - {ord_doc.get('status')}",
                    latitude=float(lat),
                    longitude=float(lng),
                    orderId=str(ord_doc.get("_id") or ord_doc.get("id")),
                    status=ord_doc.get("status"),
                )
            )

    return LiveMapResponse(riders=riders, partners=partners, customers=[], activeOrders=active)
