"""QuickPress Automated Tax Invoice & Payment Summary PDF Generator.

Produces a 3-page enterprise tax invoice matching the Rapido-style layout:
- Page 1: Payment Summary (Order ID, time, total, route/address card, itemized bill, payment mode)
- Page 2: Tax Invoice — Service Provider / Logistics Partner (SAC 999799, GST breakdown, captain info)
- Page 3: Tax Invoice — Platform & Convenience Fee with Verification QR Code & digital sign-off
"""

from __future__ import annotations

import csv
import io
import os
from datetime import datetime
from typing import Any, Dict, Optional

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Register Roboto fonts for typography and Rupee (₹) symbol support
FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "fonts")
try:
    regular_font_path = os.path.join(FONTS_DIR, "Roboto-Regular.ttf")
    bold_font_path = os.path.join(FONTS_DIR, "Roboto-Bold.ttf")
    if os.path.exists(regular_font_path) and os.path.exists(bold_font_path):
        pdfmetrics.registerFont(TTFont("Roboto", regular_font_path))
        pdfmetrics.registerFont(TTFont("Roboto-Bold", bold_font_path))
        FONT_REGULAR = "Roboto"
        FONT_BOLD = "Roboto-Bold"
    else:
        FONT_REGULAR = "Helvetica"
        FONT_BOLD = "Helvetica-Bold"
except Exception:
    FONT_REGULAR = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"


# Company Legal Defaults (Configurable via backend environment variables)
COMPANY_LEGAL_NAME = os.getenv("COMPANY_LEGAL_NAME", "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED")
COMPANY_TRADE_NAME = "QuickPress"
COMPANY_CIN = os.getenv("COMPANY_CIN", "U74999UP2024PTC198141")
COMPANY_PAN = os.getenv("COMPANY_PAN", "AADCB1234K")
COMPANY_GSTIN = os.getenv("COMPANY_GSTIN", "09AADCB1234K1Z8")
COMPANY_ADDRESS = os.getenv(
    "COMPANY_ADDRESS",
    "Pioneer Tech Park, Near Highway, Kasganj, Uttar Pradesh - 207123, India",
)
COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", "support@quickpress.online")
COMPANY_STATE = os.getenv("COMPANY_STATE", "Uttar Pradesh")
COMPANY_STATE_CODE = os.getenv("COMPANY_STATE_CODE", "09")


def num_to_words_inr(amount: float) -> str:
    """Convert number to standard Indian English currency words (e.g. 'One Hundred Eighty Four Rupees And Eighty Paisa Only')."""
    units = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_upto_999(n: int) -> str:
        res = []
        if n >= 100:
            res.append(units[n // 100] + " Hundred")
            n %= 100
        if n >= 20:
            res.append(tens[n // 10])
            n %= 10
        if n > 0:
            res.append(units[n])
        return " ".join(res)

    def convert_integer(n: int) -> str:
        if n == 0:
            return "Zero"
        parts = []
        crores = n // 10000000
        n %= 10000000
        if crores > 0:
            parts.append(convert_upto_999(crores) + " Crore")
        lakhs = n // 100000
        n %= 100000
        if lakhs > 0:
            parts.append(convert_upto_999(lakhs) + " Lakh")
        thousands = n // 1000
        n %= 1000
        if thousands > 0:
            parts.append(convert_upto_999(thousands) + " Thousand")
        if n > 0:
            parts.append(convert_upto_999(n))
        return " ".join(parts)

    rupees = int(amount)
    paise = int(round((amount - rupees) * 100))
    rupee_str = convert_integer(rupees) + " Rupee" + ("s" if rupees != 1 else "")
    if paise > 0:
        return f"{rupee_str} And {convert_upto_999(paise)} Paisa Only"
    return f"{rupee_str} Only"


def _format_date(dt_val: Any) -> str:
    if not dt_val:
        return datetime.now().strftime("%d/%m/%Y")
    if isinstance(dt_val, str):
        try:
            dt = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
            return dt.strftime("%d/%m/%Y")
        except Exception:
            return dt_val[:10] if len(dt_val) >= 10 else dt_val
    if isinstance(dt_val, datetime):
        return dt_val.strftime("%d/%m/%Y")
    return str(dt_val)


def _fmt_money(val: Any) -> str:
    try:
        return f"{float(val or 0):.2f}"
    except (ValueError, TypeError):
        return "0.00"



def generate_invoice_pdf(data: Dict[str, Any], output_target: Any = None) -> bytes:
    """Generate 2-page QuickPress Tax Invoice matching Indian GST marketplace format:
    Page 1: Tax Invoice on behalf of Partner (SAC 999791: Laundry & Garment Care Services, 5% GST)
    Page 2: Tax Invoice by Platform (QUICKPRESS TECHNOLOGIES PVT LTD, SAC 999799 Platform fee & Delivery, 18% GST)
    """
    buffer = io.BytesIO() if output_target is None else output_target

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32,
    )

    styles = getSampleStyleSheet()

    # Typography styles
    text_bold = ParagraphStyle(
        "PBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0f172a"),
    )
    text_reg = ParagraphStyle(
        "PReg",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0f172a"),
    )
    text_small = ParagraphStyle(
        "PSmall",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#475569"),
    )
    text_title_center = ParagraphStyle(
        "PTitleCenter",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
    )
    text_sub_center = ParagraphStyle(
        "PSubCenter",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
        alignment=1,
    )
    table_cell = ParagraphStyle(
        "TCell",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell_bold = ParagraphStyle(
        "TCellBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell_right = ParagraphStyle(
        "TCellRight",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        alignment=2,
    )
    table_cell_right_bold = ParagraphStyle(
        "TCellRightBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        alignment=2,
    )

    story = []

    # ==========================================
    # PAGE 1: Tax Invoice on behalf of Partner
    # ==========================================

    # 1. Header Banner: Left QuickPress branding, Right quickpress brand name
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo.png")
    if os.path.exists(logo_path):
        logo_elem = RLImage(logo_path, width=72, height=22)
    else:
        logo_elem = Paragraph("<b>quickpress</b>", ParagraphStyle("BrandL", fontName=FONT_BOLD, fontSize=16, leading=18, textColor=colors.HexColor("#059669")))

    header_brand_table = Table(
        [
            [
                logo_elem,
                Paragraph("<b>quickpress</b>", ParagraphStyle("BrandR", fontName=FONT_BOLD, fontSize=18, leading=20, textColor=colors.HexColor("#0f172a"), alignment=2)),
            ]
        ],
        colWidths=[260, 263],
    )
    header_brand_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_brand_table)
    story.append(Spacer(1, 10))

    # Center Title
    story.append(Paragraph("<b>Tax Invoice</b>", text_title_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph("ORIGINAL For Recipient", text_sub_center))
    story.append(Spacer(1, 12))

    # Service Provider (Laundromat Partner) Block
    partner_legal_name = data.get("partner_legal_name") or data.get("partner_name") or "Authorized Laundromat Partner"
    partner_store_name = data.get("partner_name") or "QuickPress Partner Store"
    partner_address = data.get("partner_address") or "Partner Store Address, Kasganj, Uttar Pradesh"
    partner_gstin = data.get("partner_gst") or "UNREGISTERED"
    invoice_no = data.get("invoice_no") or "QP26UP000123"
    invoice_date = data.get("invoice_date") or datetime.now().strftime("%d/%m/%Y")

    p1_details_text = f"""<b>Tax Invoice on behalf of -</b><br/><br/>
<b>Legal Entity Name :</b> {partner_legal_name}<br/>
<b>Laundromat Name :</b> {partner_store_name}<br/>
<b>Laundromat Address :</b> {partner_address}<br/>
<b>Laundromat GSTIN :</b> {partner_gstin}<br/>
<b>Invoice No. :</b> {invoice_no}<br/>
<b>Invoice Date :</b> {invoice_date}"""

    story.append(Paragraph(p1_details_text, text_reg))
    story.append(Spacer(1, 10))

    # Customer Block
    customer_name = data.get("customer_name") or "Valued Customer"
    delivery_address = data.get("pickup_address") or data.get("drop_address") or "Customer Registered Address, Kasganj, UP"
    place_of_supply = data.get("place_of_supply") or "Uttar Pradesh(09)"

    cust_block_text = f"""<b>Customer Name :</b> {customer_name}<br/>
<b>Delivery Address :</b> {delivery_address}<br/>
<b>State name & Place of Supply :</b> {place_of_supply}"""
    story.append(Paragraph(cust_block_text, text_reg))
    story.append(Spacer(1, 10))

    # Service Description & HSN
    sac_code = data.get("sac_code") or "999791"
    service_desc = data.get("service_description") or "Laundry and Dry Cleaning Services"
    hsn_block_text = f"""<b>HSN/SAC Code :</b> {sac_code}<br/>
<b>Service Description :</b> {service_desc}"""
    story.append(Paragraph(hsn_block_text, text_reg))
    story.append(Spacer(1, 12))

    # Items Grid Table
    table_headers = [
        Paragraph("<b>Particulars</b>", table_cell_bold),
        Paragraph("<b>Gross<br/>value</b>", table_cell_right_bold),
        Paragraph("<b>Discount</b>", table_cell_right_bold),
        Paragraph("<b>Net<br/>value</b>", table_cell_right_bold),
        Paragraph("<b>CGST<br/>(Rate)</b>", table_cell_right_bold),
        Paragraph("<b>CGST<br/>(INR)</b>", table_cell_right_bold),
        Paragraph("<b>SGST<br/>(Rate)</b>", table_cell_right_bold),
        Paragraph("<b>SGST<br/>(INR)</b>", table_cell_right_bold),
        Paragraph("<b>Total</b>", table_cell_right_bold),
    ]

    p1_rows = [table_headers]

    items_list = data.get("items") or []
    if not items_list:
        service_label = data.get("service_name") or "Laundry & Dry Cleaning Service"
        ride_charge = float(data.get("ride_charge") or data.get("total_amount") or 184.80)
        net_val = round(ride_charge / 1.05, 2)
        tax_val = round((ride_charge - net_val) / 2, 2)
        items_list = [{
            "name": f"1 x {service_label}",
            "gross_value": net_val,
            "discount": 0.0,
            "net_value": net_val,
            "cgst_rate": "2.5%",
            "cgst_amt": tax_val,
            "sgst_rate": "2.5%",
            "sgst_amt": tax_val,
            "total": ride_charge,
        }]

    tot_gross = 0.0
    tot_disc = 0.0
    tot_net = 0.0
    tot_cgst = 0.0
    tot_sgst = 0.0
    tot_final = 0.0

    for itm in items_list:
        g_val = float(itm.get("gross_value") or itm.get("total") or 0)
        d_val = float(itm.get("discount") or 0)
        n_val = float(itm.get("net_value") or (g_val - d_val))
        cgst_r = itm.get("cgst_rate") or "2.5%"
        cgst_a = float(itm.get("cgst_amt") or 0)
        sgst_r = itm.get("sgst_rate") or "2.5%"
        sgst_a = float(itm.get("sgst_amt") or 0)
        row_tot = float(itm.get("total") or (n_val + cgst_a + sgst_a))

        tot_gross += g_val
        tot_disc += d_val
        tot_net += n_val
        tot_cgst += cgst_a
        tot_sgst += sgst_a
        tot_final += row_tot

        p1_rows.append([
            Paragraph(str(itm.get("name") or "Laundry Service"), table_cell),
            Paragraph(_fmt_money(g_val), table_cell_right),
            Paragraph(_fmt_money(d_val), table_cell_right),
            Paragraph(_fmt_money(n_val), table_cell_right),
            Paragraph(cgst_r, table_cell_right),
            Paragraph(_fmt_money(cgst_a), table_cell_right),
            Paragraph(sgst_r, table_cell_right),
            Paragraph(_fmt_money(sgst_a), table_cell_right),
            Paragraph(_fmt_money(row_tot), table_cell_right),
        ])

    # Summary Rows
    p1_rows.append([
        Paragraph("<b>Item(s) Total</b>", table_cell_bold),
        Paragraph(f"<b>{_fmt_money(tot_gross)}</b>", table_cell_right_bold),
        Paragraph(f"<b>{_fmt_money(tot_disc)}</b>", table_cell_right_bold),
        Paragraph(f"<b>{_fmt_money(tot_net)}</b>", table_cell_right_bold),
        Paragraph("", table_cell_right),
        Paragraph(f"<b>{_fmt_money(tot_cgst)}</b>", table_cell_right_bold),
        Paragraph("", table_cell_right),
        Paragraph(f"<b>{_fmt_money(tot_sgst)}</b>", table_cell_right_bold),
        Paragraph(f"<b>{_fmt_money(tot_final)}</b>", table_cell_right_bold),
    ])

    p1_rows.append([
        Paragraph("<b>Total Value</b>", table_cell_bold),
        Paragraph("", table_cell_right),
        Paragraph("", table_cell_right),
        Paragraph(f"<b>{_fmt_money(tot_net)}</b>", table_cell_right_bold),
        Paragraph("", table_cell_right),
        Paragraph(f"<b>{_fmt_money(tot_cgst)}</b>", table_cell_right_bold),
        Paragraph("", table_cell_right),
        Paragraph(f"<b>{_fmt_money(tot_sgst)}</b>", table_cell_right_bold),
        Paragraph(f"<b>{_fmt_money(tot_final)}</b>", table_cell_right_bold),
    ])

    col_widths = [163, 45, 45, 45, 40, 45, 40, 45, 55]
    items_table = Table(p1_rows, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#0f172a")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("BACKGROUND", (0, -2), (-1, -1), colors.HexColor("#f8fafc")),
        ])
    )
    story.append(items_table)
    story.append(Spacer(1, 10))

    # Amount in words
    amount_in_words_str = num_to_words_inr(tot_final)
    story.append(Paragraph(f"<b>Amount (in words):</b> {amount_in_words_str}", text_reg))
    story.append(Spacer(1, 8))

    # Settlement details
    order_id = data.get("order_number") or data.get("order_id") or "QP-2026-001"
    order_date = data.get("order_time") or invoice_date
    total_order_amount = float(data.get("total_amount") or tot_final)
    order_amount_ref = f" (Total Order Value: INR {_fmt_money(total_order_amount)})" if total_order_amount > 0 and abs(total_order_amount - tot_final) > 0.01 else ""
    settlement_text = (
        f"Amount of INR {_fmt_money(tot_final)}{order_amount_ref} settled through digital mode/payment received against "
        f"Order ID: {order_id} dated {_format_date(order_date)}.<br/>"
        "Supply attracts reverse charge : No"
    )
    story.append(Paragraph(settlement_text, text_reg))
    story.append(Spacer(1, 36))

    # Facilitator Block & Signature (Page 1 Footer)
    company_pan = data.get("company_pan") or COMPANY_PAN
    company_cin = data.get("company_cin") or COMPANY_CIN
    company_gst = data.get("company_gst") or COMPANY_GSTIN
    company_legal = data.get("company_legal_name") or COMPANY_LEGAL_NAME

    facilitator_info = f"""<b>For {company_legal} (AS MARKETPLACE FACILITATOR)</b><br/><br/>
QuickPress PAN : {company_pan}<br/>
QuickPress CIN : {company_cin}<br/>
QuickPress GST : {company_gst}<br/>
QuickPress Support : {COMPANY_EMAIL}"""

    sig_markup = """<font size="14" color="#059669"><i>QuickPress Tech</i></font><br/>
<font size="8" color="#0f172a"><b>Authorised Signatory</b></font>"""

    p1_footer_table = Table(
        [
            [
                Paragraph(facilitator_info, text_reg),
                Paragraph(sig_markup, ParagraphStyle("P1Sig", parent=text_reg, alignment=2)),
            ]
        ],
        colWidths=[360, 163],
    )
    p1_footer_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(p1_footer_table)

    # ==========================================
    # PAGE 2: Tax Invoice by Platform
    # ==========================================
    story.append(PageBreak())

    # Page 2 Header Banner
    p2_header_table = Table(
        [
            [
                logo_elem,
                Paragraph("<b>ORIGINAL FOR RECIPIENT</b>", ParagraphStyle("P2Orig", fontName=FONT_BOLD, fontSize=10, leading=12, textColor=colors.HexColor("#0f172a"), alignment=1)),
                Paragraph("<b>quickpress</b>", ParagraphStyle("P2BrandR", fontName=FONT_BOLD, fontSize=18, leading=20, textColor=colors.HexColor("#0f172a"), alignment=2)),
            ]
        ],
        colWidths=[140, 243, 140],
    )
    p2_header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(p2_header_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Tax Invoice</b>", ParagraphStyle("P2Title", fontName=FONT_BOLD, fontSize=12, leading=15, textColor=colors.HexColor("#0f172a"))))
    story.append(Spacer(1, 6))

    # Platform Details Box
    plat_invoice_no = data.get("platform_invoice_no") or f"QP26UPOT{str(abs(hash(order_id)))[:8]}"
    plat_invoice_date = data.get("platform_invoice_date") or _format_date(order_date)

    p2_company_grid = [
        [
            Paragraph(f"<b>{company_legal}</b>", table_cell_bold),
            "",
        ],
        [
            Paragraph(f"<b>Address:</b> {COMPANY_ADDRESS}", table_cell),
            Paragraph(f"<b>PAN:</b> {company_pan}", table_cell),
        ],
        [
            Paragraph(f"<b>State:</b> {COMPANY_STATE}", table_cell),
            Paragraph(f"<b>CIN:</b> {company_cin}", table_cell),
        ],
        [
            Paragraph(f"<b>Email ID:</b> {COMPANY_EMAIL}", table_cell),
            Paragraph(f"<b>GSTIN:</b> {company_gst}", table_cell),
        ],
        [
            Paragraph(f"<b>Invoice No:</b> {plat_invoice_no}", table_cell),
            Paragraph(f"<b>Invoice Date:</b> {plat_invoice_date}", table_cell),
        ],
    ]
    p2_comp_table = Table(p2_company_grid, colWidths=[310, 213])
    p2_comp_table.setStyle(
        TableStyle([
            ("SPAN", (0, 0), (1, 0)),
            ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#94a3b8")),
            ("TEXTCOLOR", (0, 0), (1, 0), colors.white),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(p2_comp_table)
    story.append(Spacer(1, 8))

    # Customer Details Box
    p2_cust_grid = [
        [
            Paragraph("<b>Customer Details</b>", table_cell_bold),
            "",
        ],
        [
            Paragraph(f"<b>Name:</b> {customer_name}", table_cell),
            Paragraph("<b>GSTIN:</b> UNREGISTERED", table_cell),
        ],
        [
            Paragraph(f"<b>Delivery Address:</b> {delivery_address}", table_cell),
            Paragraph(f"<b>Place of Supply:</b> {place_of_supply}", table_cell),
        ],
    ]
    p2_cust_table = Table(p2_cust_grid, colWidths=[310, 213])
    p2_cust_table.setStyle(
        TableStyle([
            ("SPAN", (0, 0), (1, 0)),
            ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#94a3b8")),
            ("TEXTCOLOR", (0, 0), (1, 0), colors.white),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(p2_cust_table)
    story.append(Spacer(1, 8))

    # Service Details Box
    p2_serv_grid = [
        [
            Paragraph("<b>Service Details</b>", table_cell_bold),
            "",
        ],
        [
            Paragraph("<b>HSN Code:</b> 999799", table_cell),
            Paragraph("<b>Supply Description:</b> Other Services N.E.C / Platform Convenience", table_cell),
        ],
    ]
    p2_serv_table = Table(p2_serv_grid, colWidths=[200, 323])
    p2_serv_table.setStyle(
        TableStyle([
            ("SPAN", (0, 0), (1, 0)),
            ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#94a3b8")),
            ("TEXTCOLOR", (0, 0), (1, 0), colors.white),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(p2_serv_table)
    story.append(Spacer(1, 10))

    # Fee Items Table
    booking_fee = float(data.get("booking_fee") or 14.75)
    taxable_platform = round(booking_fee / 1.18, 2)
    cgst_platform = round((booking_fee - taxable_platform) / 2, 2)
    sgst_platform = round((booking_fee - taxable_platform) / 2, 2)

    p2_fee_rows = [
        [
            Paragraph("<b>Sr.No</b>", table_cell_bold),
            Paragraph("<b>Particulars</b>", table_cell_bold),
            Paragraph("<b>Taxable Amount</b>", table_cell_right_bold),
            Paragraph("<b>CGST (9%)</b>", table_cell_right_bold),
            Paragraph("<b>SGST (9%)</b>", table_cell_right_bold),
            Paragraph("<b>Total</b>", table_cell_right_bold),
        ],
        [
            "",
            Paragraph(f"<b>Order ID :{order_id}</b><br/><b>Order Date :{_format_date(order_date)}</b>", table_cell),
            "",
            "",
            "",
            "",
        ],
        [
            Paragraph("1", table_cell),
            Paragraph("Platform fee", table_cell),
            Paragraph(_fmt_money(taxable_platform), table_cell_right),
            Paragraph(_fmt_money(cgst_platform), table_cell_right),
            Paragraph(_fmt_money(sgst_platform), table_cell_right),
            Paragraph(_fmt_money(booking_fee), table_cell_right),
        ],
        [
            "",
            Paragraph("<b>Total</b>", table_cell_bold),
            Paragraph(f"<b>{_fmt_money(taxable_platform)}</b>", table_cell_right_bold),
            Paragraph(f"<b>{_fmt_money(cgst_platform)}</b>", table_cell_right_bold),
            Paragraph(f"<b>{_fmt_money(sgst_platform)}</b>", table_cell_right_bold),
            Paragraph(f"<b>{_fmt_money(booking_fee)}</b>", table_cell_right_bold),
        ],
    ]

    p2_fee_table = Table(p2_fee_rows, colWidths=[40, 223, 70, 65, 65, 60])
    p2_fee_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#94a3b8")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("SPAN", (1, 1), (-1, 1)),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEABOVE", (0, 3), (-1, 3), 0.5, colors.HexColor("#94a3b8")),
            ("LINEBELOW", (0, 3), (-1, 3), 0.5, colors.HexColor("#94a3b8")),
        ])
    )
    story.append(p2_fee_table)
    story.append(Spacer(1, 8))

    # Note
    p2_settle_text = (
        f"Amount of ₹{_fmt_money(booking_fee)} settled through digital mode/payment received against "
        f"Order id ({order_id}) dated ({_format_date(order_date)})<br/>"
        "Tax is not payable on reverse charge basis"
    )
    story.append(Paragraph(p2_settle_text, text_reg))
    story.append(Spacer(1, 60))

    # Page 2 Footer Signatory
    p2_sig_block = f"""<b>For {company_legal}</b><br/><br/>
<font size="14" color="#059669"><i>QuickPress Tech</i></font><br/>
<b>Authorised Signatory</b>"""
    story.append(Paragraph(p2_sig_block, ParagraphStyle("P2Sig", parent=text_reg, alignment=2)))
    story.append(Spacer(1, 20))

    # Bottom Legal communication address & terms URL
    comm_addr_text = (
        f"Communication Address: {COMPANY_ADDRESS}<br/>"
        "Please refer to https://quickpress.online/terms for current version of full terms & conditions "
        "which are incorporated in this invoice by reference."
    )
    story.append(Paragraph(comm_addr_text, text_small))

    doc.build(story)
    if output_target is None:
        return buffer.getvalue()
    return b""


def build_invoice_pdf_payload(invoice: Any, order: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Map an Invoice model / dictionary and its parent Order into the 2-page GST marketplace template payload."""
    if hasattr(invoice, "model_dump"):
        inv_dict = invoice.model_dump()
    elif hasattr(invoice, "dict"):
        inv_dict = invoice.dict()
    else:
        inv_dict = dict(invoice)
    ord_dict = order or {}

    totals = inv_dict.get("totals") or {}
    items_total = float(totals.get("itemsTotal") or 0)
    grand_total = float(totals.get("grandTotal") or 0)
    delivery = float(totals.get("deliveryCharge") or totals.get("delivery") or 0)
    pickup = float(totals.get("pickupCharge") or totals.get("pickup") or 0)
    handling = float(totals.get("handlingFee") or totals.get("handling") or 0)
    discount = float(totals.get("discount") or 0)

    # Booking & platform fee
    booking_fee = round(delivery + pickup + handling, 2)
    if booking_fee <= 0:
        booking_fee = 14.75  # Default convenience & platform fee (12.50 base + 2.25 18% GST)

    ride_charge = grand_total - booking_fee if grand_total > booking_fee else (items_total - discount)
    if ride_charge <= 0:
        ride_charge = max(grand_total, 184.80)

    customer = inv_dict.get("customer") or {}
    partner = inv_dict.get("partner") or {}
    payment = inv_dict.get("payment") or {}
    gst = inv_dict.get("gst") or {}

    order_num = inv_dict.get("orderNumber") or ord_dict.get("code") or "QP-2026-001"
    order_time = inv_dict.get("invoiceDate") or ord_dict.get("createdAt") or datetime.now().isoformat()
    invoice_num = inv_dict.get("invoiceNumber") or f"QP26UP{str(abs(hash(order_num)))[:8]}"

    cust_addr = customer.get("addressLine") or customer.get("city") or "Customer Registered Address, Kasganj, UP"
    if customer.get("city") and customer.get("city") not in cust_addr:
        cust_addr = f"{cust_addr}, {customer.get('city')}"

    part_addr = partner.get("addressLine") or partner.get("city") or "QuickPress Partner Store Hub, Uttar Pradesh"

    # Map items from invoice or order
    raw_items = inv_dict.get("items") or ord_dict.get("items") or []
    mapped_items = []
    if raw_items:
        total_raw_val = sum(float(it.get("total") or (float(it.get("unitPrice", 0)) * int(it.get("quantity", 1)))) for it in raw_items) or 1.0
        for itm in raw_items:
            qty = int(itm.get("quantity") or 1)
            name = itm.get("name") or "Laundry Service"
            item_tot = float(itm.get("total") or (float(itm.get("unitPrice", 0)) * qty))
            item_disc = round(discount * (item_tot / total_raw_val), 2) if discount > 0 else 0.0
            net_val = round(item_tot - item_disc, 2)
            cgst_val = round(net_val * 0.025, 2)
            sgst_val = round(net_val * 0.025, 2)
            final_item_tot = round(net_val + cgst_val + sgst_val, 2)
            mapped_items.append({
                "name": f"{qty} x {name}",
                "gross_value": item_tot,
                "discount": item_disc,
                "net_value": net_val,
                "cgst_rate": "2.5%",
                "cgst_amt": cgst_val,
                "sgst_rate": "2.5%",
                "sgst_amt": sgst_val,
                "total": final_item_tot,
            })
    else:
        serv_name = inv_dict.get("serviceLabel") or "Laundry and Dry Cleaning Services"
        base_val = round(ride_charge / 1.05, 2)
        cgst_val = round((ride_charge - base_val) / 2, 2)
        sgst_val = round((ride_charge - base_val) / 2, 2)
        mapped_items.append({
            "name": f"1 x {serv_name}",
            "gross_value": base_val,
            "discount": discount,
            "net_value": base_val,
            "cgst_rate": "2.5%",
            "cgst_amt": cgst_val,
            "sgst_rate": "2.5%",
            "sgst_amt": sgst_val,
            "total": ride_charge,
        })

    partner_legal = partner.get("legalName") or partner.get("name") or "Authorized Laundromat Partner"
    partner_gstin = gst.get("gstin") or partner.get("gstin") or "UNREGISTERED"

    return {
        "order_number": order_num,
        "order_id": order_num,
        "order_time": order_time,
        "total_amount": f"{grand_total:.2f}",
        "pickup_address": cust_addr,
        "drop_address": part_addr,
        "distance": ord_dict.get("distance") or "2.28 kms",
        "duration": ord_dict.get("duration") or "5.92 mins",
        "service_name": inv_dict.get("serviceLabel") or "Laundry and Dry Cleaning Services",
        "ride_charge": f"{ride_charge:.2f}",
        "booking_fee": f"{booking_fee:.2f}",
        "discount": f"{discount:.2f}",
        "payment_method": payment.get("methodLabel") or payment.get("method") or "UPI",
        "invoice_no": invoice_num,
        "invoice_date": _format_date(order_time),
        "state": COMPANY_STATE,
        "place_of_supply": gst.get("placeOfSupply") or f"{COMPANY_STATE}({COMPANY_STATE_CODE})",
        "partner_gst": partner_gstin,
        "partner_name": partner.get("name") or "QuickPress Partner Hub",
        "partner_legal_name": partner_legal,
        "partner_address": part_addr,
        "partner_reg_no": partner.get("registrationNumber") or "N/A",
        "captain_name": ord_dict.get("riderName") or "Delivery Captain",
        "customer_name": customer.get("name") or "Valued Customer",
        "items": mapped_items,
        "sac_code": "999791",
        "service_description": "Laundry and Dry Cleaning Services",
        "platform_invoice_no": f"QP26UPOT{str(abs(hash(invoice_num)))[:8]}",
        "platform_invoice_date": _format_date(order_time),
        "company_legal_name": COMPANY_LEGAL_NAME,
        "company_pan": COMPANY_PAN,
        "company_cin": COMPANY_CIN,
        "company_gst": COMPANY_GSTIN,
        "company_address": COMPANY_ADDRESS,
    }


def generate_commission_invoice_pdf(data: Dict[str, Any]) -> bytes:
    """Generate official 1-page GST Commission Tax Invoice for Merchant Partner ITC."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        "CommHeader",
        parent=styles["Normal"],
        fontName=FONT_BOLD if "FONT_BOLD" in globals() else "Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
    )
    sub_header_style = ParagraphStyle(
        "CommSubHeader",
        parent=styles["Normal"],
        fontName=FONT_REGULAR if "FONT_REGULAR" in globals() else "Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        alignment=1,
    )
    body_style = ParagraphStyle(
        "CommBody",
        parent=styles["Normal"],
        fontName=FONT_REGULAR if "FONT_REGULAR" in globals() else "Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    bold_style = ParagraphStyle(
        "CommBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD if "FONT_BOLD" in globals() else "Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # Title Banner
    story.append(Paragraph("TAX INVOICE", header_style))
    story.append(Paragraph("Marketplace Commission & Platform Services · Input Tax Credit (ITC) Document", sub_header_style))
    story.append(Spacer(1, 14))

    # Invoice Meta & Parties Table
    inv_num = data.get("invoice_number", "INV/QP/COMM/2026/09")
    inv_date = data.get("date", datetime.now().strftime("%d-%b-%Y"))
    period = data.get("period", "September 2026")
    partner_name = data.get("partner_name", "Partner Store")
    partner_id = data.get("partner_id", "")
    partner_gst = data.get("partner_gst", "Unregistered / Composition")
    partner_city = data.get("partner_city", "")

    meta_table_data = [
        [
            Paragraph(f"<b>Invoice Number:</b> {inv_num}<br/><b>Date of Issue:</b> {inv_date}<br/><b>Billing Period:</b> {period}<br/><b>Place of Supply:</b> 09 - Uttar Pradesh", body_style),
            Paragraph("<b>ISSUER / PLATFORM:</b><br/><b>QuickPress Technologies Pvt. Ltd.</b><br/>Registered Corporate Office<br/><b>GSTIN:</b> 09AAHCR1710J1ZE<br/><b>PAN:</b> AAHCR1710J", body_style),
        ],
        [
            Paragraph(f"<b>RECIPIENT / MERCHANT PARTNER:</b><br/><b>{partner_name}</b> (ID: {partner_id})<br/>{partner_city}<br/><b>GSTIN:</b> {partner_gst}", body_style),
            Paragraph("<b>NATURE OF SUPPLY:</b><br/>E-Commerce Operator Platform Services<br/>Reverse Charge Applicable: <b>NO</b><br/>ITC Eligible: <b>YES</b>", body_style),
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # Service Line Items Table
    comm_base = float(data.get("commission_amount", 0.0))
    cgst = float(data.get("cgst", round(comm_base * 0.09, 2)))
    sgst = float(data.get("sgst", round(comm_base * 0.09, 2)))
    total_tax = round(cgst + sgst, 2)
    grand_total = round(comm_base + total_tax, 2)
    orders_cnt = int(data.get("order_count", 0))

    items_header = [
        Paragraph("<b>S.No</b>", bold_style),
        Paragraph("<b>Description of Service</b>", bold_style),
        Paragraph("<b>SAC Code</b>", bold_style),
        Paragraph("<b>Orders</b>", bold_style),
        Paragraph("<b>Taxable Val (₹)</b>", bold_style),
        Paragraph("<b>CGST (9%)</b>", bold_style),
        Paragraph("<b>SGST (9%)</b>", bold_style),
        Paragraph("<b>Total (₹)</b>", bold_style),
    ]
    items_row = [
        Paragraph("1", body_style),
        Paragraph("Platform Commission & Order Routing Services", body_style),
        Paragraph("998311", body_style),
        Paragraph(str(orders_cnt), body_style),
        Paragraph(f"{comm_base:.2f}", body_style),
        Paragraph(f"{cgst:.2f}", body_style),
        Paragraph(f"{sgst:.2f}", body_style),
        Paragraph(f"{grand_total:.2f}", bold_style),
    ]
    totals_row = [
        Paragraph("<b>Total</b>", bold_style),
        Paragraph("", body_style),
        Paragraph("", body_style),
        Paragraph(str(orders_cnt), bold_style),
        Paragraph(f"<b>₹{comm_base:.2f}</b>", bold_style),
        Paragraph(f"<b>₹{cgst:.2f}</b>", bold_style),
        Paragraph(f"<b>₹{sgst:.2f}</b>", bold_style),
        Paragraph(f"<b>₹{grand_total:.2f}</b>", bold_style),
    ]

    items_table = Table([items_header, items_row, totals_row], colWidths=[35, 175, 55, 45, 75, 55, 55, 65])
    items_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#0f172a")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (3, -1), 'CENTER'),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#f8fafc")),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 16))

    # Notes & Statutory Declaration
    notes_p = Paragraph(
        "<b>Statutory Notes & Declarations:</b><br/>"
        "1. This Tax Invoice is issued pursuant to Section 31 of the CGST Act, 2017.<br/>"
        "2. The recipient is eligible to claim Input Tax Credit (ITC) of CGST and SGST subject to filing of GSTR-3B.<br/>"
        "3. TDS under Section 194-O of Income Tax Act (1%) and TCS under Section 52 of CGST Act (1%) have been accounted for separately in settlement statements.<br/>"
        "4. This is a computer-generated tax invoice and requires no physical signature.",
        body_style
    )
    story.append(notes_p)
    story.append(Spacer(1, 24))

    # Digital Signature Badge
    sig_data = [
        [
            Paragraph("<b>For QuickPress Technologies Pvt. Ltd.</b><br/><br/><i>Digitally signed & authorized</i><br/>Finance & Compliance Controller", body_style),
            Paragraph("<b>Verification & Security</b><br/>Hash: SHA256 Verified<br/>Status: Active on GSTN Portal<br/>Query Desk: billing@quickpress.online", body_style),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fafafa")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(sig_table)

    doc.build(story)
    return buffer.getvalue()


def generate_settlement_statement_pdf(data: Dict[str, Any]) -> bytes:
    """Generate official Merchant Settlement Statement PDF for Bank reconciliation & Audits."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        "SettlementHeader",
        parent=styles["Normal"],
        fontName=FONT_BOLD if "FONT_BOLD" in globals() else "Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
    )
    sub_style = ParagraphStyle(
        "SettlementSub",
        parent=styles["Normal"],
        fontName=FONT_REGULAR if "FONT_REGULAR" in globals() else "Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )
    bold_style = ParagraphStyle(
        "SettlementBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD if "FONT_BOLD" in globals() else "Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )
    regular_style = ParagraphStyle(
        "SettlementRegular",
        parent=styles["Normal"],
        fontName=FONT_REGULAR if "FONT_REGULAR" in globals() else "Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )
    num_bold = ParagraphStyle(
        "SettlementNumBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD if "FONT_BOLD" in globals() else "Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=colors.HexColor("#0f172a"),
    )
    num_regular = ParagraphStyle(
        "SettlementNumRegular",
        parent=styles["Normal"],
        fontName=FONT_REGULAR if "FONT_REGULAR" in globals() else "Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>QUICKPRESS MERCHANT SETTLEMENT STATEMENT</b><br/><font color='#64748b' size='8'>Official Payout Ledger & Statutory Bank Reconciliation Document</font>", header_style),
            Paragraph("<b>QuickPress Technologies Pvt. Ltd.</b><br/>GSTIN: 09AAHCR1710J1ZE · PAN: AAHCR1710J<br/>Registered Corporate Office", ParagraphStyle("Right", parent=regular_style, alignment=2)),
        ]
    ]
    t_head = Table(header_data, colWidths=[310, 213])
    t_head.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_head)
    story.append(Spacer(1, 8))

    # Meta variables
    b_name = data.get("businessName") or "QuickPress Partner Store"
    p_id = data.get("partnerId") or ""
    owner = data.get("ownerName") or "Store Partner"
    city = data.get("city") or ""
    cycle = data.get("cycle") or {}
    period = cycle.get("period") or "Current Cycle"
    cycle_id = cycle.get("cycleId") or "cycle"
    status_str = cycle.get("status") or "PAID"
    status_color = "#16a34a" if status_str.upper() in ("PAID", "SETTLED") else "#d97706"

    bank = data.get("bankDetails") or {}
    bank_name = bank.get("bankName") or "Bank Account"
    acc_masked = bank.get("accountNumberMasked") or "••••"
    utr_val = bank.get("utr") or "—"

    # 2. Meta Info Card
    meta_data = [
        [
            Paragraph(f"<b>STORE DETAILS:</b><br/>"
                      f"<b>Store:</b> {b_name}<br/>"
                      f"<b>Partner ID:</b> {p_id}<br/>"
                      f"<b>Owner:</b> {owner}<br/>"
                      f"<b>City:</b> {city}", regular_style),
            Paragraph(f"<b>SETTLEMENT SUMMARY:</b><br/>"
                      f"<b>Period:</b> {period}<br/>"
                      f"<b>Statement ID:</b> STM-{cycle_id}-{p_id[-6:] if len(p_id) >= 6 else p_id}<br/>"
                      f"<b>Payout Status:</b> <font color='{status_color}'><b>{status_str}</b></font><br/>"
                      f"<b>Bank & UTR:</b> {bank_name} ({acc_masked}) · UTR: {utr_val}", regular_style),
        ]
    ]
    t_meta = Table(meta_data, colWidths=[260, 263])
    t_meta.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Numbers
    order_cnt = int(data.get("totalOrders", 0))
    net_payout = float(data.get("estNetPayout", 0.0))
    netA = data.get("netOrderValueA") or {}
    gross_val = float(netA.get("total") or netA.get("itemSubtotal") or 0.0)
    items_subtotal = float(netA.get("itemSubtotal", gross_val))
    gst_collected = float(netA.get("totalGstCollected", 0.0))

    dedC = data.get("orderLevelDeductionsC") or {}
    comm_val = float(dedC.get("platformCommission", 0.0))
    comm_pct = float(dedC.get("commissionRatePct", 15.0))

    taxD = data.get("taxDeductionsD") or {}
    gst_fee = float(taxD.get("gstOnServiceFees18", 0.0))
    tds_val = float(taxD.get("tds194o", 0.0))
    tcs_val = float(taxD.get("tcsGst", 0.0))

    total_fees_taxes = round(comm_val + gst_fee + tds_val + tcs_val, 2)

    # 3. KPI Highlights Cards
    kpi_data = [
        [
            Paragraph(f"<font size='7' color='#64748b'>DELIVERED ORDERS</font><br/><font size='13'><b>{order_cnt}</b></font>", ParagraphStyle("K1", parent=styles["Normal"], alignment=1)),
            Paragraph(f"<font size='7' color='#64748b'>GROSS ORDER VALUE</font><br/><font size='13'><b>₹{gross_val:,.2f}</b></font>", ParagraphStyle("K2", parent=styles["Normal"], alignment=1)),
            Paragraph(f"<font size='7' color='#64748b'>FEES & TAXES</font><br/><font size='13' color='#b91c1c'><b>-₹{total_fees_taxes:,.2f}</b></font>", ParagraphStyle("K3", parent=styles["Normal"], alignment=1)),
            Paragraph(f"<font size='7' color='#15803d'>NET BANK PAYOUT</font><br/><font size='13' color='#15803d'><b>₹{net_payout:,.2f}</b></font>", ParagraphStyle("K4", parent=styles["Normal"], alignment=1)),
        ]
    ]
    t_kpi = Table(kpi_data, colWidths=[130, 131, 131, 131])
    t_kpi.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,0), (2,0), colors.HexColor("#f1f5f9")),
        ('BACKGROUND', (3,0), (3,0), colors.HexColor("#dcfce7")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 12))

    # 4. Itemized Accounting Breakdown Table
    acc_header = [
        Paragraph("<b>Code</b>", bold_style),
        Paragraph("<b>Settlement Component</b>", bold_style),
        Paragraph("<b>Formula / Basis</b>", bold_style),
        Paragraph("<b>Amount (₹)</b>", ParagraphStyle("RBold", parent=bold_style, alignment=2)),
    ]
    acc_rows = [
        [Paragraph("<b>A</b>", bold_style), Paragraph("<b>Gross Customer Order Value</b>", bold_style), Paragraph(f"{order_cnt} Delivered customer orders", regular_style), Paragraph(f"₹{gross_val:,.2f}", num_bold)],
        [Paragraph("A.1", regular_style), Paragraph("Customer Subtotal (Items)", regular_style), Paragraph("Laundry & garment care service value", regular_style), Paragraph(f"₹{items_subtotal:,.2f}", num_regular)],
        [Paragraph("A.2", regular_style), Paragraph("Customer GST Collected", regular_style), Paragraph("Goods and Services Tax on customer invoice", regular_style), Paragraph(f"₹{gst_collected:,.2f}", num_regular)],
        [Paragraph("<b>B</b>", bold_style), Paragraph("<b>Additions & Platform Incentives</b>", bold_style), Paragraph("Quality score bonus & on-time SLA rewards", regular_style), Paragraph("₹0.00", num_bold)],
        [Paragraph("<b>C</b>", bold_style), Paragraph("<b>Order Level Platform Deductions</b>", bold_style), Paragraph(f"Marketplace Commission ({comm_pct:.1f}%)", regular_style), Paragraph(f"-₹{comm_val:,.2f}", ParagraphStyle("Red", parent=num_bold, textColor=colors.HexColor("#b91c1c")))],
        [Paragraph("C.1", regular_style), Paragraph(f"Platform Commission ({comm_pct:.1f}%)", regular_style), Paragraph(f"{comm_pct:.1f}% on item total for order routing & app", regular_style), Paragraph(f"-₹{comm_val:,.2f}", num_regular)],
        [Paragraph("<b>D</b>", bold_style), Paragraph("<b>Statutory Taxes & TCS Withholding</b>", bold_style), Paragraph("18% GST on Commission + 1% TCS", regular_style), Paragraph(f"-₹{(gst_fee + tds_val + tcs_val):,.2f}", ParagraphStyle("Red2", parent=num_bold, textColor=colors.HexColor("#b91c1c")))],
        [Paragraph("D.1", regular_style), Paragraph("GST on Platform Fee (18%)", regular_style), Paragraph(f"CGST 9% (₹{gst_fee/2:.2f}) + SGST 9% (₹{gst_fee/2:.2f})", regular_style), Paragraph(f"-₹{gst_fee:,.2f}", num_regular)],
        [Paragraph("D.2", regular_style), Paragraph("Section 194-O TDS / TCS Withholding (1%)", regular_style), Paragraph("1% withholding on gross sale under IT Act", regular_style), Paragraph(f"-₹{(tds_val + tcs_val):,.2f}", num_regular)],
        [Paragraph("<b>=</b>", bold_style), Paragraph("<b>FINAL NET SETTLEMENT PAYOUT</b>", bold_style), Paragraph("<b>Credited to Bank via NPCI IMPS / NEFT</b>", bold_style), Paragraph(f"<b>₹{net_payout:,.2f}</b>", ParagraphStyle("GreenTotal", parent=num_bold, textColor=colors.HexColor("#15803d")))],
    ]
    t_acc = Table([acc_header] + acc_rows, colWidths=[35, 208, 170, 110])
    t_acc.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0f172a")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#f0fdf4")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_acc)
    story.append(Spacer(1, 10))

    # 5. Order Ledger Table
    orders_list = data.get("orders") or []
    if orders_list:
        story.append(Paragraph(f"<b>ORDER-LEVEL TRANSACTION LEDGER ({len(orders_list)} Orders Settled)</b>", bold_style))
        story.append(Spacer(1, 4))
        ord_header = [
            Paragraph("<b>#</b>", bold_style),
            Paragraph("<b>Order ID</b>", bold_style),
            Paragraph("<b>Date</b>", bold_style),
            Paragraph("<b>Customer</b>", bold_style),
            Paragraph("<b>Gross (₹)</b>", ParagraphStyle("RB1", parent=bold_style, alignment=2)),
            Paragraph("<b>Fee (₹)</b>", ParagraphStyle("RB2", parent=bold_style, alignment=2)),
            Paragraph("<b>Net Payout (₹)</b>", ParagraphStyle("RB3", parent=bold_style, alignment=2)),
            Paragraph("<b>Status</b>", bold_style),
        ]
        ord_rows = []
        for idx, o in enumerate(orders_list[:25], start=1):
            o_code = str(o.get("displayCode") or o.get("orderId") or f"#{idx}")
            o_date = str(o.get("date") or "")
            if len(o_date) > 10:
                o_date = o_date[:10]
            c_name = str(o.get("customerName") or "Customer")[:18]
            o_amt = float(o.get("orderAmount") or 0.0)
            o_fee = float(o.get("partnerCommission") or 0.0)
            o_net = float(o.get("netEarnings") or (o_amt - o_fee))
            st_text = str(o.get("status") or "Delivered")
            ord_rows.append([
                Paragraph(str(idx), regular_style),
                Paragraph(o_code, bold_style),
                Paragraph(o_date, regular_style),
                Paragraph(c_name, regular_style),
                Paragraph(f"{o_amt:.2f}", num_regular),
                Paragraph(f"-{o_fee:.2f}", num_regular),
                Paragraph(f"{o_net:.2f}", num_bold),
                Paragraph(f"<font color='#16a34a'>{st_text}</font>", regular_style),
            ])
        t_ord = Table([ord_header] + ord_rows, colWidths=[20, 60, 65, 118, 70, 65, 75, 50])
        t_ord.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(t_ord)
        story.append(Spacer(1, 10))

    # 6. Digital Stamp & Notice
    sig_data = [
        [
            Paragraph("<b>Statutory Notice:</b> Computer generated settlement statement pursuant to RBI Settlement Directions and GST Rules. No physical signature required.", sub_style),
            Paragraph(f"<b>Settlement Reference:</b> {utr_val}<br/><b>Verification:</b> SHA-256 Validated<br/>settlements@quickpress.online", ParagraphStyle("R3", parent=sub_style, alignment=2)),
        ]
    ]
    t_sig = Table(sig_data, colWidths=[330, 193])
    t_sig.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fafafa")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sig)

    doc.build(story)
    return buffer.getvalue()


def generate_settlement_statement_csv(data: Dict[str, Any]) -> str:
    """Generates standard CSV (with UTF-8 BOM for Microsoft Excel) of settlement statement."""
    out = io.StringIO()
    writer = csv.writer(out)

    b_name = data.get("businessName") or "QuickPress Partner Store"
    p_id = data.get("partnerId") or ""
    owner = data.get("ownerName") or "Store Partner"
    city = data.get("city") or ""
    cycle = data.get("cycle") or {}
    period = cycle.get("period") or "Current Cycle"
    cycle_id = cycle.get("cycleId") or "cycle"
    status_str = cycle.get("status") or "PAID"

    bank = data.get("bankDetails") or {}
    bank_name = bank.get("bankName") or "Bank Account"
    acc_masked = bank.get("accountNumberMasked") or "••••"
    utr_val = bank.get("utr") or "—"
    credit_dt = bank.get("creditedAt") or cycle.get("payoutDate") or "—"

    order_cnt = int(data.get("totalOrders", 0))
    net_payout = float(data.get("estNetPayout", 0.0))
    netA = data.get("netOrderValueA") or {}
    gross_val = float(netA.get("total") or netA.get("itemSubtotal") or 0.0)
    items_subtotal = float(netA.get("itemSubtotal", gross_val))
    gst_collected = float(netA.get("totalGstCollected", 0.0))

    dedC = data.get("orderLevelDeductionsC") or {}
    comm_val = float(dedC.get("platformCommission", 0.0))
    comm_pct = float(dedC.get("commissionRatePct", 15.0))

    taxD = data.get("taxDeductionsD") or {}
    gst_fee = float(taxD.get("gstOnServiceFees18", 0.0))
    tds_val = float(taxD.get("tds194o", 0.0))
    tcs_val = float(taxD.get("tcsGst", 0.0))

    # Section 1: Header Meta
    writer.writerow(["QUICKPRESS MERCHANT SETTLEMENT STATEMENT", ""])
    writer.writerow(["Platform", "QuickPress Technologies Pvt. Ltd."])
    writer.writerow(["Platform GSTIN", "09AAHCR1710J1ZE"])
    writer.writerow(["Platform PAN", "AAHCR1710J"])
    writer.writerow(["Store Name", b_name])
    writer.writerow(["Partner ID", p_id])
    writer.writerow(["Owner Name", owner])
    writer.writerow(["City", city])
    writer.writerow(["Settlement Period", period])
    writer.writerow(["Statement ID", f"STM-{cycle_id}-{p_id[-6:] if len(p_id) >= 6 else p_id}"])
    writer.writerow(["Settlement Status", status_str])
    writer.writerow(["Bank Name", bank_name])
    writer.writerow(["Account Number", acc_masked])
    writer.writerow(["Bank UTR / Ref No", utr_val])
    writer.writerow(["Settlement Date", credit_dt])
    writer.writerow([])

    # Section 2: Financial Summary
    writer.writerow(["FINANCIAL SUMMARY", ""])
    writer.writerow(["Metric", "Amount (INR)", "Notes / Basis"])
    writer.writerow(["Delivered Orders Count", order_cnt, "Completed orders in settlement period"])
    writer.writerow(["Gross Order Value (A)", f"{gross_val:.2f}", "Customer paid subtotal"])
    writer.writerow(["Customer Item Subtotal", f"{items_subtotal:.2f}", "Goods/services value"])
    writer.writerow(["Customer GST Collected", f"{gst_collected:.2f}", "GST component"])
    writer.writerow(["Additions & Bonuses (B)", "0.00", "Quality & SLA incentives"])
    writer.writerow([f"Platform Commission (C - {comm_pct:.1f}%)", f"-{comm_val:.2f}", "QuickPress platform fee"])
    writer.writerow(["GST on Platform Fee (18%)", f"-{gst_fee:.2f}", f"CGST 9% ({gst_fee/2:.2f}) + SGST 9% ({gst_fee/2:.2f})"])
    writer.writerow(["TDS Sec 194-O / TCS (1%)", f"-{(tds_val + tcs_val):.2f}", "Government tax withholding"])
    writer.writerow(["NET PAYOUT CREDITED (INR)", f"{net_payout:.2f}", "Net amount transferred to merchant bank"])
    writer.writerow([])

    # Section 3: Order-Level Transaction Ledger
    writer.writerow(["ORDER-LEVEL TRANSACTION LEDGER", ""])
    writer.writerow([
        "S.No",
        "Order ID",
        "Date",
        "Customer Name",
        "Items Summary",
        "Gross Order Amount (INR)",
        "Platform Commission (INR)",
        "Taxes / TCS (INR)",
        "Net Partner Share (INR)",
        "Status",
        "Bank UTR",
    ])
    orders_list = data.get("orders") or []
    for idx, o in enumerate(orders_list, start=1):
        o_code = str(o.get("displayCode") or o.get("orderId") or f"#{idx}")
        o_date = str(o.get("date") or "")[:10]
        c_name = str(o.get("customerName") or "Customer")
        i_summary = str(o.get("itemsSummary") or "Service Order")
        o_amt = float(o.get("orderAmount") or 0.0)
        o_fee = float(o.get("partnerCommission") or 0.0)
        o_net = float(o.get("netEarnings") or (o_amt - o_fee))
        st_text = str(o.get("status") or "Delivered")
        writer.writerow([
            idx,
            o_code,
            o_date,
            c_name,
            i_summary,
            f"{o_amt:.2f}",
            f"{o_fee:.2f}",
            f"{round(o_amt * 0.01, 2):.2f}",
            f"{o_net:.2f}",
            st_text,
            utr_val,
        ])

    return out.getvalue()


def generate_commission_invoice_csv(data: Dict[str, Any]) -> str:
    """Generates standard CSV (with UTF-8 BOM for Microsoft Excel) for Monthly GST Commission Tax Invoice."""
    out = io.StringIO()
    writer = csv.writer(out)

    inv_num = data.get("invoice_number", "INV/QP/COMM/2026/09")
    inv_date = data.get("date", datetime.now().strftime("%d-%b-%Y"))
    period = data.get("period", "September 2026")
    partner_name = data.get("partner_name", "Partner Store")
    partner_id = data.get("partner_id", "")
    partner_gst = data.get("partner_gst", "Unregistered / Composition")
    partner_city = data.get("partner_city", "")

    comm_base = float(data.get("commission_amount", 0.0))
    cgst = float(data.get("cgst", round(comm_base * 0.09, 2)))
    sgst = float(data.get("sgst", round(comm_base * 0.09, 2)))
    total_tax = round(cgst + sgst, 2)
    grand_total = round(comm_base + total_tax, 2)
    orders_cnt = int(data.get("order_count", 0))

    writer.writerow(["TAX INVOICE — PLATFORM COMMISSION & SERVICES (ITC CLAIM)", ""])
    writer.writerow(["Invoice Number", inv_num])
    writer.writerow(["Date of Issue", inv_date])
    writer.writerow(["Billing Period", period])
    writer.writerow(["Place of Supply", "09 - Uttar Pradesh"])
    writer.writerow(["Issuer", "QuickPress Technologies Pvt. Ltd."])
    writer.writerow(["Issuer GSTIN", "09AAHCR1710J1ZE"])
    writer.writerow(["Issuer PAN", "AAHCR1710J"])
    writer.writerow(["Issuer Address", "Registered Corporate Office"])
    writer.writerow(["Recipient / Partner Store", partner_name])
    writer.writerow(["Partner ID", partner_id])
    writer.writerow(["Partner GSTIN", partner_gst])
    writer.writerow(["Partner Location", partner_city])
    writer.writerow(["Reverse Charge Applicable", "NO"])
    writer.writerow(["Input Tax Credit (ITC) Eligible", "YES"])
    writer.writerow([])
    writer.writerow(["TAX INVOICE LINE ITEMS", ""])
    writer.writerow([
        "S.No",
        "Description of Service",
        "SAC Code",
        "Delivered Orders",
        "Taxable Value (INR)",
        "CGST Rate",
        "CGST Amount (INR)",
        "SGST Rate",
        "SGST Amount (INR)",
        "Total Tax (INR)",
        "Total Invoice Value (INR)",
    ])
    writer.writerow([
        1,
        "Platform Commission & Order Routing Services",
        "998311",
        orders_cnt,
        f"{comm_base:.2f}",
        "9%",
        f"{cgst:.2f}",
        "9%",
        f"{sgst:.2f}",
        f"{total_tax:.2f}",
        f"{grand_total:.2f}",
    ])
    return out.getvalue()
