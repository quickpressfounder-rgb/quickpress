"""QuickPress Master Delivery Captain Franchise & Service Level Agreement (SLA) PDF Generator.

Generates an official, legally-binding 3-page bilateral delivery partner agreement PDF:
- Corporate: QUICKPRESS TECHNOLOGIES PRIVATE LIMITED
- Authorized Signatory: Dhani Ram (Director / Authorized Signatory)
- Official Seal Stamp: Circular company seal with 3 stars
- Delivery Captain: Full Name, Verified Email, Phone, DL No, Vehicle RC, Bank Account
- Core SLA Clauses: Cash Remittance (COD float within 24 hrs), Garment Integrity, Road Safety, Payouts
- Signatures: Corporate Official Seal on left, Captain Uploaded/Drawn Signature on right
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
        logger.warning("Could not decode captain signature image: %s", exc)
        return None


def generate_rider_agreement_pdf(data: Dict[str, Any]) -> bytes:
    """Generate official QuickPress Captain Agreement PDF bytes."""
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
    c_blue = colors.HexColor("#006045")  # QuickPress Emerald Theme
    c_emerald = colors.HexColor("#047857")
    c_muted = colors.HexColor("#475569")
    c_border = colors.HexColor("#cbd5e1")

    title_style = ParagraphStyle(
        "AgreementTitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=14,
        leading=18,
        textColor=c_blue,
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        "AgreementSubtitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=9.5,
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
        spaceBefore=8,
        spaceAfter=4,
    )
    p_body = ParagraphStyle(
        "AgreementBody",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=12.5,
        textColor=c_primary,
    )
    p_bold = ParagraphStyle(
        "AgreementBodyBold",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=12.5,
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

    # Extract Captain Data
    captain_name = _safe_str(data.get("fullName") or data.get("name") or data.get("captainName"), "Delivery Captain")
    captain_phone = _safe_str(data.get("phone") or data.get("mobile"))
    captain_email = _safe_str(data.get("email"), "captain@withquickpress.com")
    rider_id = _safe_str(data.get("riderId") or data.get("id"), "CAP-NEW")
    city = _safe_str(data.get("city") or data.get("preferredCity"), "Kasganj")
    vehicle_model = _safe_str(data.get("vehicleModel") or data.get("model") or data.get("vehicle"), "Two-Wheeler")
    vehicle_number = _safe_str(data.get("vehicleNumber") or data.get("rcNumber") or data.get("plate"), "—")
    license_number = _safe_str(data.get("license") or data.get("dlNumber"), "—")
    bank_name = _safe_str(data.get("bankName"), "—")
    account_number = _safe_str(data.get("accountNumber"), "—")
    ifsc = _safe_str(data.get("ifsc"), "—")
    sig_url = data.get("signatureUrl") or data.get("agreementSignature") or ""
    signed_at = _safe_str(data.get("signedAt") or data.get("agreementSignedAt"), datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC"))

    company_name = "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED"
    signatory_name = "Dhani Ram"
    agreement_ref = _safe_str(data.get("agreementRef"), f"QP-CAPTAIN-SLA-2026-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}")

    # =========================================================================
    # PAGE 1: PREAMBLE & CAPTAIN PARTICULARS
    # =========================================================================
    header_table_data = [
        [
            Paragraph("<b>QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</b><br/><font size=7 color='#64748b'>CIN: U93090UP2026PTC192841 · Regd. Office: Kasganj, Uttar Pradesh 207123</font>", p_body),
            Paragraph(f"<b>Reference:</b> {agreement_ref}<br/><b>Captain ID:</b> {rider_id}<br/><b>Date:</b> {signed_at[:11]}", p_small),
        ]
    ]
    t_head = Table(header_table_data, colWidths=[360, 160])
    t_head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_head)
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceBefore=4, spaceAfter=8))

    story.append(Paragraph("MASTER DELIVERY CAPTAIN SERVICE LEVEL & ONBOARDING AGREEMENT", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("OFFICIAL BILATERAL LOGISTICS PARTNER CONTRACT · QUICKPRESS TECHNOLOGIES", subtitle_style))
    story.append(Spacer(1, 8))

    preamble = (
        f"This <b>Master Delivery Captain Service Level & Onboarding Agreement</b> (\"Agreement\") is entered into on "
        f"<b>{signed_at[:11]}</b> by and between <b>{company_name}</b>, an Indian corporation having its principal office at "
        f"Kasganj, Uttar Pradesh (hereinafter referred to as \"<b>QuickPress</b>\", which expression shall include its successors and assigns), "
        f"and <b>{captain_name.upper()}</b> (hereinafter referred to as \"<b>Delivery Captain</b>\" or \"<b>Contractor</b>\"). "
        f"QuickPress and the Delivery Captain are individually referred to as a \"<b>Party</b>\" and collectively as the \"<b>Parties</b>\"."
    )
    story.append(Paragraph(preamble, p_body))
    story.append(Spacer(1, 8))

    story.append(Paragraph("1. CAPTAIN PARTICULARS & REGISTERED CREDENTIALS", h2_style))
    particulars_data = [
        [Paragraph("<b>Full Legal Name:</b>", p_small), Paragraph(captain_name, p_body), Paragraph("<b>Captain ID:</b>", p_small), Paragraph(rider_id, p_body)],
        [Paragraph("<b>Verified Email:</b>", p_small), Paragraph(captain_email, p_body), Paragraph("<b>Registered Mobile:</b>", p_small), Paragraph(captain_phone, p_body)],
        [Paragraph("<b>Operating Hub / City:</b>", p_small), Paragraph(city, p_body), Paragraph("<b>Driving License No:</b>", p_small), Paragraph(license_number, p_body)],
        [Paragraph("<b>Vehicle Model:</b>", p_small), Paragraph(vehicle_model, p_body), Paragraph("<b>Vehicle Plate / RC:</b>", p_small), Paragraph(vehicle_number, p_body)],
        [Paragraph("<b>Bank Name:</b>", p_small), Paragraph(bank_name, p_body), Paragraph("<b>Account Number:</b>", p_small), Paragraph(account_number, p_body)],
        [Paragraph("<b>IFSC Code:</b>", p_small), Paragraph(ifsc, p_body), Paragraph("<b>Statutory Verification:</b>", p_small), Paragraph("Aadhaar & Email OTP Verified", p_body)],
    ]
    t_part = Table(particulars_data, colWidths=[110, 150, 110, 150])
    t_part.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, c_border),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f8fafc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t_part)
    story.append(Spacer(1, 8))

    story.append(Paragraph("2. SCOPE OF SERVICES & INDEPENDENT CONTRACTOR RELATIONSHIP", h2_style))
    clauses_p1 = [
        ("1.1 Principal-to-Principal Engagement:", "The Delivery Captain engages with QuickPress strictly as an independent contractor logistics partner. Nothing in this Agreement shall create an employer-employee, agency, or partnership relationship."),
        ("1.2 Hyper-local Order Fulfillment:", "The Captain shall fulfill on-demand pickup and delivery of laundered garments, linen, and dry cleaning between customer doorsteps and affiliated QuickPress partner stores within designated geofenced service hubs."),
        ("1.3 Equipment & Roadworthiness:", "The Captain shall at all times maintain their two-wheeler in roadworthy condition with valid RC, active third-party insurance, and possess a valid Driving License recognized by Indian Motor Vehicles Act."),
    ]
    for title, text in clauses_p1:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 3))

    # =========================================================================
    # PAGE 2: OPERATIONAL SLAS, COD FLOAT & FINANCIAL INTEGRITY
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("3. OPERATIONAL SERVICE LEVEL AGREEMENTS (SLAS) & CASH (COD) POLICY", h2_style))

    clauses_p2 = [
        ("2.1 Punctuality & Fulfillment Windows:", "Upon accepting an order dispatch offer via the QuickPress Captain Application, the Captain shall arrive at the assigned pickup location within fifteen (15) minutes and complete transit within the platform-allocated SLA window."),
        ("2.2 Cash On Delivery (COD) Remittance:", "The Captain agrees that all cash collected from customers during COD deliveries belongs exclusively to QuickPress and its merchant partners. The Captain shall remit all collected cash within twenty-four (24) hours or settle their digital float via UPI/PG before taking further orders."),
        ("2.3 COD Float Limits & Suspension:", "If the Captain's unsettled cash float exceeds ₹2,000 (Rupees Two Thousand), order dispatch will be automatically suspended until the ledger is balanced. Intentional withholding of customer cash constitutes criminal breach of trust under Indian Penal Code."),
        ("2.4 Garment Protection & Hygiene Standard:", "Garments must be transported exclusively within water-resistant QuickPress delivery bags with hanger supports. Carrying loose clothes exposed to rain, dust, or grease is strictly prohibited."),
        ("2.5 Customer Interaction & Safety Ethics:", "The Captain shall conduct deliveries with absolute professionalism, courtesy, and respect. QuickPress operates a zero-tolerance policy against any verbal abuse, harassment, or misconduct."),
        ("2.6 Road Safety & Mandatory Helmet Rule:", "The Captain shall wear an ISI-certified safety helmet at all times during active transit and obey all traffic regulations. Rash driving or riding under the influence results in immediate permanent ban."),
    ]
    for title, text in clauses_p2:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 3.5))

    story.append(Spacer(1, 6))
    story.append(Paragraph("4. COMMERCIAL TERMS, EARNINGS & PAYOUTS", h2_style))
    clauses_comm = [
        ("3.1 Delivery Fee Structure:", "The Captain shall earn a transparent per-drop fee based on base pickup allowance + per-kilometer distance travelled + live surge multiplier as calculated by the automated QuickPress dispatch engine."),
        ("3.2 Incentive & Bonus Programs:", "Target bonuses and peak-hour incentives are disbursed subject to fulfilling minimum acceptance rate (≥85%) and completion rate (≥95%) benchmarks."),
        ("3.3 Automated Bank Settlements:", "Net earnings are credited directly to the Captain's registered bank account on a weekly settlement cycle (T+1 on scheduled settlement days) without unauthorized deductions."),
    ]
    for title, text in clauses_comm:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 3.5))

    # =========================================================================
    # PAGE 3: DIGITAL EXECUTION, AUDIT TRAIL & SIGNATURES
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("5. TERMINATION, JURISDICTION & DIGITAL ENFORCEABILITY", h2_style))

    clauses_p3 = [
        ("4.1 Agreement Duration:", "This Agreement takes effect on the Execution Date and remains active for an initial period of twelve (12) months, automatically renewing unless terminated."),
        ("4.2 Termination for Cause:", "QuickPress reserves the right to terminate this contract immediately and blacklist the Captain upon: (a) theft or non-remittance of COD cash, (b) customer harassment, (c) submission of counterfeit DL/Aadhaar/RC documents."),
        ("4.3 Digital Authenticity (IT Act, 2000 Section 10A):", "The Parties acknowledge that this Agreement is executed by digital electronic authentication. Under Section 10A of the Information Technology Act, 2000, electronic contracts confirmed via verified email OTP and digital signature are legally valid and enforceable in courts of law."),
        ("4.4 Dispute Resolution & Governing Law:", "Any disputes shall be settled through amicable negotiation within fifteen (15) days, failing which the courts in Uttar Pradesh, India shall have exclusive jurisdiction."),
    ]
    for title, text in clauses_p3:
        story.append(Paragraph(f"<b>{title}</b> {text}", clause_style))
        story.append(Spacer(1, 3.5))

    story.append(Spacer(1, 8))
    story.append(Paragraph("6. EXECUTION & AUTHORIZED BILATERAL SIGNATURES", h2_style))
    story.append(Paragraph("IN WITNESS WHEREOF, the Parties have executed this Master Agreement on the date recorded herein:", p_small))
    story.append(Spacer(1, 6))

    # Load Company Official Seal Image
    seal_flowable = None
    if os.path.exists(SEAL_PATH):
        try:
            seal_flowable = RLImage(SEAL_PATH, width=70, height=70)
        except Exception as err:
            logger.warning("Could not load seal image: %s", err)

    # Load Captain Uploaded Signature Image
    captain_sig_flowable = None
    sig_stream = _decode_signature_image(sig_url)
    if sig_stream:
        try:
            captain_sig_flowable = RLImage(sig_stream, width=120, height=45)
        except Exception as err:
            logger.warning("Could not load captain signature image: %s", err)

    # Build Left Column (QuickPress Official Seal & Signatory)
    left_cells = [
        Paragraph(f"<b>FOR: {company_name}</b>", p_bold),
        Spacer(1, 4),
        seal_flowable or Paragraph("<b>[OFFICIAL CORPORATE SEAL]</b>", p_small),
        Spacer(1, 4),
        Paragraph(f"<b>Authorized Signatory:</b> {signatory_name}", p_small),
        Paragraph("<b>Designation:</b> Director / Logistics Operations", p_small),
        Paragraph("<b>Email:</b> info@withquickpress.com", p_small),
        Paragraph(f"<b>Timestamp:</b> {signed_at[:11]} · Digital Verified", p_small),
    ]

    # Build Right Column (Captain Signature & Email OTP Verification)
    right_cells = [
        Paragraph(f"<b>FOR: {captain_name.upper()} (CAPTAIN)</b>", p_bold),
        Spacer(1, 4),
        captain_sig_flowable or Paragraph("<b>[CAPTAIN DIGITAL SIGNATURE]</b>", p_small),
        Spacer(1, 4),
        Paragraph(f"<b>Authorized Signatory:</b> {captain_name}", p_small),
        Paragraph("<b>Designation:</b> Independent Delivery Partner", p_small),
        Paragraph(f"<b>Verified Email:</b> {captain_email}", p_small),
        Paragraph(f"<b>OTP Authorized At:</b> {signed_at}", p_small),
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
    audit_text = (
        f"<b>DIGITAL AUDIT TRAIL:</b> Agreement ID: {agreement_ref} | Captain ID: {rider_id} | "
        f"Verified Email: {captain_email} | Platform Dispatch: Hostinger SMTP | Legal Entity: {company_name} | Copy CC: official.quickpress@gmail.com"
    )
    story.append(Paragraph(audit_text, p_small))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
