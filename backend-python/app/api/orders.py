"""Orders API — Sprint 2.4 (Order Creation).

    POST /api/orders              create the order from the signed-in cart
    GET  /api/orders              the customer's orders, newest first
    GET  /api/orders/{order_id}   one order (also accepts the order number)
    GET  /api/orders/history      Sprint 2.5 — searchable / filterable history
    POST /api/orders/{order_id}/cancel   cancel before pickup
    POST /api/orders/{order_id}/reorder  one tap reorder into the cart

Validation lives in the repository: an empty cart, a missing/invalid address or a
repeated idempotency key can never create an order.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import current_user, optional_user
from app.db.address_repositories import address_repository
from app.db.order_repositories import delivery_estimate, order_repository
from app.db.reorder_repositories import reorder_repository
from app.models.availability import ReorderResponse

from app.models.order import (
    OrderAddress,
    OrderResponse,
    PlaceOrderPayload,
    PlaceOrderResponse,
)
from app.models.user import User

router = APIRouter(tags=["orders"])


def _place_order_response(order: OrderResponse) -> PlaceOrderResponse:
    return PlaceOrderResponse(
        orderId=order.id,
        orderNumber=order.code,
        pickupEstimate=f"{order.pickup.date} · {order.pickup.slot}",
        deliveryEstimate=f"{order.delivery.date} · {order.delivery.slot}",
        order=order,
    )


@router.post("/orders", response_model=PlaceOrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    payload: PlaceOrderPayload, user: User = Depends(current_user)
) -> PlaceOrderResponse:
    if payload.idempotencyKey:
        from app.core.idempotency import idempotency_engine
        idemp = await idempotency_engine.acquire("order", f"{user.id}:{payload.idempotencyKey}")
        if idemp.is_duplicate:
            if idemp.is_processing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A transaction with this idempotency key is currently processing. Please do not double submit.",
                )
            if idemp.cached_data:
                cached_order = OrderResponse.model_validate(idemp.cached_data)
                return _place_order_response(cached_order)

    duplicate = await order_repository.find_recent_duplicate(user.id, payload.idempotencyKey)
    if duplicate is not None:
        # Same request replayed — return the original order instead of a new one.
        return _place_order_response(duplicate)

    if payload.address is None:
        saved = (
            await address_repository.get(user.id, payload.addressId)
            if payload.addressId
            else await address_repository.default(user.id)
        )
        if saved is None:
            if payload.idempotencyKey:
                from app.core.idempotency import idempotency_engine
                await idempotency_engine.release("order", f"{user.id}:{payload.idempotencyKey}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Select a pickup address before placing the order",
            )
        payload.address = OrderAddress(
            label=saved.label,
            line=saved.line,
            city=saved.cityLine,
            phone=saved.phone,
        )

    if payload.delivery is None:
        payload.delivery = delivery_estimate(payload.pickup)

    try:
        order = await order_repository.create(user, payload)
    except Exception as error:
        if payload.idempotencyKey:
            from app.core.idempotency import idempotency_engine
            await idempotency_engine.release("order", f"{user.id}:{payload.idempotencyKey}")
        if isinstance(error, ValueError):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))
        raise
    return _place_order_response(order)


@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(user: Optional[User] = Depends(optional_user)) -> List[OrderResponse]:
    if not user:
        return []
    return await order_repository.list(user.id)


# Registered before `/orders/{order_id}` so "history" is never read as an id.
@router.get("/orders/history", response_model=List[OrderResponse])
async def order_history(
    q: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None, alias="from"),
    date_to: str | None = Query(default=None, alias="to"),
    partner_id: str | None = Query(default=None, alias="partnerId"),
    user: Optional[User] = Depends(optional_user),
) -> List[OrderResponse]:
    """Completed, cancelled and active orders with search + filters."""
    if not user:
        return []
    return await order_repository.history(
        user.id,
        q=q,
        status=status_filter,
        date_from=date_from,
        date_to=date_to,
        partner_id=partner_id,
    )


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, user: Optional[User] = Depends(optional_user)) -> OrderResponse:
    uid = user.id if user else ""
    order = await order_repository.by_id(uid, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("/orders/{order_id}/reorder", response_model=ReorderResponse)
async def reorder_order(order_id: str, user: User = Depends(current_user)) -> ReorderResponse:
    """Smart reorder — restore, reprice and validate every line of a past order."""
    order = await order_repository.by_id(user.id, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return await reorder_repository.reorder(user, order)




@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str, body: dict | None = None, user: User = Depends(current_user)
) -> OrderResponse:
    try:
        order = await order_repository.cancel(user.id, order_id, str((body or {}).get("reason", "")))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.get("/orders/{order_id}/tracking", response_model=OrderResponse)
async def track_order(order_id: str, user: Optional[User] = Depends(optional_user)) -> OrderResponse:
    return await get_order(order_id, user)
