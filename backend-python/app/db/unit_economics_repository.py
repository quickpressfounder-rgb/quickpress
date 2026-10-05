"""Unit Economics Repository — Per-Order CM1 & CM2 Profitability Engine for QuickPress.

Calculates:
- Contribution Margin 1 (CM1) = GMV - Taxes - Partner Cost - Rider Pay
- Contribution Margin 2 (CM2) = CM1 - Gateway Fee - Discount Subsidy - Packaging Subsidy
- Slices profitability across Cities, Service Categories, Stores, and Customer Cohorts.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database

logger = logging.getLogger(__name__)

COLLECTION = "order_unit_economics"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class UnitEconomicsRepository:
    """Repository storing and aggregating per-order unit economics and micro-market margins."""

    async def record_order_economics(
        self,
        *,
        order_id: str,
        gross_order_value: float,
        taxes: float,
        partner_cost: float,
        rider_cost: float,
        gateway_fee: float = 0.0,
        discount_subsidy: float = 0.0,
        packaging_subsidy: float = 12.0,  # Default standard packaging cost
        city: str = "Kasganj",
        service_category: str = "Wash & Fold",
        partner_id: Optional[str] = None,
        rider_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Calculates CM1, CM2, and net platform profit for a single order."""
        now = _now_iso()

        gov = round(float(gross_order_value), 2)
        tax = round(float(taxes), 2)
        net_gmv = round(max(0.0, gov - tax), 2)
        p_cost = round(float(partner_cost), 2)
        r_cost = round(float(rider_cost), 2)

        # CM1 = Net GMV - Partner processing cost - Rider logistics cost
        cm1 = round(net_gmv - p_cost - r_cost, 2)
        cm1_pct = round((cm1 / net_gmv * 100), 1) if net_gmv > 0 else 0.0

        gw_fee = round(float(gateway_fee), 2)
        disc_sub = round(float(discount_subsidy), 2)
        pack_sub = round(float(packaging_subsidy), 2)

        # CM2 = CM1 - Gateway processing - Platform absorbed discount - Packaging consumables
        cm2 = round(cm1 - gw_fee - disc_sub - pack_sub, 2)
        cm2_pct = round((cm2 / net_gmv * 100), 1) if net_gmv > 0 else 0.0

        doc = {
            "_id": order_id,
            "order_id": order_id,
            "gross_order_value": gov,
            "taxes": tax,
            "net_platform_gmv": net_gmv,
            "partner_cost": p_cost,
            "rider_cost": r_cost,
            "cm1": cm1,
            "cm1_margin_pct": cm1_pct,
            "gateway_fee": gw_fee,
            "discount_subsidy": disc_sub,
            "packaging_subsidy": pack_sub,
            "cm2": cm2,
            "cm2_margin_pct": cm2_pct,
            "city": city,
            "service_category": service_category,
            "partner_id": partner_id or "unassigned",
            "rider_id": rider_id or "unassigned",
            "is_profitable": cm2 > 0,
            "created_at": now,
            "updated_at": now,
        }

        await database.collection(COLLECTION).update_one(
            {"_id": order_id},
            {"$set": doc},
            upsert=True,
        )

        logger.info(
            "Unit economics recorded for order %s: GMV=₹%.2f, CM1=₹%.2f (%.1f%%), CM2=₹%.2f (%.1f%%)",
            order_id, gov, cm1, cm1_pct, cm2, cm2_pct
        )
        return doc

    async def list_order_economics(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        city: Optional[str] = None,
        service_category: Optional[str] = None,
        profitable_only: Optional[bool] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Paginated list of per-order unit economics."""
        query: Dict[str, Any] = {}
        if city:
            query["city"] = city
        if service_category:
            query["service_category"] = service_category
        if profitable_only is True:
            query["is_profitable"] = True
        elif profitable_only is False:
            query["is_profitable"] = False

        all_records = await database.find_many(COLLECTION, query)
        total_count = len(all_records)
        all_records.sort(key=lambda d: d.get("created_at") or "", reverse=True)
        return all_records[skip : skip + limit], total_count

    async def get_portfolio_margins_summary(self) -> Dict[str, Any]:
        """Calculates blended platform-wide margins."""
        records = await database.find_many(COLLECTION, {})
        if not records:
            return {
                "total_orders": 0,
                "total_gross_gmv": 0.0,
                "total_net_gmv": 0.0,
                "total_cm1": 0.0,
                "blended_cm1_pct": 0.0,
                "total_cm2": 0.0,
                "blended_cm2_pct": 0.0,
                "profitable_orders_pct": 0.0,
            }

        total_orders = len(records)
        total_gross = sum(float(r.get("gross_order_value", 0.0)) for r in records)
        total_net = sum(float(r.get("net_platform_gmv", 0.0)) for r in records)
        total_cm1 = sum(float(r.get("cm1", 0.0)) for r in records)
        total_cm2 = sum(float(r.get("cm2", 0.0)) for r in records)
        profitable_cnt = sum(1 for r in records if r.get("is_profitable"))

        return {
            "total_orders": total_orders,
            "total_gross_gmv": round(total_gross, 2),
            "total_net_gmv": round(total_net, 2),
            "total_cm1": round(total_cm1, 2),
            "blended_cm1_pct": round((total_cm1 / total_net * 100), 1) if total_net > 0 else 0.0,
            "total_cm2": round(total_cm2, 2),
            "blended_cm2_pct": round((total_cm2 / total_net * 100), 1) if total_net > 0 else 0.0,
            "profitable_orders_count": profitable_cnt,
            "profitable_orders_pct": round((profitable_cnt / total_orders * 100), 1) if total_orders > 0 else 0.0,
        }

    async def get_city_profitability_heatmap(self) -> List[Dict[str, Any]]:
        """Aggregates unit economics by City."""
        records = await database.find_many(COLLECTION, {})
        city_map: Dict[str, Dict[str, Any]] = {}

        for r in records:
            c = r.get("city") or "Unknown"
            if c not in city_map:
                city_map[c] = {
                    "city": c,
                    "orders_count": 0,
                    "gross_gmv": 0.0,
                    "net_gmv": 0.0,
                    "total_cm1": 0.0,
                    "total_cm2": 0.0,
                }
            city_map[c]["orders_count"] += 1
            city_map[c]["gross_gmv"] += float(r.get("gross_order_value", 0.0))
            city_map[c]["net_gmv"] += float(r.get("net_platform_gmv", 0.0))
            city_map[c]["total_cm1"] += float(r.get("cm1", 0.0))
            city_map[c]["total_cm2"] += float(r.get("cm2", 0.0))

        result = []
        for c, d in city_map.items():
            net = d["net_gmv"]
            result.append({
                "city": c,
                "orders_count": d["orders_count"],
                "gross_gmv": round(d["gross_gmv"], 2),
                "net_gmv": round(net, 2),
                "total_cm1": round(d["total_cm1"], 2),
                "cm1_margin_pct": round((d["total_cm1"] / net * 100), 1) if net > 0 else 0.0,
                "total_cm2": round(d["total_cm2"], 2),
                "cm2_margin_pct": round((d["total_cm2"] / net * 100), 1) if net > 0 else 0.0,
                "is_cash_flow_positive": d["total_cm2"] > 0,
            })

        result.sort(key=lambda d: d["total_cm2"], reverse=True)
        return result

    async def get_service_profitability_comparison(self) -> List[Dict[str, Any]]:
        """Aggregates unit economics by Service Category."""
        records = await database.find_many(COLLECTION, {})
        serv_map: Dict[str, Dict[str, Any]] = {}

        for r in records:
            s = r.get("service_category") or "General Laundry"
            if s not in serv_map:
                serv_map[s] = {
                    "service_category": s,
                    "orders_count": 0,
                    "gross_gmv": 0.0,
                    "net_gmv": 0.0,
                    "total_cm1": 0.0,
                    "total_cm2": 0.0,
                }
            serv_map[s]["orders_count"] += 1
            serv_map[s]["gross_gmv"] += float(r.get("gross_order_value", 0.0))
            serv_map[s]["net_gmv"] += float(r.get("net_platform_gmv", 0.0))
            serv_map[s]["total_cm1"] += float(r.get("cm1", 0.0))
            serv_map[s]["total_cm2"] += float(r.get("cm2", 0.0))

        result = []
        for s, d in serv_map.items():
            net = d["net_gmv"]
            result.append({
                "service_category": s,
                "orders_count": d["orders_count"],
                "gross_gmv": round(d["gross_gmv"], 2),
                "net_gmv": round(net, 2),
                "total_cm1": round(d["total_cm1"], 2),
                "cm1_margin_pct": round((d["total_cm1"] / net * 100), 1) if net > 0 else 0.0,
                "total_cm2": round(d["total_cm2"], 2),
                "cm2_margin_pct": round((d["total_cm2"] / net * 100), 1) if net > 0 else 0.0,
            })

        result.sort(key=lambda d: d["cm2_margin_pct"], reverse=True)
        return result


unit_economics_repository = UnitEconomicsRepository()
