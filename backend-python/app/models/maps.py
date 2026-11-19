"""Google Maps request/response contracts (Sprint 5.4)."""

from __future__ import annotations

from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class LatLng(BaseModel):
    latitude: float
    longitude: float


class GeocodeResult(BaseModel):
    formattedAddress: str = ""
    placeId: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    area: str = ""
    street: str = ""
    landmark: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    country: str = ""


class PlaceSuggestion(BaseModel):
    placeId: str
    primaryText: str = ""
    secondaryText: str = ""
    description: str = ""


class PlaceDetails(BaseModel):
    placeId: str
    name: str = ""
    formattedAddress: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    area: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""


class RouteStep(BaseModel):
    instruction: str = ""
    maneuver: str = ""
    distanceMeters: int = 0


class RouteResult(BaseModel):
    polyline: str = ""
    distanceMeters: int = 0
    distanceKm: float = 0.0
    durationSeconds: int = 0
    etaMinutes: int = 0
    trafficDelayMinutes: int = 0
    steps: List[RouteStep] = Field(default_factory=list)


class RouteRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    travelMode: str = "TWO_WHEELER"


class MatrixRequest(BaseModel):
    origins: List[LatLng]
    destinations: List[LatLng]
    travelMode: str = "DRIVE"


class MatrixElement(BaseModel):
    originIndex: int = 0
    destinationIndex: int = 0
    distanceMeters: int = 0
    distanceKm: float = 0.0
    durationSeconds: int = 0
    etaMinutes: int = 0
    reachable: bool = True


class DeliveryAreaRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pincode: Optional[str] = None
    radiusKm: Optional[float] = None
    partnerId: Optional[str] = None


class NearestPartner(BaseModel):
    id: str
    name: str = ""
    distanceKm: float = 0.0
    withinRadius: bool = False
    servicePincodes: List[str] = Field(default_factory=list)


class DeliveryAreaResponse(BaseModel):
    serviceable: bool
    radiusKm: float
    message: str
    nearest: Optional[NearestPartner] = None
    partnersInRange: int = 0
    pincode: Optional[str] = None
    cityName: Optional[str] = None
    stateName: Optional[str] = None
    baseDeliveryFee: Optional[float] = 20.0
    estimatedSlaMinutes: Optional[int] = 30


class PincodeServiceabilityRequest(BaseModel):
    pincode: str
    city: Optional[str] = None
    state: Optional[str] = None


class PincodeServiceabilityResponse(BaseModel):
    serviceable: bool
    pincode: str
    city: str
    state: str
    areaName: str
    baseDeliveryFee: float
    surgeMultiplier: float
    activePartnersCount: int
    activeRidersCount: int
    matchedPartners: List[Dict[str, Any]] = Field(default_factory=list)
    stationedRiders: List[Dict[str, Any]] = Field(default_factory=list)
    estimatedSlaMinutes: int = 30
    message: str = "Pincode is fully serviceable"


class LiveLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    orderId: Optional[str] = None
    riderId: Optional[str] = None
    heading: Optional[float] = None
    speedKmph: Optional[float] = None


class LiveLocation(BaseModel):
    id: str
    kind: str  # rider | partner | customer
    label: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    heading: Optional[float] = None
    speedKmph: Optional[float] = None
    orderId: Optional[str] = None
    status: Optional[str] = None
    updatedAt: Optional[str] = None


class LiveMapResponse(BaseModel):
    riders: List[LiveLocation] = Field(default_factory=list)
    partners: List[LiveLocation] = Field(default_factory=list)
    customers: List[LiveLocation] = Field(default_factory=list)
    activeOrders: List[LiveLocation] = Field(default_factory=list)


class MapsStatus(BaseModel):
    configured: bool
    defaultRadiusKm: float
    features: List[str]
