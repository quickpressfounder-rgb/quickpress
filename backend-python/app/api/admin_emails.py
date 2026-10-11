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
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.config import get_settings
from app.core.deps import require_roles
from app.models.user import Role
from app.db.client import database
from app.db.email_repositories import email_repository
from app.core import email_service
from app.core.email_rate_limiter import email_rate_limiter, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/emails",
    tags=["admin-emails"],
    dependencies=[Depends(require_roles(Role.admin))],
)


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


# -----------------------------------------------------------------------------
# Franchise & SLA Merchant Agreement Management & Dispatch Gateway
# -----------------------------------------------------------------------------

class DispatchAgreementPayload(BaseModel):
    partnerId: Optional[str] = None
    email: str = Field(..., description="Recipient verified merchant email")
    businessName: str = Field(..., description="Store or laundry business trade name")
    ownerName: str = Field(..., description="Authorized proprietor / signatory name")
    phone: Optional[str] = None
    city: Optional[str] = "Kasganj"
    state: Optional[str] = "Uttar Pradesh"
    address: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    gstin: Optional[str] = None
    accountNumber: Optional[str] = None
    ifsc: Optional[str] = None
    bankName: Optional[str] = None
    customMessage: Optional[str] = None


@router.get("/agreements")
async def list_merchant_agreements(
    search: Optional[str] = Query(None, description="Search by store name, owner, or email"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by executed / pending / all"),
    limit: int = Query(100, ge=1, le=300),
) -> Dict[str, Any]:
    """Retrieve all Franchise & SLA Merchant Agreement dispatch records, execution status, and timestamps."""
    settings = get_settings()

    # 1. Fetch from partner_agreements
    agreements = await database.find_many("partner_agreements", {}, limit=limit) or []
    # 2. Fetch all partner profiles to ensure stores without agreements are also discoverable for manual dispatch
    profiles = await database.find_many("partner_profiles", {}, limit=limit) or []
    # 3. Fetch agreement email logs from email_logs
    email_logs = await email_repository.find_emails(category="onboarding", limit=limit) or []

    email_log_by_recipient = {}
    for el in email_logs:
        rec = str(el.get("recipient") or "").strip().lower()
        if rec and rec not in email_log_by_recipient:
            email_log_by_recipient[rec] = el

    merged_items: List[Dict[str, Any]] = []
    seen_keys = set()

    # Add executed agreements first
    for a in agreements:
        key = str(a.get("partnerId") or a.get("email") or a.get("_id"))
        if key in seen_keys:
            continue
        seen_keys.add(key)

        em = str(a.get("email") or "").strip().lower()
        log = email_log_by_recipient.get(em, {})

        is_signed = bool(a.get("status") == "digitally_executed" or a.get("signatureUrl"))
        merged_items.append({
            "id": str(a.get("_id") or a.get("partnerId")),
            "agreementId": str(a.get("_id") or f"agr-{str(a.get('partnerId', 'store'))[:8]}"),
            "partnerId": str(a.get("partnerId") or ""),
            "businessName": a.get("businessName") or "Partner Store",
            "ownerName": a.get("ownerName") or "Authorized Signatory",
            "email": em,
            "phone": a.get("phone") or "",
            "city": a.get("city") or "Kasganj",
            "state": a.get("state") or "Uttar Pradesh",
            "status": "digitally_executed" if is_signed else "dispatched_pending",
            "isAccepted": is_signed,
            "signedAt": a.get("signedAt") or a.get("updatedAt") or "",
            "hasSignature": bool(a.get("signatureUrl")),
            "signatureUrl": a.get("signatureUrl"),
            "signatoryName": a.get("signatory") or settings.company_signatory_name or "Dhani Ram",
            "companyLegalName": settings.company_legal_name or "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED",
            "lastDispatchedAt": log.get("createdAt") or a.get("signedAt") or "",
            "dispatchStatus": log.get("status") or "sent",
            "dispatchMethod": log.get("method") or "hostinger_api",
            "ccEmail": settings.notification_email or "official.quickpress@gmail.com",
            "version": a.get("version") or "QP-SLA-2026.4",
            "pdfAvailable": True,
        })

    # Add partner profiles that might not have signed an agreement yet
    for p in profiles:
        pid = str(p.get("_id") or p.get("partnerId") or "")
        em = str(p.get("email") or "").strip().lower()
        if pid in seen_keys or (em and em in seen_keys):
            continue
        seen_keys.add(pid or em)

        log = email_log_by_recipient.get(em, {})
        has_log = bool(log)

        merged_items.append({
            "id": pid or em,
            "agreementId": f"agr-{pid[:8]}" if pid else "agr-pending",
            "partnerId": pid,
            "businessName": p.get("shopName") or p.get("businessName") or "Partner Store",
            "ownerName": p.get("ownerName") or "Partner",
            "email": em or p.get("storeEmail") or "",
            "phone": p.get("phone") or p.get("ownerPhone") or "",
            "city": p.get("city") or "Kasganj",
            "state": p.get("state") or "Uttar Pradesh",
            "status": "dispatched_pending" if has_log else "not_dispatched",
            "isAccepted": False,
            "signedAt": "",
            "hasSignature": False,
            "signatureUrl": None,
            "signatoryName": settings.company_signatory_name or "Dhani Ram",
            "companyLegalName": settings.company_legal_name or "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED",
            "lastDispatchedAt": log.get("createdAt") or "",
            "dispatchStatus": log.get("status") or ("sent" if has_log else "unattempted"),
            "dispatchMethod": log.get("method") or "hostinger_api",
            "ccEmail": settings.notification_email or "official.quickpress@gmail.com",
            "version": "QP-SLA-2026.4",
            "pdfAvailable": True,
        })

    # Apply filters
    filtered = merged_items
    if search:
        s = search.strip().lower()
        filtered = [
            it for it in filtered
            if s in it["businessName"].lower()
            or s in it["ownerName"].lower()
            or s in it["email"].lower()
            or s in it.get("city", "").lower()
            or s in it.get("phone", "").lower()
        ]

    if status_filter:
        sf = status_filter.strip().lower()
        if sf in ("executed", "accepted", "signed"):
            filtered = [it for it in filtered if it["isAccepted"]]
        elif sf in ("pending", "unsigned"):
            filtered = [it for it in filtered if not it["isAccepted"]]

    total_count = len(merged_items)
    accepted_count = sum(1 for it in merged_items if it["isAccepted"])
    pending_count = total_count - accepted_count

    return {
        "items": filtered,
        "count": len(filtered),
        "stats": {
            "totalAgreements": total_count,
            "acceptedCount": accepted_count,
            "pendingCount": pending_count,
            "acceptanceRate": round((accepted_count / total_count * 100) if total_count else 0, 1),
            "gateway": "Hostinger Business API (info@withquickpress.com)",
            "cc": settings.notification_email or "official.quickpress@gmail.com",
            "signatory": settings.company_signatory_name or "Dhani Ram",
        },
    }


@router.post("/agreements/send")
async def dispatch_agreement_letter(payload: DispatchAgreementPayload, request: Request) -> Dict[str, Any]:
    """Manually generate and dispatch official QuickPress Franchise SLA Agreement PDF to partner."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:dispatch_agreement",
        action="Admin Agreement Dispatch",
        max_requests=20,
        window_seconds=60,
    )

    clean_email = payload.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Please enter a valid recipient email address")

    settings = get_settings()
    now_iso = datetime.now(timezone.utc).isoformat()
    store_id = payload.partnerId or f"ptr-{uuid.uuid4().hex[:8]}"

    # Check if existing partner has an uploaded signature
    existing_agr = await database.find_one("partner_agreements", {"$or": [{"partnerId": store_id}, {"email": clean_email}]})
    sig_url = (existing_agr or {}).get("signatureUrl")

    agreement_data = {
        "partnerId": store_id,
        "businessName": payload.businessName.strip(),
        "ownerName": payload.ownerName.strip(),
        "phone": payload.phone or "",
        "email": clean_email,
        "address": payload.address or f"Main Market, {payload.city or 'Kasganj'}",
        "city": payload.city or "Kasganj",
        "state": payload.state or "Uttar Pradesh",
        "pincode": "207123",
        "pan": payload.pan or "",
        "aadhaar": payload.aadhaar or "",
        "gstin": payload.gstin or "",
        "accountNumber": payload.accountNumber or "",
        "ifsc": payload.ifsc or "",
        "bankName": payload.bankName or "",
        "signatureUrl": sig_url,
        "signedAt": now_iso,
    }

    try:
        from app.services.partner_agreement_pdf_generator import generate_partner_agreement_pdf
        from app.core.email_service import send_partner_agreement_email

        pdf_bytes = generate_partner_agreement_pdf(agreement_data)
        agreement_id = (existing_agr or {}).get("_id") or f"agr-{store_id[:8]}-{uuid.uuid4().hex[:4]}"

        # Upsert agreement record
        await database.update(
            "partner_agreements",
            {"$or": [{"partnerId": store_id}, {"email": clean_email}]},
            {
                "_id": agreement_id,
                "partnerId": store_id,
                "businessName": payload.businessName.strip(),
                "ownerName": payload.ownerName.strip(),
                "email": clean_email,
                "phone": payload.phone or "",
                "city": payload.city or "Kasganj",
                "state": payload.state or "Uttar Pradesh",
                "address": payload.address or "",
                "status": "digitally_executed" if sig_url else "dispatched_pending",
                "signatory": settings.company_signatory_name or "Dhani Ram",
                "lastDispatchedAt": now_iso,
                "version": "QP-SLA-2026.4",
                "updatedAt": now_iso,
            },
            upsert=True,
        )

        dispatch_result = await send_partner_agreement_email(
            partner_email=clean_email,
            business_name=payload.businessName.strip(),
            owner_name=payload.ownerName.strip(),
            agreement_pdf_bytes=pdf_bytes,
        )

        logger.info("Admin dispatched agreement PDF to %s. Result: %s", clean_email, dispatch_result)
        return {
            "ok": True,
            "agreementId": agreement_id,
            "partnerId": store_id,
            "email": clean_email,
            "dispatchedAt": now_iso,
            "method": dispatch_result.get("method", "hostinger"),
            "cc": settings.notification_email or "official.quickpress@gmail.com",
            "message": f"Agreement letter generated and dispatched to {clean_email} with CC to official.quickpress@gmail.com ✓",
        }
    except Exception as exc:
        logger.error("Error generating/dispatching agreement PDF: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate or dispatch agreement PDF: {str(exc)}")


@router.get("/agreements/{agreement_id}/pdf")
async def download_agreement_pdf(agreement_id: str) -> Response:
    """Download / preview generated bilateral agreement PDF in browser."""
    agr = await database.find_one("partner_agreements", {"$or": [{"_id": agreement_id}, {"partnerId": agreement_id}]})
    if not agr:
        prof = await database.find_one("partner_profiles", {"$or": [{"_id": agreement_id}, {"partnerId": agreement_id}]})
        if prof:
            agr = {
                "businessName": prof.get("shopName") or prof.get("businessName") or "Store Partner",
                "ownerName": prof.get("ownerName") or "Proprietor",
                "email": prof.get("email") or "",
                "phone": prof.get("phone") or "",
                "city": prof.get("city") or "Kasganj",
                "state": prof.get("state") or "Uttar Pradesh",
                "address": prof.get("address") or "",
                "pan": prof.get("pan") or "",
                "aadhaar": prof.get("aadhaar") or "",
                "gstin": prof.get("gstin") or "",
                "signedAt": datetime.now(timezone.utc).isoformat(),
            }
        else:
            raise HTTPException(status_code=404, detail="Agreement record not found")

    from app.services.partner_agreement_pdf_generator import generate_partner_agreement_pdf
    pdf_bytes = generate_partner_agreement_pdf(agr)

    clean_name = "".join(c for c in (agr.get("businessName") or "Store") if c.isalnum() or c in ("-", "_"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="QuickPress-Agreement-{clean_name}.pdf"',
            "Content-Type": "application/pdf",
        },
    )


@router.post("/agreements/{agreement_id}/resend")
async def resend_agreement_letter(agreement_id: str, request: Request) -> Dict[str, Any]:
    """1-Click re-dispatch of bilateral agreement letter to partner."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:resend_agr",
        action="Admin Resend Agreement",
        max_requests=10,
        window_seconds=60,
    )
    agr = await database.find_one("partner_agreements", {"$or": [{"_id": agreement_id}, {"partnerId": agreement_id}]})
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement record not found")

    clean_email = (agr.get("email") or "").strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="Partner email address is missing on agreement record")

    from app.services.partner_agreement_pdf_generator import generate_partner_agreement_pdf
    from app.core.email_service import send_partner_agreement_email

    pdf_bytes = generate_partner_agreement_pdf(agr)
    res = await send_partner_agreement_email(
        partner_email=clean_email,
        business_name=agr.get("businessName") or "Store Partner",
        owner_name=agr.get("ownerName") or "Partner",
        agreement_pdf_bytes=pdf_bytes,
    )
    return {
        "ok": True,
        "agreementId": agreement_id,
        "email": clean_email,
        "method": res.get("method", "hostinger"),
        "message": f"Agreement letter re-dispatched to {clean_email} ✓",
    }

