"""
QuickPress Smart Multi-Order Batching & Route Sequencing Service
Calculates optimal stop sequences, cumulative route distance, trip fares,
and on-bike cargo inventory for active Delivery Captain shifts.
"""

from typing import Any, Dict, List, Optional, Tuple
import logging
from app.core.maps import haversine_km
from app.db.mongodb import database
from app.domain import lifecycle

logger = logging.getLogger(__name__)

ACTIVE_PICKUP_STATUSES = {
    "rider_assigned",
    "pickup_rider_assigned",
    "en_route_pickup",
    "arrived_pickup",
    "ACCEPTED",
    "SEARCHING_RIDER",
}

IN_TRANSIT_STATUSES = {
    "picked_up",
    "PICKED_UP",
    "in_transit_to_store",
}

ACTIVE_DELIVERY_STATUSES = {
    "ready_for_delivery",
    "delivery_assigned",
    "out_for_delivery",
    "delivery_otp_pending",
    "OUT_FOR_DELIVERY",
}


class SmartBatchRouteService:
    """Manages multi-order batch routes, task sequencing, and on-bike cargo tracking."""

    async def get_rider_active_batch(
        self,
        rider_id: str,
        rider_lat: Optional[float] = None,
        rider_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Fetches all active orders assigned to the rider, sequences their pickup
        and drop stops optimally using nearest-neighbor routing, and summarizes
        on-bike cargo inventory.
        """
        # 1. Resolve Rider Location
        cur_lat = rider_lat
        cur_lng = rider_lng
        if cur_lat is None or cur_lng is None:
            live_doc = await database.find_one("live_locations", {"_id": f"rider:{rider_id}"})
            if live_doc:
                cur_lat = live_doc.get("latitude")
                cur_lng = live_doc.get("longitude")

        # 2. Query all active orders assigned to this rider
        orders_cursor = database.collection("customer_orders").find(
            {
                "$or": [
                    {"rider.id": rider_id},
                    {"riderId": rider_id},
                    {"assignedRiderId": rider_id},
                    {"pickupRiderId": rider_id},
                    {"deliveryRiderId": rider_id},
                ],
                "status": {
                    "$in": [
                        "rider_assigned",
                        "pickup_rider_assigned",
                        "en_route_pickup",
                        "arrived_pickup",
                        "picked_up",
                        "in_transit_to_store",
                        "ready_for_delivery",
                        "delivery_assigned",
                        "out_for_delivery",
                        "delivery_otp_pending",
                    ]
                },
            }
        )
        orders = await orders_cursor.to_list(length=20)

        # Also merge active rides from smart_2ride_engine if any missing
        rides_cursor = database.collection("rides").find(
            {
                "assignedRiderId": rider_id,
                "status": {"$in": ["ACCEPTED", "EN_ROUTE", "ARRIVED", "PICKED_UP", "OUT_FOR_DELIVERY"]},
            }
        )
        active_rides = await rides_cursor.to_list(length=20)
        existing_order_ids = {lifecycle.order_id_of(o) for o in orders}

        for ride in active_rides:
            r_ord_id = ride.get("orderId")
            if r_ord_id and r_ord_id not in existing_order_ids:
                ord_doc = await lifecycle.find_order(r_ord_id)
                if ord_doc:
                    orders.append(ord_doc)
                    existing_order_ids.add(lifecycle.order_id_of(ord_doc))

        if not orders:
            return {
                "ok": True,
                "totalStops": 0,
                "totalOrders": 0,
                "totalDistanceKm": 0.0,
                "totalFare": 0.0,
                "cargoSummary": {
                    "bagsCount": 0,
                    "piecesCount": 0,
                    "activeBagTags": [],
                },
                "stops": [],
            }

        # 3. Analyze cargo and pending stops
        cargo_bags: List[str] = []
        cargo_pieces: int = 0
        total_fare: float = 0.0

        raw_stops: List[Dict[str, Any]] = []

        for o in orders:
            ord_id = lifecycle.order_id_of(o)
            ord_code = o.get("orderCode") or o.get("code") or ord_id
            st = str(o.get("status") or "").lower()

            items = o.get("items") or []
            item_pieces = sum(int(it.get("quantity") or it.get("qty") or 1) for it in items) or 1

            doorstep = (o.get("garmentVerification") or {}).get("doorstepPickup") or {}
            bag_tag = doorstep.get("bagTag") or o.get("bagTag") or None
            verified_pieces = doorstep.get("piecesPickedUp") or item_pieces

            # Fare computation
            pricing = o.get("pricing") or o.get("totals") or {}
            order_fare = float(o.get("riderFare") or o.get("payout") or pricing.get("deliveryFee") or 45.0)
            total_fare += order_fare

            # Customer coordinates & address
            c_addr = o.get("address") or o.get("pickupAddress") or {}
            c_name = o.get("customerName") or (o.get("customer") or {}).get("name") or "Customer"
            c_phone = o.get("customerPhone") or (o.get("customer") or {}).get("phone") or ""
            c_text = c_addr.get("street") or c_addr.get("address") or c_addr.get("formattedAddress") or "Customer Doorstep"
            c_lat = float(c_addr.get("latitude") or c_addr.get("lat") or 28.4595)
            c_lng = float(c_addr.get("longitude") or c_addr.get("lng") or 77.0266)

            # Partner coordinates & address
            p_data = o.get("partner") or o.get("partnerData") or {}
            p_name = p_data.get("name") or o.get("partnerName") or "Partner Laundry Hub"
            p_phone = p_data.get("phone") or o.get("partnerPhone") or ""
            p_text = p_data.get("address") or o.get("partnerAddress") or "Partner Store Hub"
            p_lat = float(p_data.get("latitude") or p_data.get("lat") or (c_lat + 0.015))
            p_lng = float(p_data.get("longitude") or p_data.get("lng") or (c_lng + 0.012))

            # Cargo check: If clothes are picked up and not yet processed/delivered
            if st in IN_TRANSIT_STATUSES or (st == "picked_up"):
                cargo_pieces += verified_pieces
                if bag_tag:
                    cargo_bags.append(bag_tag)
                # Next stop is to drop at partner hub
                raw_stops.append({
                    "stopId": f"{ord_id}_drop_store",
                    "orderId": ord_id,
                    "orderCode": ord_code,
                    "stopType": "drop_store",
                    "title": f"Drop at Hub: {p_name}",
                    "contactName": p_name,
                    "contactPhone": p_phone,
                    "address": p_text,
                    "lat": p_lat,
                    "lng": p_lng,
                    "pieces": verified_pieces,
                    "bagTag": bag_tag,
                    "otpRequired": "handover",
                    "requiresOrderPickup": None,  # already picked up
                })
            elif st in ACTIVE_PICKUP_STATUSES:
                # 1. Pickup from customer
                raw_stops.append({
                    "stopId": f"{ord_id}_pickup",
                    "orderId": ord_id,
                    "orderCode": ord_code,
                    "stopType": "pickup",
                    "title": f"Pickup: {c_name}",
                    "contactName": c_name,
                    "contactPhone": c_phone,
                    "address": c_text,
                    "lat": c_lat,
                    "lng": c_lng,
                    "pieces": item_pieces,
                    "bagTag": bag_tag,
                    "otpRequired": "pickup",
                    "requiresOrderPickup": None,
                })
                # 2. Then Drop at Store
                raw_stops.append({
                    "stopId": f"{ord_id}_drop_store",
                    "orderId": ord_id,
                    "orderCode": ord_code,
                    "stopType": "drop_store",
                    "title": f"Drop at Hub: {p_name}",
                    "contactName": p_name,
                    "contactPhone": p_phone,
                    "address": p_text,
                    "lat": p_lat,
                    "lng": p_lng,
                    "pieces": item_pieces,
                    "bagTag": bag_tag,
                    "otpRequired": "handover",
                    "requiresOrderPickup": f"{ord_id}_pickup",  # Prerequisite constraint
                })
            elif st in ACTIVE_DELIVERY_STATUSES:
                # Delivery Leg: Delivery to customer
                raw_stops.append({
                    "stopId": f"{ord_id}_drop_customer",
                    "orderId": ord_id,
                    "orderCode": ord_code,
                    "stopType": "drop_customer",
                    "title": f"Deliver to: {c_name}",
                    "contactName": c_name,
                    "contactPhone": c_phone,
                    "address": c_text,
                    "lat": c_lat,
                    "lng": c_lng,
                    "pieces": verified_pieces,
                    "bagTag": bag_tag,
                    "otpRequired": "delivery",
                    "requiresOrderPickup": None,
                })

        # 4. Nearest-Neighbor Sequence Optimization with Topological Dependency
        sequenced_stops: List[Dict[str, Any]] = []
        visited_ids = set()
        total_distance_km = 0.0

        current_lat = cur_lat if cur_lat is not None else (raw_stops[0]["lat"] if raw_stops else 28.4595)
        current_lng = cur_lng if cur_lng is not None else (raw_stops[0]["lng"] if raw_stops else 77.0266)

        while len(visited_ids) < len(raw_stops):
            # Candidate stops: not visited AND prerequisite is satisfied
            candidates = [
                s for s in raw_stops
                if s["stopId"] not in visited_ids
                and (s["requiresOrderPickup"] is None or s["requiresOrderPickup"] in visited_ids)
            ]

            if not candidates:
                # Fallback to any unvisited stop to avoid deadlock
                candidates = [s for s in raw_stops if s["stopId"] not in visited_ids]

            # Find nearest candidate stop from current position
            best_stop = None
            best_dist = float("inf")
            for c in candidates:
                dist = haversine_km((current_lat, current_lng), (c["lat"], c["lng"]))
                if dist < best_dist:
                    best_dist = dist
                    best_stop = c

            if best_stop is None:
                break

            visited_ids.add(best_stop["stopId"])
            step_km = round(best_dist, 2)
            total_distance_km += step_km

            stop_entry = {
                "sequenceNumber": len(sequenced_stops) + 1,
                "isNext": len(sequenced_stops) == 0,
                "stopId": best_stop["stopId"],
                "orderId": best_stop["orderId"],
                "orderCode": best_stop["orderCode"],
                "stopType": best_stop["stopType"],
                "title": best_stop["title"],
                "contactName": best_stop["contactName"],
                "contactPhone": best_stop["contactPhone"],
                "address": best_stop["address"],
                "coords": {"lat": best_stop["lat"], "lng": best_stop["lng"]},
                "distanceKm": step_km,
                "estimatedPieces": best_stop["pieces"],
                "bagTag": best_stop["bagTag"],
                "otpRequired": best_stop["otpRequired"],
            }
            sequenced_stops.append(stop_entry)

            # Move current position to this stop
            current_lat = best_stop["lat"]
            current_lng = best_stop["lng"]

        return {
            "ok": True,
            "totalStops": len(sequenced_stops),
            "totalOrders": len(orders),
            "totalDistanceKm": round(total_distance_km, 2),
            "totalFare": round(total_fare, 2),
            "cargoSummary": {
                "bagsCount": len(cargo_bags) if cargo_bags else (1 if cargo_pieces > 0 else 0),
                "piecesCount": cargo_pieces,
                "activeBagTags": cargo_bags,
            },
            "stops": sequenced_stops,
        }


smart_batch_route_service = SmartBatchRouteService()
