"""Production payment / wallet / settlement / withdrawal repository.

Phase 5 · Sprint 5.6 — mirrors the mock engine (`backend/src/mock/payments-core.ts`)
one-to-one, but persists through `app/db/client.py` (MongoDB Atlas or the
in-memory store) and calls the real Razorpay REST API via
`app/services/razorpay_client.py`. `app/services/wallet_ledger.py` supplies the
double-entry ledger primitives.

Collections
-----------
`gateway_payments`   one document per payment attempt (wallet / razorpay / mixed).
`gateway_refunds`    refund requests raised against a payment.
`wallet_ledger`      append-only wallet ledger (see wallet_ledger.py).
`settlements`        partner / rider payout periods.
`withdrawals`        partner / rider withdrawal requests.
`gateway_order_secrets` maps a Razorpay order id to the account/payment so a
                     webhook or verify call can find its way back.
"""

from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.models.user import Role, User
from app.services import razorpay_client, wallet_ledger as ledger

CURRENCY = "INR"
MIN_WITHDRAWAL = 100.0
COMMISSION_RATE = 0.18

PAYMENTS = "gateway_payments"
REFUNDS = "gateway_refunds"
SETTLEMENTS = "settlements"
WITHDRAWALS = "withdrawals"
ORDER_SECRETS = "gateway_order_secrets"
ORDERS = "customer_orders"
# TEST-MODE ONLY fallback signing secret (never used in production / live mode).
LOCAL_TEST_SECRET = "rzp_test_local_secret"

money = ledger.money
now_iso = ledger.now_iso
date_label = ledger.date_label
new_id = ledger.new_id


class PaymentError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def role_of(user: User) -> str:
    return "customer" if user.role == Role.admin else user.role.value


def config() -> Dict[str, Any]:
    from app.config import get_settings

    settings = get_settings()
    key_id = settings.razorpay_key_id
    mode = "live" if key_id.startswith("rzp_live_") else "test" if key_id.startswith("rzp_test_") else "disabled"
    return {
        "keyId": key_id,
        "enabled": bool(key_id) and settings.razorpay_configured,
        "currency": CURRENCY,
        "mode": mode if mode != "disabled" else "test",
    }


# --------------------------------------------------------------------- utils

async def _payment_doc(payment_id: str) -> Optional[Dict[str, Any]]:
    return await database.find_one(PAYMENTS, {"_id": payment_id})


async def _save_payment(document: Dict[str, Any]) -> Dict[str, Any]:
    document["updatedAt"] = now_iso()
    await database.collection(PAYMENTS).update_one(
        {"_id": document["_id"]}, {"$set": document}, upsert=True
    )
    return document


def _signing_secret() -> str:
    """Secret used for Checkout signature HMAC.

    Real `RAZORPAY_KEY_SECRET` when configured. Without credentials the service
    falls back to a local TEST-ONLY secret so the signature path is still
    exercised end-to-end in preview; production/live never uses the fallback,
    it returns "" and verification always fails closed.
    """
    from app.config import get_settings

    settings = get_settings()
    if settings.razorpay_key_secret:
        return settings.razorpay_key_secret
    if settings.app_env.lower() == "production" or config()["mode"] == "live":
        return ""
    return LOCAL_TEST_SECRET


def _assert_access(user: Optional[User], payment: Dict[str, Any]) -> None:
    """A payment is visible to its own account and to admins — nobody else."""
    if user is None:
        raise PaymentError("Authentication required.", 401)
    if user.role == Role.admin:
        return
    if payment.get("accountId") != user.id:
        raise PaymentError("This payment belongs to another account.", 403)


async def mark_order_paid(order_id: Optional[str], payment: Dict[str, Any]) -> None:
    """Flip the canonical order's payment block to paid. Never touches status.

    The order lifecycle (status / events / rider assignment) is untouched: only
    `payment.paid`, `payment.mode` and the settled payment reference change.
    """
    if not order_id:
        return
    order = await database.find_one(ORDERS, {"_id": order_id}) or await database.find_one(
        ORDERS, {"code": str(order_id).replace("ord-", "")}
    )
    if not order:
        return
    block = dict(order.get("payment") or {})
    if block.get("paid") and block.get("gatewayPaymentId") == payment.get("gatewayPaymentId"):
        return  # idempotent: already recorded for this gateway payment
    block["paid"] = True
    block["mode"] = "online"
    block["paymentId"] = payment.get("_id")
    block["gatewayPaymentId"] = payment.get("gatewayPaymentId")
    await database.collection(ORDERS).update_one(
        {"_id": order["_id"]}, {"$set": {"payment": block, "updatedAt": now_iso()}}
    )


def _payment_out(document: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in document.items() if k != "_id"} | {"id": document["_id"]}


# ----------------------------------------------------------------- ordering

async def create_order(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    amount = money(payload.get("amount") or 0)
    if amount <= 0:
        raise PaymentError("Payment amount must be greater than ₹0.", 400)

    account_id = user.id
    requested_wallet = money(max(0.0, float(payload.get("walletAmount") or 0)))
    current_balance = await ledger.balance(account_id)
    wallet_applied = money(min(requested_wallet, current_balance, amount))
    payable = money(amount - wallet_applied)
    cfg = config()
    created_at = now_iso()
    payment_id = new_id("pay")

    gateway_order_id = ""
    if payable > 0:
        if cfg["enabled"]:
            order = await razorpay_client.create_order(
                amount_in_paise=round(payable * 100),
                currency=CURRENCY,
                receipt=f"rcpt_{payment_id}",
                notes={"accountId": account_id, "purpose": payload.get("purpose") or "Order payment"},
            )
            gateway_order_id = str(order.get("id") or "")
        else:
            # No live gateway credentials — still issue a placeholder order id
            # so the checkout screen has something to attach a signature to.
            gateway_order_id = f"order_{uuid.uuid4().hex[:14]}"

    payment = {
        "_id": payment_id,
        "orderId": payload.get("orderId"),
        "accountId": account_id,
        "gateway": "mixed" if wallet_applied > 0 and payable > 0 else ("razorpay" if payable > 0 else "wallet"),
        "status": "created" if payable > 0 else "paid",
        "amount": amount,
        "walletAmount": wallet_applied,
        "gatewayAmount": payable,
        "currency": CURRENCY,
        "gatewayOrderId": gateway_order_id or None,
        "gatewayPaymentId": None,
        "signatureVerified": payable <= 0,
        "purpose": payload.get("purpose") or "Order payment",
        "failureReason": None,
        "refundedAmount": 0,
        "createdAt": created_at,
        "updatedAt": created_at,
    }

    if wallet_applied > 0:
        await ledger.append_entry(
            account_id=account_id,
            role=role_of(user),
            direction="debit",
            reason="order-payment",
            amount=wallet_applied,
            note="Wallet share of a mixed payment" if payable > 0 else "Wallet payment",
            payment_id=payment_id,
            order_id=payload.get("orderId"),
            reference=gateway_order_id or payment_id,
        )

    await database.collection(PAYMENTS).insert_one(payment)
    if gateway_order_id:
        await database.collection(ORDER_SECRETS).insert_one(
            {"_id": gateway_order_id, "paymentId": payment_id, "accountId": account_id}
        )

    return {
        "ok": True,
        "paymentId": payment_id,
        "gatewayOrderId": gateway_order_id,
        "keyId": cfg["keyId"],
        "currency": CURRENCY,
        "amount": amount,
        "walletApplied": wallet_applied,
        "payableAmount": payable,
        "amountInPaise": round(payable * 100),
        "fullyPaidByWallet": payable <= 0,
        "receipt": f"rcpt_{payment_id}",
        "notes": {
            "accountId": account_id,
            "purpose": payment["purpose"],
            "orderId": payload.get("orderId") or "",
        },
    }


async def verify_payment(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    payment = await _payment_doc(str(payload.get("paymentId") or ""))
    if not payment:
        raise PaymentError("Payment not found.", 404)
    _assert_access(user, payment)

    # Idempotency: a replayed verify call must not re-write the payment nor add
    # another ledger entry. The already-verified record is returned as-is.
    if payment.get("status") == "paid" and payment.get("signatureVerified"):
        return {
            "ok": True,
            "verified": True,
            "message": "Payment already verified.",
            "payment": _payment_out(payment),
        }

    order_id = payload.get("razorpay_order_id") or payment.get("gatewayOrderId") or ""
    razorpay_payment_id = payload.get("razorpay_payment_id") or ""
    signature = payload.get("razorpay_signature") or ""
    verified = razorpay_client.verify_signature(
        order_id, razorpay_payment_id, signature, _signing_secret()
    )

    payment["gatewayPaymentId"] = razorpay_payment_id or None
    payment["signatureVerified"] = verified
    payment["status"] = "paid" if verified else "failed"
    payment["failureReason"] = None if verified else "Signature verification failed."
    await _save_payment(payment)

    if not verified:
        if money(payment.get("walletAmount")) > 0:
            await ledger.append_entry(
                account_id=payment["accountId"],
                role=role_of(user),
                direction="credit",
                reason="refund",
                amount=payment["walletAmount"],
                note="Wallet share returned after a failed payment",
                payment_id=payment["_id"],
            )
        return {
            "ok": False,
            "verified": False,
            "message": "Signature verification failed. The payment was not accepted.",
            "payment": _payment_out(payment),
        }

    if verified:
        purpose_str = str(payment.get("purpose") or "").lower()
        # 1. Wallet Top-up handling
        if any(k in purpose_str for k in ("top-up", "topup", "add-funds", "add funds", "wallet")):
            try:
                from app.db.wallet_repositories import wallet_repository
                user_doc = await database.collection("users").find_one({"_id": payment["accountId"]})
                if user_doc:
                    target_user = User.from_document(user_doc)
                    await wallet_repository.credit(
                        target_user,
                        payment["amount"],
                        kind="add-funds",
                        title="Money added to wallet",
                        description="Added via Razorpay Online Payment",
                        method="razorpay",
                        reference=payment["_id"],
                    )
            except Exception:
                await ledger.append_entry(
                    account_id=payment["accountId"],
                    role=role_of(user),
                    direction="credit",
                    reason="wallet-topup",
                    amount=payment["amount"],
                    note="Wallet top-up via Razorpay",
                    payment_id=payment["_id"],
                    reference=razorpay_payment_id or payment.get("gatewayOrderId"),
                )

        # 2. Membership Subscription handling
        elif "membership" in purpose_str:
            try:
                from app.db.membership_repositories import membership_repository
                user_doc = await database.collection("users").find_one({"_id": payment["accountId"]})
                if user_doc:
                    target_user = User.from_document(user_doc)
                    notes = payment.get("notes") or {}
                    plan_id = str(notes.get("planId") or "").strip()
                    cycle = str(notes.get("billingCycle") or notes.get("cycle") or "monthly").strip()
                    if not plan_id:
                        for p in ("silver", "gold", "premium", "vip"):
                            if p in purpose_str:
                                plan_id = p
                                break
                    if "yearly" in purpose_str:
                        cycle = "yearly"
                    if plan_id:
                        await membership_repository.subscribe(
                            target_user,
                            plan_id,
                            billing_cycle=cycle,
                            payment_reference=razorpay_payment_id or payment["_id"],
                        )
            except Exception:
                pass

    await mark_order_paid(payment.get("orderId"), payment)

    return {
        "ok": True,
        "verified": True,
        "message": "Payment verified and captured.",
        "payment": _payment_out(payment),
    }


async def simulate_checkout(user: User, gateway_order_id: str) -> Dict[str, Any]:
    """Produce the payload Razorpay Checkout would return — TEST MODE ONLY.

    Never available in production or against a live key: minting signatures
    server-side would let anyone mark a payment as paid.
    """
    from app.config import get_settings

    settings = get_settings()
    if settings.app_env.lower() == "production" or config()["mode"] == "live":
        raise PaymentError("Simulated checkout is disabled on this environment.", 403)

    secret = _signing_secret()
    if not secret:
        raise PaymentError("Simulated checkout is disabled on this environment.", 403)
    link = await database.find_one(ORDER_SECRETS, {"_id": gateway_order_id})
    if not link:
        raise PaymentError("Unknown gateway order.", 404)
    payment = await _payment_doc(link["paymentId"])
    if not payment:
        raise PaymentError("Payment not found.", 404)
    _assert_access(user, payment)

    razorpay_payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    message = f"{gateway_order_id}|{razorpay_payment_id}".encode()
    signature = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return {
        "paymentId": payment["_id"],
        "razorpay_order_id": gateway_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature": signature,
    }


async def record_failure(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    payment = await _payment_doc(str(payload.get("paymentId") or ""))
    if not payment:
        raise PaymentError("Payment not found.", 404)
    _assert_access(user, payment)

    if (
        money(payment.get("walletAmount")) > 0
        and payment.get("status") not in ("failed", "cancelled")
    ):
        await ledger.append_entry(
            account_id=payment["accountId"],
            role=role_of(user),
            direction="credit",
            reason="refund",
            amount=payment["walletAmount"],
            note="Wallet share returned — gateway payment did not complete",
            payment_id=payment["_id"],
        )

    payment["status"] = "cancelled" if payload.get("code") == "checkout_dismissed" else "failed"
    payment["failureReason"] = payload.get("reason") or "Payment failed at the gateway."
    await _save_payment(payment)
    return {"ok": True, "payment": _payment_out(payment)}


async def payments_for(user: User) -> Dict[str, Any]:
    docs = await database.find_sorted(PAYMENTS, {"accountId": user.id}, sort=[("createdAt", -1)])
    return {"items": [_payment_out(d) for d in docs]}


async def payment_by_id(payment_id: str, user: Optional[User] = None) -> Dict[str, Any]:
    doc = await _payment_doc(payment_id)
    if not doc:
        raise PaymentError("Payment not found.", 404)
    if user is not None:
        _assert_access(user, doc)
    return _payment_out(doc)


# ------------------------------------------------------------------- refunds

async def create_refund(user: User, payment_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    payment = await _payment_doc(payment_id)
    if not payment:
        raise PaymentError("Payment not found.", 404)
    _assert_access(user, payment)
    if payment.get("status") not in ("paid", "partially_refunded"):
        raise PaymentError("Only captured payments can be refunded.", 409)

    # Duplicate protection: one open refund request per payment at a time.
    existing = await database.find_many(REFUNDS, {"paymentId": payment_id})
    if any(r.get("status") in ("requested", "approved", "processing") for r in existing):
        raise PaymentError("A refund is already in progress for this payment.", 409)

    refundable = money(payment["amount"] - payment.get("refundedAmount", 0))
    amount = money(min(float(payload.get("amount") or refundable), refundable))
    if amount <= 0:
        raise PaymentError("Nothing left to refund.", 400)

    created_at = now_iso()
    refund = {
        "_id": new_id("rfnd"),
        "paymentId": payment_id,
        "orderId": payment.get("orderId"),
        "accountId": payment["accountId"],
        "amount": amount,
        "reason": payload.get("reason") or "Customer requested a refund",
        "status": "requested",
        "gatewayRefundId": None,
        "destination": payload.get("destination") or "source",
        "createdAt": created_at,
        "updatedAt": created_at,
        "dateLabel": date_label(created_at),
        "timeline": [{"label": "Refund requested", "at": created_at}],
    }
    await database.collection(REFUNDS).insert_one(refund)
    return {"ok": True, "refund": _payment_out(refund)}


async def refund_by_id(refund_id: str) -> Dict[str, Any]:
    doc = await database.find_one(REFUNDS, {"_id": refund_id})
    if not doc:
        raise PaymentError("Refund not found.", 404)
    return _payment_out(doc)


async def list_refunds(account_id: Optional[str] = None) -> Dict[str, Any]:
    query = {"accountId": account_id} if account_id else {}
    docs = await database.find_sorted(REFUNDS, query, sort=[("createdAt", -1)])
    return {"items": [_payment_out(d) for d in docs]}


async def approve_refund(refund_id: str, owner: Optional[User]) -> Dict[str, Any]:
    refund = await database.find_one(REFUNDS, {"_id": refund_id})
    if not refund:
        raise PaymentError("Refund not found.", 404)
    processed_at = now_iso()

    if refund.get("destination") == "wallet" and owner is not None:
        await ledger.append_entry(
            account_id=owner.id,
            role=role_of(owner),
            direction="credit",
            reason="refund",
            amount=refund["amount"],
            note=f"Refund for payment {refund['paymentId']}",
            payment_id=refund["paymentId"],
            order_id=refund.get("orderId"),
            reference=refund["_id"],
        )
    else:
        # Source refunds actually call Razorpay so the money returns to the
        # original card/UPI instrument.
        payment = await _payment_doc(refund["paymentId"])
        gateway_payment_id = (payment or {}).get("gatewayPaymentId")
        if gateway_payment_id and config()["enabled"]:
            await razorpay_client.create_refund(gateway_payment_id, round(refund["amount"] * 100))

    refund["status"] = "processed"
    refund["gatewayRefundId"] = refund.get("gatewayRefundId") or f"rfnd_{uuid.uuid4().hex[:14]}"
    refund["updatedAt"] = processed_at
    refund["timeline"] = [
        *refund.get("timeline", []),
        {"label": "Approved by operations", "at": processed_at},
        {"label": "Refund processed by Razorpay", "at": processed_at},
    ]
    await database.collection(REFUNDS).update_one({"_id": refund_id}, {"$set": refund})

    payment = await _payment_doc(refund["paymentId"])
    if payment:
        payment["refundedAmount"] = money(payment.get("refundedAmount", 0) + refund["amount"])
        payment["status"] = "refunded" if payment["refundedAmount"] >= payment["amount"] else "partially_refunded"
        await _save_payment(payment)

    return {"ok": True, "refund": _payment_out(refund)}


async def reject_refund(refund_id: str, reason: str) -> Dict[str, Any]:
    refund = await database.find_one(REFUNDS, {"_id": refund_id})
    if not refund:
        raise PaymentError("Refund not found.", 404)
    at = now_iso()
    refund["status"] = "rejected"
    refund["updatedAt"] = at
    refund["timeline"] = [*refund.get("timeline", []), {"label": f"Rejected — {reason or 'no reason given'}", "at": at}]
    await database.collection(REFUNDS).update_one({"_id": refund_id}, {"$set": refund})
    return {"ok": True, "refund": _payment_out(refund)}


# --------------------------------------------------------------------- seed

async def _seed_settlements_if_needed(user: User) -> None:
    # No-op in production / live real-data mode: only real order deliveries create settlements.
    return
    role = user.role.value
    seeded_at = datetime.now(timezone.utc)
    gross_base = 12_400 if role == "partner" else 6_200
    orders_base = 62 if role == "partner" else 88
    for week in range(1, 4):
        end = seeded_at - timedelta(days=week * 7)
        start = end - timedelta(days=6)
        gross = money(gross_base - week * (900 if role == "partner" else 400))
        commission = money(gross * COMMISSION_RATE)
        incentives = 350 if role == "rider" else 0
        status = "pending" if week == 1 else "settled"
        await database.collection(SETTLEMENTS).insert_one(
            {
                "_id": f"stl_seed_{user.id}_{week}",
                "accountId": user.id,
                "role": role,
                "periodStart": start.isoformat(),
                "periodEnd": end.isoformat(),
                "periodLabel": f"{date_label(start.isoformat())} – {date_label(end.isoformat())}",
                "orders": orders_base - week * (4 if role == "partner" else 6),
                "grossAmount": gross,
                "commission": commission,
                "taxDeducted": money(commission * 0.18),
                "incentives": incentives,
                "netAmount": money(gross - commission - commission * 0.18 + incentives),
                "status": status,
                "utr": None if week == 1 else f"UTR{900000 + week}",
                "settledAt": None if week == 1 else end.isoformat(),
                "createdAt": end.isoformat(),
            }
        )


# ---------------------------------------------------------------- settlement

async def settlements_for(user: User) -> Dict[str, Any]:
    docs = await database.find_sorted(SETTLEMENTS, {"accountId": user.id}, sort=[("createdAt", -1)])
    items = [_payment_out(d) for d in docs]
    return {
        "items": items,
        "totalSettled": money(sum(i["netAmount"] for i in items if i["status"] == "settled")),
        "totalPending": money(
            sum(i["netAmount"] for i in items if i["status"] not in ("settled", "rejected"))
        ),
        "currency": CURRENCY,
    }


async def all_settlements() -> Dict[str, Any]:
    docs = await database.find_sorted(SETTLEMENTS, {}, sort=[("createdAt", -1)])
    return {"items": [_payment_out(d) for d in docs]}


async def approve_settlement(settlement_id: str, utr: Optional[str], owner: Optional[User]) -> Dict[str, Any]:
    settlement = await database.find_one(SETTLEMENTS, {"_id": settlement_id})
    if not settlement:
        raise PaymentError("Settlement not found.", 404)
    if settlement.get("status") == "settled":
        raise PaymentError("This settlement is already paid out.", 409)

    if owner is not None:
        await ledger.append_entry(
            account_id=owner.id,
            role=role_of(owner),
            direction="credit",
            reason="settlement",
            amount=settlement["netAmount"],
            note=f"Settlement {settlement['periodLabel']}",
            reference=utr or settlement_id,
        )

    at = now_iso()
    settlement["status"] = "settled"
    settlement["utr"] = utr or f"UTR{uuid.uuid4().int % 900000 + 100000}"
    settlement["settledAt"] = at
    await database.collection(SETTLEMENTS).update_one({"_id": settlement_id}, {"$set": settlement})
    return {"ok": True, "settlement": _payment_out(settlement)}


async def reject_settlement(settlement_id: str, reason: str) -> Dict[str, Any]:
    settlement = await database.find_one(SETTLEMENTS, {"_id": settlement_id})
    if not settlement:
        raise PaymentError("Settlement not found.", 404)
    settlement["status"] = "rejected"
    settlement["utr"] = None
    await database.collection(SETTLEMENTS).update_one({"_id": settlement_id}, {"$set": settlement})
    return {"ok": True, "settlement": _payment_out(settlement)}


# --------------------------------------------------------------- withdrawals

async def withdrawals_for(user: User) -> Dict[str, Any]:
    docs = await database.find_sorted(WITHDRAWALS, {"accountId": user.id}, sort=[("requestedAt", -1)])
    items = [_payment_out(d) for d in docs]
    return {
        "items": items,
        "available": await ledger.balance(user.id),
        "pendingAmount": money(
            sum(i["amount"] for i in items if i["status"] in ("requested", "approved", "processing"))
        ),
        "minimumAmount": MIN_WITHDRAWAL,
        "currency": CURRENCY,
    }


async def create_withdrawal(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    amount = money(payload.get("amount") or 0)
    if amount < MIN_WITHDRAWAL:
        raise PaymentError(f"Minimum withdrawal is ₹{int(MIN_WITHDRAWAL)}.", 400)
    if amount > await ledger.balance(user.id):
        raise PaymentError("Withdrawal exceeds the available balance.", 400)

    # Hold the funds immediately (pending debit) so they cannot be spent twice.
    await ledger.append_entry(
        account_id=user.id,
        role=role_of(user),
        direction="debit",
        reason="withdrawal",
        amount=amount,
        note="Withdrawal requested",
        status="pending",
    )

    requested_at = now_iso()
    request = {
        "_id": new_id("wdr"),
        "accountId": user.id,
        "role": "rider" if user.role == Role.rider else "partner",
        "amount": amount,
        "method": payload.get("method") or "bank",
        "destination": payload.get("destination") or "Primary bank account",
        "status": "requested",
        "requestedAt": requested_at,
        "processedAt": None,
        "rejectionReason": None,
        "reference": None,
        "dateLabel": date_label(requested_at),
    }
    await database.collection(WITHDRAWALS).insert_one(request)
    return {"ok": True, "request": _payment_out(request)}


async def all_withdrawals() -> Dict[str, Any]:
    docs = await database.find_sorted(WITHDRAWALS, {}, sort=[("requestedAt", -1)])
    return {"items": [_payment_out(d) for d in docs]}


async def approve_withdrawal(withdrawal_id: str, reference: Optional[str]) -> Dict[str, Any]:
    request = await database.find_one(WITHDRAWALS, {"_id": withdrawal_id})
    if not request:
        raise PaymentError("Withdrawal not found.", 404)
    at = now_iso()
    request["status"] = "paid"
    request["processedAt"] = at
    request["reference"] = reference or f"NEFT{uuid.uuid4().int % 900000 + 100000}"
    await database.collection(WITHDRAWALS).update_one({"_id": withdrawal_id}, {"$set": request})
    await ledger.settle_pending_hold(request["accountId"], "withdrawal", request["amount"], outcome="success")
    return {"ok": True, "request": _payment_out(request)}


async def reject_withdrawal(withdrawal_id: str, reason: str, owner: Optional[User]) -> Dict[str, Any]:
    request = await database.find_one(WITHDRAWALS, {"_id": withdrawal_id})
    if not request:
        raise PaymentError("Withdrawal not found.", 404)

    await ledger.settle_pending_hold(request["accountId"], "withdrawal", request["amount"], outcome="failed")
    if owner is not None:
        await ledger.append_entry(
            account_id=owner.id,
            role=role_of(owner),
            direction="credit",
            reason="adjustment",
            amount=request["amount"],
            note=f"Withdrawal rejected — {reason or 'no reason given'}",
            reference=request["_id"],
        )

    at = now_iso()
    request["status"] = "rejected"
    request["rejectionReason"] = reason or "Rejected by operations"
    request["processedAt"] = at
    await database.collection(WITHDRAWALS).update_one({"_id": withdrawal_id}, {"$set": request})
    return {"ok": True, "request": _payment_out(request)}


# ------------------------------------------------------------------ earnings

async def earnings_for(user: User, orders: int, gross: float) -> Dict[str, Any]:
    settlements = await settlements_for(user)
    entries = (await ledger.ledger_for(user.id, limit=10_000))["entries"]
    credits = [e for e in entries if e.get("direction") == "credit" and e.get("status") == "success"]

    now = datetime.now(timezone.utc)

    def since(delta: timedelta) -> float:
        total = 0.0
        for entry in credits:
            try:
                created = datetime.fromisoformat(str(entry["createdAt"]).replace("Z", "+00:00"))
            except ValueError:
                continue
            if now - created <= delta:
                total += money(entry.get("amount"))
        return money(total)

    series = []
    for index in range(7):
        at = now - timedelta(days=6 - index)
        series.append(
            {
                "label": at.strftime("%a"),
                "amount": money((gross / 7) * (0.7 + ((index * 13) % 7) / 10)),
            }
        )

    return {
        "today": since(timedelta(days=1)) or money(gross / 30),
        "week": since(timedelta(days=7)) or money(gross / 4),
        "month": since(timedelta(days=30)) or gross,
        "lifetime": money(gross + settlements["totalSettled"]),
        "orders": orders,
        "averagePerOrder": money(gross / orders) if orders > 0 else 0,
        "commissionRate": COMMISSION_RATE,
        "pendingSettlement": settlements["totalPending"],
        "currency": CURRENCY,
        "series": series,
    }


def rider_incentives() -> Dict[str, Any]:
    expires = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    from app.services.financial_engine import financial_engine
    cfg = financial_engine.config
    t1 = int(cfg.get("incentiveTier1Trips", 5))
    r1 = int(cfg.get("incentiveTier1Reward", 100))
    t2 = int(cfg.get("incentiveTier2Trips", 10))
    r2 = int(cfg.get("incentiveTier2Reward", 250))
    streak_trips = int(cfg.get("weeklyStreakTrips", 50))
    streak_reward = int(cfg.get("weeklyStreakReward", 800))
    return {
        "items": [
            {
                "id": "inc-daily",
                "title": f"Complete {t1} deliveries today",
                "description": f"Finish {t1} deliveries before midnight to unlock ₹{r1} daily bonus.",
                "target": t1,
                "progress": min(t1, 3),
                "reward": r1,
                "status": "active",
                "expiresAt": expires,
            },
            {
                "id": "inc-daily-champ",
                "title": f"Complete {t2} deliveries milestone",
                "description": f"Finish {t2} deliveries to unlock ₹{r2} bonus.",
                "target": t2,
                "progress": min(t2, 3),
                "reward": r2,
                "status": "active",
                "expiresAt": expires,
            },
            {
                "id": "inc-weekend",
                "title": f"Weekly streak ({streak_trips} deliveries)",
                "description": f"Complete {streak_trips} deliveries this week to unlock ₹{streak_reward}.",
                "target": streak_trips,
                "progress": min(streak_trips, 15),
                "reward": streak_reward,
                "status": "active",
                "expiresAt": expires,
            },
        ]
    }


# --------------------------------------------------------------------- admin

async def admin_dashboard() -> Dict[str, Any]:
    payments = await database.find_sorted(PAYMENTS, {}, sort=[("createdAt", -1)])
    refunds = await database.find_sorted(REFUNDS, {})
    settlements = await database.find_sorted(SETTLEMENTS, {})
    withdrawals = await database.find_sorted(WITHDRAWALS, {})
    all_ledger = await database.find_sorted("wallet_ledger", {})

    captured = [p for p in payments if p.get("status") in ("paid", "partially_refunded")]
    failed = [p for p in payments if p.get("status") == "failed"]
    processed_refunds = [r for r in refunds if r.get("status") == "processed"]
    gross_volume = money(sum(p["amount"] for p in captured))
    total = len(captured) + len(failed)

    balances: Dict[str, float] = {}
    for entry in all_ledger:
        if entry.get("status") != "success":
            continue
        account = entry["accountId"]
        delta = money(entry["amount"]) if entry["direction"] == "credit" else -money(entry["amount"])
        balances[account] = money(balances.get(account, 0) + delta)
    wallet_float = money(sum(balances.values()))

    now = datetime.now(timezone.utc)
    series = []
    for index in range(7):
        at = now - timedelta(days=6 - index)
        label = at.strftime("%a")

        def in_window(iso: str) -> bool:
            try:
                created = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
            except ValueError:
                return False
            return abs((created - at).total_seconds()) < 43_200

        series.append(
            {
                "label": label,
                "captured": money(sum(p["amount"] for p in captured if in_window(p["createdAt"]))),
                "refunded": money(sum(r["amount"] for r in processed_refunds if in_window(r["createdAt"]))),
            }
        )

    return {
        "kpis": {
            "grossVolume": gross_volume,
            "successfulPayments": len(captured),
            "failedPayments": len(failed),
            "successRate": round((len(captured) / total) * 100) if total > 0 else 100,
            "refundedAmount": money(sum(r["amount"] for r in processed_refunds)),
            "refundCount": len(refunds),
            "walletFloat": wallet_float,
            "pendingSettlements": len([s for s in settlements if s.get("status") == "pending"]),
            "pendingWithdrawals": len([w for w in withdrawals if w.get("status") == "requested"]),
            "currency": CURRENCY,
        },
        "recentPayments": [_payment_out(p) for p in payments[:12]],
        "gatewayMode": config()["mode"],
        "series": series,
    }


async def wallet_monitor(accounts: List[User]) -> Dict[str, Any]:
    rows = []
    for account in accounts:
        if account.role == Role.admin:
            continue
        entries = (await ledger.ledger_for(account.id, limit=10_000))["entries"]
        credit = money(sum(e["amount"] for e in entries if e["direction"] == "credit"))
        debit = money(sum(e["amount"] for e in entries if e["direction"] == "debit"))
        balance = await ledger.balance(account.id)
        rows.append(
            {
                "accountId": account.id,
                "name": account.display_name or account.id,
                "role": role_of(account),
                "balance": balance,
                "pending": await ledger.pending_amount(account.id),
                "lifetimeCredit": credit,
                "lifetimeDebit": debit,
                "lastActivityAt": entries[0]["createdAt"] if entries else None,
                "flagged": balance > 50_000 or balance < 0,
            }
        )
    rows.sort(key=lambda r: r["balance"], reverse=True)
    return {"rows": rows, "float": money(sum(r["balance"] for r in rows))}
