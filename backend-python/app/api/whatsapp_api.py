"""WhatsApp Business Cloud API & SMS Omni-Channel REST Endpoints.

Handles:
- Meta Webhook Verification & Status Callbacks (delivered, read).
- Admin WhatsApp & SMS Surveillance Logs.
- Direct Admin Dispatches & Test Triggers.
- Omni-Channel Aggregated Delivery Analytics.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.core.deps import current_user
from app.core.sms_service import sms_service
from app.core.whatsapp_service import whatsapp_service
from app.db.omni_channel_repositories import omni_channel_repo
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["whatsapp-sms"])


# -----------------------------------------------------------------------------
# PAYLOAD SCHEMAS
# -----------------------------------------------------------------------------

class AdminWhatsAppSendPayload(BaseModel):
    toPhone: str = Field(..., description="10-digit Indian phone number or international E.164")
    recipientName: str = Field("Valued User")
    templateName: str = Field("custom_announcement")
    messageBody: str = Field(..., min_length=2)
    orderId: Optional[str] = None


class AdminSmsSendPayload(BaseModel):
    toPhone: str = Field(...)
    message: str = Field(..., min_length=2, max_length=320)
    purpose: str = Field("admin_dispatch")


# -----------------------------------------------------------------------------
# META WHATSAPP WEBHOOK (GET for Verification, POST for Events)
# -----------------------------------------------------------------------------

@router.get("/api/whatsapp/webhook")
async def verify_meta_webhook(
    request: Request,
):
    """Meta webhook verification endpoint.
    Meta sends: hub.mode, hub.verify_token, hub.challenge.
    """
    settings = get_settings()
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.whatsapp_webhook_verify_token:
        logger.info("Meta WhatsApp Webhook successfully verified!")
        return Response(content=challenge, media_type="text/plain")

    logger.warning("Meta Webhook verification rejected (invalid token: %s)", token)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@router.post("/api/whatsapp/webhook")
async def receive_meta_webhook(request: Request):
    """Meta webhook callback for delivery receipts (delivered, read) and customer replies."""
    try:
        body = await request.json()
    except Exception:
        return {"status": "ok"}

    entries = body.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # 1. Handle Status Updates (sent -> delivered -> read)
            statuses = value.get("statuses", [])
            for st in statuses:
                msg_id = st.get("id")
                st_name = st.get("status")  # sent, delivered, read, failed
                ts = st.get("timestamp")
                if msg_id and st_name:
                    await omni_channel_repo.update_whatsapp_status(msg_id, st_name, timestamp=ts)

            # 2. Handle Inbound Customer Messages / Button Clicks
            messages = value.get("messages", [])
            for msg in messages:
                sender_phone = msg.get("from")
                msg_type = msg.get("type")
                logger.info("Inbound WhatsApp message from %s (type=%s)", sender_phone, msg_type)

    return {"status": "ok"}


# -----------------------------------------------------------------------------
# ADMIN SURVEILLANCE & DISPATCH APIS
# -----------------------------------------------------------------------------

@router.get("/api/admin/whatsapp/logs")
async def get_whatsapp_logs(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: User = Depends(current_user),
):
    """Lists recent WhatsApp notifications with live statuses."""
    items = await omni_channel_repo.list_whatsapp_logs(limit=limit, status=status, search=search)
    return {"items": items, "count": len(items)}


@router.post("/api/admin/whatsapp/send")
async def admin_send_whatsapp(
    payload: AdminWhatsAppSendPayload,
    user: User = Depends(current_user),
):
    """Sends manual WhatsApp message via Meta Cloud API / simulation."""
    ok, msg_id, err = await whatsapp_service._send_meta_request(
        to_phone=payload.toPhone,
        message_payload={"type": "text", "text": {"body": payload.messageBody}},
        template_name=payload.templateName,
        recipient_name=payload.recipientName,
        order_id=payload.orderId,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err or "WhatsApp dispatch failed")
    return {"ok": True, "messageId": msg_id, "recipient": payload.toPhone}


@router.get("/api/admin/sms/logs")
async def get_sms_logs(
    limit: int = Query(50, ge=1, le=200),
    provider: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: User = Depends(current_user),
):
    """Lists SMS transmissions."""
    items = await omni_channel_repo.list_sms_logs(limit=limit, provider=provider, search=search)
    return {"items": items, "count": len(items)}


@router.post("/api/admin/sms/send")
async def admin_send_sms(
    payload: AdminSmsSendPayload,
    user: User = Depends(current_user),
):
    """Dispatches transactional SMS alert."""
    ok, msg_id, err = await sms_service.send_transactional_sms(
        phone=payload.toPhone,
        message=payload.message,
        purpose=payload.purpose,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err or "SMS dispatch failed")
    return {"ok": True, "messageId": msg_id, "recipient": payload.toPhone}


@router.get("/api/admin/omni/stats")
async def get_omni_channel_analytics(
    user: User = Depends(current_user),
):
    """Returns aggregated KPI analytics for WhatsApp and SMS."""
    settings = get_settings()
    stats = await omni_channel_repo.get_omni_stats()
    stats["gateways"] = {
        "whatsapp": "Meta Cloud API (Active)" if settings.whatsapp_configured else "Meta Cloud API (Simulation / Sandbox)",
        "sms": "Fast2SMS (Active)" if settings.fast2sms_configured else ("MSG91 (Active)" if settings.msg91_configured else "SMS Sandbox"),
    }
    return stats


class OmniSettingsPayload(BaseModel):
    whatsappEnabled: Optional[bool] = None
    smsEnabled: Optional[bool] = None
    orderConfirmedWhatsapp: Optional[bool] = None
    captainAssignedWhatsapp: Optional[bool] = None
    clothesInspectedWhatsapp: Optional[bool] = None
    outForDeliveryWhatsapp: Optional[bool] = None
    orderDeliveredWhatsapp: Optional[bool] = None
    deliveryOtpSms: Optional[bool] = None
    autoDispatchEnabled: Optional[bool] = None
    geofenceRadiusMeters: Optional[float] = None
    geofenceStrictEnforcement: Optional[bool] = None


@router.get("/api/admin/omni/settings")
async def get_omni_settings(user: User = Depends(current_user)):
    """Returns current admin governance settings for WhatsApp, SMS, and Dispatch."""
    from app.db.admin_repositories import admin_settings_repository
    settings = get_settings()
    db_settings = await admin_settings_repository.get()

    omni_cfg = db_settings.get("omniChannel") or {}
    dispatch_cfg = db_settings.get("dispatch") or {}

    return {
        "omniChannel": {
            "whatsappEnabled": bool(omni_cfg.get("whatsappEnabled", True)),
            "smsEnabled": bool(omni_cfg.get("smsEnabled", True)),
            "orderConfirmedWhatsapp": bool(omni_cfg.get("orderConfirmedWhatsapp", True)),
            "captainAssignedWhatsapp": bool(omni_cfg.get("captainAssignedWhatsapp", True)),
            "clothesInspectedWhatsapp": bool(omni_cfg.get("clothesInspectedWhatsapp", True)),
            "outForDeliveryWhatsapp": bool(omni_cfg.get("outForDeliveryWhatsapp", True)),
            "orderDeliveredWhatsapp": bool(omni_cfg.get("orderDeliveredWhatsapp", True)),
            "deliveryOtpSms": bool(omni_cfg.get("deliveryOtpSms", True)),
        },
        "dispatch": {
            "autoDispatchEnabled": bool(dispatch_cfg.get("autoDispatchEnabled", True)),
            "geofenceRadiusMeters": float(dispatch_cfg.get("geofenceRadiusMeters", getattr(settings, "geofence_radius_meters", 250.0))),
            "geofenceStrictEnforcement": bool(dispatch_cfg.get("geofenceStrictEnforcement", False)),
            "searchRadiusKm": float(dispatch_cfg.get("searchRadiusKm", 5.0)),
            "captainTimeoutSeconds": int(dispatch_cfg.get("captainTimeoutSeconds", 30)),
        },
        "gateways": {
            "whatsapp": {
                "name": "Meta WhatsApp Business Cloud API v20.0",
                "isConfigured": bool(settings.whatsapp_configured),
                "mode": "Live Production" if settings.whatsapp_configured else "Simulation / Sandbox Mode",
                "webhookToken": settings.whatsapp_webhook_verify_token,
                "phoneNumberId": settings.whatsapp_phone_number_id or "Not set",
            },
            "sms": {
                "name": "Fast2SMS / MSG91 Gateway",
                "isConfigured": bool(settings.fast2sms_configured or settings.msg91_configured),
                "provider": "Fast2SMS" if settings.fast2sms_configured else ("MSG91" if settings.msg91_configured else "SMS Sandbox"),
                "senderId": settings.msg91_sender_id or "QKPRES",
            },
        },
    }


@router.put("/api/admin/omni/settings")
async def update_omni_settings(
    payload: OmniSettingsPayload,
    user: User = Depends(current_user),
):
    """Updates admin governance toggles for WhatsApp, SMS, and Dispatch."""
    from app.db.admin_repositories import admin_settings_repository
    db_settings = await admin_settings_repository.get()

    curr_omni = dict(db_settings.get("omniChannel") or {})
    curr_dispatch = dict(db_settings.get("dispatch") or {})

    # Update omni fields if provided
    omni_fields = [
        "whatsappEnabled", "smsEnabled", "orderConfirmedWhatsapp", "captainAssignedWhatsapp",
        "clothesInspectedWhatsapp", "outForDeliveryWhatsapp", "orderDeliveredWhatsapp", "deliveryOtpSms",
    ]
    for field in omni_fields:
        val = getattr(payload, field)
        if val is not None:
            curr_omni[field] = bool(val)

    # Update dispatch fields if provided
    if payload.autoDispatchEnabled is not None:
        curr_dispatch["autoDispatchEnabled"] = bool(payload.autoDispatchEnabled)
    if payload.geofenceRadiusMeters is not None:
        curr_dispatch["geofenceRadiusMeters"] = float(payload.geofenceRadiusMeters)
    if payload.geofenceStrictEnforcement is not None:
        curr_dispatch["geofenceStrictEnforcement"] = bool(payload.geofenceStrictEnforcement)

    await admin_settings_repository.update(
        {
            "omniChannel": curr_omni,
            "dispatch": curr_dispatch,
        },
        scope="global",
    )

    logger.info("Admin %s updated Omni-Channel & Dispatch settings.", getattr(user, "phone", "admin"))
    return {
        "ok": True,
        "omniChannel": curr_omni,
        "dispatch": curr_dispatch,
        "message": "Omni-Channel & Dispatch controls updated successfully.",
    }
