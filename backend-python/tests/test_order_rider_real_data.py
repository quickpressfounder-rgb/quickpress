import pytest
from app.db.client import database
from app.db.order_repositories import order_repository
from app.services import order_lifecycle as lifecycle
from app.services.rider_dispatch import resolve_real_rider_party
from app.models.order import OrderParty, OrderPartnerParty, OrderTotals, OrderAddress, OrderPickup


@pytest.mark.asyncio
async def test_resolve_real_rider_party_and_order_enrichment():
    now = lifecycle.now_iso()
    rider_id = "CAP-TEST-REAL-99"
    profile_id = "test-real-uuid-99"
    order_id = f"ord-real-rider-{lifecycle.new_otp()}"

    # 1. Seed a realistic rider profile in rider_profiles
    rider_doc = {
        "_id": profile_id,
        "riderId": rider_id,
        "userId": profile_id,
        "fullName": "Himanshu Pal",
        "name": "Himanshu Pal",
        "phone": "+919258740561",
        "photoUrl": "https://res.cloudinary.com/demo/image/upload/sample_rider.jpg",
        "selfieUrl": "https://res.cloudinary.com/demo/image/upload/sample_rider.jpg",
        "vehicleType": "Bike (Petrol)",
        "vehicleNumber": "UP87R6390",
        "rating": 5.0,
        "lifetimeDeliveries": 42,
        "city": "Kasganj",
        "lat": 27.8125,
        "lng": 78.6475,
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
    }
    await database.collection("rider_profiles").insert_one(rider_doc)

    # 2. Test resolve_real_rider_party with both riderId and profile_id
    party_by_rider_id = await resolve_real_rider_party(rider_id)
    assert party_by_rider_id is not None
    assert party_by_rider_id["name"] == "Himanshu Pal"
    assert party_by_rider_id["phone"] == "+919258740561"
    assert party_by_rider_id["vehicle"] == "Bike (Petrol)"
    assert party_by_rider_id["plate"] == "UP87R6390"
    assert party_by_rider_id["avatar"] == "https://res.cloudinary.com/demo/image/upload/sample_rider.jpg"
    assert party_by_rider_id["rating"] == 5.0
    assert "42" in party_by_rider_id["trips"]
    assert party_by_rider_id["latitude"] == 27.8125
    assert party_by_rider_id["longitude"] == 78.6475

    party_by_dict = await resolve_real_rider_party({"id": profile_id})
    assert party_by_dict is not None
    assert party_by_dict["name"] == "Himanshu Pal"
    assert party_by_dict["avatar"] == "https://res.cloudinary.com/demo/image/upload/sample_rider.jpg"

    # 3. Create an order with minimal rider object (simulating previous dummy or incomplete data)
    order_doc = {
        "_id": order_id,
        "id": order_id,
        "code": "QP8888",
        "userId": "cust-test-1",
        "status": lifecycle.PICKUP_RIDER_ACCEPTED,
        "createdAt": now,
        "updatedAt": now,
        "customer": OrderParty(id="cust-test-1", name="Test Customer", phone="+919876543210").model_dump(),
        "partner": OrderPartnerParty(id="partner-1", name="Kasganj Cleaners", phone="+919876543211", city="Kasganj").model_dump(),
        "rider": {"id": rider_id, "name": "Delivery Captain"},
        "riderId": rider_id,
        "serviceLabel": "Daily Wear Wash",
        "items": [{"id": "item-1", "name": "Shirt", "qty": 1, "price": 40, "subtotal": 40}],
        "totals": OrderTotals(itemsTotal=40, grandTotal=40).model_dump(),
        "address": OrderAddress(label="Home", line="MG Road", city="Kasganj", phone="+919876543210").model_dump(),
        "pickup": OrderPickup(date="Today", slot="Morning", express=False).model_dump(),
        "events": [],
    }
    await database.collection("customer_orders").insert_one(order_doc)

    # 4. Fetch order via order_repository.by_id() and verify real rider hydration
    fetched = await order_repository.by_id("cust-test-1", order_id)
    assert fetched is not None
    assert fetched.rider is not None
    assert fetched.rider.name == "Himanshu Pal"
    assert fetched.rider.phone == "+919258740561"
    assert fetched.rider.vehicle == "Bike (Petrol)"
    assert fetched.rider.plate == "UP87R6390"
    assert fetched.rider.avatar == "https://res.cloudinary.com/demo/image/upload/sample_rider.jpg"
    assert fetched.rider.rating == 5.0
    assert "42" in fetched.rider.trips
    assert fetched.rider.location is not None
    assert fetched.rider.location["latitude"] == 27.8125
