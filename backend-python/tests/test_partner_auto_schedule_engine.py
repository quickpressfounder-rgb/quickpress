import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from app.services.partner_auto_schedule_engine import (
    calculate_schedule_window,
    PartnerAutoScheduleEngine,
    IST,
)

def test_calculate_schedule_window_normal_day():
    # Thursday, 14:00 IST (2 PM)
    dt = datetime(2026, 10, 15, 14, 0, 0, tzinfo=IST)
    is_open, reason, next_trans = calculate_schedule_window(
        opening_time="09:00",
        closing_time="21:00",
        weekly_off="Sunday",
        now_ist=dt,
    )
    assert is_open is True
    assert "Operating" in reason
    assert "21:00" in next_trans

def test_calculate_schedule_window_after_closing():
    # Thursday, 22:30 IST (10:30 PM)
    dt = datetime(2026, 10, 15, 22, 30, 0, tzinfo=IST)
    is_open, reason, next_trans = calculate_schedule_window(
        opening_time="09:00",
        closing_time="21:00",
        weekly_off="Sunday",
        now_ist=dt,
    )
    assert is_open is False
    assert "Closed" in reason
    assert "tomorrow at 09:00" in next_trans

def test_calculate_schedule_window_weekly_off():
    # Sunday, 12:00 IST
    dt = datetime(2026, 10, 18, 12, 0, 0, tzinfo=IST)
    is_open, reason, next_trans = calculate_schedule_window(
        opening_time="09:00",
        closing_time="21:00",
        weekly_off="Sunday",
        now_ist=dt,
    )
    assert is_open is False
    assert "Weekly Off" in reason
    assert "Opens tomorrow at 09:00" in next_trans

def test_calculate_schedule_window_overnight_shift():
    # Overnight 20:00 to 04:00. At 23:00 IST -> should be open
    dt = datetime(2026, 10, 15, 23, 0, 0, tzinfo=IST)
    is_open, reason, next_trans = calculate_schedule_window(
        opening_time="20:00",
        closing_time="04:00",
        weekly_off="None",
        now_ist=dt,
    )
    assert is_open is True
    assert "Overnight" in reason

    # At 05:00 IST -> closed
    dt2 = datetime(2026, 10, 16, 5, 0, 0, tzinfo=IST)
    is_open2, reason2, _ = calculate_schedule_window(
        opening_time="20:00",
        closing_time="04:00",
        weekly_off="None",
        now_ist=dt2,
    )
    assert is_open2 is False
    assert "Closed" in reason2

@pytest.mark.asyncio
async def test_engine_evaluates_auto_online_and_manual_override():
    engine = PartnerAutoScheduleEngine()
    # 11:00 AM IST on Friday (2026-10-16)
    now_ist = datetime(2026, 10, 16, 11, 0, 0, tzinfo=IST)

    # Mock partner repo & database
    mock_repo = AsyncMock()
    mock_repo.toggle_status = AsyncMock(return_value={"status": "online"})
    mock_db = AsyncMock()
    mock_db.update = AsyncMock(return_value=True)

    with patch("app.services.partner_auto_schedule_engine.partner_repository", mock_repo), \
         patch("app.services.partner_auto_schedule_engine.database", mock_db):

        # Scenario 1: Auto-schedule ON, partner offline, no manual override -> Engine turns them ONLINE
        partner_doc = {
            "_id": "p-101",
            "isStoreOpen": False,
            "autoScheduleEnabled": True,
            "openingTime": "09:00",
            "closingTime": "21:00",
            "weeklyOff": "Sunday",
            "manualOverride": False,
        }
        res1 = await engine.evaluate_partner_status("p-101", partner_doc, now_ist=now_ist)
        assert res1 is True
        mock_repo.toggle_status.assert_called_once_with("p-101", True)

        # Scenario 2: Partner manually switched offline TODAY during operating hours (e.g. lunch/break)
        mock_repo.toggle_status.reset_mock()
        partner_doc_manual_offline = {
            "_id": "p-102",
            "isStoreOpen": False,
            "autoScheduleEnabled": True,
            "openingTime": "09:00",
            "closingTime": "21:00",
            "weeklyOff": "Sunday",
            "manualOverride": True,
            "manualOverrideAction": "offline",
            "manualOverrideDate": "2026-10-16",  # Today
            "scheduleStatusText": "Manually Paused",
        }
        res2 = await engine.evaluate_partner_status("p-102", partner_doc_manual_offline, now_ist=now_ist)
        # MUST NOT force partner online!
        assert res2 is False
        mock_repo.toggle_status.assert_not_called()

        # Scenario 3: Next day arrives, old manual override expires -> Engine automatically turns store ONLINE
        mock_repo.toggle_status.reset_mock()
        partner_doc_old_override = {
            "_id": "p-103",
            "isStoreOpen": False,
            "autoScheduleEnabled": True,
            "openingTime": "09:00",
            "closingTime": "21:00",
            "weeklyOff": "Sunday",
            "manualOverride": True,
            "manualOverrideAction": "offline",
            "manualOverrideDate": "2026-10-15",  # Yesterday!
        }
        res3 = await engine.evaluate_partner_status("p-103", partner_doc_old_override, now_ist=now_ist)
        assert res3 is True
        mock_repo.toggle_status.assert_called_once_with("p-103", True)

        # Scenario 4: Auto-schedule is DISABLED by partner -> Engine never alters status
        mock_repo.toggle_status.reset_mock()
        partner_doc_disabled = {
            "_id": "p-104",
            "isStoreOpen": False,
            "autoScheduleEnabled": False,
            "openingTime": "09:00",
            "closingTime": "21:00",
            "weeklyOff": "Sunday",
            "manualOverride": False,
        }
        res4 = await engine.evaluate_partner_status("p-104", partner_doc_disabled, now_ist=now_ist)
        assert res4 is False
        mock_repo.toggle_status.assert_not_called()
