"""Automation Activity Database Repository (Supabase PostgreSQL).

Provides persistent storage, querying, and real-time Socket.IO emission
for all 7 platform automations:
1. Auto-Dispatch Engine
2. Dynamic OTP Engine
3. Laundry Processing SLA Engine
4. Automated Financial Settlement Engine
5. Dynamic Surge & Weather Pricing Engine
6. Auto-Notification & Lifecycle Engine
7. Fraud & Geofence Auto-Guard Engine
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.client import database
from app.services.socket_service import sio

logger = logging.getLogger(__name__)

AUTOMATION_LOGS_COLLECTION = "automation_activity_logs"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AutomationRepository:
    """Repository managing audit logs and metrics for all 7 platform automations."""

    async def log_event(
        self,
        automation_type: str,
        title: str,
        description: str,
        order_id: Optional[str] = None,
        order_code: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_type: Optional[str] = None,  # "system" | "rider" | "partner" | "customer" | "admin"
        severity: str = "info",  # "info" | "success" | "warning" | "danger"
        duration_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Record an automation event in Supabase and emit live Socket.IO update."""
        event_id = f"auto-{uuid.uuid4().hex[:12]}"
        timestamp = now_iso()

        event_doc: Dict[str, Any] = {
            "_id": event_id,
            "id": event_id,
            "automationType": automation_type.lower().strip(),  # dispatch, otp, sla, finance, surge, notification, guard
            "title": title,
            "description": description,
            "orderId": order_id,
            "orderCode": order_code,
            "actorId": actor_id,
            "actorType": actor_type or "system",
            "severity": severity,
            "durationMs": duration_ms or 0,
            "metadata": metadata or {},
            "timestamp": timestamp,
            "createdAt": timestamp,
        }

        try:
            await database.insert_one(AUTOMATION_LOGS_COLLECTION, event_doc)
        except Exception as err:
            logger.warning(f"[AutomationRepository] Failed to insert log: {err}")

        # Broadcast live to Admin Surveillance Room via Socket.IO
        try:
            await sio.emit("admin_automation_activity", event_doc, room="admin")
        except Exception as err:
            logger.debug(f"[AutomationRepository] Socket emission error: {err}")

        return event_doc

    async def list_events(
        self,
        automation_type: Optional[str] = None,
        severity: Optional[str] = None,
        order_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Retrieve recent automation events sorted newest first."""
        query: Dict[str, Any] = {}
        if automation_type and automation_type.lower() != "all":
            query["automationType"] = automation_type.lower().strip()
        if severity and severity.lower() != "all":
            query["severity"] = severity.lower().strip()
        if order_id:
            query["orderId"] = order_id

        try:
            docs = await database.find_sorted(
                AUTOMATION_LOGS_COLLECTION,
                query=query,
                sort=[("timestamp", -1)],
                limit=min(limit, 100),
            )
            # Ensure proper string id
            results: List[Dict[str, Any]] = []
            for doc in docs:
                doc_copy = dict(doc)
                doc_copy["id"] = str(doc_copy.get("id") or doc_copy.get("_id"))
                results.append(doc_copy)
            return results
        except Exception as err:
            logger.error(f"[AutomationRepository] Query failed: {err}")
            return []

    async def get_stats(self) -> Dict[str, Any]:
        """Aggregate automation metrics across all 7 engines."""
        try:
            events = await database.find_sorted(
                AUTOMATION_LOGS_COLLECTION,
                query={},
                sort=[("timestamp", -1)],
                limit=500,
            )
        except Exception:
            events = []

        counts: Dict[str, int] = {
            "dispatch": 0,
            "otp": 0,
            "sla": 0,
            "finance": 0,
            "surge": 0,
            "notification": 0,
            "guard": 0,
        }
        success_count = 0
        warning_count = 0
        danger_count = 0

        for ev in events:
            atype = (ev.get("automationType") or "").lower()
            if atype in counts:
                counts[atype] += 1
            sev = (ev.get("severity") or "info").lower()
            if sev == "success" or sev == "info":
                success_count += 1
            elif sev == "warning":
                warning_count += 1
            elif sev == "danger":
                danger_count += 1

        total = len(events)
        success_rate = round((success_count / max(1, total)) * 100, 1) if total > 0 else 100.0

        return {
            "totalEvents": total,
            "successRate": success_rate,
            "activeEngines": 7,
            "status": "All Systems Operational",
            "counts": counts,
            "breakdown": {
                "success": success_count,
                "warning": warning_count,
                "danger": danger_count,
            },
            "timestamp": now_iso(),
        }


# Global singleton instance
automation_repository = AutomationRepository()
