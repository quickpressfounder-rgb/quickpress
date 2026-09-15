import asyncio
import pytest
from app.db.client import database
from app.db.wallet_repositories import WalletError, wallet_repository
from app.models.user import Role, User, UserStatus


@pytest.mark.asyncio
async def test_wallet_concurrency_race_condition_prevented():
    """Verify that concurrent debits cannot double-spend or overdraft wallet balance."""
    user = User(
        id="test-concurrent-wallet-user",
        firebase_uid="fb-wallet-user-1",
        role=Role.customer,
        status=UserStatus.active,
    )
    # Seed wallet with exactly ₹100
    await database.update(
        "wallets",
        {"user_id": user.id},
        {
            "_id": f"wallet:{user.id}",
            "user_id": user.id,
            "balance": 100.0,
            "currency": "INR",
        },
        upsert=True,
    )

    # Launch 5 concurrent debits of ₹100 each in parallel
    async def attempt_debit(idx: int):
        try:
            res = await wallet_repository.debit(
                user=user,
                amount=100.0,
                description=f"Concurrent order {idx}",
                reference=f"order-concurrent-{idx}",
            )
            return True, res
        except (WalletError, ValueError) as err:
            return False, str(err)

    results = await asyncio.gather(
        attempt_debit(1),
        attempt_debit(2),
        attempt_debit(3),
        attempt_debit(4),
        attempt_debit(5),
    )

    successes = [r for r in results if r[0] is True]
    failures = [r for r in results if r[0] is False]

    # Exactly ONE debit can succeed; remaining 4 must fail!
    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(failures) == 4, f"Expected 4 failures, got {len(failures)}"

    # Check final balance in DB
    wallet = await database.find_one("wallets", {"user_id": user.id})
    assert wallet["balance"] == 0.0, f"Final balance should be 0.0, got {wallet['balance']}"
