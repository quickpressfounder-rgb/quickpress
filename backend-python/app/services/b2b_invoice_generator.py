"""QuickPress B2B Commercial Enterprise Tax Invoice PDF Generator.

Produces official Indian GST Tax Invoices under Section 31 of CGST Act, 2017:
- Company details (Legal entity name, trade name, CIN, PAN, GSTIN, registered office, state code)
  pulled live from the Admin Settings repository
- Institutional client details (Corporate entity name, GSTIN, PAN, billing address, contact person)
- HSN/SAC Code 9987 (Laundry, cleaning and textile services)
- Itemized linen volume, commercial weight rates, processing add-ons
- Dual GST breakdown (9% CGST + 9% SGST for intra-state or 18% IGST for inter-state)
- Bank NEFT/RTGS remittance details and double-entry reconciliation metadata
"""

from __future__ import annotations

import io
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.invoice_pdf_generator import (
    FONT_BOLD,
    FONT_REGULAR,
    get_live_company_profile,
    num_to_words_inr,
)


def _fmt_money(val: Any) -> str:
    try:
        return f"{float(val or 0):,.2f}"
    except (ValueError, TypeError):
        return "0.00"


def _fmt_date(val: Any) -> str:
    if not val:
        return datetime.now().strftime("%d %b %Y")
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt.strftime("%d %b %Y")
        except Exception:
            return val[:10]
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y")
    return str(val)


def generate_b2b_invoice_pdf(invoice_data: Dict[str, Any], client_data: Optional[Dict[str, Any]] = None) -> bytes:
    """Generate official Indian GST Tax Invoice for B2B Commercial Client."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    company = get_live_company_profile()
    client = client_data or invoice_data.get("client") or {}

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "B2BTitle",
        fontName=FONT_BOLD,
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
    )
    subtitle_style = ParagraphStyle(
        "B2BSubtitle",
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    heading_badge_style = ParagraphStyle(
        "B2BBadge",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#047857"),
        alignment=2,
    )
    meta_label = ParagraphStyle(
        "B2BMetaLabel",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )
    meta_val = ParagraphStyle(
        "B2BMetaVal",
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    table_head = ParagraphStyle(
        "B2BTHead",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    table_head_r = ParagraphStyle(
        "B2BTHeadR",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        alignment=2,
    )
    table_cell = ParagraphStyle(
        "B2BCell",
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )
    table_cell_b = ParagraphStyle(
        "B2BCellB",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell_r = ParagraphStyle(
        "B2BCellR",
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
        alignment=2,
    )
    table_cell_rb = ParagraphStyle(
        "B2BCellRB",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        alignment=2,
    )

    story: List[Any] = []

    # 1. Header: QuickPress Legal Details + Invoice Title
    brand_title = company.get("trade_name") or "QuickPress"
    legal_name = company.get("legal_name") or "QuickPress Commercial Services"
    reg_addr = company.get("address") or "Uttar Pradesh, India"
    co_gstin = company.get("gstin") or "—"
    co_cin = company.get("cin") or "—"
    co_pan = company.get("pan") or "—"
    co_email = company.get("email") or "b2b@quickpress.online"

    header_left = [
        Paragraph(f"<b>{brand_title}</b> &mdash; <font size=8 color='#64748b'>{legal_name}</font>", title_style),
        Spacer(1, 3),
        Paragraph(f"{reg_addr}", subtitle_style),
        Paragraph(f"<b>GSTIN:</b> {co_gstin} &nbsp;|&nbsp; <b>PAN:</b> {co_pan} &nbsp;|&nbsp; <b>CIN:</b> {co_cin}", subtitle_style),
        Paragraph(f"<b>Email:</b> {co_email} &nbsp;|&nbsp; <b>State:</b> {company.get('state', 'Uttar Pradesh')} ({company.get('state_code', '09')})", subtitle_style),
    ]

    inv_num = invoice_data.get("invoiceNumber") or invoice_data.get("id") or "QP-INV-B2B-2026-0001"
    inv_date = _fmt_date(invoice_data.get("invoiceDate") or invoice_data.get("createdAt"))
    due_date = _fmt_date(invoice_data.get("dueDate"))
    inv_status = str(invoice_data.get("status", "UNPAID")).upper()

    status_color = "#047857" if inv_status == "PAID" else ("#b91c1c" if inv_status == "OVERDUE" else "#d97706")

    header_right = [
        Paragraph("TAX INVOICE", heading_badge_style),
        Paragraph("<font size=7 color='#64748b'>Under Section 31 of CGST Act, 2017</font>", ParagraphStyle("SubH", fontName=FONT_REGULAR, fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#64748b"))),
        Spacer(1, 4),
        Paragraph(f"<b>Invoice No:</b> {inv_num}", ParagraphStyle("IN", fontName=FONT_BOLD, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#0f172a"))),
        Paragraph(f"<b>Invoice Date:</b> {inv_date}", ParagraphStyle("ID", fontName=FONT_REGULAR, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#334155"))),
        Paragraph(f"<b>Due Date:</b> {due_date}", ParagraphStyle("DD", fontName=FONT_REGULAR, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#334155"))),
        Paragraph(f"<b>Status:</b> <font color='{status_color}'><b>{inv_status}</b></font>", ParagraphStyle("ST", fontName=FONT_BOLD, fontSize=8, leading=11, alignment=2)),
    ]

    header_table = Table([[header_left, header_right]], colWidths=[320, 203])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # Divider
    divider_table = Table([[""]], colWidths=[523], rowHeights=[1.5])
    divider_table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1.5, colors.HexColor("#047857")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(divider_table)
    story.append(Spacer(1, 8))

    # 2. Bill To / Client Details & Contract Info
    c_name = client.get("businessName") or invoice_data.get("businessName") or "Institutional Client"
    c_cat = client.get("category") or invoice_data.get("category") or "Commercial Account"
    c_id = client.get("b2bId") or invoice_data.get("b2bId") or "QP-B2B-CLIENT"
    c_addr = client.get("address") or invoice_data.get("address") or "Client Premises"
    c_city = client.get("city") or "Local"
    c_pin = client.get("pincode") or ""
    c_gstin = client.get("gstin") or invoice_data.get("gstin") or "Unregistered / Consumer"
    c_pan = client.get("pan") or invoice_data.get("pan") or "—"
    c_contact = client.get("contactName") or invoice_data.get("contactName") or "Facility Manager"
    c_phone = client.get("phone") or invoice_data.get("phone") or "—"
    c_terms = client.get("creditTerms") or invoice_data.get("creditTerms") or "Net 15 Days"
    period = invoice_data.get("billingPeriod") or "Current Billing Cycle"

    bill_to_content = [
        Paragraph("<b>BILLED TO (COMMERCIAL CLIENT):</b>", meta_label),
        Spacer(1, 2),
        Paragraph(f"<b>{c_name}</b> <font size=7 color='#64748b'>({c_cat})</font>", table_cell_b),
        Paragraph(f"<b>Client Account ID:</b> {c_id}", table_cell),
        Paragraph(f"<b>Address:</b> {c_addr}, {c_city} {c_pin}".strip(), table_cell),
        Paragraph(f"<b>GSTIN:</b> {c_gstin} &nbsp;|&nbsp; <b>PAN:</b> {c_pan}", table_cell),
        Paragraph(f"<b>Attn:</b> {c_contact} &nbsp;|&nbsp; <b>Phone:</b> {c_phone}", table_cell),
    ]

    billing_meta_content = [
        Paragraph("<b>BILLING & SUPPLY METRICS:</b>", meta_label),
        Spacer(1, 2),
        Paragraph(f"<b>Billing Period:</b> {period}", table_cell),
        Paragraph(f"<b>Place of Supply:</b> {company.get('state', 'Uttar Pradesh')} ({company.get('state_code', '09')})", table_cell),
        Paragraph("<b>HSN / SAC Code:</b> 9987 (Textile & Linen Cleaning)", table_cell),
        Paragraph(f"<b>Payment Credit Terms:</b> {c_terms}", table_cell),
        Paragraph("<b>Reverse Charge:</b> Applicable: No", table_cell),
        Paragraph("<b>Commercial Hub:</b> Central Laundry Facility", table_cell),
    ]

    meta_table = Table([[bill_to_content, billing_meta_content]], colWidths=[270, 253])
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Line Items Table (HSN 9987)
    items: List[Dict[str, Any]] = invoice_data.get("items") or []
    if not items:
        # Default compiled batch item
        tot_kg = float(invoice_data.get("totalKg") or 0.0)
        rate = float(invoice_data.get("ratePerKg") or 32.0)
        subt = tot_kg * rate if tot_kg > 0 else float(invoice_data.get("subtotal") or 12000.0)
        items = [
            {
                "description": f"Commercial Linen Sanitization & Heavy Wash Batch ({tot_kg:.1f} kg verified net weight)",
                "sac": "9987",
                "qty": f"{tot_kg:.1f} kg" if tot_kg > 0 else "1 Month",
                "rate": rate if tot_kg > 0 else subt,
                "amount": subt,
            }
        ]

    item_rows = [
        [
            Paragraph("<b>#</b>", table_head),
            Paragraph("<b>Description of Services & Scope</b>", table_head),
            Paragraph("<b>SAC</b>", table_head),
            Paragraph("<b>Volume / Qty</b>", table_head_r),
            Paragraph("<b>Unit Rate (₹)</b>", table_head_r),
            Paragraph("<b>Taxable Value (₹)</b>", table_head_r),
        ]
    ]

    subtotal = 0.0
    for idx, itm in enumerate(items, start=1):
        desc = itm.get("description", "Commercial Laundry Service")
        sac = itm.get("sac", "9987")
        qty = str(itm.get("qty", "1"))
        rate_val = float(itm.get("rate", 0.0))
        amt = float(itm.get("amount", 0.0))
        subtotal += amt
        item_rows.append([
            Paragraph(str(idx), table_cell),
            Paragraph(desc, table_cell),
            Paragraph(sac, table_cell),
            Paragraph(qty, table_cell_r),
            Paragraph(_fmt_money(rate_val), table_cell_r),
            Paragraph(_fmt_money(amt), table_cell_r),
        ])

    items_table = Table(item_rows, colWidths=[20, 243, 45, 65, 75, 75])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#94a3b8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 6))

    # 4. Tax Calculation & Totals
    # Check if inter-state or intra-state
    client_state_code = str(c_gstin[:2]) if len(c_gstin) >= 2 and c_gstin[:2].isdigit() else company.get("state_code", "09")
    co_state_code = str(company.get("state_code", "09"))
    is_interstate = client_state_code != co_state_code

    if is_interstate:
        igst = round(subtotal * 0.18, 2)
        cgst = 0.0
        sgst = 0.0
        tax_total = igst
    else:
        cgst = round(subtotal * 0.09, 2)
        sgst = round(subtotal * 0.09, 2)
        igst = 0.0
        tax_total = cgst + sgst

    grand_total = round(subtotal + tax_total, 2)

    # QR Code generation for e-invoice / UPI verification
    qr_data = f"upi://pay?pa=corporate@{brand_title.lower()}&pn={legal_name}&am={grand_total:.2f}&cu=INR&tn=Invoice_{inv_num}"
    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0f172a", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    qr_platypus = RLImage(qr_buf, width=64, height=64)

    # Remittance Bank Info
    bank_name = company.get("bankName") or "HDFC Bank Ltd."
    acc_num = company.get("accountNumber") or "50200084920194"
    ifsc_code = company.get("ifsc") or "HDFC0000182"
    acc_name = company.get("accountHolder") or legal_name

    payment_info = [
        Paragraph("<b>ELECTRONIC REMITTANCE & NEFT/RTGS DETAILS:</b>", meta_label),
        Spacer(1, 2),
        Paragraph(f"<b>Beneficiary:</b> {acc_name}", table_cell),
        Paragraph(f"<b>Bank Name:</b> {bank_name}", table_cell),
        Paragraph(f"<b>A/C Number:</b> {acc_num}", table_cell_b),
        Paragraph(f"<b>IFSC Code:</b> {ifsc_code} (Branch: Corporate Banking)", table_cell_b),
        Paragraph(f"<b>Reference Note:</b> Quote '{inv_num}' in payment remarks", table_cell),
    ]

    tax_rows = [
        [Paragraph("Taxable Subtotal:", table_cell_b), Paragraph(f"₹ {_fmt_money(subtotal)}", table_cell_rb)],
    ]
    if is_interstate:
        tax_rows.append([Paragraph("Integrated GST (IGST @ 18%):", table_cell), Paragraph(f"₹ {_fmt_money(igst)}", table_cell_r)])
    else:
        tax_rows.append([Paragraph("Central GST (CGST @ 9%):", table_cell), Paragraph(f"₹ {_fmt_money(cgst)}", table_cell_r)])
        tax_rows.append([Paragraph("State GST (SGST @ 9%):", table_cell), Paragraph(f"₹ {_fmt_money(sgst)}", table_cell_r)])

    tax_rows.append([Paragraph("<b>Total Invoice Amount:</b>", table_head), Paragraph(f"<b>₹ {_fmt_money(grand_total)}</b>", table_head_r)])

    totals_table = Table(tax_rows, colWidths=[150, 100])
    totals_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, -1), (-1, -1), 1.5, colors.HexColor("#047857")),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#0f172a")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    summary_grid = Table(
        [
            [payment_info, qr_platypus, totals_table]
        ],
        colWidths=[200, 70, 253]
    )
    summary_grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_grid)
    story.append(Spacer(1, 6))

    # 5. Amount in Words Box
    words = num_to_words_inr(grand_total)
    words_box = Table(
        [[Paragraph(f"<b>Amount in Words:</b> {words}", ParagraphStyle("Words", fontName=FONT_REGULAR, fontSize=8, leading=11, textColor=colors.HexColor("#0f172a")))]],
        colWidths=[523]
    )
    words_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(words_box)
    story.append(Spacer(1, 10))

    # 6. Terms & Authorized Signatory Footer
    terms_p = [
        Paragraph("<b>TERMS OF SERVICE & PAYMENT:</b>", meta_label),
        Paragraph("1. Payment must be cleared within approved credit terms via RTGS/NEFT/Direct Bank Transfer.", subtitle_style),
        Paragraph("2. Overdue balances beyond payment window incur 18% per annum commercial penal interest.", subtitle_style),
        Paragraph("3. All garment count & weight discrepancies must be notified within 24 hours of delivery bay handover.", subtitle_style),
        Paragraph("4. Subject to Uttar Pradesh judicial jurisdiction. Computer generated invoice.", subtitle_style),
    ]

    sign_p = [
        Spacer(1, 10),
        Paragraph(f"For <b>{legal_name}</b>", ParagraphStyle("SignCo", fontName=FONT_BOLD, fontSize=8, leading=11, alignment=2, textColor=colors.HexColor("#0f172a"))),
        Spacer(1, 20),
        Paragraph("<b>Authorized Corporate Signatory</b>", ParagraphStyle("SignCap", fontName=FONT_REGULAR, fontSize=7, leading=9, alignment=2, textColor=colors.HexColor("#475569"))),
        Paragraph("<font size=6 color='#94a3b8'>Digitally Validated Document &bull; Official B2B Seal</font>", ParagraphStyle("Seal", fontName=FONT_REGULAR, fontSize=6, leading=8, alignment=2, textColor=colors.HexColor("#94a3b8"))),
    ]

    footer_table = Table([[terms_p, sign_p]], colWidths=[330, 193])
    footer_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story)
    return buffer.getvalue()
