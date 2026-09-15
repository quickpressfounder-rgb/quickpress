from datetime import datetime, timezone
import pytest
from fastapi import HTTPException
from app.api.rider import push_location
from app.db.client import database
from app.models.user import Role, User, UserStatus


@pytest.mark.asyncio
async def test_mock_provider_rejected():
    """Mock provider signals (isMock, isFromMockProvider) are rejected with 403 Forbidden."""
    rider_user = User(
        id="rider-mock-user-1",
        firebase_uid="fb-rider-mock-1",
        role=Role.rider,
        status=UserStatus.active,
    )
    await database.update(
        "rider_profiles",
        {"_id": rider_user.id},
        {"_id": rider_user.id, "riderId": rider_user.id, "userId": rider_user.id, "fullName": "Mock Rider"},
        upsert=True,
    )

    # 1. Reject isMock = True
    with pytest.raises(HTTPException) as excinfo:
        await push_location(
            {"lat": 27.8118, "lng": 78.6477, "isMock": True},
            user=rider_user,
        )
    assert excinfo.value.status_code == 403
    assert "Mock Location detected" in excinfo.value.detail

    # 2. Reject isFromMockProvider = True
    with pytest.raises(HTTPException) as excinfo2:
        await push_location(
            {"lat": 27.8118, "lng": 78.6477, "isFromMockProvider": True},
            user=rider_user,
        )
    assert excinfo2.value.status_code == 403


@pytest.mark.asyncio
async def test_teleportation_jump_rejected():
    """Impossible distance jumps (>1.0 km in <20s or speed >150 km/h) are rejected with 403."""
    rider_user = User(
        id="rider-teleport-user-2",
        firebase_uid="fb-rider-teleport-2",
        role=Role.rider,
        status=UserStatus.active,
    )
    # Rider was in Kasganj 5 seconds ago
    recent_ts = datetime.now(timezone.utc).isoformat()
    await database.update(
        "rider_profiles",
        {"_id": rider_user.id},
        {
            "_id": rider_user.id,
            "riderId": rider_user.id,
            "userId": rider_user.id,
            "fullName": "Teleport Rider",
            "lat": 27.8118,
            "lng": 78.6477,
            "lastLocationAt": recent_ts,
        },
        upsert=True,
    )

    # Rider suddenly jumps 15 km away (Aligarh) 2 seconds later
    with pytest.raises(HTTPException) as excinfo:
        await push_location(
            {"lat": 27.9000, "lng": 78.0700, "isMock": False},
            user=rider_user,
        )
    assert excinfo.value.status_code == 403
    assert "Teleportation detected" in excinfo.value.detail or "Impossible speed" in excinfo.value.detail


@pytest.mark.asyncio
async def test_normal_velocity_accepted():
    """Realistic movement within normal speed limits is successfully accepted."""
    rider_user = User(
        id="rider-normal-user-3",
        firebase_uid="fb-rider-normal-3",
        role=Role.rider,
        status=UserStatus.active,
    )
    recent_ts = datetime.now(timezone.utc).isoformat()
    await database.update(
        "rider_profiles",
        {"_id": rider_user.id},
        {
            "_id": rider_user.id,
            "riderId": rider_user.id,
            "userId": rider_user.id,
            "fullName": "Normal Rider",
            "lat": 27.8118,
            "lng": 78.6477,
            "lastLocationAt": recent_ts,
        },
        upsert=True,
    )

    # Rider moves 20 meters down the street (realistic displacement)
    res = await push_location(
        {"lat": 27.8120, "lng": 78.6479, "isMock": False, "speed": 8.5},
        user=rider_user,
    )
    assert res is not None
