"""Admin Email Surveillance & Manual Communication Router.

Endpoints:
- GET  /api/admin/emails              List & filter dispatched email logs
- GET  /api/admin/emails/stats        Aggregated metrics for email hub
- GET  /api/admin/emails/{email_id}   Full email details & rendered HTML preview
- POST /api/admin/emails/send         Compose & dispatch custom admin email
- POST /api/admin/emails/{id}/reply   Direct reply to an email thread
- POST /api/admin/emails/{id}/resend  1-click resend of an existing email
- POST /api/admin/emails/trigger-test Test-dispatch any automated email template
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.db.email_repositories import email_repository
from app.core import email_service
from app.core.email_rate_limiter import email_rate_limiter, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/emails", tags=["admin-emails"])


class SendCustomEmailPayload(BaseModel):
    to: str = Field(..., description="Recipient email address")
    recipient_name: Optional[str] = Field(None, description="Recipient friendly name")
    cc: Optional[str] = Field(None, description="Comma-separated CC email addresses")
    subject: str = Field(..., description="Email subject line")
    message: str = Field(..., description="HTML or plaintext message content")
    audience: str = Field("customer", description="customer | partner | rider | admin")
    category: str = Field("manual", description="order | finance | onboarding | security | alert | manual")


class ReplyEmailPayload(BaseModel):
    message: str = Field(..., description="Reply message body")
    subject: Optional[str] = Field(None, description="Optional override subject line")
    cc: Optional[str] = Field(None, description="Comma-separated CC email addresses")


@router.get("")
async def list_emails(
    request: Request,
    audience: Optional[str] = Query(None, description="Audience filter (customer/partner/rider/admin)"),
    category: Optional[str] = Query(None, description="Category filter (order/finance/onboarding/etc)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter (sent/failed)"),
    search: Optional[str] = Query(None, description="Keyword search in email/subject/name"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
) -> Dict[str, Any]:
    """Retrieve paginated and filtered historical email audit logs with rate limiting."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:list_emails",
        action="Email Audit Search",
        max_requests=60,
        window_seconds=60,
    )
    items = await email_repository.find_emails(
        audience=audience,
        category=category,
        status=status_filter,
        search=search,
        limit=limit,
        skip=skip,
    )
    return {"items": items, "count": len(items)}


@router.delete("")
async def clear_all_emails(request: Request) -> Dict[str, Any]:
    """Delete all email records from the surveillance audit logs."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:clear_all_emails",
        action="Bulk Clear Audit Logs",
        max_requests=2,
        window_seconds=300,
    )
    count = await email_repository.clear_all()
    return {"ok": True, "deletedCount": count}


@router.delete("/{email_id}")
async def delete_email_log(email_id: str, request: Request) -> Dict[str, Any]:
    """Delete a single email record from the surveillance audit logs."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:delete_email",
        action="Delete Email Log",
        max_requests=30,
        window_seconds=60,
    )
    deleted = await email_repository.delete_email(email_id)
    return {"ok": deleted, "emailId": email_id}


@router.get("/stats")
async def get_email_stats() -> Dict[str, Any]:
    """Return high-level volume, success rate, category breakdowns, and active rate limits."""
    stats = await email_repository.get_email_stats()
    stats["rateLimits"] = await email_rate_limiter.get_active_rate_limits()
    return stats


@router.get("/{email_id}")
async def get_email_detail(email_id: str) -> Dict[str, Any]:
    """Fetch single email details including full rendered HTML."""
    doc = await email_repository.get_by_id(email_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email record #{email_id} not found",
        )
    return doc


@router.get("/{email_id}/thread")
async def get_email_thread(email_id: str) -> Dict[str, Any]:
    """Retrieve full chronological conversation thread between admin and recipient."""
    thread_items = await email_repository.get_thread(email_id)
    return {"items": thread_items, "count": len(thread_items)}


@router.post("/send")
async def send_custom_email(payload: SendCustomEmailPayload, request: Request) -> Dict[str, Any]:
    """Dispatch custom admin email to any customer, partner, rider, or staff."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:send_email",
        action="Admin Custom Email Dispatch",
        max_requests=10,
        window_seconds=60,
    )
    result = await email_service.send_custom_admin_email(
        to_email=payload.to,
        subject=payload.subject,
        html_or_text_message=payload.message,
        recipient_name=payload.recipient_name,
        audience=payload.audience,
        category=payload.category,
        cc=payload.cc,
    )
    return result


@router.post("/{email_id}/reply")
async def reply_to_email(email_id: str, payload: ReplyEmailPayload, request: Request) -> Dict[str, Any]:
    """Reply directly to an existing email conversation thread."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:reply_email",
        action="Admin Direct Reply",
        max_requests=15,
        window_seconds=60,
    )
    original = await email_repository.get_by_id(email_id)
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Original email #{email_id} not found",
        )

    to_addr = original.get("recipient")
    orig_sub = original.get("subject", "QuickPress Update")
    reply_subject = payload.subject or (orig_sub if orig_sub.startswith("Re:") else f"Re: {orig_sub}")

    result = await email_service.send_custom_admin_email(
        to_email=to_addr,
        subject=reply_subject,
        html_or_text_message=payload.message,
        recipient_name=original.get("recipientName"),
        audience=original.get("audience", "customer"),
        category=original.get("category", "manual"),
        reply_to_id=email_id,
        cc=payload.cc,
    )
    return result


@router.post("/{email_id}/resend")
async def resend_email(email_id: str, request: Request) -> Dict[str, Any]:
    """Re-dispatch an existing email log to its original recipient."""
    client_ip = get_client_ip(request)
    # 1. Prevent repeated resends of the exact same message
    await email_rate_limiter.enforce(
        key=f"resend:email:{email_id}",
        action="Email Resend per Message",
        max_requests=2,
        window_seconds=300,
        error_message=f"Email #{email_id} was resent recently. Limit is 2 resends per 5 minutes to avoid spamming the recipient.",
    )
    # 2. Prevent IP-level rapid-fire resends
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:resend_email",
        action="Admin Resend Email",
        max_requests=10,
        window_seconds=60,
    )

    original = await email_repository.get_by_id(email_id)
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email record #{email_id} not found",
        )

    result = await email_service.dispatch_email(
        to=original["recipient"],
        subject=f"[Resent] {original.get('subject', 'QuickPress Notification')}",
        html=original.get("htmlBody", "<p>No content</p>"),
        text=original.get("plainText"),
        recipient_name=original.get("recipientName"),
        audience=original.get("audience", "customer"),
        category=original.get("category", "manual"),
        metadata={"resentFromId": email_id},
    )
    return result

