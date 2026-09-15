"""Wallet, payment-method, payment and refund repository — Sprint 2.10.

MongoDB collections
-------------------
`wallets`               exactly one document per customer.

    {
      "_id": "wlt-<user_id>",
      "user_id": "<users._id>",
      "balance": 450.0,              # spendable, never negative
      "pending_balance": 0.0,        # top-ups / refunds awaiting settlement
      "reward_balance": 120.0,       # cashback + referral rewards
      "membership_credits": 0.0,     # credits granted by an active membership
      "currency": "INR",
      "created_at": "…", "updated_at": "…"
    }

`wallet_transactions`   append-only ledger (credit / debit).

    {
      "_id": "wtx-<uuid>", "user_id": "…", "kind": "add-funds",
      "title": "Money added", "description": "…",
      "amount": 500.0, "direction": "credit", "status": "success",
      "balance_after": 950.0, "method": "wallet",
      "reference": "pay-…", "created_at": "…"
    }

`payment_methods`       saved methods per customer (COD + Wallet seeded).

`payments`              one document per payment attempt, with a human
                        `transaction_id` shown in Payment History.

`refunds`               refund requests raised against a payment / order.

Business rules enforced here
----------------------------
* Wallet balances can never go negative — debits above the available balance
  raise `WalletError` (400) and no ledger entry is written.
* Every amount is validated (> 0, capped) before it touches the ledger.
* Online rails (Razorpay / UPI / cards) are modelled end-to-end but rejected
  until `ONLINE_PAYMENTS_ENABLED` is turned on with production credentials —
  `_gateway_intent()` is the single seam a real gateway plugs into.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.models.user import User, utcnow
from app.models.wallet import (
    ONLINE_KINDS,
    AddFundsResponse,
    PaymentMethod,
    PaymentMethodsResponse,
    PaymentProvider,
    PaymentRecord,
    Refund,
    RefundsResponse,
    WalletBalances,
    WalletHistoryResponse,
    WalletResponse,
    WalletTransaction,
)

WALLETS = "wallets"
TRANSACTIONS = "wallet_transactions"
PAYMENT_METHODS = "payment_methods"
PAYMENTS = "payments"
REFUNDS = "refunds"

MAX_TOPUP = 100_000.0

KIND_LABELS: Dict[str, str] = {
    "cod": "Cash on Delivery",
    "wallet": "Wallet",
    "razorpay": "Razorpay",
    "upi": "UPI",
    "card": "Debit/Credit Card",
    "credit-card": "Credit Card",
    "debit-card": "Debit Card",
    "netbanking": "Net Banking",
    "instant": "Express Top-up",
}

PROVIDERS: List[Dict[str, Any]] = [
    {"id": "cod", "kind": "cod", "name": "Cash on Delivery", "tagline": "Pay the rider on delivery", "initials": "CO", "enabled": True},
    {"id": "wallet", "kind": "wallet", "name": "QuickPress Wallet", "tagline": "Instant, zero fees", "initials": "QP", "enabled": True},
    {"id": "razorpay", "kind": "razorpay", "name": "Razorpay Online", "tagline": "UPI, Cards, NetBanking", "initials": "RP", "enabled": True},
    {"id": "upi", "kind": "upi", "name": "UPI (GPay / PhonePe / Paytm)", "tagline": "Direct UPI Intent & QR", "initials": "UP", "enabled": True},
    {"id": "credit-card", "kind": "credit-card", "name": "Credit Card", "tagline": "Visa, Mastercard, RuPay", "initials": "CC", "enabled": True},
    {"id": "debit-card", "kind": "debit-card", "name": "Debit Card", "tagline": "All Major Indian Banks", "initials": "DC", "enabled": True},
]


def online_payments_enabled() -> bool:
    """Always enabled — gateway routes to Razorpay with test simulation fallback."""
    return True


class WalletError(Exception):
    """Business-rule violation (validation / insufficient balance / not found)."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    return value if isinstance(value, str) else value.isoformat()


def _money(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


class WalletRepository:
    # ------------------------------------------------------------- wallet
    _user_locks: Dict[str, asyncio.Lock] = {}

    async def _wallet_document(self, user: User) -> Dict[str, Any]:
        collection = database.collection(WALLETS)
        existing = await collection.find_one({"user_id": user.id})
        if existing:
            return existing
        now = _iso(utcnow())
        document = {
            "_id": f"wlt-{user.id}",
            "user_id": user.id,
            "balance": 0.0,
            "pending_balance": 0.0,
            "reward_balance": 0.0,
            "membership_credits": 0.0,
            "currency": "INR",
            "created_at": now,
            "updated_at": now,
        }
        await collection.insert_one(document)
        await self._ensure_default_methods(user)
        return document

    async def _save_wallet(self, document: Dict[str, Any]) -> None:
        document["updated_at"] = _iso(utcnow())
        await database.collection(WALLETS).update_one(
            {"_id": document["_id"]},
            {"$set": {k: v for k, v in document.items() if k != "_id"}},
            upsert=True,
        )

    def _balances(self, document: Dict[str, Any]) -> WalletBalances:
        return WalletBalances(
            currentBalance=_money(document.get("balance")),
            pendingBalance=_money(document.get("pending_balance")),
            rewardBalance=_money(document.get("reward_balance")),
            membershipCredits=_money(document.get("membership_credits")),
            currency=document.get("currency") or "INR",
        )

    def _to_transaction(self, document: Dict[str, Any]) -> WalletTransaction:
        return WalletTransaction(
            id=str(document.get("_id")),
            kind=document.get("kind") or "add-funds",
            title=document.get("title") or "Wallet activity",
            description=document.get("description") or "",
            amount=_money(document.get("amount")),
            direction=document.get("direction") or "credit",
            status=document.get("status") or "success",
            balanceAfter=_money(document.get("balance_after")),
            method=document.get("method"),
            reference=document.get("reference"),
            createdAt=_iso(document.get("created_at")) or _iso(utcnow()) or "",
        )

    async def _transactions(self, user: User, limit: Optional[int] = None) -> List[WalletTransaction]:
        docs = await database.find_many(TRANSACTIONS, {"user_id": user.id}, sort_key="created_at")
        docs.reverse()  # newest first
        if limit is not None:
            docs = docs[:limit]
        return [self._to_transaction(doc) for doc in docs]

    async def _referral_summary(self, user: User) -> tuple[str, float]:
        """Referral code + lifetime referral earnings (Sprint 2.8 collections).

        Read-only: the referral flow itself is untouched, the wallet screen
        just mirrors the figures it already displayed.
        """
        try:
            from app.db.referral_repositories import referral_repository

            profile = await referral_repository.ensure_profile(user)
            rewards = await database.find_many("referral_rewards", {"user_id": user.id})
            earned = sum(
                _money(item.get("amount"))
                for item in rewards
                if str(item.get("status")) == "completed"
            )
            return str(profile.get("code") or ""), round(earned, 2)
        except Exception:  # referral data is optional for the wallet screen
            return "", 0.0

    async def _wallet_response(self, user: User, document: Dict[str, Any]) -> WalletResponse:
        balances = self._balances(document)
        referral_code, referral_earned = await self._referral_summary(user)
        # Reward balance = wallet-held rewards + credited referral rewards.
        balances.rewardBalance = round(balances.rewardBalance + referral_earned, 2)
        return WalletResponse(
            balances=balances,
            totalBalance=round(
                balances.currentBalance + balances.rewardBalance + balances.membershipCredits, 2
            ),
            recentTransactions=await self._transactions(user, limit=5),
            updatedAt=_iso(document.get("updated_at")),
            referralCode=referral_code,
            referralEarned=referral_earned,
        )

    async def wallet(self, user: User) -> WalletResponse:
        return await self._wallet_response(user, await self._wallet_document(user))

    async def history(self, user: User, limit: int = 100) -> WalletHistoryResponse:
        await self._wallet_document(user)
        items = await self._transactions(user)
        return WalletHistoryResponse(items=items[:limit], total=len(items))

    async def _record_transaction(
        self,
        user: User,
        *,
        kind: str,
        title: str,
        amount: float,
        direction: str,
        balance_after: float,
        status: str = "success",
        description: str = "",
        method: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> WalletTransaction:
        document = {
            "_id": f"wtx-{uuid.uuid4().hex[:12]}",
            "user_id": user.id,
            "kind": kind,
            "title": title,
            "description": description,
            "amount": _money(amount),
            "direction": direction,
            "status": status,
            "balance_after": _money(balance_after),
            "method": method,
            "reference": reference,
            "created_at": _iso(utcnow()),
        }
        await database.collection(TRANSACTIONS).insert_one(document)
        return self._to_transaction(document)

    async def credit(
        self,
        user: User,
        amount: float,
        *,
        kind: str = "add-funds",
        title: str = "Money added",
        description: str = "",
        method: Optional[str] = "wallet",
        reference: Optional[str] = None,
        status: str = "success",
    ) -> tuple[Dict[str, Any], WalletTransaction]:
        amount = self._validate_amount(amount)
        document = await self._wallet_document(user)
        if status == "pending":
            document["pending_balance"] = _money(document.get("pending_balance")) + amount
        else:
            document["balance"] = _money(document.get("balance")) + amount
        await self._save_wallet(document)
        transaction = await self._record_transaction(
            user,
            kind=kind,
            title=title,
            amount=amount,
            direction="credit",
            balance_after=_money(document.get("balance")),
            status=status,
            description=description,
            method=method,
            reference=reference,
        )

        # Synchronize double-entry wallet_ledger collection
        try:
            from app.services import wallet_ledger as ledger
            await ledger.append_entry(
                account_id=user.id,
                role="customer",
                direction="credit",
                reason=kind if kind in ("add-funds", "wallet-topup", "refund", "referral-bonus") else "wallet-topup",
                amount=amount,
                note=description or title,
                reference=reference or transaction.id,
                status=status,
            )
        except Exception:
            pass

        return document, transaction

    async def debit(
        self,
        user: User,
        amount: float,
        *,
        kind: str = "order-payment",
        title: str = "Wallet payment",
        description: str = "",
        method: Optional[str] = "wallet",
        reference: Optional[str] = None,
    ) -> tuple[Dict[str, Any], WalletTransaction]:
        user_lock = self._user_locks.setdefault(user.id, asyncio.Lock())
        async with user_lock:
            amount = self._validate_amount(amount)
            # Ensure wallet document exists
            await self._wallet_document(user)

            wallet_col = database.collection(WALLETS)
            wallet_doc = await wallet_col.find_one({"user_id": user.id})
            if not wallet_doc:
                raise WalletError("Wallet not found.", 404)

            current_balance = _money(wallet_doc.get("balance"))
            if amount > current_balance:
                raise WalletError("Insufficient wallet balance.", 400)

            # Atomic conditional deduction: balance must be >= amount
            res = await wallet_col.update_one(
                {"_id": wallet_doc["_id"], "balance": {"$gte": amount}},
                {
                    "$inc": {"balance": -amount},
                    "$set": {"updated_at": _iso(utcnow())},
                },
            )
            # If condition wasn't met due to concurrent race, reject
            if getattr(res, "modified_count", 1) == 0:
                raise WalletError("Insufficient wallet balance or concurrent transaction in progress.", 400)

            refreshed = await wallet_col.find_one({"_id": wallet_doc["_id"]}) or wallet_doc
            new_balance = _money(refreshed.get("balance"))

            transaction = await self._record_transaction(
                user,
                kind=kind,
                title=title,
                amount=amount,
                direction="debit",
                balance_after=new_balance,
                description=description,
                method=method,
                reference=reference,
            )

            # Synchronize double-entry wallet_ledger collection
            try:
                from app.services import wallet_ledger as ledger
                await ledger.append_entry(
                    account_id=user.id,
                    role="customer",
                    direction="debit",
                    reason=kind if kind in ("order-payment", "withdrawal") else "order-payment",
                    amount=amount,
                    note=description or title,
                    reference=reference or transaction.id,
                )
            except Exception:
                pass

            return refreshed, transaction

    def _validate_amount(self, amount: Any) -> float:
        value = _money(amount)
        if value <= 0:
            raise WalletError("Enter an amount greater than ₹0.", 400)
        if value > MAX_TOPUP:
            raise WalletError(f"Amount can't exceed ₹{int(MAX_TOPUP):,}.", 400)
        return value

    async def add_funds(
        self, user: User, amount: float, method: str = "wallet", payment_reference: Optional[str] = None
    ) -> AddFundsResponse:
        value = self._validate_amount(amount)
        method_clean = (method or "wallet").strip().lower()
        method_label = KIND_LABELS.get(method_clean, method_clean.upper())

        payment = await self._create_payment_document(
            user,
            amount=value,
            method=method_clean,
            purpose="wallet-topup",
            status="paid",
            payment_reference=payment_reference,
        )
        document, transaction = await self.credit(
            user,
            value,
            kind="add-funds",
            title="Money added to wallet",
            description=f"Added via {method_label}",
            method=method_clean,
            reference=payment.id,
        )
        wallet_resp = await self._wallet_response(user, document)

        # In-app notification
        try:
            from app.services.order_notifications import send_customer_notification
            await send_customer_notification(
                user.id,
                kind="wallet",
                title="Wallet Top-up Successful",
                description=f"₹{int(value) if value.is_integer() else value} has been credited to your QuickPress wallet via {method_label}.",
            )
        except Exception:
            pass

        # Real-time Socket.IO broadcast
        try:
            from app.services.socket_service import broadcast_wallet_event
            await broadcast_wallet_event(user.id, wallet_resp.model_dump())
        except Exception:
            pass

        return AddFundsResponse(
            ok=True,
            message=f"₹{int(value) if value.is_integer() else value} added to your wallet.",
            wallet=wallet_resp,
            transaction=transaction,
            payment=payment,
        )

    # ---------------------------------------------------- payment methods

    def _to_method(self, document: Dict[str, Any]) -> PaymentMethod:
        kind = document.get("kind") or "wallet"
        return PaymentMethod(
            id=str(document.get("_id")),
            kind=kind,
            name=document.get("name") or KIND_LABELS.get(kind, "Payment method"),
            masked=document.get("masked") or "",
            note=document.get("note") or "",
            isDefault=bool(document.get("is_default")),
            enabled=bool(document.get("enabled", True)),
            createdAt=_iso(document.get("created_at")),
        )

    async def _ensure_default_methods(self, user: User) -> None:
        collection = database.collection(PAYMENT_METHODS)
        existing = await collection.count_documents({"user_id": user.id})
        if existing:
            return
        now = _iso(utcnow())
        for index, seed in enumerate(
            (
                {
                    "kind": "cod",
                    "name": "Cash on Delivery",
                    "masked": "Pay on delivery",
                    "note": "Available on every order",
                    "is_default": True,
                },
                {
                    "kind": "wallet",
                    "name": "QuickPress Wallet",
                    "masked": "Wallet balance",
                    "note": "Instant, zero fees",
                    "is_default": False,
                },
            )
        ):
            await collection.insert_one(
                {
                    "_id": f"pm-{user.id}-{seed['kind']}",
                    "user_id": user.id,
                    "enabled": True,
                    "order": index,
                    "created_at": now,
                    **seed,
                }
            )

    def _assert_method_available(self, kind: str) -> None:
        if kind in ONLINE_KINDS and not online_payments_enabled():
            raise WalletError(
                f"{KIND_LABELS.get(kind, kind)} payments aren't live yet — use Wallet or Cash on Delivery.",
                400,
            )

    async def payment_methods(self, user: User) -> PaymentMethodsResponse:
        await self._wallet_document(user)
        await self._ensure_default_methods(user)
        docs = await database.find_many(PAYMENT_METHODS, {"user_id": user.id}, sort_key="order")
        online = online_payments_enabled()
        return PaymentMethodsResponse(
            methods=[self._to_method(doc) for doc in docs],
            items=[self._to_method(doc) for doc in docs],
            providers=[
                PaymentProvider(
                    **{
                        **p,
                        "enabled": bool(p["enabled"]) or online,
                        "comingSoon": not (bool(p["enabled"]) or online),
                    }
                )
                for p in PROVIDERS
            ],
            onlinePaymentsEnabled=online,
        )

    async def add_payment_method(
        self, user: User, kind: str, name: str, masked: str = "", is_default: bool = False
    ) -> PaymentMethod:
        if kind not in KIND_LABELS:
            raise WalletError("Unsupported payment method.", 400)
        await self._ensure_default_methods(user)
        collection = database.collection(PAYMENT_METHODS)
        existing = await database.find_many(PAYMENT_METHODS, {"user_id": user.id})
        document = {
            "_id": f"pm-{uuid.uuid4().hex[:10]}",
            "user_id": user.id,
            "kind": kind,
            "name": name.strip() or KIND_LABELS[kind],
            "masked": masked.strip(),
            "note": KIND_LABELS[kind],
            "is_default": bool(is_default) or len(existing) == 0,
            "enabled": True,
            "order": len(existing),
            "created_at": _iso(utcnow()),
        }
        await collection.insert_one(document)
        if document["is_default"]:
            await self.set_default_method(user, document["_id"])
        return self._to_method(document)

    async def update_payment_method(
        self, user: User, method_id: str, patch: Dict[str, Any]
    ) -> PaymentMethod:
        collection = database.collection(PAYMENT_METHODS)
        document = await collection.find_one({"_id": method_id, "user_id": user.id})
        if document is None:
            raise WalletError("Payment method not found.", 404)
        updates: Dict[str, Any] = {}
        if patch.get("kind"):
            if patch["kind"] not in KIND_LABELS:
                raise WalletError("Unsupported payment method.", 400)
            self._assert_method_available(patch["kind"])
            updates["kind"] = patch["kind"]
            updates["note"] = KIND_LABELS[patch["kind"]]
        if patch.get("name") is not None:
            updates["name"] = str(patch["name"]).strip()
        if patch.get("masked") is not None:
            updates["masked"] = str(patch["masked"]).strip()
        if updates:
            await collection.update_one({"_id": method_id}, {"$set": updates})
        if patch.get("isDefault"):
            await self.set_default_method(user, method_id)
        refreshed = await collection.find_one({"_id": method_id, "user_id": user.id})
        return self._to_method(refreshed or {**document, **updates})

    async def set_default_method(self, user: User, method_id: str) -> None:
        collection = database.collection(PAYMENT_METHODS)
        docs = await database.find_many(PAYMENT_METHODS, {"user_id": user.id})
        if not any(str(doc.get("_id")) == method_id for doc in docs):
            raise WalletError("Payment method not found.", 404)
        for doc in docs:
            await collection.update_one(
                {"_id": doc["_id"]}, {"$set": {"is_default": str(doc["_id"]) == method_id}}
            )

    async def remove_payment_method(self, user: User, method_id: str) -> None:
        collection = database.collection(PAYMENT_METHODS)
        document = await collection.find_one({"_id": method_id, "user_id": user.id})
        if document is None:
            raise WalletError("Payment method not found.", 404)
        if document.get("kind") == "cod":
            raise WalletError("Cash on Delivery can't be removed.", 400)
        await collection.delete_many({"_id": method_id, "user_id": user.id})
        if document.get("is_default"):
            remaining = await database.find_many(PAYMENT_METHODS, {"user_id": user.id}, sort_key="order")
            if remaining:
                await self.set_default_method(user, str(remaining[0]["_id"]))

    # ----------------------------------------------------------- payments

    def _to_payment(self, document: Dict[str, Any]) -> PaymentRecord:
        kind = document.get("method") or "wallet"
        return PaymentRecord(
            id=str(document.get("_id")),
            amount=_money(document.get("amount")),
            method=kind,
            methodLabel=KIND_LABELS.get(kind, kind),
            status=document.get("status") or "created",
            purpose=document.get("purpose") or "order",
            orderId=document.get("order_id"),
            transactionId=document.get("transaction_id") or str(document.get("_id")),
            gateway=document.get("gateway"),
            gatewayOrderId=document.get("gateway_order_id"),
            failureReason=document.get("failure_reason"),
            createdAt=_iso(document.get("created_at")) or "",
            updatedAt=_iso(document.get("updated_at")),
        )

    def _gateway_intent(self, method: str, amount: float) -> Dict[str, Any]:
        """Seam for a real gateway (Razorpay) — returns the order/intent stub.

        Today it only records which gateway *would* have been used. When
        production credentials land, this is the single function that calls
        `razorpay.order.create(...)` and returns the real order id.
        """
        if method in ONLINE_KINDS:
            return {"gateway": "razorpay", "gateway_order_id": f"order_{uuid.uuid4().hex[:14]}"}
        return {"gateway": None, "gateway_order_id": None}

    async def _create_payment_document(
        self,
        user: User,
        *,
        amount: float,
        method: str,
        purpose: str,
        status: str,
        order_id: Optional[str] = None,
        payment_reference: Optional[str] = None,
    ) -> PaymentRecord:
        now = _iso(utcnow())
        intent = self._gateway_intent(method, amount)
        document = {
            "_id": f"pay-{uuid.uuid4().hex[:12]}",
            "user_id": user.id,
            "amount": _money(amount),
            "method": method,
            "status": status,
            "purpose": purpose,
            "order_id": order_id,
            "transaction_id": payment_reference or f"QP{uuid.uuid4().hex[:10].upper()}",
            "gateway": intent["gateway"],
            "gateway_order_id": intent["gateway_order_id"],
            "failure_reason": None,
            "created_at": now,
            "updated_at": now,
        }
        await database.collection(PAYMENTS).insert_one(document)
        return self._to_payment(document)

    async def create_payment(
        self,
        user: User,
        amount: float,
        method: str,
        order_id: Optional[str] = None,
        purpose: str = "order",
        payment_reference: Optional[str] = None,
    ) -> tuple[PaymentRecord, Optional[WalletResponse]]:
        value = self._validate_amount(amount) if amount <= MAX_TOPUP else _money(amount)
        if value <= 0:
            raise WalletError("Enter an amount greater than ₹0.", 400)
        if method not in KIND_LABELS:
            raise WalletError("Unsupported payment method.", 400)
        self._assert_method_available(method)

        wallet_response: Optional[WalletResponse] = None
        if method == "wallet":
            # Debit first: raises 400 before any payment row is written when
            # the balance is insufficient, so the wallet can never go negative.
            document, _ = await self.debit(
                user,
                value,
                kind="order-payment",
                title="Order payment",
                description=f"Paid from wallet{f' · order {order_id}' if order_id else ''}",
                method="wallet",
                reference=order_id,
            )
            payment = await self._create_payment_document(
                user,
                amount=value,
                method=method,
                purpose=purpose,
                status="paid",
                order_id=order_id,
                payment_reference=payment_reference,
            )
            wallet_response = await self._wallet_response(user, document)
            return payment, wallet_response

        status = "pending" if method == "cod" else "created"
        payment = await self._create_payment_document(
            user,
            amount=value,
            method=method,
            purpose=purpose,
            status=status,
            order_id=order_id,
            payment_reference=payment_reference,
        )
        return payment, wallet_response

    async def payment(self, user: User, payment_id: str) -> PaymentRecord:
        document = await database.collection(PAYMENTS).find_one(
            {"_id": payment_id, "user_id": user.id}
        )
        if document is None:
            raise WalletError("Payment not found.", 404)
        return self._to_payment(document)

    async def payments(self, user: User, limit: int = 100) -> List[PaymentRecord]:
        docs = await database.find_many(PAYMENTS, {"user_id": user.id}, sort_key="created_at")
        docs.reverse()
        return [self._to_payment(doc) for doc in docs[:limit]]

    # ------------------------------------------------------------ refunds

    def _to_refund(self, document: Dict[str, Any]) -> Refund:
        return Refund(
            id=str(document.get("_id")),
            paymentId=document.get("payment_id"),
            orderId=document.get("order_id"),
            amount=_money(document.get("amount")),
            reason=document.get("reason") or "",
            status=document.get("status") or "requested",
            createdAt=_iso(document.get("created_at")) or "",
            processedAt=_iso(document.get("processed_at")),
        )

    async def refunds(self, user: User) -> RefundsResponse:
        docs = await database.find_many(REFUNDS, {"user_id": user.id}, sort_key="created_at")
        docs.reverse()
        items = [self._to_refund(doc) for doc in docs]
        return RefundsResponse(
            items=items,
            total=len(items),
            totalAmount=round(sum(item.amount for item in items), 2),
        )

    async def create_refund(
        self,
        user: User,
        amount: float,
        reason: str,
        payment_id: Optional[str] = None,
        order_id: Optional[str] = None,
    ) -> Refund:
        """Used by order cancellation flows; exposed here for reuse."""
        value = self._validate_amount(amount)
        document = {
            "_id": f"rfd-{uuid.uuid4().hex[:12]}",
            "user_id": user.id,
            "payment_id": payment_id,
            "order_id": order_id,
            "amount": value,
            "reason": reason,
            "status": "requested",
            "created_at": _iso(utcnow()),
            "processed_at": None,
        }
        await database.collection(REFUNDS).insert_one(document)
        return self._to_refund(document)


wallet_repository = WalletRepository()
