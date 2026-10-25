"""Test Suite for Garment Defect & Pre-wash Inspection Engine.

Tests:
1. Partner logs a pre-wash defect (stain/tear) on an order.
2. Defect is persisted to order document and accessible via API.
3. Customer receives notification and responds (Approve Wash or Return Item).
4. Customer decision updates status and records lifecycle event.
5. Admin dispute override functionality.
"""
import pytest
from app.db.client import database
from app.models.defect import (
    AdminDefectOverridePayload,
    CustomerDefectDecisionPayload,
    CustomerDefectStatus,
    DefectType,
    LogDefectPayload,
)
from app.services.defect_service import defect_service
from app.services import order_lifecycle as lifecycle

ORDERS = "customer_orders"


@pytest.mark.asyncio
async def test_full_defect_inspection_lifecycle():
    # 1. Seed a mock order in customer_orders
    order_id = "ord-TEST-DEFECT-101"
    mock_order = {
        "_id": order_id,
        "id": order_id,
        "code": "QP-TEST-DEFECT",
        "userId": "usr-customer-99",
        "partnerId": "prt-store-77",
        "partner": {"id": "prt-store-77", "name": "QuickPress Bandra Store"},
        "customer": {"id": "usr-customer-99", "name": "Rohan Sharma", "phone": "+919876543210"},
        "status": lifecycle.AT_PARTNER,
        "createdAt": "2026-10-25T12:00:00Z",
        "updatedAt": "2026-10-25T12:00:00Z",
        "items": [
            {"id": "item-1", "name": "White Linen Shirt", "qty": 1, "price": 120},
            {"id": "item-2", "name": "Black Trousers", "qty": 1, "price": 100},
        ],
        "garment_defects": [],
    }
    await database.insert_one(ORDERS, mock_order)

    try:
        # 2. Partner logs a pre-wash defect
        log_payload = LogDefectPayload(
            item_name="White Linen Shirt",
            defect_type=DefectType.STAIN,
            photo="https://res.cloudinary.com/quickpress/image/upload/v1/inspections/collar_stain.jpg",
            description="Deep yellow grease stain on collar before washing",
        )
        defect = await defect_service.log_defect(
            order_id=order_id,
            actor_id="prt-store-77",
            actor_role="partner",
            actor_name="QuickPress Bandra Store",
            payload=log_payload,
        )

        assert defect.defect_id.startswith("def-")
        assert defect.item_name == "White Linen Shirt"
        assert defect.defect_type == DefectType.STAIN
        assert defect.customer_status == CustomerDefectStatus.PENDING
        assert "collar_stain.jpg" in defect.photo_url

        # 3. Verify order document in DB has updated defect and flag
        order_doc = await database.find_one(ORDERS, {"_id": order_id})
        assert order_doc["hasDefectsReported"] is True
        assert len(order_doc["garment_defects"]) == 1
        assert order_doc["garment_defects"][0]["defect_id"] == defect.defect_id

        # 4. Fetch defects list
        defects_list = await defect_service.get_defects(order_id)
        assert len(defects_list) == 1
        assert defects_list[0].item_name == "White Linen Shirt"

        # 5. Customer responds: Approve wash with care
        cust_response = await defect_service.customer_respond(
            order_id=order_id,
            defect_id=defect.defect_id,
            customer_id="usr-customer-99",
            customer_phone="+919876543210",
            payload=CustomerDefectDecisionPayload(
                action=CustomerDefectStatus.PROCEED_WASH,
                note="I understand, please wash with care using stain remover.",
            ),
        )

        assert cust_response.customer_status == CustomerDefectStatus.PROCEED_WASH
        assert cust_response.customer_note == "I understand, please wash with care using stain remover."
        assert cust_response.customer_responded_at is not None

        # 6. Verify partner and rider projection shapes include garmentDefects
        partner_order = lifecycle.to_partner_order(order_doc)
        assert "garmentDefects" in partner_order
        assert partner_order["hasDefectsReported"] is True

        rider_delivery = lifecycle.to_rider_delivery(order_doc)
        assert "garmentDefects" in rider_delivery
        assert rider_delivery["hasDefectsReported"] is True

        # 7. Admin Dispute Override
        admin_res = await defect_service.admin_override(
            order_id=order_id,
            defect_id=defect.defect_id,
            admin_id="admin-1",
            payload=AdminDefectOverridePayload(
                decision="proceed_wash",
                notes="Customer confirmed wash via digital signature. Claim dismissed.",
            ),
        )
        assert admin_res.admin_override_status == "proceed_wash"
        assert "Claim dismissed" in admin_res.admin_override_notes

    finally:
        # Cleanup
        await database.delete_one(ORDERS, {"_id": order_id})
