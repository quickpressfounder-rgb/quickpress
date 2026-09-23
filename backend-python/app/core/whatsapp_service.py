"""Meta WhatsApp Business Cloud API Engine (v20.0).

Handles automated transactional messages with rich formatting, interactive CTA buttons,
delivery receipts tracking, and simulation fallback for QuickPress Laundry Operations.
"""

from __future__ import annotations

import logging
import secrets
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.config import get_settings
from app.db.omni_channel_repositories import omni_channel_repo

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Meta WhatsApp Cloud API Gateway."""

    BASE_URL = "https://graph.facebook.com/v20.0"

    def __init__(self):
        pass

    async def _send_meta_request(
        self,
        to_phone: str,
        message_payload: Dict[str, Any],
        template_name: str,
        recipient_name: str = "Valued Customer",
        order_id: Optional[str] = None,
        buttons: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """Sends WhatsApp payload to Meta Cloud API or simulates in local environment."""
        settings = get_settings()
        clean_phone = "".join(filter(str.isdigit, str(to_phone or "")))
        if len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"

        # 0. Check Admin Dynamic Governance Toggle
        try:
            from app.db.admin_repositories import admin_settings_repository
            admin_settings = await admin_settings_repository.get()
            omni_cfg = admin_settings.get("omniChannel") or {}
            if not omni_cfg.get("whatsappEnabled", True):
                logger.info("WhatsApp notifications disabled in Admin Settings. Skipping dispatch.")
                return True, "skipped_disabled_by_admin", None
        except Exception:
            pass

        # 1. Audit / Simulation Mode if credentials are not filled in .env
        if not settings.whatsapp_configured:
            fake_id = f"wamid.sim_{secrets.token_hex(8)}"
            text_snippet = ""
            if "text" in message_payload:
                text_snippet = message_payload["text"].get("body", "")
            elif "interactive" in message_payload:
                text_snippet = message_payload["interactive"].get("body", {}).get("text", "")

            await omni_channel_repo.record_whatsapp_log(
                to_phone=clean_phone,
                recipient_name=recipient_name,
                template_name=template_name,
                message_body=text_snippet,
                buttons=buttons or [],
                status="sent",
                message_id=fake_id,
                order_id=order_id,
                metadata={"mode": "simulation", "gateway": "Meta Cloud API Sandbox"},
            )
            logger.info(
                "[WHATSAPP SIMULATION] Message '%s' dispatched to %s (+%s): %s",
                template_name,
                recipient_name,
                clean_phone,
                text_snippet[:100],
            )
            return True, fake_id, None

        # 2. Real Production Dispatch via Meta Graph API v20.0
        url = f"{self.BASE_URL}/{settings.whatsapp_phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {settings.whatsapp_access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            **message_payload,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                data = res.json()

                if res.status_code in (200, 201):
                    msg_id = (data.get("messages") or [{}])[0].get("id", f"wamid.{secrets.token_hex(8)}")
                    text_snippet = message_payload.get("text", {}).get("body", "")
                    await omni_channel_repo.record_whatsapp_log(
                        to_phone=clean_phone,
                        recipient_name=recipient_name,
                        template_name=template_name,
                        message_body=text_snippet,
                        buttons=buttons or [],
                        status="sent",
                        message_id=msg_id,
                        order_id=order_id,
                        metadata={"metaResponse": data},
                    )
                    return True, msg_id, None
                else:
                    err_msg = data.get("error", {}).get("message", res.text)
                    logger.error("Meta WhatsApp API error (%s): %s", res.status_code, err_msg)
                    await omni_channel_repo.record_whatsapp_log(
                        to_phone=clean_phone,
                        recipient_name=recipient_name,
                        template_name=template_name,
                        message_body=f"Failed dispatch: {err_msg}",
                        buttons=buttons or [],
                        status="failed",
                        order_id=order_id,
                        metadata={"error": err_msg, "statusCode": res.status_code},
                    )
                    return False, "", err_msg

        except Exception as exc:
            logger.error("WhatsApp network exception: %s", exc)
            return False, "", str(exc)

    # -------------------------------------------------------------------------
    # LIFECYCLE TRANSACTIONAL WHATSAPP MESSAGES
    # -------------------------------------------------------------------------

    async def send_order_confirmed_whatsapp(
        self,
        phone: str,
        customer_name: str,
        order_id: str,
        pickup_slot: str,
        amount: float,
        items_count: int = 1,
    ) -> Tuple[bool, str, Optional[str]]:
        """Sends WhatsApp confirmation when order is successfully placed."""
        body = (
            f"🎉 *Order Confirmed! — QuickPress Laundry*\n\n"
            f"Hello *{customer_name}*,\n"
            f"Your order *#{order_id}* has been received and scheduled for pickup.\n\n"
            f"🗓️ *Pickup Slot:* {pickup_slot}\n"
            f"🧺 *Estimated Items:* {items_count} garment(s)\n"
            f"💳 *Total Amount:* ₹{amount:.2f}\n\n"
            f"Our nearest delivery captain will be dispatched to your location shortly."
        )

        buttons = [
            {"id": "track_order", "title": "Track Order Live"},
            {"id": "support_help", "title": "Contact Support"},
        ]

        interactive_payload = {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                        for b in buttons
                    ]
                },
            },
        }

        return await self._send_meta_request(
            to_phone=phone,
            message_payload=interactive_payload,
            template_name="order_confirmed",
            recipient_name=customer_name,
            order_id=order_id,
            buttons=buttons,
        )

    async def send_captain_assigned_whatsapp(
        self,
        phone: str,
        customer_name: str,
        order_id: str,
        captain_name: str,
        captain_phone: str,
        eta_minutes: int = 15,
        ride_type: str = "pickup",
    ) -> Tuple[bool, str, Optional[str]]:
        """Sends Captain details and live ETA when captain is assigned."""
        action_text = "pickup your laundry" if ride_type == "pickup" else "deliver your clean laundry"
        body = (
            f"🛵 *Delivery Captain Assigned!*\n\n"
            f"Hello *{customer_name}*,\n"
            f"Captain *{captain_name}* is on the way to {action_text}.\n\n"
            f"⏱️ *Estimated Arrival:* ~{eta_minutes} mins\n"
            f"📞 *Captain Contact:* {captain_phone}\n"
            f"📦 *Order ID:* #{order_id}\n\n"
            f"Please keep your clothes ready for handoff."
        )

        buttons = [{"id": "track_rider", "title": "Track on Live Map"}]

        interactive_payload = {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                        for b in buttons
                    ]
                },
            },
        }

        return await self._send_meta_request(
            to_phone=phone,
            message_payload=interactive_payload,
            template_name="captain_assigned",
            recipient_name=customer_name,
            order_id=order_id,
            buttons=buttons,
        )

    async def send_clothes_inspected_whatsapp(
        self,
        phone: str,
        customer_name: str,
        order_id: str,
        verified_count: int,
        store_name: str,
    ) -> Tuple[bool, str, Optional[str]]:
        """Sends clothes count verification notice once partner checks items."""
        body = (
            f"✅ *Clothes Count Verified by Partner Hub*\n\n"
            f"Hello *{customer_name}*,\n"
            f"Our partner laundromat *{store_name}* has received and inspected your garments.\n\n"
            f"👕 *Verified Garments Count:* {verified_count} Item(s)\n"
            f"🧼 *Care Stage:* Sorting & Professional Eco-Wash started\n"
            f"📦 *Order ID:* #{order_id}\n\n"
            f"Every item has been tagged with a unique barcode for zero-mix assurance."
        )

        return await self._send_meta_request(
            to_phone=phone,
            message_payload={"type": "text", "text": {"body": body}},
            template_name="clothes_inspected",
            recipient_name=customer_name,
            order_id=order_id,
        )

    async def send_out_for_delivery_whatsapp(
        self,
        phone: str,
        customer_name: str,
        order_id: str,
        delivery_otp: str,
        captain_name: str,
    ) -> Tuple[bool, str, Optional[str]]:
        """Sends Out for Delivery notification with customer delivery OTP."""
        body = (
            f"🚀 *Out for Delivery — Fresh & Clean!*\n\n"
            f"Hello *{customer_name}*,\n"
            f"Your laundry order *#{order_id}* has been steam-pressed and is out for delivery with Captain *{captain_name}*.\n\n"
            f"🔐 *Delivery Verification OTP:* *{delivery_otp}*\n"
            f"_(Share this 4-digit code with the captain only after receiving your sealed package.)_\n\n"
            f"Thank you for choosing QuickPress!"
        )

        buttons = [{"id": "track_delivery", "title": "Track Captain Live"}]

        interactive_payload = {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                        for b in buttons
                    ]
                },
            },
        }

        return await self._send_meta_request(
            to_phone=phone,
            message_payload=interactive_payload,
            template_name="out_for_delivery",
            recipient_name=customer_name,
            order_id=order_id,
            buttons=buttons,
        )

    async def send_order_delivered_whatsapp(
        self,
        phone: str,
        customer_name: str,
        order_id: str,
        invoice_url: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """Sends Order Delivered alert with invoice and rating request."""
        body = (
            f"✨ *Order Delivered Successfully!*\n\n"
            f"Hello *{customer_name}*,\n"
            f"Your laundry order *#{order_id}* has been safely delivered.\n\n"
            f"We hope you love the crispness and fragrance of your fresh clothes!\n"
            f"Your official GST Tax Invoice is available for download."
        )

        buttons = [
            {"id": "rate_order", "title": "Rate Service ⭐"},
            {"id": "repeat_order", "title": "Book Next Laundry"},
        ]

        interactive_payload = {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                        for b in buttons
                    ]
                },
            },
        }

        return await self._send_meta_request(
            to_phone=phone,
            message_payload=interactive_payload,
            template_name="order_delivered",
            recipient_name=customer_name,
            order_id=order_id,
            buttons=buttons,
        )


whatsapp_service = WhatsAppService()
