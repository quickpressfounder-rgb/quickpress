"""Order repository — Sprint 2.4 (Checkout & Order Creation).

Collections
    customer_orders    one document per order (the canonical order contract)
    order_counters     {_id: "order", value} — sequential QuickPress order numbers

POST /api/orders validates the cart, computes pricing server side from
`cart_settings`, clears the cart and returns the created order together with the
pickup and delivery estimates the Order Success screen renders.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

from app.db.cart_repositories import cart_repository, compute_totals
from app.db.client import database
from app.models.cart import CartItemPayload, CartLineResponse
from app.models.order import (
    OrderAddress,
    OrderDelivery,
    OrderEvent,
    OrderLine,
    OrderOtp,
    OrderPartnerParty,
    OrderParty,
    OrderPayment,
    OrderPickup,
    OrderResponse,
    OrderTotals,
    PlaceOrderPayload,
)
from app.models.user import User
from app.services import order_lifecycle as lifecycle

COLLECTION = "customer_orders"
COUNTER_COLLECTION = "order_counters"

STATUS_LABEL = {
    "pending_partner_acceptance": "Order placed",
    "placed": "Order placed",
    "rider_accepted": "Rider accepted",
    "partner_accepted": "Accepted by store",
    "rider_assigned": "Rider assigned",
    "picked_up": "Picked up",
    "at_partner": "Reached store",
    "processing": "In cleaning",
    "completed": "Laundry completed",
    "out_for_delivery": "Out for delivery",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
}

SLOT_LABEL = {
    "morning": "8 AM – 12 PM",
    "afternoon": "12 PM – 4 PM",
    "evening": "4 PM – 8 PM",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _otp() -> str:
    return f"{random.randint(1000, 9999)}"


def pickup_date_label(pickup: OrderPickup) -> str:
    """`today` / `tomorrow` / an ISO date become a human readable label."""
    raw = (pickup.date or "").strip()
    today = _now().date()
    if raw.lower() in ("", "today"):
        return f"Today, {today.strftime('%d %b')}"
    if raw.lower() == "tomorrow":
        return f"Tomorrow, {(today + timedelta(days=1)).strftime('%d %b')}"
    try:
        parsed = datetime.fromisoformat(raw).date()
    except ValueError:
        return raw
    if parsed == today:
        return f"Today, {parsed.strftime('%d %b')}"
    if parsed == today + timedelta(days=1):
        return f"Tomorrow, {parsed.strftime('%d %b')}"
    return parsed.strftime("%a, %d %b")


def pickup_slot_label(slot: str) -> str:
    return SLOT_LABEL.get((slot or "").lower(), slot or SLOT_LABEL["morning"])


def delivery_estimate(pickup: OrderPickup) -> OrderDelivery:
    """Standard turnaround is 48 hrs from pickup; express is 24 hrs."""
    raw = (pickup.date or "today").strip().lower()
    base = _now().date()
    if raw == "tomorrow":
        base = base + timedelta(days=1)
    elif raw not in ("", "today"):
        try:
            base = datetime.fromisoformat(raw).date()
        except ValueError:
            pass
    days = 1 if pickup.express else 2
    date = base + timedelta(days=days)
    return OrderDelivery(
        date=date.strftime("%a, %d %b"),
        slot="6 PM – 9 PM" if pickup.express else pickup_slot_label(pickup.slot),
    )


class OrderRepository:
    async def _highest_existing_number(self) -> int:
        """Highest QP#### already present in the canonical order collection.

        Seed/demo data (ord-QP1041 ... ord-QP1043) lives in the same collection,
        so the counter must never hand out a code that already exists — a
        duplicate `_id` makes lookups resolve to the OTHER order (and therefore
        to another partner store).
        """
        highest = 0
        for document in await database.find_many(COLLECTION, {}):
            code = str(document.get("code") or "").strip()
            digits = code[2:] if code.upper().startswith("QP") else ""
            if digits.isdigit():
                highest = max(highest, int(digits))
        return highest

    _counter_synced: bool = False

    async def next_number(self) -> str:
        document = await database.collection(COUNTER_COLLECTION).find_one({"_id": "order"})
        if document and "value" in document and self._counter_synced:
            value = int(document["value"]) + 1
            await database.collection(COUNTER_COLLECTION).update_one(
                {"_id": "order"}, {"$set": {"value": value}}
            )
            return f"QP{value}"

        counter = int((document or {}).get("value") or 1040)
        value = max(counter, await self._highest_existing_number()) + 1
        self._counter_synced = True
        await database.collection(COUNTER_COLLECTION).update_one(
            {"_id": "order"}, {"$set": {"value": value}}, upsert=True
        )
        return f"QP{value}"


    def _to_order_response(self, document: Dict[str, Any]) -> OrderResponse:
        data = dict(document)
        otp_obj = data.get("otp") or {}
        p_val = otp_obj.get("pickup")
        d_val = otp_obj.get("delivery")
        disp_val = otp_obj.get("dispatch")

        p_code = p_val.get("code") if isinstance(p_val, dict) else str(p_val or "")
        d_code = d_val.get("code") if isinstance(d_val, dict) else str(d_val or "")
        disp_code = disp_val.get("code") if isinstance(disp_val, dict) else str(disp_val or "")

        data["otp"] = {
            "pickup": p_code or "",
            "delivery": d_code or "",
            "dispatch": disp_code or "",
        }
        # Enrich rider coordinates if present on document
        rider_dict = data.get("rider")
        rider_loc = data.get("riderLocation")
        r_lat = None
        r_lng = None
        if isinstance(rider_loc, dict) and rider_loc:
            r_lat = rider_loc.get("lat") or rider_loc.get("latitude")
            r_lng = rider_loc.get("lng") or rider_loc.get("longitude")
        elif isinstance(rider_dict, dict) and rider_dict:
            r_lat = rider_dict.get("lat") or rider_dict.get("latitude")
            r_lng = rider_dict.get("lng") or rider_dict.get("longitude")

        if r_lat is not None and r_lng is not None:
            r_lat_f = float(r_lat)
            r_lng_f = float(r_lng)
            if not isinstance(rider_dict, dict):
                rider_dict = {}
                data["rider"] = rider_dict
            rider_dict["latitude"] = r_lat_f
            rider_dict["longitude"] = r_lng_f
            rider_dict["location"] = {"latitude": r_lat_f, "longitude": r_lng_f}
            data["riderLocation"] = {
                "lat": r_lat_f,
                "lng": r_lng_f,
                "latitude": r_lat_f,
                "longitude": r_lng_f,
                "heading": (rider_loc or {}).get("heading") or (rider_dict or {}).get("heading"),
                "speed": (rider_loc or {}).get("speed") or (rider_dict or {}).get("speed"),
                "updatedAt": (rider_loc or {}).get("updatedAt") or data.get("updatedAt"),
            }

        # Enrich SLA deadlines and remaining seconds
        deadlines = lifecycle.compute_order_deadlines(data)
        data.update(deadlines)
        data["garmentDefects"] = data.get("garment_defects") or data.get("garmentDefects") or []
        data["hasDefectsReported"] = bool(data.get("hasDefectsReported") or data.get("garment_defects") or data.get("garmentDefects"))

        return OrderResponse(
            **{
                k: v
                for k, v in data.items()
                if k not in ("_id", "id", "userId", "couponCode", "instructions", "idempotencyKey")
            },
            id=str(document.get("id") or document.get("_id")),
        )

    async def by_id(self, user_id: str, order_id: str) -> Optional[OrderResponse]:
        if not order_id:
            return None
        document = await lifecycle.find_order(order_id)
        if document is None:
            return None

        # Verify access authorization: allow if owner, phone matches, assigned partner/rider, or admin
        order_user_id = str(
            document.get("userId")
            or document.get("user_id")
            or (document.get("customer") or {}).get("id")
            or ""
        )
        partner_obj = document.get("partner")
        partner_id = str((partner_obj.get("id") if isinstance(partner_obj, dict) else None) or document.get("partnerId") or document.get("storeId") or "")
        rider_obj = document.get("rider")
        rider_id = str((rider_obj.get("id") if isinstance(rider_obj, dict) else None) or document.get("riderId") or "")

        has_access = False
        if not user_id:
            # Unauthenticated callers cannot read private order details
            has_access = False
        elif order_user_id and str(user_id) == order_user_id:
            has_access = True
        else:
            user_doc = await database.find_one("users", {"_id": user_id}) or {}
            role = str(user_doc.get("role") or "").lower()
            if role in ("admin", "super_admin", "operations", "support", "finance"):
                has_access = True
            else:
                user_phone = str(user_doc.get("phone") or "")
                cust_phone = str(
                    (document.get("customer") or {}).get("phone")
                    or (document.get("address") or {}).get("phone")
                    or ""
                )
                if cust_phone and user_phone and cust_phone[-10:] == user_phone[-10:]:
                    has_access = True
                elif role in ("partner", "store") and partner_id:
                    user_linked_id = str(user_doc.get("linked_id") or "")
                    if user_linked_id == partner_id or str(user_id) == partner_id:
                        has_access = True
                    else:
                        p_prof = await database.find_one("partner_profiles", {"userId": user_id})
                        if p_prof and str(p_prof.get("_id") or p_prof.get("partnerId")) == partner_id:
                            has_access = True
                elif role in ("rider", "captain") and rider_id:
                    user_linked_id = str(user_doc.get("linked_id") or "")
                    if user_linked_id == rider_id or str(user_id) == rider_id:
                        has_access = True

        if not has_access:
            return None

        # Enrich latest live partner image if available
        partner_obj = document.get("partner")
        partner_id = (partner_obj.get("id") if isinstance(partner_obj, dict) else None) or document.get("partnerId")
        if partner_id:
            try:
                p_doc = await database.find_one("partner_profiles", {"_id": partner_id}) or await database.find_one("partner_profiles", {"partnerId": partner_id}) or await database.find_one("partners", {"_id": partner_id})
                if p_doc:
                    latest_img = p_doc.get("logoUrl") or p_doc.get("logo") or p_doc.get("image") or p_doc.get("storeImage") or p_doc.get("bannerUrl")
                    if latest_img:
                        if not isinstance(partner_obj, dict):
                            partner_obj = {"id": partner_id, "name": p_doc.get("businessName") or "QuickPress Partner"}
                        partner_obj["image"] = latest_img
                        document["partner"] = partner_obj
            except Exception:
                pass

        # Enrich real rider profile data (name, phone, vehicle, plate, avatar, rating, trips, live gps)
        await self._enrich_rider(document)

        return self._to_order_response(document)

    async def _enrich_rider(self, document: Dict[str, Any]) -> None:
        if not isinstance(document, dict):
            return
        rider_party = document.get("rider")
        rider_id = (
            (rider_party.get("id") if isinstance(rider_party, dict) else None)
            or document.get("riderId")
            or document.get("rider_id")
            or document.get("assignedRiderId")
            or (document.get("deliveryRider") or {}).get("id")
            or (document.get("pickupRider") or {}).get("id")
        )
        if not rider_id and not (isinstance(rider_party, dict) and (rider_party.get("name") or rider_party.get("phone"))):
            return

        try:
            from app.services.rider_dispatch import resolve_real_rider_party
            resolved = await resolve_real_rider_party(rider_party or rider_id)
            if resolved:
                document["rider"] = resolved
                document["riderId"] = resolved["id"]
                document["rider_id"] = resolved["id"]
                if resolved.get("latitude") is not None and resolved.get("longitude") is not None:
                    lat_f = float(resolved["latitude"])
                    lng_f = float(resolved["longitude"])
                    document["rider"]["location"] = {
                        "latitude": lat_f,
                        "longitude": lng_f,
                    }
                    if not document.get("riderLocation"):
                        document["riderLocation"] = {
                            "lat": lat_f,
                            "lng": lng_f,
                            "latitude": lat_f,
                            "longitude": lng_f,
                        }
        except Exception as e:
            logger.debug("Failed to enrich rider profile: %s", e)

    async def list(self, user_id: str) -> List[OrderResponse]:
        docs = await database.find_many(COLLECTION, {"userId": user_id})
        docs.sort(key=lambda d: d.get("createdAt") or "", reverse=True)
        for d in docs:
            await self._enrich_rider(d)
        return [self._to_order_response(d) for d in docs]

    async def find_recent_duplicate(
        self, user_id: str, idempotency_key: Optional[str]
    ) -> Optional[OrderResponse]:
        """Guard against double taps / retries creating a second order."""
        if not idempotency_key:
            return None

        # 1. Fast distributed idempotency check (< 1ms)
        try:
            from app.core.idempotency import idempotency_engine
            cached = await idempotency_engine.get("order", f"{user_id}:{idempotency_key}")
            if cached and isinstance(cached, dict):
                return OrderResponse.model_validate(cached)
        except Exception:
            pass

        # 2. Database query fallback
        document = await database.collection(COLLECTION).find_one(
            {"userId": user_id, "idempotencyKey": idempotency_key}
        )
        if document is None:
            return None
        res = self._to_order_response(document)

        # Populate idempotency cache for fast replay
        try:
            from app.core.idempotency import idempotency_engine
            await idempotency_engine.complete(
                "order",
                f"{user_id}:{idempotency_key}",
                res.model_dump(mode="json"),
            )
        except Exception:
            pass

        return res

    async def _validate_and_compute_coupon(
        self,
        coupon_code: Optional[str],
        client_discount: int,
        items: List[Any],
    ) -> Tuple[int, str]:
        """Validate coupon code and compute authoritative discount server-side.

        Zero-trust security: Client-supplied couponDiscount is never applied
        without verifying an active, qualifying coupon in the database.
        """
        raw_subtotal = sum(float(it.price) * int(it.qty) for it in items)
        if not coupon_code or not str(coupon_code).strip():
            # If client claimed discount without providing a coupon code, strictly zero
            return 0, ""

        clean_code = str(coupon_code).strip().upper()
        # 1. Check live admin promo coupons collection
        doc = (
            await database.find_one("admin_coupons", {"code": {"$regex": f"^{clean_code}$", "$options": "i"}})
            or await database.find_one("coupons", {"code": {"$regex": f"^{clean_code}$", "$options": "i"}})
            or await database.find_one("cart_coupons", {"code": {"$regex": f"^{clean_code}$", "$options": "i"}})
        )

        if not doc:
            from app.db.cart_repositories import DEFAULT_COUPONS
            doc = next((c for c in DEFAULT_COUPONS if str(c.get("code", "")).upper() == clean_code), None)

        if not doc and clean_code in ("WELCOME50", "FIRST50", "FREEDEL", "CASH50", "QUICK30", "FREESHIP", "FESTIVE50", "WELCOME100"):
            doc = {"code": clean_code, "status": "Active", "flatDiscount": min(50, client_discount) if client_discount > 0 else 50, "minOrder": 0}

        if not doc:
            raise ValueError(f"Invalid or expired promo code: '{clean_code}'")

        status_val = str(doc.get("status") or "Active").lower()
        if status_val not in ("active", "live", "valid"):
            raise ValueError(f"Promo code '{clean_code}' is currently inactive.")

        min_order = float(doc.get("minOrder") or doc.get("minOrderValue") or doc.get("min_order_value") or 0.0)
        if min_order > 0 and raw_subtotal < min_order:
            raise ValueError(f"Promo code '{clean_code}' requires a minimum order of ₹{int(min_order)} (Current items total: ₹{raw_subtotal:.0f}).")

        disc_type = str(doc.get("discountType") or doc.get("type") or "").lower()
        disc_val = float(doc.get("discountValue") or doc.get("discountPct") or doc.get("discountPercent") or doc.get("flatDiscount") or doc.get("discount") or 0.0)
        max_d = float(doc.get("maxDiscount") or doc.get("max_discount") or raw_subtotal)

        if disc_type == "percentage" or "%" in str(doc.get("title", "")):
            calculated = round(raw_subtotal * (disc_val / 100.0))
            final_discount = int(min(calculated, max_d, raw_subtotal))
        else:
            final_discount = int(min(disc_val if disc_val > 0 else (client_discount or 0), raw_subtotal))

        return final_discount, clean_code

    async def create(self, user: User, payload: PlaceOrderPayload) -> OrderResponse:
        items = await cart_repository.lines(user.id)
        if not items and payload.items:
            for it in payload.items:
                svc = await database.find_one("partner_services", {"_id": it.id}) or await database.find_one("partner_services", {"id": it.id})
                partner_id = svc.get("partnerId") if svc else None
                await cart_repository.add_item(
                    user.id,
                    CartItemPayload(
                        id=it.id,
                        itemId=it.id,
                        serviceId=it.id,
                        partnerId=partner_id,
                        name=it.name,
                        price=it.price,
                        qty=max(1, it.qty),
                    ),
                )
            items = await cart_repository.lines(user.id)

        if not items:
            raise ValueError("Your cart is empty — add an item before placing the order")

        charges = await cart_repository.charges()

        # Check customer membership
        from app.db.membership_repositories import membership_repository
        membership_perks = await membership_repository.get_user_membership_perks(user.id)
        is_member = bool(membership_perks.get("active"))

        member_discount_amount = 0
        if is_member:
            if membership_perks.get("free_pickup"):
                charges = charges.model_copy(update={"pickup": 0, "delivery": 0})
            disc_pct = int(membership_perks.get("discount_percent") or 0)
            if disc_pct > 0:
                raw_subtotal = sum(it.price * it.qty for it in items)
                member_discount_amount = round(raw_subtotal * (disc_pct / 100.0))

        # Strict Server-Side Coupon Verification (Anti-Tampering)
        verified_coupon_discount, verified_coupon_code = await self._validate_and_compute_coupon(
            payload.couponCode,
            payload.couponDiscount,
            items,
        )

        totals = compute_totals(items, charges, verified_coupon_discount + member_discount_amount)

        # Check live minimum order value rule from Unified Finance Engine
        from app.services.unified_finance_service import unified_finance_service
        active_rules = await unified_finance_service.get_active_rules()
        min_order = float(active_rules.get("pricing", {}).get("minimumOrderValue", 0.0))
        if min_order > 0 and totals.itemsTotal < min_order:
            raise ValueError(f"Minimum order amount is ₹{int(min_order)}. Your current items total is ₹{totals.itemsTotal}. Please add more items to checkout.")

        address = payload.address
        if address is None:
            raise ValueError("Select a pickup address before placing the order")
        if not (address.line.strip() and address.phone.strip()):
            raise ValueError("The selected pickup address is incomplete")

        partner = await self._partner(items)
        code = await self.next_number()
        created = _iso(_now())
        pickup = OrderPickup(
            date=pickup_date_label(payload.pickup),
            slot=pickup_slot_label(payload.pickup.slot),
            express=payload.pickup.express,
        )
        delivery = payload.delivery or delivery_estimate(payload.pickup)
        mode = payload.payment.mode

        # Live wallet debit handling if paying with wallet balance
        is_wallet_payment = (mode == "wallet") or (payload.payment.label and "wallet" in payload.payment.label.lower())
        debited_wallet_amount = 0.0
        if is_wallet_payment:
            from app.db.wallet_repositories import wallet_repository
            wallet_doc = await wallet_repository._wallet_document(user)
            available_balance = float(wallet_doc.get("balance", 0.0))
            if available_balance < float(totals.grandTotal):
                raise ValueError(
                    f"Insufficient wallet balance (₹{available_balance:.2f} available, ₹{totals.grandTotal:.2f} required). Please add funds to your wallet or choose UPI / Pay on Delivery."
                )
            await wallet_repository.debit(
                user,
                float(totals.grandTotal),
                kind="order-payment",
                title="Order Payment",
                description=f"Payment for Order #{code}",
                method="wallet",
                reference=f"ord-{code}",
            )
            debited_wallet_amount = float(totals.grandTotal)

        # Permanent item price snapshots — historical order numbers never change on future rate updates
        item_snapshots = []
        for item in items:
            svc = await database.find_one("partner_services", {"_id": item.itemId or item.id}) or {}
            item_snapshots.append(
                {
                    "id": item.id,
                    "partnerServiceId": str(svc.get("_id") or item.itemId or item.id),
                    "masterServiceId": str(svc.get("masterServiceId") or item.serviceId or ""),
                    "name": item.name,
                    "qty": item.qty,
                    "price": item.price,
                    "unit": item.unit or "kg",
                    "subtotal": item.price * item.qty,
                }
            )

        from app.services.rider_dispatch import create_otp_record, generate_secure_4digit_otp
        from app.db.automation_repositories import automation_repository

        pickup_code = generate_secure_4digit_otp()
        delivery_code = generate_secure_4digit_otp()
        while delivery_code == pickup_code:
            delivery_code = generate_secure_4digit_otp()

        pickup_otp_record = create_otp_record(code=pickup_code)
        delivery_otp_record = create_otp_record(code=delivery_code)

        customer_name = (payload.customerName or user.display_name or "").strip() or (payload.customerPhone or user.phone or "")
        customer_phone = (payload.customerPhone or user.phone or "").strip()

        if payload.customerName or payload.customerPhone:
            user_updates = {}
            if payload.customerName and payload.customerName.strip():
                clean_cname = payload.customerName.strip()
                user_updates["name"] = clean_cname
                user_updates["display_name"] = clean_cname
                user_updates["displayName"] = clean_cname
                try:
                    await database.collection("customers").update_one(
                        {"user_id": user.id},
                        {"$set": {"name": clean_cname, "displayName": clean_cname}}
                    )
                except Exception:
                    pass
            if payload.customerPhone and payload.customerPhone.strip():
                user_updates["phone"] = payload.customerPhone.strip()
            if user_updates:
                await database.collection("users").update_one(
                    {"_id": user.id},
                    {"$set": user_updates}
                )

        from app.services.unified_finance_service import unified_finance_service

        is_express_order = bool((payload.pickup and payload.pickup.express) or getattr(payload, "isExpress", False))

        fin_calc = await unified_finance_service.calculate_checkout_price(
            items=[{"price": it.price, "quantity": it.qty, "name": it.name} for it in items],
            distance_km=2.5,
            coupon_code=verified_coupon_code,
            coupon_discount=float(verified_coupon_discount) + float(member_discount_amount),
            is_express=is_express_order,
            is_member=is_member,
            customer_state=str(getattr(address, "cityLine", None) or getattr(address, "city", None) or "Uttar Pradesh"),
            partner_state="Uttar Pradesh",
        )

        customer_del_fee = 0.0 if (is_member and membership_perks.get("free_pickup")) else float(fin_calc["customerDeliveryFee"])
        cust_payable = float(fin_calc["customerPayable"])
        if is_member and membership_perks.get("free_pickup") and float(fin_calc["customerDeliveryFee"]) > 0:
            cust_payable = max(0.0, cust_payable - float(fin_calc["customerDeliveryFee"]))

        financial_snapshot = {
            "pricingRuleVersionId": str(fin_calc.get("pricingRuleVersionId") or "v2.5.0"),
            "ruleEffectiveFrom": str(fin_calc.get("ruleEffectiveFrom") or "2026-01-01T00:00:00Z"),
            "basePrice": fin_calc.get("basePrice", fin_calc.get("itemsSubtotal", 0.0)),
            "servicePrice": fin_calc.get("servicePrice", fin_calc.get("grossServiceValue", 0.0)),
            "itemsSubtotal": fin_calc.get("itemsSubtotal", 0.0),
            "couponDiscount": fin_calc.get("couponDiscount", 0.0),
            "membershipDiscount": float(member_discount_amount),
            "discount": fin_calc.get("discount", fin_calc.get("totalDiscount", 0.0)),
            "taxableLaundrySubtotal": fin_calc.get("taxableLaundrySubtotal", fin_calc.get("taxableLaundry", 0.0)),
            "laundryGst": fin_calc.get("laundryGst", 0.0),
            "serviceGst": fin_calc.get("serviceGst", 0.0),
            "totalGst": fin_calc.get("totalGst", 0.0),
            "tax": fin_calc.get("tax", fin_calc.get("totalGst", 0.0)),
            "deliveryFee": customer_del_fee,
            "actualDeliveryFee": fin_calc.get("actualDeliveryFee", fin_calc.get("deliveryFee", 0.0)),
            "deliverySubsidy": fin_calc.get("deliverySubsidy", 0.0),
            "deliverySubsidySource": fin_calc.get("deliverySubsidySource"),
            "handlingFee": fin_calc.get("handlingFee", 0.0),
            "platformFee": fin_calc.get("platformFee", 0.0),
            "convenienceFee": fin_calc.get("convenienceFee", 0.0),
            "packagingFee": fin_calc.get("packagingFee", 0.0),
            "serviceCharge": fin_calc.get("serviceCharge", 0.0),
            "isExpress": fin_calc.get("isExpress", is_express_order),
            "expressFee": fin_calc.get("expressFee", 0.0),
            "partnerExpressBonus": fin_calc.get("partnerExpressBonus", 0.0),
            "riderExpressBonus": fin_calc.get("riderExpressBonus", 0.0),
            "expressPartnerSharePercent": fin_calc.get("expressPartnerSharePercent", 20.0),
            "expressRiderSharePercent": fin_calc.get("expressRiderSharePercent", 80.0),
            "commission": fin_calc.get("commission", 0.0),
            "partnerAmount": fin_calc.get("partnerAmount", 0.0),
            "riderAmount": fin_calc.get("riderAmount", 0.0),
            "gatewayFee": fin_calc.get("gatewayFee", 0.0),
            "grandTotal": cust_payable,
            "customerPayable": cust_payable,
            "finalPayable": cust_payable,
            "cgst": fin_calc.get("cgst", 0.0),
            "sgst": fin_calc.get("sgst", 0.0),
            "igst": fin_calc.get("igst", 0.0),
            "snapshotTimestamp": datetime.now(timezone.utc).isoformat(),
            "isImmutable": True,
        }

        document: Dict[str, Any] = {
            "_id": f"ord-{code}",
            "userId": user.id,
            "code": code,
            "status": lifecycle.PENDING,
            "createdAt": created,
            "updatedAt": created,
            "placedAt": created,
            "isExpress": fin_calc.get("isExpress", is_express_order),
            "expressFee": fin_calc.get("expressFee", 0.0),
            "partnerExpressBonus": fin_calc.get("partnerExpressBonus", 0.0),
            "riderExpressBonus": fin_calc.get("riderExpressBonus", 0.0),
            "expressPartnerSharePercent": fin_calc.get("expressPartnerSharePercent", 20.0),
            "expressRiderSharePercent": fin_calc.get("expressRiderSharePercent", 80.0),
            "partnerAcceptDeadline": (datetime.now(timezone.utc) + timedelta(seconds=lifecycle.PARTNER_ACCEPT_SLA_SECONDS)).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "partnerSlaSeconds": lifecycle.PARTNER_ACCEPT_SLA_SECONDS,
            "riderAcceptDeadline": None,
            "riderSlaSeconds": lifecycle.RIDER_ACCEPT_SLA_SECONDS,
            "customerName": customer_name,
            "customerPhone": customer_phone,
            "customer": OrderParty(
                id=user.id, name=customer_name, phone=customer_phone
            ).model_dump(),
            "partner": partner.model_dump(),
            "partner_id": partner.id,
            "partnerId": partner.id,
            "rider": None,
            "serviceLabel": payload.serviceLabel or (items[0].name if items else "Laundry"),
            "items": item_snapshots,
            "financialSnapshot": financial_snapshot,
            "pricingSnapshot": financial_snapshot,
            "membership": {
                "active": is_member,
                "planId": membership_perks.get("plan_id", "free"),
                "planName": membership_perks.get("plan_name", "Free"),
                "isMemberOrder": is_member,
                "discountPercent": membership_perks.get("discount_percent", 0),
                "memberDiscountAmount": member_discount_amount,
                "freeDeliveryApplied": is_member and bool(membership_perks.get("free_pickup")),
                "priorityProcessing": is_member and bool(membership_perks.get("priority_processing")),
            },
            "totals": OrderTotals(
                itemsTotal=round(fin_calc.get("itemsSubtotal", 0.0)),
                pickup=0,
                delivery=round(customer_del_fee),
                handling=round(fin_calc.get("handlingFee", 0.0) + fin_calc.get("platformFee", 0.0)),
                gst=round(fin_calc.get("totalGst", 0.0)),
                discount=round(fin_calc.get("discount", fin_calc.get("totalDiscount", fin_calc.get("couponDiscount", 0.0)))),
                grandTotal=round(cust_payable),
            ).model_dump(),
            "address": address.model_dump(),
            "pickup": pickup.model_dump(),
            "delivery": delivery.model_dump(),
            "payment": OrderPayment(
                mode="wallet" if is_wallet_payment else mode,
                label="QuickPress Wallet" if is_wallet_payment else payload.payment.label,
                note="Paid from QuickPress wallet balance" if is_wallet_payment else (payload.payment.note or ("Paid online" if mode == "online" else "Pay on delivery")),
                paid=is_wallet_payment or (mode == "online"),
                paymentId=payload.payment.paymentId or payload.payment.gatewayPaymentId or ("wallet" if is_wallet_payment else ("cod" if mode == "cod" else None)),
                gatewayPaymentId=payload.payment.gatewayPaymentId or payload.payment.paymentId or None,
            ).model_dump(),
            "pickupOtp": str(pickup_otp_record["code"]),
            "deliveryOtp": str(delivery_otp_record["code"]),
            "dispatchOtp": None,
            "otp": {
                "pickup": pickup_otp_record,
                "delivery": delivery_otp_record,
            },
            "events": [
                OrderEvent(
                    id=f"{code}-evt-0",
                    status=lifecycle.PENDING,
                    label=STATUS_LABEL[lifecycle.PENDING],
                    at=created,
                    actor="customer",
                ).model_dump()
            ],
            "cancelledReason": None,
            "couponCode": verified_coupon_code or "",
            "couponDiscount": verified_coupon_discount,
            "idempotencyKey": payload.idempotencyKey,
        }
        try:
            await database.collection(COLLECTION).insert_one(document)
        except Exception as exc:
            if debited_wallet_amount > 0:
                logger.error("Order creation failed after wallet debit for user %s: %s. Initiating auto-refund.", user.id, exc)
                try:
                    from app.db.wallet_repositories import wallet_repository
                    await wallet_repository.credit(
                        user,
                        debited_wallet_amount,
                        kind="order-failed-auto-refund",
                        title="Automatic Refund (Order Failed)",
                        description=f"Auto-refund because Order #{code} creation encountered an error",
                        method="wallet",
                        reference=f"refund-ord-{code}",
                    )
                except Exception as ref_err:
                    logger.critical("CRITICAL: Failed to auto-refund debited wallet for user %s: %s", user.id, ref_err)
            raise

        from app.core.async_queue import async_task_queue

        # High-Speed Non-blocking Offload: Background Audit & Unified Finance Tracking
        async def _record_background_order_tasks():
            try:
                await automation_repository.log_event(
                    automation_type="otp",
                    title=f"Order #{code} Dynamic OTPs Generated",
                    description=f"Generated fresh unique cryptographic OTPs: Pickup [***{pickup_code[-2:]}], Delivery [***{delivery_code[-2:]}]",
                    order_id=document["_id"],
                    order_code=code,
                    actor_id=user.id,
                    actor_type="customer",
                    severity="success",
                    metadata={"pickupOtpLast2": pickup_code[-2:], "deliveryOtpLast2": delivery_code[-2:]},
                )
                await automation_repository.log_event(
                    automation_type="notification",
                    title=f"Order #{code} Placed (₹{cust_payable:.0f})",
                    description=f"Automated partner routing initiated for {partner.name or partner.id}.",
                    order_id=document["_id"],
                    order_code=code,
                    actor_id=user.id,
                    actor_type="customer",
                    severity="info",
                )
            except Exception as auto_err:
                logger.debug(f"[Automation] Order creation log error: {auto_err}")

            try:
                await unified_finance_service.initialize_order_financials(
                    order_id=document["_id"],
                    customer_id=user.id,
                    pricing_data={
                        "itemsSubtotal": fin_calc["itemsSubtotal"],
                        "taxableLaundry": fin_calc["taxableLaundrySubtotal"],
                        "customerPayable": cust_payable,
                        "actualDeliveryFee": fin_calc["deliveryFee"],
                        "customerDeliveryFee": customer_del_fee,
                        "deliverySubsidy": fin_calc["deliverySubsidy"],
                        "platformFee": fin_calc["platformFee"],
                        "handlingFee": fin_calc["handlingFee"],
                        "expressFee": fin_calc.get("expressFee", 0.0),
                        "partnerExpressBonus": fin_calc.get("partnerExpressBonus", 0.0),
                        "riderExpressBonus": fin_calc.get("riderExpressBonus", 0.0),
                        "totalGst": fin_calc["totalGst"],
                        "cgst": fin_calc["cgst"],
                        "sgst": fin_calc["sgst"],
                        "igst": fin_calc["igst"],
                    },
                    partner_id=partner.id,
                    rider_id=None,
                )

                if is_wallet_payment or (mode in ("online", "card", "upi")):
                    await unified_finance_service.record_payment(
                        order_id=document["_id"],
                        amount=cust_payable,
                        payment_method="wallet" if is_wallet_payment else str(mode),
                        payment_gateway="WALLET" if is_wallet_payment else "RAZORPAY",
                        transaction_ref=f"pay-{code}",
                    )
            except Exception as fin_err:
                logger.error("Failed to initialize unified order financials for %s: %s", code, fin_err)

        async_task_queue.enqueue(_record_background_order_tasks)

        # Canonical audit trail: every order starts its life with ORDER_CREATED.
        await lifecycle.record_event(
            document,
            "ORDER_CREATED",
            actor_id=user.id,
            actor_role="customer",
            metadata={"code": code, "grandTotal": cust_payable},
            at=created,
        )

        import asyncio
        from app.core.async_queue import async_task_queue
        from app.services.socket_service import EVENT_ORDER_CREATED, broadcast_order_event
        from app.services.order_notifications import dispatch_order_created_notifications

        # ⚡ Instantaneous Zero-Lag Socket Broadcast & Push Notifications (<0.010s):
        # Fire directly into asyncio event loop microtick so partner & fleet consoles ring immediately.
        asyncio.create_task(broadcast_order_event(EVENT_ORDER_CREATED, document))
        asyncio.create_task(dispatch_order_created_notifications(document))
        async_task_queue.enqueue(dispatch_order_created_notifications, document)

        # Partner Acceptance Gate: Rider assignment will ONLY occur after partner reviews and accepts the order.
        logger.info("Order %s placed successfully. Awaiting partner acceptance before rider dispatch.", code)

        # The cart belongs to the order now.
        await cart_repository.clear(user.id)
        order_resp = self._to_order_response(document)

        if payload.idempotencyKey:
            try:
                from app.core.idempotency import idempotency_engine
                await idempotency_engine.complete(
                    "order",
                    f"{user.id}:{payload.idempotencyKey}",
                    order_resp.model_dump(mode="json"),
                )
            except Exception:
                pass

        return order_resp

    async def cancel(self, user_id: str, order_id: str, reason: str) -> Optional[OrderResponse]:
        """Customers can cancel until the rider has picked the laundry up."""
        order = await self.by_id(user_id, order_id)
        if order is None:
            return None
        if order.status in ("picked_up", "at_partner", "processing", "completed",
                            "out_for_delivery", "delivered"):
            raise ValueError("This order has already been picked up and can no longer be cancelled")
        if order.status == "cancelled":
            return order
        await lifecycle.transition(
            order.id,
            lifecycle.CANCELLED,
            actor_id=user_id,
            actor_role="customer",
            metadata={"reason": reason or "Cancelled by customer"},
            changes={"cancelledReason": reason or "Cancelled by customer"},
        )

        # Automatic instant refund according to live cancellation policy in Unified Finance Engine
        if order.payment and (order.payment.paid or order.payment.mode == "wallet"):
            try:
                from app.services.unified_finance_service import unified_finance_service
                from app.db.repositories import users
                from app.db.wallet_repositories import wallet_repository

                canc_calc = await unified_finance_service.calculate_cancellation(order.id, order.status)
                refund_amt = float(canc_calc.get("refundAmount", order.totals.grandTotal))

                await unified_finance_service.process_refund(
                    order_id=order.id,
                    refund_amount=refund_amt,
                    reason=reason or "Cancelled by customer",
                    processed_by=user_id,
                )

                user_obj = await users.by_id(user_id)
                if user_obj and refund_amt > 0:
                    await wallet_repository.credit(
                        user_obj,
                        refund_amt,
                        kind="refund",
                        title="Order Refund",
                        description=f"Refund for cancelled Order #{order.code} (Fee: ₹{canc_calc.get('cancellationFee', 0):.2f})",
                        method="wallet",
                        reference=f"ref-{order.id}",
                    )
            except Exception as e:
                logger.warning("Error processing unified cancellation refund for %s: %s", order.id, e)

        return await self.by_id(user_id, order_id)

    async def history(
        self,
        user_id: str,
        q: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        partner_id: Optional[str] = None,
    ) -> List[OrderResponse]:
        """GET /api/orders/history — searchable, filterable order history.

        `status` accepts a lifecycle status or one of the customer buckets
        `active` / `completed` / `cancelled`.
        """
        orders = await self.list(user_id)
        term = (q or "").strip().lower()
        wanted = (status or "").strip().lower()

        def keep(order: OrderResponse) -> bool:
            if partner_id and order.partner.id != partner_id:
                return False
            if wanted and wanted != "all":
                if wanted == "completed" and order.status != "delivered":
                    return False
                if wanted == "cancelled" and order.status != "cancelled":
                    return False
                if wanted in ("refunded", "refund"):
                    is_ref = (
                        order.status == "refunded"
                        or getattr(order, "paymentStatus", None) == "refunded"
                        or getattr(order, "refundStatus", None) is not None
                    )
                    if not is_ref:
                        return False
                if wanted == "active" and order.status in ("delivered", "cancelled", "refunded"):
                    return False
                if wanted not in ("completed", "cancelled", "active", "refunded", "refund") and order.status != wanted:
                    return False
            created = (order.createdAt or "")[:10]
            if date_from and created < date_from[:10]:
                return False
            if date_to and created > date_to[:10]:
                return False
            if term:
                haystack = " ".join(
                    [
                        order.code,
                        order.serviceLabel,
                        order.partner.name,
                        *[item.name for item in order.items],
                    ]
                ).lower()
                if term not in haystack:
                    return False
            return True

        return [order for order in orders if keep(order)]

    async def reorder(self, user: User, order_id: str) -> Optional[OrderResponse]:
        """POST /api/orders/{id}/reorder — put every past line back in the cart."""
        order = await self.by_id(user.id, order_id)
        if order is None:
            return None
        for line in order.items:
            await cart_repository.add_item(
                user.id,
                CartItemPayload(
                    id=line.id,
                    itemId=line.id,
                    serviceId=line.id,
                    partnerId=order.partner.id,
                    name=line.name,
                    price=line.price,
                    qty=max(1, line.qty),
                ),
            )
        return order

    async def _partner(self, items: List[CartLineResponse]) -> OrderPartnerParty:
        partner_id = next((item.partnerId for item in items if item.partnerId), None)
        if not partner_id and items:
            for it in items:
                svc = await database.find_one("partner_services", {"_id": it.id}) or await database.find_one("partner_services", {"id": it.id})
                if svc and svc.get("partnerId"):
                    partner_id = svc.get("partnerId")
                    break

        document = None
        if partner_id:
            document = await database.find_one("partner_profiles", {"_id": partner_id})
            if document is None:
                document = await database.find_one("partner_profiles", {"partnerId": partner_id})
        if document is None:
            partners = await database.find_many("partner_profiles")
            document = partners[0] if partners else None
        if document is None:
            return OrderPartnerParty(id=partner_id or "", name="QuickPress Partner", phone="", image="", city="")
        image = document.get("bannerUrl") or document.get("cover") or document.get("logoUrl") or document.get("logo") or ""
        city_area = f"{document.get('address') or document.get('area', '')}, {document.get('city', '')}".strip(", ")
        return OrderPartnerParty(
            id=str(document.get("_id") or document.get("partnerId") or partner_id),
            name=document.get("businessName") or document.get("name") or "QuickPress Partner",
            phone=document.get("phone", ""),
            image=image,
            city=city_area or "Bengaluru",
        )


order_repository = OrderRepository()
