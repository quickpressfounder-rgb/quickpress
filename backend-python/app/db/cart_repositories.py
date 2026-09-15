"""Smart Cart repository — Sprint 2.3.

One MongoDB collection, `customer_carts`, holds one document per cart line:

    {_id, userId, itemId, serviceId, partnerId, name, description, image,
     unit, price, discountPercent, processingTime, qty}

Pricing (live price, discount, delivery charge, handling fee and estimated
total) is always recomputed server side from `cart_settings` so the cart screen,
the sticky bottom bar and checkout can never disagree.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.db.client import database
from app.db.service_repositories import services_repository, slugify
from app.models.cart import (
    CartChargesResponse,
    CartCouponResponse,
    CartItemPayload,
    CartLineResponse,
    CartResponse,
    CartStoreResponse,
    CartSummaryResponse,
    CartTotalsResponse,
)

COLLECTION = "customer_carts"
SETTINGS_COLLECTION = "cart_settings"

DEFAULT_CHARGES: Dict[str, Any] = {
    "_id": "default",
    "pickup": 0,
    "delivery": 29,
    "handling": 15,
    "gstRate": 0.05,
    "discount": 50,
    "freeDeliveryAbove": 499,
}

DEFAULT_COUPONS: List[Dict[str, Any]] = [
    {
        "_id": "cp1",
        "code": "FIRST30",
        "title": "30% OFF up to ₹120",
        "description": "Valid on your first three QuickPress orders",
        "discount": 120,
        "best": True,
    },
    {
        "_id": "cp2",
        "code": "WASH50",
        "title": "Flat ₹50 OFF",
        "description": "On laundry orders above ₹399",
        "discount": 50,
        "best": False,
    },
    {
        "_id": "cp3",
        "code": "CASH50",
        "title": "₹50 Cashback",
        "description": "Paid back to your wallet after delivery",
        "discount": 50,
        "best": False,
    },
]

CART_SEED: Dict[str, List[Dict[str, Any]]] = {
    SETTINGS_COLLECTION: [DEFAULT_CHARGES],
    "cart_coupons": DEFAULT_COUPONS,
}


class CartRepository:
    # ------------------------------------------------------------------ config

    async def charges(self, user_id: Optional[str] = None) -> CartChargesResponse:
        # 1. Primary: Live Unified Financial Rules (Admin Governed)
        delivery = 29
        handling = 15
        gst_rate = 0.05
        pickup = 0
        discount = 0

        try:
            from app.services.unified_finance_service import unified_finance_service
            rules = await unified_finance_service.get_active_rules()
            d = rules.get("delivery", {})
            p = rules.get("pricing", {})
            g = rules.get("gst", {})
            delivery = int(round(float(d.get("baseFee", 30.0))))
            handling = int(round(float(p.get("handlingFee", 15.0))))
            gst_rate = float(g.get("laundryGstRate", 0.05))
        except Exception:
            # Fallback to admin_settings / cart_settings
            admin_doc = await database.collection("admin_settings").find_one({"_id": "platform"})
            document = await database.collection(SETTINGS_COLLECTION).find_one({"_id": "default"})
            document = document or DEFAULT_CHARGES
            if admin_doc:
                delivery = int(admin_doc.get("deliveryFee") or admin_doc.get("default_delivery_fee") or document.get("delivery", 29))
                handling = int(admin_doc.get("handlingFee") or admin_doc.get("default_handling_fee") or document.get("handling", 15))
                gst_pct = float(admin_doc.get("gstPercent") or admin_doc.get("tax_percentage") or 5)
                gst_rate = gst_pct / 100.0 if gst_pct > 1 else gst_pct
                pickup = int(admin_doc.get("pickupFee") or document.get("pickup", 0))
                discount = int(admin_doc.get("defaultDiscount") or document.get("discount", 0))
            else:
                delivery = int(document.get("delivery") or 29)
                handling = int(document.get("handling") or 15)
                gst_rate = float(document.get("gstRate") or 0.05)
                pickup = int(document.get("pickup") or 0)
                discount = int(document.get("discount") or 0)

        # Check active membership perks
        if user_id:
            try:
                from app.db.membership_repositories import membership_repository
                perks = await membership_repository.get_user_membership_perks(user_id)
                if perks.get("active"):
                    if perks.get("free_pickup"):
                        pickup = 0
                    if perks.get("free_delivery_min", 0) == 0:
                        delivery = 0
            except Exception:
                pass

        return CartChargesResponse(
            pickup=pickup,
            delivery=delivery,
            handling=handling,
            gstRate=gst_rate,
            discount=discount,
        )

    async def coupons(self, user_id: Optional[str] = None) -> List[CartCouponResponse]:
        coupons_list: List[CartCouponResponse] = []

        # Check for user-specific Referral Welcome Offer
        if user_id:
            try:
                from app.db.referral_repositories import referral_repository
                welcome_offer = await referral_repository.get_welcome_offer_for_user(user_id)
                if welcome_offer.isEligible:
                    coupons_list.append(
                        CartCouponResponse(
                            id="coupon-referral-welcome",
                            code="WELCOME50",
                            title=f"WELCOME50 — {int(welcome_offer.discountPercent)}% OFF",
                            description=f"First Order Referral Discount: {int(welcome_offer.discountPercent)}% OFF up to ₹{int(welcome_offer.maxDiscount)} (Min Order ₹{int(welcome_offer.minOrderValue)}).",
                            discount=int(welcome_offer.maxDiscount),
                            best=True,
                        )
                    )
            except Exception:
                pass

        admin_docs = await database.find_many("admin_coupons", {"status": "Active"})
        if admin_docs:
            for d in admin_docs:
                raw_discount = str(d.get("discount") or 0)
                digits = "".join(ch for ch in raw_discount if ch.isdigit())
                discount_val = int(digits) if digits else 50
                coupons_list.append(
                    CartCouponResponse(
                        id=str(d["_id"]),
                        code=d.get("code", ""),
                        title=f"{d.get('code', '')} — {d.get('discount', '')}",
                        description=d.get("description") or f"Valid on orders above ₹{d.get('minOrder', 0)}",
                        discount=discount_val,
                        best=bool(d.get("best", False)),
                    )
                )
            return coupons_list

        docs = await database.find_many("cart_coupons")
        docs = docs or DEFAULT_COUPONS
        for d in docs:
            coupons_list.append(
                CartCouponResponse(
                    id=d["_id"],
                    code=d.get("code", ""),
                    title=d.get("title", ""),
                    description=d.get("description", ""),
                    discount=int(d.get("discount") or 0),
                    best=bool(d.get("best")),
                )
            )
        return coupons_list

    # ------------------------------------------------------------------- lines

    async def lines(self, user_id: str) -> List[CartLineResponse]:
        docs = await database.find_many(COLLECTION, {"userId": user_id})
        docs.sort(key=lambda d: d.get("createdAt") or 0)
        return [_line(d) for d in docs]

    async def add_item(self, user_id: str, payload: CartItemPayload) -> CartLineResponse:
        """POST /api/cart/items — add a line, enforcing server-side pricing from MongoDB."""
        item_id = payload.id or payload.itemId or payload.serviceId or ""
        item_id = slugify(item_id) or item_id
        if not item_id:
            raise ValueError("An item id is required")

        line_id = f"{user_id}:{item_id}"
        existing = await database.collection(COLLECTION).find_one({"_id": line_id})
        if existing is not None:
            qty = max(1, int(existing.get("qty") or 0) + max(1, payload.qty))
            await database.collection(COLLECTION).update_one({"_id": line_id}, {"$set": {"qty": qty}})
            return _line({**existing, "qty": qty})

        catalog = await self._catalog_defaults(item_id, payload)
        # Server-side pricing is strictly derived from the database catalog (partner_services or services)
        verified_price = int(catalog.get("price") if catalog.get("price") is not None else (payload.price or 0))
        verified_unit = str(catalog.get("unit") or payload.unit or "kg")
        verified_name = str(catalog.get("name") or payload.name or "Laundry Service")

        document = {
            "_id": line_id,
            "userId": user_id,
            "itemId": item_id,
            "serviceId": payload.serviceId or item_id,
            "partnerId": payload.partnerId or catalog.get("partnerId", ""),
            "name": verified_name,
            "description": payload.description or catalog.get("description", ""),
            "image": payload.image or catalog.get("image", ""),
            "unit": verified_unit,
            "price": verified_price,
            "discountPercent": int(catalog.get("discountPercent") or 0),
            "processingTime": payload.processingTime or catalog.get("processingTime", "24 hrs"),
            "qty": max(1, payload.qty),
            "createdAt": await _next_sequence(user_id),
        }
        await database.collection(COLLECTION).insert_one(document)
        return _line(document)

    async def update_qty(self, user_id: str, item_id: str, qty: int) -> Optional[CartLineResponse]:
        """PUT /api/cart/items/{id} — qty 0 removes the line."""
        line_id = item_id if item_id.startswith(f"{user_id}:") else f"{user_id}:{item_id}"
        document = await database.collection(COLLECTION).find_one({"_id": line_id})
        if document is None:
            # Fallback: search by itemId for this user
            document = await database.collection(COLLECTION).find_one({"userId": user_id, "itemId": item_id})
            if document:
                line_id = str(document["_id"])
        if document is None:
            if qty <= 0:
                return None
            # If not in backend DB yet, add it as a new cart line
            clean_item_id = item_id.split(":")[-1]
            return await self.add_item(user_id, CartItemPayload(id=clean_item_id, itemId=clean_item_id, qty=qty))
        if qty <= 0:
            await database.collection(COLLECTION).delete_many({"_id": line_id})
            return None
        await database.collection(COLLECTION).update_one({"_id": line_id}, {"$set": {"qty": qty}})
        return _line({**document, "qty": qty})

    async def remove_item(self, user_id: str, item_id: str) -> bool:
        """DELETE /api/cart/items/{id}."""
        line_id = item_id if item_id.startswith(f"{user_id}:") else f"{user_id}:{item_id}"
        removed = await database.collection(COLLECTION).delete_many(
            {"_id": line_id, "userId": user_id}
        )
        return bool(removed)

    async def clear(self, user_id: str) -> None:
        await database.collection(COLLECTION).delete_many({"userId": user_id})

    # -------------------------------------------------------------- projections

    async def cart(self, user_id: str, coupon_discount: int = 0) -> CartResponse:
        """GET /api/cart — items + live totals."""
        items = await self.lines(user_id)
        charges = await self.charges(user_id)
        return CartResponse(
            items=items,
            store=await self._store(items),
            charges=charges,
            totals=compute_totals(items, charges, coupon_discount),
        )

    async def summary(self, user_id: str, coupon_discount: int = 0) -> CartSummaryResponse:
        """GET /api/cart/summary — store, items, coupons, charges and totals."""
        items = await self.lines(user_id)
        charges = await self.charges(user_id)
        store = await self._store(items)
        return CartSummaryResponse(
            store=store or _fallback_store(),
            items=items,
            coupons=await self.coupons(user_id),
            charges=charges,
            totals=compute_totals(items, charges, coupon_discount),
        )

    async def _store(self, items: List[CartLineResponse]) -> Optional[CartStoreResponse]:
        partner_id = next((item.partnerId for item in items if item.partnerId), None)
        document = None
        if partner_id:
            document = await database.find_one("partner_profiles", {"_id": partner_id})
        if document is None:
            approved = await database.find_many("partner_profiles")
            document = approved[0] if approved else None
        if document is None:
            return None
        reviews_count = int(document.get("totalOrders") or document.get("reviewsCount") or 0)
        pickup = 30
        image = document.get("bannerUrl") or document.get("cover") or document.get("logoUrl") or document.get("logo") or "store-1"
        return CartStoreResponse(
            id=str(document["_id"]),
            name=document.get("businessName") or document.get("name") or "QuickPress Partner",
            image=image,
            rating=float(document.get("rating") or 5.0),
            reviews=f"{reviews_count / 1000:.1f}k" if reviews_count >= 1000 else str(reviews_count),
            pickupEta=f"{pickup} min",
            deliveryEta="24 hrs",
        )

    async def _catalog_defaults(self, item_id: str, payload: CartItemPayload) -> Dict[str, Any]:
        """Fill missing price/name/image from partner_services or catalog."""
        # 1. Check partner_services directly with item_id, payload.id, payload.serviceId, etc.
        candidates = [c for c in (item_id, payload.id, payload.itemId, payload.serviceId) if c]
        svc = None
        for candidate_id in candidates:
            svc = await database.find_one("partner_services", {"_id": candidate_id})
            if not svc:
                svc = await database.find_one("partner_services", {"id": candidate_id})
            if not svc and payload.partnerId:
                svc = await database.find_one("partner_services", {"_id": candidate_id, "partnerId": payload.partnerId})
            if svc:
                break
        if not svc:
            svc = await database.find_one("partner_services", {"name": {"$regex": f"^{item_id}$", "$options": "i"}})
        if svc and not svc.get("pendingApproval", False) and svc.get("approvalStatus", "approved") == "approved" and bool(svc.get("enabled", svc.get("isActive", True))):
            turnaround = svc.get("turnaroundHours") or 24
            return {
                "partnerId": svc.get("partnerId") or payload.partnerId or "",
                "name": svc.get("name", "Laundry Service"),
                "description": svc.get("description", ""),
                "image": svc.get("image", ""),
                "unit": svc.get("unit", "kg"),
                "price": int(svc.get("price") or 0),
                "discountPercent": int(svc.get("discountPercent") or 0),
                "processingTime": f"{turnaround} hrs",
            }

        detail = await services_repository.resolve(item_id)
        if detail is None:
            return {}
        return {
            "partnerId": payload.partnerId or "",
            "name": detail.get("name", ""),
            "description": detail.get("description", ""),
            "image": detail.get("image", ""),
            "unit": detail.get("unit", ""),
            "price": int(detail.get("price") or 0),
            "discountPercent": int(detail.get("discountPercent") or 0),
            "processingTime": detail.get("processingTime", ""),
        }


def compute_totals(
    items: List[CartLineResponse],
    charges: CartChargesResponse,
    coupon_discount: int = 0,
) -> CartTotalsResponse:
    """Same arithmetic as `computeTotals()` in `backend/src/customer/cart-api.ts`."""
    count = sum(item.qty for item in items)
    items_total = sum(item.price * item.qty for item in items)
    active = count > 0
    pickup = charges.pickup if active else 0
    delivery = charges.delivery if active else 0
    handling = charges.handling if active else 0
    discount = min(charges.discount, items_total) if active else 0
    coupon = min(max(coupon_discount, 0), max(0, items_total - discount)) if active else 0
    taxable = max(0, items_total + pickup + delivery + handling - discount - coupon)
    gst = round(taxable * charges.gstRate)
    return CartTotalsResponse(
        count=count,
        itemsTotal=items_total,
        discount=discount,
        pickup=pickup,
        delivery=delivery,
        handling=handling,
        gst=gst,
        couponDiscount=coupon,
        grandTotal=max(0, taxable + gst),
    )


def _line(document: Dict[str, Any]) -> CartLineResponse:
    price = int(document.get("price") or 0)
    discount = int(document.get("discountPercent") or 0)
    qty = int(document.get("qty") or 0)
    final = round(price * (100 - discount) / 100) if discount else price
    return CartLineResponse(
        id=str(document.get("itemId") or document["_id"]),
        itemId=str(document.get("itemId") or document["_id"]),
        serviceId=document.get("serviceId", ""),
        partnerId=document.get("partnerId", ""),
        name=document.get("name", ""),
        description=document.get("description", ""),
        image=document.get("image", ""),
        unit=document.get("unit", ""),
        price=final,
        basePrice=price,
        discountPercent=discount,
        processingTime=document.get("processingTime", ""),
        qty=qty,
        lineTotal=final * qty,
    )


def _fallback_store() -> CartStoreResponse:
    return CartStoreResponse(
        id="",
        name="QuickPress Partner",
        image="store-1",
        rating=4.8,
        reviews="0",
        pickupEta="30 min",
        deliveryEta="24 hrs",
    )


async def _next_sequence(user_id: str) -> int:
    existing = await database.find_many(COLLECTION, {"userId": user_id})
    return len(existing) + 1


cart_repository = CartRepository()
