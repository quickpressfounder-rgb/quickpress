"""Cashfree Payments Service for QuickPress.

Implements end-to-end Cashfree PG v2023-08-01 flows:
- Order & In-App Payment Session Creation
- Double-Entry Wallet + Gateway Mixed Payments
- Server-to-Server Payment Verification
- Live Payment Status Tracking & 1-Tap Retry
- Webhook Handling with HMAC-SHA256 Signature Verification & Idempotency
- Full & Partial Refunds via Cashfree API
- Dual-Layer Persistence in Supabase (Relational public.payments & Document store)
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.db.client import database
from app.models.user import Role, User
from app.services import cashfree_client
from app.services import wallet_ledger as ledger

logger = logging.getLogger(__name__)

CURRENCY = "INR"
PAYMENTS_COLL = "gateway_payments"
REFUNDS_COLL = "gateway_refunds"
ORDERS_COLL = "customer_orders"
SECRETS_COLL = "gateway_order_secrets"
WEBHOOK_EVENTS_COLL = "processed_webhook_events"


class CashfreePaymentServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_phone(phone: str) -> str:
    clean = "".join(filter(str.isdigit, phone))
    if len(clean) > 10 and clean.startswith("91"):
        clean = clean[2:]
    return clean if len(clean) >= 10 else "9999999999"


async def get_payment_config() -> Dict[str, Any]:
    """Returns publishable configuration for the frontend."""
    settings = get_settings()
    return {
        "appId": settings.cashfree_app_id,
        "env": "PROD" if settings.cashfree_is_production else "SANDBOX",
        "apiVersion": settings.cashfree_api_version or "2023-08-01",
        "enabled": settings.cashfree_configured,
        "currency": CURRENCY,
    }


async def _persist_payment_relational(payment_doc: Dict[str, Any]) -> None:
    """Save or update payment record in public.payments relational table in Supabase."""
    if not database._supabase:
        return
    try:
        pool = await database._supabase.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO public.payments (
                    id, order_id, user_id, gateway, gateway_order_id, payment_session_id,
                    amount, currency, status, payment_method, cf_payment_id, bank_reference,
                    failure_reason, refunded_amount, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
                )
                ON CONFLICT (gateway_order_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    payment_session_id = COALESCE(EXCLUDED.payment_session_id, public.payments.payment_session_id),
                    payment_method = COALESCE(EXCLUDED.payment_method, public.payments.payment_method),
                    cf_payment_id = COALESCE(EXCLUDED.cf_payment_id, public.payments.cf_payment_id),
                    bank_reference = COALESCE(EXCLUDED.bank_reference, public.payments.bank_reference),
                    failure_reason = COALESCE(EXCLUDED.failure_reason, public.payments.failure_reason),
                    refunded_amount = COALESCE(EXCLUDED.refunded_amount, public.payments.refunded_amount),
                    updated_at = NOW();
                """,
                payment_doc["_id"],
                payment_doc.get("orderId") or "",
                payment_doc["accountId"],
                payment_doc.get("gateway", "cashfree"),
                payment_doc.get("gatewayOrderId") or payment_doc["_id"],
                payment_doc.get("paymentSessionId"),
                float(payment_doc.get("amount", 0)),
                payment_doc.get("currency", "INR"),
                str(payment_doc.get("status", "PENDING")).upper(),
                json.dumps(payment_doc.get("paymentMethod") or {}),
                payment_doc.get("cfPaymentId") or payment_doc.get("gatewayPaymentId"),
                payment_doc.get("bankReference"),
                payment_doc.get("failureReason"),
                float(payment_doc.get("refundedAmount", 0)),
            )
    except Exception as exc:
        logger.warning("Failed to persist relational payment: %s", exc)


async def create_cashfree_order(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create a Cashfree payment session for checkout or wallet topup."""
    amount = ledger.money(payload.get("amount") or 0)
    if amount <= 0:
        raise CashfreePaymentServiceError("Payment amount must be greater than ₹0.", 400)

    account_id = user.id
    order_id = payload.get("orderId")
    if not order_id:
        order_id = f"qp_ord_{uuid.uuid4().hex[:12]}"

    requested_wallet = ledger.money(max(0.0, float(payload.get("walletAmount") or 0)))
    current_balance = await ledger.balance(account_id)
    wallet_applied = ledger.money(min(requested_wallet, current_balance, amount))
    payable = ledger.money(amount - wallet_applied)

    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    created_at = _now_iso()

    # 1. If fully paid by QuickPress Wallet
    if payable <= 0:
        await ledger.append_entry(
            account_id=account_id,
            role="customer" if user.role == Role.admin else user.role.value,
            direction="debit",
            reason="order-payment",
            amount=wallet_applied,
            note="Full order payment via QuickPress Wallet",
            payment_id=payment_id,
            order_id=order_id,
            reference=payment_id,
        )

        payment_doc = {
            "_id": payment_id,
            "id": payment_id,
            "orderId": order_id,
            "accountId": account_id,
            "gateway": "wallet",
            "status": "paid",
            "amount": amount,
            "walletAmount": wallet_applied,
            "gatewayAmount": 0.0,
            "currency": CURRENCY,
            "gatewayOrderId": payment_id,
            "gatewayPaymentId": payment_id,
            "signatureVerified": True,
            "purpose": payload.get("purpose") or "Order payment",
            "failureReason": None,
            "refundedAmount": 0,
            "createdAt": created_at,
            "updatedAt": created_at,
        }
        await database.collection(PAYMENTS_COLL).insert_one(payment_doc)
        await _persist_payment_relational(payment_doc)

        # Mark order paid & promote to pending_partner_acceptance
        await _mark_order_paid(
            order_id=order_id,
            gateway="wallet",
            payment_id=payment_id,
            cf_payment_id=payment_id,
            bank_reference="WALLET",
        )

        return {
            "ok": True,
            "paymentId": payment_id,
            "orderId": order_id,
            "cfOrderId": None,
            "paymentSessionId": None,
            "amount": amount,
            "walletApplied": wallet_applied,
            "payableAmount": 0.0,
            "fullyPaidByWallet": True,
            "currency": CURRENCY,
            "env": "PROD" if get_settings().cashfree_is_production else "SANDBOX",
            "customerDetails": {
                "customerId": account_id,
                "customerPhone": user.phone or "",
                "customerName": getattr(user, "display_name", None) or getattr(user, "name", None) or "",
            },
        }

    # 2. Online Payment via Cashfree PG
    cf_order_id = f"cf_{order_id}_{uuid.uuid4().hex[:6]}"
    customer_phone = payload.get("customerPhone") or user.phone or "9999999999"
    customer_name = payload.get("customerName") or getattr(user, "display_name", None) or getattr(user, "name", None) or "QuickPress Customer"
    customer_email = payload.get("customerEmail") or user.email or f"{user.id}@quickpress.online"
    return_url = payload.get("returnUrl")

    settings = get_settings()
    notify_url = None
    if settings.app_env.lower() == "production":
        notify_url = "https://quickpress-api-production.up.railway.app/api/payments/cashfree/webhook"

    cf_order_resp = await cashfree_client.create_order(
        order_id=cf_order_id,
        order_amount=payable,
        order_currency=CURRENCY,
        customer_id=account_id,
        customer_phone=customer_phone,
        customer_email=customer_email,
        customer_name=customer_name,
        order_note=payload.get("purpose") or f"QuickPress Order {order_id}",
        return_url=return_url,
        notify_url=notify_url,
    )

    payment_session_id = cf_order_resp.get("payment_session_id")
    cf_returned_order_id = cf_order_resp.get("cf_order_id")

    payment_doc = {
        "_id": payment_id,
        "id": payment_id,
        "orderId": order_id,
        "accountId": account_id,
        "gateway": "mixed" if wallet_applied > 0 else "cashfree",
        "status": "created",
        "amount": amount,
        "walletAmount": wallet_applied,
        "gatewayAmount": payable,
        "currency": CURRENCY,
        "gatewayOrderId": cf_order_id,
        "cfOrderId": cf_order_id,
        "cfOrderIdInternal": cf_returned_order_id,
        "paymentSessionId": payment_session_id,
        "gatewayPaymentId": None,
        "signatureVerified": False,
        "purpose": payload.get("purpose") or "Order payment",
        "failureReason": None,
        "refundedAmount": 0,
        "createdAt": created_at,
        "updatedAt": created_at,
    }

    if wallet_applied > 0:
        await ledger.append_entry(
            account_id=account_id,
            role="customer" if user.role == Role.admin else user.role.value,
            direction="debit",
            reason="order-payment",
            amount=wallet_applied,
            note="Wallet hold for mixed Cashfree payment",
            payment_id=payment_id,
            order_id=order_id,
            reference=cf_order_id,
        )

    await database.collection(PAYMENTS_COLL).insert_one(payment_doc)
    await database.collection(SECRETS_COLL).insert_one(
        {"_id": cf_order_id, "paymentId": payment_id, "accountId": account_id, "orderId": order_id}
    )
    await _persist_payment_relational(payment_doc)

    # Attach pending payment info to order in customer_orders
    order = await database.find_one(ORDERS_COLL, {"_id": order_id}) or await database.find_one(
        ORDERS_COLL, {"code": str(order_id).replace("ord-", "")}
    )
    if order:
        pm_block = dict(order.get("payment") or {})
        pm_block["gateway"] = "cashfree"
        pm_block["mode"] = "online"
        pm_block["status"] = "PENDING"
        pm_block["paid"] = False
        pm_block["cfOrderId"] = cf_order_id
        pm_block["paymentSessionId"] = payment_session_id
        await database.collection(ORDERS_COLL).update_one(
            {"_id": order["_id"]},
            {"$set": {"payment": pm_block, "updatedAt": _now_iso()}},
        )

    return {
        "ok": True,
        "paymentId": payment_id,
        "orderId": order_id,
        "cfOrderId": cf_order_id,
        "paymentSessionId": payment_session_id,
        "amount": amount,
        "walletApplied": wallet_applied,
        "payableAmount": payable,
        "fullyPaidByWallet": False,
        "currency": CURRENCY,
        "env": "PROD" if settings.cashfree_is_production else "SANDBOX",
        "customerDetails": {
            "customerId": account_id,
            "customerPhone": _sanitize_phone(customer_phone),
            "customerName": customer_name,
        },
    }


async def verify_cashfree_payment(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Verify payment status server-to-server with Cashfree PG API."""
    order_id = payload.get("orderId")
    cf_order_id = payload.get("cfOrderId")
    payment_id = payload.get("paymentId")

    # Locate payment document
    query: Dict[str, Any] = {}
    if cf_order_id:
        query = {"gatewayOrderId": cf_order_id}
    elif payment_id:
        query = {"_id": payment_id}
    elif order_id:
        query = {"orderId": order_id}
    else:
        raise CashfreePaymentServiceError("Either orderId, cfOrderId, or paymentId is required.", 400)

    payment = await database.find_one(PAYMENTS_COLL, query)
    if not payment and order_id:
        # Check order secrets map
        secret = await database.find_one(SECRETS_COLL, {"orderId": order_id})
        if secret:
            payment = await database.find_one(PAYMENTS_COLL, {"_id": secret["paymentId"]})

    if not payment:
        raise CashfreePaymentServiceError("Payment record not found.", 404)

    # Access control
    if user.role != Role.admin and payment.get("accountId") != user.id:
        raise CashfreePaymentServiceError("Access forbidden.", 403)

    # Idempotency: if already paid, return existing success state
    if payment.get("status") in ("paid", "SUCCESS"):
        return {
            "ok": True,
            "verified": True,
            "status": "SUCCESS",
            "message": "Payment has already been verified.",
            "payment": payment,
        }

    lookup_cf_order_id = payment.get("gatewayOrderId") or cf_order_id or ""
    if not lookup_cf_order_id:
        raise CashfreePaymentServiceError("No Cashfree gateway order ID associated with this payment.", 400)

    # Fetch live payments from Cashfree PG
    payments_list = await cashfree_client.get_order_payments(lookup_cf_order_id)
    successful_txn = next((p for p in payments_list if p.get("payment_status") == "SUCCESS"), None)
    failed_txn = next((p for p in payments_list if p.get("payment_status") in ("FAILED", "USER_DROPPED")), None)

    if successful_txn:
        cf_payment_id = str(successful_txn.get("cf_payment_id") or "")
        bank_reference = str(successful_txn.get("bank_reference") or "")
        payment_method = successful_txn.get("payment_method") or {}
        payment_group = successful_txn.get("payment_group") or "online"

        payment["status"] = "paid"
        payment["gatewayPaymentId"] = cf_payment_id
        payment["cfPaymentId"] = cf_payment_id
        payment["bankReference"] = bank_reference
        payment["paymentMethod"] = {"group": payment_group, "details": payment_method}
        payment["signatureVerified"] = True
        payment["updatedAt"] = _now_iso()

        await database.collection(PAYMENTS_COLL).update_one({"_id": payment["_id"]}, {"$set": payment})
        await _persist_payment_relational(payment)

        # Mark canonical order paid & advance lifecycle
        await _mark_order_paid(
            order_id=payment.get("orderId"),
            gateway="cashfree",
            payment_id=payment["_id"],
            cf_payment_id=cf_payment_id,
            bank_reference=bank_reference,
            payment_method=payment_group,
        )

        # If this payment was for wallet top-up, credit wallet balance
        purpose = str(payment.get("purpose") or "").lower()
        if any(w in purpose for w in ("wallet", "topup", "add funds", "add-funds")):
            try:
                from app.db.wallet_repositories import wallet_repository
                await wallet_repository.credit(
                    user,
                    payment["amount"],
                    kind="add-funds",
                    title="Money added to wallet",
                    description="Added via Cashfree Online Payment",
                    method="cashfree",
                    reference=cf_payment_id or payment["_id"],
                )
            except Exception as e:
                logger.error("Failed to credit wallet after Cashfree payment: %s", e)

        return {
            "ok": True,
            "verified": True,
            "status": "SUCCESS",
            "message": "Payment verified successfully.",
            "payment": payment,
        }

    if failed_txn:
        reason = failed_txn.get("payment_message") or failed_txn.get("payment_status") or "Payment failed"
        payment["status"] = "failed"
        payment["failureReason"] = reason
        payment["updatedAt"] = _now_iso()
        await database.collection(PAYMENTS_COLL).update_one({"_id": payment["_id"]}, {"$set": payment})
        await _persist_payment_relational(payment)

        return {
            "ok": False,
            "verified": False,
            "status": "FAILED",
            "message": reason,
            "payment": payment,
        }

    # Still pending
    return {
        "ok": True,
        "verified": False,
        "status": "PENDING",
        "message": "Payment is being processed by the bank. Please wait a moment.",
        "payment": payment,
    }


async def get_payment_status(user: User, order_id: str) -> Dict[str, Any]:
    """Retrieve current payment status for an order."""
    payment = await database.find_one(PAYMENTS_COLL, {"orderId": order_id})
    if not payment:
        secret = await database.find_one(SECRETS_COLL, {"orderId": order_id})
        if secret:
            payment = await database.find_one(PAYMENTS_COLL, {"_id": secret["paymentId"]})

    if not payment:
        raise CashfreePaymentServiceError("Payment not found for order.", 404)

    if user.role != Role.admin and payment.get("accountId") != user.id:
        raise CashfreePaymentServiceError("Access forbidden.", 403)

    return {"ok": True, "payment": payment}


async def retry_cashfree_order(user: User, order_id: str) -> Dict[str, Any]:
    """Generate a fresh Cashfree session ID to retry payment on an order."""
    order = await database.find_one(ORDERS_COLL, {"_id": order_id}) or await database.find_one(
        ORDERS_COLL, {"code": str(order_id).replace("ord-", "")}
    )
    if not order:
        raise CashfreePaymentServiceError("Order not found.", 404)

    if user.role != Role.admin and order.get("customerId") != user.id:
        raise CashfreePaymentServiceError("Access forbidden.", 403)

    order_amount = float(order.get("pricing", {}).get("total") or order.get("total") or 0.0)
    if order_amount <= 0:
        raise CashfreePaymentServiceError("Invalid order amount for payment retry.", 400)

    # Re-call order creation with clean fresh retry CF order ID
    return await create_cashfree_order(
        user,
        {
            "orderId": order["_id"],
            "amount": order_amount,
            "purpose": f"Retry payment for Order {order.get('code') or order['_id']}",
            "customerPhone": user.phone or "",
            "customerName": getattr(user, "display_name", None) or getattr(user, "name", None) or "",
        },
    )


async def _mark_order_paid(
    order_id: Optional[str],
    gateway: str,
    payment_id: str,
    cf_payment_id: Optional[str] = None,
    bank_reference: Optional[str] = None,
    payment_method: Optional[str] = None,
) -> None:
    """Transition QuickPress order to paid and advance to pending_partner_acceptance."""
    if not order_id:
        return

    order = await database.find_one(ORDERS_COLL, {"_id": order_id}) or await database.find_one(
        ORDERS_COLL, {"code": str(order_id).replace("ord-", "")}
    )
    if not order:
        return

    now = _now_iso()
    pm_block = dict(order.get("payment") or {})
    pm_block["paid"] = True
    pm_block["mode"] = "online" if gateway != "cod" else "cod"
    pm_block["gateway"] = gateway
    pm_block["paymentId"] = payment_id
    pm_block["gatewayPaymentId"] = cf_payment_id or payment_id
    pm_block["cfPaymentId"] = cf_payment_id
    pm_block["bankReference"] = bank_reference
    pm_block["paymentMethod"] = payment_method or "upi"
    pm_block["status"] = "PAID"
    pm_block["paidAt"] = now

    current_status = str(order.get("status") or "")
    new_status = current_status
    # If in draft or pending payment, advance order to pending partner acceptance
    if current_status in ("pending_payment", "created", "draft", "placed"):
        new_status = "pending_partner_acceptance"

    timeline = list(order.get("timeline") or [])
    timeline.append(
        {
            "status": "payment_verified",
            "time": now,
            "title": "Payment Verified",
            "description": f"Payment of ₹{order.get('pricing', {}).get('total') or 0} confirmed via {gateway.title()}.",
        }
    )

    update_fields: Dict[str, Any] = {
        "payment": pm_block,
        "status": new_status,
        "timeline": timeline,
        "updatedAt": now,
    }

    await database.collection(ORDERS_COLL).update_one({"_id": order["_id"]}, {"$set": update_fields})
    logger.info("Order %s updated to status %s with payment verified.", order["_id"], new_status)


async def handle_cashfree_webhook(
    event_payload: Dict[str, Any],
    raw_body: bytes,
    signature: str,
    timestamp: str,
) -> Dict[str, Any]:
    """Process Cashfree webhook with signature verification and idempotency."""
    settings = get_settings()

    # Signature verification
    if settings.cashfree_configured or settings.cashfree_webhook_secret:
        is_valid = cashfree_client.verify_webhook_signature(
            raw_body=raw_body,
            signature=signature,
            timestamp=timestamp,
            secret=settings.cashfree_webhook_secret or settings.cashfree_secret_key,
        )
        if not is_valid:
            logger.warning("Cashfree webhook signature mismatch.")
            raise CashfreePaymentServiceError("Invalid webhook signature.", 400)

    event_type = event_payload.get("type") or event_payload.get("event") or ""
    event_time = event_payload.get("event_time") or _now_iso()
    event_data = event_payload.get("data") or {}

    # Unique event ID for idempotency
    event_id = str(
        event_payload.get("event_id")
        or event_data.get("payment", {}).get("cf_payment_id")
        or f"{event_type}_{timestamp}"
    )

    # Check if already processed
    existing = await database.find_one(WEBHOOK_EVENTS_COLL, {"_id": event_id})
    if existing:
        logger.info("Cashfree webhook event %s already processed. Skipping.", event_id)
        return {"ok": True, "message": "Already processed"}

    # Record event in Supabase
    await database.collection(WEBHOOK_EVENTS_COLL).insert_one(
        {"_id": event_id, "type": event_type, "time": event_time, "data": event_data}
    )
    if database._supabase:
        try:
            pool = await database._supabase.get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO public.processed_webhook_events (id, event_type, gateway, payload, created_at)
                    VALUES ($1, $2, 'cashfree', $3, NOW())
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    event_id,
                    event_type,
                    json.dumps(event_payload),
                )
        except Exception as e:
            logger.warning("Failed to save relational webhook event: %s", e)

    # Dispatch event handlers
    if event_type == "PAYMENT_SUCCESS_WEBHOOK":
        payment_info = event_data.get("payment") or {}
        order_info = event_data.get("order") or {}
        cf_order_id = str(order_info.get("order_id") or "")
        cf_payment_id = str(payment_info.get("cf_payment_id") or "")
        bank_reference = str(payment_info.get("bank_reference") or "")
        payment_group = str(payment_info.get("payment_group") or "online")

        secret = await database.find_one(SECRETS_COLL, {"_id": cf_order_id})
        order_id = secret.get("orderId") if secret else cf_order_id.replace("cf_", "").split("_")[0]

        payment = await database.find_one(PAYMENTS_COLL, {"gatewayOrderId": cf_order_id})
        if payment and payment.get("status") != "paid":
            payment["status"] = "paid"
            payment["gatewayPaymentId"] = cf_payment_id
            payment["cfPaymentId"] = cf_payment_id
            payment["bankReference"] = bank_reference
            payment["signatureVerified"] = True
            payment["updatedAt"] = _now_iso()
            await database.collection(PAYMENTS_COLL).update_one({"_id": payment["_id"]}, {"$set": payment})
            await _persist_payment_relational(payment)

        await _mark_order_paid(
            order_id=order_id,
            gateway="cashfree",
            payment_id=payment["_id"] if payment else cf_order_id,
            cf_payment_id=cf_payment_id,
            bank_reference=bank_reference,
            payment_method=payment_group,
        )

    elif event_type == "PAYMENT_FAILED_WEBHOOK":
        payment_info = event_data.get("payment") or {}
        order_info = event_data.get("order") or {}
        cf_order_id = str(order_info.get("order_id") or "")
        reason = payment_info.get("payment_message") or "Payment failed"

        payment = await database.find_one(PAYMENTS_COLL, {"gatewayOrderId": cf_order_id})
        if payment and payment.get("status") != "paid":
            payment["status"] = "failed"
            payment["failureReason"] = reason
            payment["updatedAt"] = _now_iso()
            await database.collection(PAYMENTS_COLL).update_one({"_id": payment["_id"]}, {"$set": payment})
            await _persist_payment_relational(payment)

    return {"ok": True, "processed": True}


async def refund_cashfree_payment(user: User, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Initiate a full or partial refund on a paid order."""
    order_id = payload.get("orderId")
    if not order_id:
        raise CashfreePaymentServiceError("orderId is required.", 400)

    payment = await database.find_one(PAYMENTS_COLL, {"orderId": order_id})
    if not payment:
        raise CashfreePaymentServiceError("Payment record not found for order.", 404)

    refund_amount = ledger.money(payload.get("amount") or payment.get("amount", 0))
    if refund_amount <= 0:
        raise CashfreePaymentServiceError("Refund amount must be greater than ₹0.", 400)

    refund_id = f"ref_{uuid.uuid4().hex[:12]}"
    destination = payload.get("destination", "source")
    reason = payload.get("reason", "Order cancellation refund")

    # If refunding to QuickPress Wallet
    if destination == "wallet":
        from app.db.wallet_repositories import wallet_repository
        target_user = user
        if user.id != payment["accountId"]:
            user_doc = await database.collection("users").find_one({"_id": payment["accountId"]})
            if user_doc:
                target_user = User.from_document(user_doc)

        await wallet_repository.credit(
            target_user,
            refund_amount,
            kind="refund",
            title="Refund credited to wallet",
            description=reason,
            method="wallet",
            reference=refund_id,
        )

        refund_doc = {
            "_id": refund_id,
            "id": refund_id,
            "paymentId": payment["_id"],
            "orderId": order_id,
            "accountId": payment["accountId"],
            "amount": refund_amount,
            "reason": reason,
            "status": "processed",
            "destination": "wallet",
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        await database.collection(REFUNDS_COLL).insert_one(refund_doc)
        return {"ok": True, "refund": refund_doc}

    # Gateway source refund via Cashfree
    cf_order_id = payment.get("gatewayOrderId") or payment.get("cfOrderId")
    if not cf_order_id:
        raise CashfreePaymentServiceError("No Cashfree order associated with this payment.", 400)

    cf_refund = await cashfree_client.create_refund(
        order_id=cf_order_id,
        refund_id=refund_id,
        refund_amount=refund_amount,
        refund_note=reason,
    )

    refund_doc = {
        "_id": refund_id,
        "id": refund_id,
        "paymentId": payment["_id"],
        "orderId": order_id,
        "accountId": payment["accountId"],
        "amount": refund_amount,
        "reason": reason,
        "status": "processing",
        "destination": "source",
        "cfRefundId": cf_refund.get("cf_refund_id"),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    await database.collection(REFUNDS_COLL).insert_one(refund_doc)

    # Persist in Supabase relational table
    if database._supabase:
        try:
            pool = await database._supabase.get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO public.refunds (id, payment_id, order_id, user_id, cf_refund_id, amount, status, reason, destination, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSING', $7, $8, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    refund_id,
                    payment["_id"],
                    order_id,
                    payment["accountId"],
                    str(cf_refund.get("cf_refund_id") or ""),
                    refund_amount,
                    reason,
                    destination,
                )
        except Exception as e:
            logger.warning("Failed to insert relational refund: %s", e)

    return {"ok": True, "refund": refund_doc}
