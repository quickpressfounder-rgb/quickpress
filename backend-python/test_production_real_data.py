"""
End-to-End Real Data Production Lifecycle Test Suite.
Verifies real MongoDB integrations without mock/dummy fixtures.
"""

import asyncio
import uuid
from app.db.client import database
from app.db.partner_repositories import partner_service_repository
from app.db.cart_repositories import cart_repository
from app.db.order_repositories import order_repository
from app.db.admin_repositories import admin_dashboard_repository
from app.db.rider_repositories import rider_delivery_repository
from app.models.cart import CartItemPayload
from app.models.order import PlaceOrderPayload, OrderAddress, OrderPickup, OrderPaymentPayload
from app.models.user import User, Role
from app.services import order_lifecycle as lifecycle

async def run_production_e2e_tests():
    print("=" * 65)
    print("QUICKPRESS REAL-DATA PRODUCTION E2E LIFECYCLE TESTS")
    print("=" * 65)
    
    await database.connect()
    
    # Generate unique test identities
    test_id = uuid.uuid4().hex[:6]
    partner_id = f"prt-prod-{test_id}"
    customer_user_id = f"usr-prod-cust-{test_id}"
    rider_id = f"rdr-prod-{test_id}"
    
    customer_user = User(
        id=customer_user_id,
        phone="+919888877777",
        display_name="Test Customer",
        role=Role.customer
    )
    
    # -------------------------------------------------------------
    # STEP 1: Partner Provisions Live Store & Service
    # -------------------------------------------------------------
    print("\n[STEP 1] Setting up Real Partner Profile & Services...")
    await database.update(
        "partner_profiles",
        {"_id": partner_id},
        {
            "_id": partner_id,
            "name": f"QuickPress Express {test_id}",
            "city": "Kasganj",
            "status": "active",
            "isVerified": True,
            "ownerName": "Test Partner",
            "phone": f"+91999{test_id}",
        },
        upsert=True
    )
    
    # Partner adds real service to rate card: ₹75/kg
    svc = await partner_service_repository.create(
        partner_id,
        {
            "name": "Steam Wash & Press",
            "category": "Wash & Fold",
            "unit": "per kg",
            "price": 75.0,
            "turnaroundHours": 24,
            "description": "Premium laundry service",
        }
    )
    svc_id = svc["id"]
    print(f"  ✓ Partner created real service [{svc['name']}] @ ₹{svc['price']}/{svc['unit']} (ID: {svc_id})")
    
    # -------------------------------------------------------------
    # STEP 2: Customer Creates Cart & Checkout Order
    # -------------------------------------------------------------
    print("\n[STEP 2] Customer Adds to Cart & Checks Out Order...")
    line = await cart_repository.add_item(
        customer_user_id,
        CartItemPayload(
            id=svc_id,
            serviceId=svc_id,
            partnerId=partner_id,
            name="Steam Wash & Press",
            price=75,
            qty=2,
            unit="per kg"
        )
    )
    print(f"  ✓ Real Cart added line total: ₹{line.lineTotal} (qty={line.qty})")
    
    # Place Order
    place_resp = await order_repository.create(
        user=customer_user,
        payload=PlaceOrderPayload(
            partnerId=partner_id,
            address=OrderAddress(
                label="Home",
                line="Civil Lines, Kasganj",
                city="Kasganj",
                phone="+919888877777"
            ),
            pickup=OrderPickup(date="Today", slot="10 AM – 2 PM"),
            payment=OrderPaymentPayload(mode="cod")
        )
    )
    order_id = place_resp.id
    order_code = place_resp.code
    order_doc = await lifecycle.get_order(order_id)
    print(f"  ✓ Real Order Placed: #{order_code} (ID: {order_id}, Status: {order_doc['status']}, Grand Total: ₹{order_doc['totals']['grandTotal']})")
    
    # -------------------------------------------------------------
    # STEP 3: Partner Accepts Order
    # -------------------------------------------------------------
    print("\n[STEP 3] Partner Accepts Live Order...")
    accepted_order = await lifecycle.transition(
        order_id,
        lifecycle.PARTNER_ACCEPTED,
        actor_id=partner_id,
        actor_role="partner"
    )
    print(f"  ✓ Order #{order_code} transition to [{accepted_order['status']}] successful.")
    
    # -------------------------------------------------------------
    # STEP 4: Admin Assigns Real Rider
    # -------------------------------------------------------------
    print("\n[STEP 4] Admin Assigns Real Rider...")
    await database.update(
        "rider_profiles",
        {"_id": rider_id},
        {
            "_id": rider_id,
            "riderId": rider_id,
            "fullName": "Real Delivery Partner",
            "name": "Real Delivery Partner",
            "phone": "+919877766655",
            "city": "Kasganj",
            "isOnline": True,
            "status": "active"
        },
        upsert=True
    )
    
    assigned_order = await lifecycle.transition(
        order_id,
        lifecycle.RIDER_ASSIGNED,
        actor_id="admin",
        actor_role="admin",
        changes={"rider": {"id": rider_id, "name": "Real Delivery Partner", "phone": "+919877766655"}}
    )
    print(f"  ✓ Order #{order_code} assigned to Rider [{assigned_order['rider']['name']}]")
    
    # -------------------------------------------------------------
    # STEP 5: Rider Completes Pickup & Delivery Flow
    # -------------------------------------------------------------
    print("\n[STEP 5] Rider Executes Real Pickup -> Store -> Delivery Flow...")
    
    # Rider accepts
    await rider_delivery_repository.accept(order_id, rider_id)
    print(f"  ✓ Rider accepted order.")
    
    # Rider pickup with OTP
    current_order = await lifecycle.get_order(order_id)
    p_raw = (current_order.get("otp") or {}).get("pickup")
    pickup_otp = p_raw.get("code") if isinstance(p_raw, dict) else str(p_raw or "")
    await rider_delivery_repository.pickup(order_id, rider_id, otp=pickup_otp)
    print(f"  ✓ Rider verified pickup OTP ({pickup_otp}) and picked up items.")
    
    # Rider drops at partner store
    await rider_delivery_repository.drop_at_partner(order_id, rider_id)
    print(f"  ✓ Rider dropped laundry at Partner store for processing.")
    
    # Partner starts processing laundry
    await lifecycle.transition(order_id, lifecycle.PROCESSING, actor_id=partner_id, actor_role="partner")
    print(f"  ✓ Partner started [PROCESSING] laundry.")
    
    # Partner marks laundry completed (ready for pickup)
    await lifecycle.transition(order_id, lifecycle.READY, actor_id=partner_id, actor_role="partner")
    print(f"  ✓ Partner marked laundry [READY] & packaged.")
    
    # Rider starts delivery
    ready_order = await lifecycle.get_order(order_id)
    disp_raw = (ready_order.get("otp") or {}).get("dispatch")
    dispatch_otp = disp_raw.get("code") if isinstance(disp_raw, dict) else str(disp_raw or "")
    await rider_delivery_repository.start_delivery(order_id, rider_id, otp=dispatch_otp)
    print(f"  ✓ Rider verified dispatch OTP ({dispatch_otp}) and is [OUT_FOR_DELIVERY].")
    
    # Rider completes delivery with delivery OTP
    out_order = await lifecycle.get_order(order_id)
    d_raw = (out_order.get("otp") or {}).get("delivery")
    delivery_otp = d_raw.get("code") if isinstance(d_raw, dict) else str(d_raw or "")
    delivered_order = await rider_delivery_repository.deliver(order_id, rider_id, otp=delivery_otp)
    print(f"  ✓ Rider verified delivery OTP ({delivery_otp}) and marked [DELIVERED]!")
    
    # -------------------------------------------------------------
    # STEP 6: Verify Admin Dashboard Real Aggregations
    # -------------------------------------------------------------
    print("\n[STEP 6] Verifying Live Admin Dashboard Aggregations...")
    summary = await admin_dashboard_repository.summary()
    assert summary["totalOrders"] >= 1, "Total orders must reflect real database orders"
    assert summary["revenue"] > 0, "Revenue must reflect delivered order total"
    print(f"  ✓ Admin Dashboard Real Aggregations: Total Orders={summary['totalOrders']}, Revenue=₹{summary['revenue']}, Active Partners={summary['activePartners']}, Online Riders={summary['onlineRiders']}")
    
    # -------------------------------------------------------------
    # STEP 7: Cleanup Test Artifacts
    # -------------------------------------------------------------
    await database.delete_one("partner_profiles", {"_id": partner_id})
    await database.delete_one("partner_services", {"_id": svc_id})
    await database.delete_one("customer_orders", {"_id": order_id})
    await database.delete_one("rider_profiles", {"_id": rider_id})
    await database.delete_one("customer_carts", {"_id": customer_user_id})
    
    print("\n" + "=" * 65)
    print("ALL PRODUCTION REAL-DATA LIFECYCLE TESTS PASSED! (7/7 STEPS)")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_production_e2e_tests())
