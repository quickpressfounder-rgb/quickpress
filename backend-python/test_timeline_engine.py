"""
Automated Integration Test for Order Timeline & SLA Auto-Cancellation Engine
Tests:
1. Partner Acceptance 3-min SLA timeout -> auto-cancelled, refund processed, socket event sent
2. Rider Search 2-min SLA timeout -> ride and order auto-cancelled, refund processed
3. Active order within SLA is untouched
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure app is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.client import database
from app.services.order_timeline_engine import order_timeline_engine
from app.services.order_lifecycle import PARTNER_ACCEPT_SLA_SECONDS, RIDER_ACCEPT_SLA_SECONDS

async def run_tests():
    print("🚀 Initializing Database Connection...")
    now = datetime.now(timezone.utc)

    print("\n--- TEST 1: Partner Acceptance SLA Timeout (3 min breached) ---")
    order1_id = "test_sla_partner_timeout_001"
    customer1_id = "test_cust_sla_001"

    # Clean up old test data if present
    await database.delete_many("customer_orders", {"_id": {"$in": [order1_id, "test_sla_rider_timeout_002", "test_sla_active_003"]}})
    await database.delete_many("rides", {"orderId": {"$in": [order1_id, "test_sla_rider_timeout_002", "test_sla_active_003"]}})
    await database.delete_many("customer_wallets", {"customerId": customer1_id})

    # Initialize customer wallet with 100
    await database.insert("customer_wallets", {
        "_id": f"wallet_{customer1_id}",
        "customerId": customer1_id,
        "balance": 100.0,
        "transactions": [],
        "updatedAt": now.isoformat()
    })

    # Create order placed 6 minutes ago (past 5-min SLA)
    placed_at_1 = now - timedelta(seconds=PARTNER_ACCEPT_SLA_SECONDS + 30)
    deadline_1 = placed_at_1 + timedelta(seconds=PARTNER_ACCEPT_SLA_SECONDS)

    await database.insert("customer_orders", {
        "_id": order1_id,
        "customerId": customer1_id,
        "partnerId": "test_partner_01",
        "status": "pending_partner_acceptance",
        "pricing": {"total": 450.0},
        "payment": {"method": "wallet", "status": "paid"},
        "placedAt": placed_at_1.isoformat(),
        "partnerAcceptDeadline": deadline_1.isoformat(),
        "partnerSlaSeconds": PARTNER_ACCEPT_SLA_SECONDS,
        "createdAt": placed_at_1.isoformat(),
        "updatedAt": placed_at_1.isoformat()
    })

    print(f"Created expired partner acceptance order {order1_id}, deadline was {deadline_1.isoformat()}")

    print("\n--- TEST 2: Rider Search SLA Timeout (2 min breached) ---")
    order2_id = "test_sla_rider_timeout_002"
    customer2_id = "test_cust_sla_002"
    partner_accepted_at_2 = now - timedelta(seconds=RIDER_ACCEPT_SLA_SECONDS + 20)
    rider_deadline_2 = partner_accepted_at_2 + timedelta(seconds=RIDER_ACCEPT_SLA_SECONDS)

    await database.insert("customer_orders", {
        "_id": order2_id,
        "customerId": customer2_id,
        "partnerId": "test_partner_01",
        "status": "partner_accepted",
        "pricing": {"total": 320.0},
        "payment": {"method": "online", "status": "paid"},
        "placedAt": (partner_accepted_at_2 - timedelta(seconds=60)).isoformat(),
        "partnerAcceptedAt": partner_accepted_at_2.isoformat(),
        "riderDispatchStartedAt": partner_accepted_at_2.isoformat(),
        "riderAcceptDeadline": rider_deadline_2.isoformat(),
        "riderSlaSeconds": RIDER_ACCEPT_SLA_SECONDS,
        "createdAt": (partner_accepted_at_2 - timedelta(seconds=60)).isoformat(),
        "updatedAt": partner_accepted_at_2.isoformat()
    })

    # Create associated searching ride
    await database.insert("rides", {
        "_id": "ride_sla_002",
        "orderId": order2_id,
        "type": "pickup",
        "status": "searching",
        "customerId": customer2_id,
        "partnerId": "test_partner_01",
        "riderDispatchStartedAt": partner_accepted_at_2.isoformat(),
        "riderAcceptDeadline": rider_deadline_2.isoformat(),
        "createdAt": partner_accepted_at_2.isoformat()
    })

    print(f"Created expired rider search order {order2_id} & ride, deadline was {rider_deadline_2.isoformat()}")

    print("\n--- TEST 3: Fresh Active Order (Within 5 min SLA) ---")
    order3_id = "test_sla_active_003"
    placed_at_3 = now - timedelta(seconds=30) # Only 30s old
    deadline_3 = placed_at_3 + timedelta(seconds=PARTNER_ACCEPT_SLA_SECONDS)

    await database.insert("customer_orders", {
        "_id": order3_id,
        "customerId": "test_cust_sla_003",
        "partnerId": "test_partner_01",
        "status": "pending_partner_acceptance",
        "pricing": {"total": 200.0},
        "payment": {"method": "cod", "status": "pending"},
        "placedAt": placed_at_3.isoformat(),
        "partnerAcceptDeadline": deadline_3.isoformat(),
        "createdAt": placed_at_3.isoformat(),
        "updatedAt": placed_at_3.isoformat()
    })

    print(f"Created fresh order {order3_id} (placed 30s ago, should remain active).")

    # EXECUTE ENGINE TICK
    print("\n⚡ Executing order_timeline_engine.tick() ...")
    results = await order_timeline_engine.tick()
    print(f"Tick results: {results}")

    # VERIFY TEST 1
    doc1 = await database.find_one("customer_orders", {"_id": order1_id})
    print(f"\nOrder 1 Status: {doc1.get('status')}, Reason: {doc1.get('cancellationReason')}")
    assert doc1.get("status") == "cancelled", f"Expected cancelled, got {doc1.get('status')}"
    assert bool(doc1.get("slaBreached")) is True
    assert doc1.get("autoCancelled") is True
    assert "3 minutes SLA" in doc1.get("cancellationReason", "")

    # Check Wallet refund for Customer 1
    wallet1 = await database.find_one("customer_wallets", {"customerId": customer1_id})
    print(f"Customer 1 Wallet Balance: {wallet1.get('balance')} (Expected 550.0: 100 + 450 refund)")
    assert wallet1.get("balance") == 550.0, f"Expected 550.0, got {wallet1.get('balance')}"
    print("✅ TEST 1 PASSED: 3-Minute Partner SLA Auto-Cancellation & Wallet Refund Successful!")

    # VERIFY TEST 2
    doc2 = await database.find_one("customer_orders", {"_id": order2_id})
    print(f"\nOrder 2 Status: {doc2.get('status')}, Reason: {doc2.get('cancellationReason')}")
    assert doc2.get("status") == "cancelled", f"Expected cancelled, got {doc2.get('status')}"
    assert bool(doc2.get("slaBreached")) is True
    assert "2 minutes SLA" in doc2.get("cancellationReason", "")
    assert doc2.get("payment", {}).get("refundStatus") == "refunded"

    ride2 = await database.find_one("rides", {"orderId": order2_id})
    print(f"Ride 2 Status: {ride2.get('status')}")
    assert ride2.get("status") == "cancelled", f"Expected ride cancelled, got {ride2.get('status')}"
    print("✅ TEST 2 PASSED: 2-Minute Rider Search SLA Auto-Cancellation & Online Refund Successful!")

    # VERIFY TEST 3
    doc3 = await database.find_one("customer_orders", {"_id": order3_id})
    print(f"\nOrder 3 Status: {doc3.get('status')} (Should still be pending_partner_acceptance)")
    assert doc3.get("status") == "pending_partner_acceptance", f"Expected pending_partner_acceptance, got {doc3.get('status')}"
    print("✅ TEST 3 PASSED: Active Order within SLA Remains Untouched!")

    # Cleanup
    await database.delete_many("customer_orders", {"_id": {"$in": [order1_id, order2_id, order3_id]}})
    await database.delete_many("rides", {"orderId": {"$in": [order1_id, order2_id, order3_id]}})
    await database.delete_many("customer_wallets", {"customerId": customer1_id})

    print("\n🎉 ALL SLA ENGINE TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
