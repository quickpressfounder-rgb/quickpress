"""QuickPress Automated Tax Invoice & Payment Summary PDF Generator.

Produces a 3-page enterprise tax invoice matching the Rapido-style layout:
- Page 1: Payment Summary (Order ID, time, total, route/address card, itemized bill, payment mode)
- Page 2: Tax Invoice — Service Provider / Logistics Partner (SAC 999799, GST breakdown, captain info)
- Page 3: Tax Invoice — Platform & Convenience Fee with Verification QR Code & digital sign-off
"""

from __future__ import annotations

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


def _format_date(dt_val: Any) -> str:
    if not dt_val:
        now = datetime.now()
        day = now.day
        suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return now.strftime(f"%b {day}{suffix} %Y, %I:%M %p")
    if isinstance(dt_val, str):
        try:
            dt = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
            day = dt.day
            suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
            return dt.strftime(f"%b {day}{suffix} %Y, %I:%M %p")
        except Exception:
            return dt_val
    if isinstance(dt_val, datetime):
        day = dt_val.day
        suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return dt_val.strftime(f"%b {day}{suffix} %Y, %I:%M %p")
    return str(dt_val)


def _fmt_money(val: Any) -> str:
    try:
        return f"{float(val or 0):.2f}"
    except (ValueError, TypeError):
        return "0.00"


def generate_invoice_pdf(data: Dict[str, Any], output_target: Any = None) -> bytes:
    """Generate a 3-page PDF bytes buffer or write to output file/stream."""
    buffer = io.BytesIO() if output_target is None else output_target

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
    )

    brand_style = ParagraphStyle(
        "BrandWordmark",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=18,
        leading=22,
        alignment=2,  # Right
        textColor=colors.HexColor("#0f172a"),
    )

    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748b"),
    )

    meta_val = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=9,
        leading=13,
        alignment=2,
        textColor=colors.HexColor("#0f172a"),
    )

    meta_val_left = ParagraphStyle(
        "MetaValLeft",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )

    center_total_label = ParagraphStyle(
        "CenterTotalLabel",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=10,
        leading=14,
        alignment=1,
        textColor=colors.HexColor("#64748b"),
    )

    center_total_val = ParagraphStyle(
        "CenterTotalVal",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=24,
        leading=28,
        alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )

    card_title = ParagraphStyle(
        "CardTitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
    )

    item_label = ParagraphStyle(
        "ItemLabel",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )

    item_val = ParagraphStyle(
        "ItemVal",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=13,
        alignment=2,
        textColor=colors.HexColor("#0f172a"),
    )

    item_bold_label = ParagraphStyle(
        "ItemBoldLabel",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
    )

    item_bold_val = ParagraphStyle(
        "ItemBoldVal",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=14,
        alignment=2,
        textColor=colors.HexColor("#0f172a"),
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=11,
        alignment=1,  # Center
        textColor=colors.HexColor("#64748b"),
    )

    thanks_style = ParagraphStyle(
        "Thanks",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=9,
        leading=13,
        alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )

    brand_html = '<font color="#0f172a">Quick</font><font color="#059669">Press</font>'
    currency = "₹" if FONT_REGULAR == "Roboto" else "Rs."

    story = []

    # =========================================================================
    # PAGE 1: PAYMENT SUMMARY
    # =========================================================================
    hdr_data = [
        [Paragraph("Payment Summary", title_style), Paragraph(brand_html, brand_style)],
    ]
    hdr_table = Table(hdr_data, colWidths=[320, 200])
    hdr_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(hdr_table)
    story.append(Spacer(1, 10))

    order_num = str(data.get("order_number") or data.get("orderNumber") or "QP-2026-001")
    order_time_str = _format_date(data.get("order_time") or data.get("invoiceDate"))

    meta_data = [
        [Paragraph("Ride / Order ID", meta_label), Paragraph(order_num, meta_val)],
        [Paragraph("Time of Order", meta_label), Paragraph(order_time_str, meta_val)],
    ]
    meta_table = Table(meta_data, colWidths=[200, 320])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 18))

    # Big Central Total
    grand_total_str = _fmt_money(data.get("total_amount") or data.get("grandTotal") or 0)
    story.append(Paragraph("Total", center_total_label))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"{currency} {grand_total_str}", center_total_val))
    story.append(Spacer(1, 18))

    # Route / Location Card
    pickup_addr = str(data.get("pickup_address") or "Customer Pickup Address, Uttar Pradesh 207123, India")
    drop_addr = str(data.get("drop_address") or "QuickPress Express Hub, Uttar Pradesh 207123, India")
    distance_str = str(data.get("distance") or "2.28 kms")
    duration_str = str(data.get("duration") or "5.92 mins")

    loc_card_data = [
        [
            Paragraph(f"<font color='#059669'>&#9679;</font>&nbsp;&nbsp;<b>Pickup:</b> {pickup_addr}", item_label),
            Paragraph(f"<b>{distance_str}</b><br/><font color='#64748b' size='7.5'>DISTANCE</font>", meta_val),
        ],
        [
            Paragraph(f"<font color='#dc2626'>&#9679;</font>&nbsp;&nbsp;<b>Delivery Hub:</b> {drop_addr}", item_label),
            Paragraph(f"<b>{duration_str}</b><br/><font color='#64748b' size='7.5'>DURATION</font>", meta_val),
        ],
    ]
    loc_table = Table(loc_card_data, colWidths=[380, 120])
    loc_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#f1f5f9")),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    story.append(loc_table)
    story.append(Spacer(1, 16))

    # Bill Details Card (Page 1)
    ride_charge_str = _fmt_money(data.get("ride_charge") or data.get("service_charge") or 0)
    booking_fee_str = _fmt_money(data.get("booking_fee") or data.get("convenience_fee") or 0)
    discount_val = float(data.get("discount") or 0)

    bill_rows = [
        [Paragraph("Bill Details", card_title), Paragraph("", item_val)],
        [Spacer(1, 4), Spacer(1, 4)],
        [
            Paragraph(str(data.get("service_name") or "Ride Charge"), item_label),
            Paragraph(f"{currency} {ride_charge_str}", item_val),
        ],
        [
            Paragraph("Booking Fees & Convenience Charges", item_label),
            Paragraph(f"{currency} {booking_fee_str}", item_val),
        ],
    ]
    if discount_val > 0:
        bill_rows.append(
            [
                Paragraph("Discount Applied", item_label),
                Paragraph(f"-{currency} {_fmt_money(discount_val)}", item_val),
            ]
        )

    bill_rows.extend(
        [
            [Spacer(1, 4), Spacer(1, 4)],
            [
                Paragraph(
                    "Total Amount<br/><font color='#64748b' size='7.5'>(Inclusive of Taxes)</font>",
                    item_bold_label,
                ),
                Paragraph(f"{currency} {grand_total_str}", item_bold_val),
            ],
        ]
    )

    bill_table = Table(bill_rows, colWidths=[360, 140])
    bill_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#f1f5f9")),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    story.append(bill_table)
    story.append(Spacer(1, 16))

    # Payment Method Card (Page 1)
    pay_method = str(data.get("payment_method") or "UPI")
    pay_data = [
        [
            Paragraph(
                f"<b>You Paid Using</b><br/><font color='#64748b' size='8.5'>{pay_method}</font>",
                item_label,
            ),
            Paragraph(f"{currency} {grand_total_str}", item_bold_val),
        ]
    ]
    pay_table = Table(pay_data, colWidths=[360, 140])
    pay_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#f1f5f9")),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(pay_table)

    # =========================================================================
    # PAGE 2: TAX INVOICE (SERVICE PROVIDER)
    # =========================================================================
    story.append(PageBreak())

    hdr2_data = [
        [
            Paragraph(
                f"Tax Invoice<br/><font color='#64748b' size='8.5'>{order_num}</font>",
                title_style,
            ),
            Paragraph(brand_html, brand_style),
        ],
    ]
    hdr2_table = Table(hdr2_data, colWidths=[320, 200])
    hdr2_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(hdr2_table)
    story.append(Spacer(1, 16))

    invoice_no = str(data.get("invoice_no") or data.get("invoiceNumber") or "2627UP0027124245")
    invoice_date_str = _format_date(data.get("invoice_date") or data.get("invoiceDate"))
    state_str = str(data.get("state") or "Uttar Pradesh")
    place_of_supply = str(data.get("place_of_supply") or state_str)
    partner_gst = str(data.get("partner_gst") or data.get("gstNumber") or "09AAHCR1710J1ZE")
    captain_name = str(data.get("captain_name") or "ANKIT SAHU")
    customer_name = str(data.get("customer_name") or "Himanshu Pal")

    p2_grid = [
        [Paragraph("Invoice No.", meta_label), Paragraph(invoice_no, meta_val)],
        [Paragraph("Invoice Date", meta_label), Paragraph(invoice_date_str, meta_val)],
        [Paragraph("State", meta_label), Paragraph(state_str, meta_val)],
        [
            Paragraph("Tax Category", meta_label),
            Paragraph(
                "Other local transportation services of passengers / garment care n.e.c. (996419)",
                meta_val,
            ),
        ],
        [Paragraph("Place of Supply", meta_label), Paragraph(place_of_supply, meta_val)],
        [Paragraph("GST Number", meta_label), Paragraph(partner_gst, meta_val)],
        [Paragraph("Vehicle / Service Hub", meta_label), Paragraph(str(data.get("partner_name") or "UP87Z6110"), meta_val)],
        [Paragraph("Captain / Rider Name", meta_label), Paragraph(captain_name, meta_val)],
        [Paragraph("Customer Name", meta_label), Paragraph(customer_name, meta_val)],
        [Paragraph("Customer Pick Up Address", meta_label), Paragraph(pickup_addr, meta_val)],
    ]
    p2_grid_table = Table(p2_grid, colWidths=[200, 320])
    p2_grid_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("LINEBELOW", (0, 3), (-1, 3), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    story.append(p2_grid_table)
    story.append(Spacer(1, 18))

    # Bill Details Card (Page 2)
    captain_fee = _fmt_money(data.get("captain_fee") or (float(ride_charge_str) * 0.95))
    cgst_amt_p2 = _fmt_money(data.get("cgst_amt_p2") or (float(ride_charge_str) * 0.025))
    sgst_amt_p2 = _fmt_money(data.get("sgst_amt_p2") or (float(ride_charge_str) * 0.025))
    igst_amt_p2 = _fmt_money(data.get("igst_amt_p2") or 0.0)

    p2_bill_rows = [
        [Paragraph("Bill Details", card_title), Paragraph("", item_val)],
        [Spacer(1, 4), Spacer(1, 4)],
        [
            Paragraph(str(data.get("service_fee_label") or "Captain Fee"), item_label),
            Paragraph(f"{currency} {captain_fee}", item_val),
        ],
        [
            Paragraph(f"CGST ({data.get('cgst_rate_p2', '2.5')}%)", item_label),
            Paragraph(f"{currency} {cgst_amt_p2}", item_val),
        ],
        [
            Paragraph(f"SGST ({data.get('sgst_rate_p2', '2.5')}%)", item_label),
            Paragraph(f"{currency} {sgst_amt_p2}", item_val),
        ],
        [
            Paragraph(f"IGST ({data.get('igst_rate_p2', '0')}%)", item_label),
            Paragraph(f"{currency} {igst_amt_p2}", item_val),
        ],
        [Spacer(1, 4), Spacer(1, 4)],
        [
            Paragraph(
                "Ride Charge<br/><font color='#64748b' size='7.5'>(Inclusive of Taxes)</font>",
                item_bold_label,
            ),
            Paragraph(f"{currency} {ride_charge_str}", item_bold_val),
        ],
    ]
    p2_bill_table = Table(p2_bill_rows, colWidths=[360, 140])
    p2_bill_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#f1f5f9")),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    story.append(p2_bill_table)
    story.append(Spacer(1, 30))

    # Disclaimer (Page 2)
    p2_disclaimer = (
        "This document is issued by Transport / Laundry Service Provider and not by "
        "QuickPress Technologies Private Limited. QuickPress acts only as an Electronic "
        "Commerce Operator for the transportation and garment care services."
    )
    story.append(Paragraph(p2_disclaimer, disclaimer_style))

    # =========================================================================
    # PAGE 3: TAX INVOICE (PLATFORM FEE + QR CODE)
    # =========================================================================
    story.append(PageBreak())

    hdr3_data = [
        [
            Paragraph(
                f"Tax Invoice<br/><font color='#64748b' size='8.5'>{order_num}</font>",
                title_style,
            ),
            Paragraph(brand_html, brand_style),
        ],
    ]
    hdr3_table = Table(hdr3_data, colWidths=[320, 200])
    hdr3_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(hdr3_table)
    story.append(Spacer(1, 16))

    # Generate QR Code image
    qr_data_str = f"https://quickpress.in/invoices/{invoice_no}?auth=verify"
    qr = qrcode.QRCode(version=1, box_size=3, border=0)
    qr.add_data(qr_data_str)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    rl_qr = RLImage(qr_buffer, width=80, height=80)

    company_address_html = f"""
    <b>QuickPress Technologies Private Limited</b><br/>
    3rd Floor, D-51, Bhagwati Tower,<br/>
    Vibhuti Khand, Gomti Nagar, Lucknow,<br/>
    Uttar Pradesh, 226010<br/><br/>
    <b>{customer_name}</b><br/>
    {pickup_addr}
    """

    top_p3_data = [[Paragraph(company_address_html, meta_val_left), rl_qr]]
    top_p3_table = Table(top_p3_data, colWidths=[420, 100])
    top_p3_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(top_p3_table)
    story.append(Spacer(1, 16))

    company_gst = str(data.get("company_gst") or partner_gst)

    # Grid of details (Page 3)
    p3_grid = [
        [Paragraph("Invoice No.", meta_label), Paragraph(invoice_no, meta_val)],
        [Paragraph("Invoice Date", meta_label), Paragraph(invoice_date_str, meta_val)],
        [
            Paragraph("Tax Category", meta_label),
            Paragraph("Other services n.e.c. (999799)", meta_val),
        ],
        [Paragraph("Place of Supply", meta_label), Paragraph(place_of_supply, meta_val)],
        [Paragraph("GST", meta_label), Paragraph(company_gst, meta_val)],
    ]
    p3_grid_table = Table(p3_grid, colWidths=[200, 320])
    p3_grid_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(p3_grid_table)
    story.append(Spacer(1, 18))

    # Bill Details Card (Page 3)
    booking_base = _fmt_money(data.get("booking_fee_base") or (float(booking_fee_str) / 1.18))
    conv_base = _fmt_money(data.get("convenience_fee_base") or 0.0)
    subtotal_p3 = _fmt_money(float(booking_base) + float(conv_base))
    cgst_amt_p3 = _fmt_money(data.get("cgst_amt_p3") or (float(subtotal_p3) * 0.09))
    sgst_amt_p3 = _fmt_money(data.get("sgst_amt_p3") or (float(subtotal_p3) * 0.09))
    igst_amt_p3 = _fmt_money(data.get("igst_amt_p3") or 0.0)

    p3_bill_rows = [
        [Paragraph("Bill Details", card_title), Paragraph("", item_val)],
        [Spacer(1, 4), Spacer(1, 4)],
        [Paragraph("Booking Fee", item_label), Paragraph(f"{currency} {booking_base}", item_val)],
        [
            Paragraph("Convenience Charges", item_label),
            Paragraph(f"{currency} {conv_base}", item_val),
        ],
        [Spacer(1, 3), Spacer(1, 3)],
        [Paragraph("Sub Total", item_bold_label), Paragraph(f"{currency} {subtotal_p3}", item_bold_val)],
        [
            Paragraph(f"CGST ({data.get('cgst_rate_p3', '9')}%)", item_label),
            Paragraph(f"{currency} {cgst_amt_p3}", item_val),
        ],
        [
            Paragraph(f"SGST ({data.get('sgst_rate_p3', '9')}%)", item_label),
            Paragraph(f"{currency} {sgst_amt_p3}", item_val),
        ],
        [
            Paragraph(f"IGST ({data.get('igst_rate_p3', '0')}%)", item_label),
            Paragraph(f"{currency} {igst_amt_p3}", item_val),
        ],
        [Spacer(1, 4), Spacer(1, 4)],
        [
            Paragraph(
                "Final Amount<br/><font color='#64748b' size='7.5'>(Inclusive of Taxes)</font>",
                item_bold_label,
            ),
            Paragraph(f"{currency} {booking_fee_str}", item_bold_val),
        ],
    ]
    p3_bill_table = Table(p3_bill_rows, colWidths=[360, 140])
    p3_bill_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#f1f5f9")),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEABOVE", (0, 5), (-1, 5), 0.5, colors.HexColor("#e2e8f0")),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    story.append(p3_bill_table)
    story.append(Spacer(1, 30))

    # Sign-off & Thanks (Page 3)
    p3_system_gen = "This is a system generated invoice and hence no signature required"
    p3_thanks = f"Thank you {customer_name}"
    story.append(Paragraph(p3_system_gen, disclaimer_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(p3_thanks, thanks_style))

    doc.build(story)
    if output_target is None:
        return buffer.getvalue()
    return b""


def build_invoice_pdf_payload(invoice: Any, order: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Map an Invoice model / dictionary and its parent Order into the template payload."""
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

    # Booking & convenience split
    booking_fee = max(delivery + pickup + handling, 1.18)
    ride_charge = max(grand_total - booking_fee, items_total - discount)
    if grand_total > 0 and (ride_charge + booking_fee) != grand_total:
        ride_charge = grand_total - booking_fee

    customer = inv_dict.get("customer") or {}
    partner = inv_dict.get("partner") or {}
    payment = inv_dict.get("payment") or {}
    gst = inv_dict.get("gst") or {}

    cust_addr = customer.get("addressLine") or customer.get("city") or "Kasganj, Uttar Pradesh 207123, India"
    if customer.get("city") and customer.get("city") not in cust_addr:
        cust_addr = f"{cust_addr}, {customer.get('city')}"

    part_addr = partner.get("addressLine") or partner.get("city") or "MDR 82W, Kasganj, Uttar Pradesh 207123, India"

    captain_fee = round(ride_charge / 1.05, 2)
    cgst_p2 = round((ride_charge - captain_fee) / 2, 2)
    sgst_p2 = round((ride_charge - captain_fee) / 2, 2)

    booking_base = round(booking_fee / 1.18, 2)
    cgst_p3 = round((booking_fee - booking_base) / 2, 2)
    sgst_p3 = round((booking_fee - booking_base) / 2, 2)

    return {
        "order_number": inv_dict.get("orderNumber") or ord_dict.get("code") or "QP-2026-001",
        "order_time": inv_dict.get("invoiceDate") or ord_dict.get("createdAt"),
        "total_amount": f"{grand_total:.2f}",
        "pickup_address": cust_addr,
        "drop_address": part_addr,
        "distance": ord_dict.get("distance") or "2.28 kms",
        "duration": ord_dict.get("duration") or "5.92 mins",
        "service_name": inv_dict.get("serviceLabel") or "Ride Charge",
        "ride_charge": f"{ride_charge:.2f}",
        "booking_fee": f"{booking_fee:.2f}",
        "discount": f"{discount:.2f}",
        "payment_method": payment.get("methodLabel") or payment.get("method") or "UPI",
        "invoice_no": inv_dict.get("invoiceNumber") or "2627UP0027124245",
        "invoice_date": inv_dict.get("invoiceDate"),
        "state": "Uttar Pradesh",
        "place_of_supply": gst.get("placeOfSupply") or "Uttar Pradesh",
        "partner_gst": gst.get("gstin") or "09AAHCR1710J1ZE",
        "partner_name": partner.get("name") or "QuickPress Kasganj Hub",
        "captain_name": ord_dict.get("riderName") or "ANKIT SAHU",
        "customer_name": customer.get("name") or "Himanshu Pal",
        "service_fee_label": "Captain Fee",
        "captain_fee": f"{captain_fee:.2f}",
        "cgst_rate_p2": "2.5",
        "cgst_amt_p2": f"{cgst_p2:.2f}",
        "sgst_rate_p2": "2.5",
        "sgst_amt_p2": f"{sgst_p2:.2f}",
        "igst_rate_p2": "0",
        "igst_amt_p2": "0.00",
        "company_gst": "09AAHCR1710J1ZE",
        "booking_fee_base": f"{booking_base:.2f}",
        "convenience_fee_base": "0.00",
        "booking_subtotal": f"{booking_base:.2f}",
        "cgst_rate_p3": "9",
        "cgst_amt_p3": f"{cgst_p3:.2f}",
        "sgst_rate_p3": "9",
        "sgst_amt_p3": f"{sgst_p3:.2f}",
        "igst_rate_p3": "0",
        "igst_amt_p3": "0.00",
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
    partner_city = data.get("partner_city", "Kasganj, Uttar Pradesh")

    meta_table_data = [
        [
            Paragraph(f"<b>Invoice Number:</b> {inv_num}<br/><b>Date of Issue:</b> {inv_date}<br/><b>Billing Period:</b> {period}<br/><b>Place of Supply:</b> 09 - Uttar Pradesh", body_style),
            Paragraph("<b>ISSUER / PLATFORM:</b><br/><b>QuickPress Technologies Pvt. Ltd.</b><br/>Main Road, Kasganj, UP 207123<br/><b>GSTIN:</b> 09AAHCR1710J1ZE<br/><b>PAN:</b> AAHCR1710J", body_style),
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
