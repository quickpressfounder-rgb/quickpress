"""Admin Email Template Studio API.

Allows administrators to preview, customize, and persist dynamic email branding,
headlines, voucher discount codes, and footer notices directly into Supabase PostgreSQL.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, Request, status

from app.core.email_rate_limiter import email_rate_limiter, get_client_ip
from app.db.email_repositories import email_repository
from app.core.email_service import _render_base_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/emails/templates", tags=["admin-email-templates"])


class UpdateTemplatePayload(BaseModel):
    subject: Optional[str] = Field(None, description="Email subject line")
    headline: Optional[str] = Field(None, description="Main banner header text")
    subheadline: Optional[str] = Field(None, description="Subheader caption")
    badgeLabel: Optional[str] = Field(None, description="Category badge pill")
    couponCode: Optional[str] = Field(None, description="Promotional voucher code")
    primaryColor: Optional[str] = Field(None, description="Header gradient primary color hex")
    accentColor: Optional[str] = Field(None, description="Accent button color hex")
    footerNote: Optional[str] = Field(None, description="Custom footer note")
    bodyContent: Optional[str] = Field(None, description="Custom HTML/text message block")


@router.get("")
async def list_email_templates(request: Request) -> Dict[str, Any]:
    """Retrieve all configurable email templates (16 lifecycle categories)."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:list_templates",
        action="List Email Templates",
        max_requests=60,
        window_seconds=60,
    )
    templates = await email_repository.list_templates()
    return {"items": templates, "count": len(templates)}


@router.get("/{template_id}")
async def get_email_template(template_id: str, request: Request) -> Dict[str, Any]:
    """Get single template configuration."""
    tmpl = await email_repository.get_template(template_id)
    if not tmpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )
    return tmpl


@router.put("/{template_id}")
async def update_email_template(
    template_id: str,
    payload: UpdateTemplatePayload,
    request: Request,
) -> Dict[str, Any]:
    """Save custom headline, voucher, or branding for a template in database."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:update_template",
        action="Update Email Template",
        max_requests=20,
        window_seconds=60,
    )

    clean_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = await email_repository.update_template(template_id, clean_data)
    return {"ok": True, "template": updated}


@router.post("/{template_id}/preview")
async def preview_email_template(
    template_id: str,
    payload: Optional[UpdateTemplatePayload] = None,
) -> Dict[str, Any]:
    """Generate rendered responsive HTML preview of the template with sample data."""
    tmpl = await email_repository.get_template(template_id)
    if not tmpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )

    # Merge transient payload if provided for live typing preview
    data = dict(tmpl)
    if payload:
        data.update({k: v for k, v in payload.model_dump().items() if v is not None})

    headline = data.get("headline", "QuickPress Laundry")
    subheadline = data.get("subheadline", "Doorstep Garment Care")
    badge_label = data.get("badgeLabel", "QuickPress Notice")
    footer_note = data.get("footerNote", "Questions? Reach us at official.quickpress@gmail.com")
    coupon_code = data.get("couponCode", "")

    sample_content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>Sample Customer</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        This is an interactive preview of your customized <strong>{tmpl.get('name', 'Template')}</strong>.
        Changes you make to headlines, vouchers, and color palettes reflect here in real-time.
      </p>
    """
    if coupon_code:
        sample_content += f"""
          <div style="background: #f0fdf4; border: 1.5px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
            <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase;">Promotional Voucher</span>
            <div style="font-family: monospace; font-size: 22px; font-weight: 900; color: #065f46; margin: 8px 0;">{coupon_code}</div>
            <span style="font-size: 12px; color: #334155;">Applied automatically on your next laundry order</span>
          </div>
        """

    sample_content += f"""
      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER ID</td><td class="meta-val">#QP-DEMO-882</td></tr>
          <tr><td class="meta-label">CATEGORY</td><td class="meta-val">{tmpl.get('category', 'order').upper()}</td></tr>
          <tr><td class="meta-label">STATUS</td><td class="meta-val" style="color: #059669;">Verified &amp; Active</td></tr>
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://quickpress.in" class="btn">View Order in QuickPress App ➜</a>
      </div>
    """

    rendered_html = _render_base_email(
        preheader_text=f"Preview: {headline}",
        badge_label=badge_label,
        headline=headline,
        subheadline=subheadline,
        content_html=sample_content,
        footer_note=footer_note,
    )

    return {
        "ok": True,
        "templateId": template_id,
        "html": rendered_html,
        "subject": data.get("subject", ""),
    }


@router.post("/{template_id}/reset")
async def reset_email_template(template_id: str, request: Request) -> Dict[str, Any]:
    """Revert template back to default system configuration."""
    client_ip = get_client_ip(request)
    await email_rate_limiter.enforce(
        key=f"ip:{client_ip}:reset_template",
        action="Reset Email Template",
        max_requests=10,
        window_seconds=60,
    )
    res = await email_repository.reset_template(template_id)
    return {"ok": True, "template": res}
