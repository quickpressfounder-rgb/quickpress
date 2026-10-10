"""Test Admin Broadcast and Support Chat Push Dispatches."""

import pytest
import uuid
from unittest.mock import patch, AsyncMock
from app.db.admin_repositories import notification_repository, support_repository as admin_support_repo
from app.db.support_repositories import support_repository
from app.models.user import Role, User, UserStatus
from app.models.support import TicketReplyPayload
from app.db.client import database


@pytest.mark.asyncio
async def test_admin_broadcast_dispatches_push():
    """Verify admin broadcast triggers OneSignal, FCM, and WebPush."""
    uid = f"usr-bcast-{uuid.uuid4().hex[:6]}"
    test_user = User(
        id=uid,
        firebase_uid=f"fb-{uuid.uuid4().hex[:6]}",
        role=Role.customer,
        phone="+919876543210",
        display_name="Broadcast Target",
        status=UserStatus.active,
        is_verified=True,
    )
    doc = test_user.to_document()
    doc["_id"] = uid
    doc["fcm_tokens"] = ["mock_fcm_token_123"]
    await database.collection("users").insert_one(doc)

    with patch("app.core.onesignal.send_onesignal_broadcast", new_callable=AsyncMock) as mock_os_bcast, \
         patch("app.core.fcm.send_fcm_push", new_callable=AsyncMock) as mock_fcm_push, \
         patch("app.core.webpush.send_native_webpush", new_callable=AsyncMock) as mock_wp:
        mock_os_bcast.return_value = {"status": "delivered"}
        mock_fcm_push.return_value = 1
        mock_wp.return_value = 0

        res = await notification_repository.broadcast(
            audience="All",
            title="🔥 Mega Offer 50% Off",
            message="Get flat 50% discount on dry cleaning today!",
            category="promotional",
        )

        assert res["ok"] is True
        assert res["reached"] >= 1
        mock_os_bcast.assert_awaited_once()
        mock_fcm_push.assert_awaited_once()


@pytest.mark.asyncio
async def test_admin_support_reply_dispatches_push_and_socket():
    """Verify admin support reply dispatches push to customer user ID."""
    uid = f"usr-supp-{uuid.uuid4().hex[:6]}"
    tkt_id = f"tkt-test-{uuid.uuid4().hex[:6]}"

    # Insert a support ticket
    await database.collection("support_tickets").insert_one({
        "_id": tkt_id,
        "ticket_number": "QP-TKT-9999",
        "user_id": uid,
        "status": "open",
        "description": "Stain issue on white shirt",
    })

    admin_user = User(
        id="usr-admin-1",
        firebase_uid="fb-admin",
        role=Role.admin,
        phone="+919999999999",
        display_name="Lead Support Admin",
        status=UserStatus.active,
        is_verified=True,
    )

    with patch("app.core.onesignal.send_onesignal_notification", new_callable=AsyncMock) as mock_os_push, \
         patch("app.core.fcm.send_fcm_push", new_callable=AsyncMock) as mock_fcm_push, \
         patch("app.services.socket_service.sio.emit", new_callable=AsyncMock) as mock_sio:
        mock_os_push.return_value = {"status": "delivered"}
        mock_fcm_push.return_value = 1

        reply_res = await admin_support_repo.reply(
            ticket_id=tkt_id,
            body="We have credited ₹100 refund to your wallet. Please check!",
            is_internal=False,
            admin_user=admin_user,
        )

        assert reply_res is not None
        assert reply_res["ok"] is True
        mock_os_push.assert_awaited_once()
        mock_fcm_push.assert_awaited_once()
        mock_sio.assert_awaited()
