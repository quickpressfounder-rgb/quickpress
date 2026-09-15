"""Admin API — Sprint 5.2 (MongoDB integration).

Every list endpoint supports pagination + search/filters via `database.paginate`.
All mutating actions write an `admin_audit_logs` entry. Reads fall back to the
seeded demo data (ADMIN_SEED) applied on startup, so the admin panel is never
blank even against a brand new database.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status


from fastapi.security import HTTPAuthorizationCredentials

from app.core.deps import bearer_scheme, current_user, require_roles


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

from app.models.admin import (
    AddCustomerNotePayload,
    AddPartnerNotePayload,
    AddRiderNotePayload,
    AdjustCustomerLoyaltyPayload,
    AdjustCustomerWalletPayload,
    AdjustPartnerWalletPayload,
    AdjustRiderWalletPayload,
    Admin2FAPayload,
    AdminLoginPayload,
    AdminPartnerUpdatePayload,
    AdminRiderUpdatePayload,
    AssignRiderPayload,
    BlockPartnerPayload,
    BroadcastPayload,
    CancelOrderPayload,
    CityPayload,
    CouponPayload,
    CreatePartnerPayload,
    CreateSupportTicketPayload,
    SendCustomerNotificationPayload,
    SendPartnerNotificationPayload,
    SendRiderNotificationPayload,
    ServicePayload,
    SettingsUpdatePayload,
    StaffPayload,
    StaffPermissionsPayload,
    StaffRegisterPayload,
    StaffStatusPayload,
    StaffVerifyEmailPayload,
    SupportAssignPayload,
    SupportCompensatePayload,
    SupportReplyPayload,
    SupportStatusPayload,
    SuspendPartnerPayload,
    UpdateCustomerTagsPayload,
    UpdateOrderStatusPayload,
    UpdatePartnerCommissionPayload,
    UpdatePartnerKycPayload,
    UpdatePartnerTagsPayload,
    VerifyRiderDocumentPayload,
)
from app.models.user import Role, User
from app.db.admin_repositories import (
    admin_customer_repository,
    admin_dashboard_repository,
    admin_order_repository,
    admin_partner_repository,
    admin_partner_service_repository,
    admin_refund_repository,
    admin_rider_repository,
    admin_settings_repository,
    admin_wallet_repository,
    analytics_repository,
    area_repository,
    audit_repository,
    banner_repository,
    category_repository,
    city_repository,
    coupon_repository,
    notification_repository,
    service_repository,
    staff_repository,
    support_repository,
)

# Every /api/admin/* endpoint is admin-only. The guard lives on the router so a
# new handler cannot accidentally ship with authentication but no authorization.
router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles(Role.admin))],
)


async def _actor(user: Optional[User]) -> str:
    return user.display_name or user.id if user else "admin"


# ---------------------------------------------------------------- dashboard
@router.get("/dashboard")
async def dashboard(
    date: str = Query("today"),
    city: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    user: User = Depends(current_user),
):
    return await admin_dashboard_repository.summary(date_filter=date, city=city, service=service)


@router.get("/dashboard/activity")
async def dashboard_activity(user: User = Depends(current_user)):
    return await admin_dashboard_repository.activity()


@router.get("/dashboard/latest-orders")
async def dashboard_latest_orders(user: User = Depends(current_user)):
    return await admin_dashboard_repository.latest_orders()


@router.get("/dashboard/revenue-series")
async def dashboard_revenue_series(user: User = Depends(current_user)):
    return await admin_dashboard_repository.revenue_series()


@router.get("/dashboard/orders-series")
async def dashboard_orders_series(user: User = Depends(current_user)):
    return await admin_dashboard_repository.orders_series()


@router.get("/dashboard/system-health")
async def dashboard_system_health(user: User = Depends(current_user)):
    return await admin_dashboard_repository.system_health()


# -------------------------------------------------------------------- automations
@router.get("/automations/activity")
async def get_automation_activity(
    type: Optional[str] = Query(default=None, description="Automation engine type (dispatch, otp, sla, finance, surge, guard, notification)"),
    severity: Optional[str] = Query(default=None, description="Event severity (info, success, warning, danger)"),
    order_id: Optional[str] = Query(default=None, description="Filter by order id"),
    limit: int = Query(default=50, ge=1, le=100),
    user: User = Depends(current_user),
):
    """Retrieve real-time automation audit logs for the Admin Surveillance Console."""
    from app.db.automation_repositories import automation_repository
    return await automation_repository.list_events(
        automation_type=type, severity=severity, order_id=order_id, limit=limit
    )


@router.get("/automations/stats")
async def get_automation_stats(user: User = Depends(current_user)):
    """Retrieve 24h health, execution counts, and success rates for all 7 automation engines."""
    from app.db.automation_repositories import automation_repository
    return await automation_repository.get_stats()


@router.post("/automations/trigger")
async def trigger_automation_engine(
    payload: Dict[str, Any],
    user: User = Depends(current_user),
):
    """Manually invoke an automation engine for simulation, testing, or operations intervention."""
    from app.services.automation_service import automation_service
    engine = str(payload.get("engine", "")).lower().strip()
    order_id = str(payload.get("orderId", "")).strip()

    if engine == "otp" and order_id:
        res = await automation_service.generate_order_otps(order_id)
        return {"success": True, "engine": "otp", "result": res}
    elif engine == "dispatch" and order_id:
        leg = str(payload.get("leg", "pickup"))
        res = await automation_service.dispatch_order_automatically(order_id, leg)
        return {"success": True, "engine": "dispatch", "result": res}
    elif engine == "sla" and order_id:
        res = await automation_service.schedule_laundry_sla(order_id)
        return {"success": True, "engine": "sla", "result": res}
    elif engine == "finance" and order_id:
        res = await automation_service.execute_financial_settlement(order_id)
        return {"success": True, "engine": "finance", "result": res}
    elif engine == "surge":
        city = str(payload.get("city", "Kasganj"))
        res = await automation_service.evaluate_zone_surge(city)
        return {"success": True, "engine": "surge", "result": res}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown or unsupported automation engine: {engine}",
        )



# -------------------------------------------------------------------- orders
@router.get("/orders")
async def list_orders(status_filter: Optional[str] = Query(default=None, alias="status"), user: User = Depends(current_user)):
    return await admin_order_repository.list(status_filter)


@router.get("/orders/{order_id}")
async def get_order(order_id: str, user: User = Depends(current_user)):
    from app.db.client import database
    order = await admin_order_repository.find(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} does not exist")

    canonical_id = str(order["_id"])
    audit_trail = await admin_order_repository.events(canonical_id)

    # Fetch rides and settlement associated with this order
    rides = await database.find_many("rides", {"orderId": canonical_id})
    settlement = await database.find_one("order_settlements", {"orderId": canonical_id})

    # Detailed Rider 1 (Pickup Captain) and Rider 2 (Delivery Captain) resolution
    reassignment = order.get("reassignment")
    if not reassignment and order.get("meta", {}).get("reassignment"):
        reassignment = order.get("meta", {}).get("reassignment")

    rider1_info = None
    rider2_info = None

    if reassignment:
        r1_id = reassignment.get("originalRiderId") or order.get("originalRiderId")
        if r1_id:
            r1_doc = await database.find_one("rider_profiles", {"$or": [{"_id": r1_id}, {"riderId": r1_id}]}) or {}
            rider1_info = {
                "id": r1_id,
                "name": r1_doc.get("fullName") or r1_doc.get("name") or "Rider 1 (Pickup Captain)",
                "phone": r1_doc.get("phone") or "",
                "vehicle": r1_doc.get("vehicleType") or "Bike",
                "plate": r1_doc.get("vehicleNumber") or "UP-87-QP-1001",
                "payout": float(reassignment.get("pickupLegPayout") or 35.0),
                "role": "Pickup Only (Opted out at store)",
            }
        r2_id = reassignment.get("assignedTransferRiderId") or order.get("transferRiderId") or order.get("assignedRiderId")
        if r2_id and r2_id != r1_id:
            r2_doc = await database.find_one("rider_profiles", {"$or": [{"_id": r2_id}, {"riderId": r2_id}]}) or {}
            rider2_info = {
                "id": r2_id,
                "name": r2_doc.get("fullName") or r2_doc.get("name") or "Rider 2 (Delivery Captain)",
                "phone": r2_doc.get("phone") or "",
                "vehicle": r2_doc.get("vehicleType") or "Bike",
                "plate": r2_doc.get("vehicleNumber") or "UP-87-QP-1002",
                "payout": float(reassignment.get("deliveryLegPayout") or 35.0),
                "role": "Delivery Only (+20% Bonus)",
            }
    else:
        # Single Continuous Ride: Captain 1 handles both pickup and delivery legs!
        c1_id = order.get("assignedRiderId") or order.get("riderId") or (order.get("rider") or {}).get("id")
        if not c1_id and rides:
            for r in rides:
                if r.get("riderId"):
                    c1_id = r["riderId"]
                    break
        if c1_id:
            c1_doc = await database.find_one("rider_profiles", {"$or": [{"_id": c1_id}, {"riderId": c1_id}]}) or {}
            total_fare = float(order.get("pricing", {}).get("deliveryFee") or 70.0)
            rider1_info = {
                "id": c1_id,
                "name": c1_doc.get("fullName") or c1_doc.get("name") or "Captain 1 (Continuous Ride)",
                "phone": c1_doc.get("phone") or "",
                "vehicle": c1_doc.get("vehicleType") or "Bike",
                "plate": c1_doc.get("vehicleNumber") or "UP-87-QP-1001",
                "payout": total_fare,
                "role": "Continuous Ride (Full Pickup & Doorstep Delivery)",
            }

    # Sanitize ObjectIds in rides
    sanitized_rides = []
    for r in rides:
        rc = dict(r)
        if "_id" in rc:
            rc["_id"] = str(rc["_id"])
        sanitized_rides.append(rc)

    # Sanitize settlement or construct estimated breakdown
    sanitized_settlement = None
    if settlement:
        sanitized_settlement = dict(settlement)
        if "_id" in sanitized_settlement:
            sanitized_settlement["_id"] = str(sanitized_settlement["_id"])
    elif reassignment:
        grand_total = float(order.get("totals", {}).get("grandTotal") or order.get("pricing", {}).get("total") or 149.0)
        p1 = float(reassignment.get("pickupLegPayout") or 35.0)
        p2 = float(reassignment.get("deliveryLegPayout") or 35.0)
        p_net = round(max(0.0, grand_total * 0.7), 2)
        plat_fee = round(max(0.0, grand_total - (p_net + p1 + p2)), 2)
        sanitized_settlement = {
            "orderId": canonical_id,
            "customerTotal": grand_total,
            "partnerNet": p_net,
            "rider1Payout": p1,
            "rider2Payout": p2,
            "platformFee": plat_fee,
            "status": "SETTLED" if reassignment.get("handoverCompleted") else "PENDING_HANDOVER",
        }

    dispatch_otp = (
        order.get("dispatchOtp")
        or (reassignment or {}).get("dispatchOtp")
        or (reassignment or {}).get("handoverOtp")
        or (order.get("otp", {}).get("dispatch") if isinstance(order.get("otp", {}).get("dispatch"), str) else (order.get("otp", {}).get("dispatch") or {}).get("code"))
    )

    from app.db.review_repositories import review_repository
    reviews_360 = await review_repository.get_360_reviews_by_order(canonical_id)

    from app.services import order_lifecycle as lifecycle
    _ADMIN_STAGES = [
        ("placed", "Order Placed", (lifecycle.PLACED, lifecycle.PENDING, "placed", "pending_partner_acceptance", "new", "ORDER_CREATED")),
        ("partner_accepted", "Partner Store Accepted", (lifecycle.PARTNER_ACCEPTED, "partner_accepted", "accepted")),
        ("rider_assigned", "Delivery Captain Dispatched", (lifecycle.PICKUP_RIDER_ASSIGNED, lifecycle.RIDER_ASSIGNED, lifecycle.RIDER_SEARCHING, lifecycle.PICKUP_RIDER_ACCEPTED, lifecycle.RIDER_ACCEPTED, "pickup_rider_assigned", "rider_assigned")),
        ("picked_up", "Picked Up from Customer", (lifecycle.PICKED_UP, lifecycle.AT_PARTNER, "picked_up", "at_partner", "dropped_at_partner")),
        ("processing", "Laundry Processing / Ironing", (lifecycle.PROCESSING, lifecycle.IRONING, "processing", "washing", "dry_cleaning")),
        ("ready", "Processed & Ready for Delivery", (lifecycle.READY_FOR_DELIVERY, lifecycle.READY, lifecycle.COMPLETED, "ready_for_delivery", "ready", "completed")),
        ("out_for_delivery", "Out for Doorstep Delivery", (lifecycle.OUT_FOR_DELIVERY, lifecycle.DELIVERY_RIDER_ASSIGNED, lifecycle.DELIVERY_RIDER_ACCEPTED, lifecycle.DELIVERY_OTP_PENDING, "out_for_delivery")),
        ("delivered", "Delivered to Customer", (lifecycle.DELIVERED, "delivered")),
    ]
    admin_timeline = lifecycle._timeline(order, _ADMIN_STAGES)

    return {
        **{k: v for k, v in order.items() if k != "_id"},
        "id": canonical_id,
        "timeline": admin_timeline,
        "auditTrail": audit_trail,
        "rides": sanitized_rides,
        "settlement": sanitized_settlement,
        "custody": order.get("custody", "partner" if reassignment else "customer"),
        "reassignment": reassignment,
        "isReassigned": bool(reassignment),
        "isContinuousRide": not bool(reassignment),
        "continuousRideStatus": (
            "Split Handover Ride (Captain 1 ➔ Captain 2)"
            if reassignment
            else "Full Continuous Ride (Captain 1)"
        ),
        "dispatchOtp": dispatch_otp,
        "rider1": rider1_info,
        "rider2": rider2_info,
        "reviews360": reviews_360,
    }


@router.get("/orders/{order_id}/invoice")
async def get_admin_order_invoice(
    order_id: str,
    user: User = Depends(current_user),
):
    """Retrieve full GST Tax Invoice JSON breakdown for an order in admin panel."""
    from app.db.invoice_repositories import InvoiceError, invoice_repository
    try:
        return await invoice_repository.for_order(user, order_id)
    except InvoiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get("/orders/{order_id}/invoice/pdf")
async def get_admin_order_invoice_pdf(
    order_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Response:
    """Stream 3-page Tax Invoice & Payment Summary PDF matching Rapido enterprise design for Admin."""
    from app.db.invoice_repositories import InvoiceError, invoice_repository
    auth_user: Optional[User] = None
    tok = credentials.credentials if credentials and credentials.credentials else token
    if tok:
        try:
            auth_user = await current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=tok))
        except Exception:
            pass
    try:
        invoice = await invoice_repository.for_order(auth_user, order_id)
        pdf_bytes, file_name = await invoice_repository.get_pdf_bytes(auth_user, invoice.id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{file_name}"'},
        )
    except InvoiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get("/orders/{order_id}/events")
async def order_events(order_id: str, user: User = Depends(current_user)):
    order = await admin_order_repository.find(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} does not exist")
    return await admin_order_repository.events(str(order["_id"]))


@router.post("/orders/{order_id}/assign-rider")
async def assign_rider(order_id: str, payload: AssignRiderPayload, user: User = Depends(current_user)):
    try:
        if payload.riderId in ("rdr-auto", "auto", ""):
            from app.services.smart_2ride_engine import smart_2ride_engine
            # Trigger smart auto-dispatch for the order
            await smart_2ride_engine.create_ride_1_pickup(order_id)
            row = await admin_order_repository.detail(order_id)
        else:
            row = await admin_order_repository.assign_rider(order_id, payload.riderId)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    await audit_repository.log(await _actor(user), "order.assign_rider", order_id, {"riderId": payload.riderId})
    return row


@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, payload: CancelOrderPayload, user: User = Depends(current_user)):
    try:
        row = await admin_order_repository.cancel(order_id, payload.reason or "Cancelled by admin")
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    await audit_repository.log(await _actor(user), "order.cancel", order_id, {"reason": payload.reason})
    return row


@router.post("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: UpdateOrderStatusPayload, user: User = Depends(current_user)):
    try:
        row = await admin_order_repository.update_status(order_id, payload.status, payload.reason)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    await audit_repository.log(await _actor(user), "order.update_status", order_id, {"status": payload.status, "reason": payload.reason})
    return row



# ----------------------------------------------------------------- customers
@router.get("/customers/stats")
async def customer_stats(user: User = Depends(current_user)):
    return await admin_customer_repository.dashboard_stats()


@router.get("/customers")
async def list_customers(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    q: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    segment: Optional[str] = None,
    user: User = Depends(current_user),
):
    return await admin_customer_repository.list(page, pageSize, q=q, city=city, status=status, segment=segment)


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: User = Depends(current_user)):
    customer = await admin_customer_repository.detail(customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.get("/customers/{customer_id}/360")
async def get_customer_360(customer_id: str, user: User = Depends(current_user)):
    try:
        return await admin_customer_repository.get_customer_360(customer_id)
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/customers/{customer_id}/block")
async def block_customer(customer_id: str, user: User = Depends(current_user)):
    await admin_customer_repository.set_blocked(customer_id, True)
    await audit_repository.log(await _actor(user), "customer.block", customer_id)
    return {"ok": True, "id": customer_id, "blocked": True}


@router.post("/customers/{customer_id}/unblock")
async def unblock_customer(customer_id: str, user: User = Depends(current_user)):
    await admin_customer_repository.set_blocked(customer_id, False)
    await audit_repository.log(await _actor(user), "customer.unblock", customer_id)
    return {"ok": True, "id": customer_id, "blocked": False}


@router.post("/customers/{customer_id}/wallet/adjust")
async def adjust_customer_wallet(customer_id: str, payload: AdjustCustomerWalletPayload, user: User = Depends(current_user)):
    try:
        res = await admin_customer_repository.adjust_wallet(customer_id, payload.amount, payload.reason, user.id)
        await audit_repository.log(await _actor(user), "customer.wallet_adjust", customer_id, {"amount": payload.amount, "reason": payload.reason})
        return res
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.post("/customers/{customer_id}/loyalty/adjust")
async def adjust_customer_loyalty(customer_id: str, payload: AdjustCustomerLoyaltyPayload, user: User = Depends(current_user)):
    res = await admin_customer_repository.adjust_loyalty(customer_id, payload.points, payload.reason, user.id)
    await audit_repository.log(await _actor(user), "customer.loyalty_adjust", customer_id, {"points": payload.points, "reason": payload.reason})
    return res


@router.post("/customers/{customer_id}/notes")
async def add_customer_note(customer_id: str, payload: AddCustomerNotePayload, user: User = Depends(current_user)):
    try:
        res = await admin_customer_repository.add_note(customer_id, payload.note, user.display_name or "Super Admin")
        await audit_repository.log(await _actor(user), "customer.add_note", customer_id, {"note": payload.note})
        return res
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/customers/{customer_id}/tags")
async def update_customer_tags(customer_id: str, payload: UpdateCustomerTagsPayload, user: User = Depends(current_user)):
    res = await admin_customer_repository.update_tags(customer_id, payload.tags)
    await audit_repository.log(await _actor(user), "customer.update_tags", customer_id, {"tags": payload.tags})
    return res


@router.post("/customers/{customer_id}/send-notification")
async def send_customer_notification(customer_id: str, payload: SendCustomerNotificationPayload, user: User = Depends(current_user)):
    await audit_repository.log(await _actor(user), "customer.send_notification", customer_id, {"title": payload.title, "body": payload.body})
    return {"ok": True, "sent": True, "customerId": customer_id}


@router.post("/customers/{customer_id}/logout-sessions")
async def logout_customer_sessions(customer_id: str, user: User = Depends(current_user)):
    await audit_repository.log(await _actor(user), "customer.logout_sessions", customer_id)
    return {"ok": True, "invalidated": True, "customerId": customer_id}



# ------------------------------------------------------------------ partners
@router.get("/partners/stats")
async def get_partner_stats(user: User = Depends(current_user)):
    return await admin_partner_repository.dashboard_stats()


@router.get("/partners")
async def list_partners(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    q: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    kyc_status: Optional[str] = Query(default=None, alias="kycStatus"),
    city: Optional[str] = None,
    zone: Optional[str] = None,
    user: User = Depends(current_user),
):
    return await admin_partner_repository.list(page, pageSize, q=q, status=status_filter, kyc_status=kyc_status, city=city, zone=zone)


@router.post("/partners")
async def create_partner(payload: CreatePartnerPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.create(payload.model_dump(), user.id)
    await audit_repository.log(await _actor(user), "partner.create", res.get("_id") or "", payload.model_dump())
    return res


@router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, payload: AdminPartnerUpdatePayload, user: User = Depends(current_user)):
    from app.db.client import database
    existing = await database.find_one("partner_profiles", {"_id": partner_id})
    if not existing:
        existing = await database.find_one("partner_profiles", {"partnerId": partner_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")

    target_id = existing["_id"]
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if data:
        await database.update("partner_profiles", {"_id": target_id}, data)

    await audit_repository.log(await _actor(user), "partner.update", target_id, data)
    return await database.find_one("partner_profiles", {"_id": target_id})


@router.get("/partners/{partner_id}/360")
async def get_partner_360(partner_id: str, user: User = Depends(current_user)):
    return await admin_partner_repository.get_partner_360(partner_id)


@router.get("/partners/{partner_id}/activities")
async def get_partner_activities(
    partner_id: str,
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(current_user),
):
    return await admin_partner_repository.get_partner_activities(partner_id, category=category, limit=limit)


@router.get("/partners/{partner_id}")
async def get_partner(partner_id: str, user: User = Depends(current_user)):
    partner = await admin_partner_repository.get_partner_360(partner_id)
    if partner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")
    return partner



@router.post("/partners/{partner_id}/approve")
async def approve_partner(partner_id: str, user: User = Depends(current_user)):
    res = await admin_partner_repository.approve(partner_id, user.id)
    await audit_repository.log(await _actor(user), "partner.approve", partner_id)
    return res


@router.post("/partners/{partner_id}/suspend")
async def suspend_partner(partner_id: str, payload: SuspendPartnerPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.suspend(
        partner_id,
        payload.reason,
        payload.startDate or now_iso()[:10],
        payload.endDate or now_iso()[:10],
        payload.internalNote or "",
        user.id,
    )
    await audit_repository.log(await _actor(user), "partner.suspend", partner_id, {"reason": payload.reason})
    return res


@router.post("/partners/{partner_id}/block")
async def block_partner(partner_id: str, payload: BlockPartnerPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.block(partner_id, payload.reason, payload.internalNote or "", user.id)
    await audit_repository.log(await _actor(user), "partner.block", partner_id, {"reason": payload.reason})
    return res


@router.post("/partners/{partner_id}/unblock")
async def unblock_partner(partner_id: str, body: dict | None = None, user: User = Depends(current_user)):
    reason = (body or {}).get("reason") or "Admin unblocked access"
    res = await admin_partner_repository.unblock(partner_id, reason, user.id)
    await audit_repository.log(await _actor(user), "partner.unblock", partner_id, {"reason": reason})
    return res


@router.post("/partners/{partner_id}/activate")
async def activate_partner(partner_id: str, user: User = Depends(current_user)):
    res = await admin_partner_repository.approve(partner_id, user.id)
    await audit_repository.log(await _actor(user), "partner.activate", partner_id)
    return res


@router.post("/partners/{partner_id}/reject")
async def reject_partner(partner_id: str, user: User = Depends(current_user)):
    res = await admin_partner_repository.block(partner_id, "Application rejected by admin", "Rejected during onboarding", user.id)
    await audit_repository.log(await _actor(user), "partner.reject", partner_id)
    return res


@router.post("/partners/{partner_id}/kyc")
async def update_partner_kyc(partner_id: str, payload: UpdatePartnerKycPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.update_kyc(partner_id, payload.status, payload.reason, user.id)
    await audit_repository.log(await _actor(user), "partner.update_kyc", partner_id, {"status": payload.status})
    return res


@router.post("/partners/{partner_id}/commission")
async def update_partner_commission(partner_id: str, payload: UpdatePartnerCommissionPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.update_commission(partner_id, payload.commissionRate, payload.serviceRates, user.id)
    await audit_repository.log(await _actor(user), "partner.update_commission", partner_id, {"rate": payload.commissionRate})
    return res


@router.post("/partners/{partner_id}/wallet/adjust")
async def adjust_partner_wallet(partner_id: str, payload: AdjustPartnerWalletPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.adjust_wallet(partner_id, payload.amount, payload.type or "credit", payload.reason, user.id)
    await audit_repository.log(await _actor(user), "partner.adjust_wallet", partner_id, {"amount": payload.amount, "reason": payload.reason})
    return res


@router.post("/partners/{partner_id}/notes")
async def add_partner_note(partner_id: str, payload: AddPartnerNotePayload, user: User = Depends(current_user)):
    actor = await _actor(user)
    res = await admin_partner_repository.add_note(partner_id, payload.note, actor)
    await audit_repository.log(actor, "partner.add_note", partner_id)
    return res


@router.post("/partners/{partner_id}/tags")
async def update_partner_tags(partner_id: str, payload: UpdatePartnerTagsPayload, user: User = Depends(current_user)):
    res = await admin_partner_repository.update_tags(partner_id, payload.tags)
    await audit_repository.log(await _actor(user), "partner.update_tags", partner_id, {"tags": payload.tags})
    return res


@router.post("/partners/{partner_id}/notify")
async def send_partner_notification(partner_id: str, payload: SendPartnerNotificationPayload, user: User = Depends(current_user)):
    await audit_repository.log(await _actor(user), "partner.send_notification", partner_id, {"title": payload.title})
    return {"ok": True, "sent": True, "partnerId": partner_id}



# -------------------------------------------------------------------- riders
@router.get("/riders/stats")
async def rider_stats(user: User = Depends(current_user)):
    return await admin_rider_repository.dashboard_stats()


@router.get("/riders")
async def list_riders(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    q: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    city: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    kyc_status: Optional[str] = None,
    live_state: Optional[str] = None,
    user: User = Depends(current_user),
):
    return await admin_rider_repository.list(
        page,
        pageSize,
        q=q,
        status=status_filter,
        city=city,
        vehicle_type=vehicle_type,
        kyc_status=kyc_status,
        live_state=live_state,
    )


@router.get("/riders/{rider_id}")
async def get_rider(rider_id: str, user: User = Depends(current_user)):
    rider = await admin_rider_repository.detail(rider_id)
    if rider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")
    return rider


@router.get("/riders/{rider_id}/360")
async def get_rider_360(rider_id: str, user: User = Depends(current_user)):
    try:
        return await admin_rider_repository.get_rider_360(rider_id)
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/riders/{rider_id}/wallet/adjust")
async def adjust_rider_wallet(rider_id: str, payload: AdjustRiderWalletPayload, user: User = Depends(current_user)):
    res = await admin_rider_repository.adjust_wallet(
        rider_id,
        payload.amount,
        payload.reason,
        admin_id=user.id,
        is_cod_settlement=bool(payload.isCodSettlement),
    )
    await audit_repository.log(await _actor(user), "rider.wallet_adjust", rider_id, {"amount": payload.amount, "reason": payload.reason})
    return res


@router.post("/riders/{rider_id}/notify")
async def send_rider_notification(rider_id: str, payload: SendRiderNotificationPayload, user: User = Depends(current_user)):
    await audit_repository.log(await _actor(user), "rider.send_notification", rider_id, {"title": payload.title})
    return {"ok": True, "sent": True, "riderId": rider_id}


@router.post("/riders/{rider_id}/logout-sessions")
async def logout_rider_sessions(rider_id: str, user: User = Depends(current_user)):
    await audit_repository.log(await _actor(user), "rider.logout_sessions", rider_id)
    return {"ok": True, "invalidated": True, "riderId": rider_id}


@router.put("/riders/{rider_id}")
async def update_rider(rider_id: str, payload: AdminRiderUpdatePayload, user: User = Depends(current_user)):
    from app.db.client import database
    existing = await database.find_one("rider_profiles", {"_id": rider_id})
    if not existing:
        existing = await database.find_one("rider_profiles", {"riderId": rider_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")

    target_id = existing["_id"]
    data = {k: v for k, v in payload.model_dump().items() if v is not None}

    if data:
        # Normalize fields for rider_profiles
        if "fullName" in data and "name" not in data:
            data["name"] = data["fullName"]
        elif "name" in data and "fullName" not in data:
            data["fullName"] = data["name"]
        if "vehicleType" in data and "vehicle" not in data:
            data["vehicle"] = data["vehicleType"]
        if "vehicleNumber" in data and "plate" not in data:
            data["plate"] = data["vehicleNumber"]

        await database.update("rider_profiles", {"_id": target_id}, data)

        # Sync user document if present
        user_id = existing.get("userId") or existing.get("user_id")
        if user_id:
            user_sync = {}
            if "phone" in data: user_sync["phone"] = data["phone"]
            if "email" in data: user_sync["email"] = data["email"]
            if "fullName" in data: user_sync["display_name"] = data["fullName"]
            if "city" in data: user_sync["city"] = data["city"]
            if "status" in data: user_sync["status"] = data["status"]
            if user_sync:
                await database.update("users", {"_id": user_id}, user_sync)

    await audit_repository.log(await _actor(user), "rider.update", target_id, data)
    return await database.find_one("rider_profiles", {"_id": target_id})


async def _rider_transition(rider_id: str, new_status: str, action: str, user: User):
    rider = await admin_rider_repository.set_status(rider_id, new_status)
    if rider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")
    await audit_repository.log(await _actor(user), f"rider.{action}", rider_id)
    return rider


@router.post("/riders/{rider_id}/approve")
async def approve_rider(rider_id: str, user: User = Depends(current_user)):
    return await _rider_transition(rider_id, "active", "approve", user)


@router.post("/riders/{rider_id}/suspend")
async def suspend_rider(rider_id: str, body: dict | None = None, user: User = Depends(current_user)):
    from app.db.client import database
    reason = (body or {}).get("reason") or "Policy / Compliance Violation"
    now_iso = datetime.now(timezone.utc).isoformat()
    await database.update("rider_profiles", {"_id": rider_id}, {"suspensionReason": reason, "suspendedAt": now_iso, "appealStatus": "none"})
    await database.update("rider_profiles", {"riderId": rider_id}, {"suspensionReason": reason, "suspendedAt": now_iso, "appealStatus": "none"})
    return await _rider_transition(rider_id, "suspended", "suspend", user)


@router.post("/riders/{rider_id}/activate")
async def activate_rider(rider_id: str, user: User = Depends(current_user)):
    from app.db.client import database
    now_iso = datetime.now(timezone.utc).isoformat()
    await database.update("rider_profiles", {"_id": rider_id}, {"suspensionReason": None, "suspendedAt": None, "appealStatus": "approved", "reactivatedAt": now_iso})
    await database.update("rider_profiles", {"riderId": rider_id}, {"suspensionReason": None, "suspendedAt": None, "appealStatus": "approved", "reactivatedAt": now_iso})
    return await _rider_transition(rider_id, "active", "activate", user)


@router.post("/riders/{rider_id}/reject")
async def reject_rider(rider_id: str, user: User = Depends(current_user)):
    return await _rider_transition(rider_id, "suspended", "reject", user)


@router.delete("/riders/{rider_id}")
async def delete_rider(rider_id: str, user: User = Depends(current_user)):
    """Permanently delete a rider and associated records."""
    profile = await database.find_one("rider_profiles", {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})
    phone = (profile or {}).get("phone")
    user_id = (profile or {}).get("userId")

    await database.delete_many("rider_profiles", {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})
    await database.delete_many("admin_riders", {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})
    await database.delete_many("riders", {"$or": [{"_id": rider_id}, {"rider_id": rider_id}]})
    await database.delete_many("rider_wallets", {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})
    await database.delete_many("rider_shifts", {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})
    await database.delete_many("rider_payouts", {"$or": [{"_id": rider_id}, {"riderId": rider_id}]})

    if user_id:
        await database.delete_many("users", {"_id": user_id, "role": "rider"})
    if phone:
        clean_phone = phone.replace("+91", "").replace(" ", "").replace("-", "").strip()
        await database.delete_many("users", {"$or": [{"phone": phone}, {"phone": clean_phone}, {"phone": f"+91{clean_phone}"}], "role": "rider"})

    await audit_repository.log(await _actor(user), "rider.delete", rider_id)
    return {"ok": True, "deleted": rider_id}


# ----------------------------------------------------------------- analytics
@router.get("/analytics")
async def analytics(
    range: str = Query(default="all"),
    city: Optional[str] = Query(default=None),
    user: User = Depends(current_user),
):
    """GET /api/admin/analytics — Live nationwide GMV, dynamic growth velocity, category economics, and city metrics."""
    return await analytics_repository.summary(time_range=range, city=city)


@router.get("/analytics/export")
async def export_analytics_report(
    type: str = Query(default="financial_pl"),
    city: Optional[str] = Query(default=None),
    user: User = Depends(current_user),
):
    """GET /api/admin/analytics/export — Downloadable dynamic CSV report from real MongoDB database."""
    csv_data, filename = await analytics_repository.export_report_csv(report_type=type, city=city)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# --------------------------------------------------------------------- cities
@router.get("/cities/stats")
async def city_stats(user: User = Depends(current_user)):
    return await city_repository.dashboard_stats()


@router.get("/cities/intelligence")
async def city_intelligence(user: User = Depends(current_user)):
    return await city_repository.get_intelligence()


@router.get("/cities")
async def list_cities(user: User = Depends(current_user)):
    return await city_repository.list()


@router.get("/cities/{city_id}/360")
async def get_city_360(city_id: str, user: User = Depends(current_user)):
    try:
        return await city_repository.get_city_360(city_id)
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.patch("/cities/{city_id}/radius")
async def update_city_radius(city_id: str, payload: dict, user: User = Depends(current_user)):
    city = await city_repository.update_radius(city_id, payload)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.update_radius", city_id, payload)
    return city


@router.post("/cities/{city_id}/zones")
async def add_city_zone(city_id: str, payload: dict, user: User = Depends(current_user)):
    city = await city_repository.add_zone(city_id, payload)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.add_zone", city_id, payload)
    return city


@router.put("/cities/{city_id}/zones/{zone_id}")
async def update_city_zone(city_id: str, zone_id: str, payload: dict, user: User = Depends(current_user)):
    city = await city_repository.update_zone(city_id, zone_id, payload)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City or Zone not found")
    await audit_repository.log(await _actor(user), "city.update_zone", f"{city_id}:{zone_id}", payload)
    return city


@router.delete("/cities/{city_id}/zones/{zone_id}")
async def delete_city_zone(city_id: str, zone_id: str, user: User = Depends(current_user)):
    city = await city_repository.delete_zone(city_id, zone_id)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.delete_zone", f"{city_id}:{zone_id}")
    return city


@router.post("/partners/{partner_id}/assign-zone")
async def assign_partner_territory(partner_id: str, payload: dict, user: User = Depends(current_user)):
    partner = await city_repository.assign_partner_territory(
        partner_id=partner_id,
        state=payload.get("state"),
        city=payload.get("city"),
        sector=payload.get("sector"),
        zone_id=payload.get("zoneId"),
        lat=payload.get("latitude") or payload.get("lat"),
        lng=payload.get("longitude") or payload.get("lng"),
        service_radius_km=payload.get("serviceRadiusKm") or payload.get("radiusKm"),
    )
    if partner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")
    await audit_repository.log(await _actor(user), "partner.assign_territory", partner_id, payload)
    return partner


@router.get("/cities/{city_id}/pincodes")
@router.get("/cities/{city_id}/pincodes-intelligence")
async def city_pincodes_intelligence(city_id: str, user: User = Depends(current_user)):
    return await city_repository.get_city_pincodes_intelligence(city_id)



@router.post("/cities/{city_id}/pincodes")
async def add_city_pincode(city_id: str, payload: dict, user: User = Depends(current_user)):
    city = await city_repository.add_pincode(city_id, payload)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.add_pincode", city_id, payload)
    return city


@router.put("/cities/{city_id}/pincodes/{pincode}")
async def update_city_pincode(city_id: str, pincode: str, payload: dict, user: User = Depends(current_user)):
    city = await city_repository.update_pincode(city_id, pincode, payload)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.update_pincode", f"{city_id}:{pincode}", payload)
    return city


@router.delete("/cities/{city_id}/pincodes/{pincode}")
async def delete_city_pincode(city_id: str, pincode: str, user: User = Depends(current_user)):
    city = await city_repository.delete_pincode(city_id, pincode)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.delete_pincode", f"{city_id}:{pincode}")
    return city


@router.post("/partners/{partner_id}/assign-pincodes")
async def assign_partner_pincodes(partner_id: str, payload: dict, user: User = Depends(current_user)):
    pincodes = payload.get("servicePincodes") or payload.get("pincodes") or []
    if isinstance(pincodes, str):
        pincodes = [p.strip() for p in pincodes.split(",") if p.strip()]
    partner = await city_repository.assign_partner_pincodes(
        partner_id=partner_id,
        pincodes=pincodes,
        primary_pincode=payload.get("pincode") or payload.get("primaryPincode") or (pincodes[0] if pincodes else None),
        city=payload.get("city"),
        state=payload.get("state"),
    )
    if partner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")
    await audit_repository.log(await _actor(user), "partner.assign_pincodes", partner_id, payload)
    return partner


@router.post("/riders/{rider_id}/assign-pincodes")
async def assign_rider_pincodes(rider_id: str, payload: dict, user: User = Depends(current_user)):
    pincodes = payload.get("operatingPincodes") or payload.get("pincodes") or []
    if isinstance(pincodes, str):
        pincodes = [p.strip() for p in pincodes.split(",") if p.strip()]
    rider = await city_repository.assign_rider_pincodes(
        rider_id=rider_id,
        pincodes=pincodes,
        primary_pincode=payload.get("pincode") or payload.get("primaryPincode") or (pincodes[0] if pincodes else None),
        city=payload.get("city"),
        state=payload.get("state"),
    )
    if rider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")
    await audit_repository.log(await _actor(user), "rider.assign_pincodes", rider_id, payload)
    return rider


@router.post("/cities", status_code=status.HTTP_201_CREATED)
async def create_city(payload: CityPayload, user: User = Depends(current_user)):
    data = payload.model_dump(exclude_unset=True)
    city_name = data.get("city") or data.get("name") or "New City"
    data["city"] = city_name
    data["name"] = city_name
    data.setdefault("state", payload.state or "Uttar Pradesh")
    data.setdefault("country", payload.country or "India")
    data.setdefault("tier", payload.tier or "Tier-2")
    data.setdefault("status", payload.status or "Live")
    data.setdefault("deliveryRadiusKm", payload.deliveryRadiusKm or 15.0)
    data.setdefault("baseDeliveryFee", payload.baseDeliveryFee or 20.0)
    data.setdefault("surgeMultiplier", payload.surgeMultiplier or 1.0)
    data.setdefault("pincodes", payload.pincodes or [])
    city = await city_repository.create(data)
    await audit_repository.log(await _actor(user), "city.create", city["_id"])
    return city


@router.put("/cities/{city_id}")
async def update_city(city_id: str, payload: CityPayload, user: User = Depends(current_user)):
    city = await city_repository.update(city_id, payload.model_dump(exclude_unset=True))
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.update", city_id)
    return city


@router.patch("/cities/{city_id}/status")
async def toggle_city_status(city_id: str, payload: dict, user: User = Depends(current_user)):
    new_status = payload.get("status", "Live")
    city = await city_repository.update(city_id, {"status": new_status})
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), f"city.status_{new_status.lower()}", city_id)
    return city


@router.delete("/cities/{city_id}")
async def delete_city(city_id: str, user: User = Depends(current_user)):
    removed = await city_repository.delete(city_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="City not found")
    await audit_repository.log(await _actor(user), "city.delete", city_id)
    return {"deleted": True, "cityId": city_id}


@router.get("/areas")
async def list_areas(city_id: Optional[str] = Query(default=None, alias="cityId"), user: User = Depends(current_user)):
    return await area_repository.list(city_id=city_id)


@router.post("/areas", status_code=status.HTTP_201_CREATED)
async def create_area(payload: dict, user: User = Depends(current_user)):
    area = await area_repository.create(payload)
    await audit_repository.log(await _actor(user), "area.create", area["_id"])
    return area


@router.put("/areas/{area_id}")
async def update_area(area_id: str, payload: dict, user: User = Depends(current_user)):
    area = await area_repository.update(area_id, payload)
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    await audit_repository.log(await _actor(user), "area.update", area_id)
    return area


@router.delete("/areas/{area_id}")
async def delete_area(area_id: str, user: User = Depends(current_user)):
    removed = await area_repository.delete(area_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    await audit_repository.log(await _actor(user), "area.delete", area_id)
    return {"ok": True}


@router.get("/states")
async def list_states(user: User = Depends(current_user)):
    cities = await city_repository.list()
    state_map: dict = {}
    for c in cities:
        s_name = c.get("state", "Uttar Pradesh")
        entry = state_map.setdefault(s_name, {
            "state": s_name,
            "citiesCount": 0,
            "partners": 0,
            "riders": 0,
            "customers": 0,
            "orders": 0,
            "sales": 0,
            "liveCities": 0,
        })
        entry["citiesCount"] += 1
        entry["partners"] += c.get("totalPartners", c.get("partners", 0))
        entry["riders"] += c.get("totalRiders", c.get("riders", 0))
        entry["customers"] += c.get("totalCustomers", c.get("customers", 0))
        financials = c.get("financials") or {}
        entry["orders"] += financials.get("totalOrders", c.get("orders", 0))
        entry["sales"] += financials.get("grossRevenue", c.get("sales", 0))
        if c.get("status") == "Live":
            entry["liveCities"] += 1
    return list(state_map.values())


@router.post("/states")
async def create_state(payload: Dict[str, Any], user: User = Depends(current_user)):
    state_name = payload.get("state") or payload.get("name")
    if not state_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="State name is required")
    # Save a placeholder hub or register state
    city_name = payload.get("capital") or payload.get("city") or f"{state_name} Central"
    new_city = await city_repository.create({
        "city": city_name,
        "name": city_name,
        "state": state_name,
        "tier": payload.get("tier", "Tier-2"),
        "status": payload.get("status", "Live"),
        "deliveryRadiusKm": 15.0,
        "baseDeliveryFee": 25.0,
    })
    await audit_repository.log(await _actor(user), "state.create", state_name)
    return {
        "state": state_name,
        "citiesCount": 1,
        "liveCities": 1,
        "partners": 0,
        "riders": 0,
        "customers": 0,
        "orders": 0,
        "sales": 0,
        "city": new_city,
    }


# ------------------------------------------------------------------- services
@router.get("/services/stats")
async def service_stats(user: User = Depends(current_user)):
    return await service_repository.dashboard_stats()


@router.get("/services/intelligence")
async def services_intelligence(user: User = Depends(current_user)):
    return await service_repository.get_intelligence()


@router.get("/services")
async def list_services(user: User = Depends(current_user)):
    return await service_repository.list()


@router.get("/services/categories")
async def list_categories(user: User = Depends(current_user)):
    return await category_repository.list()


@router.get("/services/{service_id}/360")
async def get_service_360(service_id: str, user: User = Depends(current_user)):
    try:
        return await service_repository.get_service_360(service_id)
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.get("/services/pricing")
async def services_pricing(user: User = Depends(current_user)):
    services = await service_repository.list()
    settings_doc = await admin_settings_repository.get()
    return [
        {
            "id": s["_id"],
            "item": s.get("name"),
            "service": s.get("name"),
            "city": settings_doc.get("defaultCity", ""),
            "price": s.get("price"),
            "commission": settings_doc.get("defaultCommission", ""),
        }
        for s in services
    ]


@router.post("/services", status_code=status.HTTP_201_CREATED)
async def create_service(payload: ServicePayload, user: User = Depends(current_user)):
    categories = await category_repository.list()
    service = await service_repository.create(
        {
            "name": payload.name or "New Service",
            "categoryId": payload.categoryId or (categories[0]["_id"] if categories else ""),
            "unit": payload.unit or "per item",
            "price": payload.price or 0,
            "image": payload.image or "",
            "description": payload.description or "",
            "badge": None,
            "popular": False,
        }
    )
    await audit_repository.log(await _actor(user), "service.create", service["_id"])
    return service


@router.put("/services/{service_id}")
async def update_service(service_id: str, payload: ServicePayload, user: User = Depends(current_user)):
    service = await service_repository.update(service_id, payload.model_dump(exclude_unset=True))
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    await audit_repository.log(await _actor(user), "service.update", service_id)
    return service


@router.delete("/services/{service_id}")
async def delete_master_service(service_id: str, user: User = Depends(current_user)):
    removed = await service_repository.delete(service_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    await audit_repository.log(await _actor(user), "service.delete", service_id)
    return {"ok": True}


@router.post("/services/categories", status_code=status.HTTP_201_CREATED)
async def create_category(payload: dict, user: User = Depends(current_user)):
    name = str(payload.get("name", "New Category")).strip()
    category = await category_repository.create(
        {
            "name": name,
            "description": payload.get("description", ""),
            "icon": payload.get("icon", "Sparkles"),
            "status": payload.get("status", "Active"),
        }
    )
    await audit_repository.log(await _actor(user), "category.create", category["_id"])
    return category


@router.get("/partner-services")
async def list_partner_services(
    partner_id: Optional[str] = Query(default=None, alias="partnerId"),
    city: Optional[str] = Query(default=None),
    user: User = Depends(current_user),
):
    return await admin_partner_service_repository.list(partner_id=partner_id, city=city)


@router.patch("/partner-services/{service_id}/status")
async def toggle_partner_service_status(
    service_id: str,
    payload: dict,
    user: User = Depends(current_user),
):
    action = payload.get("action", payload.get("status", "activate")).lower()
    updated = await admin_partner_service_repository.toggle_status(service_id, action)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner service not found")
    await audit_repository.log(await _actor(user), f"partner_service.{action}", service_id)
    return updated


@router.put("/partner-services/{service_id}")
async def update_partner_service_rate(
    service_id: str,
    payload: dict,
    user: User = Depends(current_user),
):
    updated = await admin_partner_service_repository.update_rate(
        service_id=service_id,
        price=payload.get("price"),
        turnaround_hours=payload.get("turnaroundHours"),
        min_quantity=payload.get("minQuantity"),
        express_available=payload.get("expressAvailable"),
        enabled=payload.get("enabled"),
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner service not found")
    await audit_repository.log(await _actor(user), "partner_service.rate_update", service_id)
    return updated


@router.post("/services/{service_id}/sync-to-partners")
async def sync_master_service_to_partners(
    service_id: str,
    payload: Optional[dict] = None,
    user: User = Depends(current_user),
):
    override_price = bool((payload or {}).get("overridePrice", False))
    try:
        result = await admin_partner_service_repository.sync_master_to_partners(
            master_service_id=service_id,
            override_price=override_price,
        )
        await audit_repository.log(await _actor(user), "service.sync_to_partners", service_id)
        return result
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


# -------------------------------------------------------------------- coupons
@router.get("/coupons/stats")
async def coupon_stats(user: User = Depends(current_user)):
    return await coupon_repository.stats()


@router.get("/coupons/referral-settings")
async def get_coupon_referral_settings(user: User = Depends(current_user)):
    return await coupon_repository.referral_settings()


@router.put("/coupons/referral-settings")
async def update_coupon_referral_settings(payload: dict, user: User = Depends(current_user)):
    return await coupon_repository.update_referral_settings(payload)


@router.get("/coupons/referral-list")
async def list_coupon_referrals(user: User = Depends(current_user)):
    return await coupon_repository.referrals_list()


@router.get("/coupons")
async def list_coupons(city: Optional[str] = Query(None), user: User = Depends(current_user)):
    return await coupon_repository.list(city=city)


@router.get("/coupons/{coupon_id}/redemptions")
async def get_coupon_redemptions(coupon_id: str, user: User = Depends(current_user)):
    return await coupon_repository.get_redemptions(coupon_id)


@router.post("/coupons", status_code=status.HTTP_201_CREATED)
async def create_coupon(payload: CouponPayload, user: User = Depends(current_user)):
    data = payload.model_dump(exclude_unset=True)
    coupon = await coupon_repository.create(data)
    await audit_repository.log(await _actor(user), "coupon.create", coupon["_id"])
    return coupon


@router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, payload: CouponPayload, user: User = Depends(current_user)):
    coupon = await coupon_repository.update(coupon_id, payload.model_dump(exclude_unset=True))
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    await audit_repository.log(await _actor(user), "coupon.update", coupon_id)
    return coupon


@router.patch("/coupons/{coupon_id}/status")
async def update_coupon_status(coupon_id: str, payload: dict, user: User = Depends(current_user)):
    status_val = payload.get("status", "Active")
    coupon = await coupon_repository.update(coupon_id, {"status": status_val})
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    await audit_repository.log(await _actor(user), "coupon.status", coupon_id, {"status": status_val})
    return coupon


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: User = Depends(current_user)):
    removed = await coupon_repository.delete(coupon_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    await audit_repository.log(await _actor(user), "coupon.delete", coupon_id)
    return {"ok": True}


# -------------------------------------------------------------------- banners
@router.get("/banners")
async def list_banners(user: User = Depends(current_user)):
    return await banner_repository.list()


@router.post("/banners", status_code=status.HTTP_201_CREATED)
async def create_banner(payload: dict, user: User = Depends(current_user)):
    banner = await banner_repository.create(payload)
    await audit_repository.log(await _actor(user), "banner.create", banner["_id"])
    return banner


@router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, payload: dict, user: User = Depends(current_user)):
    banner = await banner_repository.update(banner_id, payload)
    if banner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found")
    await audit_repository.log(await _actor(user), "banner.update", banner_id)
    return banner


@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, user: User = Depends(current_user)):
    removed = await banner_repository.delete(banner_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found")
    await audit_repository.log(await _actor(user), "banner.delete", banner_id)
    return {"ok": True}


# ---------------------------------------------------------------------- staff & RBAC
@router.get("/staff")
async def list_staff(user: User = Depends(current_user)):
    from app.db.client import database
    members = await database.find_many("admin_staff")
    if not members:
        from app.core.admin_security import ensure_super_admin_seed
        super_admin_doc = await ensure_super_admin_seed()
        members = [super_admin_doc]

    # Mask password hashes from output
    clean_members = []
    for m in members:
        doc = dict(m)
        doc.pop("passwordHash", None)
        doc.pop("password_hash", None)
        doc["id"] = str(doc.get("_id") or doc.get("id"))
        clean_members.append(doc)
    return clean_members


@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def create_staff(payload: StaffPayload, user: User = Depends(current_user)):
    import re
    from app.core.admin_security import hash_password
    from app.db.client import database

    email = str(payload.email or "").strip().lower()
    name = str(payload.name or "New Staff Member").strip()

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is required.")

    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")

    # Check for duplicate email in admin_staff
    existing = await database.find_one("admin_staff", {"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A staff administrator with email '{email}' already exists in the directory.",
        )

    staff_id = f"stf_{uuid.uuid4().hex[:10]}"
    raw_password = payload.password if (payload.password and len(payload.password) >= 6) else "Staff@2026"
    pwd_hash = hash_password(raw_password)
    now = now_iso()

    member_doc = {
        "_id": staff_id,
        "name": name,
        "email": email,
        "phone": payload.phone or "+91 98719 62596",
        "role": payload.role or "Operations Admin",
        "scope": payload.scope or "All India Hubs",
        "permissions": payload.permissions or ["orders", "partners", "riders", "support"],
        "passwordHash": pwd_hash,
        "lastActive": "Just now",
        "status": payload.status or "Active",
        "isVerified": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await database.update_one("admin_staff", {"_id": staff_id}, {"$set": member_doc}, upsert=True)

    # Sync to users collection
    await database.update_one(
        "users",
        {"email": email},
        {
            "$set": {
                "_id": staff_id,
                "phone": member_doc["phone"],
                "email": email,
                "display_name": name,
                "role": Role.admin.value,
                "password_hash": pwd_hash,
                "status": "active" if member_doc["status"] == "Active" else "suspended",
                "is_verified": True,
                "is_onboarded": True,
                "updated_at": now,
            }
        },
        upsert=True,
    )

    await audit_repository.log(await _actor(user), "staff.create", staff_id, meta={"name": name, "email": email, "role": payload.role})
    response_doc = dict(member_doc)
    response_doc.pop("passwordHash", None)
    response_doc["id"] = staff_id
    return response_doc


@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, payload: StaffPayload, user: User = Depends(current_user)):
    from app.core.admin_security import hash_password
    from app.db.client import database

    existing = await database.find_one("admin_staff", {"_id": staff_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    update_dict = payload.model_dump(exclude_unset=True)
    if "password" in update_dict and update_dict["password"]:
        update_dict["passwordHash"] = hash_password(update_dict.pop("password"))
    update_dict["updatedAt"] = now_iso()

    await database.update_one("admin_staff", {"_id": staff_id}, {"$set": update_dict})
    updated = await database.find_one("admin_staff", {"_id": staff_id})

    # Sync status and name to users collection if updated
    sync_user: dict = {}
    if "name" in update_dict:
        sync_user["display_name"] = update_dict["name"]
    if "status" in update_dict:
        sync_user["status"] = "active" if update_dict["status"] == "Active" else "suspended"
    if sync_user:
        sync_user["updated_at"] = now_iso()
        await database.update_one("users", {"_id": staff_id}, {"$set": sync_user})

    await audit_repository.log(await _actor(user), "staff.update", staff_id, meta=update_dict)
    clean_res = dict(updated or {})
    clean_res.pop("passwordHash", None)
    clean_res["id"] = staff_id
    return clean_res


@router.put("/staff/{staff_id}/permissions")
async def update_staff_permissions(staff_id: str, payload: StaffPermissionsPayload, user: User = Depends(current_user)):
    from app.db.client import database

    existing = await database.find_one("admin_staff", {"_id": staff_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    now = now_iso()
    await database.update_one(
        "admin_staff",
        {"_id": staff_id},
        {"$set": {"permissions": payload.permissions, "updatedAt": now}},
    )
    await audit_repository.log(
        await _actor(user),
        "staff.update_permissions",
        staff_id,
        meta={"permissions": payload.permissions, "staffName": existing.get("name")},
    )
    return {"ok": True, "permissions": payload.permissions}


@router.put("/staff/{staff_id}/status")
async def update_staff_status(staff_id: str, payload: StaffStatusPayload, user: User = Depends(current_user)):
    from app.db.client import database

    existing = await database.find_one("admin_staff", {"_id": staff_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    now = now_iso()
    new_status = payload.status
    await database.update_one(
        "admin_staff",
        {"_id": staff_id},
        {"$set": {"status": new_status, "updatedAt": now}},
    )
    # Sync status to users collection
    user_status = "active" if new_status.lower() in ("active", "approved") else "suspended"
    await database.update_one("users", {"_id": staff_id}, {"$set": {"status": user_status, "updated_at": now}})

    await audit_repository.log(
        await _actor(user),
        "staff.status_change",
        staff_id,
        meta={"status": new_status, "reason": payload.reason, "staffName": existing.get("name")},
    )
    return {"ok": True, "status": new_status}


@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, user: User = Depends(current_user)):
    from app.db.client import database

    existing = await database.find_one("admin_staff", {"_id": staff_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    await database.delete_many("admin_staff", {"_id": staff_id})
    await database.update_one("users", {"_id": staff_id}, {"$set": {"status": "blocked"}})
    await audit_repository.log(await _actor(user), "staff.delete", staff_id, meta={"staffName": existing.get("name"), "email": existing.get("email")})
    return {"ok": True}


@router.get("/staff/roles")
async def staff_roles(user: User = Depends(current_user)):
    from app.db.client import database
    members = await database.find_many("admin_staff")
    role_defs = [
        {
            "id": "RO-1",
            "name": "Super Admin",
            "members": sum(1 for m in members if m.get("role") == "Super Admin"),
            "permissions": ["all", "orders", "customers", "partners", "riders", "services", "finance", "cities", "coupons", "memberships", "support", "staff", "settings"],
        },
        {
            "id": "RO-2",
            "name": "Operations Admin",
            "members": sum(1 for m in members if m.get("role") == "Operations Admin"),
            "permissions": ["orders", "customers", "partners", "riders", "support", "cities"],
        },
        {
            "id": "RO-3",
            "name": "Fleet Dispatch Manager",
            "members": sum(1 for m in members if m.get("role") == "Fleet Dispatch Manager"),
            "permissions": ["riders", "orders", "cities"],
        },
        {
            "id": "RO-4",
            "name": "Support Lead",
            "members": sum(1 for m in members if m.get("role") == "Support Lead"),
            "permissions": ["support", "orders", "customers"],
        },
        {
            "id": "RO-5",
            "name": "Finance & Settlements Lead",
            "members": sum(1 for m in members if m.get("role") == "Finance & Settlements Lead"),
            "permissions": ["finance", "orders", "memberships"],
        },
    ]
    return role_defs


@router.get("/staff/logs")
async def staff_logs(
    actor: Optional[str] = None,
    action: Optional[str] = None,
    user: User = Depends(current_user),
):
    from app.db.client import database

    query = {}
    if actor and actor != "all":
        query["$or"] = [
            {"actor": {"$regex": actor, "$options": "i"}},
            {"actorId": {"$regex": actor, "$options": "i"}},
        ]
    if action and action != "all":
        query["action"] = {"$regex": action, "$options": "i"}

    logs = await database.find_sorted("admin_audit_logs", query, sort=[("createdAt", -1), ("at", -1)], limit=300)
    return [
        {
            "id": str(log.get("_id")),
            "actor": log.get("actor") or "QuickPress Super Admin",
            "actorId": log.get("actorId") or "admin",
            "action": log.get("action") or "system.action",
            "target": log.get("target") or "—",
            "meta": log.get("meta") or {},
            "at": log.get("at") or log.get("createdAt") or now_iso(),
        }
        for log in logs
    ]


# -------------------------------------------------------------------- support
@router.get("/support")
async def list_support(
    role: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    user: User = Depends(current_user),
):
    """GET /api/admin/support — Omnichannel helpdesk ticket directory."""
    return await support_repository.list(role=role, status=status, priority=priority, category=category, q=q)


@router.get("/support/stats")
async def support_stats(user: User = Depends(current_user)):
    """GET /api/admin/support/stats — Real-time Helpdesk KPIs and SLA metrics."""
    return await support_repository.get_stats()


@router.post("/support")
async def create_support_ticket(payload: CreateSupportTicketPayload, user: User = Depends(current_user)):
    """POST /api/admin/support — Manually log a new ticket from phone / email / walk-in."""
    ticket = await support_repository.create(payload, user)
    await audit_repository.log(await _actor(user), "support.create_ticket", ticket["id"], payload.model_dump())
    return ticket


@router.get("/support/{ticket_id}")
async def get_support(ticket_id: str, user: User = Depends(current_user)):
    """GET /api/admin/support/{ticket_id} — Conversation thread, user 360, and linked order."""
    ticket = await support_repository.get(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/support/{ticket_id}/reply")
async def reply_support(ticket_id: str, payload: SupportReplyPayload, user: User = Depends(current_user)):
    """POST /api/admin/support/{ticket_id}/reply — Send official reply or private internal note."""
    result = await support_repository.reply(
        ticket_id,
        payload.body or "",
        is_internal=bool(payload.isInternal),
        admin_user=user,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    await audit_repository.log(await _actor(user), "support.reply", ticket_id, {"isInternal": payload.isInternal})
    return result


@router.post("/support/{ticket_id}/status")
async def update_support_status(ticket_id: str, payload: SupportStatusPayload, user: User = Depends(current_user)):
    """POST /api/admin/support/{ticket_id}/status — Update ticket lifecycle status."""
    result = await support_repository.update_status(ticket_id, payload.status, user)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    await audit_repository.log(await _actor(user), "support.update_status", ticket_id, {"status": payload.status})
    return result


@router.post("/support/{ticket_id}/assign")
async def assign_support_ticket(ticket_id: str, payload: SupportAssignPayload, user: User = Depends(current_user)):
    """POST /api/admin/support/{ticket_id}/assign — Assign ticket to ops agent."""
    result = await support_repository.assign(ticket_id, payload.assignee, user)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    await audit_repository.log(await _actor(user), "support.assign", ticket_id, {"assignee": payload.assignee})
    return result


@router.post("/support/{ticket_id}/compensate")
async def compensate_support_ticket(ticket_id: str, payload: SupportCompensatePayload, user: User = Depends(current_user)):
    """POST /api/admin/support/{ticket_id}/compensate — Instant wallet compensation credit for customer."""
    try:
        result = await support_repository.compensate(ticket_id, payload.amount, payload.reason, user)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        await audit_repository.log(await _actor(user), "support.compensate", ticket_id, {"amount": payload.amount, "reason": payload.reason})
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/support/{ticket_id}/close")
async def close_support(ticket_id: str, user: User = Depends(current_user)):
    """POST /api/admin/support/{ticket_id}/close — Mark ticket resolved and closed."""
    ticket = await support_repository.close(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    await audit_repository.log(await _actor(user), "support.close", ticket_id)
    return ticket


# ------------------------------------------------------------------- settings
@router.get("/settings/scopes")
async def get_settings_scopes(user: User = Depends(current_user)):
    """GET /api/admin/settings/scopes — Returns all available scopes (Global + Live Cities)."""
    return await admin_settings_repository.get_available_scopes()


@router.get("/settings")
async def get_settings_(
    scope: str = Query(default="global"),
    city_id: Optional[str] = Query(default=None, alias="cityId"),
    user: User = Depends(current_user),
):
    return await admin_settings_repository.get(scope=scope, city_id=city_id)


@router.put("/settings")
async def update_settings(
    payload: Dict[str, Any] = Body(...),
    scope: str = Query(default="global"),
    city_id: Optional[str] = Query(default=None, alias="cityId"),
    user: User = Depends(current_user),
):
    target = f"city:{city_id}" if scope == "city" and city_id else "platform"
    settings_doc = await admin_settings_repository.update(
        payload,
        scope=scope,
        city_id=city_id,
    )
    await audit_repository.log(await _actor(user), "settings.update", target)
    return settings_doc


# --------------------------------------------------------------------- wallet
@router.get("/wallet/all-wallets")
async def get_all_wallets(user: User = Depends(current_user)):
    return await admin_wallet_repository.all_wallets()


@router.post("/wallet/adjust")
async def adjust_any_wallet(payload: dict, user: User = Depends(current_user)):
    account_id = str(payload.get("accountId") or payload.get("id"))
    role = str(payload.get("role") or "customer").lower()
    amount = float(payload.get("amount") or 0.0)
    kind = str(payload.get("type") or payload.get("kind") or "credit").lower()
    reason = str(payload.get("reason") or "Manual Admin Adjustment")
    res = await admin_wallet_repository.adjust_wallet(account_id, role, amount, kind, reason, user.id)
    await audit_repository.log(await _actor(user), "wallet.manual_adjust", account_id, payload)
    return res


@router.get("/wallet")
async def wallet(user: User = Depends(current_user)):
    return await admin_wallet_repository.wallet()


@router.get("/wallet/kpis")
async def wallet_kpis(user: User = Depends(current_user)):
    return await admin_wallet_repository.kpis()


@router.get("/wallet/all-wallets")
async def wallet_all_wallets(user: User = Depends(current_user)):
    return await admin_wallet_repository.all_wallets()


@router.get("/wallet/accounts")
async def wallet_accounts(user: User = Depends(current_user)):
    return await admin_wallet_repository.all_wallets()


@router.get("/wallet/revenue-split")
async def wallet_revenue_split(user: User = Depends(current_user)):
    return await admin_wallet_repository.revenue_split()


@router.get("/wallet/partner-earnings")
async def wallet_partner_earnings(user: User = Depends(current_user)):
    return await admin_wallet_repository.partner_earnings()


@router.get("/wallet/rider-earnings")
async def wallet_rider_earnings(user: User = Depends(current_user)):
    return await admin_wallet_repository.rider_earnings()


@router.get("/wallet/withdrawals")
async def wallet_withdrawals(user: User = Depends(current_user)):
    return await admin_wallet_repository.withdrawals()


@router.get("/wallet/refunds")
async def wallet_refunds(user: User = Depends(current_user)):
    return await admin_wallet_repository.refunds()


@router.get("/wallet/transactions")
async def wallet_transactions(user: User = Depends(current_user)):
    return await admin_wallet_repository.transactions()


@router.post("/wallet/withdrawals/{withdrawal_id}/approve")
async def approve_withdrawal(withdrawal_id: str, user: User = Depends(current_user)):
    result = await admin_wallet_repository.set_withdrawal_status(withdrawal_id, "Approved")
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    await audit_repository.log(await _actor(user), "wallet.withdrawal.approve", withdrawal_id)
    return {"ok": True, "id": withdrawal_id, "action": "approve"}


@router.post("/wallet/withdrawals/{withdrawal_id}/reject")
async def reject_withdrawal(withdrawal_id: str, user: User = Depends(current_user)):
    result = await admin_wallet_repository.set_withdrawal_status(withdrawal_id, "Rejected")
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    await audit_repository.log(await _actor(user), "wallet.withdrawal.reject", withdrawal_id)
    return {"ok": True, "id": withdrawal_id, "action": "reject"}


# --------------------------------------------------------------------- refunds
@router.get("/refunds")
async def list_admin_refunds(user: User = Depends(current_user)):
    return await admin_refund_repository.list()


@router.get("/refunds/stats")
async def admin_refunds_stats(user: User = Depends(current_user)):
    return await admin_refund_repository.get_stats()


@router.post("/refunds/initiate")
async def initiate_admin_refund(payload: dict, user: User = Depends(current_user)):
    actor = await _actor(user)
    order_id = str(payload.get("orderId") or "—")
    user_id = str(payload.get("userId") or payload.get("customerId") or "")
    customer_name = str(payload.get("customerName") or "Customer")
    customer_phone = str(payload.get("customerPhone") or "+91 98719 62596")
    amount = float(payload.get("amount") or 0.0)
    method = str(payload.get("method") or "wallet").lower()
    reason = str(payload.get("reason") or "Order Cancellation")
    notes = str(payload.get("notes") or "")

    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund amount must be greater than 0")

    result = await admin_refund_repository.initiate(
        order_id=order_id,
        user_id=user_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        amount=amount,
        method=method,
        reason=reason,
        notes=notes,
        admin_actor=actor,
    )
    await audit_repository.log(actor, "refund.initiate", result.get("_id", "—"), meta={"orderId": order_id, "amount": amount, "method": method})
    return result


@router.post("/refunds/{refund_id}/approve")
async def approve_admin_refund(refund_id: str, user: User = Depends(current_user)):
    actor = await _actor(user)
    result = await admin_refund_repository.approve(refund_id, actor)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund record not found")
    await audit_repository.log(actor, "refund.approve", refund_id)
    return {"ok": True, "refundId": refund_id, "status": "Completed"}


@router.post("/refunds/{refund_id}/reject")
async def reject_admin_refund(refund_id: str, payload: dict, user: User = Depends(current_user)):
    actor = await _actor(user)
    reason = str(payload.get("reason") or "Refund claim rejected by administration")
    result = await admin_refund_repository.reject(refund_id, reason, actor)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund record not found")
    await audit_repository.log(actor, "refund.reject", refund_id, meta={"reason": reason})
    return {"ok": True, "refundId": refund_id, "status": "Rejected"}


# -------------------------------------------------------------- notifications
@router.get("/notifications")
async def list_notifications(user: User = Depends(current_user)):
    return await notification_repository.list()


@router.post("/notifications/broadcast")
async def broadcast_notification(payload: BroadcastPayload, user: User = Depends(current_user)):
    result = await notification_repository.broadcast(
        payload.audience or "All",
        payload.title or "Announcement",
        payload.message or "",
        category=payload.category,
        channel=payload.channel,
    )
    await audit_repository.log(await _actor(user), "notifications.broadcast", payload.audience or "All", {"title": payload.title})
    return result


# -------------------------------------------------------------- referrals & loyalty
from app.db.referral_repositories import referral_repository
from app.models.referral import (
    AdminReferralListResponse,
    AdminReferralStats,
    ReferralProgramSettings,
    UpdateReferralSettingsPayload,
)


@router.get("/referrals/settings", response_model=ReferralProgramSettings)
async def get_referral_settings(user: User = Depends(current_user)) -> ReferralProgramSettings:
    """GET /api/admin/referrals/settings — fetch current dynamic referral program rules."""
    return await referral_repository.get_settings()


@router.put("/referrals/settings", response_model=ReferralProgramSettings)
async def update_referral_settings(
    payload: UpdateReferralSettingsPayload, user: User = Depends(current_user)
) -> ReferralProgramSettings:
    """PUT /api/admin/referrals/settings — modify discount %, max cap, reward amount, or toggle active."""
    updated = await referral_repository.update_settings(payload, user)
    await audit_repository.log(
        await _actor(user),
        "referral.settings.update",
        "global_referral_config",
        payload.model_dump(exclude_unset=True),
    )
    return updated


@router.get("/referrals/stats", response_model=AdminReferralStats)
async def get_referral_stats(user: User = Depends(current_user)) -> AdminReferralStats:
    """GET /api/admin/referrals/stats — referral KPI metrics."""
    return await referral_repository.admin_stats()


@router.get("/referrals/list", response_model=AdminReferralListResponse)
async def get_referrals_list(user: User = Depends(current_user)) -> AdminReferralListResponse:
    """GET /api/admin/referrals/list — full table of referral conversions and rewards."""
    return await referral_repository.admin_list()


# -----------------------------------------------------------------------------
# Memberships Management — Admin Control & Engine
# -----------------------------------------------------------------------------

from app.db.admin_membership_repository import admin_membership_repository
from app.models.membership import (
    AdminGrantPayload,
    AdminPlanPayload,
    MembershipHistoryResponse,
    MembershipPlan,
    MembershipStatsResponse,
    MembershipSubscriberItem,
    MembershipSubscribersResponse,
)


@router.get("/memberships/stats", response_model=MembershipStatsResponse)
async def get_membership_stats(user: User = Depends(current_user)) -> MembershipStatsResponse:
    """GET /api/admin/memberships/stats — Membership KPIs (Total, Active, MRR, Top tier)."""
    return await admin_membership_repository.get_stats()


@router.get("/memberships/plans", response_model=List[MembershipPlan])
async def list_membership_plans(
    include_inactive: bool = True,
    user: User = Depends(current_user),
) -> List[MembershipPlan]:
    """GET /api/admin/memberships/plans — List all plans with perks and pricing."""
    return await admin_membership_repository.list_plans(include_inactive=include_inactive)


@router.post("/memberships/plans", response_model=MembershipPlan)
async def create_membership_plan(
    payload: AdminPlanPayload,
    user: User = Depends(current_user),
) -> MembershipPlan:
    """POST /api/admin/memberships/plans — Create a new plan with custom perks."""
    return await admin_membership_repository.create_plan(payload, user)


@router.get("/memberships/plans/{plan_id}", response_model=MembershipPlan)
async def get_membership_plan(
    plan_id: str,
    user: User = Depends(current_user),
) -> MembershipPlan:
    """GET /api/admin/memberships/plans/{plan_id} — Get details of a single plan."""
    plan = await admin_membership_repository.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    return plan


@router.put("/memberships/plans/{plan_id}", response_model=MembershipPlan)
async def update_membership_plan(
    plan_id: str,
    payload: AdminPlanPayload,
    user: User = Depends(current_user),
) -> MembershipPlan:
    """PUT /api/admin/memberships/plans/{plan_id} — Update pricing, perks, or status."""
    updated = await admin_membership_repository.update_plan(plan_id, payload, user)
    if not updated:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    return updated


@router.delete("/memberships/plans/{plan_id}")
async def delete_membership_plan(
    plan_id: str,
    user: User = Depends(current_user),
) -> dict:
    """DELETE /api/admin/memberships/plans/{plan_id} — Archive or delete a plan."""
    ok = await admin_membership_repository.delete_plan(plan_id, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    return {"ok": True, "message": f"Membership plan '{plan_id}' archived/deleted successfully"}


@router.get("/memberships/subscribers", response_model=MembershipSubscribersResponse)
async def list_membership_subscribers(
    q: Optional[str] = None,
    status: Optional[str] = None,
    plan_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),
) -> MembershipSubscribersResponse:
    """GET /api/admin/memberships/subscribers — Searchable customer subscription directory."""
    return await admin_membership_repository.list_subscribers(
        q=q, status=status, plan_id=plan_id, limit=limit, offset=offset
    )


@router.post("/memberships/subscribers/{user_id}/grant", response_model=MembershipSubscriberItem)
async def grant_membership_to_subscriber(
    user_id: str,
    payload: AdminGrantPayload,
    user: User = Depends(current_user),
) -> MembershipSubscriberItem:
    """POST /api/admin/memberships/subscribers/{user_id}/grant — Admin manually grant/extend plan."""
    return await admin_membership_repository.grant_membership(user_id, payload, user)


@router.post("/memberships/subscribers/{user_id}/revoke")
async def revoke_membership_from_subscriber(
    user_id: str,
    reason: Optional[str] = None,
    user: User = Depends(current_user),
) -> dict:
    """POST /api/admin/memberships/subscribers/{user_id}/revoke — Revoke customer membership."""
    ok = await admin_membership_repository.revoke_membership(user_id, reason, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Customer membership not found")
    return {"ok": True, "message": "Membership revoked successfully"}


@router.get("/memberships/transactions", response_model=MembershipHistoryResponse)
async def list_membership_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),
) -> MembershipHistoryResponse:
    """GET /api/admin/memberships/transactions — Subscription revenue audit ledger."""
    return await admin_membership_repository.list_transactions(limit=limit, offset=offset)


# ----------------------------------------------------------- Admin Security Controls


@router.get("/security/events")
async def list_security_events(
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(current_user),
) -> dict:
    """GET /api/admin/security/events — Real-time authentication & security audit logs."""
    from app.db.client import database
    events = await database.find_many("admin_security_events", limit=limit)
    events.sort(key=lambda x: str(x.get("timestamp") or ""), reverse=True)
    rate_limits = await database.find_many("admin_rate_limits", limit=50)
    return {
        "ok": True,
        "events": events,
        "activeLockouts": [r for r in rate_limits if float(r.get("lockedUntil") or 0) > time.time()],
    }


@router.post("/security/unlock-ip")
async def unlock_client_ip(
    payload: dict,
    user: User = Depends(current_user),
) -> dict:
    """POST /api/admin/security/unlock-ip — Manually unlock an IP address."""
    from app.db.client import database
    ip = str(payload.get("ip") or "").strip()
    if not ip:
        raise HTTPException(status_code=400, detail="Client IP is required")
    await database.delete_many("admin_rate_limits", {"_id": ip})
    return {"ok": True, "message": f"IP '{ip}' successfully unlocked."}


@router.post("/security/change-pin")
async def change_admin_pin(
    payload: dict,
    user: User = Depends(current_user),
) -> dict:
    """POST /api/admin/security/change-pin — Update Admin Security Passcode."""
    from app.config import get_settings
    from app.core.admin_security import constant_time_compare
    from app.db.client import database
    import hmac

    current_pin = str(payload.get("currentPin") or "").strip()
    new_pin = str(payload.get("newPin") or "").strip()

    settings = get_settings()
    expected_pin = settings.admin_security_pin.strip()

    if not constant_time_compare(current_pin, expected_pin):
        raise HTTPException(status_code=401, detail="Current Admin Passcode is incorrect.")

    if len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="New Passcode must be at least 4 digits/characters.")

    settings.admin_security_pin = new_pin
    # Persist in Supabase settings
    await database.update_one(
        "admin_settings",
        {"_id": "security_config"},
        {"_id": "security_config", "adminSecurityPin": new_pin, "updatedAt": datetime.now(timezone.utc).isoformat()},
        upsert=True,
    )
    return {"ok": True, "message": "Admin Security Passcode successfully updated."}
 
 
# ----------------------------------------------------------- Global Server-Side Search
@router.get("/search")
async def global_search(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(current_user),
) -> dict:
    """GET /api/admin/search — Unified server-side search across Orders, Customers, Partners, Riders."""
    from app.db.client import database
    query_str = q.strip().lower()
    if not query_str:
        return {"orders": [], "customers": [], "partners": [], "riders": []}
    
    results = {
        "orders": [],
        "customers": [],
        "partners": [],
        "riders": [],
    }

    # 1. Orders
    all_orders = await database.find_many("customer_orders")
    for o in all_orders:
        o_id = str(o.get("_id") or o.get("id") or "")
        code = str(o.get("code") or "")
        c_name = str((o.get("customer") or {}).get("name") or "")
        c_phone = str((o.get("customer") or {}).get("phone") or "")
        if query_str in o_id.lower() or query_str in code.lower() or query_str in c_name.lower() or query_str in c_phone:
            results["orders"].append({
                "id": o_id,
                "code": code or o_id[:8],
                "customer": c_name or "Customer",
                "phone": c_phone,
                "status": o.get("status", "placed"),
                "amount": (o.get("totals") or {}).get("grandTotal", 0),
            })
            if len(results["orders"]) >= limit:
                break

    # 2. Customers
    all_users = await database.find_many("users")
    for u in all_users:
        u_id = str(u.get("_id") or u.get("id") or "")
        name = str(u.get("name") or u.get("fullName") or u.get("display_name") or "")
        phone = str(u.get("phone") or u.get("mobile") or "")
        email = str(u.get("email") or "")
        if query_str in u_id.lower() or query_str in name.lower() or query_str in phone or query_str in email.lower():
            results["customers"].append({
                "id": u_id,
                "name": name or "QuickPress User",
                "phone": phone,
                "email": email,
                "role": u.get("role", "customer"),
            })
            if len(results["customers"]) >= limit:
                break

    # 3. Partners
    all_partners = await database.find_many("partner_profiles")
    for p in all_partners:
        p_id = str(p.get("_id") or p.get("id") or "")
        name = str(p.get("storeName") or p.get("name") or "")
        phone = str(p.get("phone") or "")
        city = str(p.get("city") or "")
        if query_str in p_id.lower() or query_str in name.lower() or query_str in phone or query_str in city.lower():
            results["partners"].append({
                "id": p_id,
                "name": name or "QuickPress Partner",
                "phone": phone,
                "city": city,
                "status": p.get("status", "active"),
            })
            if len(results["partners"]) >= limit:
                break

    # 4. Riders
    all_riders = await database.find_many("rider_profiles")
    for r in all_riders:
        r_id = str(r.get("_id") or r.get("id") or r.get("riderId") or "")
        name = str(r.get("fullName") or r.get("name") or "")
        phone = str(r.get("phone") or "")
        vehicle = str(r.get("vehicle") or r.get("vehicleNumber") or "")
        if query_str in r_id.lower() or query_str in name.lower() or query_str in phone or query_str in vehicle.lower():
            results["riders"].append({
                "id": r_id,
                "name": name or "Delivery Captain",
                "phone": phone,
                "vehicle": vehicle,
                "isOnline": bool(r.get("isOnline")),
            })
            if len(results["riders"]) >= limit:
                break

    total_hits = sum(len(v) for v in results.values())
    return {"ok": True, "query": q, "total": total_hits, "results": results}


# ============================================================================
# Partner Change Requests & Approvals Workflow (Store Name, PAN, Bank, Services)
# ============================================================================

@router.get("/partner-approvals")
async def list_partner_approvals(
    status: str = Query("all"),
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> dict:
    """Lists all partner change requests awaiting or completed admin verification."""
    from app.services.approval_engine import approval_engine
    requests = await approval_engine.list_admin_requests(status_filter=status)
    return {"ok": True, "count": len(requests), "requests": requests}


@router.post("/partner-approvals/{request_id}/approve")
async def approve_partner_change_request(
    request_id: str,
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> dict:
    """Approves a partner change request and merges updates into live databases."""
    from app.services.approval_engine import approval_engine
    admin_name = getattr(user, "name", None) or getattr(user, "email", "Admin")
    try:
        updated = await approval_engine.approve_request(request_id, admin_name=admin_name)
        return {"ok": True, "message": "Partner change request approved successfully.", "request": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/partner-approvals/{request_id}/reject")
async def reject_partner_change_request(
    request_id: str,
    body: Optional[dict] = None,
    user: User = Depends(require_roles(Role.admin, Role.super_admin)),
) -> dict:
    """Rejects a partner change request with feedback reason."""
    from app.services.approval_engine import approval_engine
    admin_name = getattr(user, "name", None) or getattr(user, "email", "Admin")
    reason = str((body or {}).get("reason") or "Verification failed / Invalid details.")
    try:
        updated = await approval_engine.reject_request(request_id, admin_name=admin_name, reason=reason)
        return {"ok": True, "message": "Partner change request rejected.", "request": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))




