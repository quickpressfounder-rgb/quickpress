"""Automated Tax Invoice & Payment Summary PDF Generator tests."""

import io
import pytest
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.invoice_pdf_generator import build_invoice_pdf_payload, generate_invoice_pdf
from app.models.invoice import Invoice, InvoiceParty, InvoiceTotals, InvoiceGst, InvoicePayment


@pytest.mark.asyncio
async def test_invoice_pdf_generation():
    """Test generating 3-page tax invoice matching Rapido design."""
    sample_invoice = Invoice(
        id="inv-test-101",
        invoiceNumber="2627UP0027124245",
        orderId="ord-test-101",
        orderNumber="RD17821057521220686",
        status="paid",
        invoiceDate="2026-06-22T11:03:00Z",
        serviceLabel="Ride Charge",
        customer=InvoiceParty(
            name="Aarav Sharma",
            phone="+919876543210",
            addressLine="Kasganj, Uttar Pradesh 207123, India",
            city="Kasganj",
        ),
        partner=InvoiceParty(
            name="QuickPress Kasganj Hub",
            addressLine="RJGR+3M3, MDR 82W, Kasganj, Kiloni Rafaat Pur, Uttar Pradesh 207123, India",
            city="Kasganj",
        ),
        gst=InvoiceGst(
            gstin="09AAHCR1710J1ZE",
            placeOfSupply="Uttar Pradesh",
            taxRate=18.0,
            cgst=0.45,
            sgst=0.45,
            igst=0.0,
            totalTax=0.90,
        ),
        totals=InvoiceTotals(
            itemsTotal=18.82,
            deliveryCharge=1.18,
            grandTotal=20.00,
        ),
        payment=InvoicePayment(
            method="upi",
            methodLabel="UPI",
            status="paid",
        ),
        createdAt="2026-06-22T11:03:00Z",
    )

    sample_order = {
        "code": "RD17821057521220686",
        "distance": "2.28 kms",
        "duration": "5.92 mins",
        "riderName": "ANKIT SAHU",
    }

    payload = build_invoice_pdf_payload(sample_invoice, sample_order)
    pdf_bytes = generate_invoice_pdf(payload)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    # Verify 2 pages were created
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert len(doc) == 2

    # Check page 1 text (Tax Invoice on behalf of Laundromat Partner)
    page1_text = doc[0].get_text()
    assert "Tax Invoice" in page1_text
    assert "ORIGINAL For Recipient" in page1_text
    assert "RD17821057521220686" in page1_text
    assert "Kasganj" in page1_text
    assert "Aarav Sharma" in page1_text
    assert "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED" in page1_text

    # Check page 2 text (Tax Invoice by QuickPress Platform)
    page2_text = doc[1].get_text()
    assert "Tax Invoice" in page2_text
    assert "ORIGINAL FOR RECIPIENT" in page2_text
    assert "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED" in page2_text
    assert "999799" in page2_text
    assert "Platform fee" in page2_text
    assert "RD17821057521220686" in page2_text
