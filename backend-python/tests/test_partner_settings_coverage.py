import pytest
from app.db.partner_repositories import partner_repository, PROFILES, SETTINGS
from app.db.client import database
from app.models.partner import BusinessSettingsResponse, BusinessSettingsUpdate


@pytest.mark.asyncio
async def test_partner_settings_coverage_and_timings():
    partner_id = "test-partner-coverage-001"
    
    # 1. Setup mock partner profile
    await database.update(
        PROFILES,
        {"_id": partner_id},
        {
            "_id": partner_id,
            "partnerId": partner_id,
            "businessName": "Super Clean Laundromat",
            "city": "Kasganj",
            "pincode": "207001",
            "pickupRadiusKm": 8,
            "isOnline": True,
        },
        upsert=True,
    )

    # 2. Fetch settings - verify defaults & backfill from profile
    settings_doc = await partner_repository.settings(partner_id)
    assert settings_doc is not None
    assert settings_doc.get("pickupRadiusKm") == 8
    assert "207001" in settings_doc.get("servicePincodes", [])

    # 3. Update settings with new coverage radius, pincodes, sectors, and timings
    update_payload = {
        "pickupRadiusKm": 12,
        "deliveryRadiusKm": 15,
        "servicePincodes": ["207001", "207123", "207124"],
        "sectors": ["Civil Lines", "Main Market", "Railway Colony"],
        "openingTime": "07:30",
        "closingTime": "22:00",
        "weeklyOff": "Sunday",
        "dailyOrderCap": 80,
    }
    updated_doc = await partner_repository.update_settings(partner_id, update_payload)
    
    # Verify response matches model
    resp = BusinessSettingsResponse(**{k: v for k, v in updated_doc.items() if k in BusinessSettingsResponse.model_fields})
    assert resp.pickupRadiusKm == 12
    assert resp.deliveryRadiusKm == 15
    assert resp.servicePincodes == ["207001", "207123", "207124"]
    assert resp.sectors == ["Civil Lines", "Main Market", "Railway Colony"]
    assert resp.openingTime == "07:30"
    assert resp.closingTime == "22:00"
    assert resp.weeklyOff == "Sunday"
    assert resp.dailyOrderCap == 80

    # 4. Verify dual-sync to partner_profiles
    profile = await database.find_one(PROFILES, {"_id": partner_id})
    assert profile is not None
    assert profile.get("pickupRadiusKm") == 12
    assert profile.get("radiusKm") == 12
    assert profile.get("deliveryRadiusKm") == 15
    assert profile.get("servicePincodes") == ["207001", "207123", "207124"]
    assert profile.get("sectors") == ["Civil Lines", "Main Market", "Railway Colony"]
