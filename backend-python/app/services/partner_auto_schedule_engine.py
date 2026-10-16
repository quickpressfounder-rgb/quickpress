"""QuickPress Partner Auto Online / Offline Schedule Engine.

Automates store operating hours based on partner's configured registration timings:
- Auto Online at scheduled opening time (e.g. 08:00 AM)
- Auto Offline at scheduled closing time (e.g. 09:00 PM)
- Auto Offline on scheduled weekly off days (e.g. Sunday)
- Full support for Manual Override: If a partner manually switches Offline in the
  middle of the day (for maintenance, break, personal errands), the engine
  strictly respects the partner's manual choice and DOES NOT forcefully turn them
  online until either:
    1. The partner manually turns store back online, OR
    2. The partner clicks 'Resume Auto Schedule', OR
    3. The next business day's scheduled opening time arrives.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database
from app.db.partner_repositories import PROFILES, SETTINGS, partner_repository
from app.services.socket_service import broadcast_partner_status

logger = logging.getLogger(__name__)

# Indian Standard Time (UTC+05:30) is the national operating timezone for QuickPress
IST = timezone(timedelta(hours=5, minutes=30))


def get_current_ist() -> datetime:
    """Return current datetime converted to Indian Standard Time."""
    return datetime.now(timezone.utc).astimezone(IST)


def calculate_schedule_window(
    opening_time: str,
    closing_time: str,
    weekly_off: str = "None",
    now_ist: Optional[datetime] = None,
) -> Tuple[bool, str, str]:
    """
    Evaluates whether current IST time is within operating hours.
    Returns:
        (is_open: bool, status_text: str, next_transition: str)
    """
    current_now = now_ist if now_ist is not None else get_current_ist()
    current_day = current_now.strftime("%A")  # e.g. "Friday"
    current_hm = current_now.strftime("%H:%M")  # e.g. "10:45"
    today_date = current_now.strftime("%Y-%m-%d")

    clean_off = (weekly_off or "None").strip()
    is_weekly_off = clean_off.lower() != "none" and clean_off.lower() == current_day.lower()

    if is_weekly_off:
        return (
            False,
            f"Closed for Weekly Off ({clean_off})",
            f"Opens tomorrow at {opening_time}",
        )

    open_hm = opening_time.strip() if opening_time else "08:00"
    close_hm = closing_time.strip() if closing_time else "21:00"

    try:
        if open_hm <= close_hm:
            # Standard single-day window (e.g. 08:00 to 21:00)
            if open_hm <= current_hm < close_hm:
                return (
                    True,
                    f"Open (Operating {open_hm} – {close_hm})",
                    f"Closes today at {close_hm}",
                )
            elif current_hm < open_hm:
                return (
                    False,
                    f"Closed (Opens at {open_hm})",
                    f"Opens today at {open_hm}",
                )
            else:
                return (
                    False,
                    f"Closed (Closed at {close_hm})",
                    f"Opens tomorrow at {open_hm}",
                )
        else:
            # Overnight shift (e.g. 20:00 to 04:00)
            if current_hm >= open_hm or current_hm < close_hm:
                return (
                    True,
                    f"Open (Overnight {open_hm} – {close_hm})",
                    f"Closes at {close_hm}",
                )
            else:
                return (
                    False,
                    f"Closed (Opens at {open_hm})",
                    f"Opens today at {open_hm}",
                )
    except Exception as err:
        logger.warning("Error calculating schedule window: %s", err)
        return True, "Open (Standard Schedule)", ""


class PartnerAutoScheduleEngine:
    def __init__(self) -> None:
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    def start(self, interval_seconds: int = 20) -> None:
        """Start the background partner auto online/offline ticker."""
        if self._running and self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._ticker_loop(interval_seconds))
        logger.info(
            "⏰ Partner Auto Online/Offline Engine started (interval=%ds)", interval_seconds
        )

    def stop(self) -> None:
        """Stop the background auto schedule worker."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("⏰ Partner Auto Online/Offline Engine stopped")

    async def _ticker_loop(self, interval_seconds: int) -> None:
        """Periodic loop scanning partner operating schedules."""
        while self._running:
            try:
                await self.evaluate_all_active_partners()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Error in Partner Auto Schedule Engine loop: %s", exc, exc_info=True)
            await asyncio.sleep(interval_seconds)

    async def evaluate_all_active_partners(self) -> int:
        """Scan all partner stores and transition them according to scheduled hours & overrides."""
        async with self._lock:
            try:
                # Find all partners with settings
                settings_list = await database.find_all(SETTINGS, {})
            except Exception as err:
                logger.error("Failed to query partner_settings: %s", err)
                return 0

            transitions_count = 0
            for doc in settings_list:
                try:
                    partner_id = str(doc.get("partnerId") or doc.get("_id"))
                    if not partner_id:
                        continue
                    changed = await self.evaluate_partner_status(partner_id, doc)
                    if changed:
                        transitions_count += 1
                except Exception as p_err:
                    logger.debug("Error evaluating partner %s: %s", doc.get("_id"), p_err)

            return transitions_count

    async def evaluate_partner_status(
        self,
        partner_id: str,
        settings_doc: Optional[Dict[str, Any]] = None,
        now_ist: Optional[datetime] = None,
    ) -> bool:
        """
        Evaluates a single partner's operational status against their schedule.
        Returns True if a status transition was performed.
        """
        if settings_doc is None:
            settings_doc = await database.find_one(SETTINGS, {"_id": partner_id}) or {}

        # 1. Check if auto scheduling is enabled (default True)
        auto_enabled = bool(settings_doc.get("autoScheduleEnabled", True))
        if not auto_enabled:
            return False

        opening_time = str(settings_doc.get("openingTime") or "08:00")
        closing_time = str(settings_doc.get("closingTime") or "21:00")
        weekly_off = str(settings_doc.get("weeklyOff") or "None")
        current_store_open = bool(settings_doc.get("isStoreOpen", True))

        current_ist = now_ist if now_ist is not None else get_current_ist()
        today_date_str = current_ist.strftime("%Y-%m-%d")

        # 2. Check scheduled window
        is_scheduled_open, status_text, next_trans = calculate_schedule_window(
            opening_time, closing_time, weekly_off, now_ist=current_ist
        )

        # 3. Check Manual Override:
        # If partner manually toggled offline during today's open hours, respect it!
        has_manual_override = bool(settings_doc.get("manualOverride", False))
        override_action = settings_doc.get("manualOverrideAction")  # "offline" or "online"
        override_date = settings_doc.get("manualOverrideDate")

        if has_manual_override and override_date == today_date_str:
            if override_action == "offline" and is_scheduled_open:
                # Partner manually went offline during business hours: DO NOT OVERWRITE!
                # Update status metadata only
                if settings_doc.get("scheduleStatusText") != "Manually Paused":
                    await database.update(
                        SETTINGS,
                        {"_id": partner_id},
                        {
                            "scheduleStatusText": "Manually Paused (Offline)",
                            "nextScheduledTransition": f"Resumes auto-schedule tomorrow at {opening_time}",
                        },
                    )
                return False

        # If day has rolled over (override_date != today_date_str), clear stale manual override
        if has_manual_override and override_date != today_date_str:
            await database.update(
                SETTINGS,
                {"_id": partner_id},
                {
                    "manualOverride": False,
                    "manualOverrideAction": None,
                    "manualOverrideDate": None,
                },
            )

        # 4. Determine target state
        target_open = is_scheduled_open

        # If already in the target state, just ensure status text is up to date
        if current_store_open == target_open:
            if (
                settings_doc.get("scheduleStatusText") != status_text
                or settings_doc.get("nextScheduledTransition") != next_trans
            ):
                await database.update(
                    SETTINGS,
                    {"_id": partner_id},
                    {
                        "scheduleStatusText": status_text,
                        "nextScheduledTransition": next_trans,
                    },
                )
            return False

        # 5. Perform automatic transition!
        now_iso = datetime.now(timezone.utc).isoformat()
        reason = (
            f"Auto Online at {opening_time} (Schedule Window: {opening_time} – {closing_time})"
            if target_open
            else f"Auto Offline at {closing_time} (Schedule Window: {opening_time} – {closing_time})"
        )

        # Update partner settings with status text & timestamp
        await database.update(
            SETTINGS,
            {"_id": partner_id},
            {
                "isStoreOpen": target_open,
                "acceptingNewOrders": target_open,
                "scheduleStatusText": status_text,
                "nextScheduledTransition": next_trans,
                "lastAutoTransitionAt": now_iso,
                "lastAutoTransitionReason": reason,
                "updatedAt": now_iso,
            },
            upsert=True,
        )

        # Sync across partner collections (profiles, catalog_partners, live_locations)
        await partner_repository.toggle_status(partner_id, target_open)

        # Log to Partner Audit Trail
        from app.services.partner_activity_logger import log_partner_activity

        asyncio.create_task(
            log_partner_activity(
                partner_id=partner_id,
                category="store_status",
                event="STORE_AUTO_SCHEDULE_TRIGGERED",
                title=f"Store Automatically {'Opened' if target_open else 'Closed'}",
                description=reason,
                actor="QuickPress Auto-Schedule Engine",
                tone="success" if target_open else "neutral",
                metadata={
                    "openingTime": opening_time,
                    "closingTime": closing_time,
                    "weeklyOff": weekly_off,
                    "isStoreOpen": target_open,
                    "trigger": "scheduled_timer",
                },
            )
        )

        logger.info(
            "⏰ Partner %s auto transitioned to %s: %s",
            partner_id,
            "ONLINE" if target_open else "OFFLINE",
            reason,
        )
        return True


# Global singleton instance
partner_auto_schedule_engine = PartnerAutoScheduleEngine()
