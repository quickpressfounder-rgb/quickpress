"""Service Details API — Sprint 2.3.

    GET /api/services/{id}           full service detail (hero, care, FAQs,
                                     related services, partners, reviews)
    GET /api/services/{id}/partners  partners offering this service
    GET /api/services/{id}/related   related services

Reads are public — service details render for guests as well as signed-in
customers. Data comes from the MongoDB collections `services`, `categories`,
`catalog_partners`, `partner_reviews` and `service_content`.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.http_cache import CACHE_SHORT_LIVED, CACHE_STATIC_CATALOG, apply_cache_headers
from app.db.service_repositories import services_repository
from app.models.cart import (
    RelatedServiceResponse,
    ServiceDetailResponse,
    ServicePartnerResponse,
)

from app.core.deps import current_user
from app.db.catalog_repositories import catalog
from app.models.user import User

router = APIRouter(tags=["services"])


# ------------------------------------------------------------------
# Saved Services
# ------------------------------------------------------------------

@router.get("/services/saved")
async def get_saved_services(user: User = Depends(current_user)) -> list[dict]:
    """List all saved / favourite services for the logged-in customer."""
    return await catalog.saved_services(user.id)


@router.post("/services/saved/{service_id}")
async def toggle_saved_service(
    service_id: str, user: User = Depends(current_user)
) -> dict:
    """Toggle a service into or out of the customer's saved list."""
    return await catalog.toggle_saved_service(user.id, service_id)


@router.delete("/services/saved/{service_id}")
async def delete_saved_service(
    service_id: str, user: User = Depends(current_user)
) -> dict:
    """Remove a service from the customer's saved list."""
    return await catalog.remove_saved_service(user.id, service_id)


async def _document_or_404(service_id: str) -> dict:
    document = await services_repository.resolve(service_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return document


@router.get("/services/{service_id}", response_model=ServiceDetailResponse)
async def get_service(
    service_id: str,
    response: Response,
    city: Optional[str] = None,
) -> ServiceDetailResponse:
    apply_cache_headers(response, CACHE_STATIC_CATALOG)
    detail = await services_repository.service_detail(service_id, city=city)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return detail


@router.get("/services/{service_id}/partners", response_model=list[ServicePartnerResponse])
async def get_service_partners(
    service_id: str,
    response: Response,
    city: Optional[str] = None,
) -> list[ServicePartnerResponse]:
    apply_cache_headers(response, CACHE_SHORT_LIVED)
    document = await _document_or_404(service_id)
    return await services_repository.service_partners(document, city=city)


@router.get("/services/{service_id}/related", response_model=list[RelatedServiceResponse])
async def get_related_services(service_id: str, response: Response) -> list[RelatedServiceResponse]:
    apply_cache_headers(response, CACHE_STATIC_CATALOG)
    document = await _document_or_404(service_id)
    return await services_repository.related_services(document)
