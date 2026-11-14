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

type LegalTab =
  | "terms"
  | "refund"
  | "garment-care"
  | "pickup"
  | "cookie"
  | "grievance"
  | "partner";

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
    id: "garment-care",
    label: "Garment Care & Liability",
    badge: "Fabric Standards",
    subtitle: "Stain Removal, Pre-Existing Defects & 10x Compensation Cap",
  },
  {
    id: "pickup",
    label: "Pickup & Delivery",
    badge: "Logistics Policy",
    subtitle: "OTP Verification, Safe Custody & Transit Standards",
  },
  {
    id: "cookie",
    label: "Cookie & Tracking",
    badge: "Data Telemetry",
    subtitle: "Session Storage, Cookies & User Tracking Safeguards",
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
  initialTab,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
  initialTab?: LegalTab;
}) {
  const getInitialTab = (): LegalTab => {
    if (initialTab) return initialTab;
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      const target = hash || path;
      if (target === "refund" || target === "cancellation-refund-policy" || target === "refund-policy") return "refund";
      if (target === "garment-care" || target === "garment-care-policy" || target === "fabric-care" || target === "garment") return "garment-care";
      if (target === "pickup" || target === "delivery" || target === "logistics") return "pickup";
      if (target === "cookie" || target === "cookie-policy" || target === "cookies") return "cookie";
      if (target === "grievance" || target === "grievance-redressal" || target === "nodal") return "grievance";
      if (target === "partner" || target === "partner-standards" || target === "merchant-code") return "partner";
      if (target === "terms" || target === "terms-of-service") return "terms";
    }
    return "terms";
  };

  const [activeTab, setActiveTab] = useState<LegalTab>(getInitialTab);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [searchFilter, setSearchFilter] = useState("");

  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      if (hash === "refund" || hash === "cancellation-refund-policy") setActiveTab("refund");
      else if (hash === "garment-care" || hash === "garment-care-policy" || hash === "fabric-care") setActiveTab("garment-care");
      else if (hash === "pickup" || hash === "delivery") setActiveTab("pickup");
      else if (hash === "cookie" || hash === "cookie-policy") setActiveTab("cookie");
      else if (hash === "grievance" || hash === "grievance-redressal") setActiveTab("grievance");
      else if (hash === "partner" || hash === "partner-standards") setActiveTab("partner");
      else if (hash === "terms" || hash === "terms-of-service") setActiveTab("terms");
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="bg-white text-gray-900 min-h-screen pt-24 sm:pt-32 pb-24">
      {/* ─── Hero Header ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 mb-10 reveal-on-scroll">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-widest uppercase mb-4 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
          <span>STATUTORY LEGAL & REGULATORY COMPLIANCE CENTER • INDIA</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 leading-tight">
          Terms & <span style={{ color: GREEN }}>Legal Policies</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-3xl mx-auto mt-4 leading-relaxed font-normal">
          Governing agreements, cancellation safeguards, delivery OTP verification, and statutory grievance redressal instituted by{" "}
          <strong>QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong> (CIN: <strong>U74999UP2024PTC198141</strong>).
        </p>

        {/* Corporate Entity Bar */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 font-mono">
          <span><strong>Legal Entity:</strong> QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</span>
          <span className="text-gray-300">•</span>
          <span><strong>CIN:</strong> U74999UP2024PTC198141</span>
          <span className="text-gray-300">•</span>
          <span><strong>Phone:</strong> 1800 012 3456</span>
          <span className="text-gray-300">•</span>
          <span><strong>Email:</strong> official.quickpress@gmail.com</span>
          <span className="text-gray-300">•</span>
          <span><strong>Registered Office:</strong> 0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India</span>
        </div>

        {/* Bilingual Language Switch */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Notice Language / भाषा:</span>
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === "en" ? "bg-white text-emerald-950 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === "hi" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll delay-100">
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

          {/* Statutory Hindi Overview Card when Hindi is selected */}
          {lang === "hi" && (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <IconShield className="w-4 h-4 text-emerald-700" />
                <span>वैधानिक हिंदी सारांश — QuickPress कानूनी नियम</span>
              </div>
              <p className="leading-relaxed">
                यह दस्तावेज़ भारतीय अनुबंध अधिनियम, 1872, सूचना प्रौद्योगिकी अधिनियम, 2000 और उपभोक्ता संरक्षण (ई-कॉमर्स) नियम, 2020 के तहत कानूनी रूप से बाध्यकारी है। क्विकप्रेस आपके कपड़ों की सुरक्षित धुलाई, पारदर्शिता और त्वरित शिकायत निवारण के लिए वचनबद्ध है।
              </p>
            </div>
          )}

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
                  <strong>QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong> (CIN: <strong>U74999UP2024PTC198141</strong>) ("QuickPress", "We", "Us", "Our"), having its registered office at 0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India.
                </p>
                <p>
                  By accessing, browsing, or using our website (<a href="https://withquickpress.com" className="text-emerald-700 underline font-mono">withquickpress.com</a>), consumer mobile application, partner portal, or booking doorstep laundry or courier services, you irrevocably accept and agree to be bound by these Terms, in conjunction with our Privacy Policy, Cancellation & Refund Policy, and Logistics Policy.
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
          {/* TAB: GARMENT CARE, FABRIC RISK & LOSS LIABILITY POLICY                */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "garment-care" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              {lang === "hi" && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                  <p className="font-bold">⚠️ महत्वपूर्ण वस्त्र सुरक्षा व क्षतिपूर्ति नियम:</p>
                  <p>कपड़ों की जेबें पहले ही खाली कर लें। रंग छूटने वाले कपड़ों की जानकारी बुकिंग के समय दें। किसी भी नुकसान की स्थिति में अधिकतम भरपाई सर्विस चार्ज का 10 गुना या ₹3,000 (जो भी कम हो) देय होगी। 30 दिन तक न लिए गए लावारिस कपड़ों का दान या निस्तारण कर दिया जाएगा।</p>
                </div>
              )}

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">1</span>
                  <span>Fabric Care Standards & European Hydrocarbon Protocols</span>
                </h3>
                <p>
                  QuickPress and its authorized partner laundromats operate under certified European textile processing protocols. We utilize <strong>purified soft RO water</strong> (TDS &lt; 50 ppm), pH-neutral eco-friendly detergents, and specialized KWL hydrocarbon dry cleaning solvents engineered to preserve delicate textile fibers, woolens, zari embroidery, and natural silks.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">2</span>
                  <span>Customer Mandatory Duty — Pockets & Personal Valuables</span>
                </h3>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <p className="font-bold">⚠️ Strict Pocket Evacuation Mandate:</p>
                  <p>
                    Customers are strictly required to inspect and empty all pockets, linings, and concealed compartments before handing garments over to the delivery captain. QuickPress, our logistics partners, and merchant facilities accept <strong>zero legal or financial liability</strong> for currency, coins, jewelry, precious metals, watches, pens, credit/debit cards, identification documents, or keys left inside garments.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">3</span>
                  <span>Pre-Existing Wear, Tears & Manufacturer Defects</span>
                </h3>
                <p>
                  QuickPress performs visual intake checks, but cannot be held liable for:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>Pre-existing fabric thinning, moth holes, microscopic tears, or dry rot accelerated by normal water or solvent movement.</li>
                  <li>Sun fading, age-related discoloration, or chemical burn from domestic bleach, perfume, or deodorant sprays.</li>
                  <li>Loose buttons, failing zippers, decorative beads, sequins, or sequins applied with heat-sensitive adhesives.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">4</span>
                  <span>Color Fastness & Bleed Disclaimer</span>
                </h3>
                <p>
                  Certain natural handlooms, block-printed cottons, raw silks, bandhani, and artisanal garments possess unstable or vegetable dyes that may release color in water. Customers are obligated to declare non-colorfast garments during booking. While our experts segregate color-sensitive garments, we cannot guarantee zero color bleed if fabrics are manufactured without standard industrial fixation.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">5</span>
                  <span>Statutory Liability Limitation (10x Cap / Max ₹3,000)</span>
                </h3>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                  <p className="font-bold">Indian Contract Act, 1872 (Section 151 & 152 Bailment Compliance):</p>
                  <p>
                    In the extraordinary and verified event of physical damage or loss directly attributable to our operational negligence:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Maximum compensation is capped at <strong>10 times the individual cleaning fee</strong> charged for that specific garment or <strong>₹3,000 per piece</strong>, whichever is lower.</li>
                    <li>For luxury, designer, or couture garments with a market valuation exceeding ₹10,000, customers must declare the item and opt for <strong>Premium Care Transit Insurance</strong> prior to pickup.</li>
                    <li>All claims must be submitted with photographic evidence within <strong>24 hours of delivery</strong>.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">6</span>
                  <span>Unclaimed Garments Disposal (30-Day Statutory Rule)</span>
                </h3>
                <p>
                  Cleaned garments held in our fulfillment warehouses that remain unclaimed due to customer unavailability, non-response, or refusal to take delivery after <strong>3 formal written notices (SMS, WhatsApp, Email) across a period of 30 calendar days</strong>, will be responsibly donated to registered charitable institutions or disposed of to recover warehouse custody costs.
                </p>
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
          {/* TAB: COOKIE, TRACKING & DATA TELEMETRY POLICY                        */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "cookie" && (
            <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
              {lang === "hi" && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <p className="font-bold">🍪 कुकी एवं डेटा ट्रैकिंग नीति:</p>
                  <p>हम आपकी लॉगिन सुरक्षा, शॉपिंग कार्ट और ऐप की स्पीड बनाए रखने के लिए आवश्यक कुकीज़ का उपयोग करते हैं। हम आपका व्यक्तिगत डेटा किसी भी तीसरे पक्ष के एड नेटवर्क को नहीं बेचते हैं। आप ब्राउज़र सेटिंग्स से कुकीज़ नियंत्रित कर सकते हैं।</p>
                </div>
              )}

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">1</span>
                  <span>Scope & Technologies Employed</span>
                </h3>
                <p>
                  This Cookie Policy explains how <strong>QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong> utilizes cookies, web beacons, pixel tags, LocalStorage, and IndexedDB across our website (<a href="https://withquickpress.com" className="text-emerald-700 underline font-mono">withquickpress.com</a>) and progressive web applications, in alignment with India's <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">2</span>
                  <span>Categorization of Cookies & Client Storage</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Always Active</span>
                    <h4 className="font-bold text-xs uppercase text-gray-950">1. Strictly Necessary Cookies</h4>
                    <p className="text-xs text-gray-600">
                      Essential for authentication, CSRF attack defense, JWT bearer validation, and preserving active cart items during checkout. These cannot be disabled.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">Preferences</span>
                    <h4 className="font-bold text-xs uppercase text-gray-950">2. Functional Storage</h4>
                    <p className="text-xs text-gray-600">
                      Stores language preference (English/Hindi), chosen pickup addresses, and UI theme options to ensure a frictionless return visit.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">Performance</span>
                    <h4 className="font-bold text-xs uppercase text-gray-950">3. Analytics & Speed Telemetry</h4>
                    <p className="text-xs text-gray-600">
                      Cookieless, privacy-preserving event telemetry (Plausible Analytics) to detect slow page loads, route errors, and API latencies without tracking across websites.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Marketing</span>
                    <h4 className="font-bold text-xs uppercase text-gray-950">4. Attribution & Referrals</h4>
                    <p className="text-xs text-gray-600">
                      Validates promotional discount codes, referral links, and app install attribution. We do not sell tracking profiles to third-party ad brokers.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">3</span>
                  <span>LocalStorage & Device Token Usage</span>
                </h3>
                <p>
                  For enhanced performance on progressive web applications (PWAs), QuickPress saves the following in your device's browser LocalStorage:
                </p>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-mono text-gray-700 space-y-1">
                  <p>• <strong>quickpress_token:</strong> Secure encrypted authentication session token.</p>
                  <p>• <strong>quickpress_cart:</strong> Offline-capable cached garment laundry cart.</p>
                  <p>• <strong>quickpress_lang:</strong> Selected statutory display language (`en` or `hi`).</p>
                  <p>• <strong>cookie_consent_choice:</strong> Timestamped record of user cookie banner acknowledgment.</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">4</span>
                  <span>User Rights & How to Control Cookies</span>
                </h3>
                <p>
                  You may alter your cookie preferences at any time through your web browser settings (Chrome, Safari, Edge, Firefox). You can delete all cached data or configure your browser to reject third-party cookies. Please note that disabling strictly necessary cookies may restrict access to checkout and order tracking features.
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
                    <p><strong>Legal Entity:</strong> QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</p>
                    <p><strong>Corporate Identity Number (CIN):</strong> U74999UP2024PTC198141</p>
                    <p><strong>Registered Office:</strong> 0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India</p>
                    <p><strong>Direct Email:</strong> <a href="mailto:info@withquickpress.com" className="text-emerald-700 underline font-bold">info@withquickpress.com</a> / <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 underline">official.quickpress@gmail.com</a></p>
                    <p><strong>Official Phone / Helpdesk:</strong> <a href="tel:+919258730561" className="text-emerald-700 underline font-bold">+91 9258730561</a> (Mon–Sun, 7:00 AM – 10:00 PM IST)</p>
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
