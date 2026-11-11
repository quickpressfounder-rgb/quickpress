"""Pytest suite for QuickPress B2B Enterprise Operations Engine."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_b2b_enterprise_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register new commercial client lead
        reg_resp = await client.post(
            "/api/b2b/register",
            json={
                "businessName": "The Grand Heritage Palace Hotel",
                "category": "Hotel",
                "address": "45 Civil Lines",
                "city": "Kasganj",
                "pincode": "207123",
                "unitsCount": "85 Rooms",
                "contactName": "Vikram Rathore",
                "designation": "General Manager",
                "phone": "+919876543210",
                "email": "gm@grandheritage.com",
                "dailyVolume": "250-400 kg/day",
                "frequency": "Daily 1x",
                "services": ["Bed Linen", "Bath Towels", "Staff Uniforms"],
                "gstin": "09AAACG1234F1Z8",
                "pan": "AAACG1234F",
            },
        )
        assert reg_resp.status_code == 201
        reg_data = reg_resp.json()
        b2b_id = reg_data["b2bId"]
        assert b2b_id.startswith("QP-B2B-")

        # 2. Schedule 20 kg Free Commercial Trial
        trial_resp = await client.post(
            f"/api/b2b/admin/leads/{b2b_id}/trial",
            json={
                "trialDate": "2026-11-15",
                "pickupSlot": "10:00 AM - 12:00 PM",
                "trialKg": 20.0,
                "instructions": "Test wash hotel bed sheets & fluffy bath towels",
            },
        )
        assert trial_resp.status_code == 200

        # 3. 1-Click Convert Lead to Active Contract
        convert_resp = await client.post(f"/api/b2b/admin/leads/{b2b_id}/convert")
        assert convert_resp.status_code == 200

        # 4. Update Contract Rate Cards & Credit Terms
        contract_resp = await client.put(
            f"/api/b2b/admin/clients/{b2b_id}/contract",
            json={
                "baseRatePerKg": 34.0,
                "itemizedRates": {
                    "Single Bed Sheet": 22.0,
                    "Double / King Bed Sheet": 32.0,
                    "Pillow Cover": 8.0,
                    "Bath Towel": 14.0,
                },
                "addons": {
                    "starchStiffFinish": 7.0,
                    "severeStainRemoval": 18.0,
                    "expressSurchargePct": 25.0,
                },
                "billingCycle": "MONTHLY",
                "creditTerms": "NET_15_DAYS",
                "creditLimit": 75000.0,
                "autoHoldEnabled": True,
                "assignedHubName": "Kasganj Industrial Hub",
                "sla": "24 Hours Express",
                "notes": "Premium commercial hotel rate card signed",
            },
        )
        assert contract_resp.status_code == 200
        assert contract_resp.json()["contract"]["baseRatePerKg"] == 34.0

        # 5. Create Bulk Order with Multi-Bag QR Seals
        order_resp = await client.post(
            "/api/b2b/admin/orders",
            json={
                "b2bId": b2b_id,
                "pickupDate": "2026-11-12",
                "pickupSlot": "08:30 AM - 10:30 AM",
                "estimatedKg": 180.0,
                "bagCount": 3,
                "serviceType": "Commercial Linen Wash & Press",
                "specialInstructions": "Gate 2 Loading Bay pickup",
            },
        )
        assert order_resp.status_code == 201
        order_data = order_resp.json()["order"]
        order_code = order_data["orderCode"]
        assert len(order_data["bagBarcodes"]) == 3
        assert order_data["bagBarcodes"][0] == f"{order_code}-BAG-1/3"

        # 6. Assign Logistics Cargo Driver
        assign_resp = await client.patch(
            f"/api/b2b/admin/orders/{order_code}/assign",
            json={
                "driverId": "RIDER-CARGO-99",
                "driverName": "Mukesh Sharma",
                "driverPhone": "+919811122233",
                "vehicleType": "cargo",
                "hubName": "Kasganj Commercial Hub",
            },
        )
        assert assign_resp.status_code == 200

        # 7. Record Doorstep Weigh-in
        doorstep_resp = await client.patch(
            f"/api/b2b/admin/orders/{order_code}/weigh-in",
            json={
                "stage": "doorstep",
                "scaleWeightKg": 182.5,
                "bagBarcodes": order_data["bagBarcodes"],
            },
        )
        assert doorstep_resp.status_code == 200

        # 8. Record Hub Weigh-in (with tare weight & variance calculation)
        hub_resp = await client.patch(
            f"/api/b2b/admin/orders/{order_code}/weigh-in",
            json={
                "stage": "hub",
                "scaleWeightKg": 185.0,
                "tareWeightKg": 3.0,  # Net 182.0 kg (variance vs 182.5 kg doorstep is 0.27% safe)
                "bagBarcodes": order_data["bagBarcodes"],
            },
        )
        assert hub_resp.status_code == 200
        weigh_data = hub_resp.json()["order"]
        assert weigh_data["varianceStatus"] == "SAFE"
        assert weigh_data["netKg"] == 182.0

        # 9. Deliver Order with Proof of Delivery
        deliver_resp = await client.post(
            f"/api/b2b/admin/orders/{order_code}/deliver",
            json={
                "storekeeperName": "Dinesh Kumar (Head Housekeeping)",
                "signatureUrl": "https://storage.quickpress.online/signatures/sig-102.png",
                "bayPhotoUrl": "https://storage.quickpress.online/photos/bay-102.jpg",
                "notes": "Clean linen count verified by storekeeper",
            },
        )
        assert deliver_resp.status_code == 200

        # 10. Compile Monthly GST B2B Tax Invoice (HSN 9987)
        inv_resp = await client.post(
            "/api/b2b/admin/invoices/generate",
            json={
                "b2bId": b2b_id,
                "billingPeriod": "November 2026",
                "orderIds": [order_code],
            },
        )
        assert inv_resp.status_code == 201
        inv_data = inv_resp.json()["invoice"]
        invoice_id = inv_data["invoiceNumber"]
        assert invoice_id.startswith("QP-INV-B2B-")
        assert inv_data["cgst"] > 0
        assert inv_data["sgst"] > 0
        assert inv_data["items"][0]["sac"] == "9987"

        # 11. Download PDF Tax Invoice
        pdf_resp = await client.get(f"/api/b2b/admin/invoices/{invoice_id}/pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert len(pdf_resp.content) > 1000

        # 12. Record Offline Bank UTR Payment
        pay_resp = await client.post(
            f"/api/b2b/admin/invoices/{invoice_id}/pay",
            json={
                "utrNumber": "HDFCR520261115009182",
                "amount": inv_data["totalAmount"],
                "bankName": "HDFC Bank Corporate Transfer",
                "mode": "RTGS",
                "remarks": "November 2026 Linen Bill Cleared in Full",
            },
        )
        assert pay_resp.status_code == 200
        assert pay_resp.json()["invoiceStatus"] == "PAID"

        # 13. Verify Dashboard Stats
        stats_resp = await client.get("/api/b2b/admin/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["activeAccounts"] >= 1
