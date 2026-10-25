"""Garment Defect & Pre-wash Inspection Service for QuickPress.

Handles photographic pre-wash tagging, Cloudinary uploads, customer digital consent,
real-time socket broadcasts, and lifecycle audit logging.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.core.cloudinary import upload_image
from app.db.client import database
from app.models.defect import (
    AdminDefectOverridePayload,
    CustomerDefectDecisionPayload,
    CustomerDefectStatus,
    DefectType,
    GarmentDefect,
    LogDefectPayload,
)
from app.services import order_lifecycle as lifecycle
from app.services.socket_service import broadcast_order_event

logger = logging.getLogger("quickpress.defect_service")

ORDERS = "customer_orders"


class DefectService:
    """Core domain service for pre-wash garment defects and customer acknowledgments."""

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    async def log_defect(
        self,
        order_id: str,
        actor_id: str,
        actor_role: str,
        actor_name: Optional[str],
        payload: LogDefectPayload,
    ) -> GarmentDefect:
        """Partner tags a pre-existing defect or stain on a garment before processing."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found",
            )

        # Partner ownership authorization check
        if actor_role == "partner":
            try:
                lifecycle.assert_partner(order, actor_id)
            except lifecycle.OrderAuthorizationError as err:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Unauthorized: {err}",
                )

        canonical_order_id = lifecycle.order_id_of(order)
        order_code = order.get("code") or order.get("order_code") or canonical_order_id
        defect_id = f"def-{secrets.token_hex(4)}"

        # 1. Upload photo to Cloudinary / storage
        try:
            photo_url = await upload_image(
                payload.photo,
                kind="defect_photo",
                public_id=f"def_{canonical_order_id}_{defect_id}",
            )
        except Exception as exc:
            logger.error("Failed to upload garment defect photo: %s", exc)
            # If payload is already a valid image URL or data URI, keep it to prevent hard crash
            if payload.photo.startswith("http") or payload.photo.startswith("data:image/"):
                photo_url = payload.photo
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Could not process defect image: {exc}",
                )

        now = self._now()
        defect_record = GarmentDefect(
            defect_id=defect_id,
            order_id=canonical_order_id,
            order_code=order_code,
            item_name=payload.item_name.strip(),
            defect_type=payload.defect_type,
            photo_url=photo_url,
            description=(payload.description or "").strip(),
            reported_by_id=actor_id,
            reported_by_role=actor_role,
            reported_by_name=actor_name or "Partner Store",
            reported_at=now,
            customer_status=CustomerDefectStatus.PENDING,
            customer_note="",
            customer_responded_at=None,
        )

        # 2. Append to order document in database
        raw_defects = list(order.get("garment_defects") or order.get("garmentDefects") or [])
        raw_defects.append(defect_record.model_dump())

        update_fields = {
            "garment_defects": raw_defects,
            "hasDefectsReported": True,
            "updatedAt": now,
        }

        await database.update_one(
            ORDERS,
            {"_id": order["_id"]},
            {"$set": update_fields},
        )

        # 3. Append to canonical lifecycle event audit trail
        try:
            await lifecycle.record_event(
                order,
                "DEFECT_TAGGED",
                actor_id=actor_id,
                actor_role=actor_role,
                metadata={
                    "defect_id": defect_id,
                    "item_name": defect_record.item_name,
                    "defect_type": defect_record.defect_type.value,
                    "photo_url": defect_record.photo_url,
                    "description": defect_record.description,
                },
                at=now,
            )
        except Exception as evt_err:
            logger.warning("Could not record DEFECT_TAGGED lifecycle event: %s", evt_err)

        # 4. Instant Zero-Lag Realtime Socket Broadcast
        try:
            await broadcast_order_event(
                "order:defect_tagged",
                {
                    "orderId": canonical_order_id,
                    "orderCode": order_code,
                    "defect": defect_record.model_dump(),
                },
            )
        except Exception as sock_err:
            logger.debug("Socket broadcast error on defect_tagged: %s", sock_err)

        # 5. Push Notification to Customer (Async Queue)
        try:
            from app.core.async_queue import async_task_queue
            from app.services.order_notifications import push_defect_alert_to_customer

            async_task_queue.enqueue(
                push_defect_alert_to_customer,
                order,
                defect_record.model_dump(),
            )
        except Exception as push_err:
            logger.debug("Push notification enqueue error for defect: %s", push_err)

        logger.info(
            "Garment defect %s reported for order %s on %s by %s",
            defect_id,
            canonical_order_id,
            defect_record.item_name,
            actor_id,
        )
        return defect_record

    async def get_defects(self, order_id: str) -> List[GarmentDefect]:
        """Fetch all logged defects for a given order."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found",
            )
        raw_list = order.get("garment_defects") or order.get("garmentDefects") or []
        results: List[GarmentDefect] = []
        for item in raw_list:
            try:
                results.append(GarmentDefect(**item))
            except Exception as e:
                logger.debug("Skipping unparseable defect item: %s", e)
        return results

    async def customer_respond(
        self,
        order_id: str,
        defect_id: str,
        customer_id: str,
        customer_phone: Optional[str],
        payload: CustomerDefectDecisionPayload,
    ) -> GarmentDefect:
        """Customer provides digital consent: Approve Wash With Care OR Exclude Item."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found",
            )

        # Verify customer authorization (user ID or customer phone match)
        order_user_id = str(order.get("userId") or order.get("user_id") or (order.get("customer") or {}).get("id") or "")
        order_phone = str((order.get("customer") or {}).get("phone") or (order.get("address") or {}).get("phone") or "")
        is_owner = (order_user_id and str(customer_id) == order_user_id) or (
            customer_phone and order_phone and customer_phone[-10:] == order_phone[-10:]
        )
        if not is_owner and customer_id != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to respond to inspection reports on this order.",
            )

        raw_defects = list(order.get("garment_defects") or order.get("garmentDefects") or [])
        matched_idx = -1
        for idx, d in enumerate(raw_defects):
            if d.get("defect_id") == defect_id or d.get("id") == defect_id:
                matched_idx = idx
                break

        if matched_idx == -1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Defect '{defect_id}' not found on order '{order_id}'",
            )

        now = self._now()
        target = raw_defects[matched_idx]
        target["customer_status"] = payload.action.value
        target["customer_note"] = (payload.note or "").strip()
        target["customer_responded_at"] = now
        raw_defects[matched_idx] = target

        await database.update_one(
            ORDERS,
            {"_id": order["_id"]},
            {"$set": {"garment_defects": raw_defects, "updatedAt": now}},
        )

        # Record audit event
        try:
            event_name = (
                "DEFECT_APPROVED_BY_CUSTOMER"
                if payload.action == CustomerDefectStatus.PROCEED_WASH
                else "DEFECT_RETURN_REQUESTED_BY_CUSTOMER"
            )
            await lifecycle.record_event(
                order,
                event_name,
                actor_id=customer_id,
                actor_role="customer",
                metadata={
                    "defect_id": defect_id,
                    "action": payload.action.value,
                    "customer_note": payload.note,
                },
                at=now,
            )
        except Exception as evt_err:
            logger.warning("Could not record customer response lifecycle event: %s", evt_err)

        # Broadcast update to Partner and Fleet consoles
        try:
            await broadcast_order_event(
                "order:defect_responded",
                {
                    "orderId": lifecycle.order_id_of(order),
                    "orderCode": order.get("code") or lifecycle.order_id_of(order),
                    "defect": target,
                },
            )
        except Exception as sock_err:
            logger.debug("Socket broadcast error on defect_responded: %s", sock_err)

        logger.info(
            "Customer responded %s to defect %s on order %s",
            payload.action.value,
            defect_id,
            order_id,
        )
        return GarmentDefect(**target)

    async def admin_override(
        self,
        order_id: str,
        defect_id: str,
        admin_id: str,
        payload: AdminDefectOverridePayload,
    ) -> GarmentDefect:
        """Admin override / dispute resolution for a reported garment defect."""
        order = await lifecycle.find_order(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found",
            )

        raw_defects = list(order.get("garment_defects") or order.get("garmentDefects") or [])
        matched_idx = -1
        for idx, d in enumerate(raw_defects):
            if d.get("defect_id") == defect_id or d.get("id") == defect_id:
                matched_idx = idx
                break

        if matched_idx == -1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Defect '{defect_id}' not found on order '{order_id}'",
            )

        now = self._now()
        target = raw_defects[matched_idx]
        target["admin_override_status"] = payload.decision
        target["admin_override_notes"] = (payload.notes or "").strip()
        raw_defects[matched_idx] = target

        await database.update_one(
            ORDERS,
            {"_id": order["_id"]},
            {"$set": {"garment_defects": raw_defects, "updatedAt": now}},
        )

        try:
            await lifecycle.record_event(
                order,
                "DEFECT_ADMIN_OVERRIDE",
                actor_id=admin_id,
                actor_role="admin",
                metadata={
                    "defect_id": defect_id,
                    "decision": payload.decision,
                    "notes": payload.notes,
                },
                at=now,
            )
        except Exception as evt_err:
            logger.warning("Could not record admin override lifecycle event: %s", evt_err)

        return GarmentDefect(**target)


defect_service = DefectService()
