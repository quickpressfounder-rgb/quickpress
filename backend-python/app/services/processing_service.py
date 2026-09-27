"""QuickPress Dynamic Processing Service & Service Category Pipeline.

Computes:
1. Dynamic turnaround duration and EXPECTED_READY_TIME based on items and admin-configured turnaroundHours.
2. Service category applicable processing stages:
   - Wash & Fold: SORTING -> WASHING -> DRYING -> QUALITY_CHECK -> PACKED
   - Dry Cleaning: SORTING -> PRE_TREATMENT -> DRY_CLEANING -> FINISHING -> QUALITY_CHECK -> PACKED
   - Ironing: SORTING -> IRONING -> QUALITY_CHECK -> PACKED
   - Shoe Cleaning / Other: SORTING -> CLEANING -> DRYING -> QUALITY_CHECK -> PACKED
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.services import order_lifecycle as lifecycle

logger = logging.getLogger(__name__)

# Default durations in hours if not explicitly configured in service doc
DEFAULT_SERVICE_DURATIONS: Dict[str, int] = {
    "wash_and_fold": 24,
    "wash_fold": 24,
    "wash & fold": 24,
    "laundry": 24,
    "dry_clean": 48,
    "dry_cleaning": 48,
    "dry cleaning": 48,
    "ironing": 8,
    "steam_iron": 8,
    "steam iron": 8,
    "shoe_cleaning": 36,
    "shoe cleaning": 36,
    "premium": 48,
}

# Category Processing Stages Pipelines
CATEGORY_STAGES: Dict[str, List[Dict[str, str]]] = {
    "wash_and_fold": [
        {"id": "sorting", "name": "Garment Sorting", "description": "Color & fabric segregation"},
        {"id": "washing", "name": "Washing", "description": "Detergent & antimicrobial wash"},
        {"id": "drying", "name": "Tumble Drying", "description": "Gentle heat drying"},
        {"id": "quality_check", "name": "Quality Check", "description": "Stain and freshness inspection"},
        {"id": "packed", "name": "Folded & Packed", "description": "Neat folding in protective wrap"},
    ],
    "dry_cleaning": [
        {"id": "sorting", "name": "Garment Sorting", "description": "Fabric & stain inspection"},
        {"id": "pre_treatment", "name": "Pre-Treatment", "description": "Spotting & stain removal"},
        {"id": "dry_cleaning", "name": "Dry Cleaning", "description": "Solvent hydrocarbon gentle cycle"},
        {"id": "finishing", "name": "Finishing & Form Pressing", "description": "Steam finishing and form pressing"},
        {"id": "quality_check", "name": "Final Quality Check", "description": "Inspection and hanger placement"},
        {"id": "packed", "name": "Packed & Bagged", "description": "Sealed in protective garment cover"},
    ],
    "ironing": [
        {"id": "sorting", "name": "Garment Sorting", "description": "Segregating garments by pressing heat level"},
        {"id": "ironing", "name": "Steam Ironing", "description": "Industrial vacuum steam press"},
        {"id": "quality_check", "name": "Crease & Quality Check", "description": "Crisp fold & collar check"},
        {"id": "packed", "name": "Hanger / Packed", "description": "Folded or hung on garment racks"},
    ],
    "default": [
        {"id": "sorting", "name": "Sorting", "description": "Garment sorting and check"},
        {"id": "washing", "name": "Washing / Cleaning", "description": "Specialized cleaning process"},
        {"id": "ironing", "name": "Finishing / Ironing", "description": "Pressing and steam finishing"},
        {"id": "quality_check", "name": "Quality Check", "description": "Fabric and cleanliness verification"},
        {"id": "packed", "name": "Packed & Ready", "description": "Packed for delivery"},
    ],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class ProcessingService:
    def detect_category(self, order: Dict[str, Any]) -> str:
        """Detect dominant service category from order items and service label."""
        svc_label = str(order.get("serviceLabel") or "").lower()
        items = order.get("items") or []

        combined_text = svc_label + " " + " ".join(str(it.get("name") or "") for it in items).lower()

        if "dry clean" in combined_text or "dry cleaning" in combined_text or "suit" in combined_text or "blazer" in combined_text:
            return "dry_cleaning"
        if "iron" in combined_text or "steam press" in combined_text:
            return "ironing"
        if "wash" in combined_text or "fold" in combined_text or "laundry" in combined_text:
            return "wash_and_fold"
        return "default"

    def get_applicable_stages(self, order: Dict[str, Any]) -> List[Dict[str, str]]:
        """Return the list of applicable processing stages for this order."""
        cat = self.detect_category(order)
        return CATEGORY_STAGES.get(cat, CATEGORY_STAGES["default"])

    async def calculate_processing_timeline(
        self, order: Dict[str, Any], start_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Calculates PROCESSING_START_TIME + DURATION = EXPECTED_READY_TIME."""
        start_dt = start_time or datetime.now(timezone.utc)
        items = order.get("items") or []
        is_express = bool(order.get("isExpress") or (order.get("pickup") or {}).get("express"))

        max_duration_hours = 24  # baseline fallback

        for it in items:
            service_id = it.get("partnerServiceId") or it.get("masterServiceId") or it.get("id")
            item_name = str(it.get("name") or "").lower()

            # Query service document if exists
            turnaround: Optional[int] = None
            if service_id:
                svc_doc = (
                    await database.find_one("partner_services", {"_id": service_id})
                    or await database.find_one("master_services", {"_id": service_id})
                )
                if svc_doc and svc_doc.get("turnaroundHours"):
                    turnaround = int(svc_doc["turnaroundHours"])

            if turnaround is None:
                # Match against defaults
                for key, hours in DEFAULT_SERVICE_DURATIONS.items():
                    if key in item_name:
                        turnaround = hours
                        break

            if turnaround is not None:
                max_duration_hours = max(max_duration_hours, turnaround)

        # Express speedup (50% reduction in turnaround time)
        if is_express:
            effective_duration_hours = max(4, round(max_duration_hours * 0.5))
        else:
            effective_duration_hours = max_duration_hours

        expected_ready_dt = start_dt + timedelta(hours=effective_duration_hours)
        expected_ready_iso = expected_ready_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
        start_iso = start_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")

        category = self.detect_category(order)
        stages = self.get_applicable_stages(order)

        return {
            "processingStartedAt": start_iso,
            "expectedReadyAt": expected_ready_iso,
            "configuredDurationHours": max_duration_hours,
            "effectiveDurationHours": effective_duration_hours,
            "isExpress": is_express,
            "category": category,
            "stages": [
                {
                    **stg,
                    "completed": False,
                    "completedAt": None,
                }
                for stg in stages
            ],
            "currentStageIndex": 0,
            "currentStageId": stages[0]["id"] if stages else "sorting",
        }


processing_service = ProcessingService()
