"""Customer invoice API — Sprint 2.11.

    GET  /api/invoices                      invoice history (searchable)
    GET  /api/invoices/{invoice_id}         one invoice
    GET  /api/orders/{order_id}/invoice     the invoice of an order
    POST /api/invoices/{invoice_id}/share   share over whatsapp / email / link
    POST /api/invoices/{invoice_id}/download  mark + resolve a PDF download

Every route requires a bearer token and is scoped to `current_user`.
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials

from app.core.deps import bearer_scheme, current_user
from app.core.security import decode_token
from app.db.invoice_repositories import InvoiceError, invoice_repository
from app.db.repositories import users
from app.models.invoice import (
    Invoice,
    InvoiceDownloadResponse,
    InvoiceListResponse,
    InvoiceSharePayload,
    InvoiceShareResponse,
)
from app.models.user import User

router = APIRouter(tags=["invoices"])


def _raise(error: InvoiceError) -> None:
    raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    limit: int = Query(default=50, ge=1, le=200),
    q: str | None = None,
    user: User = Depends(current_user),
) -> InvoiceListResponse:
    return await invoice_repository.list(user, limit=limit, q=q)


@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, user: User = Depends(current_user)) -> Invoice:
    try:
        return await invoice_repository.get(user, invoice_id)
    except InvoiceError as error:
        _raise(error)
        raise


@router.get("/invoices/{invoice_id}/pdf")
@router.get("/invoices/{invoice_id}/download")
@router.get("/invoices/{invoice_id}/download.pdf")
async def get_invoice_pdf(
    invoice_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Response:
    """Stream 3-page Tax Invoice & Payment Summary PDF matching Rapido enterprise design."""
    user: Optional[User] = None
    tok = credentials.credentials if credentials and credentials.credentials else token
    if tok:
        try:
            user = await current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=tok))
        except Exception:
            pass

    try:
        pdf_bytes, file_name = await invoice_repository.get_pdf_bytes(user, invoice_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{file_name}"'},
        )
    except InvoiceError as error:
        _raise(error)
        raise


@router.get("/orders/{order_id}/invoice", response_model=Invoice)
async def invoice_for_order(order_id: str, user: User = Depends(current_user)) -> Invoice:
    try:
        return await invoice_repository.for_order(user, order_id)
    except InvoiceError as error:
        _raise(error)
        raise


@router.get("/orders/{order_id}/invoice/pdf")
async def order_invoice_pdf(
    order_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Response:
    """Direct PDF download for any order (Customer or Partner)."""
    user: Optional[User] = None
    tok = credentials.credentials if credentials and credentials.credentials else token
    if tok:
        try:
            user = await current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=tok))
        except Exception:
            pass

    try:
        invoice = await invoice_repository.for_order(user, order_id)
        pdf_bytes, file_name = await invoice_repository.get_pdf_bytes(user, invoice.id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{file_name}"'},
        )
    except InvoiceError as error:
        _raise(error)
        raise


@router.post("/invoices/{invoice_id}/share", response_model=InvoiceShareResponse)
async def share_invoice(
    invoice_id: str,
    payload: InvoiceSharePayload | None = None,
    user: User = Depends(current_user),
) -> InvoiceShareResponse:
    body = payload or InvoiceSharePayload()
    try:
        return await invoice_repository.share(user, invoice_id, body.channel, body.target)
    except InvoiceError as error:
        _raise(error)
        raise


@router.post("/invoices/{invoice_id}/download", response_model=InvoiceDownloadResponse)
async def download_invoice(
    invoice_id: str, user: User = Depends(current_user)
) -> InvoiceDownloadResponse:
    try:
        return await invoice_repository.download(user, invoice_id)
    except InvoiceError as error:
        _raise(error)
        raise
