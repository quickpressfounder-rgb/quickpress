"""Automated tests for Customer & Partner Invoice Engine — PDF download & API flow."""

import pytest
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.client import database
from app.db.invoice_repositories import INVOICES, ORDERS, invoice_repository
from app.core.security import create_access_token
from app.models.user import Role, User


@pytest.mark.asyncio
async def test_customer_and_partner_invoice_flow():
    """Verify customer and partner can both retrieve invoice and stream PDF with token."""
    # 1. Setup sample test order in customer_orders
    order_id = "test-ord-inv-999"
    order_code = "QP-INV-999"
    customer_id = "cust-user-999"
    partner_id = "partner-hub-999"

    # Clean up previous runs
    await database.collection(ORDERS).delete_many({"_id": {"$in": [order_id, order_code]}})
    await database.collection(INVOICES).delete_many({"_id": {"$in": [f"inv-{order_code}", f"inv-{order_id}"]}})

    test_order = {
        "_id": order_id,
        "id": order_id,
        "code": order_code,
        "userId": customer_id,
        "status": "delivered",
        "serviceLabel": "Premium Dry Clean & Press",
        "customer": {
            "id": customer_id,
            "name": "Aarav Sharma",
            "phone": "+919876500001",
        },
        "partner": {
            "id": partner_id,
            "name": "QuickPress Kasganj Central Store",
            "phone": "+919876500002",
            "city": "Kasganj",
            "addressLine": "Shop 12, Main Market, Kasganj",
        },
        "address": {
            "line": "Flat 4B, Green Park",
            "city": "Kasganj",
        },
        "items": [
            {"id": "item-1", "name": "Silk Shirt Clean & Iron", "service": "Dry Clean", "qty": 2, "price": 120.0},
            {"id": "item-2", "name": "Woolen Blazer", "service": "Dry Clean", "qty": 1, "price": 260.0},
        ],
        "totals": {
            "itemsTotal": 500.0,
            "discount": 50.0,
            "delivery": 40.0,
            "pickup": 40.0,
            "handling": 20.0,
            "gst": 99.0,
            "grandTotal": 649.0,
        },
        "payment": {
            "method": "upi",
            "paid": True,
            "label": "Google Pay (UPI)",
            "transactionId": "TXN-UPI-999888777",
        },
        "createdAt": "2026-09-08T10:00:00Z",
    }
    from app.db.repositories import users

    # Create real users in database
    cust_user = await users.by_id(customer_id)
    if not cust_user:
        cust_user = await users.create_phone_user(phone="+919876500001", role=Role.customer)
        customer_id = cust_user.id
        test_order["userId"] = customer_id
        test_order["customer"]["id"] = customer_id

    partner_user = await users.by_id(partner_id)
    if not partner_user:
        partner_user = await users.create_phone_user(phone="+919876500002", role=Role.partner)
        partner_id = partner_user.id
        test_order["partner"]["id"] = partner_id

    await database.collection(ORDERS).insert_one(test_order)

    # 2. Generate tokens for Customer and Partner
    cust_token, _ = create_access_token(customer_id, Role.customer.value)
    partner_token, _ = create_access_token(partner_id, Role.partner.value)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Customer fetches invoice JSON for order
        res = await client.get(
            f"/api/orders/{order_id}/invoice",
            headers={"Authorization": f"Bearer {cust_token}"},
        )
        assert res.status_code == 200, res.text
        inv_data = res.json()
        assert inv_data["orderNumber"] == order_code
        assert inv_data["customer"]["name"] == "Aarav Sharma"
        assert inv_data["partner"]["name"] == "QuickPress Kasganj Central Store"
        assert inv_data["totals"]["grandTotal"] == 649.0
        invoice_id = inv_data["id"]

        # B. Customer streams PDF with Bearer header
        res_pdf = await client.get(
            f"/api/invoices/{invoice_id}/pdf",
            headers={"Authorization": f"Bearer {cust_token}"},
        )
        assert res_pdf.status_code == 200
        assert res_pdf.headers["content-type"] == "application/pdf"
        assert res_pdf.content.startswith(b"%PDF")

        # C. Customer streams PDF with token in query param (for window.open)
        res_pdf_param = await client.get(f"/api/invoices/{invoice_id}/pdf?token={cust_token}")
        assert res_pdf_param.status_code == 200
        assert res_pdf_param.content.startswith(b"%PDF")

        # D. Partner fetches invoice JSON via partner endpoint
        res_part = await client.get(
            f"/api/partner/orders/{order_id}/invoice",
            headers={"Authorization": f"Bearer {partner_token}"},
        )
        assert res_part.status_code == 200, res_part.text
        part_inv_data = res_part.json()
        assert part_inv_data["orderNumber"] == order_code
        assert part_inv_data["totals"]["grandTotal"] == 649.0

        # E. Partner streams PDF for order
        res_part_pdf = await client.get(
            f"/api/partner/orders/{order_id}/invoice/pdf?token={partner_token}"
        )
        assert res_part_pdf.status_code == 200
        assert res_part_pdf.content.startswith(b"%PDF")

        # F. Verify 3-page structure with PyMuPDF
        doc = fitz.open(stream=res_part_pdf.content, filetype="pdf")
        assert len(doc) == 3
        text_all = "".join(page.get_text() for page in doc)
        assert "Payment Summary" in text_all
        assert "Tax Invoice" in text_all
        assert "QuickPress Technologies Private Limited" in text_all
        assert "649.00" in text_all
        assert "Aarav Sharma" in text_all

        # G. Admin fetches invoice JSON and streams PDF via admin endpoints
        admin_user = await users.by_phone("+919876500099")
        if not admin_user:
            admin_user = await users.create_phone_user(phone="+919876500099", role=Role.admin)
        admin_token, _ = create_access_token(admin_user.id, Role.admin.value)
        res_admin_inv = await client.get(
            f"/api/admin/orders/{order_id}/invoice",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin_inv.status_code == 200, res_admin_inv.text
        assert res_admin_inv.json()["orderNumber"] == order_code

        res_admin_pdf = await client.get(
            f"/api/admin/orders/{order_id}/invoice/pdf",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin_pdf.status_code == 200
        assert res_admin_pdf.content.startswith(b"%PDF")

        res_admin_pdf_token = await client.get(
            f"/api/orders/{order_id}/invoice/pdf?token={admin_token}"
        )
        assert res_admin_pdf_token.status_code == 200
        assert res_admin_pdf_token.content.startswith(b"%PDF")

        # H. Verify Admin Order Details endpoint returns accurate timeline with Order Placed done
        res_admin_order = await client.get(
            f"/api/admin/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin_order.status_code == 200
        admin_order_data = res_admin_order.json()
        assert "timeline" in admin_order_data
        timeline = admin_order_data["timeline"]
        assert len(timeline) >= 8
        placed_step = next((s for s in timeline if s["id"] == "placed"), None)
        assert placed_step is not None
        assert placed_step["done"] is True
        assert placed_step["at"] != ""

        # I. Clean up test order & invoice
        await database.collection(ORDERS).delete_many({"_id": {"$in": [order_id, order_code]}})
        await database.collection(INVOICES).delete_many({"_id": {"$in": [f"inv-{order_code}", f"inv-{order_id}"]}})


@pytest.mark.asyncio
async def test_cancelled_order_has_no_invoice():
    """Cancelled orders must not generate, list, or download invoices."""
    order_id = "test-ord-canc-001"
    order_code = "QP-CANC-001"
    customer_id = "cust-user-canc-001"
    partner_id = "partner-hub-canc-001"

    # Clean up previous runs
    await database.collection(ORDERS).delete_many({"_id": {"$in": [order_id, order_code]}})
    await database.collection(INVOICES).delete_many({"_id": {"$in": [f"inv-{order_code}", f"inv-{order_id}"]}})

    from app.db.repositories import users
    cust_user = await users.by_phone("+919876500077")
    if not cust_user:
        cust_user = await users.create_phone_user(phone="+919876500077", role=Role.customer)
    customer_id = cust_user.id

    test_order = {
        "_id": order_id,
        "id": order_id,
        "code": order_code,
        "userId": customer_id,
        "status": "cancelled",
        "serviceLabel": "Standard Wash & Iron",
        "customer": {
            "id": customer_id,
            "name": "Cancelled Test User",
            "phone": "+919876500077",
        },
        "partner": {
            "id": partner_id,
            "name": "QuickPress Store",
            "phone": "+919876500078",
            "city": "Kasganj",
        },
        "address": {"line": "Street 1", "city": "Kasganj"},
        "items": [{"id": "item-1", "name": "Shirt", "qty": 1, "price": 50.0}],
        "totals": {"itemsTotal": 50.0, "grandTotal": 50.0},
        "payment": {"method": "cod", "paid": False},
    }

    await database.collection(ORDERS).insert_one(test_order)

    cust_token, _ = create_access_token(customer_id, Role.customer.value)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Invoice list must NOT contain the cancelled order
        res_list = await client.get(
            "/api/invoices",
            headers={"Authorization": f"Bearer {cust_token}"},
        )
        assert res_list.status_code == 200
        items = res_list.json()["items"]
        assert all(item["orderNumber"] != order_code for item in items)
        assert all(item["status"] != "cancelled" for item in items)

        # 2. Direct order invoice endpoint must return 400
        res_inv = await client.get(
            f"/api/orders/{order_id}/invoice",
            headers={"Authorization": f"Bearer {cust_token}"},
        )
        assert res_inv.status_code == 400

    # Clean up
    await database.collection(ORDERS).delete_many({"_id": {"$in": [order_id, order_code]}})
    await database.collection(INVOICES).delete_many({"_id": {"$in": [f"inv-{order_code}", f"inv-{order_id}"]}})
