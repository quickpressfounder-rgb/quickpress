"""QuickPress Enterprise CRM & Geo-Intelligence Router.

Provides:
1. Multi-entity universal lookup across Customers, Riders, and Partners (search by state, city, pincode, ID, phone, name, email).
2. Deep 360-degree profile dossier for any Customer, Rider, or Partner.
3. State -> City -> Pincode live geo-operations pulse (sales, orders, net revenue, refunds, rider incentives, active fleet).
4. Geo Leaderboard ranking top Partners, Riders, and Customers with exportable reports.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import current_user, require_roles
from app.db.admin_repositories import (
    admin_customer_repository,
    admin_partner_repository,
    admin_rider_repository,
    city_repository,
    area_repository,
)
from app.db.client import database
from app.models.user import Role, User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/crm",
    tags=["admin-crm"],
    dependencies=[Depends(require_roles(Role.admin))],
)


def _safe_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _matches_geo(
    item_state: str,
    item_city: str,
    item_pin: str,
    filter_state: Optional[str] = None,
    filter_city: Optional[str] = None,
    filter_pin: Optional[str] = None,
) -> bool:
    if filter_state and filter_state.lower() != "all":
        if filter_state.lower() not in item_state.lower():
            return False
    if filter_city and filter_city.lower() != "all":
        if filter_city.lower() not in item_city.lower():
            return False
    if filter_pin and filter_pin.lower() != "all":
        if filter_pin not in item_pin:
            return False
    return True


@router.get("/locations")
async def get_crm_locations(user: User = Depends(current_user)):
    """Return available states, cities, and pincodes for cascading dropdowns."""
    try:
        cities_intel = await city_repository.get_intelligence()
    except Exception as exc:
        logger.warning("Failed to fetch cities intel: %s", exc)
        cities_intel = []

    areas = await area_repository.list()

    states_set = set()
    cities_map: Dict[str, Dict[str, Any]] = {}

    for c in cities_intel:
        c_name = c.get("city") or c.get("name") or ""
        s_name = c.get("state") or "Uttar Pradesh"
        states_set.add(s_name)
        if c_name:
            if c_name not in cities_map:
                cities_map[c_name] = {
                    "city": c_name,
                    "state": s_name,
                    "pincodes": list(c.get("pincodes") or []),
                }
            else:
                existing = set(cities_map[c_name]["pincodes"])
                for p in c.get("pincodes") or []:
                    existing.add(str(p))
                cities_map[c_name]["pincodes"] = sorted(list(existing))

    # Also incorporate areas
    for a in areas:
        c_name = a.get("city") or ""
        p_code = str(a.get("pincode") or "").strip()
        if c_name and p_code:
            if c_name in cities_map:
                if p_code not in cities_map[c_name]["pincodes"]:
                    cities_map[c_name]["pincodes"].append(p_code)
            else:
                cities_map[c_name] = {
                    "city": c_name,
                    "state": a.get("state") or "Uttar Pradesh",
                    "pincodes": [p_code],
                }

    # Ensure Kasganj default exists
    if "Kasganj" not in cities_map:
        cities_map["Kasganj"] = {
            "city": "Kasganj",
            "state": "Uttar Pradesh",
            "pincodes": ["207123", "207124", "207125"],
        }
        states_set.add("Uttar Pradesh")

    return {
        "states": sorted(list(states_set)),
        "cities": sorted(list(cities_map.values()), key=lambda x: x["city"]),
    }


@router.get("/search")
async def search_crm_entities(
    q: Optional[str] = Query(None, description="Search term (phone, name, email, ID)"),
    entity_type: str = Query("all", description="Filter: all | customer | rider | partner"),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    pincode: Optional[str] = Query(None),
    limit: int = Query(40, le=100),
    user: User = Depends(current_user),
):
    """Universal multi-entity search across Customers, Riders, and Partners."""
    query_str = (q or "").strip().lower()
    results: List[Dict[str, Any]] = []

    # 1. Search Customers
    if entity_type in ("all", "customer"):
        try:
            users_list = await database.find_many("users", {})
        except Exception as exc:
            logger.warning("Error fetching users: %s", exc)
            users_list = []

        for u in users_list:
            u_id = str(u.get("_id") or u.get("id") or "")
            u_name = _safe_str(u.get("display_name") or u.get("name") or "QuickPress Customer")
            u_phone = _safe_str(u.get("phone"))
            u_email = _safe_str(u.get("email"))
            u_city = _safe_str(u.get("city") or "Kasganj")
            u_state = _safe_str(u.get("state") or "Uttar Pradesh")
            u_pin = _safe_str(u.get("pincode") or u.get("zip") or "207123")

            if not _matches_geo(u_state, u_city, u_pin, state, city, pincode):
                continue

            if query_str:
                matches = (
                    query_str in u_name.lower()
                    or query_str in u_phone.lower()
                    or query_str in u_email.lower()
                    or query_str in u_id.lower()
                    or query_str in u_city.lower()
                    or query_str in u_pin
                )
                if not matches:
                    continue

            spend = float(u.get("spend") or u.get("spendRaw") or 0)
            orders_count = int(u.get("orders") or u.get("ordersCount") or 0)
            status_val = "Blocked" if u.get("isBlocked") or u.get("status") == "blocked" else "Active"

            results.append({
                "id": u_id,
                "entityType": "customer",
                "name": u_name,
                "phone": u_phone or "—",
                "email": u_email or "—",
                "city": u_city,
                "state": u_state,
                "pincode": u_pin,
                "status": status_val,
                "statusColor": "emerald" if status_val == "Active" else "rose",
                "primaryMetric": {"label": "Orders Placed", "value": f"{orders_count} orders"},
                "secondaryMetric": {"label": "Lifetime Spend", "value": f"₹{spend:,.0f}"},
                "avatar": u_name[:2].upper(),
                "joinedAt": str(u.get("createdAt") or u.get("created_at") or "")[:10],
                "lastActive": str(u.get("lastLoginAt") or u.get("updatedAt") or "")[:10],
                "tags": u.get("tags") or ["Customer"],
            })

    # 2. Search Riders
    if entity_type in ("all", "rider"):
        try:
            riders_list = await database.find_many("riders", {})
        except Exception as exc:
            logger.warning("Error fetching riders: %s", exc)
            riders_list = []

        for r in riders_list:
            r_id = str(r.get("_id") or r.get("id") or "")
            r_name = _safe_str(r.get("name") or "QuickPress Captain")
            r_phone = _safe_str(r.get("phone"))
            r_email = _safe_str(r.get("email"))
            r_city = _safe_str(r.get("city") or "Kasganj")
            r_state = _safe_str(r.get("state") or "Uttar Pradesh")
            r_pin = _safe_str(r.get("pincode") or r.get("zonePincode") or "207123")
            r_veh = _safe_str(r.get("vehicleNumber") or r.get("vehiclePlate") or "")

            if not _matches_geo(r_state, r_city, r_pin, state, city, pincode):
                continue

            if query_str:
                matches = (
                    query_str in r_name.lower()
                    or query_str in r_phone.lower()
                    or query_str in r_email.lower()
                    or query_str in r_id.lower()
                    or query_str in r_city.lower()
                    or query_str in r_pin
                    or query_str in r_veh.lower()
                )
                if not matches:
                    continue

            live_state = r.get("liveState") or ("Online" if r.get("isOnline") else "Offline")
            status_color = "emerald" if live_state == "Online" else ("amber" if "Delivery" in live_state else "zinc")
            completed = int(r.get("completedOrders") or r.get("totalDeliveries") or 0)
            rating = float(r.get("rating") or 4.8)
            cod_cash = float(r.get("codCash") or r.get("cashInHand") or 0)

            results.append({
                "id": r_id,
                "entityType": "rider",
                "name": r_name,
                "phone": r_phone or "—",
                "email": r_email or "—",
                "city": r_city,
                "state": r_state,
                "pincode": r_pin,
                "status": live_state,
                "statusColor": status_color,
                "primaryMetric": {"label": "Deliveries", "value": f"{completed} orders"},
                "secondaryMetric": {"label": "Rating / COD", "value": f"{rating:.1f}★ · ₹{cod_cash:,.0f} cash"},
                "avatar": r_name[:2].upper(),
                "joinedAt": str(r.get("createdAt") or "")[:10],
                "lastActive": str(r.get("lastSeen") or r.get("updatedAt") or "")[:10],
                "tags": [r.get("vehicleType") or "Bike", f"{rating:.1f}★ Pilot"],
            })

    # 3. Search Partners
    if entity_type in ("all", "partner"):
        try:
            partners_list = await database.find_many("partners", {})
        except Exception as exc:
            logger.warning("Error fetching partners: %s", exc)
            partners_list = []

        for p in partners_list:
            p_id = str(p.get("_id") or p.get("id") or "")
            p_name = _safe_str(p.get("name") or p.get("storeName") or "Partner Hub")
            p_owner = _safe_str(p.get("ownerName") or "")
            p_phone = _safe_str(p.get("phone"))
            p_email = _safe_str(p.get("email"))
            p_city = _safe_str(p.get("city") or "Kasganj")
            p_state = _safe_str(p.get("state") or "Uttar Pradesh")
            p_pin = _safe_str(p.get("pincode") or "207123")

            if not _matches_geo(p_state, p_city, p_pin, state, city, pincode):
                continue

            if query_str:
                matches = (
                    query_str in p_name.lower()
                    or query_str in p_owner.lower()
                    or query_str in p_phone.lower()
                    or query_str in p_email.lower()
                    or query_str in p_id.lower()
                    or query_str in p_city.lower()
                    or query_str in p_pin
                )
                if not matches:
                    continue

            gmv = float(p.get("totalRevenue") or p.get("gmv") or 0)
            p_orders = int(p.get("totalOrders") or p.get("ordersCount") or 0)
            is_active = p.get("status") == "active" or p.get("enabled", True)
            status_val = "Active Hub" if is_active else "Closed / Paused"
            status_color = "emerald" if is_active else "zinc"

            results.append({
                "id": p_id,
                "entityType": "partner",
                "name": p_name,
                "phone": p_phone or "—",
                "email": p_email or "—",
                "city": p_city,
                "state": p_state,
                "pincode": p_pin,
                "status": status_val,
                "statusColor": status_color,
                "primaryMetric": {"label": "Orders Fulfilled", "value": f"{p_orders} orders"},
                "secondaryMetric": {"label": "Total GMV", "value": f"₹{gmv:,.0f}"},
                "avatar": p_name[:2].upper(),
                "joinedAt": str(p.get("createdAt") or "")[:10],
                "lastActive": str(p.get("lastOrderAt") or p.get("updatedAt") or "")[:10],
                "tags": [p.get("category") or "Laundry Store", p_city],
            })

    return {
        "items": results[:limit],
        "total": len(results),
        "query": query_str,
    }


@router.get("/profile/{entity_type}/{entity_id}")
async def get_crm_deep_profile(
    entity_type: str,
    entity_id: str,
    user: User = Depends(current_user),
):
    """Return deep 360-degree profile dossier for Customer, Rider, or Partner."""
    entity_type = entity_type.lower().strip()

    try:
        if entity_type == "customer":
            data = await admin_customer_repository.get_customer_360(entity_id)
            return {"entityType": "customer", "profile": data}

        elif entity_type == "rider":
            data = await admin_rider_repository.get_rider_360(entity_id)
            return {"entityType": "rider", "profile": data}

        elif entity_type == "partner":
            data = await admin_partner_repository.get_partner_360(entity_id)
            return {"entityType": "partner", "profile": data}

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported entity type: '{entity_type}'. Must be customer, rider, or partner.",
            )
    except LookupError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
    except Exception as exc:
        logger.exception("CRM profile error for %s/%s: %s", entity_type, entity_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load CRM profile: {str(exc)}",
        )


@router.get("/geo-pulse")
async def get_crm_geo_pulse(
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    pincode: Optional[str] = Query(None),
    timeframe: str = Query("all", description="today | 7d | 30d | all"),
    user: User = Depends(current_user),
):
    """Return live sales, orders, net revenue, refunds, rider incentives, and active fleet for a geo location."""
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    week_ago_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    # Fetch orders
    try:
        all_orders = await database.find_many("customer_orders", {})
    except Exception as exc:
        logger.warning("Error querying orders: %s", exc)
        all_orders = []

    # Filter orders by geo and timeframe
    matched_orders: List[Dict[str, Any]] = []
    for o in all_orders:
        addr = o.get("address") or {}
        o_city = str(addr.get("city") or o.get("city") or (o.get("partner") or {}).get("city") or "Kasganj")
        o_state = str(addr.get("state") or o.get("state") or "Uttar Pradesh")
        o_pin = str(addr.get("pincode") or o.get("pincode") or "")

        if not _matches_geo(o_state, o_city, o_pin, state, city, pincode):
            continue

        created_str = str(o.get("createdAt") or o.get("created_at") or "")[:10]
        if timeframe == "today" and not created_str.startswith(today_str):
            continue
        elif timeframe == "7d" and created_str < week_ago_str:
            continue
        elif timeframe == "30d" and created_str < month_ago_str:
            continue

        matched_orders.append(o)

    # Compute Financials
    total_sales = 0.0
    delivered_count = 0
    active_count = 0
    cancelled_count = 0
    platform_revenue = 0.0
    refunds_amount = 0.0
    refunds_count = 0

    for o in matched_orders:
        totals = o.get("totals") or {}
        amt = float(totals.get("grandTotal") or o.get("amount") or 0)
        st = str(o.get("status") or "").lower()

        if st in ("delivered", "completed"):
            delivered_count += 1
            total_sales += amt
            # Net platform commission ~ 15% to 20%
            platform_revenue += float(totals.get("platformFee") or totals.get("commission") or (amt * 0.18))
        elif st in ("cancelled", "rejected"):
            cancelled_count += 1
        elif st in ("refunded", "disputed"):
            refunds_count += 1
            refunds_amount += amt
        else:
            active_count += 1
            total_sales += amt

    # Fetch Riders in this geo
    try:
        all_riders = await database.find_many("riders", {})
    except Exception:
        all_riders = []

    geo_riders = []
    for r in all_riders:
        r_city = str(r.get("city") or "Kasganj")
        r_state = str(r.get("state") or "Uttar Pradesh")
        r_pin = str(r.get("pincode") or r.get("zonePincode") or "")
        if _matches_geo(r_state, r_city, r_pin, state, city, pincode):
            geo_riders.append(r)

    online_riders = sum(1 for r in geo_riders if (r.get("liveState") == "Online" or r.get("isOnline")))
    on_delivery_riders = sum(1 for r in geo_riders if "Delivery" in str(r.get("liveState") or "") or r.get("status") == "busy")
    offline_riders = len(geo_riders) - online_riders - on_delivery_riders
    if offline_riders < 0:
        offline_riders = 0

    # Calculate Rider Incentives & Bonuses
    rider_incentives_sum = sum(float(r.get("incentivesEarned") or (int(r.get("completedOrders") or 0) * 35)) for r in geo_riders)

    # Fetch Partners in this geo
    try:
        all_partners = await database.find_many("partners", {})
    except Exception:
        all_partners = []

    geo_partners = []
    for p in all_partners:
        p_city = str(p.get("city") or "Kasganj")
        p_state = str(p.get("state") or "Uttar Pradesh")
        p_pin = str(p.get("pincode") or "")
        if _matches_geo(p_state, p_city, p_pin, state, city, pincode):
            geo_partners.append(p)

    active_partners = sum(1 for p in geo_partners if p.get("status") == "active" or p.get("enabled", True))

    # Recent orders slice
    recent_feed = []
    for o in matched_orders[:10]:
        recent_feed.append({
            "id": str(o.get("_id") or o.get("id")),
            "code": o.get("code") or f"QP-{str(o.get('_id'))[:6]}",
            "customer": (o.get("customer") or {}).get("name") or o.get("customerName") or "Customer",
            "partner": (o.get("partner") or {}).get("name") or o.get("partnerName") or "Partner Store",
            "rider": (o.get("rider") or {}).get("name") or o.get("riderName") or "Assigned Pilot",
            "amount": float((o.get("totals") or {}).get("grandTotal") or o.get("amount") or 0),
            "status": o.get("status") or "pending",
            "placedAt": o.get("createdAt") or o.get("created_at") or now.isoformat(),
        })

    return {
        "summary": {
            "totalSales": round(total_sales, 2),
            "totalOrders": len(matched_orders),
            "deliveredOrders": delivered_count,
            "activeOrders": active_count,
            "cancelledOrders": cancelled_count,
            "platformRevenue": round(platform_revenue, 2),
            "refundsAmount": round(refunds_amount, 2),
            "refundsCount": refunds_count,
            "riderIncentives": round(rider_incentives_sum, 2),
        },
        "fleet": {
            "totalRiders": len(geo_riders),
            "onlineRiders": online_riders,
            "onDeliveryRiders": on_delivery_riders,
            "idleRiders": max(0, online_riders - on_delivery_riders),
            "offlineRiders": offline_riders,
            "activePartners": active_partners,
            "totalPartners": len(geo_partners),
        },
        "recentOrders": recent_feed,
        "location": {
            "state": state or "All States",
            "city": city or "All Cities",
            "pincode": pincode or "All Pincodes",
        },
    }


@router.get("/leaderboard")
async def get_crm_leaderboard(
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    pincode: Optional[str] = Query(None),
    timeframe: str = Query("all", description="today | 7d | 30d | all"),
    user: User = Depends(current_user),
):
    """Return top Partners, Riders, and Customers ranked for a specific geographic slice."""
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    week_ago_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    orders = await database.find_many("customer_orders", {})
    partners = await database.find_many("partners", {})
    riders = await database.find_many("riders", {})
    users = await database.find_many("users", {})

    # 1. Partner Leaderboard
    partner_stats: Dict[str, Dict[str, Any]] = {}
    for p in partners:
        p_id = str(p.get("_id") or p.get("id"))
        p_city = str(p.get("city") or "Kasganj")
        p_state = str(p.get("state") or "Uttar Pradesh")
        p_pin = str(p.get("pincode") or "")
        if not _matches_geo(p_state, p_city, p_pin, state, city, pincode):
            continue

        partner_stats[p_id] = {
            "id": p_id,
            "name": p.get("name") or p.get("storeName") or "Partner Hub",
            "city": p_city,
            "pincode": p_pin,
            "rating": float(p.get("rating") or 4.9),
            "gmv": float(p.get("totalRevenue") or p.get("gmv") or 0),
            "orders": int(p.get("totalOrders") or p.get("ordersCount") or 0),
            "cancellationRate": float(p.get("cancellationRate") or 0.8),
        }

    # Aggregate orders into partners
    for o in orders:
        p_id = str(o.get("partnerId") or (o.get("partner") or {}).get("id") or "")
        if p_id in partner_stats:
            created_str = str(o.get("createdAt") or "")[:10]
            if timeframe == "today" and not created_str.startswith(today_str):
                continue
            elif timeframe == "7d" and created_str < week_ago_str:
                continue
            elif timeframe == "30d" and created_str < month_ago_str:
                continue

            amt = float((o.get("totals") or {}).get("grandTotal") or 0)
            if o.get("status") == "delivered":
                partner_stats[p_id]["gmv"] += amt
                partner_stats[p_id]["orders"] += 1

    top_partners = sorted(partner_stats.values(), key=lambda x: (x["gmv"], x["orders"]), reverse=True)
    for idx, item in enumerate(top_partners, start=1):
        item["rank"] = idx

    # 2. Rider Leaderboard
    rider_stats: Dict[str, Dict[str, Any]] = {}
    for r in riders:
        r_id = str(r.get("_id") or r.get("id"))
        r_city = str(r.get("city") or "Kasganj")
        r_state = str(r.get("state") or "Uttar Pradesh")
        r_pin = str(r.get("pincode") or r.get("zonePincode") or "")
        if not _matches_geo(r_state, r_city, r_pin, state, city, pincode):
            continue

        rider_stats[r_id] = {
            "id": r_id,
            "name": r.get("name") or "Captain Pilot",
            "city": r_city,
            "pincode": r_pin,
            "rating": float(r.get("rating") or 4.8),
            "deliveries": int(r.get("completedOrders") or r.get("totalDeliveries") or 0),
            "earnings": float(r.get("totalEarnings") or r.get("walletBalance") or 0),
            "onTimeRate": float(r.get("onTimeRate") or 98.4),
        }

    # Aggregate orders into riders
    for o in orders:
        r_id = str(o.get("riderId") or (o.get("rider") or {}).get("id") or "")
        if r_id in rider_stats and o.get("status") == "delivered":
            created_str = str(o.get("createdAt") or "")[:10]
            if timeframe == "today" and not created_str.startswith(today_str):
                continue
            elif timeframe == "7d" and created_str < week_ago_str:
                continue
            elif timeframe == "30d" and created_str < month_ago_str:
                continue

            rider_stats[r_id]["deliveries"] += 1
            rider_stats[r_id]["earnings"] += 55.0  # Approx payout per order

    top_riders = sorted(rider_stats.values(), key=lambda x: (x["deliveries"], x["rating"]), reverse=True)
    for idx, item in enumerate(top_riders, start=1):
        item["rank"] = idx

    # 3. Customer Leaderboard
    customer_stats: Dict[str, Dict[str, Any]] = {}
    for u in users:
        u_id = str(u.get("_id") or u.get("id"))
        u_city = str(u.get("city") or "Kasganj")
        u_state = str(u.get("state") or "Uttar Pradesh")
        u_pin = str(u.get("pincode") or "207123")
        if not _matches_geo(u_state, u_city, u_pin, state, city, pincode):
            continue

        customer_stats[u_id] = {
            "id": u_id,
            "name": u.get("display_name") or u.get("name") or "Valued Customer",
            "city": u_city,
            "pincode": u_pin,
            "spend": float(u.get("spend") or u.get("spendRaw") or 0),
            "orders": int(u.get("orders") or u.get("ordersCount") or 0),
            "membership": "Gold VIP" if float(u.get("spend") or 0) > 2000 else "Standard",
            "loyaltyPoints": int(u.get("loyaltyPoints") or 150),
        }

    # Aggregate orders into customers
    for o in orders:
        u_id = str(o.get("userId") or o.get("user_id") or (o.get("customer") or {}).get("id") or "")
        if u_id in customer_stats and o.get("status") == "delivered":
            created_str = str(o.get("createdAt") or "")[:10]
            if timeframe == "today" and not created_str.startswith(today_str):
                continue
            elif timeframe == "7d" and created_str < week_ago_str:
                continue
            elif timeframe == "30d" and created_str < month_ago_str:
                continue

            amt = float((o.get("totals") or {}).get("grandTotal") or 0)
            customer_stats[u_id]["spend"] += amt
            customer_stats[u_id]["orders"] += 1

    top_customers = sorted(customer_stats.values(), key=lambda x: (x["spend"], x["orders"]), reverse=True)
    for idx, item in enumerate(top_customers, start=1):
        item["rank"] = idx

    return {
        "partners": top_partners[:15],
        "riders": top_riders[:15],
        "customers": top_customers[:15],
        "timeframe": timeframe,
        "filters": {
            "state": state or "All",
            "city": city or "All",
            "pincode": pincode or "All",
        },
    }
