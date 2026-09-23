import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import {
  IconShield,
  IconCheck,
  IconClock,
  IconMapPin,
  IconMail,
  IconPhone,
  IconStore,
  IconBuilding,
  IconArrowRight,
  IconGlobe,
} from "@/components/Icons";

const GREEN = "#004724";

type LegalTab = "terms" | "refund" | "pickup" | "grievance" | "partner";

interface TabConfig {
  id: LegalTab;
  label: string;
  badge: string;
  subtitle: string;
}

const TABS: TabConfig[] = [
  {
    id: "terms",
    label: "Terms of Service",
    badge: "User Agreement",
    subtitle: "General Terms & Platform Operating Conditions",
  },
  {
    id: "refund",
    label: "Cancellation & Refund",
    badge: "Mandatory SLA",
    subtitle: "Refund Timelines, Cancellation Windows & Fees",
  },
  {
    id: "pickup",
    label: "Pickup & Delivery",
    badge: "Logistics Policy",
    subtitle: "OTP Verification, Safe Custody & Transit Standards",
  },
  {
    id: "grievance",
    label: "Grievance & Nodal Desk",
    badge: "Statutory IT Rules",
    subtitle: "Compliance with Rule 3(2) & Consumer Protection Rules",
  },
  {
    id: "partner",
    label: "Partner Standards",
    badge: "Merchant Code",
    subtitle: "Quality Vetting, Hygiene & Merchant Guidelines",
  },
];

export function TermsPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [activeTab, setActiveTab] = useState<LegalTab>("terms");
  const [searchFilter, setSearchFilter] = useState("");

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="bg-white text-gray-900 min-h-screen pt-24 sm:pt-32 pb-24">
      {/* ─── Hero Header ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-widest uppercase mb-4 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
          <span>STATUTORY LEGAL & REGULATORY COMPLIANCE CENTER • INDIA</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 leading-tight">
          Terms & <span style={{ color: GREEN }}>Legal Policies</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-3xl mx-auto mt-4 leading-relaxed font-normal">
          Governing agreements, cancellation safeguards, delivery OTP verification, and statutory grievance redressal instituted by{" "}
          <strong>SHRI KRISHNA EVS</strong> (Legal Name / Proprietor: <strong>SAROJ KUMARI</strong>).
        </p>

        {/* Corporate Entity Bar */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 font-mono">
          <span><strong>Legal Name:</strong> SAROJ KUMARI</span>
          <span className="text-gray-300">•</span>
          <span><strong>Entity:</strong> SHRI KRISHNA EVS</span>
          <span className="text-gray-300">•</span>
          <span><strong>Phone:</strong> +91 8279538461</span>
          <span className="text-gray-300">•</span>
          <span><strong>Email:</strong> official.quickpress@gmail.com</span>
          <span className="text-gray-300">•</span>
          <span><strong>GSTIN:</strong> 09KQCPK2468E1ZM</span>
          <span className="text-gray-300">•</span>
          <span><strong>Registered Office:</strong> 0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, UP 207123</span>
        </div>
      </section>

      {/* ─── Tab Navigation Bar ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sticky top-20 z-30 bg-white/95 backdrop-blur-md py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                    isActive
                      ? "bg-emerald-50 text-emerald-950 border-emerald-300 shadow-xs ring-2 ring-emerald-600/10"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      isActive
                        ? "bg-emerald-200 text-emerald-900"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handlePrint}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Print Current Legal Policy"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Policy</span>
          </button>
        </div>
      </div>

      {/* ─── Main Document Canvas ────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-12 border-2 border-gray-200 shadow-sm space-y-10">
          {/* Active Tab Subtitle & Version Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {TABS.find((t) => t.id === activeTab)?.subtitle}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-950 mt-2">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h2>
            </div>
            <div className="text-right text-xs text-gray-500 font-mono">
              <p>Version: <strong>2.0 (Verified Live)</strong></p>
              <p>Effective Date: <strong>September 2026</strong></p>
              <p>Jurisdiction: <strong>Uttar Pradesh, India</strong></p>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: TERMS OF SERVICE                                              */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "terms" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">1</span>
                  <span>Parties & Binding Acceptance</span>
                </h3>
                <p>
                  These Terms of Service ("Terms") constitute a legally binding agreement between you ("Customer", "User", "You") and{" "}
                  <strong>SHRI KRISHNA EVS</strong> (Legal Name / Proprietor: <strong>SAROJ KUMARI</strong>) ("QuickPress", "We", "Us", "Our"), having its registered office at 0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123.
                </p>
                <p>
                  By accessing, browsing, or using our website (<a href="https://with.quickpress.com" className="text-emerald-700 underline font-mono">with.quickpress.com</a>), consumer mobile application, partner portal, or booking doorstep laundry or courier services, you irrevocably accept and agree to be bound by these Terms, in conjunction with our Privacy Policy, Cancellation & Refund Policy, and Logistics Policy.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">2</span>
                  <span>Eligibility & Account Security</span>
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                  <li>
                    <strong>Age Requirement:</strong> You must be at least 18 years of age or possess legal parental/guardian consent under applicable Indian law to register and place orders.
                  </li>
                  <li>
                    <strong>OTP Authentication:</strong> User authentication is conducted via single-use One-Time Passwords (OTPs) dispatched to your Indian mobile number (+91). You are solely responsible for maintaining device security and restricting unauthorized access to your account.
                  </li>
                  <li>
                    <strong>Accurate Delivery Coordinates:</strong> You agree to provide true, accurate, and complete geographic addresses and GPS landmarks to enable lawful and prompt doorstep courier routing.
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">3</span>
                  <span>Platform Scope & Service Architecture</span>
                </h3>
                <p>
                  QuickPress operates a high-speed on-demand technological marketplace and logistics network. We connect consumers with certified neighborhood laundry stores, dry cleaners, steam pressing workshops, and independent delivery captains:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <h4 className="font-bold text-gray-950 text-xs uppercase mb-1">Standard Garment Care</h4>
                    <p className="text-xs text-gray-600">Daily Wash & Fold, Steam Pressing, and Eco Wash calculated per item count or calibrated scale kilogram weight.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <h4 className="font-bold text-gray-950 text-xs uppercase mb-1">Specialty & Fabric Care</h4>
                    <p className="text-xs text-gray-600">Hydrocarbon Dry Cleaning, Heavy Woolens, Blankets, Curtains, Premium Footwear, and Leather Bags.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">4</span>
                  <span>Doorstep Inspection & Valuables Disclaimer</span>
                </h3>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <p className="font-bold">⚠️ Customer Duty to Clear Pockets & Personal Belongings:</p>
                  <p>
                    Customers are strictly mandated to check and empty all pockets, linings, and garment compartments prior to handing garments over to the delivery captain. QuickPress, its logistics partners, and partner processing workshops assume <strong>zero liability</strong> for cash, currency notes, credit/debit cards, jewelry, keys, pens, watches, or electronic peripherals left inside garments.
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Pre-existing fabric wear, burns, color-bleeding tendencies, loose stitching, or missing buttons must be indicated during order placement or pointed out to the captain during count verification.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">5</span>
                  <span>Pricing, Invoicing & GST Compliance</span>
                </h3>
                <p>
                  All catalog service prices are transparently displayed in Indian Rupees (₹). In compliance with the Central Goods and Services Tax (CGST) and State GST (SGST) Acts, 18% GST is itemized on the digital invoice generated upon order completion. Customers can download official GST-compliant tax invoices directly through their account portal.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">6</span>
                  <span>Garment Care Guarantee & Liability Limitation</span>
                </h3>
                <p>
                  While our certified partner processing hubs follow rigorous textile preservation protocols, in the unlikely event of physical damage or loss directly attributable to certified processing negligence:
                </p>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                  <p><strong>QuickPress Garment Care Guarantee:</strong></p>
                  <p>• Compensation is capped at up to <strong>₹5,000 per verified claim</strong> or 10x the service fee for that item (whichever is lower).</p>
                  <p>• Any damage claim must be reported within <strong>24 hours</strong> of delivery through the app or grievance email with clear photographic evidence.</p>
                  <p>• Normal wear and tear, age-related thread degradation, pre-existing sun fading, and shrinkage of non-preshrunk fabric are excluded from coverage.</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">7</span>
                  <span>Governing Law & Dispute Jurisdiction</span>
                </h3>
                <p>
                  These Terms shall be governed by, interpreted, and construed in accordance with the substantive laws of the Republic of India. Any legal suit, action, or proceeding arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>Gautam Buddha Nagar / Noida, Uttar Pradesh, India</strong>.
                </p>
              </section>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: CANCELLATION & REFUND POLICY                                  */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "refund" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Order Cancellation Safeguards by Stage
                </h3>
                <p>
                  To ensure fairness to customers, partner laundry facilities, and independent delivery captains, cancellation charges and refund eligibility are structured based on the operational stage of your order:
                </p>

                {/* Structured Table */}
                <div className="overflow-x-auto border-2 border-gray-200 rounded-2xl mt-4">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Operational Order Stage</th>
                        <th className="py-3.5 px-4">Cancellation Window</th>
                        <th className="py-3.5 px-4">Refund / Cancellation Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">1. Order Placed / Pending Acceptance</td>
                        <td className="py-3.5 px-4">Instant 1-Click via App</td>
                        <td className="py-3.5 px-4 text-emerald-700 font-bold">100% Full Refund (Zero Deduction)</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">2. Partner Store Accepted (Before Rider Dispatched)</td>
                        <td className="py-3.5 px-4">Up to 30 mins before pickup window</td>
                        <td className="py-3.5 px-4 text-emerald-700 font-bold">100% Full Refund (Zero Deduction)</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">3. Captain Dispatched / En Route to Doorstep</td>
                        <td className="py-3.5 px-4">Before captain arrives at location</td>
                        <td className="py-3.5 px-4 text-amber-800">Full Refund minus nominal ₹49 Rider Trip Fee</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">4. Garments Collected & In Transit to Hub</td>
                        <td className="py-3.5 px-4">Transit to processing center</td>
                        <td className="py-3.5 px-4 text-amber-800">Full Refund minus ₹79 Return Logistics Fee</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">5. Washing / Dry Cleaning in Progress</td>
                        <td className="py-3.5 px-4">Garments inside machine cycle</td>
                        <td className="py-3.5 px-4 text-red-700 font-bold">Cancellation NOT Permitted</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">6. Cleaned, Pressed & Out for Delivery</td>
                        <td className="py-3.5 px-4">En route to customer doorstep</td>
                        <td className="py-3.5 px-4 text-red-700 font-bold">Cancellation NOT Permitted</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-gray-900">7. Order Delivered</td>
                        <td className="py-3.5 px-4">Doorstep handover confirmed</td>
                        <td className="py-3.5 px-4 text-emerald-700 font-bold">Free Re-wash / Quality Review within 24h</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Payment Gateway Refund Timelines (Razorpay & Banking Cycle)
                </h3>
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-xs">
                  <p className="font-bold text-emerald-950">Approved refunds are processed to your original payment method:</p>
                  <ul className="list-disc pl-5 space-y-1 text-emerald-900">
                    <li><strong>QuickPress Wallet / In-App Credits:</strong> Instant credit (Available within 5 minutes of approval).</li>
                    <li><strong>UPI (Google Pay, PhonePe, Paytm, BHIM):</strong> 1 to 3 banking business days.</li>
                    <li><strong>Debit / Credit Cards & NetBanking:</strong> 5 to 7 working days, subject to the issuing bank's settlement cycle.</li>
                  </ul>
                  <p className="text-[11px] text-gray-500 pt-1">
                    *Note: QuickPress executes all approved refund instructions immediately via our licensed gateway partner (Razorpay). National banking holidays and weekend clearing cycles may affect final bank statement reflection.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Quality Grievance & Complimentary Re-Wash Guarantee
                </h3>
                <p>
                  If you are unsatisfied with the cleanliness, ironing finish, or fragrance of your garments:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-gray-700">
                  <li>Raise a quality request within <strong>24 hours</strong> of delivery through the App or email.</li>
                  <li>Our quality supervisor arranges an immediate pickup for a <strong>100% Free Complimentary Re-Wash & Steam Pressing</strong>.</li>
                  <li>If re-wash does not resolve the verified defect, the full service amount for the affected garment is credited back to your account.</li>
                </ol>
              </section>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PICKUP & DELIVERY POLICY                                      */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "pickup" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Doorstep Logistics & Single-Use OTP Protocol
                </h3>
                <p>
                  To prevent misplacement and ensure transparent custody throughout pickup and delivery, QuickPress implements strict 4-digit One-Time Password (OTP) verification:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <h4 className="font-bold text-gray-950 text-sm">Pickup Handover Verification</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      When the delivery captain arrives at your doorstep, you will receive a 4-digit Pickup OTP. Handing over your garments is confirmed only when the captain inputs this OTP into the Captain App.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <h4 className="font-bold text-gray-950 text-sm">Delivery Completion OTP</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      When fresh, cleaned garments are returned to your doorstep, delivery completion strictly requires the 4-digit Delivery OTP sent to your registered phone. Never share your OTP until you have physically received your garments.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Turnaround Service Levels & Time Windows
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                  <li><strong>Standard Daily Laundry:</strong> Cleaned, steam pressed, and delivered back within 24 to 48 hours.</li>
                  <li><strong>Express QuickTurnaround:</strong> Priority turnaround available in selected Noida and regional hubs under 12 to 24 hours.</li>
                  <li><strong>Dry Cleaning & Heavy Blankets:</strong> Thorough multi-stage hydrocarbon processing delivered in 48 to 72 hours.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Customer Unavailability & Safe Warehouse Custody
                </h3>
                <p>
                  If a customer is unreachable during a scheduled delivery window, our team makes up to <strong>2 complimentary re-attempt deliveries</strong>. If delivery cannot be completed after 2 attempts, garments are transferred to our secure Central Master Logistics Hub (Bilram Gate Kasganj / Noida Hub) where they are held in sealed safe custody for up to <strong>14 calendar days</strong>.
                </p>
              </section>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: GRIEVANCE REDRESSAL & NODAL OFFICER                           */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "grievance" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Statutory Compliance Declaration
                </h3>
                <p>
                  In strict compliance with <strong>Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong> and <strong>Section 5 of the Consumer Protection (E-Commerce) Rules, 2020</strong>, QuickPress has established a dedicated multi-tier grievance redressal mechanism for consumer and partner disputes.
                </p>
              </section>

              {/* 3 Tier Architecture Cards */}
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Tier 1 · First Contact
                  </span>
                  <h4 className="text-base font-black text-gray-950">Help & Support Desk</h4>
                  <p className="text-xs text-gray-600">
                    Accessible via the QuickPress Customer Mobile App ("Help & Support"), Website Contact Center, or by emailing <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 underline font-semibold">official.quickpress@gmail.com</a>.
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    First Acknowledgment TAT: <strong>Under 2 Hours</strong> • Resolution SLA: <strong>Under 24 Hours</strong>
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-emerald-50/60 border-2 border-emerald-300 space-y-3">
                  <span className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                    Tier 2 · Statutory Escalation
                  </span>
                  <h4 className="text-base font-black text-gray-950">Designated Grievance Officer</h4>
                  <p className="text-xs text-gray-700">
                    If your complaint has not been redressed within 48 hours or you are dissatisfied with Tier 1 resolution, you may escalate directly to our designated Grievance Officer:
                  </p>

                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-xs font-mono space-y-1 text-gray-900">
                    <p><strong>Grievance Redressal Officer / Legal Name:</strong> SAROJ KUMARI</p>
                    <p><strong>Entity / Trade Name:</strong> SHRI KRISHNA EVS</p>
                    <p><strong>Registered Address:</strong> 0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India</p>
                    <p><strong>Direct Email:</strong> <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 underline font-bold">official.quickpress@gmail.com</a></p>
                    <p><strong>Official Phone / Helpdesk:</strong> <a href="tel:+918279538461" className="text-emerald-700 underline font-bold">+91 8279538461</a> (Mon–Sun, 7:00 AM – 10:00 PM IST)</p>
                    <p><strong>Statutory Acknowledgment:</strong> Within 48 Hours with unique CRM Ticket ID</p>
                    <p><strong>Mandatory Disposal Timeline:</strong> Within 30 Days of receipt of complaint</p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-600 bg-gray-200 px-2.5 py-0.5 rounded-full">
                    Tier 3 · Regulatory Liaison
                  </span>
                  <h4 className="text-base font-black text-gray-950">Nodal Officer (Law Enforcement Coordination)</h4>
                  <p className="text-xs text-gray-600">
                    For statutory cyber-crime law enforcement agencies, consumer fora, and judicial requisitions:
                  </p>
                  <div className="text-xs font-mono text-gray-700">
                    <p><strong>Email:</strong> official.quickpress@gmail.com (Attn: Nodal Officer - Regulatory Affairs)</p>
                    <p><strong>Response Timeline:</strong> Within 24 hours of verified statutory requisition</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: PARTNER STANDARDS & CODE OF CONDUCT                           */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "partner" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950">
                  Partner Laundry Store Standards & Vetting SLA
                </h3>
                <p>
                  QuickPress maintains a certified network of commercial laundry, dry cleaner, and pressing partners. All enrolled merchant stores agree to the following minimum operating conditions:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <h4 className="font-bold text-xs uppercase text-gray-950">Hygiene & Water Filtration</h4>
                    <p className="text-xs text-gray-600">
                      Stores must utilize soft-water RO/filtration systems and approved hypoallergenic, eco-certified detergents.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <h4 className="font-bold text-xs uppercase text-gray-950">Turnaround Commitment (SLA)</h4>
                    <p className="text-xs text-gray-600">
                      Standard orders must be cleaned, steam-pressed, and packed within 24 hours of rider drop-off.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <h4 className="font-bold text-xs uppercase text-gray-950">Customer Data Non-Circumvention</h4>
                    <p className="text-xs text-gray-600">
                      Partner stores shall not solicit customers directly for offline transactions or misuse customer information for unconsented marketing.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <h4 className="font-bold text-xs uppercase text-gray-950">Automated Weekly Settlements</h4>
                    <p className="text-xs text-gray-600">
                      Partner payouts are settled weekly directly into registered commercial bank accounts with 1% Section 194-O TCS deductions.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Bottom Actions & Support Bar */}
          <div className="pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => onNavigate("privacy")}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1.5 cursor-pointer"
            >
              <IconShield className="w-4 h-4 text-emerald-700" />
              <span>Read Full Privacy & Data Protection Policy</span>
            </button>

            <button
              onClick={() => onNavigate("contact")}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Contact Legal & Grievance Desk</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
