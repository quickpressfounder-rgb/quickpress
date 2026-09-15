"""CMS repositories and seeds for QuickPress Public Information Website.

Handles:
- website_legal_docs (Version controlled Privacy Policy, Terms & Conditions, Refund Policy)
- website_faqs (Categorized FAQs)
- website_contact_messages (Inbound contact inquiries)
- website_settings (Public brand metadata, contact info, SEO)
- website_pages (Public page content and editorial highlights)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.db.client import database

logger = logging.getLogger(__name__)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# =========================================================================
#  Initial Verified Legal Documents Seed (Version 1.0)
# =========================================================================

LEGAL_DOCS_SEED: Dict[str, Dict[str, Any]] = {
    "privacy-policy": {
        "_id": "privacy-policy",
        "title": "Privacy Policy",
        "slug": "privacy-policy",
        "currentVersion": "1.0",
        "effectiveDate": "2026-08-25",
        "status": "published",
        "publishedAt": "2026-08-25T00:00:00Z",
        "publishedBy": "QuickPress Legal Desk",
        "summary": "This Privacy Policy explains how QuickPress collects, uses, processes, and protects your personal data across our customer application, partner platform, rider app, and public website.",
        "content": """# QuickPress Privacy Policy

**Effective Date:** 25 August 2026  
**Last Updated:** 25 August 2026  
**Version:** 1.0  

QuickPress ("we", "us", "our", or "Company") is committed to protecting your privacy. This Privacy Policy describes how we collect, use, store, share, and protect your personal information when you use our website [https://www.quickpress.online](https://www.quickpress.online), our mobile applications (Customer, Partner, Rider), and our door-to-door laundry & dry cleaning platform services.

---

## 1. Information We Collect

We only collect information necessary to provide, optimize, and fulfill our laundry, dry cleaning, pickup, and delivery services:

### A. Information You Provide to Us
- **Account Identification:** Mobile phone number (used for secure OTP authentication), full name, and email address.
- **Address & Location:** Delivery addresses, home/office tags, landmark information, and GPS coordinates provided during order booking for pickup & doorstep drop-off.
- **Order Details:** Selected garments, laundry service choices, fabric preferences, special wash instructions, and pickup/delivery time slots.
- **Communications:** Messages sent via our support desk, contact forms, feedback surveys, or customer service tickets.

### B. Information Automatically Collected
- **Device & Connection:** Device type, operating system version, browser type, IP address, and network state to ensure secure session management.
- **Order & Payment Verification:** Transaction reference IDs, payment method kind (UPI, Card, NetBanking, QuickPress Wallet), and payment status returned by our secure payment gateway partner (Razorpay). *Note: QuickPress does NOT store your credit/debit card numbers, CVVs, or bank netbanking passwords.*
- **Logistics Tracking:** Real-time rider location coordinates during active order pickup and delivery journeys to show accurate live tracking on your app.

---

## 2. How We Use Your Information

We use the collected information strictly for legitimate operational purposes:
- To facilitate order placement, partner store garment processing, and rider pickup/delivery logistics.
- To authenticate your account securely via Firebase Phone OTP verification.
- To send transactional notifications (order confirmation, laundry stage updates, rider arrival, invoices).
- To process refunds, wallet balance credits, and member cashback allowances.
- To prevent fraud, double-payment errors, and unauthorized access to platform services.
- To comply with applicable statutory laws, tax regulations, and GST invoicing requirements in India.

---

## 3. Data Sharing & Third-Party Service Providers

QuickPress does NOT sell, rent, or trade your personal data to third parties for marketing purposes. We share data only with verified ecosystem partners strictly for service fulfillment:
- **Local Laundry Partners:** Garment lists, customer name, and order instructions so your clothes can be processed according to fabric care standards.
- **Delivery Fleet (Riders):** Customer delivery address, phone number (masked where applicable), and live delivery notes for accurate pickup/drop-off.
- **Payment Gateways:** Razorpay for secure end-to-end encrypted payment processing under RBI guidelines.
- **Cloud Infrastructure & Authentication:** Google Cloud / Firebase for secure OTP generation and data hosting.
- **Legal Authorities:** Only when mandated by Indian law, judicial orders, or governmental law enforcement agencies.

---

## 4. Data Security & Storage

- All data transmitted between your device, our apps, and our servers is encrypted using industry-standard TLS/HTTPS protocols.
- Access to sensitive operational records is restricted to authorized personnel with strict Role-Based Access Control (RBAC) and audit logging.
- Customer payment secrets and biometric data are never captured or saved on QuickPress systems.

---

## 5. Your Rights & Account Deletion

You maintain complete control over your personal information:
- **Access & Edit:** You can view and update your profile information, saved addresses, and preferences directly in the QuickPress Customer App.
- **Data Portability & Inquiries:** You may request a copy of your transaction history or order records.
- **Account Deletion:** You have the right to request permanent deletion of your account and associated profile data by contacting `support@quickpress.in` or using the In-App Account Settings > Delete Account option. Upon request, non-essential data is removed within 30 days, subject to mandatory tax & financial record retention laws.

---

## 6. Updates to This Policy

We may update this Privacy Policy periodically to reflect technological, operational, or legal changes. All revisions are version-tracked and published live through our Admin CMS without requiring an app reinstall. The effective date at the top will indicate when the latest version came into effect.

---

## 7. Contacting QuickPress Legal & Privacy Desk

If you have any questions, concerns, or requests regarding this Privacy Policy or our data handling practices, please reach out to us:

* **Official Email:** [support@quickpress.in](mailto:support@quickpress.in)
* **Helpline:** 1800 012 3456 / +91 90000 90000 (Mon–Sun, 8:00 AM – 9:00 PM IST)
* **Operating Address:** QuickPress Laundry Technologies, Kasganj, Uttar Pradesh 207123, India
""",
        "versions": [
            {
                "version": "1.0",
                "status": "published",
                "publishedAt": "2026-08-25T00:00:00Z",
                "publishedBy": "QuickPress Legal Desk",
                "changeLog": "Initial verified production baseline for QuickPress Platform.",
                "content": "..."  # matches content above
            }
        ]
    },
    "terms": {
        "_id": "terms",
        "title": "Terms & Conditions",
        "slug": "terms",
        "currentVersion": "1.0",
        "effectiveDate": "2026-08-25",
        "status": "published",
        "publishedAt": "2026-08-25T00:00:00Z",
        "publishedBy": "QuickPress Legal Desk",
        "summary": "These Terms and Conditions govern your access to and use of QuickPress consumer applications, partner services, pickup/delivery network, and online platform.",
        "content": """# QuickPress Terms & Conditions

**Effective Date:** 25 August 2026  
**Last Updated:** 25 August 2026  
**Version:** 1.0  

Welcome to QuickPress! These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("Customer", "User", "you") and QuickPress ("QuickPress", "we", "us", "our") regarding your use of the QuickPress website ([https://www.quickpress.online](https://www.quickpress.online)), mobile applications, and laundry logistics services.

By accessing our website, creating an account, or placing an order, you agree to be bound by these Terms.

---

## 1. Eligibility & Account Registration

- You must be at least 18 years of age or possess legal parental/guardian consent to create an account and place orders on QuickPress.
- You agree to provide accurate, complete, and updated information (phone number, name, delivery address) during registration.
- Authentication is conducted via One-Time Password (OTP) sent to your registered mobile number. You are solely responsible for maintaining the confidentiality of your OTP and device access.

---

## 2. Laundry & Dry Cleaning Services

- QuickPress operates as a technology-enabled laundry and dry cleaning network connecting customers with certified local laundry partner stores and trained logistics delivery riders.
- Available services include **Wash & Fold, Dry Cleaning, Steam Iron, Premium Laundry, Shoe Cleaning, Carpet Cleaning, Curtain Cleaning, Blanket Cleaning, and Bag & Leather Cleaning**.
- Pricing is calculated based on exact garment counts or calibrated scale weight recorded during pickup verification. The finalized summary is presented to the customer prior to wash processing.

---

## 3. Pickup, Verification & Delivery

- Pickups and deliveries are scheduled during designated time windows (Morning: 8 AM–12 PM, Afternoon: 12 PM–4 PM, Evening: 4 PM–8 PM).
- Customers must ensure that all pockets, bags, and garment compartments are cleared of cash, jewelry, cards, electronics, and personal valuables prior to handover. QuickPress is not liable for items left inside pockets.
- At the time of pickup, our delivery rider conducts a garment item count inspection. Any pre-existing tears, discoloration, missing buttons, or heavy fabric damage will be noted.

---

## 4. Payment Terms & QuickPress Wallet

- Orders may be paid via supported payment methods: **Online Payment (Razorpay UPI, Debit/Credit Cards, NetBanking), QuickPress Wallet, or Cash on Delivery (COD)**.
- QuickPress Wallet credits and cashback points may be used against eligible order totals in accordance with wallet terms.
- In the event of an online payment failure where money is deducted from your bank, the payment gateway will automatically reconcile and credit your account within standard banking cycles.

---

## 5. Garment Care, Liability & Damage Policy

- Certified partner laundries adhere to strict international fabric care instructions (separate white/colour sorting, temperature-controlled cycles, steam finishing).
- In the rare and unfortunate event of garment damage or loss directly attributable to processing negligence:
  - The customer must report the issue within **24 hours** of order delivery through the Help & Support screen with photographic evidence.
  - QuickPress liability is capped at up to **₹2,000 per garment** or 5x the service charge for that specific item (whichever is lower), credited directly to your QuickPress Wallet or original payment method after technical inspection.
  - Normal wear and tear, pre-existing fabric thinning, color fading due to age, shrinkage of unpreshrunk fabrics, or delicate embellishment detachments are excluded from compensation.

---

## 6. VIP Membership Club

- QuickPress VIP Membership offers eligible customers complimentary delivery, priority express turnaround, and exclusive service privileges.
- Memberships are non-transferable and valid for the duration specified at the time of purchase.

---

## 7. Cancellation & Refunds

- Order cancellations and refunds are strictly governed by our [Refund & Cancellation Policy](/refund-policy).
- Approved refunds are processed back to the original source within **5–7 working days** subject to bank timelines.

---

## 8. Intellectual Property & Acceptable Use

- All logos, trademarks, content, graphics, and software interfaces on QuickPress are the exclusive property of QuickPress.
- Users shall not attempt to reverse engineer, decompile, scrape, or disrupt the platform's digital infrastructure.

---

## 9. Governing Law & Jurisdiction

These Terms are governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Uttar Pradesh, India.

---

## 10. Contact Us

For any clarifications regarding these Terms:
* **Email:** [support@quickpress.in](mailto:support@quickpress.in)
* **Helpline:** 1800 012 3456
* **Registered Address:** QuickPress Laundry Technologies, Kasganj, Uttar Pradesh 207123, India
""",
        "versions": [
            {
                "version": "1.0",
                "status": "published",
                "publishedAt": "2026-08-25T00:00:00Z",
                "publishedBy": "QuickPress Legal Desk",
                "changeLog": "Initial verified production baseline for QuickPress Platform.",
                "content": "..."
            }
        ]
    },
    "refund-policy": {
        "_id": "refund-policy",
        "title": "Refund & Cancellation Policy",
        "slug": "refund-policy",
        "currentVersion": "1.0",
        "effectiveDate": "2026-08-25",
        "status": "published",
        "publishedAt": "2026-08-25T00:00:00Z",
        "publishedBy": "QuickPress Legal Desk",
        "summary": "This policy transparently explains order cancellation rules at different stages, refund eligibility, and payment gateway banking turnaround times.",
        "content": """# QuickPress Refund & Cancellation Policy

**Effective Date:** 25 August 2026  
**Last Updated:** 25 August 2026  
**Version:** 1.0  

At QuickPress, customer satisfaction and fabric care transparency are our highest priorities. We understand that plans change, and we have designed a fair, transparent cancellation and refund policy.

---

## 1. Order Cancellation by Stage

Your ability to cancel an order and the applicable refund depend on the operational stage of your laundry order:

| Order Stage | Cancellation Window | Refund / Cancellation Fee |
| :--- | :--- | :--- |
| **1. Placed / Pending Acceptance** | Instant from App | **100% Full Refund** (No fee) |
| **2. Partner Accepted (Before Rider Dispatch)** | Up to 2 hours before pickup | **100% Full Refund** (No fee) |
| **3. Rider Out for Pickup** | Rider is en route to your doorstep | **Full Refund minus ₹30** Rider Dispatch Fee |
| **4. Garments Picked Up & In Transit** | Clothes collected by rider | Cancellation allowed; **₹50 Logistics Fee** applies |
| **5. Processing / Washing / Dry Cleaning** | Garments in wash/clean cycles | **Cancellation NOT permitted** (Processing underway) |
| **6. Ready / Out for Delivery** | Garments finished & packed | **Cancellation NOT permitted** |
| **7. Delivered** | Order delivered to customer | Eligible for Quality Review within 24 hours |

---

## 2. Refund Eligibility & Scenarios

You are eligible for a refund or wallet credit under the following circumstances:

### A. Pre-Processing Cancellation
If you cancel your order within the eligible pre-pickup windows outlined above, your payment will be refunded in full.

### B. Double Payment / Gateway Glitches
If your bank account was debited multiple times for a single order due to a network glitch, all duplicate debits are automatically reconciled and refunded.

### C. Service Unavailability
If a certified partner store or rider is unable to fulfill your order due to unforeseen operational constraints, you will receive an immediate 100% refund.

### D. Quality Complaints & Service Deficiencies
If you are unsatisfied with garment cleaning quality or if an item is missing/damaged:
1. Raise a ticket within **24 hours** of delivery via App Help & Support.
2. Our Quality Assurance team will review the pre-wash intake photographs and issue a complimentary re-wash, QuickPress Wallet credit, or monetary compensation as per terms.

---

## 3. Refund Timelines & Payment Gateway Processing

> [!IMPORTANT]
> **Approved refunds will generally be processed within 5–7 working days, subject to applicable payment gateway and banking timelines.**

- **QuickPress Wallet Refunds:** Instant (available in your wallet within 5 minutes of approval).
- **UPI (Google Pay, PhonePe, Paytm, BHIM):** 1–3 business days.
- **Debit / Credit Cards & NetBanking:** 5–7 business days depending on your issuing bank.

*Note: QuickPress initiates approved refund requests immediately with our gateway partner (Razorpay). Banking holidays and weekend settlement cycles may affect final credit appearance in your account statement.*

---

## 4. How to Request a Cancellation or Refund

1. **In-App Cancellation:** Open QuickPress App > Orders > Select Active Order > Tap **Cancel Order**.
2. **Help Desk Support:** Go to Profile > Help & Support > Select "Refund Status" or "Cancel Order".
3. **Email Inquiry:** Write to [support@quickpress.in](mailto:support@quickpress.in) with your Order ID and contact details.

---

## 5. Contact Information

* **Email:** [support@quickpress.in](mailto:support@quickpress.in)
* **Toll-Free Helpline:** 1800 012 3456 / +91 90000 90000
* **Address:** QuickPress Laundry Technologies, Kasganj, Uttar Pradesh 207123, India
""",
        "versions": [
            {
                "version": "1.0",
                "status": "published",
                "publishedAt": "2026-08-25T00:00:00Z",
                "publishedBy": "QuickPress Legal Desk",
                "changeLog": "Initial verified production baseline for QuickPress Platform.",
                "content": "..."
            }
        ]
    },
    "partner-agreement": {
        "_id": "partner-agreement",
        "title": "Partner Merchant Agreement & SLA",
        "slug": "partner-agreement",
        "currentVersion": "1.0",
        "effectiveDate": "2026-08-25",
        "status": "published",
        "publishedAt": "2026-08-25T00:00:00Z",
        "publishedBy": "QuickPress Legal & Partner Desk",
        "summary": "Legally binding Merchant Master Service Agreement governing store onboarding, turnaround SLAs, tiered commissions, fabric care liability, weekly bank settlements, and statutory 1% Section 194-O TCS deductions.",
        "content": """# QuickPress Partner Merchant Master Service Agreement (MSA)

**Effective Date:** 25 August 2026  
**Last Updated:** 25 August 2026  
**Version:** 1.0  
**Statutory Validity:** Legally binding under Section 3A of the Information Technology Act, 2000.

This Partner Merchant Service Agreement ("Agreement") is entered into between **QuickPress Laundry Technologies Private Limited** ("QuickPress", "Platform") and the certified laundry / dry cleaning enterprise ("Partner Store", "Merchant", "You").

---

## 1. Onboarding, KYC & Statutory Compliance
- The Partner must furnish verified business proofs: GSTIN (or declaration where exempt), PAN Card of authorized signatory, Aadhaar-based identity verification, and verified business current bank account details.
- Under Section 3A of the IT Act, 2000, electronic execution via Aadhaar E-Sign or in-app digital signature pad constitutes valid, legally enforceable execution.

---

## 2. Processing Standards & Turnaround Service Level Agreement (SLA)
- **Standard Orders:** Partner must inspect, clean, press, pack, and mark order as READY within **24 hours** of handover from the delivery captain.
- **Express Orders:** Partner must complete processing within **12 hours** of handover.
- **Fabric Sorting & Care:** White garments, delicate silks, woolen apparel, and dark colors must be laundered in separate cycles strictly as per care label symbols.

---

## 3. Commercials, Tiered Commission & Section 194-O TCS
- **Tiered Store Commissions:**
  - **Standard Tier (0–100 orders/mo):** 18% platform commission.
  - **Silver Tier (101–300 orders/mo):** 15% platform commission.
  - **Gold Tier (300+ orders/mo):** 12% platform commission.
- **Government Tax Deduction (TCS):** Under Section 194-O of the Indian Income Tax Act, 1961, QuickPress deducts 1% Tax Collected at Source (TCS) on gross sales and deposits it with the Government against the Partner's PAN.
- **Settlement Cycles:** Net store payouts are calculated automatically by the Immutable Financial Ledger and credited weekly via direct NEFT/IMPS/UPI bank transfer.

---

## 4. Garment Inspection, Loss & Damage Liability Policy
- **Pickup Verification:** When receiving clothes from the captain, the Partner must inspect item count and pre-existing tears or stains.
- **Negligence Liability:** In the event of garment damage, severe shrinkage, color bleeding, or loss due to Partner processing error:
  - Liability is capped at up to **₹2,000 per garment** or 5x the service charge (whichever is lower).
  - QuickPress deducts the approved claim amount from the Partner's next settlement cycle to credit the affected customer.

---

## 5. Non-Circumvention & Customer Data Protection
- Partner Stores shall NOT solicit QuickPress customers directly for offline transactions or distribute competing promotional flyers.
- Customer phone numbers and addresses are strictly protected under Indian Digital Personal Data Protection (DPDP) standards and must never be recorded for unauthorized telemarketing.

---

## 6. Grievance & Termination
- Either party may terminate this agreement with **15 business days** prior written notice.
- Disputes shall be addressed to [partner.support@quickpress.online](mailto:partner.support@quickpress.online) or the Grievance Desk at Kasganj, UP.
""",
        "versions": [
            {
                "version": "1.0",
                "status": "published",
                "publishedAt": "2026-08-25T00:00:00Z",
                "publishedBy": "QuickPress Legal Desk",
                "changeLog": "Initial verified merchant agreement baseline.",
                "content": "..."
            }
        ]
    },
    "rider-agreement": {
        "_id": "rider-agreement",
        "title": "Captain Delivery Partner Agreement",
        "slug": "rider-agreement",
        "currentVersion": "1.0",
        "effectiveDate": "2026-08-25",
        "status": "published",
        "publishedAt": "2026-08-25T00:00:00Z",
        "publishedBy": "QuickPress Logistics Fleet Desk",
        "summary": "Independent Delivery Partner agreement establishing zero-commission earnings, transparent base fares & per-km rates, night/rain surge bonuses, traffic safety rules, and customer OTP delivery protocols.",
        "content": """# QuickPress Captain Delivery Partner Agreement

**Effective Date:** 25 August 2026  
**Last Updated:** 25 August 2026  
**Version:** 1.0  

This Agreement sets forth the terms and conditions under which you ("Captain", "Rider", "Delivery Partner") agree to provide pickup and delivery logistics services across the QuickPress platform network.

---

## 1. Independent Contractor Relationship
- The Captain operates strictly as an independent service provider and micro-entrepreneur. Nothing herein creates an employee-employer or master-servant relationship.
- You have complete autonomy over your operational hours and zone availability by toggling duty status online or offline.

---

## 2. Payout Structure & Zero Commission Policy
- **0% Platform Commission:** QuickPress charges **₹0 commission** from delivery captains. You keep 100% of your trip payouts and customer tips.
- **Base Fare:** Guaranteed ₹30 base payout for pickup or delivery trips up to 2 km.
- **Distance Pay:** Transparent ₹8/km distance rate beyond 2 km.
- **Surge & Weather Incentives:** Additional per-trip bonuses during peak night hours or heavy monsoon conditions.
- **Settlement:** Real-time wallet credits with same-day or weekly auto-settlement to your linked UPI ID or bank account.

---

## 3. Vehicle Roadworthiness, License & Road Safety
- The Captain must hold a valid Indian Driving License (DL) and operate an active two-wheeler with valid Registration Certificate (RC) and third-party insurance.
- **Safety First:** Captains must wear an ISI-certified helmet and adhere strictly to Indian Motor Vehicles Act rules and local traffic speed limits.
- Zero tolerance for riding under the influence of alcohol, drugs, or rash riding.

---

## 4. Garment Handover & Delivery OTP Protocols
- Garments must be transported securely in QuickPress waterproof protective bags to prevent dust or rain damage.
- **OTP Verification:** Delivery handover to the customer MUST be confirmed via the 4-digit Customer Delivery OTP entered into the Captain App before marking completed.

---

## 5. Live Location & Telemetry Privacy
- QuickPress captures live GPS telemetry **only while you are marked ONLINE** on active duty. Live location tracking halts automatically the moment you switch duty OFFLINE.
- Location coordinates are shared with customers solely during active order transit for accurate live arrival tracking.

---

## 6. Support & Emergency Assistance
- 24×7 Captain Helpline & SOS Support: **+91 92587 30561**
- Email: [riders@quickpress.online](mailto:riders@quickpress.online)
""",
        "versions": [
            {
                "version": "1.0",
                "status": "published",
                "publishedAt": "2026-08-25T00:00:00Z",
                "publishedBy": "QuickPress Legal Desk",
                "changeLog": "Initial verified rider agreement baseline.",
                "content": "..."
            }
        ]
    },
    "grievance-redressal": {
        "_id": "grievance-redressal",
        "title": "Grievance Redressal Mechanism & Statutory Nodal Desk",
        "slug": "grievance-redressal",
        "currentVersion": "1.0",
        "effectiveDate": "2026-08-25",
        "status": "published",
        "publishedAt": "2026-08-25T00:00:00Z",
        "publishedBy": "QuickPress Legal & Statutory Compliance Desk",
        "summary": "Statutory Grievance Redressal framework instituted in compliance with Rule 3(2) of Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and Consumer Protection (E-Commerce) Rules, 2020.",
        "content": """# Statutory Grievance Redressal Mechanism

**Effective Date:** 25 August 2026  
**Last Updated:** 25 August 2026  
**Version:** 1.0  
**Statutory Compliance:** Formulated pursuant to Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and Section 5 of the Consumer Protection (E-Commerce) Rules, 2020.

QuickPress is committed to providing prompt, fair, and transparent redressal of consumer, partner merchant, and delivery partner grievances.

---

## 1. Multi-Tier Resolution Framework

### Level 1: Customer & Partner In-App Support
- **Channels:** Live In-App Chat, Support Tickets, or Email at [support@quickpress.online](mailto:support@quickpress.online).
- **Turnaround Time (TAT):** First acknowledgment within **2 hours**; ticket resolution within **24 hours**.

### Level 2: Grievance Officer (Statutory Escalation)
If your complaint is not resolved satisfactorily at Level 1 within 48 hours, you may escalate directly to our designated Grievance Officer:

- **Name:** Mr. Ankit Sharma
- **Designation:** Grievance Redressal Officer
- **Address:** QuickPress Laundry Technologies Private Limited, Station Road, Kasganj, Uttar Pradesh 207123, India
- **Email:** [grievance@quickpress.online](mailto:grievance@quickpress.online)
- **Helpline:** +91 92587 30561 (Mon–Sat, 9:30 AM – 6:30 PM IST)
- **Statutory Acknowledgment:** Within **48 hours** with unique Ticket Reference ID.
- **Resolution SLA:** Mandatory disposal and resolution within **30 days** of filing.

### Level 3: Nodal Officer (Law Enforcement & Regulatory Liaison)
For government bodies, judicial authorities, and statutory cyber-crime law enforcement agencies:
- **Nodal Officer:** Legal Director, Regulatory Affairs
- **Email:** [nodal@quickpress.online](mailto:nodal@quickpress.online)
- **Response Timeline:** Within 24 hours of official requisition.

---

## 2. Consumer Protection Standards
QuickPress strictly prohibits unfair trade practices, misleading advertisements, and undisclosed hidden charges. All pricing, pickup fees, and GST breakdowns are shown transparently before order placement.
""",
        "versions": [
            {
                "version": "1.0",
                "status": "published",
                "publishedAt": "2026-08-25T00:00:00Z",
                "publishedBy": "QuickPress Legal Desk",
                "changeLog": "Initial verified statutory grievance framework.",
                "content": "..."
            }
        ]
    }
}


# =========================================================================
#  Initial Categorized FAQs Seed
# =========================================================================

FAQS_SEED: List[Dict[str, Any]] = [
    # Customer / General
    {
        "_id": "faq-1",
        "category": "Customer",
        "question": "What is QuickPress and how does it work?",
        "answer": "QuickPress is a modern door-to-door laundry and dry cleaning network. You place an order through our app or website, our delivery rider picks up your garments from your doorstep, certified local partner stores clean them using professional fabric care methods, and we deliver fresh, crisp clothes back to your door.",
        "sortOrder": 1,
        "isPublished": True,
    },
    {
        "_id": "faq-2",
        "category": "Customer",
        "question": "How do I schedule my first laundry pickup?",
        "answer": "Simply open the QuickPress app or tap 'Explore Services' on our website, select your service (e.g. Wash & Fold, Dry Cleaning, Steam Iron), pick a convenient pickup time slot (Morning, Afternoon, Evening), enter your address, and confirm your booking.",
        "sortOrder": 2,
        "isPublished": True,
    },
    # Orders & Services
    {
        "_id": "faq-3",
        "category": "Orders",
        "question": "What services does QuickPress provide?",
        "answer": "We offer 9 specialized fabric care services: Wash & Fold, Dry Cleaning, Steam Iron, Premium Laundry, Shoe Cleaning, Carpet Cleaning, Curtain Cleaning, Blanket Cleaning, and Bag & Leather Cleaning.",
        "sortOrder": 3,
        "isPublished": True,
    },
    {
        "_id": "faq-4",
        "category": "Orders",
        "question": "How is the pricing calculated for my order?",
        "answer": "Pricing is calculated based on exact item counts or calibrated scale weight taken during pickup verification. The total is displayed transparently on your order screen before wash processing begins.",
        "sortOrder": 4,
        "isPublished": True,
    },
    # Pickup & Delivery
    {
        "_id": "faq-5",
        "category": "Pickup & Delivery",
        "question": "What are your standard pickup and delivery time slots?",
        "answer": "We operate 7 days a week with three fixed time windows: Morning (8:00 AM – 12:00 PM), Afternoon (12:00 PM – 4:00 PM), and Evening (4:00 PM – 8:00 PM). Express turnaround options are also available for urgent requirements.",
        "sortOrder": 5,
        "isPublished": True,
    },
    {
        "_id": "faq-6",
        "category": "Pickup & Delivery",
        "question": "Do I need to separate my laundry before pickup?",
        "answer": "Our delivery riders and laundry partners inspect and separate whites, darks, and delicate fabrics at the facility according to fabric care labels. However, please ensure all garment pockets are cleared of personal belongings before handover.",
        "sortOrder": 6,
        "isPublished": True,
    },
    # Payments
    {
        "_id": "faq-7",
        "category": "Payments",
        "question": "What payment methods are supported on QuickPress?",
        "answer": "QuickPress supports all major payment modes via Razorpay including UPI (Google Pay, PhonePe, Paytm, BHIM), Debit/Credit Cards (Visa, MasterCard, RuPay), NetBanking, QuickPress Wallet balance, and Cash on Delivery (COD).",
        "sortOrder": 7,
        "isPublished": True,
    },
    {
        "_id": "faq-8",
        "category": "Payments",
        "question": "How do refunds work if I cancel an order?",
        "answer": "Approved refunds to the QuickPress Wallet are instant. Refunds to UPI or original bank payment methods are processed through Razorpay and typically reflect in your account within 5–7 working days.",
        "sortOrder": 8,
        "isPublished": True,
    },
    # Membership
    {
        "_id": "faq-9",
        "category": "Membership",
        "question": "What are the benefits of QuickPress VIP Membership?",
        "answer": "QuickPress VIP Club members enjoy unlimited zero-fee deliveries, priority express turnaround, exclusive monthly wash allowances, and dedicated customer support.",
        "sortOrder": 9,
        "isPublished": True,
    },
    # Partners
    {
        "_id": "faq-10",
        "category": "Partners",
        "question": "How can my local laundry business partner with QuickPress?",
        "answer": "Local laundry owners can visit our 'Partner With Us' page or open the Partner Portal to register. Our team verifies your facility, equipment, and quality standards, after which you receive a digital storefront and live order dispatch.",
        "sortOrder": 10,
        "isPublished": True,
    },
    # Riders
    {
        "_id": "faq-11",
        "category": "Riders",
        "question": "How do I become a delivery rider with QuickPress?",
        "answer": "Visit our 'Become a Rider' page to apply. You will need a valid two-wheeler, driving license, and smartphone. Once onboarding and background verification are complete, you can start accepting flexible pickup and delivery shifts.",
        "sortOrder": 11,
        "isPublished": True,
    },
]


# =========================================================================
#  Initial Website Settings & Landing Page Content Seed
# =========================================================================

WEBSITE_SETTINGS_SEED: Dict[str, Any] = {
    "_id": "global_website_settings",
    "brandName": "QuickPress",
    "tagline": "Laundry, simplified.",
    "subheading": "Pickup. Clean. Care. Delivered.",
    "supportPhone": "1800 012 3456",
    "supportPhoneRaw": "+919000090000",
    "supportEmail": "support@quickpress.in",
    "supportWhatsapp": "+919000090000",
    "operatingAddress": "QuickPress Laundry Technologies, Kasganj, Uttar Pradesh 207123, India",
    "registeredOffice": "QuickPress Laundry Technologies Private Limited, Main Market, Kasganj, Uttar Pradesh 207123, India",
    "workingHours": "Monday – Sunday, 8:00 AM – 9:00 PM IST",
    "activeOperatingCity": "Kasganj, Uttar Pradesh",
    "gstin": "09AAACQ1234F1Z5",
    "cin": "U74999UP2026PTC123456",
    "appStoreUrl": "https://apps.apple.com",  # Handled gracefully in UI
    "playStoreUrl": "https://play.google.com",
    "appStoreAvailable": False,
    "playStoreAvailable": True,
    "socialLinks": {
        "instagram": "https://instagram.com/quickpress",
        "twitter": "https://twitter.com/quickpress",
        "facebook": "https://facebook.com/quickpress",
        "linkedin": "https://linkedin.com/company/quickpress"
    },
    "seo": {
        "defaultTitle": "QuickPress — Premium Online Laundry & Dry Cleaning Doorstep Service",
        "defaultDescription": "QuickPress is India's premier technology-driven laundry and dry cleaning platform. Schedule doorstep pickup for Wash & Fold, Dry Cleaning, Steam Ironing & Shoe Care.",
        "canonicalDomain": "https://www.quickpress.online",
        "ogImage": "/og-image.jpg"
    }
}

LANDING_CONTENT_SEED: Dict[str, Any] = {
    "_id": "website_landing_content",
    "announcement": {
        "enabled": True,
        "badge": "LAUNCH OFFER",
        "text": "🎉 Get 20% OFF your first laundry pickup with code QUICK20!",
        "linkText": "Book Now",
        "linkUrl": "/home"
    },
    "hero": {
        "badgeText": "⚡ Lightning-Fast Doorstep Laundry",
        "headline": "Fastest Laundry & Dry Cleaning at Your Doorstep",
        "subheadline": "Pickup in 15-30 minutes. Sanitized eco-friendly washing, master fabric care, and crisp steam delivery within 24-48 hours.",
        "primaryCtaText": "Schedule Free Pickup",
        "primaryCtaLink": "/home",
        "secondaryCtaText": "Explore Services & Rates",
        "secondaryCtaLink": "#services",
        "highlightBullets": [
            "Free Doorstep Pickup & Delivery",
            "100% Antiseptic Isolated Wash",
            "Live GPS Rider Tracking",
            "Transparent Per-Piece Pricing"
        ]
    },
    "stats": {
        "ordersCompleted": "50,000+",
        "onTimeDeliveryRate": "99.4%",
        "customerRating": "4.9★",
        "avgTurnaround": "24 Hours",
        "partnerHubs": "15+"
    },
    "whyUs": [
        {
            "id": "why-1",
            "icon": "ShieldCheck",
            "title": "100% Antiseptic Sanitization",
            "description": "Every order is sanitized in isolated drums with hospital-grade eco detergents. Your clothes are never mixed with anyone else's garments."
        },
        {
            "id": "why-2",
            "icon": "Sparkles",
            "title": "Master Fabric Protection",
            "description": "Color-sorted cycles, gentle stain pre-treatment, and temperature-controlled steam finishing tailored to every delicate fabric."
        },
        {
            "id": "why-3",
            "icon": "Truck",
            "title": "Live Rider GPS Tracking",
            "description": "Watch your pickup and delivery riders in real time on the map with precision live ETA and instant doorstep arrival alerts."
        },
        {
            "id": "why-4",
            "icon": "BadgePercent",
            "title": "Transparent Per-Piece Pricing",
            "description": "Calibrated digital weighing and piece inspection at pickup. Instant digital receipts sent to your phone with zero hidden fees."
        }
    ],
    "howItWorks": [
        {
            "step": "01",
            "title": "Schedule Pickup",
            "desc": "Choose your required services (Wash & Fold, Dry Cleaning, Steam Iron) and pick a convenient morning, afternoon, or evening slot."
        },
        {
            "step": "02",
            "title": "Doorstep Handover",
            "desc": "Our verified delivery rider arrives at your doorstep, conducts garment inspection, and seals items safely in protective bags."
        },
        {
            "step": "03",
            "title": "Master Fabric Care",
            "desc": "Clothes undergo expert color sorting, stain pre-treatment, hygienic washing, and precision steam ironing in certified partner hubs."
        },
        {
            "step": "04",
            "title": "Fresh & Fast Delivery",
            "desc": "Crisply pressed, neatly folded or hung garments are delivered back to your home fresh and ready to wear."
        }
    ],
    "appPromo": {
        "headline": "Laundry Day, Solved in 2 Taps",
        "subheadline": "Order on the web or download the QuickPress mobile app for instant live tracking, wallet cashback, and member privileges.",
        "googlePlayAvailable": True,
        "appStoreAvailable": True
    }
}

TESTIMONIALS_SEED: List[Dict[str, Any]] = [
    {
        "_id": "rev-1",
        "name": "Priya Sharma",
        "role": "Working Professional",
        "city": "Bengaluru",
        "rating": 5,
        "review": "QuickPress has transformed my weekends! The clothes smell wonderfully fresh, whites are dazzling, and the steam press fold is crisp like brand new.",
        "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
        "isFeatured": True,
        "isPublished": True,
        "sortOrder": 1
    },
    {
        "_id": "rev-2",
        "name": "Rahul Verma",
        "role": "Software Engineer",
        "city": "Kasganj",
        "rating": 5,
        "review": "Super fast pickup within 20 minutes of booking. Being able to track the delivery rider live on the map gave me complete peace of mind. Truly 5-star service!",
        "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        "isFeatured": True,
        "isPublished": True,
        "sortOrder": 2
    },
    {
        "_id": "rev-3",
        "name": "Ananya Sen",
        "role": "Fashion Designer",
        "city": "Delhi NCR",
        "rating": 5,
        "review": "The dry cleaning for my delicate silk sarees and designer blazers was top tier. QuickClub VIP membership saved me plenty on delivery fees too.",
        "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        "isFeatured": True,
        "isPublished": True,
        "sortOrder": 3
    },
    {
        "_id": "rev-4",
        "name": "Vikram Malhotra",
        "role": "Business Owner",
        "city": "Uttar Pradesh",
        "rating": 5,
        "review": "Digital weighing at pickup and transparent itemized receipts right on WhatsApp & SMS. No hidden charges and exceptional customer care.",
        "avatarUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
        "isFeatured": True,
        "isPublished": True,
        "sortOrder": 4
    }
]

# =========================================================================
#  CMS Repository Class
# =========================================================================

class CMSRepository:
    async def ensure_seed(self) -> None:
        """Seed initial legal documents, FAQs, settings, landing content, and testimonials into MongoDB."""
        # 1. Legal Docs
        for doc_id, doc_data in LEGAL_DOCS_SEED.items():
            existing = await database.find_one("website_legal_docs", {"_id": doc_id})
            if not existing:
                await database.collection("website_legal_docs").update_one(
                    {"_id": doc_id},
                    {"$set": doc_data},
                    upsert=True
                )
        
        # 2. FAQs
        for faq in FAQS_SEED:
            await database.collection("website_faqs").update_one(
                {"_id": faq["_id"]},
                {"$set": faq},
                upsert=True
            )
            
        # 3. Settings
        await database.collection("website_settings").update_one(
            {"_id": WEBSITE_SETTINGS_SEED["_id"]},
            {"$set": WEBSITE_SETTINGS_SEED},
            upsert=True
        )

        # 4. Landing Page Content
        await database.collection("website_landing_content").update_one(
            {"_id": LANDING_CONTENT_SEED["_id"]},
            {"$set": LANDING_CONTENT_SEED},
            upsert=True
        )

        # 5. Testimonials
        for item in TESTIMONIALS_SEED:
            await database.collection("website_testimonials").update_one(
                {"_id": item["_id"]},
                {"$set": item},
                upsert=True
            )

        logger.info("QuickPress CMS initial seed verified successfully.")

    # ------------------ Landing Page Content ------------------
    async def get_landing_content(self) -> Dict[str, Any]:
        doc = await database.find_one("website_landing_content", {"_id": LANDING_CONTENT_SEED["_id"]})
        return doc or LANDING_CONTENT_SEED

    async def update_landing_content_admin(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["updatedAt"] = utcnow_iso()
        await database.collection("website_landing_content").update_one(
            {"_id": LANDING_CONTENT_SEED["_id"]},
            {"$set": data},
            upsert=True
        )
        return {"ok": True}

    # ------------------ Testimonials ------------------
    async def list_testimonials(self, published_only: bool = True) -> List[Dict[str, Any]]:
        query = {"isPublished": True} if published_only else {}
        docs = await database.find_many("website_testimonials", query)
        docs.sort(key=lambda x: int(x.get("sortOrder", 999)))
        return docs or TESTIMONIALS_SEED

    async def save_testimonial_admin(self, data: Dict[str, Any]) -> Dict[str, Any]:
        t_id = data.get("id") or data.get("_id") or f"rev_{uuid.uuid4().hex[:8]}"
        data["_id"] = t_id
        data["updatedAt"] = utcnow_iso()
        await database.collection("website_testimonials").update_one(
            {"_id": t_id},
            {"$set": data},
            upsert=True
        )
        return {"ok": True, "id": t_id}

    async def delete_testimonial_admin(self, testimonial_id: str) -> Dict[str, Any]:
        await database.collection("website_testimonials").delete_one({"_id": testimonial_id})
        return {"ok": True, "id": testimonial_id}

    # ------------------ Legal Documents ------------------
    async def get_legal_doc(self, doc_slug: str) -> Optional[Dict[str, Any]]:
        return await database.find_one("website_legal_docs", {"slug": doc_slug, "status": "published"})

    async def get_legal_doc_admin(self, doc_slug: str) -> Optional[Dict[str, Any]]:
        return await database.find_one("website_legal_docs", {"slug": doc_slug})

    async def list_legal_docs_admin(self) -> List[Dict[str, Any]]:
        return await database.find_many("website_legal_docs", {})

    async def save_legal_draft(self, doc_slug: str, title: str, content: str, summary: str, user_name: str) -> Dict[str, Any]:
        now = utcnow_iso()
        doc = await database.find_one("website_legal_docs", {"slug": doc_slug})
        if not doc:
            doc = {
                "_id": doc_slug,
                "title": title,
                "slug": doc_slug,
                "currentVersion": "1.0",
                "effectiveDate": now[:10],
                "status": "draft",
                "versions": []
            }
        
        # Increment minor version for draft
        current_v = doc.get("currentVersion", "1.0")
        try:
            major, minor = current_v.split(".")
            next_v = f"{major}.{int(minor) + 1}"
        except Exception:
            next_v = "1.1"

        draft_version = {
            "version": next_v,
            "status": "draft",
            "updatedAt": now,
            "updatedBy": user_name,
            "title": title,
            "summary": summary,
            "content": content
        }

        # Keep last 20 versions
        versions = doc.get("versions", [])
        versions.insert(0, draft_version)
        versions = versions[:20]

        await database.collection("website_legal_docs").update_one(
            {"slug": doc_slug},
            {
                "$set": {
                    "draftTitle": title,
                    "draftContent": content,
                    "draftSummary": summary,
                    "draftVersion": next_v,
                    "draftUpdatedAt": now,
                    "draftUpdatedBy": user_name,
                    "hasDraft": True,
                    "versions": versions
                }
            },
            upsert=True
        )
        return {"ok": True, "slug": doc_slug, "version": next_v, "status": "draft"}

    async def publish_legal_doc(self, doc_slug: str, user_name: str, change_log: str = "") -> Dict[str, Any]:
        now = utcnow_iso()
        doc = await database.find_one("website_legal_docs", {"slug": doc_slug})
        if not doc:
            return {"ok": False, "message": "Document not found"}

        title = doc.get("draftTitle") or doc.get("title")
        content = doc.get("draftContent") or doc.get("content")
        summary = doc.get("draftSummary") or doc.get("summary")
        version = doc.get("draftVersion") or doc.get("currentVersion", "1.0")

        published_version_entry = {
            "version": version,
            "status": "published",
            "publishedAt": now,
            "publishedBy": user_name,
            "changeLog": change_log or "Published via Admin CMS",
            "title": title,
            "summary": summary,
            "content": content
        }

        versions = doc.get("versions", [])
        # Update existing version entry status or insert
        versions.insert(0, published_version_entry)
        versions = versions[:20]

        await database.collection("website_legal_docs").update_one(
            {"slug": doc_slug},
            {
                "$set": {
                    "title": title,
                    "content": content,
                    "summary": summary,
                    "currentVersion": version,
                    "status": "published",
                    "publishedAt": now,
                    "publishedBy": user_name,
                    "effectiveDate": now[:10],
                    "hasDraft": False,
                    "versions": versions
                },
                "$unset": {
                    "draftTitle": "",
                    "draftContent": "",
                    "draftSummary": "",
                    "draftVersion": "",
                    "draftUpdatedAt": "",
                    "draftUpdatedBy": ""
                }
            }
        )
        return {"ok": True, "slug": doc_slug, "version": version, "status": "published"}

    # ------------------ FAQs ------------------
    async def get_published_faqs(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"isPublished": True}
        if category and category.lower() != "all":
            query["category"] = {"$regex": f"^{category}$", "$options": "i"}
        return await database.find_many("website_faqs", query, sort_key="sortOrder")

    async def get_all_faqs_admin(self) -> List[Dict[str, Any]]:
        return await database.find_many("website_faqs", {}, sort_key="sortOrder")

    async def upsert_faq_admin(self, faq_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["updatedAt"] = utcnow_iso()
        await database.collection("website_faqs").update_one(
            {"_id": faq_id},
            {"$set": data},
            upsert=True
        )
        return {"ok": True, "id": faq_id}

    async def delete_faq_admin(self, faq_id: str) -> Dict[str, Any]:
        await database.collection("website_faqs").delete_one({"_id": faq_id})
        return {"ok": True, "id": faq_id}

    # ------------------ Contact Messages ------------------
    async def save_contact_message(self, name: str, email: str, phone: str, subject: str, message: str) -> Dict[str, Any]:
        now = utcnow_iso()
        msg_id = f"msg_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{name[:3].lower()}"
        doc = {
            "_id": msg_id,
            "name": name.strip(),
            "email": email.strip().lower(),
            "phone": phone.strip(),
            "subject": subject.strip(),
            "message": message.strip(),
            "status": "new",
            "createdAt": now,
            "ip": "public-web",
        }
        await database.collection("website_contact_messages").insert_one(doc)
        return {"ok": True, "id": msg_id, "message": "Inquiry received. QuickPress Support will reach out shortly."}

    async def list_contact_messages_admin(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if status and status.lower() != "all":
            query["status"] = status
        docs = await database.find_many("website_contact_messages", query)
        docs.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
        return docs

    async def update_contact_message_status_admin(self, msg_id: str, new_status: str) -> Dict[str, Any]:
        await database.collection("website_contact_messages").update_one(
            {"_id": msg_id},
            {"$set": {"status": new_status, "updatedAt": utcnow_iso()}}
        )
        return {"ok": True, "id": msg_id, "status": new_status}

    # ------------------ Settings ------------------
    async def get_website_settings(self) -> Dict[str, Any]:
        settings = await database.find_one("website_settings", {"_id": WEBSITE_SETTINGS_SEED["_id"]})
        return settings or WEBSITE_SETTINGS_SEED

    async def update_website_settings_admin(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["updatedAt"] = utcnow_iso()
        await database.collection("website_settings").update_one(
            {"_id": WEBSITE_SETTINGS_SEED["_id"]},
            {"$set": data},
            upsert=True
        )
        return {"ok": True}


cms_repo = CMSRepository()
