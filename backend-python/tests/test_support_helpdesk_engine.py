"""Automated test suite for Omnichannel Helpdesk & Support Engine."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import Role, User
from app.core.security import create_access_token
from app.db.client import database


@pytest.fixture
async def admin_auth():
    admin = User(
        id="usr-support-lead-admin",
        phone="+919999900077",
        display_name="Lead Admin",
        email="leadadmin@quickpress.com",
        role=Role.admin,
    )
    await database.collection("users").update_one(
        {"_id": admin.id},
        {"$set": admin.model_dump()},
        upsert=True,
    )
    token, _ = create_access_token(admin.id, admin.role.value)
    return token


@pytest.fixture
async def customer_user():
    cust = User(
        id="usr-support-cust-01",
        phone="+919876543277",
        display_name="Vikram Sethi",
        email="vikram@example.com",
        role=Role.customer,
    )
    await database.collection("users").update_one(
        {"_id": cust.id},
        {"$set": cust.model_dump()},
        upsert=True,
    )
    return cust


@pytest.mark.asyncio
async def test_omnichannel_support_helpdesk_full_lifecycle(admin_auth, customer_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create / Log a new support ticket
        create_res = await client.post(
            "/api/admin/support",
            headers={"Authorization": f"Bearer {admin_auth}"},
            json={
                "subject": "Delay in evening suit delivery",
                "description": "Customer called reporting that pickup was done 2 days ago but delivery slot missed.",
                "role": "Customer",
                "raisedBy": customer_user.display_name,
                "phone": customer_user.phone,
                "email": customer_user.email,
                "userId": customer_user.id,
                "priority": "Urgent",
                "category": "Order Related",
                "refOrder": "ord-8832",
                "city": "Noida",
                "assignee": "Lead Admin",
            },
        )
        assert create_res.status_code == 200
        ticket_data = create_res.json()
        ticket_id = ticket_data["id"]
        assert ticket_data["priority"] == "Urgent"
        assert ticket_data["status"] == "Open"
        assert ticket_data["ticketNumber"].startswith("TCK-")

        # 2. List tickets and verify filters
        list_res = await client.get(
            "/api/admin/support?priority=Urgent",
            headers={"Authorization": f"Bearer {admin_auth}"},
        )
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(t["id"] == ticket_id for t in items)

        # 3. Helpdesk KPIs
        stats_res = await client.get(
            "/api/admin/support/stats",
            headers={"Authorization": f"Bearer {admin_auth}"},
        )
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["totalTickets"] >= 1
        assert stats["escalatedTickets"] >= 1

        # 4. Reply with official customer message
        reply_res = await client.post(
            f"/api/admin/support/{ticket_id}/reply",
            headers={"Authorization": f"Bearer {admin_auth}"},
            json={"body": "Hello Vikram, our Soron Gate hub is finishing quality checks and your rider will deliver by 6 PM."},
        )
        assert reply_res.status_code == 200
        assert reply_res.json()["ok"] is True

        # 5. Add private staff internal note
        internal_res = await client.post(
            f"/api/admin/support/{ticket_id}/reply",
            headers={"Authorization": f"Bearer {admin_auth}"},
            json={"body": "Internal Note: Hub was delayed due to power outage. Priority iron requested.", "isInternal": True},
        )
        assert internal_res.status_code == 200
        assert internal_res.json()["ok"] is True

        # 6. Disburse instant wallet compensation
        comp_res = await client.post(
            f"/api/admin/support/{ticket_id}/compensate",
            headers={"Authorization": f"Bearer {admin_auth}"},
            json={"amount": 75.0, "reason": "Late delivery goodwill credit"},
        )
        assert comp_res.status_code == 200
        comp_data = comp_res.json()
        assert comp_data["amount"] == 75.0
        assert comp_data["totalCompensated"] >= 75.0

        # Verify wallet balance in DB
        wallet_doc = await database.find_one("user_wallets", {"_id": customer_user.id})
        assert wallet_doc is not None
        assert float(wallet_doc.get("balance", 0)) >= 75.0

        # 7. Re-assign ticket agent
        assign_res = await client.post(
            f"/api/admin/support/{ticket_id}/assign",
            headers={"Authorization": f"Bearer {admin_auth}"},
            json={"assignee": "Pooja (Fulfillment Ops)"},
        )
        assert assign_res.status_code == 200
        assert assign_res.json()["assignee"] == "Pooja (Fulfillment Ops)"

        # 8. Update status and close ticket
        close_res = await client.post(
            f"/api/admin/support/{ticket_id}/close",
            headers={"Authorization": f"Bearer {admin_auth}"},
        )
        assert close_res.status_code == 200
        assert close_res.json()["status"] == "Resolved"

        # 9. Verify full conversation thread
        get_res = await client.get(
            f"/api/admin/support/{ticket_id}",
            headers={"Authorization": f"Bearer {admin_auth}"},
        )
        assert get_res.status_code == 200
        detail = get_res.json()
        assert detail["status"] == "Resolved"
        assert detail["compensationAmount"] >= 75.0
        assert len(detail["replies"]) >= 4  # Initial + Reply + Internal Note + Compensation
