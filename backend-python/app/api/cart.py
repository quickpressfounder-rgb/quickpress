"""Smart Cart API — Sprint 2.3.

    GET    /api/cart               line items + live totals
    POST   /api/cart/items         add an item (or bump its quantity)
    PUT    /api/cart/items/{id}    update quantity (0 removes the line)
    DELETE /api/cart/items/{id}    remove an item
    GET    /api/cart/summary       store, items, coupons, charges, totals

Every route runs against the signed-in customer's cart in the MongoDB
collection `customer_carts`, using the existing bearer auth dependency.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from typing import Optional
from app.core.anti_fraud import extract_device_id
from app.core.deps import current_user, optional_user
from app.db.cart_repositories import cart_repository
from app.models.cart import (
    CartItemPayload,
    CartItemUpdatePayload,
    CartLineResponse,
    CartResponse,
    CartSummaryResponse,
)
from app.models.user import User

router = APIRouter(tags=["cart"])


def _cart_uid(user: Optional[User], request: Request) -> str:
    if user and user.id:
        return user.id
    dev_id = extract_device_id(request)
    return f"guest:{dev_id}" if dev_id else "guest"


@router.get("/cart", response_model=CartResponse)
async def get_cart(
    request: Request,
    couponDiscount: int = Query(default=0, ge=0),
    user: Optional[User] = Depends(optional_user),
) -> CartResponse:
    uid = _cart_uid(user, request)
    return await cart_repository.cart(uid, couponDiscount)


@router.get("/cart/summary", response_model=CartSummaryResponse)
async def get_cart_summary(
    request: Request,
    couponDiscount: int = Query(default=0, ge=0),
    user: Optional[User] = Depends(optional_user),
) -> CartSummaryResponse:
    uid = _cart_uid(user, request)
    return await cart_repository.summary(uid, couponDiscount)


@router.get("/cart/coupons", response_model=list)
async def get_cart_coupons(request: Request, user: Optional[User] = Depends(optional_user)):
    """GET /api/cart/coupons — list available promo codes and active referral welcome discounts."""
    uid = _cart_uid(user, request)
    return await cart_repository.coupons(uid)


@router.post("/cart", response_model=CartResponse)
async def sync_partner_cart(
    body: dict,
    user: User = Depends(current_user),
) -> CartResponse:
    from app.db.client import database

    partner_id = body.get("partnerId")
    quantities = body.get("quantities") or {}
    items = body.get("items")

    if items and isinstance(items, list):
        for item in items:
            await cart_repository.add_item(user.id, CartItemPayload(**item))
        return await cart_repository.cart(user.id)

    if quantities:
        # If switching partner store, clear lines from other partners
        existing_lines = await cart_repository.lines(user.id)
        if existing_lines and partner_id:
            has_other_partner = any(line.partnerId and line.partnerId != partner_id for line in existing_lines)
            if has_other_partner:
                await cart_repository.clear(user.id)

        for service_id, qty in quantities.items():
            if int(qty) <= 0:
                continue
            svc = await database.find_one("partner_services", {"_id": service_id})
            if svc is None:
                svc = await database.find_one("partner_services", {"id": service_id})
            if svc is None and partner_id:
                svc = await database.find_one("partner_services", {"partnerId": partner_id, "name": service_id})

            if svc and not bool(svc.get("enabled", svc.get("isActive", True))):
                continue

            resolved_partner_id = partner_id or (svc.get("partnerId") if svc else "")
            price = int((svc.get("price") if svc else 0) or 0)
            name = (svc.get("name") if svc else "Laundry Service") or "Laundry Service"
            unit = (svc.get("unit") if svc else "kg") or "kg"
            image = (svc.get("image") if svc else "") or ""
            turnaround = (svc.get("turnaroundHours") if svc else 24) or 24

            await cart_repository.add_item(
                user.id,
                CartItemPayload(
                    id=service_id,
                    itemId=service_id,
                    serviceId=service_id,
                    partnerId=resolved_partner_id,
                    name=name,
                    price=price,
                    unit=unit,
                    image=image,
                    processingTime=f"{turnaround} hrs",
                    qty=int(qty),
                ),
            )
    return await cart_repository.cart(user.id)


@router.post("/cart/items", response_model=CartLineResponse, status_code=status.HTTP_201_CREATED)
async def add_cart_item(
    payload: CartItemPayload,
    user: User = Depends(current_user),
) -> CartLineResponse:
    try:
        return await cart_repository.add_item(user.id, payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))


@router.get("/cart/instructions", response_model=list[str])
async def get_cart_instructions() -> list[str]:
    return [
        "Fold only, no iron",
        "Separate whites & colors",
        "Extra soft / fabric conditioner",
        "Gentle on delicate fabrics",
        "Eco-friendly wash",
    ]


@router.put("/cart/items/{item_id}", response_model=CartResponse)
@router.patch("/cart/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: str,
    payload: CartItemUpdatePayload,
    user: User = Depends(current_user),
) -> CartResponse:
    updated = await cart_repository.update_qty(user.id, item_id, payload.qty)
    if updated is None and payload.qty > 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    return await cart_repository.cart(user.id)


@router.delete("/cart/items/{item_id}", response_model=CartResponse)
async def delete_cart_item(
    item_id: str,
    user: User = Depends(current_user),
) -> CartResponse:
    await cart_repository.remove_item(user.id, item_id)
    return await cart_repository.cart(user.id)


@router.delete("/cart", response_model=CartResponse)
async def clear_cart(
    user: User = Depends(current_user),
) -> CartResponse:
    await cart_repository.clear(user.id)
    return await cart_repository.cart(user.id)
