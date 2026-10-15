"""End-to-End Test for Order Timeline & Partner 3-min / Rider 2-min SLA Auto-Cancellation.

Verifies:
1. Order timeline generation with exact timestamps and done states.
2. Partner 3-minute SLA: Unaccepted order auto-cancels with 100% wallet refund.
3. Rider 2-minute SLA: If partner accepts and rider does not accept within 2 mins (120s):
   - Rider assignment is cancelled ("rider cancle ho gaye").
   - Order is auto-cancelled with 100% refund.
   - Associated rides are cancelled and offers expired.
4. Active order within 2-minute Rider SLA remains active and untouched.
5. Successfully accepted order advances lifecycle without SLA cancellation.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.client import database
from app.services.order_timeline_engine import order_timeline_engine
from app.services import order_lifecycle as lifecycle


async def run_suite():
    print("=" * 70)
    print("🚀 STARTING COMPREHENSIVE ORDER TIMELINE & SLA VERIFICATION SUITE")
    print("=" * 70)

    now = datetime.now(timezone.utc)
    partner_sla = lifecycle.PARTNER_ACCEPT_SLA_SECONDS
    rider_sla = lifecycle.RIDER_ACCEPT_SLA_SECONDS

    print(f"Platform SLA Constants: Partner = {partner_sla}s (3 min), Rider = {rider_sla}s (2 min)")
    assert partner_sla == 180, f"Expected 180s Partner SLA, got {partner_sla}"
    assert rider_sla == 120, f"Expected 120s Rider SLA, got {rider_sla}"

    # Cleanup any existing test data
    test_ids = [
        "ord_timeline_partner_exp_01",
        "ord_timeline_rider_exp_02",
        "ord_timeline_rider_active_03",
        "ord_timeline_rider_accepted_04",
    ]
    cust_id = "test_cust_timeline_sla_999"
    await database.delete_many("customer_orders", {"_id": {"$in": test_ids}})
    await database.delete_many("rides", {"orderId": {"$in": test_ids}})
    await database.delete_many("rider_offers", {"orderId": {"$in": test_ids}})
    await database.delete_many("customer_wallets", {"customerId": cust_id})

    # Setup Customer Wallet with ₹200
    await database.insert("customer_wallets", {
        "_id": f"wallet_{cust_id}",
        "customerId": cust_id,
        "balance": 200.0,
        "transactions": [],
        "updatedAt": now.isoformat()
    })

    # -------------------------------------------------------------------------
    # TEST 1: Partner 3-Min SLA Breach (Placed 200s ago)
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Partner 3-Minute SLA Auto-Cancellation...")
    placed_at_1 = now - timedelta(seconds=200)
    await database.insert("customer_orders", {
        "_id": "ord_timeline_partner_exp_01",
        "customerId": cust_id,
        "partnerId": "store_kasganj_01",
        "status": "pending_partner_acceptance",
        "pricing": {"total": 500.0},
        "payment": {"method": "wallet", "status": "paid"},
        "placedAt": placed_at_1.isoformat(),
        "partnerAcceptDeadline": (placed_at_1 + timedelta(seconds=partner_sla)).isoformat(),
        "createdAt": placed_at_1.isoformat(),
        "updatedAt": placed_at_1.isoformat(),
    })

    # -------------------------------------------------------------------------
    # TEST 2: Rider 2-Min SLA Breach (Partner accepted 130s ago, rider not accepted)
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Rider 2-Minute SLA Auto-Cancellation & Rider Unassign...")
    partner_acc_2 = now - timedelta(seconds=130)
    await database.insert("customer_orders", {
        "_id": "ord_timeline_rider_exp_02",
        "customerId": cust_id,
        "partnerId": "store_kasganj_01",
        "status": "pickup_rider_assigned",
        "pricing": {"total": 350.0},
        "payment": {"method": "online", "status": "paid"},
        "placedAt": (partner_acc_2 - timedelta(seconds=60)).isoformat(),
        "partnerAcceptedAt": partner_acc_2.isoformat(),
        "riderDispatchStartedAt": partner_acc_2.isoformat(),
        "riderAcceptDeadline": (partner_acc_2 + timedelta(seconds=rider_sla)).isoformat(),
        "rider": {"id": "rider_kasganj_101", "name": "Captain Rohit", "phone": "9876543210"},
        "assignedRiderId": "rider_kasganj_101",
        "createdAt": (partner_acc_2 - timedelta(seconds=60)).isoformat(),
        "updatedAt": partner_acc_2.isoformat(),
    })
    await database.insert("rides", {
        "_id": "ride_exp_02",
        "orderId": "ord_timeline_rider_exp_02",
        "riderId": "rider_kasganj_101",
        "status": "ASSIGNED",
        "createdAt": partner_acc_2.isoformat(),
    })
    await database.insert("rider_offers", {
        "_id": "offer_exp_02",
        "orderId": "ord_timeline_rider_exp_02",
        "riderId": "rider_kasganj_101",
        "status": "pending",
        "createdAt": partner_acc_2.isoformat(),
    })

    # -------------------------------------------------------------------------
    # TEST 3: Rider Within SLA (Partner accepted 45s ago, deadline has 75s left)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Active Order within 2-Minute Rider SLA (Should Remain Active)...")
    partner_acc_3 = now - timedelta(seconds=45)
    await database.insert("customer_orders", {
        "_id": "ord_timeline_rider_active_03",
        "customerId": cust_id,
        "partnerId": "store_kasganj_01",
        "status": "rider_searching",
        "pricing": {"total": 280.0},
        "payment": {"method": "cod", "status": "pending"},
        "placedAt": (partner_acc_3 - timedelta(seconds=30)).isoformat(),
        "partnerAcceptedAt": partner_acc_3.isoformat(),
        "riderDispatchStartedAt": partner_acc_3.isoformat(),
        "riderAcceptDeadline": (partner_acc_3 + timedelta(seconds=rider_sla)).isoformat(),
        "createdAt": partner_acc_3.isoformat(),
        "updatedAt": partner_acc_3.isoformat(),
    })

    # -------------------------------------------------------------------------
    # TEST 4: Rider Accepted within SLA (Status: pickup_rider_accepted)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Rider Accepted Order (Should NOT be cancelled even after 2 min)...")
    partner_acc_4 = now - timedelta(seconds=150)
    await database.insert("customer_orders", {
        "_id": "ord_timeline_rider_accepted_04",
        "customerId": cust_id,
        "partnerId": "store_kasganj_01",
        "status": "pickup_rider_accepted",
        "pricing": {"total": 420.0},
        "payment": {"method": "online", "status": "paid"},
        "placedAt": (partner_acc_4 - timedelta(seconds=30)).isoformat(),
        "partnerAcceptedAt": partner_acc_4.isoformat(),
        "riderDispatchStartedAt": partner_acc_4.isoformat(),
        "rider": {"id": "rider_accepted_99", "name": "Captain Suresh"},
        "assignedRiderId": "rider_accepted_99",
        "createdAt": partner_acc_4.isoformat(),
        "updatedAt": partner_acc_4.isoformat(),
    })

    # RUN ENGINE TICK
    print("\n⚡ Executing order_timeline_engine.tick() ...")
    results = await order_timeline_engine.tick()
    print(f"Tick output: {results}")

    # VERIFY TEST 1: Partner SLA Expired
    doc1 = await database.find_one("customer_orders", {"_id": "ord_timeline_partner_exp_01"})
    assert doc1.get("status") == "cancelled", f"Order 1 should be cancelled, got {doc1.get('status')}"
    assert "3 minutes SLA" in doc1.get("cancellationReason", "")
    assert doc1.get("slaBreached") == "partner_acceptance"
    print("✓ TEST 1 PASSED: Order 1 cancelled per 3-min Partner SLA")

    # VERIFY TEST 2: Rider SLA Expired
    doc2 = await database.find_one("customer_orders", {"_id": "ord_timeline_rider_exp_02"})
    assert doc2.get("status") == "cancelled", f"Order 2 should be cancelled, got {doc2.get('status')}"
    assert "2 minutes SLA" in doc2.get("cancellationReason", "")
    assert doc2.get("slaBreached") == "rider_acceptance"
    assert doc2.get("rider") is None, "Assigned rider should be cleared/cancelled on SLA breach"
    assert doc2.get("assignedRiderId") is None, "assignedRiderId should be cleared"

    ride2 = await database.find_one("rides", {"orderId": "ord_timeline_rider_exp_02"})
    assert ride2.get("status") == "cancelled", f"Ride 2 should be cancelled, got {ride2.get('status')}"

    offer2 = await database.find_one("rider_offers", {"orderId": "ord_timeline_rider_exp_02"})
    assert offer2.get("status") == "expired", f"Rider offer 2 should be expired, got {offer2.get('status')}"
    print("✓ TEST 2 PASSED: Order 2, ride, and rider assignment cancelled per 2-min Rider SLA")

    # VERIFY TEST 3: Active within SLA
    doc3 = await database.find_one("customer_orders", {"_id": "ord_timeline_rider_active_03"})
    assert doc3.get("status") == "rider_searching", f"Order 3 should still be searching, got {doc3.get('status')}"
    print("✓ TEST 3 PASSED: Order 3 within 2-min SLA window remains active")

    # VERIFY TEST 4: Rider Accepted
    doc4 = await database.find_one("customer_orders", {"_id": "ord_timeline_rider_accepted_04"})
    assert doc4.get("status") == "pickup_rider_accepted", f"Order 4 should stay accepted, got {doc4.get('status')}"
    print("✓ TEST 4 PASSED: Accepted order remains in progress, not cancelled")

    # VERIFY REFUND: Cust had 200 + 500 (order 1) + 350 (order 2) = 1050.0
    wallet = await database.find_one("customer_wallets", {"customerId": cust_id})
    print(f"Customer Wallet Balance: {wallet.get('balance')} (Expected 1050.0)")
    assert wallet.get("balance") == 1050.0, f"Expected 1050.0, got {wallet.get('balance')}"
    print("✓ REFUND PASSED: 100% full refunds automatically credited to Customer Wallet")

    # VERIFY TIMELINE STRUCTURE: Test _timeline function on cancelled order
    partner_order_repr = lifecycle.to_partner_order(doc2)
    timeline = partner_order_repr.get("timeline")
    assert isinstance(timeline, list) and len(timeline) > 0, "Timeline should be non-empty list"
    cancelled_step = next((t for t in timeline if t.get("id") == "cancelled"), None)
    assert cancelled_step is not None, "Cancelled step must be present in timeline"
    assert "2 minutes SLA" in cancelled_step.get("label", ""), f"Timeline label should mention 2 min SLA: {cancelled_step}"
    print(f"✓ TIMELINE PASSED: Cancelled milestone present with label: '{cancelled_step.get('label')}'")

    # Cleanup
    await database.delete_many("customer_orders", {"_id": {"$in": test_ids}})
    await database.delete_many("rides", {"orderId": {"$in": test_ids}})
    await database.delete_many("rider_offers", {"orderId": {"$in": test_ids}})
    await database.delete_many("customer_wallets", {"customerId": cust_id})

    print("\n" + "=" * 70)
    print("🎉 ALL 5 INTEGRATION SUITE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(run_suite())
