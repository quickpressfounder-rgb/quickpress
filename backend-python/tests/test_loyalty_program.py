"""Automated tests for QuickPress Loyalty Program — Scratch Cards & 100 pts = ₹10 Wallet Transfer."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.client import database
from app.db.loyalty_repositories import (
    LOYALTY_CAMPAIGN,
    LOYALTY_SCRATCH_CARDS,
    LOYALTY_ACCOUNTS,
    LOYALTY_LEDGER,
    GLOBAL_CAMPAIGN_ID,
    loyalty_repository,
)
from app.db.wallet_repositories import WALLETS, TRANSACTIONS
from app.db.repositories import users
from app.core.security import create_access_token
from app.models.user import Role


@pytest.mark.asyncio
async def test_loyalty_program_full_lifecycle():
    # 1. Setup test customer user
    test_phone = "+919876543210"
    user = await users.by_phone(test_phone)
    if not user:
        user = await users.create_phone_user(phone=test_phone, role=Role.customer)
    customer_token, _ = create_access_token(user.id, Role.customer.value)

    # Clean up test user's loyalty and wallet records
    await database.collection(LOYALTY_SCRATCH_CARDS).delete_many({"userId": user.id})
    await database.collection(LOYALTY_ACCOUNTS).delete_many({"_id": user.id})
    await database.collection(LOYALTY_LEDGER).delete_many({"userId": user.id})
    await database.collection(WALLETS).delete_many({"user_id": user.id})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 2. Test Admin Config: Set Budget = ₹5000, Target Users = 500
        admin_token, _ = create_access_token(user.id, Role.admin.value)
        res_cfg = await client.put(
            "/api/loyalty/admin/config",
            json={
                "enabled": True,
                "totalBudget": 5000.0,
                "targetUserCount": 500,
                "minPoints": 50,
                "maxPoints": 150,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_cfg.status_code == 200, res_cfg.text
        cfg = res_cfg.json()["config"]
        assert cfg["totalBudget"] == 5000.0
        assert cfg["targetUserCount"] == 500
        assert cfg["avgRupeesPerOrder"] == 10.0
        assert cfg["avgPointsPerOrder"] == 100
        assert cfg["minPoints"] == 50
        assert cfg["maxPoints"] == 150

        # 3. Simulate Order Delivery: Trigger Scratch Card generation
        test_order = {
            "_id": "test-loyalty-ord-001",
            "id": "test-loyalty-ord-001",
            "code": "QP-LOY-001",
            "userId": user.id,
            "status": "delivered",
            "customer": {"id": user.id, "name": "Loyalty Tester"},
        }
        card = await loyalty_repository.issue_order_scratch_card(test_order)
        assert card is not None
        assert card["status"] == "unscratched"
        assert 50 <= card["points"] <= 150
        assert card["worthRupees"] == round(card["points"] / 10.0, 2)
        card_id = card["_id"]

        # 4. Check Customer Dashboard
        res_dash = await client.get(
            "/api/loyalty/dashboard",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_dash.status_code == 200
        dash = res_dash.json()
        assert dash["pointsBalance"] == 0
        assert dash["unscratchedCount"] >= 1
        assert any(c["id"] == card_id for c in dash["scratchCards"])

        # 5. Customer Scratches the Card
        res_scratch = await client.post(
            f"/api/loyalty/scratch/{card_id}",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_scratch.status_code == 200, res_scratch.text
        scratch_res = res_scratch.json()
        assert scratch_res["ok"] is True
        assert scratch_res["pointsAwarded"] == card["points"]
        assert scratch_res["totalPointsBalance"] == card["points"]

        # 6. Customer Redeems Points to Wallet at 100 points = ₹10 (e.g. 50 points = ₹5.00)
        points_to_redeem = 50
        res_redeem = await client.post(
            "/api/loyalty/redeem",
            json={"points": points_to_redeem},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_redeem.status_code == 200, res_redeem.text
        redeem_res = res_redeem.json()
        assert redeem_res["ok"] is True
        assert redeem_res["pointsRedeemed"] == 50
        assert redeem_res["rupeesCredited"] == 5.0
        assert redeem_res["newPointsBalance"] == card["points"] - 50
        assert redeem_res["newWalletBalance"] >= 5.0

        # 7. Check wallet reflects the credit
        res_wallet = await client.get(
            "/api/wallet",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_wallet.status_code == 200
        wallet_data = res_wallet.json()
        assert wallet_data["totalBalance"] >= 5.0

        # Clean up test records
        await database.collection(LOYALTY_SCRATCH_CARDS).delete_many({"userId": user.id})
        await database.collection(LOYALTY_ACCOUNTS).delete_many({"_id": user.id})
        await database.collection(LOYALTY_LEDGER).delete_many({"userId": user.id})
        await database.collection(WALLETS).delete_many({"user_id": user.id})
