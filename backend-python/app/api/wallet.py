"""Customer wallet API — Sprint 2.10.

    GET  /api/wallet             balances (current / pending / reward / credits)
    GET  /api/wallet/history     full wallet transaction ledger
    POST /api/wallet/add-funds   top up the wallet (quick or custom amount)

Every route requires a bearer token and is scoped to `current_user`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import current_user
from app.db.wallet_repositories import WalletError, wallet_repository
from app.models.user import User
from app.models.wallet import (
    AddFundsPayload,
    AddFundsResponse,
    WalletHistoryResponse,
    WalletResponse,
    WalletTransaction,
)

router = APIRouter(tags=["wallet"])


@router.get("/wallet/history", response_model=WalletHistoryResponse)
async def wallet_history(
    limit: int = Query(default=100, ge=1, le=200), user: User = Depends(current_user)
) -> WalletHistoryResponse:
    return await wallet_repository.history(user, limit=limit)


@router.get("/wallet/transactions", response_model=list[WalletTransaction])
async def wallet_transactions(
    limit: int = Query(default=20, ge=1, le=100), user: User = Depends(current_user)
) -> list[WalletTransaction]:
    history = await wallet_repository.history(user, limit=limit)
    return history.items



@router.get("/wallet", response_model=WalletResponse)
async def wallet(user: User = Depends(current_user)) -> WalletResponse:
    return await wallet_repository.wallet(user)


@router.post("/wallet/add-funds", response_model=AddFundsResponse)
async def add_funds(payload: AddFundsPayload, user: User = Depends(current_user)) -> AddFundsResponse:
    try:
        ref = payload.paymentReference or payload.paymentId or payload.idempotencyKey
        return await wallet_repository.add_funds(
            user, payload.amount, payload.method, ref
        )
    except WalletError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error

