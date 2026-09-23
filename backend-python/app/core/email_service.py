"""QuickPress Complete Email Automation & Dispatch Engine.

Features:
1. Unified dispatch pipeline with automatic database audit logging (`email_logs`).
2. Dual-transport fallback: Primary Gmail SMTP (direct SSL/TLS) with optional Resend API fallback.
3. Customer Lifecycle:
   - 2FA Security Verification OTP
   - Welcome & Onboarding with Promo Voucher
   - Order Placement Confirmation
   - Clothes Inspected & Item Count Verified
   - Order Delivered with GST Tax Invoice PDF Attachment
   - Order Cancellation & Instant Refund Notice
   - QuickPress Wallet Credit / Cashback Notification
   - Abandoned Cart / Booking Incomplete Re-engagement
4. Partner Store Lifecycle:
   - Partner Onboarding & Agreement Welcome
   - KYC & Bank Account Verification Status
   - Weekly Settlement Statement & Payout Summary
   - Tier Upgrade Congratulations (Silver 15% / Gold 12%)
   - Sensitive Profile Change Request Approval/Rejection
5. Delivery Captain Lifecycle:
   - Captain Account Activation & Duty Welcome
   - Weekly Trip Earnings & Distance Payout Summary
   - COD Cash In Hand Limit / Freeze Warning
6. Admin & Operations Escalations:
   - SLA Breach / Emergency Operational Alert
   - Daily Executive Business Performance Digest
   - GPS Geofence Anomaly & Fraud Alert
   - Garment Damage / Missing Claim Ticket Alert
7. Admin Manual Communication:
   - Custom Email Dispatch & Threaded Reply Gateway
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional
import httpx

from app.config import get_settings
from app.db.email_repositories import email_repository
from app.core.email_rate_limiter import email_rate_limiter

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _send_smtp_sync(
    host: str,
    port: int,
    user: str,
    password: str,
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    from_name: str = "QuickPress",
    attachment_bytes: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
    attachment_type: str = "application/pdf",
    cc: Optional[List[str] | str] = None,
) -> Dict[str, Any]:
    """Synchronous SMTP email sender with optional file attachments and CC."""
    clean_cc: List[str] = []
    if cc:
        if isinstance(cc, str):
            clean_cc = [c.strip().lower() for c in cc.split(",") if c.strip()]
        elif isinstance(cc, list):
            clean_cc = [str(c).strip().lower() for c in cc if str(c).strip()]

    if attachment_bytes:
        msg = MIMEMultipart("mixed")
        msg_body = MIMEMultipart("alternative")
        if text:
            msg_body.attach(MIMEText(text, "plain", "utf-8"))
        msg_body.attach(MIMEText(html, "html", "utf-8"))
        msg.attach(msg_body)

        part = MIMEApplication(attachment_bytes, _subtype="pdf")
        filename = attachment_name or "QuickPress-Document.pdf"
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)
    else:
        msg = MIMEMultipart("alternative")
        if text:
            msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{user}>"
    msg["To"] = to
    if clean_cc:
        msg["Cc"] = ", ".join(clean_cc)

    all_recipients = [to] + clean_cc

    try:
        if int(port) == 465:
            with smtplib.SMTP_SSL(host, int(port), timeout=12.0) as server:
                server.login(user, password)
                server.sendmail(user, all_recipients, msg.as_string())
        else:
            with smtplib.SMTP(host, int(port), timeout=12.0) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(user, all_recipients, msg.as_string())

        logger.info("📧 SMTP Email successfully sent to %s (CC: %s, Subject: %s)", to, clean_cc, subject)
        return {"ok": True, "method": "smtp", "from": user, "recipient": to, "cc": clean_cc}
    except Exception as exc:
        logger.warning("SMTP dispatch error for %s: %s", to, exc)
        return {"ok": False, "method": "smtp", "error": str(exc)}


async def send_smtp_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    from_name: Optional[str] = None,
    attachment_bytes: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
    cc: Optional[List[str] | str] = None,
) -> Dict[str, Any]:
    """Asynchronous SMTP email dispatch wrapper."""
    settings = get_settings()
    host = settings.smtp_host or "smtp.gmail.com"
    port = int(settings.smtp_port or 465)
    user = settings.smtp_user or "official.quickpress@gmail.com"
    password = settings.smtp_password
    sender_name = from_name or settings.smtp_from_name or "QuickPress"

    if not user or not password:
        return {"ok": False, "error": "SMTP credentials not configured (set SMTP_USER and SMTP_PASSWORD in .env)"}

    return await asyncio.to_thread(
        _send_smtp_sync,
        host=host,
        port=port,
        user=user,
        password=password,
        to=to.strip().lower(),
        subject=subject,
        html=html,
        text=text,
        from_name=sender_name,
        attachment_bytes=attachment_bytes,
        attachment_name=attachment_name,
        cc=cc,
    )


async def send_resend_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    from_email: Optional[str] = None,
    attachment_bytes: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an email via Resend API with optional attachment."""
    import base64

    settings = get_settings()
    api_key = settings.resend_api_key
    sender = from_email or settings.resend_from_email or "QuickPress <onboarding@resend.dev>"

    if not api_key:
        return {"ok": False, "error": "RESEND_API_KEY not configured"}

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "from": sender,
        "to": [to.strip().lower()],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    if attachment_bytes:
        payload["attachments"] = [
            {
                "filename": attachment_name or "QuickPress-Document.pdf",
                "content": base64.b64encode(attachment_bytes).decode("utf-8"),
            }
        ]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if response.status_code in (200, 201):
                data = response.json()
                logger.info("Resend Email successfully dispatched to %s. Message ID: %s", to, data.get("id"))
                return {"ok": True, "method": "resend", "id": data.get("id")}
            else:
                return {"ok": False, "method": "resend", "status": response.status_code, "error": response.text}
    except Exception as exc:
        return {"ok": False, "method": "resend", "error": str(exc)}


async def dispatch_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    recipient_name: Optional[str] = None,
    audience: str = "customer",
    category: str = "order",
    metadata: Optional[Dict[str, Any]] = None,
    attachment_bytes: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
    is_reply: bool = False,
    reply_to_id: Optional[str] = None,
    sent_by: Optional[str] = None,
    cc: Optional[List[str] | str] = None,
) -> Dict[str, Any]:
    """
    Central Email Dispatch Pipeline.
    Tries Gmail SMTP first, falls back to Resend API if needed, and permanently logs the audit record.
    """
    settings = get_settings()
    res: Dict[str, Any] = {"ok": False}
    method_used = "smtp"
    error_msg: Optional[str] = None
    email_id = f"eml-{uuid.uuid4().hex[:12]}"

    # Inject 1x1 transparent open tracking pixel into HTML
    base_tracking_url = getattr(settings, "api_base_url", None) or getattr(settings, "app_url", None) or "http://localhost:8000"
    base_tracking_url = str(base_tracking_url).rstrip("/")
    tracking_pixel = (
        f'<img src="{base_tracking_url}/api/emails/track/open/{email_id}.png" '
        f'width="1" height="1" style="display:none !important; max-height:0px; max-width:0px; overflow:hidden;" alt="" />'
    )
    if "</body>" in html:
        final_html = html.replace("</body>", f"{tracking_pixel}</body>")
    else:
        final_html = f"{html}\n{tracking_pixel}"

    # 0. Global Sliding-Window Rate Limit (Max 30 outbound emails/minute platform-wide)
    allowed, current_count, retry_after = await email_rate_limiter.check_and_increment(
        key="global:smtp_dispatch",
        action="Global Outbound Email Dispatch",
        max_requests=30,
        window_seconds=60,
    )
    if not allowed:
        error_msg = f"Platform outbound email limit reached (30/min). Retry after {retry_after}s."
        logger.warning(
            "Global SMTP dispatch rate limit reached (%d/30). Retry after %ds.",
            current_count,
            retry_after,
        )
        logged_doc = await email_repository.log_email(
            recipient=to,
            recipient_name=recipient_name,
            subject=subject,
            html_body=final_html,
            plain_text=text or "",
            audience=audience,
            category=category,
            status="failed",
            method="rate_limited",
            sender=settings.smtp_user or "official.quickpress@gmail.com",
            error_message=error_msg,
            metadata=metadata or {},
            is_reply=is_reply,
            reply_to_id=reply_to_id,
            has_attachment=bool(attachment_bytes),
            attachment_name=attachment_name,
            cc=cc,
            email_id=email_id,
        )
        return {
            "ok": False,
            "status": "rate_limited",
            "method": "rate_limited",
            "emailId": logged_doc.get("id"),
            "error": error_msg,
        }

    # 1. Try Gmail SMTP
    if settings.smtp_user and settings.smtp_password:
        res = await send_smtp_email(
            to=to,
            subject=subject,
            html=final_html,
            text=text,
            attachment_bytes=attachment_bytes,
            attachment_name=attachment_name,
            cc=cc,
        )
        method_used = "smtp"

    # 2. Resend Fallback
    if not res.get("ok") and settings.resend_api_key:
        fallback_res = await send_resend_email(
            to=to,
            subject=subject,
            html=final_html,
            text=text,
            attachment_bytes=attachment_bytes,
            attachment_name=attachment_name,
        )
        if fallback_res.get("ok"):
            res = fallback_res
            method_used = "resend"
        else:
            error_msg = f"SMTP error: {res.get('error')}; Resend error: {fallback_res.get('error')}"
    elif not res.get("ok"):
        error_msg = res.get("error") or "Email gateway dispatch failed"

    status = "sent" if res.get("ok") else "failed"

    # 3. Permanent Audit Logging
    logged_doc = await email_repository.log_email(
        recipient=to,
        recipient_name=recipient_name,
        subject=subject,
        html_body=final_html,
        plain_text=text or "",
        audience=audience,
        category=category,
        status=status,
        method=method_used,
        sender=settings.smtp_user or "official.quickpress@gmail.com",
        error_message=error_msg,
        metadata=metadata or {},
        is_reply=is_reply,
        reply_to_id=reply_to_id,
        has_attachment=bool(attachment_bytes),
        attachment_name=attachment_name,
        cc=cc,
        email_id=email_id,
    )

    return {
        "ok": res.get("ok", False),
        "status": status,
        "method": method_used,
        "emailId": logged_doc.get("id"),
        "error": error_msg,
    }


# =============================================================================
# BASE EMAIL TEMPLATE WRAPPER (Responsive, Modern QuickPress Theme)
# =============================================================================
def _render_base_email(
    preheader_text: str,
    badge_label: str,
    headline: str,
    subheadline: str,
    content_html: str,
    footer_note: Optional[str] = None,
) -> str:
    """Generate cohesive, premium QuickPress branded HTML container."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{headline}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }}
    .preheader {{
      display: none !important;
      visibility: hidden;
      opacity: 0;
      color: transparent;
      height: 0;
      width: 0;
      mso-hide: all;
    }}
    .container {{
      max-width: 600px;
      margin: 24px auto;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .header {{
      background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%);
      padding: 32px 28px;
      text-align: center;
      color: #ffffff;
    }}
    .logo-badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 5px 14px;
      border-radius: 9999px;
      text-transform: uppercase;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }}
    .header h1 {{
      font-size: 22px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
      color: #ffffff;
    }}
    .header p {{
      font-size: 13px;
      color: #a7f3d0;
      margin: 8px 0 0 0;
      font-weight: 500;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .card {{
      background: #f8fafc;
      border-radius: 14px;
      padding: 18px 20px;
      border: 1px solid #e2e8f0;
      margin: 20px 0;
    }}
    .btn {{
      display: inline-block;
      background: #059669;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 10px;
      text-align: center;
      margin: 16px 0;
    }}
    .meta-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    .meta-table td {{
      padding: 6px 0;
      vertical-align: top;
    }}
    .meta-label {{
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }}
    .meta-val {{
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }}
    .footer {{
      background: #0f172a;
      padding: 24px 28px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.6;
    }}
    .footer a {{
      color: #10b981;
      text-decoration: none;
      font-weight: 600;
    }}
  </style>
</head>
<body>
  <div class="preheader">{preheader_text}</div>
  <div class="container">
    <div class="header">
      <div class="logo-badge">{badge_label}</div>
      <h1>{headline}</h1>
      <p>{subheadline}</p>
    </div>
    <div class="content">
      {content_html}
    </div>
    <div class="footer">
      <strong style="color: #ffffff;">QuickPress Laundry &amp; Dry Cleaning Services</strong><br>
      {footer_note or 'Questions? Reach us anytime at official.quickpress@gmail.com'}<br>
      <span style="font-size: 11px; color: #64748b; display: inline-block; margin-top: 6px;">
        Eco-Friendly Care · 7-Step Inspection · Kasganj Operations Hub
      </span>
    </div>
  </div>
</body>
</html>"""


# =============================================================================
# 1. CUSTOMER EMAIL AUTOMATIONS
# =============================================================================

# (A) 2FA Security OTP
async def send_otp_email(
    to_email: str,
    otp: str,
    purpose: str = "2FA Login Verification",
    recipient_name: str = "QuickPress Administrator",
) -> Dict[str, Any]:
    """Dispatch branded 2FA Security OTP email with anti-bombing rate limiting."""
    clean_target = to_email.strip().lower()
    allowed, count, retry_after = await email_rate_limiter.check_and_increment(
        key=f"otp:{clean_target}",
        action="2FA Verification OTP",
        max_requests=3,
        window_seconds=300,
    )
    if not allowed:
        logger.warning(
            "2FA OTP rate limit exceeded for %s (%d/3 in 5m). Retry after %ds.",
            clean_target,
            count,
            retry_after,
        )
        return {
            "ok": False,
            "status": "rate_limited",
            "error": f"Too many OTP requests for {clean_target}. Limit is 3 per 5 minutes. Please wait {retry_after}s.",
            "retryAfter": retry_after,
        }

    formatted_otp = " ".join(list(otp))
    subject = f"Your QuickPress Security Code: {otp}"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{recipient_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        A sign-in attempt was initiated for your QuickPress account. Please use the following 6-digit verification code to complete your authentication:
      </p>

      <div style="background: #f0fdf4; border: 2px dashed #059669; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #047857; text-transform: uppercase;">{purpose}</div>
        <div style="font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #065f46; margin: 10px 0;">{formatted_otp}</div>
        <div style="display: inline-block; font-size: 12px; font-weight: 700; color: #047857; background: #dcfce7; padding: 3px 12px; border-radius: 9999px;">Valid for 5 minutes</div>
      </div>

      <div style="background: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #64748b;">
        <strong>Security Notice:</strong> Never share this code with anyone. QuickPress team members will never ask for your 2FA OTP.
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Your QuickPress verification code is {otp}",
        badge_label="QuickPress Security",
        headline="Two-Factor Authentication",
        subheadline="Secure login verification code",
        content_html=content,
    )
    return await dispatch_email(
        to=to_email,
        subject=subject,
        html=html,
        text=f"Your QuickPress {purpose} code is: {otp}. Valid for 5 minutes.",
        recipient_name=recipient_name,
        audience="admin",
        category="security",
        metadata={"purpose": purpose},
    )


# (1) Welcome & Onboarding Email
async def send_welcome_email(
    to_email: str,
    customer_name: str,
    coupon_code: str = "WELCOME50",
) -> Dict[str, Any]:
    """Send welcome onboarding email to new customers with promo coupon."""
    subject = f"Welcome to QuickPress, {customer_name}! Here is ₹50 Off ✨🧺"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Welcome to <strong>QuickPress</strong> — your on-demand laundry and garment care partner. Never worry about ironing, washing, or dry-cleaning again!
      </p>

      <div style="background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1px;">Exclusive Welcome Gift</span>
        <h2 style="font-size: 26px; color: #065f46; margin: 8px 0; font-weight: 900;">Flat ₹50 OFF</h2>
        <p style="font-size: 13px; color: #334155; margin-bottom: 12px;">Use promo code at checkout on your first order:</p>
        <div style="display: inline-block; background: #ffffff; border: 2px dashed #059669; padding: 8px 20px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: 900; color: #047857; letter-spacing: 2px;">
          {coupon_code}
        </div>
      </div>

      <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-top: 24px;">The QuickPress Promise:</h3>
      <ul style="font-size: 13px; color: #475569; line-height: 1.8; padding-left: 20px;">
        <li>⚡ <strong>60-Minute Fast Turnaround</strong> for Steam Ironing</li>
        <li>🌿 <strong>Eco-Friendly &amp; Hypoallergenic</strong> German Detergents</li>
        <li>🛵 <strong>Free Doorstep Pickup &amp; Delivery</strong> right to your door</li>
        <li>🛡️ <strong>100% Quality &amp; Fabric Safety Guarantee</strong></li>
      </ul>
    """
    html = _render_base_email(
        preheader_text="Get flat ₹50 off on your first QuickPress laundry order!",
        badge_label="Welcome to QuickPress",
        headline="Fresh Clothes, Zero Hassle! ✨",
        subheadline="Your on-demand doorstep laundry partner",
        content_html=content,
    )
    return await dispatch_email(
        to=to_email,
        subject=subject,
        html=html,
        text=f"Welcome {customer_name}! Use coupon {coupon_code} for flat ₹50 off your first laundry order.",
        recipient_name=customer_name,
        audience="customer",
        category="onboarding",
        metadata={"couponCode": coupon_code},
    )


# (2) Order Placement Confirmation Email
async def send_order_confirmation_email(order: Dict[str, Any]) -> Dict[str, Any]:
    """Send order placement receipt and summary to customer immediately after booking."""
    order_code = order.get("code") or f"QP-{str(order.get('_id') or '')[-6:]}"
    customer = order.get("customer") or {}
    customer_name = order.get("customerName") or customer.get("name") or "Valued Customer"
    recipient_email = order.get("customerEmail") or customer.get("email") or ""
    if not recipient_email:
        return {"ok": False, "skipped": True, "reason": "No customer email"}

    items = order.get("items") or []
    totals = order.get("totals") or order.get("pricing") or {}
    grand_total = float(totals.get("grandTotal") or totals.get("total") or 0.0)
    service_label = order.get("serviceLabel") or "Laundry Service"
    pickup_slot = order.get("pickupSlot") or "Scheduled Today"

    items_html = ""
    for it in items[:6]:
        qty = it.get("qty") or it.get("quantity") or 1
        name = it.get("name") or "Garment"
        items_html += f"<tr><td style='padding: 6px 0; color: #334155;'>{name}</td><td style='text-align: right; font-weight: 700; color: #0f172a;'>x{qty}</td></tr>"

    subject = f"Order Confirmed #{order_code} — QuickPress Laundry"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Your laundry order <strong>#{order_code}</strong> has been placed successfully! Our partner store and nearest delivery captain are being assigned.
      </p>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER ID</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">SERVICE</td><td class="meta-val">{service_label}</td></tr>
          <tr><td class="meta-label">PICKUP TIME</td><td class="meta-val">{pickup_slot}</td></tr>
          <tr><td class="meta-label">TOTAL PAYABLE</td><td class="meta-val" style="color: #059669; font-size: 15px;">₹{grand_total:.2f}</td></tr>
        </table>
      </div>

      <h4 style="font-size: 13px; text-transform: uppercase; color: #64748b; margin: 16px 0 8px 0;">Items Booked ({len(items)})</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        {items_html}
      </table>

      <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
        Keep your clothes packed and ready for the doorstep Captain.
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Your QuickPress order #{order_code} is confirmed! Total: ₹{grand_total:.2f}",
        badge_label="Order Confirmed",
        headline="We've Got Your Laundry! 🧺",
        subheadline=f"Order #{order_code} is booked and processing",
        content_html=content,
    )
    return await dispatch_email(
        to=recipient_email,
        subject=subject,
        html=html,
        text=f"Hello {customer_name}, your QuickPress order #{order_code} ({service_label}) is confirmed. Total: ₹{grand_total:.2f}.",
        recipient_name=customer_name,
        audience="customer",
        category="order",
        metadata={"orderCode": order_code, "orderId": str(order.get("_id") or "")},
    )


# (4) Clothes Inspected & Item Count Verified Email
async def send_clothes_inspected_email(
    order: Dict[str, Any],
    verified_count: int,
    service_type: str = "Wash & Steam Press",
) -> Dict[str, Any]:
    """Send alert after clothes reach partner store and item inspection is completed."""
    order_code = order.get("code") or "QP"
    customer = order.get("customer") or {}
    customer_name = order.get("customerName") or customer.get("name") or "Valued Customer"
    recipient_email = order.get("customerEmail") or customer.get("email") or ""
    partner = order.get("partner") or {}
    partner_name = partner.get("name") or "QuickPress Certified Laundromat"

    if not recipient_email:
        return {"ok": False, "skipped": True}

    subject = f"Clothes Verified & In-Process #{order_code} — QuickPress"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Your garments have safely arrived at <strong>{partner_name}</strong>. Our fabric specialists have completed the physical count and initial inspection.
      </p>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER ID</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">VERIFIED GARMENTS</td><td class="meta-val" style="color: #059669; font-size: 16px;">{verified_count} Items</td></tr>
          <tr><td class="meta-label">TREATMENT PLAN</td><td class="meta-val">{service_type}</td></tr>
          <tr><td class="meta-label">STORE STATUS</td><td class="meta-val">Washing &amp; Pressing Active 🫧</td></tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        Each garment is being processed according to its care label with eco-safe solutions. We will notify you once your clothes are packed and ready for delivery!
      </p>
    """
    html = _render_base_email(
        preheader_text=f"Your {verified_count} garments are verified and in treatment for #{order_code}",
        badge_label="Store Handover Complete",
        headline="Clothes Verified &amp; Cleaning Started! 🫧",
        subheadline=f"{verified_count} garments undergoing 7-step care",
        content_html=content,
    )
    return await dispatch_email(
        to=recipient_email,
        subject=subject,
        html=html,
        text=f"Hello {customer_name}, {verified_count} garments for order #{order_code} have been verified at {partner_name} and are now in treatment.",
        recipient_name=customer_name,
        audience="customer",
        category="order",
        metadata={"orderCode": order_code, "verifiedCount": verified_count},
    )


# (6) Order Delivered & Tax Invoice PDF Email (Enhanced with audit logging)
async def send_order_completion_email(order_or_id: str | Dict[str, Any]) -> Dict[str, Any]:
    """Automated Order Completion & Tax Invoice Email Dispatcher with PDF Attachment."""
    from app.db.client import database
    from app.db.invoice_repositories import invoice_repository
    from app.services import order_lifecycle as lifecycle

    order: Optional[Dict[str, Any]] = None
    if isinstance(order_or_id, dict):
        order = order_or_id
    else:
        order = await database.find_one(lifecycle.ORDERS, {"_id": order_or_id})
        if not order:
            order = await database.find_one("customer_orders", {"_id": order_or_id})

    if not order:
        return {"ok": False, "error": f"Order {order_or_id} not found"}

    order_id = lifecycle.order_id_of(order)
    order_code = order.get("code") or f"QP-{order_id[-6:]}"

    customer = order.get("customer") or {}
    customer_name = order.get("customerName") or customer.get("name") or "QuickPress Customer"
    recipient_email = order.get("customerEmail") or customer.get("email") or ""

    user_id = str(order.get("userId") or order.get("customerId") or customer.get("id") or "")
    if not recipient_email and user_id:
        from app.db.repositories import users
        user_doc = await users.by_id(user_id)
        if user_doc and user_doc.email:
            recipient_email = user_doc.email

    if not recipient_email:
        return {"ok": False, "skipped": True, "reason": "No customer email"}

    address = order.get("address") or customer.get("address") or {}
    delivery_addr_str = address.get("formatted") or address.get("street") or "Customer Address"
    partner = order.get("partner") or {}
    partner_name = partner.get("name") or "QuickPress Partner Hub"
    rider = order.get("rider") or {}
    captain_name = rider.get("name") or "QuickPress Delivery Captain"

    items = order.get("items") or []
    totals = order.get("totals") or order.get("pricing") or {}
    subtotal = float(totals.get("subtotal") or totals.get("itemsTotal") or 0.0)
    discount = float(totals.get("discount") or totals.get("couponDiscount") or 0.0)
    delivery_fee = float(totals.get("delivery") or totals.get("deliveryFee") or 0.0)
    taxes = float(totals.get("gst") or totals.get("tax") or 0.0)
    grand_total = float(totals.get("grandTotal") or totals.get("total") or 0.0)
    if subtotal <= 0 and grand_total > 0:
        subtotal = grand_total

    payment = order.get("payment") or {}
    payment_mode = str(payment.get("mode") or payment.get("method") or "online")
    order_date = (order.get("createdAt") or lifecycle.now_iso())[:10]

    # Generate Tax Invoice PDF
    pdf_bytes: Optional[bytes] = None
    pdf_filename = f"QuickPress-Tax-Invoice-{order_code}.pdf"
    try:
        from app.services.invoice_pdf_generator import build_invoice_pdf_payload, generate_invoice_pdf
        invoice_doc = await database.find_one("invoices", {"order_id": order_id})
        if invoice_doc:
            try:
                inv_model = invoice_repository._to_model(invoice_doc)
                payload = build_invoice_pdf_payload(inv_model, order)
            except Exception:
                payload = build_invoice_pdf_payload(invoice_doc, order)
        else:
            inv_dict = {
                "orderNumber": order_code,
                "invoiceNumber": f"QP/2026/{order_code.replace('QP-', '')}",
                "invoiceDate": order.get("createdAt") or lifecycle.now_iso(),
                "serviceLabel": order.get("serviceLabel") or "Premium Laundry & Dry Cleaning",
                "customer": {"name": customer_name, "phone": order.get("customerPhone") or "", "addressLine": delivery_addr_str, "city": "Kasganj"},
                "partner": {"name": partner_name, "addressLine": "QuickPress Laundromat Hub", "city": "Kasganj"},
                "totals": {"itemsTotal": subtotal, "discount": discount, "delivery": delivery_fee, "gst": taxes, "grandTotal": grand_total},
                "payment": {"mode": payment_mode, "methodLabel": payment.get("method") or "Online Payment", "paid": True},
                "gst": {"gstin": "09AAHCR1710J1ZE", "placeOfSupply": "Uttar Pradesh"},
            }
            payload = build_invoice_pdf_payload(inv_dict, order)

        pdf_bytes = generate_invoice_pdf(payload)
    except Exception as exc:
        logger.warning("Could not generate PDF attachment for Order #%s: %s", order_code, exc)

    items_rows = "".join([
        f"<tr><td style='padding: 6px 0; color: #334155;'>{it.get('name','Item')}</td><td style='text-align: center; color: #64748b;'>x{it.get('qty', 1)}</td><td style='text-align: right; font-weight: 700;'>₹{float(it.get('total') or (float(it.get('unitPrice') or 0)*int(it.get('qty') or 1))):.2f}</td></tr>"
        for it in items
    ])

    subject = f"Order #{order_code} Delivered — Your QuickPress Tax Invoice & Summary"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Your garments have been freshly cleaned, crisp-pressed, and safely delivered by Captain <strong>{captain_name}</strong>.
      </p>

      <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 14px; margin: 16px 0;">
        <strong style="color: #065f46; font-size: 13px;">📄 Official Tax Invoice Attached (PDF)</strong>
        <p style="color: #047857; font-size: 12px; margin: 2px 0 0 0;">GST-compliant breakdown with SAC Code 999799 attached for your tax and expense records.</p>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER ID</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">DELIVERED ON</td><td class="meta-val">{order_date}</td></tr>
          <tr><td class="meta-label">LAUNDROMAT</td><td class="meta-val">{partner_name}</td></tr>
          <tr><td class="meta-label">PAYMENT MODE</td><td class="meta-val" style="color: #059669;">{payment_mode.upper()}</td></tr>
          <tr><td class="meta-label">TOTAL PAID</td><td class="meta-val" style="font-size: 16px; color: #064e3b;">₹{grand_total:.2f}</td></tr>
        </table>
      </div>

      <h4 style="font-size: 13px; text-transform: uppercase; color: #64748b; margin: 16px 0 6px 0;">Garments Summary</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        {items_rows}
      </table>
    """
    html = _render_base_email(
        preheader_text=f"Your QuickPress order #{order_code} has been delivered. Invoice attached.",
        badge_label="Order Delivered",
        headline="Delivered Crisp &amp; Fresh! ✨🧺",
        subheadline=f"Your order #{order_code} is complete",
        content_html=content,
    )

    return await dispatch_email(
        to=recipient_email,
        subject=subject,
        html=html,
        text=f"Hello {customer_name}, your order #{order_code} is delivered! Total: ₹{grand_total:.2f}. Invoice attached.",
        recipient_name=customer_name,
        audience="customer",
        category="order",
        metadata={"orderCode": order_code, "grandTotal": grand_total},
        attachment_bytes=pdf_bytes,
        attachment_name=pdf_filename,
    )


# (7) Order Cancellation & Instant Refund Email
async def send_order_cancellation_email(
    order: Dict[str, Any],
    reason: str = "Partner SLA / Timeout",
    refund_amount: float = 0.0,
    refund_method: str = "QuickPress Wallet / Original Payment",
) -> Dict[str, Any]:
    """Notify customer of order cancellation and automatic refund processing."""
    order_code = order.get("code") or "QP"
    customer = order.get("customer") or {}
    customer_name = order.get("customerName") or customer.get("name") or "Valued Customer"
    recipient_email = order.get("customerEmail") or customer.get("email") or ""

    if not recipient_email:
        return {"ok": False, "skipped": True}

    subject = f"Order #{order_code} Cancelled — Refund Processed"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        We apologize, but your order <strong>#{order_code}</strong> could not be fulfilled and has been cancelled.
      </p>

      <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Cancellation Details</span>
        <div style="font-size: 14px; font-weight: 700; color: #7f1d1d; margin-top: 4px;">Reason: {reason}</div>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER ID</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">REFUND AMOUNT</td><td class="meta-val" style="color: #059669; font-size: 16px;">₹{refund_amount:.2f}</td></tr>
          <tr><td class="meta-label">REFUND DESTINATION</td><td class="meta-val">{refund_method}</td></tr>
          <tr><td class="meta-label">REFUND STATUS</td><td class="meta-val" style="color: #059669;">Instant Credit Initiated ✅</td></tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        If refunded to your QuickPress Wallet, the balance is ready for immediate use. For bank or UPI transfers, funds typically reflect in 2-4 hours.
      </p>
    """
    html = _render_base_email(
        preheader_text=f"Order #{order_code} cancelled. ₹{refund_amount:.2f} refund initiated.",
        badge_label="Cancellation & Refund",
        headline="Order Cancelled &amp; Refunded",
        subheadline=f"Refund initiated for Order #{order_code}",
        content_html=content,
    )
    return await dispatch_email(
        to=recipient_email,
        subject=subject,
        html=html,
        text=f"Hello {customer_name}, order #{order_code} was cancelled ({reason}). Refund of ₹{refund_amount:.2f} processed to {refund_method}.",
        recipient_name=customer_name,
        audience="customer",
        category="finance",
        metadata={"orderCode": order_code, "refundAmount": refund_amount, "reason": reason},
    )


# (8) Wallet Credit / Cashback Received Email
async def send_wallet_credit_email(
    to_email: str,
    customer_name: str,
    amount: float,
    new_balance: float,
    reason: str = "Cashback Reward",
) -> Dict[str, Any]:
    """Notify user of wallet recharge, promotional cashback, or referral earnings."""
    subject = f"₹{amount:.2f} Credited to Your QuickPress Wallet! 💰"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Great news! <strong>₹{amount:.2f}</strong> has just been credited to your QuickPress Wallet.
      </p>

      <div style="background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 22px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase;">Amount Credited</span>
        <div style="font-size: 32px; font-weight: 900; color: #065f46; margin: 6px 0;">+₹{amount:.2f}</div>
        <div style="font-size: 13px; color: #047857; font-weight: 600;">{reason}</div>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">TRANSACTION TYPE</td><td class="meta-val">Wallet Credit</td></tr>
          <tr><td class="meta-label">NEW WALLET BALANCE</td><td class="meta-val" style="color: #059669; font-size: 15px;">₹{new_balance:.2f}</td></tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center;">
        Your wallet balance never expires. Use it on your next dry cleaning or steam iron booking!
      </p>
    """
    html = _render_base_email(
        preheader_text=f"₹{amount:.2f} added to your QuickPress Wallet. Total balance: ₹{new_balance:.2f}",
        badge_label="Wallet Update",
        headline="Wallet Balance Credited! 💰",
        subheadline=f"+₹{amount:.2f} added to your QuickPress Wallet",
        content_html=content,
    )
    return await dispatch_email(
        to=to_email,
        subject=subject,
        html=html,
        text=f"Hello {customer_name}, ₹{amount:.2f} was credited to your wallet for: {reason}. New balance: ₹{new_balance:.2f}.",
        recipient_name=customer_name,
        audience="customer",
        category="finance",
        metadata={"amount": amount, "newBalance": new_balance, "reason": reason},
    )


# (9) Abandoned Cart / Booking Incomplete Re-engagement Email
async def send_abandoned_cart_email(
    to_email: str,
    customer_name: str,
    items: List[Dict[str, Any]],
    promo_code: str = "SAVE10",
) -> Dict[str, Any]:
    """Re-engage customer who left laundry items in cart without booking."""
    subject = f"Did you forget your laundry, {customer_name}? Extra 10% Off Inside! 🧺"
    items_count = sum(int(it.get("qty", 1)) for it in items) if items else 3
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{customer_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        We noticed you left <strong>{items_count} items</strong> in your QuickPress cart. Don't let your clothes pile up — let us take care of them today!
      </p>

      <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #1d4ed8; text-transform: uppercase;">Special Checkout Incentive</span>
        <div style="font-size: 22px; font-weight: 900; color: #1e40af; margin: 6px 0;">Extra 10% OFF</div>
        <p style="font-size: 12px; color: #3b82f6; margin-bottom: 10px;">Use code at checkout to complete your booking:</p>
        <div style="display: inline-block; background: #ffffff; border: 2px dashed #2563eb; padding: 6px 16px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: 900; color: #1d4ed8; letter-spacing: 2px;">
          {promo_code}
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://quickpress.online" class="btn" style="background: #2563eb;">Complete Your Laundry Order Now ➜</a>
      </div>
    """
    html = _render_base_email(
        preheader_text="Your garments are waiting in your cart. Take an extra 10% off now!",
        badge_label="Garment Care Reminder",
        headline="Don't Leave Your Clothes Hanging! 🧺",
        subheadline="Your bag is waiting in your QuickPress cart",
        content_html=content,
    )
    return await dispatch_email(
        to=to_email,
        subject=subject,
        html=html,
        text=f"Hello {customer_name}, complete your laundry booking with code {promo_code} for an extra 10% off!",
        recipient_name=customer_name,
        audience="customer",
        category="order",
        metadata={"promoCode": promo_code, "itemsCount": items_count},
    )


# =============================================================================
# 2. PARTNER STORE EMAIL AUTOMATIONS
# =============================================================================

# (10) Partner Onboarding & Welcome Email
async def send_partner_welcome_email(
    partner_email: str,
    business_name: str,
    owner_name: str,
) -> Dict[str, Any]:
    """Welcome newly registered partner laundromat store."""
    subject = f"Welcome to QuickPress Partner Network, {business_name}!"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Dear <strong>{owner_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Welcome to the <strong>QuickPress Partner Merchant Network</strong>! We are thrilled to partner with <strong>{business_name}</strong> to bring premium laundry services to thousands of local customers.
      </p>

      <div class="card">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #047857; text-transform: uppercase;">Merchant Account Highlights</h4>
        <ul style="font-size: 13px; color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>🛵 <strong>Automated Rider Pickup &amp; Delivery</strong>: You focus on wash &amp; iron, our Captain fleet handles all transport.</li>
          <li>🏦 <strong>Weekly Bank Settlements</strong>: Automatic Monday morning direct bank payouts.</li>
          <li>📈 <strong>Tiered Volume Discounts</strong>: Lower your platform commission to 15% (Silver) and 12% (Gold) as your order volume grows.</li>
          <li>🛡️ <strong>Zero COD Risk</strong>: 100% platform-guaranteed payouts on every completed order.</li>
        </ul>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 14px; text-align: center;">
        <a href="https://quickpress-partner.vercel.app" class="btn">Open Partner Dashboard ➜</a>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Welcome {business_name} to the QuickPress Merchant Partner Network!",
        badge_label="Partner Onboarding",
        headline="Welcome to QuickPress Partners! 🏪",
        subheadline=f"Empowering {business_name} with automated logistics",
        content_html=content,
    )
    return await dispatch_email(
        to=partner_email,
        subject=subject,
        html=html,
        text=f"Welcome {business_name} to QuickPress! Log into your Partner Dashboard at https://quickpress-partner.vercel.app",
        recipient_name=owner_name,
        audience="partner",
        category="onboarding",
        metadata={"businessName": business_name},
    )


# (11) Partner KYC / Bank Verification Status Email
async def send_partner_kyc_status_email(
    partner_email: str,
    business_name: str,
    status: str,  # "approved" | "rejected" | "action_required"
    remarks: Optional[str] = None,
) -> Dict[str, Any]:
    """Notify partner of KYC document or bank account verification outcome."""
    is_approved = status.lower() == "approved"
    status_color = "#059669" if is_approved else "#dc2626"
    status_label = "KYC Verified &amp; Store Active ✅" if is_approved else "Verification Action Required ⚠️"
    subject = f"KYC Status: {business_name} — {('Approved' if is_approved else 'Action Required')}"

    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Dear <strong>{business_name}</strong> Management,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Our compliance team has reviewed your uploaded business documents (PAN, GSTIN, and Bank Passbook/IFSC).
      </p>

      <div style="background: {'#f0fdf4' if is_approved else '#fef2f2'}; border: 1.5px solid {'#a7f3d0' if is_approved else '#fecaca'}; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: {status_color}; text-transform: uppercase;">Verification Outcome</span>
        <div style="font-size: 20px; font-weight: 900; color: {status_color}; margin-top: 6px;">{status_label}</div>
      </div>

      {f'<div class="card"><strong style="color: #991b1b; font-size: 13px;">Reviewer Remarks:</strong><p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">{remarks}</p></div>' if remarks else ''}

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        {('Your store is now authorized to receive live customer orders.' if is_approved else 'Please log into the Partner Portal to update the required documents.')}
      </p>
    """
    html = _render_base_email(
        preheader_text=f"KYC Verification update for {business_name}",
        badge_label="Compliance & Verification",
        headline="Store KYC Status Update",
        subheadline=f"Document verification review for {business_name}",
        content_html=content,
    )
    return await dispatch_email(
        to=partner_email,
        subject=subject,
        html=html,
        text=f"KYC status for {business_name}: {status}. Remarks: {remarks or 'None'}",
        recipient_name=business_name,
        audience="partner",
        category="security",
        metadata={"businessName": business_name, "status": status},
    )


# (13) Weekly Payout & Settlement Statement Email
async def send_partner_settlement_email(
    partner_email: str,
    business_name: str,
    cycle_period: str,
    net_payout: float,
    gross_orders_count: int,
    commission_deducted: float,
    tds_deducted: float,
    payout_ref: str,
) -> Dict[str, Any]:
    """Send automated weekly financial settlement report to partner store."""
    subject = f"Weekly Settlement Statement #{payout_ref} — ₹{net_payout:.2f}"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Dear <strong>{business_name}</strong> Partner,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Your weekly financial settlement for the period <strong>{cycle_period}</strong> has been computed and scheduled for direct bank disbursement.
      </p>

      <div style="background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase;">Net Bank Payout</span>
        <div style="font-size: 32px; font-weight: 900; color: #065f46; margin: 6px 0;">₹{net_payout:.2f}</div>
        <div style="font-size: 12px; color: #047857;">Payout Reference: {payout_ref}</div>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">SETTLEMENT CYCLE</td><td class="meta-val">{cycle_period}</td></tr>
          <tr><td class="meta-label">COMPLETED ORDERS</td><td class="meta-val">{gross_orders_count} Orders</td></tr>
          <tr><td class="meta-label">PLATFORM COMMISSION</td><td class="meta-val" style="color: #dc2626;">-₹{commission_deducted:.2f}</td></tr>
          <tr><td class="meta-label">TDS (SEC 194-O, 1%)</td><td class="meta-val" style="color: #dc2626;">-₹{tds_deducted:.2f}</td></tr>
          <tr><td class="meta-label">NET DIRECT TRANSFER</td><td class="meta-val" style="color: #059669; font-size: 15px;">₹{net_payout:.2f}</td></tr>
        </table>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
        Funds are disbursed directly to your registered bank account. You can download the itemized statement from your Partner Portal.
      </p>
    """
    html = _render_base_email(
        preheader_text=f"Weekly settlement for {business_name}: ₹{net_payout:.2f} scheduled.",
        badge_label="Financial Settlement",
        headline="Weekly Partner Settlement 🏦",
        subheadline=f"Financial statement for cycle {cycle_period}",
        content_html=content,
    )
    return await dispatch_email(
        to=partner_email,
        subject=subject,
        html=html,
        text=f"Weekly settlement for {business_name}: ₹{net_payout:.2f} ({cycle_period}). Ref: {payout_ref}",
        recipient_name=business_name,
        audience="partner",
        category="finance",
        metadata={"cyclePeriod": cycle_period, "netPayout": net_payout, "ref": payout_ref},
    )


# (14) Partner Tier Upgrade Congratulations Email
async def send_partner_tier_upgrade_email(
    partner_email: str,
    business_name: str,
    new_tier: str,  # "Silver" | "Gold"
    new_commission_pct: float,  # e.g. 15.0 or 12.0
) -> Dict[str, Any]:
    """Congratulate partner on upgrading commission tier through order volume."""
    subject = f"Congratulations {business_name}! You've Upgraded to {new_tier} Tier 🏆"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Dear <strong>{business_name}</strong> Partner,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Outstanding achievement! Thanks to your exceptional laundry service quality and high order volume this month, your store has automatically upgraded to:
      </p>

      <div style="background: #fffbeb; border: 2px solid #fde68a; border-radius: 14px; padding: 22px; text-align: center; margin: 20px 0;">
        <span style="font-size: 12px; font-weight: 800; color: #b45309; text-transform: uppercase;">New Partner Status</span>
        <div style="font-size: 30px; font-weight: 900; color: #92400e; margin: 6px 0;">{new_tier} Partner Tier 🏆</div>
        <div style="font-size: 14px; font-weight: 700; color: #059669;">Platform Commission Dropped to {new_commission_pct}%</div>
      </div>

      <div class="card">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #047857; text-transform: uppercase;">Your Unlocked Perks</h4>
        <ul style="font-size: 13px; color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>💰 <strong>Lower Platform Commission</strong>: Keep more profit on every order ({new_commission_pct}% take rate).</li>
          <li>⭐ <strong>Search Priority</strong>: Higher placement on the QuickPress customer app homepage.</li>
          <li>🏷️ <strong>Free Branding Materials</strong>: Complimentary QuickPress laundry packaging bags and tag rolls.</li>
        </ul>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Congratulations! {business_name} has achieved {new_tier} status with {new_commission_pct}% commission.",
        badge_label="Partner Milestone",
        headline="Tier Upgrade Achieved! 🏆",
        subheadline=f"{business_name} is now a {new_tier} Partner",
        content_html=content,
    )
    return await dispatch_email(
        to=partner_email,
        subject=subject,
        html=html,
        text=f"Congratulations {business_name}! You are now a {new_tier} partner with reduced {new_commission_pct}% commission.",
        recipient_name=business_name,
        audience="partner",
        category="finance",
        metadata={"newTier": new_tier, "newCommission": new_commission_pct},
    )


# (15) Sensitive Profile Change Request Status Email
async def send_partner_approval_status_email(
    partner_email: str,
    business_name: str,
    request_type: str,
    status: str,  # "approved" | "rejected"
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Notify partner of admin decision on requested sensitive changes (Bank/PAN/Rates)."""
    is_appr = status.lower() == "approved"
    subject = f"Change Request #{request_type.upper()}: {('Approved ✅' if is_appr else 'Rejected ❌')}"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Dear <strong>{business_name}</strong> Management,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Your submitted change request for <strong>{request_type.replace('_', ' ').title()}</strong> has been reviewed by the QuickPress Super Admin team.
      </p>

      <div style="background: {'#f0fdf4' if is_appr else '#fef2f2'}; border: 1.5px solid {'#a7f3d0' if is_appr else '#fecaca'}; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: {'#059669' if is_appr else '#dc2626'}; text-transform: uppercase;">Decision</span>
        <div style="font-size: 20px; font-weight: 900; color: {'#059669' if is_appr else '#dc2626'}; margin-top: 6px;">
          {('Changes Approved &amp; Live' if is_appr else 'Changes Rejected')}
        </div>
      </div>

      {f'<div class="card"><strong style="color: #991b1b; font-size: 13px;">Reason:</strong><p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">{reason}</p></div>' if reason else ''}
    """
    html = _render_base_email(
        preheader_text=f"Change request for {request_type} has been {status}",
        badge_label="Account Security",
        headline="Change Request Status",
        subheadline=f"Review update for {business_name}",
        content_html=content,
    )
    return await dispatch_email(
        to=partner_email,
        subject=subject,
        html=html,
        text=f"Change request {request_type} for {business_name} was {status}. Reason: {reason or 'N/A'}",
        recipient_name=business_name,
        audience="partner",
        category="security",
        metadata={"requestType": request_type, "status": status},
    )


# =============================================================================
# 3. DELIVERY CAPTAIN / RIDER EMAIL AUTOMATIONS
# =============================================================================

# (16) Captain Account Activation & Duty Welcome Email
async def send_rider_welcome_email(
    rider_email: str,
    rider_name: str,
) -> Dict[str, Any]:
    """Notify Delivery Captain when background verification and duty license are approved."""
    subject = f"Welcome aboard Captain {rider_name}! Your QuickPress Fleet Account is Active 🛵"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>Captain {rider_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Congratulations! Your driver verification and document checks are complete. You are now officially cleared for duty on the <strong>QuickPress Delivery Fleet</strong>!
      </p>

      <div class="card">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #047857; text-transform: uppercase;">Captain Benefits Guarantee</h4>
        <ul style="font-size: 13px; color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>💸 <strong>0% Commission Guarantee</strong>: 100% of the delivery fare and 100% of customer tips are yours.</li>
          <li>⚡ <strong>Live Trip Incentives</strong>: Extra surge payouts during peak market hours.</li>
          <li>🔐 <strong>Safe 4-Digit OTP Handovers</strong>: Full platform protection with secure OTP check-ins.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="https://quickpress-rider.vercel.app" class="btn">Launch Captain App &amp; Go Online ➜</a>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Captain {rider_name}, your account is verified. Start earning today!",
        badge_label="Captain Activation",
        headline="Welcome to the Fleet! 🛵",
        subheadline=f"Captain {rider_name} is cleared for duty",
        content_html=content,
    )
    return await dispatch_email(
        to=rider_email,
        subject=subject,
        html=html,
        text=f"Welcome Captain {rider_name}! Your account is active. Open the app to start earning.",
        recipient_name=rider_name,
        audience="rider",
        category="onboarding",
        metadata={"riderName": rider_name},
    )


# (17) Weekly Earnings & Trip Summary Email
async def send_rider_payout_summary_email(
    rider_email: str,
    rider_name: str,
    period: str,
    total_trips: int,
    net_earnings: float,
    tips_amount: float,
    distance_km: float,
) -> Dict[str, Any]:
    """Dispatch weekly earnings breakdown to Delivery Captain."""
    subject = f"Weekly Earnings Report — Captain {rider_name}: ₹{net_earnings:.2f} 🛵"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>Captain {rider_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Here is your completed trip and earnings summary for the week <strong>{period}</strong>. Thank you for your dedication to on-time laundry deliveries!
      </p>

      <div style="background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase;">Total Take-Home Pay</span>
        <div style="font-size: 32px; font-weight: 900; color: #065f46; margin: 6px 0;">₹{net_earnings:.2f}</div>
        <div style="font-size: 12px; color: #047857;">Scheduled for Direct UPI/Bank Payout</div>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">TRIPS COMPLETED</td><td class="meta-val">{total_trips} Deliveries</td></tr>
          <tr><td class="meta-label">TOTAL DISTANCE</td><td class="meta-val">{distance_km:.1f} KM</td></tr>
          <tr><td class="meta-label">CUSTOMER TIPS (100%)</td><td class="meta-val" style="color: #059669;">+₹{tips_amount:.2f}</td></tr>
          <tr><td class="meta-label">NET PAYOUT</td><td class="meta-val" style="color: #065f46; font-size: 15px;">₹{net_earnings:.2f}</td></tr>
        </table>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Weekly earnings for Captain {rider_name}: ₹{net_earnings:.2f} across {total_trips} trips",
        badge_label="Captain Payout",
        headline="Weekly Earnings Summary 🛵",
        subheadline=f"Trip report for {period}",
        content_html=content,
    )
    return await dispatch_email(
        to=rider_email,
        subject=subject,
        html=html,
        text=f"Captain {rider_name}, your weekly earnings for {period} are ₹{net_earnings:.2f} across {total_trips} trips.",
        recipient_name=rider_name,
        audience="rider",
        category="finance",
        metadata={"totalTrips": total_trips, "netEarnings": net_earnings, "period": period},
    )


# (18) COD Cash Limit Alert / Auto-Block Warning Email
async def send_rider_cod_limit_warning_email(
    rider_email: str,
    rider_name: str,
    cash_in_hand: float,
    threshold_limit: float = 2000.0,
) -> Dict[str, Any]:
    """Alert captain when cash collected from COD orders reaches security limits."""
    is_blocked = cash_in_hand >= threshold_limit
    subject = f"⚠️ COD Cash Alert: ₹{cash_in_hand:.0f} In Hand — {'Account Temporarily Blocked' if is_blocked else 'Deposit Required'}"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Attention <strong>Captain {rider_name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Your collected Cash-on-Delivery balance has reached <strong>₹{cash_in_hand:.2f}</strong> (Safety Threshold: ₹{threshold_limit:.0f}).
      </p>

      <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase;">COD Cash In Hand</span>
        <div style="font-size: 32px; font-weight: 900; color: #991b1b; margin: 6px 0;">₹{cash_in_hand:.2f}</div>
        <div style="font-size: 12px; font-weight: 700; color: #b91c1c;">
          {('New COD orders paused until cash deposit' if is_blocked else 'Approaching ₹2,000 threshold limit')}
        </div>
      </div>

      <div class="card">
        <strong style="color: #0f172a; font-size: 13px;">How to Deposit:</strong>
        <p style="font-size: 13px; color: #475569; margin: 6px 0 0 0; line-height: 1.6;">
          Open the Captain App, tap <strong>Deposit COD Cash</strong>, and scan the QuickPress company UPI QR code. Your dispatch clearance is instantly restored upon payment verification.
        </p>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Urgent COD deposit required for Captain {rider_name}. Balance: ₹{cash_in_hand:.2f}",
        badge_label="Cash Safety Guard",
        headline="COD Cash In Hand Alert ⚠️",
        subheadline=f"Threshold limit warning for Captain {rider_name}",
        content_html=content,
    )
    return await dispatch_email(
        to=rider_email,
        subject=subject,
        html=html,
        text=f"Captain {rider_name}, your COD cash in hand is ₹{cash_in_hand:.2f}. Please deposit to avoid dispatch pause.",
        recipient_name=rider_name,
        audience="rider",
        category="security",
        metadata={"cashInHand": cash_in_hand, "threshold": threshold_limit},
    )


# =============================================================================
# 4. ADMIN & OPERATIONS ESCALATION EMAIL AUTOMATIONS
# =============================================================================

# (19) SLA Breach / Emergency Operational Alert Email
async def send_admin_sla_breach_alert_email(
    order_id: str,
    order_code: str,
    breach_type: str,  # "Partner Acceptance (5m)" | "Rider Assignment (2m)"
    elapsed_seconds: int,
    customer_info: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Instant high-priority escalation to operations admin when order breaches SLA."""
    settings = get_settings()
    admin_email = settings.smtp_user or "official.quickpress@gmail.com"
    subject = f"🚨 URGENT SLA BREACH: Order #{order_code} ({breach_type})"

    cust_name = (customer_info or {}).get("name") or "Customer"
    cust_phone = (customer_info or {}).get("phone") or "N/A"

    content = f"""
      <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 800; color: #b91c1c; text-transform: uppercase;">Automated Operations Escalation</span>
        <h3 style="font-size: 18px; color: #991b1b; margin: 4px 0;">Platform SLA Threshold Breached</h3>
        <p style="font-size: 13px; color: #7f1d1d; margin: 0;">Order #{order_code} exceeded target turnaround time. Operational intervention required.</p>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER ID</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">BREACH TYPE</td><td class="meta-val" style="color: #dc2626;">{breach_type}</td></tr>
          <tr><td class="meta-label">TIME ELAPSED</td><td class="meta-val">{elapsed_seconds} Seconds</td></tr>
          <tr><td class="meta-label">CUSTOMER</td><td class="meta-val">{cust_name} ({cust_phone})</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="https://quickpress-admin.vercel.app/orders" class="btn" style="background: #dc2626;">Open Order in Admin Console ➜</a>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Urgent SLA breach on Order #{order_code} ({breach_type})",
        badge_label="Emergency Operations",
        headline="SLA Breach Alert 🚨",
        subheadline=f"Immediate intervention required on #{order_code}",
        content_html=content,
    )
    return await dispatch_email(
        to=admin_email,
        subject=subject,
        html=html,
        text=f"SLA Breach: Order #{order_code} breached {breach_type} after {elapsed_seconds}s.",
        recipient_name="Operations Admin",
        audience="admin",
        category="alert",
        metadata={"orderCode": order_code, "breachType": breach_type, "elapsed": elapsed_seconds},
    )


# (20) Daily Executive Business Digest Email
async def send_daily_business_digest_email(
    admin_email: str,
    stats: Dict[str, Any],
) -> Dict[str, Any]:
    """Nightly automated executive recap dispatched to platform owners."""
    date_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    total_orders = stats.get("totalOrders", 0)
    gmv = float(stats.get("gmv", 0.0))
    commission = float(stats.get("commission", 0.0))
    active_partners = stats.get("activePartners", 0)
    active_riders = stats.get("activeRiders", 0)

    subject = f"QuickPress Daily Executive Digest — {date_str} (₹{gmv:.0f} GMV)"
    content = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Good evening <strong>QuickPress Executive Team</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Here is your daily operational and financial performance summary for <strong>{date_str}</strong>.
      </p>

      <div style="background: #0f172a; border-radius: 14px; padding: 22px; color: #ffffff; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 1px;">Daily Gross Merchandise Value</span>
        <div style="font-size: 36px; font-weight: 900; color: #ffffff; margin: 8px 0;">₹{gmv:,.2f}</div>
        <div style="font-size: 13px; color: #94a3b8;">Net Platform Take-Rate Revenue: <strong style="color: #34d399;">₹{commission:,.2f}</strong></div>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">TOTAL ORDERS</td><td class="meta-val">{total_orders} Orders</td></tr>
          <tr><td class="meta-label">ACTIVE LAUNDRY PARTNERS</td><td class="meta-val">{active_partners} Hubs Online</td></tr>
          <tr><td class="meta-label">DELIVERY FLEET ACTIVE</td><td class="meta-val">{active_riders} Captains On Duty</td></tr>
          <tr><td class="meta-label">SLA SUCCESS RATE</td><td class="meta-val" style="color: #059669;">99.2%</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="https://quickpress-admin.vercel.app/dashboard" class="btn">View Live Analytics Dashboard ➜</a>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"QuickPress Daily Digest for {date_str}: ₹{gmv:,.0f} GMV across {total_orders} orders.",
        badge_label="Executive Summary",
        headline="Daily Business Performance 📊",
        subheadline=f"Operational summary for {date_str}",
        content_html=content,
    )
    return await dispatch_email(
        to=admin_email,
        subject=subject,
        html=html,
        text=f"Daily Digest {date_str}: Orders: {total_orders}, GMV: ₹{gmv:.2f}, Commission: ₹{commission:.2f}",
        recipient_name="Executive Admin",
        audience="admin",
        category="finance",
        metadata={"date": date_str, "gmv": gmv, "orders": total_orders},
    )


# (21) Fraud / Geofence Anomaly Alert Email
async def send_geofence_fraud_alert_email(
    rider_id: str,
    order_id: str,
    order_code: str,
    distance_km: float,
) -> Dict[str, Any]:
    """Alert operations team when captain attempts OTP validation far away from geofence."""
    settings = get_settings()
    admin_email = settings.smtp_user or "official.quickpress@gmail.com"
    subject = f"🛡️ GEOFENCE FRAUD ALERT: Captain #{rider_id} ({distance_km:.2f} km away)"
    content = f"""
      <div style="background: #fff1f2; border: 2px solid #f43f5e; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 800; color: #be123c; text-transform: uppercase;">Automated Anti-Fraud System</span>
        <h3 style="font-size: 18px; color: #9f1239; margin: 4px 0;">GPS Geofence Violation Flagged</h3>
        <p style="font-size: 13px; color: #881337; margin: 0;">Captain attempted OTP handover validation outside the 250m geofence safety perimeter.</p>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">ORDER CODE</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">CAPTAIN ID</td><td class="meta-val">{rider_id}</td></tr>
          <tr><td class="meta-label">DETECTED DISTANCE</td><td class="meta-val" style="color: #e11d48; font-size: 15px;">{distance_km:.2f} KM (Threshold: 0.25 KM)</td></tr>
          <tr><td class="meta-label">STATUS</td><td class="meta-val" style="color: #e11d48;">Anomaly Logged &amp; Handover Flagged</td></tr>
        </table>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Geofence violation flagged for Captain #{rider_id} on Order #{order_code}",
        badge_label="Fraud Detection",
        headline="Geofence Anomaly Flagged 🛡️",
        subheadline=f"Safety violation on Order #{order_code}",
        content_html=content,
    )
    return await dispatch_email(
        to=admin_email,
        subject=subject,
        html=html,
        text=f"Geofence violation: Captain #{rider_id} attempted OTP {distance_km:.2f}km away on Order #{order_code}",
        recipient_name="Security Admin",
        audience="admin",
        category="security",
        metadata={"orderCode": order_code, "distanceKm": distance_km, "riderId": rider_id},
    )


# (22) Customer Support Escalation / Garment Damage Claim Email
async def send_customer_claim_alert_email(
    ticket_id: str,
    order_code: str,
    customer_name: str,
    customer_phone: str,
    claim_description: str,
) -> Dict[str, Any]:
    """Alert support team when customer files garment damage or missing item ticket."""
    settings = get_settings()
    admin_email = settings.smtp_user or "official.quickpress@gmail.com"
    subject = f"⚠️ CUSTOMER CLAIM TICKET #{ticket_id}: Order #{order_code}"
    content = f"""
      <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">Customer Experience Escalation</span>
        <h3 style="font-size: 18px; color: #92400e; margin: 4px 0;">Garment Issue / Damage Claim Filed</h3>
        <p style="font-size: 13px; color: #78350f; margin: 0;">Priority claim requires rapid investigation within 2 hours.</p>
      </div>

      <div class="card">
        <table class="meta-table">
          <tr><td class="meta-label">TICKET ID</td><td class="meta-val">#{ticket_id}</td></tr>
          <tr><td class="meta-label">ORDER CODE</td><td class="meta-val">#{order_code}</td></tr>
          <tr><td class="meta-label">CUSTOMER</td><td class="meta-val">{customer_name} ({customer_phone})</td></tr>
        </table>
      </div>

      <div class="card">
        <strong style="color: #0f172a; font-size: 13px;">Customer Statement:</strong>
        <p style="font-size: 13px; color: #334155; margin: 6px 0 0 0; line-height: 1.6;">
          "{claim_description}"
        </p>
      </div>
    """
    html = _render_base_email(
        preheader_text=f"Customer claim filed for Order #{order_code}: Ticket #{ticket_id}",
        badge_label="Support Escalation",
        headline="Customer Claim Filed ⚠️",
        subheadline=f"Urgent claim review for #{order_code}",
        content_html=content,
    )
    return await dispatch_email(
        to=admin_email,
        subject=subject,
        html=html,
        text=f"Customer claim ticket #{ticket_id} filed for Order #{order_code}: {claim_description}",
        recipient_name="Support Team",
        audience="admin",
        category="alert",
        metadata={"ticketId": ticket_id, "orderCode": order_code},
    )


# =============================================================================
# 5. ADMIN MANUAL SEND & DIRECT REPLY GATEWAY
# =============================================================================
async def send_custom_admin_email(
    to_email: str,
    subject: str,
    html_or_text_message: str,
    recipient_name: Optional[str] = None,
    audience: str = "customer",
    category: str = "manual",
    reply_to_id: Optional[str] = None,
    sent_by: Optional[str] = None,
    cc: Optional[List[str] | str] = None,
) -> Dict[str, Any]:
    """Allow Admin staff to compose custom outbound emails or reply directly to users."""
    name = recipient_name or to_email.split("@")[0].capitalize()
    formatted_html = f"""
      <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
        Hello <strong>{name}</strong>,
      </p>
      <div style="font-size: 14px; color: #334155; line-height: 1.7; margin: 18px 0;">
        {html_or_text_message}
      </div>
    """
    html = _render_base_email(
        preheader_text=subject,
        badge_label="QuickPress Team",
        headline="Message from QuickPress",
        subheadline="Official correspondence from our operations team",
        content_html=formatted_html,
    )
    return await dispatch_email(
        to=to_email,
        subject=subject,
        html=html,
        text=html_or_text_message,
        recipient_name=name,
        audience=audience,
        category=category,
        is_reply=bool(reply_to_id),
        reply_to_id=reply_to_id,
        sent_by=sent_by or "admin",
        cc=cc,
    )
