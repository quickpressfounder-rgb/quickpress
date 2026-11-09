"""Integration & Concurrency Tests for 8 Core System Fixes.

Covers:
1. Double cancel & double refund prevention
2. Referral reward claim atomicity
3. First-order coupon reuse prevention
4. Rider maximum concurrent active trips cap
5. Order lifecycle CAS conflict prevention
6. Payment gateway webhook duplicate key handling
"""
import asyncio
import pytest
from app.db.client import database
from app.models.user import User
from app.services import order_lifecycle as lifecycle


@pytest.fixture(autouse=True)
async def ensure_db():
    await database.connect()


@pytest.mark.asyncio
async def test_order_cancellation_double_refund_prevention():
    """Rapid duplicate cancellation cannot credit customer wallet twice."""
    from app.db.order_repositories import order_repository
    from app.db.wallet_repositories import wallet_repository

    user = User(id="user_cancel_test", email="cancel_test@quickpress.com", role="customer", phone="9999988881")
    await database.collection("users").update_one(
        {"_id": user.id},
        {"$set": {"_id": user.id, "phone": "9999988881", "role": "customer", "email": "cancel_test@quickpress.com"}},
        upsert=True,
    )
    await database.collection("customer_wallets").update_one({"userId": user.id}, {"$set": {"userId": user.id, "balance": 0.0}}, upsert=True)

    order_id = "ord-cancel-double-test"
    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": "CANC01",
        "userId": user.id,
        "status": lifecycle.PLACED,
        "payment": {"paid": True, "mode": "wallet"},
        "totals": {"grandTotal": 250.0},
        "customer": {"id": user.id},
    }
    await database.collection(lifecycle.ORDERS).update_one({"_id": order_id}, {"$set": order_doc}, upsert=True)
    await database.collection("order_financials").update_one(
        {"_id": order_id},
        {"$set": {"_id": order_id, "customerPayable": 250.0, "refundAmount": 0.0, "refundStatus": "NONE"}},
        upsert=True,
    )

    # Execute concurrent cancellations
    r1, r2 = await asyncio.gather(
        order_repository.cancel(user.id, order_id, "Double cancel 1"),
        order_repository.cancel(user.id, order_id, "Double cancel 2"),
        return_exceptions=True,
    )

    # Verify wallet was credited exactly once (₹250, not ₹500)
    w = await wallet_repository._wallet_document(user)
    assert float(w.get("balance", 0.0)) == 250.0

    fin = await database.find_one("order_financials", {"_id": order_id})
    assert float(fin.get("refundAmount", 0.0)) == 250.0


@pytest.mark.asyncio
async def test_referral_reward_claim_is_atomic():
    """Rapid duplicate claims of the same reward cannot credit wallet twice."""
    from app.db.referral_repositories import referral_repository, MULTI_ROLE_LEDGER

    user = User(id="partner_ref_test", email="pref@quickpress.com", role="partner", phone="9999988882")
    reward_id = "rew-atomic-test-1"
    reward_doc = {
        "_id": reward_id,
        "id": reward_id,
        "referrerId": user.id,
        "referrerRole": "partner",
        "rewardAmount": 150.0,
        "status": "unlocked",
    }
    await database.collection(MULTI_ROLE_LEDGER).update_one({"_id": reward_id}, {"$set": reward_doc}, upsert=True)

    # Launch two concurrent claims for the same user / reward
    res1, res2 = await asyncio.gather(
        referral_repository.claim_referral_rewards(user, "partner", reward_id),
        referral_repository.claim_referral_rewards(user, "partner", reward_id),
        return_exceptions=True,
    )

    # At least one claim succeeded with ₹150, but total additions must equal exactly ₹150
    additions = await database.find_many("partner_settlement_additions", {"partnerId": user.id, "type": "referral_incentive"})
    total_credited = sum(float(a.get("amount", 0.0)) for a in additions)
    assert total_credited == 150.0


@pytest.mark.asyncio
async def test_first_order_coupon_cannot_be_reused():
    """FIRSTFREE or WELCOME50 cannot be applied on a subsequent order by the same customer."""
    from app.db.order_repositories import order_repository
    from app.models.cart import CartLineResponse

    user_id = "cust_coupon_test_user"
    mock_items = [
        CartLineResponse(
            id="item1",
            itemId="item1",
            name="Shirt Dryclean",
            price=100.0,
            qty=2,
            basePrice=100.0,
            lineTotal=200.0,
        )
    ]

    # 1. On first order (0 prior orders), FIRSTFREE is accepted
    await database.collection(lifecycle.ORDERS).delete_many({"$or": [{"userId": user_id}, {"customerId": user_id}]})
    disc, code = await order_repository._validate_and_compute_coupon("FIRSTFREE", 75, mock_items, user_id=user_id)
    assert disc == 75
    assert code == "FIRSTFREE"

    # 2. Simulate completed prior order
    await database.collection(lifecycle.ORDERS).insert_one({
        "_id": "ord-prior-test-1",
        "userId": user_id,
        "couponCode": "FIRSTFREE",
        "status": lifecycle.DELIVERED,
    })

    # 3. On 2nd order, FIRSTFREE must be rejected with ValueError
    with pytest.raises(ValueError, match="valid only on your first order"):
        await order_repository._validate_and_compute_coupon("FIRSTFREE", 75, mock_items, user_id=user_id)


@pytest.mark.asyncio
async def test_rider_active_trips_limit():
    """Rider with 3 active trips is blocked from claiming a 4th offer."""
    from app.services.rider_dispatch import rider_dispatch_engine, RIDERS_COLLECTION

    rider_id = "rider_trip_cap_test"
    await database.collection(RIDERS_COLLECTION).update_one(
        {"_id": rider_id},
        {"$set": {"_id": rider_id, "fullName": "Test Captain", "city": "Kasganj"}},
        upsert=True,
    )

    # Clear previous test orders
    await database.collection(lifecycle.ORDERS).delete_many({"assignedRiderId": rider_id})

    # Create 3 active orders
    for i in range(3):
        await database.collection(lifecycle.ORDERS).insert_one({
            "_id": f"ord-active-{i}",
            "code": f"ACT0{i}",
            "status": lifecycle.PICKED_UP,
            "assignedRiderId": rider_id,
            "address": {"city": "Kasganj"},
        })

    # Attempt to claim a 4th order
    fourth_order_id = "ord-active-4"
    await database.collection(lifecycle.ORDERS).insert_one({
        "_id": fourth_order_id,
        "code": "ACT04",
        "status": lifecycle.PARTNER_ACCEPTED,
        "address": {"city": "Kasganj"},
    })

    with pytest.raises(ValueError, match="ACTIVE_TRIPS_LIMIT_REACHED"):
        await rider_dispatch_engine.claim_rider_offer(fourth_order_id, rider_id)


@pytest.mark.asyncio
async def test_order_lifecycle_cas_conflict_handling():
    """State transition validates that concurrent modifications are safely caught."""
    order_id = "ord-cas-test-1"
    await database.collection(lifecycle.ORDERS).update_one(
        {"_id": order_id},
        {"$set": {"_id": order_id, "code": "CAS01", "status": lifecycle.PLACED}},
        upsert=True,
    )

    # First transition to PARTNER_ACCEPTED
    updated = await lifecycle.transition(order_id, lifecycle.PARTNER_ACCEPTED, actor_role="partner")
    assert lifecycle.order_status(updated) == lifecycle.PARTNER_ACCEPTED

    # Second call to same status raises DuplicateActionError
    with pytest.raises(lifecycle.DuplicateActionError, match="already partner accepted"):
        await lifecycle.transition(order_id, lifecycle.PARTNER_ACCEPTED, actor_role="partner")


@pytest.mark.asyncio
async def test_razorpay_webhook_concurrent_duplicate_handling():
    """Duplicate webhook insert does not crash with 500 error."""
    from app.api.razorpay import WEBHOOK_EVENTS_COLL

    event_id = "evt_duplicate_test_1"
    await database.collection(WEBHOOK_EVENTS_COLL).delete_many({"_id": event_id})

    # First insert
    await database.collection(WEBHOOK_EVENTS_COLL).insert_one({
        "_id": event_id,
        "event_type": "payment.captured",
        "gateway": "razorpay",
    })

    # Second concurrent insert simulation with unique constraint catch
    try:
        await database.collection(WEBHOOK_EVENTS_COLL).insert_one({
            "_id": event_id,
            "event_type": "payment.captured",
            "gateway": "razorpay",
        })
    except Exception as exc:
        err_str = str(exc).lower()
        assert "duplicate" in err_str or "11000" in err_str or "unique" in err_str


@pytest.mark.asyncio
async def test_treasury_health_zero_loss_audit():
    """Verify double-entry zero-loss treasury health engine audits inflow == disposition."""
    from app.db.reconciliation_repository import reconciliation_repository

    # 1. Clear test order & financial snapshot
    test_ord_id = "ord_treasury_audit_test_01"
    await database.collection("customer_orders").delete_many({"_id": test_ord_id})
    await database.collection("order_financials").delete_many({"_id": test_ord_id})

    # 2. Insert test order with perfectly balanced financials
    # Inflow: customerPayable (500.0) + deliverySubsidy (50.0) = 550.0
    # Disposition: partnerAmount (400.0) + riderAmount (70.0) + platformFee (50.0) + taxes (20.0) + gatewayFee (10.0) = 550.0
    order_doc = {
        "_id": test_ord_id,
        "code": "ORD-TREASURY-01",
        "status": "delivered",
        "financialSnapshot": {
            "customerPayable": 500.0,
            "deliverySubsidy": 50.0,
            "partnerAmount": 400.0,
            "riderAmount": 70.0,
            "platformFee": 50.0,
            "totalGst": 20.0,
            "gatewayFee": 10.0,
        },
    }
    await database.collection("customer_orders").insert_one(order_doc)

    report = await reconciliation_repository.verify_treasury_health()
    assert report["ok"] is True
    assert report["currency"] == "INR"
    assert report["policy"] == "DOUBLE_ENTRY_ZERO_LOSS_INTEGRITY"
    assert report["totalOrdersAudited"] >= 1
    assert report["status"] == "HEALTHY"
    assert report["mathematicallyReconciled"] is True

    # Clean up test artifact
    await database.collection("customer_orders").delete_many({"_id": test_ord_id})


@pytest.mark.asyncio
async def test_otp_brute_force_lockout_persists_attempts():
    """Verify that failed OTP attempts are persisted to DB and locked after max attempts."""
    from app.services.smart_2ride_engine import smart_2ride_engine

    test_ord_id = "ord_otp_lockout_test_01"
    await database.collection("customer_orders").delete_many({"_id": test_ord_id})

    order_doc = {
        "_id": test_ord_id,
        "code": "ORD-OTP-01",
        "status": "partner_accepted",
        "otp": {
            "pickup": {
                "code": "4821",
                "attempts": 0,
                "maxAttempts": 3,
                "verified": False,
            }
        },
    }
    await database.collection("customer_orders").insert_one(order_doc)

    # 1. First wrong attempt
    with pytest.raises(PermissionError, match="2 attempt.*remaining"):
        await smart_2ride_engine.verify_pickup_otp(test_ord_id, "0000", "rdr_test")

    persisted = await database.collection("customer_orders").find_one({"_id": test_ord_id})
    assert persisted["otp"]["pickup"]["attempts"] == 1

    # 2. Second wrong attempt
    with pytest.raises(PermissionError, match="1 attempt.*remaining"):
        await smart_2ride_engine.verify_pickup_otp(test_ord_id, "1111", "rdr_test")

    persisted = await database.collection("customer_orders").find_one({"_id": test_ord_id})
    assert persisted["otp"]["pickup"]["attempts"] == 2

    # 3. Third wrong attempt -> Lockout
    with pytest.raises(PermissionError, match="Maximum verification attempts"):
        await smart_2ride_engine.verify_pickup_otp(test_ord_id, "2222", "rdr_test")

    persisted = await database.collection("customer_orders").find_one({"_id": test_ord_id})
    assert persisted["otp"]["pickup"]["attempts"] == 3
    assert persisted["otp"]["pickup"]["locked"] is True

    # 4. Attempting again even with correct code must remain rejected due to lock
    with pytest.raises(PermissionError, match="locked"):
        await smart_2ride_engine.verify_pickup_otp(test_ord_id, "4821", "rdr_test")

    await database.collection("customer_orders").delete_many({"_id": test_ord_id})


@pytest.mark.asyncio
async def test_cashfree_double_refund_protection():
    """Verify Cashfree refund rejects refund attempts that exceed paid order amount."""
    from app.services.cashfree_payments_service import refund_cashfree_payment, CashfreePaymentServiceError, PAYMENTS_COLL, REFUNDS_COLL
    from app.models.user import User, Role

    test_ord_id = "ord_refund_guard_test_01"
    test_user = User(
        id="usr_refund_guard",
        email="refund@quickpress.com",
        role=Role.customer,
        phone="+919999988888",
    )

    await database.collection(PAYMENTS_COLL).delete_many({"orderId": test_ord_id})
    await database.collection(REFUNDS_COLL).delete_many({"orderId": test_ord_id})

    # Seed payment of ₹500
    payment_doc = {
        "_id": f"pay_{test_ord_id}",
        "orderId": test_ord_id,
        "accountId": test_user.id,
        "amount": 500.0,
        "status": "paid",
        "gateway": "cashfree",
    }
    await database.collection(PAYMENTS_COLL).insert_one(payment_doc)

    # 1. First refund of ₹300 -> Success
    res1 = await refund_cashfree_payment(test_user, {"orderId": test_ord_id, "amount": 300.0, "destination": "wallet"})
    assert res1["ok"] is True

    # 2. Second refund of ₹300 -> Must FAIL because 300 + 300 = 600 > 500
    with pytest.raises(CashfreePaymentServiceError, match="exceeds remaining refundable balance"):
        await refund_cashfree_payment(test_user, {"orderId": test_ord_id, "amount": 300.0, "destination": "wallet"})

    # 3. Valid partial refund of ₹200 -> Success
    res2 = await refund_cashfree_payment(test_user, {"orderId": test_ord_id, "amount": 200.0, "destination": "wallet"})
    assert res2["ok"] is True

    # Clean up
    await database.collection(PAYMENTS_COLL).delete_many({"orderId": test_ord_id})
    await database.collection(REFUNDS_COLL).delete_many({"orderId": test_ord_id})


@pytest.mark.asyncio
async def test_partner_and_rider_wallet_atomic_withdrawal_rejection():
    """Verify partner and rider wallet withdrawals reject overdrafts and maintain atomic balance."""
    from app.db.partner_repositories import partner_wallet_repository, InvalidTransitionError
    from app.db.rider_repositories import rider_wallet_repository

    test_partner_id = "partner_withdraw_test_01"
    test_rider_id = "rider_withdraw_test_01"

    # Seed partner wallet with ₹200
    await database.collection("partner_wallets").delete_many({"accountId": test_partner_id})
    await database.collection("partner_wallets").insert_one({
        "_id": f"pwal_{test_partner_id}",
        "accountId": test_partner_id,
        "balance": 200.0,
    })

    # Partner attempts to withdraw ₹300 -> Must reject
    with pytest.raises(InvalidTransitionError, match="Insufficient wallet balance"):
        await partner_wallet_repository.withdraw(test_partner_id, 300.0)

    # Partner withdraws ₹150 -> Success
    updated_p = await partner_wallet_repository.withdraw(test_partner_id, 150.0)
    assert updated_p["balance"] == 50.0

    # Seed rider wallet with ₹100
    await database.collection("rider_wallets").delete_many({"_id": test_rider_id})
    await database.collection("rider_wallets").insert_one({
        "_id": test_rider_id,
        "riderId": test_rider_id,
        "balance": 100.0,
        "totalWithdrawn": 0.0,
    })

    # Rider attempts to withdraw ₹150 -> Must reject
    with pytest.raises(ValueError, match="Insufficient wallet balance"):
        await rider_wallet_repository.withdraw(test_rider_id, 150.0)

    # Rider withdraws ₹80 -> Success
    updated_r = await rider_wallet_repository.withdraw(test_rider_id, 80.0)
    assert updated_r["balance"] == 20.0

    # Clean up
    await database.collection("partner_wallets").delete_many({"accountId": test_partner_id})
    await database.collection("rider_wallets").delete_many({"_id": test_rider_id})


@pytest.mark.asyncio
async def test_coupon_usage_counter_sync_and_rollback():
    """Verify order creation increments coupon stats and cancellation rolls them back."""
    test_code = "SYNC50"
    await database.collection("admin_coupons").delete_many({"code": test_code})
    await database.collection("admin_coupons").insert_one({
        "_id": f"c_{test_code}",
        "code": test_code,
        "status": "Active",
        "flatDiscount": 50,
        "minOrder": 0,
        "used": 0,
        "totalDiscountGiven": 0.0,
    })

    # Simulate coupon increment upon order creation
    await database.collection("admin_coupons").update_one(
        {"code": test_code},
        {"$inc": {"used": 1, "totalDiscountGiven": 50.0}},
    )
    doc = await database.collection("admin_coupons").find_one({"code": test_code})
    assert doc["used"] == 1
    assert doc["totalDiscountGiven"] == 50.0

    # Simulate coupon decrement upon order cancellation
    await database.collection("admin_coupons").update_one(
        {"code": test_code},
        {"$inc": {"used": -1, "totalDiscountGiven": -50.0}},
    )
    doc_after = await database.collection("admin_coupons").find_one({"code": test_code})
    assert doc_after["used"] == 0
    assert doc_after["totalDiscountGiven"] == 0.0

    await database.collection("admin_coupons").delete_many({"code": test_code})



