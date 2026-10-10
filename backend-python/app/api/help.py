"""Help Center API — Sprint 2.11.

    GET  /api/help/faqs                        FAQs (category filter + search)
    GET  /api/help/categories                  FAQ categories
    POST /api/help/tickets                     raise a support ticket
    GET  /api/help/tickets                     the customer's tickets
    GET  /api/help/tickets/{ticket_id}         one ticket + full conversation
    POST /api/help/tickets/{ticket_id}/reply   add a customer reply

FAQs and categories are public content; every ticket route requires a bearer
token and is scoped to `current_user`.
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.cloudinary import upload_image
from app.core.deps import current_user
from app.core.http_cache import CACHE_STATIC_CATALOG, apply_cache_headers
from app.db.support_repositories import SupportError, support_repository
from app.models.media import ImageUploadPayload, MediaResponse
from app.models.support import (
    CreateTicketPayload,
    FaqCategoriesResponse,
    FaqListResponse,
    SupportTicket,
    TicketListResponse,
    TicketReplyPayload,
)
from app.models.user import User

router = APIRouter(tags=["help"])


@router.post("/help/upload", response_model=MediaResponse)
async def upload_support_photo(
    payload: ImageUploadPayload, user: User = Depends(current_user)
) -> MediaResponse:
    photo_uid = uuid.uuid4().hex[:8]
    url = await upload_image(payload.image, kind="support_ticket", public_id=f"{user.id}-help-{photo_uid}")
    return MediaResponse(url=url, field="attachmentUrl")


@router.get("/help/faqs", response_model=FaqListResponse)
async def list_faqs(
    response: Response,
    category: str | None = Query(default=None, alias="category"),
    q: str | None = None,
) -> FaqListResponse:
    apply_cache_headers(response, CACHE_STATIC_CATALOG)
    return await support_repository.faqs(category_id=category, q=q)


@router.get("/help/categories", response_model=FaqCategoriesResponse)
async def list_categories(response: Response) -> FaqCategoriesResponse:
    apply_cache_headers(response, CACHE_STATIC_CATALOG)
    return await support_repository.categories()


@router.post("/help/tickets", response_model=SupportTicket, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: CreateTicketPayload, user: User = Depends(current_user)
) -> SupportTicket:
    try:
        return await support_repository.create_ticket(user, payload)
    except SupportError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.get("/help/tickets", response_model=TicketListResponse)
async def list_tickets(
    status_filter: str | None = Query(default=None, alias="status"),
    user: User = Depends(current_user),
) -> TicketListResponse:
    return await support_repository.list_tickets(user, status=status_filter)


@router.get("/help/tickets/{ticket_id}", response_model=SupportTicket)
async def get_ticket(ticket_id: str, user: User = Depends(current_user)) -> SupportTicket:
    try:
        return await support_repository.get_ticket(user, ticket_id)
    except SupportError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.post("/help/tickets/{ticket_id}/reply", response_model=SupportTicket)
async def reply_ticket(
    ticket_id: str, payload: TicketReplyPayload, user: User = Depends(current_user)
) -> SupportTicket:
    try:
        return await support_repository.reply(user, ticket_id, payload)
    except SupportError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error
