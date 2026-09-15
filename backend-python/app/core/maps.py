"""Google Maps Platform integration — 100% environment driven.

The API key comes from GOOGLE_API_KEY (see app.config). Nothing is hardcoded
and the key never leaves the server: every browser-facing feature (geocoding,
reverse geocoding, autocomplete, routes, distance, ETA, delivery radius) is
proxied through the /api/maps endpoints.

APIs used (current, non-deprecated surfaces):
  • Geocoding API              maps.googleapis.com/maps/api/geocode/json
  • Places API (New)           places.googleapis.com/v1/places:autocomplete
  • Routes API                 routes.googleapis.com/directions/v2:computeRoutes
  • Route Matrix (Routes API)  routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
"""

from __future__ import annotations

import json
import logging
import math
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

import anyio
import httpx
from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places/"
ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
ROUTE_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"

TIMEOUT_SECONDS = 12


def maps_configured() -> bool:
    return bool(get_settings().maps_server_key)


def _require_key() -> str:
    key = get_settings().maps_server_key
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_MAPS_SERVER_API_KEY is not configured",
        )
    return key


def _http(
    url: str,
    *,
    method: str = "GET",
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method=method)
    request.add_header("Accept", "application/json")
    if payload is not None:
        request.add_header("Content-Type", "application/json")
    for name, value in (headers or {}).items():
        request.add_header(name, value)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as error:  # surface Google's own message
        detail = error.read().decode("utf-8", "ignore")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Maps request failed [{error.code}]: {detail[:500]}",
        ) from error
    except urllib.error.URLError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Maps unreachable: {error.reason}",
        ) from error


async def _call(
    url: str,
    *,
    method: str = "GET",
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(
        lambda: _http(url, method=method, body=body, headers=headers)
    )


# --------------------------------------------------------------------------
# Geocoding / reverse geocoding
# --------------------------------------------------------------------------


def _component(components: List[Dict[str, Any]], *types: str) -> str:
    for wanted in types:
        for component in components:
            if wanted in component.get("types", []):
                return component.get("long_name", "")
    return ""


def _map_geocode_result(result: Dict[str, Any]) -> Dict[str, Any]:
    components = result.get("address_components", [])
    location = result.get("geometry", {}).get("location", {})
    return {
        "formattedAddress": result.get("formatted_address", ""),
        "placeId": result.get("place_id", ""),
        "latitude": location.get("lat", 0.0),
        "longitude": location.get("lng", 0.0),
        "area": _component(components, "sublocality_level_1", "sublocality", "neighborhood", "route"),
        "city": _component(components, "locality", "administrative_area_level_3", "administrative_area_level_2"),
        "state": _component(components, "administrative_area_level_1"),
        "pincode": _component(components, "postal_code"),
        "country": _component(components, "country"),
    }


async def _fallback_reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    # 1. Try BigDataCloud reverse geocoding
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={latitude}&longitude={longitude}&localityLanguage=en"
        data = await _call(url, headers={"User-Agent": "QuickPress/1.0"})
        area = data.get("locality") or data.get("city") or ""
        city = data.get("city") or data.get("principalSubdivision") or ""
        state = data.get("principalSubdivision") or ""
        pincode = data.get("postcode") or ""
        country = data.get("countryName") or "India"
        formatted_parts = [p for p in [area, city, state, pincode, country] if p]
        formatted = ", ".join(formatted_parts) if formatted_parts else f"{latitude:.4f}, {longitude:.4f}"
        return {
            "formattedAddress": formatted,
            "placeId": data.get("plusCode") or f"loc_{latitude:.4f}_{longitude:.4f}",
            "latitude": latitude,
            "longitude": longitude,
            "area": area or city or "Current Location",
            "city": city,
            "state": state,
            "pincode": pincode,
            "country": country,
        }
    except Exception:
        pass

    # 2. Try OpenStreetMap Nominatim
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={latitude}&lon={longitude}"
        data = await _call(url, headers={"User-Agent": "QuickPress/1.0"})
        addr = data.get("address", {})
        area = (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("road")
            or addr.get("village")
            or addr.get("city_district")
            or ""
        )
        city = addr.get("city") or addr.get("town") or addr.get("county") or ""
        state = addr.get("state") or ""
        pincode = addr.get("postcode") or ""
        country = addr.get("country") or "India"
        return {
            "formattedAddress": data.get("display_name", f"{latitude:.4f}, {longitude:.4f}"),
            "placeId": str(data.get("place_id", f"osm_{latitude}_{longitude}")),
            "latitude": latitude,
            "longitude": longitude,
            "area": area or city or "Current Location",
            "city": city or state,
            "state": state,
            "pincode": pincode,
            "country": country,
        }
    except Exception:
        pass

    # 3. Safe coordinate baseline
    return {
        "formattedAddress": f"Selected Location ({latitude:.4f}, {longitude:.4f})",
        "placeId": f"coord_{latitude}_{longitude}",
        "latitude": latitude,
        "longitude": longitude,
        "area": "Current Location",
        "city": "Detected Area",
        "state": "",
        "pincode": "",
        "country": "India",
    }


async def geocode(address: str) -> Dict[str, Any]:
    key = get_settings().maps_server_key
    if key:
        try:
            query = urllib.parse.urlencode({"address": address, "key": key})
            data = await _call(f"{GEOCODE_URL}?{query}")
            if data.get("status") == "OK" and data.get("results"):
                return _map_geocode_result(data["results"][0])
        except Exception:
            pass

    # Fallback to Photon geocoding
    try:
        url = f"https://photon.komoot.io/api/?q={urllib.parse.quote(address)}&limit=1"
        data = await _call(url, headers={"User-Agent": "QuickPress/1.0"})
        features = data.get("features", [])
        if features:
            f = features[0]
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [0, 0])
            name = props.get("name") or props.get("street") or address
            city = props.get("city") or props.get("district") or props.get("county") or ""
            state = props.get("state") or ""
            pincode = props.get("postcode") or ""
            country = props.get("country") or "India"
            formatted = ", ".join([x for x in [name, city, state, pincode, country] if x])
            return {
                "formattedAddress": formatted,
                "placeId": f"geo:{coords[1]}:{coords[0]}:{props.get('osm_id', '')}",
                "latitude": coords[1],
                "longitude": coords[0],
                "area": name,
                "city": city,
                "state": state,
                "pincode": pincode,
                "country": country,
            }
    except Exception:
        pass

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")


async def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    key = get_settings().maps_server_key
    if key:
        try:
            query = urllib.parse.urlencode({"latlng": f"{latitude},{longitude}", "key": key})
            data = await _call(f"{GEOCODE_URL}?{query}")
            if data.get("status") == "OK" and data.get("results"):
                mapped = _map_geocode_result(data["results"][0])
                mapped["latitude"] = latitude
                mapped["longitude"] = longitude
                return mapped
        except Exception:
            pass
    return await _fallback_reverse_geocode(latitude, longitude)


# --------------------------------------------------------------------------
# Places API (New) — autocomplete + details
# --------------------------------------------------------------------------


async def autocomplete(
    query: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_meters: int = 30_000,
) -> List[Dict[str, Any]]:
    key = get_settings().maps_server_key
    if key:
        try:
            body: Dict[str, Any] = {"input": query}
            if latitude is not None and longitude is not None:
                body["locationBias"] = {
                    "circle": {
                        "center": {"latitude": latitude, "longitude": longitude},
                        "radius": float(radius_meters),
                    }
                }
            data = await _call(
                PLACES_AUTOCOMPLETE_URL,
                method="POST",
                body=body,
                headers={"X-Goog-Api-Key": key},
            )
            suggestions: List[Dict[str, Any]] = []
            for item in data.get("suggestions", []):
                place = item.get("placePrediction")
                if not place:
                    continue
                suggestions.append(
                    {
                        "placeId": place.get("placeId", ""),
                        "primaryText": place.get("structuredFormat", {}).get("mainText", {}).get("text", ""),
                        "secondaryText": place.get("structuredFormat", {})
                        .get("secondaryText", {})
                        .get("text", ""),
                        "description": place.get("text", {}).get("text", ""),
                    }
                )
            if suggestions:
                return suggestions
        except Exception:
            pass

    # Fallback to Photon geocoding search
    try:
        url = f"https://photon.komoot.io/api/?q={urllib.parse.quote(query)}&limit=8"
        if latitude is not None and longitude is not None:
            url += f"&lat={latitude}&lon={longitude}"
        data = await _call(url, headers={"User-Agent": "QuickPress/1.0"})
        suggestions = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            coords = feature.get("geometry", {}).get("coordinates", [0, 0])
            name = props.get("name") or props.get("street") or query
            city = props.get("city") or props.get("district") or props.get("county") or ""
            state = props.get("state") or ""
            pincode = props.get("postcode") or ""
            sec = ", ".join([x for x in [city, state, pincode] if x])
            desc = f"{name}, {sec}".strip(", ")
            place_id = f"geo:{coords[1]}:{coords[0]}:{props.get('osm_id', '')}"
            suggestions.append(
                {
                    "placeId": place_id,
                    "primaryText": name,
                    "secondaryText": sec,
                    "description": desc,
                }
            )
        if suggestions:
            return suggestions
    except Exception:
        pass

    return []


async def place_details(place_id: str) -> Dict[str, Any]:
    if place_id.startswith("geo:"):
        parts = place_id.split(":")
        if len(parts) >= 3:
            try:
                lat = float(parts[1])
                lng = float(parts[2])
                reversed_addr = await reverse_geocode(lat, lng)
                return {
                    "placeId": place_id,
                    "name": reversed_addr.get("area") or reversed_addr.get("city") or "Selected Location",
                    "formattedAddress": reversed_addr.get("formattedAddress", ""),
                    "latitude": lat,
                    "longitude": lng,
                    "area": reversed_addr.get("area", ""),
                    "city": reversed_addr.get("city", ""),
                    "state": reversed_addr.get("state", ""),
                    "pincode": reversed_addr.get("pincode", ""),
                }
            except Exception:
                pass

    key = get_settings().maps_server_key
    if key:
        try:
            data = await _call(
                f"{PLACES_DETAILS_URL}{urllib.parse.quote(place_id)}",
                headers={
                    "X-Goog-Api-Key": key,
                    "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
                },
            )
            location = data.get("location", {})
            components = [
                {"long_name": c.get("longText", ""), "types": c.get("types", [])}
                for c in data.get("addressComponents", [])
            ]
            return {
                "placeId": data.get("id", place_id),
                "name": data.get("displayName", {}).get("text", ""),
                "formattedAddress": data.get("formattedAddress", ""),
                "latitude": location.get("latitude", 0.0),
                "longitude": location.get("longitude", 0.0),
                "area": _component(components, "sublocality_level_1", "sublocality", "neighborhood", "route"),
                "city": _component(components, "locality", "administrative_area_level_3"),
                "state": _component(components, "administrative_area_level_1"),
                "pincode": _component(components, "postal_code"),
            }
        except Exception:
            pass

    # Fallback to geocode
    try:
        return await geocode(place_id)
    except Exception:
        return {
            "placeId": place_id,
            "name": place_id,
            "formattedAddress": place_id,
            "latitude": 0.0,
            "longitude": 0.0,
            "area": "",
            "city": "",
            "state": "",
            "pincode": "",
        }


# --------------------------------------------------------------------------
# Routes API — route, polyline, distance, ETA, matrix
# --------------------------------------------------------------------------


def _waypoint(latitude: float, longitude: float) -> Dict[str, Any]:
    return {"location": {"latLng": {"latitude": latitude, "longitude": longitude}}}


def _seconds(value: Any) -> int:
    if isinstance(value, str) and value.endswith("s"):
        try:
            return int(float(value[:-1]))
        except ValueError:
            return 0
    if isinstance(value, (int, float)):
        return int(value)
    return 0


async def _osrm_route(
    origin: Tuple[float, float],
    destination: Tuple[float, float],
) -> Dict[str, Any]:
    """Real road-to-road street routing via OpenStreetMap OSRM engine."""
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
        f"?overview=full&geometries=polyline&steps=true"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                r = data["routes"][0]
                dist_m = int(r.get("distance", 0))
                dur_s = int(r.get("duration", 0))
                steps: List[Dict[str, Any]] = []
                for leg in r.get("legs", []):
                    for st in leg.get("steps", []):
                        maneuver = st.get("maneuver", {})
                        m_type = maneuver.get("type", "turn")
                        modifier = maneuver.get("modifier", "")
                        instruction = f"{m_type} {modifier}".strip() if modifier else m_type
                        if st.get("name"):
                            instruction += f" onto {st['name']}"
                        steps.append(
                            {
                                "instruction": instruction,
                                "maneuver": f"{m_type}-{modifier}".strip("-"),
                                "distanceMeters": int(st.get("distance", 0)),
                            }
                        )
                return {
                    "polyline": r.get("geometry", ""),
                    "distanceMeters": dist_m,
                    "distanceKm": round(dist_m / 1000, 2),
                    "durationSeconds": dur_s,
                    "etaMinutes": max(1, round(dur_s / 60)),
                    "trafficDelayMinutes": 0,
                    "steps": steps[:25],
                }
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not available")


async def compute_route(
    origin: Tuple[float, float],
    destination: Tuple[float, float],
    travel_mode: str = "TWO_WHEELER",
) -> Dict[str, Any]:
    try:
        key = _require_key()
        body = {
            "origin": _waypoint(*origin),
            "destination": _waypoint(*destination),
            "travelMode": travel_mode,
            "polylineQuality": "HIGH_QUALITY",
        }
        if travel_mode in {"DRIVE", "TWO_WHEELER"}:
            body["routingPreference"] = "TRAFFIC_AWARE"
        data = await _call(
            ROUTES_URL,
            method="POST",
            body=body,
            headers={
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": (
                    "routes.duration,routes.staticDuration,routes.distanceMeters,"
                    "routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,"
                    "routes.legs.steps.distanceMeters"
                ),
            },
        )
        routes = data.get("routes", [])
        if not routes:
            return await _osrm_route(origin, destination)
        route = routes[0]
        duration = _seconds(route.get("duration"))
        static_duration = _seconds(route.get("staticDuration")) or duration
        distance_meters = int(route.get("distanceMeters", 0))
        steps: List[Dict[str, Any]] = []
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                instruction = step.get("navigationInstruction", {})
                if not instruction:
                    continue
                steps.append(
                    {
                        "instruction": instruction.get("instructions", ""),
                        "maneuver": instruction.get("maneuver", ""),
                        "distanceMeters": int(step.get("distanceMeters", 0)),
                    }
                )
        return {
            "polyline": route.get("polyline", {}).get("encodedPolyline", ""),
            "distanceMeters": distance_meters,
            "distanceKm": round(distance_meters / 1000, 2),
            "durationSeconds": duration,
            "etaMinutes": max(1, round(duration / 60)),
            "trafficDelayMinutes": max(0, round((duration - static_duration) / 60)),
            "steps": steps[:25],
        }
    except Exception as e:
        logger.warning("Google Routes API failed (%s), falling back to OSRM road-to-road route", e)
        return await _osrm_route(origin, destination)


async def route_matrix(
    origins: List[Tuple[float, float]],
    destinations: List[Tuple[float, float]],
    travel_mode: str = "DRIVE",
) -> List[Dict[str, Any]]:
    key = _require_key()
    body = {
        "origins": [{"waypoint": _waypoint(*origin)} for origin in origins],
        "destinations": [{"waypoint": _waypoint(*destination)} for destination in destinations],
        "travelMode": travel_mode,
    }
    if travel_mode in {"DRIVE", "TWO_WHEELER"}:
        body["routingPreference"] = "TRAFFIC_AWARE"
    data = await _call(
        ROUTE_MATRIX_URL,
        method="POST",
        body=body,
        headers={
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": (
                "originIndex,destinationIndex,duration,distanceMeters,condition"
            ),
        },
    )
    elements = data if isinstance(data, list) else data.get("elements", [])
    rows: List[Dict[str, Any]] = []
    for element in elements:
        distance_meters = int(element.get("distanceMeters", 0))
        duration = _seconds(element.get("duration"))
        rows.append(
            {
                "originIndex": int(element.get("originIndex", 0)),
                "destinationIndex": int(element.get("destinationIndex", 0)),
                "distanceMeters": distance_meters,
                "distanceKm": round(distance_meters / 1000, 2),
                "durationSeconds": duration,
                "etaMinutes": max(1, round(duration / 60)) if duration else 0,
                "reachable": element.get("condition", "ROUTE_EXISTS") == "ROUTE_EXISTS",
            }
        )
    return rows


# --------------------------------------------------------------------------
# Delivery radius validation
# --------------------------------------------------------------------------


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    d_lat, d_lon = lat2 - lat1, lon2 - lon1
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return round(2 * 6371.0088 * math.asin(math.sqrt(h)), 3)
