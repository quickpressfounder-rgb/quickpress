"""Payment methods, payments and refunds API — Sprint 2.10.

    GET    /api/payment-methods       saved methods + provider catalogue
    POST   /api/payment-methods       save a new method
    PUT    /api/payment-methods/{id}  edit / set default
    DELETE /api/payment-methods/{id}  remove a saved method
    POST   /api/payments/create       create a payment (wallet / COD today)
    GET    /api/payments/{id}         payment status + transaction id
    GET    /api/payments              payment history
    GET    /api/refunds               refund amount / reason / status / date

Online rails (Razorpay, UPI, cards) are modelled but rejected until
`ONLINE_PAYMENTS_ENABLED=true` with production credentials.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.core.deps import current_user
from app.db.wallet_repositories import WalletError, wallet_repository
from app.models.user import User
from app.models.wallet import (
    CreatePaymentPayload,
    CreatePaymentResponse,
    PaymentMethod,
    PaymentMethodPatch,
    PaymentMethodPayload,
    PaymentMethodsResponse,
    PaymentRecord,
    RefundsResponse,
    SimpleOkResponse,
)

router = APIRouter(tags=["payments"])


def _fail(error: WalletError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.get("/payment-methods", response_model=PaymentMethodsResponse)
async def payment_methods(user: User = Depends(current_user)) -> PaymentMethodsResponse:
    return await wallet_repository.payment_methods(user)


@router.post("/payment-methods", response_model=PaymentMethod)
async def create_payment_method(
    payload: PaymentMethodPayload, user: User = Depends(current_user)
) -> PaymentMethod:
    try:
        return await wallet_repository.add_payment_method(
            user, payload.kind, payload.name, payload.masked, payload.isDefault
        )
    except WalletError as error:
        raise _fail(error) from error


@router.put("/payment-methods/{method_id}", response_model=PaymentMethod)
async def update_payment_method(
    method_id: str, payload: PaymentMethodPatch, user: User = Depends(current_user)
) -> PaymentMethod:
    try:
        return await wallet_repository.update_payment_method(
            user, method_id, payload.model_dump(exclude_none=True)
        )
    except WalletError as error:
        raise _fail(error) from error


@router.delete("/payment-methods/{method_id}", response_model=SimpleOkResponse)
async def delete_payment_method(
    method_id: str, user: User = Depends(current_user)
) -> SimpleOkResponse:
    try:
        await wallet_repository.remove_payment_method(user, method_id)
    except WalletError as error:
        raise _fail(error) from error
    return SimpleOkResponse(ok=True, message="Payment method removed.")


@router.post("/payments/create", response_model=CreatePaymentResponse)
async def create_payment(
    payload: CreatePaymentPayload,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    user: User = Depends(current_user),
) -> CreatePaymentResponse:
    header_key = idempotency_key or x_idempotency_key
    idemp_key = payload.paymentReference or header_key or (f"{payload.orderId}:{payload.amount}:{payload.method}" if payload.orderId else None)
    if idemp_key:
        from app.core.idempotency import idempotency_engine
        idemp = await idempotency_engine.acquire("payment", f"{user.id}:{idemp_key}")
        if idemp.is_duplicate:
            if idemp.is_processing:
                raise HTTPException(
                    status_code=409,
                    detail="A payment transaction with this reference is currently processing. Please wait.",
                )
            if idemp.cached_data:
                return CreatePaymentResponse.model_validate(idemp.cached_data)

    try:
        payment, wallet = await wallet_repository.create_payment(
            user,
            payload.amount,
            payload.method,
            payload.orderId,
            payload.purpose,
            payload.paymentReference,
        )
    except Exception as error:
        if idemp_key:
            from app.core.idempotency import idempotency_engine
            await idempotency_engine.release("payment", f"{user.id}:{idemp_key}")
        if isinstance(error, WalletError):
            raise _fail(error) from error
        raise

    res = CreatePaymentResponse(
        ok=True,
        message="Payment recorded." if payment.status == "paid" else "Payment created.",
        payment=payment,
        wallet=wallet,
    )

    if idemp_key:
        try:
            from app.core.idempotency import idempotency_engine
            await idempotency_engine.complete(
                "payment", f"{user.id}:{idemp_key}", res.model_dump(mode="json")
            )
        except Exception:
            pass

    return res


@router.get("/payments", response_model=List[PaymentRecord])
async def payment_history(user: User = Depends(current_user)) -> List[PaymentRecord]:
    return await wallet_repository.payments(user)


@router.get("/refunds", response_model=RefundsResponse)
async def refunds(user: User = Depends(current_user)) -> RefundsResponse:
    return await wallet_repository.refunds(user)


# Registered last so `/payments/create` and `/payments` win over `/payments/{id}`.
@router.get("/payments/{payment_id}", response_model=PaymentRecord)
async def payment(payment_id: str, user: User = Depends(current_user)) -> PaymentRecord:
    try:
        return await wallet_repository.payment(user, payment_id)
    except WalletError as error:
        raise _fail(error) from error
