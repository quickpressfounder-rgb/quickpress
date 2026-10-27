"""QuickPress Master Partner Franchise & Service Level Agreement (SLA) PDF Generator.

Generates an official, legally-binding 3-page bilateral agreement PDF:
- Corporate: QUICKPRESS TECHNOLOGIES PRIVATE LIMITED
- Authorized Signatory: Himanshu Pal (Director / Authorized Signatory)
- Official Seal Stamp: Circular company seal with 3 stars
- Merchant: Partner Store, Owner, Address, Bank, PAN, GSTIN
- Commercial Terms: 15% Platform Commission, T+1 Settlement
- Signatures: Corporate Official Seal on left, Partner Uploaded Signature on right
- Compliance: Information Technology Act, 2000 (Section 10A)
"""

from __future__ import annotations

import base64
import io
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)

# Register standard fonts
FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "fonts")
try:
    regular_font = os.path.join(FONTS_DIR, "Roboto-Regular.ttf")
    bold_font = os.path.join(FONTS_DIR, "Roboto-Bold.ttf")
    if os.path.exists(regular_font) and os.path.exists(bold_font):
        pdfmetrics.registerFont(TTFont("Roboto", regular_font))
        pdfmetrics.registerFont(TTFont("Roboto-Bold", bold_font))
        FONT_REGULAR = "Roboto"
        FONT_BOLD = "Roboto-Bold"
    else:
        FONT_REGULAR = "Helvetica"
        FONT_BOLD = "Helvetica-Bold"
except Exception:
    FONT_REGULAR = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
SEAL_PATH = os.path.join(STATIC_DIR, "quickpress-seal.png")


def _safe_str(val: Any, fallback: str = "—") -> str:
    if val is None:
        return fallback
    s = str(val).strip()
    return s if s else fallback


def _decode_signature_image(sig_data: str) -> Optional[io.BytesIO]:
    """Decode base64 data URL into an in-memory BytesIO image."""
    if not sig_data:
        return None
    try:
        if "," in sig_data:
            sig_data = sig_data.split(",", 1)[1]
        decoded = base64.b64decode(sig_data)
        buf = io.BytesIO(decoded)
        buf.seek(0)
        return buf
    except Exception as exc:
        logger.warning("Could not decode signature image: %s", exc)
        return None


def generate_partner_agreement_pdf(data: Dict[str, Any]) -> bytes:
    """Generate official QuickPress Partner Agreement PDF bytes."""
    buffer = io.BytesIO()

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
    c_primary = colors.HexColor("#0f172a")
    c_blue = colors.HexColor("#1e3a8a")
    c_emerald = colors.HexColor("#047857")
    c_muted = colors.HexColor("#475569")
    c_border = colors.HexColor("#cbd5e1")

    title_style = ParagraphStyle(
        "AgreementTitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=15,
        leading=18,
        textColor=c_blue,
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        "AgreementSubtitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=13,
        textColor=c_emerald,
        alignment=1,
    )
    h2_style = ParagraphStyle(
        "AgreementH2",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=10.5,
        leading=14,
        textColor=c_blue,
    )
    p_style = ParagraphStyle(
        "AgreementBody",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=12,
        textColor=c_primary,
    )
    p_bold = ParagraphStyle(
        "AgreementBodyBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=12,
        textColor=c_primary,
    )
    p_small = ParagraphStyle(
        "AgreementSmall",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=10.5,
        textColor=c_muted,
    )
    clause_style = ParagraphStyle(
        "AgreementClause",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=11.5,
        textColor=c_primary,
    )

    story = []

    company_name = os.getenv("COMPANY_LEGAL_NAME", "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED")
    signatory_name = os.getenv("COMPANY_SIGNATORY_NAME", "Himanshu Pal")
    comp_cin = "U74999UP2024PTC198141"
    comp_gstin = "09AADCB1234K1Z8"
    comp_pan = "AADCB1234K"
    comp_address = "0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India"
    try:
        from app.db.admin_repositories import admin_settings_repository
        comp = admin_settings_repository.default_settings.get("company", {})
        if comp:
            company_name = comp.get("legalName") or company_name
            signatory_name = comp.get("authorizedSignatoryName") or signatory_name
            comp_cin = comp.get("cin") or comp_cin
            comp_gstin = comp.get("gstin") or comp_gstin
            comp_pan = comp.get("pan") or comp_pan
            comp_address = comp.get("registeredAddress") or comp_address
    except Exception:
        pass

    store_name = _safe_str(data.get("storeName") or data.get("businessName"), "Partner Store")
    owner_name = _safe_str(data.get("ownerName") or data.get("name"), "Partner Merchant")
    partner_email = _safe_str(data.get("email"), "verified@partner.com")
    partner_phone = _safe_str(data.get("phone") or data.get("mobile"), "—")
    store_address = _safe_str(data.get("address") or data.get("shopAddress"), "—")
    city = _safe_str(data.get("city"), "—")
    pincode = _safe_str(data.get("pincode"), "—")
    pan_number = _safe_str(data.get("pan") or data.get("panNumber"), "—")
    gstin = _safe_str(data.get("gstin") or data.get("gstNumber"), "Not Applicable / Unregistered")
    bank_name = _safe_str(data.get("bankName"), "State Bank of India")
    account_no = _safe_str(data.get("accountNumber"), "—")
    ifsc = _safe_str(data.get("ifsc"), "—")
    sig_url = data.get("signatureUrl") or ""
    signed_at = _safe_str(data.get("signedAt"), datetime.now(timezone.utc).strftime("%d %B %Y, %I:%M %p UTC"))
    agreement_ref = _safe_str(data.get("agreementRef"), f"QP-SLA-2026-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}")
    commission_rate = _safe_str(data.get("commissionRate"), "15.0%")

    # =========================================================================
    # PAGE 1: HEADER & PARTIES
    # =========================================================================
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", p_bold),
            Paragraph(f"<b>Reference:</b> {agreement_ref}", p_small),
        ],
        [
            Paragraph(f"CIN: {comp_cin} · GSTIN: {comp_gstin} · PAN: {comp_pan}", p_small),
            Paragraph(f"<b>Effective Date:</b> {signed_at[:11]}", p_small),
        ],
        [
            Paragraph(f"Regd. Office: {comp_address}", p_small),
            Paragraph("<b>E-Sign Status:</b> Verified via Email OTP", p_small),
        ],
    ]
    t_header = Table(header_data, colWidths=[340, 180])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("MASTER LAUNDRY MERCHANT FRANCHISE & SERVICE LEVEL AGREEMENT", title_style))
    story.append(Paragraph("Digital Bilateral Commercial Contract (Executed under Section 10A, IT Act 2000)", subtitle_style))
    story.append(Spacer(1, 10))

    intro_text = (
        f"This <b>Master Laundry Merchant Franchise & Service Level Agreement</b> (\"Agreement\") is entered into on "
        f"<b>{signed_at[:11]}</b> by and between <b>{company_name}</b>, having its registered corporate office at Pioneer Tech Park, "
        f"Kasganj, Uttar Pradesh, India (hereinafter referred to as the <b>\"Platform\"</b> or <b>\"QuickPress\"</b>, which expression shall "
        f"unless repugnant to the context include its successors and assigns), represented by <b>{signatory_name}</b>, Director / Authorized Signatory, "
        f"AND <b>{store_name}</b>, owned and operated by <b>{owner_name}</b>, having its business place at {store_address}, {city} - {pincode} "
        f"(hereinafter referred to as the <b>\"Merchant Partner\"</b> or <b>\"Laundromat Partner\"</b>). "
        f"Both QuickPress and the Merchant Partner are individually referred to as a \"Party\" and collectively as the \"Parties\"."
    )
    story.append(Paragraph(intro_text, p_style))
    story.append(Spacer(1, 8))

    # Parties Summary Table
    parties_data = [
        [
            Paragraph("<b>PARTY A: QUICKPRESS PLATFORM</b>", p_bold),
            Paragraph("<b>PARTY B: MERCHANT PARTNER</b>", p_bold),
        ],
        [
            Paragraph(f"<b>Corporate Entity:</b> {company_name}", p_small),
            Paragraph(f"<b>Store Business Name:</b> {store_name}", p_small),
        ],
        [
            Paragraph(f"<b>Authorized Signatory:</b> {signatory_name} (Director)", p_small),
            Paragraph(f"<b>Proprietor / Signatory:</b> {owner_name}", p_small),
        ],
        [
            Paragraph("<b>Official Email:</b> info@withquickpress.com", p_small),
            Paragraph(f"<b>Verified Email:</b> {partner_email}", p_small),
        ],
        [
            Paragraph("<b>Escalation Email:</b> official.quickpress@gmail.com", p_small),
            Paragraph(f"<b>Registered Mobile:</b> {partner_phone}", p_small),
        ],
        [
            Paragraph("<b>Platform Commission:</b> 15% Standard Tier", p_small),
            Paragraph(f"<b>PAN:</b> {pan_number} · <b>GSTIN:</b> {gstin}", p_small),
        ],
        [
            Paragraph("<b>Settlement Rail:</b> T+1 Daily Direct Bank Transfer", p_small),
            Paragraph(f"<b>Bank:</b> {bank_name} (A/C: XX{account_no[-4:] if len(account_no) >= 4 else account_no})", p_small),
        ],
    ]
    t_parties = Table(parties_data, colWidths=[260, 260])
    t_parties.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f1f5f9")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#ecfdf5")),
        ("BOX", (0, 0), (-1, -1), 0.8, c_border),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_parties)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1. COMMERCIAL TERMS & FINANCIAL SETTLEMENTS", h2_style))
    clauses_p1 = [
        ("1.1 Platform Commission Rate:", f"The Merchant agrees to a standard platform commission of <b>{commission_rate}</b> (inclusive of payment gateway handling) on the net order value processed through the QuickPress marketplace. Commission applies strictly on completed, verified customer deliveries."),
        ("1.2 T+1 Daily Settlements:", "All merchant earnings (85% of order value) are settled directly to the designated bank account within twenty-four (24) business hours of order delivery completion. No manual withdrawal request is required."),
        ("1.3 Double-Entry Financial Precision:", "Every order transaction is recorded in the QuickPress double-entry immutable ledger. Partner may download daily transaction statements and GST-compliant tax invoices via the Partner Console."),
        ("1.4 Cash-on-Delivery (COD) Protection:", "For cash-on-delivery orders, delivery captains collect payment at the doorstep. The platform credits the partner's wallet ledger instantly, eliminating partner cash float risk."),
    ]
    for title, text in clauses_p1:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: OPERATIONAL SLAS & SERVICE STANDARDS
    # =========================================================================
    story.append(Paragraph("2. OPERATIONAL SERVICE LEVEL AGREEMENTS (SLA)", h2_style))
    story.append(Spacer(1, 4))

    clauses_p2 = [
        ("2.1 Processing Timelines (SLA Guarantees):", "Merchant undertakes to wash, steam iron, or dry-clean customer garments within the agreed turnaround hours: 12 hours for express steam iron, 24 hours for wash & fold, and 48 hours for dry-clean suits and heavy blankets."),
        ("2.2 Garment Intake & Inspection Verification:", "Upon receiving garments from the delivery captain, the Merchant shall physically verify item counts and condition within thirty (30) minutes. Any pre-existing tear, color bleed, or missing button must be recorded in the intake app before processing begins."),
        ("2.3 Quality Standards & Detergent Compliance:", "Merchant shall use only certified fabric-safe detergents, commercial steam presses, and clean solvent baths. Under no circumstances may hazardous chemicals or unfiltered hard water be used."),
        ("2.4 Protective Breathable Packaging:", "All processed garments must be packed in QuickPress-approved breathable poly covers or on wire hangers with dust shields, ready for captain pickup."),
        ("2.5 Loss & Damage Resolution Policy:", "In the event a customer garment is damaged or lost during store processing, liability shall be adjudicated per the QuickPress Fair Care Matrix: 100% reimbursed by partner up to five (5) times the cleaning fee or actual depreciated garment value."),
        ("2.6 Store Availability & GPS Radius:", "Merchant shall keep their store operational during declared operating hours. Delivery captains navigate to the exact GPS pin registered on the map. Merchant shall not decline orders without cause."),
    ]
    for title, text in clauses_p2:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 5))

    story.append(Spacer(1, 6))
    story.append(Paragraph("3. LOGISTICS, CAPTAIN DISPATCH & TERRITORY", h2_style))
    clauses_p2_extra = [
        ("3.1 Dedicated Captain Fleet:", "QuickPress provides two-wheeler delivery captains for customer doorstep pickup and merchant handoff. The Merchant is not required to employ delivery staff."),
        ("3.2 Turn-by-Turn Navigation Target:", "Captains rely on the GPS coordinates pinned during onboarding. Handover must occur at the store counter within five (5) minutes of captain arrival."),
        ("3.3 Operational Territory:", f"The Merchant's store is designated as the primary care hub for the <b>{city} ({pincode})</b> zone with a serviceable pickup radius of up to 10 kilometers."),
    ]
    for title, text in clauses_p2_extra:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 5))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: LEGAL TERMS & BILATERAL SIGNATURES BOX
    # =========================================================================
    story.append(Paragraph("4. LEGAL TERMS, TERM & TERMINATION", h2_style))
    clauses_p3 = [
        ("4.1 Agreement Duration:", "This Agreement shall commence on the Effective Date and remain in force for an initial term of twelve (12) months, automatically renewing on mutually agreeable terms."),
        ("4.2 Termination for Convenience:", "Either Party may terminate this Agreement by providing thirty (30) days prior written notice via registered email to info@withquickpress.com or the partner's verified email."),
        ("4.3 Digital Authenticity (IT Act, 2000):", "The Parties acknowledge that this Agreement is executed by digital electronic authentication. Under Section 10A of the Information Technology Act, 2000, electronic contracts confirmed via verified email OTP and digital signature are legally valid and enforceable in courts of law."),
        ("4.4 Dispute Resolution & Jurisdiction:", "Any dispute arising out of this Agreement shall be subject to amicable settlement within fifteen (15) days, failing which the courts having jurisdiction in Uttar Pradesh, India shall have exclusive jurisdiction."),
    ]
    for title, text in clauses_p3:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 8))
    story.append(Paragraph("5. EXECUTION & AUTHORIZED BILATERAL SIGNATURES", h2_style))
    story.append(Paragraph("IN WITNESS WHEREOF, the Parties have executed this Master Agreement on the date recorded herein:", p_small))
    story.append(Spacer(1, 6))

    # Load Company Official Seal Image
    seal_flowable = None
    if os.path.exists(SEAL_PATH):
        try:
            seal_flowable = RLImage(SEAL_PATH, width=70, height=70)
        except Exception as err:
            logger.warning("Could not load seal image: %s", err)

    # Load Partner Uploaded Signature Image
    partner_sig_flowable = None
    sig_stream = _decode_signature_image(sig_url)
    if sig_stream:
        try:
            partner_sig_flowable = RLImage(sig_stream, width=120, height=45)
        except Exception as err:
            logger.warning("Could not load partner signature image: %s", err)

    # Build Left Column (Platform Seal & Signatory)
    left_cells = [
        Paragraph(f"<b>FOR: {company_name}</b>", p_bold),
        Spacer(1, 4),
        seal_flowable or Paragraph("<b>[OFFICIAL CORPORATE SEAL]</b>", p_small),
        Spacer(1, 4),
        Paragraph(f"<b>Authorized Signatory:</b> {signatory_name}", p_small),
        Paragraph("<b>Designation:</b> Director / Authorized Signatory", p_small),
        Paragraph("<b>Email:</b> info@withquickpress.com", p_small),
        Paragraph(f"<b>Timestamp:</b> {signed_at[:11]} · Digital Verified", p_small),
    ]

    # Build Right Column (Merchant Partner Signature)
    right_cells = [
        Paragraph(f"<b>FOR: {store_name.upper()}</b>", p_bold),
        Spacer(1, 4),
        partner_sig_flowable or Paragraph("<b>[MERCHANT AUTHORIZED SIGNATURE]</b>", p_small),
        Spacer(1, 4),
        Paragraph(f"<b>Authorized Signatory:</b> {owner_name}", p_small),
        Paragraph("<b>Designation:</b> Proprietor / Managing Partner", p_small),
        Paragraph(f"<b>Verified Email:</b> {partner_email}", p_small),
        Paragraph(f"<b>OTP Verified At:</b> {signed_at}", p_small),
    ]

    sig_box_data = [
        [
            left_cells,
            right_cells,
        ]
    ]

    t_signatures = Table(sig_box_data, colWidths=[260, 260])
    t_signatures.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.2, c_blue),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#f0fdf4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(KeepTogether(t_signatures))
    story.append(Spacer(1, 8))

    # Audit Footer
    from app.config import get_settings
    settings = get_settings()
    audit_email = settings.smtp_user or "official.quickpress@gmail.com"
    audit_text = (
        f"<b>DIGITAL AUDIT TRAIL:</b> Agreement ID: {agreement_ref} | Signatory Email: {partner_email} | "
        f"Platform Dispatch: Hostinger API / SMTP | Legal Entity: {company_name} | Copy sent to: {audit_email}"
    )
    story.append(Paragraph(audit_text, p_small))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
