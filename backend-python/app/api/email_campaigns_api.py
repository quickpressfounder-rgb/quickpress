"""Admin Bulk Marketing Email Campaigns API.

Allows administrators to broadcast targeted promotional announcements,
festive voucher discounts, or re-engagement reminders to segmented user audiences
with automatic rate-limited batch delivery and live open/click analytics.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.core.email_rate_limiter import email_rate_limiter, get_client_ip
from app.db.client import database
from app.db.email_repositories import email_repository
from app.core import email_service
from app.services.socket_service import sio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/emails/campaigns", tags=["admin-email-campaigns"])


class CreateCampaignPayload(BaseModel):
    title: str = Field(..., description="Campaign internal name / title")
    audience: str = Field("all_customers", description="all_customers | inactive_customers | all_partners | all_riders")
    subject: str = Field(..., description="Outbound email subject line")
    message: str = Field(..., description="Campaign announcement body text or HTML")
    couponCode: Optional[str] = Field(None, description="Optional promo voucher code")


async def _resolve_audience_recipients(audience: str) -> List[Dict[str, str]]:
    """Fetch real recipient emails from database based on target audience filter."""
    recipients: List[Dict[str, str]] = []
    seen_emails = set()

    try:
        if audience in ("all_customers", "inactive_customers"):
            users = await database.find_many("users", {})
            for u in users:
                email = str(u.get("email") or "").strip().lower()
                role = str(u.get("role") or "customer").lower()
                if email and "@" in email and email not in seen_emails and role == "customer":
                    seen_emails.add(email)
                    recipients.append({
                        "email": email,
                        "name": u.get("name") or email.split("@")[0].capitalize(),
                        "audience": "customer",
                    })

        elif audience == "all_partners":
            partners = await database.find_many("partners", {})
            for p in partners:
                email = str(p.get("email") or p.get("contactEmail") or "").strip().lower()
                if email and "@" in email and email not in seen_emails:
                    seen_emails.add(email)
                    recipients.append({
                        "email": email,
                        "name": p.get("name") or "Store Partner",
                        "audience": "partner",
                    })

        elif audience == "all_riders":
            riders = await database.find_many("riders", {})
            for r in riders:
                email = str(r.get("email") or "").strip().lower()
                if email and "@" in email and email not in seen_emails:
                    seen_emails.add(email)
                    recipients.append({
                        "email": email,
                        "name": r.get("name") or "Delivery Captain",
                        "audience": "rider",
                    })

    except Exception as exc:
        logger.warning("Error resolving audience '%s': %s", audience, exc)

    return recipients


async def _run_campaign_worker(campaign_id: str, payload: Dict[str, Any], recipients: List[Dict[str, str]]) -> None:
    """Background async batch delivery engine respecting database rate limits."""
    logger.info("Starting batch delivery for Campaign #%s (%d recipients)", campaign_id, len(recipients))
    await email_repository.update_campaign_progress(campaign_id, status="sending")

    coupon = payload.get("couponCode")
    subject = payload.get("subject", "QuickPress Announcement")
    raw_message = payload.get("message", "")

    for idx, rec in enumerate(recipients):
        name = rec.get("name", "Valued Customer")
        recipient_email = rec["email"]
        aud = rec.get("audience", "customer")

        # Dynamic voucher block
        voucher_html = ""
        if coupon:
            voucher_html = f"""
              <div style="background: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1px;">Exclusive Promo Code</span>
                <div style="font-family: monospace; font-size: 24px; font-weight: 900; color: #065f46; margin: 8px 0; letter-spacing: 2px;">{coupon}</div>
                <span style="font-size: 12px; color: #334155;">Apply code at checkout on QuickPress App</span>
              </div>
            """

        formatted_body = f"""
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
            Hello <strong>{name}</strong>,
          </p>
          <div style="font-size: 14px; color: #334155; line-height: 1.7; margin: 16px 0;">
            {raw_message}
          </div>
          {voucher_html}
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://quickpress.in" class="btn">Open QuickPress &amp; Book Now ➜</a>
          </div>
        """

        try:
            res = await email_service.dispatch_email(
                to=recipient_email,
                subject=subject,
                html=email_service._render_base_email(
                    preheader_text=subject,
                    badge_label="QuickPress Special",
                    headline="Special Update from QuickPress ✨",
                    subheadline="Exclusive notification & offers",
                    content_html=formatted_body,
                ),
                text=raw_message,
                recipient_name=name,
                audience=aud,
                category="manual",
                metadata={"campaignId": campaign_id, "couponCode": coupon},
            )

            sent_inc = 1 if res.get("ok") else 0
            fail_inc = 0 if res.get("ok") else 1

            await email_repository.update_campaign_progress(
                campaign_id,
                sent_delta=sent_inc,
                failed_delta=fail_inc,
            )

        except Exception as err:
            logger.warning("Failed dispatch in campaign #%s to %s: %s", campaign_id, recipient_email, err)
            await email_repository.update_campaign_progress(campaign_id, failed_delta=1)

        # Broadcast progress live to Admin Socket room every 2 items
        if idx % 2 == 0 or idx == len(recipients) - 1:
            try:
                camp = await email_repository.get_campaign(campaign_id)
                await sio.emit("campaign.progress", camp, room="admin")
            except Exception:
                pass

        # Brief rate-guard pause between emails to protect SMTP connection pool
        await asyncio.sleep(1.2)

    await email_repository.update_campaign_progress(campaign_id, status="completed")
    logger.info("Campaign #%s completed successfully.", campaign_id)


@router.get("")
async def list_campaigns(request: Request) -> Dict[str, Any]:
    """Retrieve all marketing broadcasts and historical batch stats."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:list_campaigns",
        action="List Marketing Campaigns",
        max_requests=60,
        window_seconds=60,
    )
    items = await email_repository.list_campaigns()
    return {"items": items, "count": len(items)}


@router.get("/{campaign_id}")
async def get_campaign_detail(campaign_id: str) -> Dict[str, Any]:
    """Get single campaign details and open/click metrics."""
    camp = await email_repository.get_campaign(campaign_id)
    if not camp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign '{campaign_id}' not found",
        )
    return camp


@router.post("")
async def create_and_launch_campaign(
    payload: CreateCampaignPayload,
    background_tasks: BackgroundTasks,
    request: Request,
) -> Dict[str, Any]:
    """Create and queue a marketing blast to targeted audience."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:create_campaign",
        action="Create Marketing Campaign",
        max_requests=5,
        window_seconds=300,
        error_message="Campaign creation limit reached (5 per 5m). Please wait before launching another campaign.",
    )

    recipients = await _resolve_audience_recipients(payload.audience)
    total_recipients = len(recipients)

    campaign_data = payload.model_dump()
    campaign_data["totalRecipients"] = total_recipients

    doc = await email_repository.create_campaign(campaign_data)
    campaign_id = doc["id"]

    if total_recipients > 0:
        background_tasks.add_task(
            _run_campaign_worker,
            campaign_id=campaign_id,
            payload=campaign_data,
            recipients=recipients,
        )

    return {
        "ok": True,
        "campaignId": campaign_id,
        "totalRecipients": total_recipients,
        "status": "queued" if total_recipients > 0 else "completed",
        "message": f"Campaign queued for {total_recipients} recipient{'s' if total_recipients != 1 else ''}.",
    }
