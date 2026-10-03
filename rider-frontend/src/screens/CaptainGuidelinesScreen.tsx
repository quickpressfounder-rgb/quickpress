import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCaptainGuidelines,
  fetchPublicLegalDoc,
  type CaptainGuidelinesResponse,
  type PublicLegalDoc,
  CAPTAIN_SUPPORT_EMAIL,
  CAPTAIN_SUPPORT_EMAIL_OFFICIAL,
} from "../api/rider/rider-support-api";
import { triggerHaptic } from "../lib/captain-audio";

interface CaptainGuidelinesScreenProps {
  onBack: () => void;
  onOpenSupport?: () => void;
}

export const CaptainGuidelinesScreen: React.FC<CaptainGuidelinesScreenProps> = ({
  onBack,
  onOpenSupport,
}) => {
  const [activeTab, setActiveTab] = useState<"privacy" | "sop" | "conduct">("privacy");
  const [privacyDoc, setPrivacyDoc] = useState<PublicLegalDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [guidelinesData, setGuidelinesData] = useState<CaptainGuidelinesResponse | null>(null);

  // Load Legal Privacy Policy & Guidelines from backend
  useEffect(() => {
    setLoadingDoc(true);
    fetchPublicLegalDoc("privacy-policy")
      .then((doc) => {
        if (doc && doc.content) setPrivacyDoc(doc);
      })
      .catch((err) => {
        console.warn("Could not load backend privacy policy:", err);
      })
      .finally(() => setLoadingDoc(false));

    fetchCaptainGuidelines()
      .then((data) => {
        if (data) setGuidelinesData(data);
      })
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    triggerHaptic(20);
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] text-zinc-900 select-none font-sans"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 24px, 40px)" }}
    >
      {/* 1. Sticky Header with Back Button */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onBack();
            }}
            className="p-2 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-zinc-900 tracking-tight leading-tight">
              Captain Guidelines & Policy
            </h1>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="size-3" />
              <span>QuickPress Official Compliance</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="p-2 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all active:scale-95"
          title="Print / Save PDF"
        >
          <Printer className="size-4" />
        </button>
      </header>

      {/* 2. Top Segmented Navigation Tabs */}
      <div className="sticky top-[57px] z-20 bg-white/95 backdrop-blur-md px-4 py-2 border-b border-zinc-200/70 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/70">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("privacy");
            }}
            className={`py-2 px-1 text-center font-black text-xs rounded-xl transition-all ${
              activeTab === "privacy"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("sop");
            }}
            className={`py-2 px-1 text-center font-black text-xs rounded-xl transition-all ${
              activeTab === "sop"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Delivery SOP
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("conduct");
            }}
            className={`py-2 px-1 text-center font-black text-xs rounded-xl transition-all ${
              activeTab === "conduct"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Code of Conduct
          </button>
        </div>
      </div>

      {/* 3. Main Content Body */}
      <div className="p-4 space-y-4">
        {/* ======================================================== */}
        {/* TAB 1: QUICKPRESS OFFICIAL PRIVACY POLICY                */}
        {/* ======================================================== */}
        {activeTab === "privacy" && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Document Meta Header Card */}
            <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <BadgeCheck className="size-3" />
                  Official Compliance Document
                </span>
                <span className="text-[10px] font-bold text-zinc-500">
                  Version 1.0 · Aug 2026
                </span>
              </div>
              <h2 className="text-base font-black text-zinc-900 leading-tight">
                QuickPress Privacy & Data Protection Policy
              </h2>
              <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                This policy explains how QuickPress Logistics collects, uses, encrypts, and protects
                your personal data across our Captain Fleet Network, matching customer delivery standards.
              </p>
            </div>

            {/* Core Privacy Assurances for Captains */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 space-y-1">
                <div className="size-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <MapPin className="size-4" />
                </div>
                <h4 className="text-xs font-black text-zinc-900">GPS Duty Tracking</h4>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  GPS location is only tracked while you are ON DUTY to assign nearby trips and provide customer safety tracking.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 space-y-1">
                <div className="size-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Lock className="size-4" />
                </div>
                <h4 className="text-xs font-black text-zinc-900">Encrypted KYC Data</h4>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  Aadhaar, Driving License, and RC records are encrypted with 256-bit TLS and never sold to third parties.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 space-y-1">
                <div className="size-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <h4 className="text-xs font-black text-zinc-900">Zero Commission</h4>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  100% of delivery earnings & customer tips reach your wallet directly without hidden commission cuts.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 space-y-1">
                <div className="size-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Scale className="size-4" />
                </div>
                <h4 className="text-xs font-black text-zinc-900">Account Control</h4>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  You maintain full rights to inspect, update, or permanently delete your rider account via DOB verification.
                </p>
              </div>
            </div>

            {/* Full Policy Body Sections */}
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xs space-y-3.5 text-xs text-zinc-700 leading-relaxed">
              <div>
                <h3 className="text-sm font-black text-zinc-900 mb-1">1. Information We Collect</h3>
                <ul className="list-disc pl-4 space-y-1 text-zinc-600">
                  <li><strong>Account Identity:</strong> Mobile phone number, full name, selfie photo, and email address.</li>
                  <li><strong>Government KYC Documents:</strong> Driving License, Vehicle RC, Aadhaar Card, and PAN Card strictly for partner verification and road safety compliance.</li>
                  <li><strong>Bank Details:</strong> Bank account number and IFSC code for direct settlement payouts.</li>
                  <li><strong>Live Location & Device Data:</strong> Real-time GPS coordinates while on duty, device model, and network state for battery & dispatch optimization.</li>
                </ul>
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <h3 className="text-sm font-black text-zinc-900 mb-1">2. How We Use Your Information</h3>
                <ul className="list-disc pl-4 space-y-1 text-zinc-600">
                  <li>To assign pickup and delivery dispatches in your active service zone.</li>
                  <li>To authenticate your sessions securely via OTP verification.</li>
                  <li>To calculate accurate distance-based trip payouts and process daily settlements.</li>
                  <li>To verify doorstep garment handovers via customer OTP verification.</li>
                </ul>
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <h3 className="text-sm font-black text-zinc-900 mb-1">3. Data Sharing Restrictions</h3>
                <p className="text-zinc-600">
                  QuickPress strictly complies with Indian data protection laws. We never sell, rent, or trade partner data. Data is shared exclusively with:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-600 mt-1">
                  <li><strong>Customers & Store Partners:</strong> Only your first name, vehicle number, and active trip location during active dispatches.</li>
                  <li><strong>Banking Partners:</strong> For direct settlement transfers into your designated bank account.</li>
                  <li><strong>Law Enforcement Authorities:</strong> Solely upon lawful statutory directives or court orders.</li>
                </ul>
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <h3 className="text-sm font-black text-zinc-900 mb-1">4. Data Retention & Permanent Deletion</h3>
                <p className="text-zinc-600">
                  Captains have the absolute right to delete their account at any time directly through <strong>Profile &gt; Delete Rider Account</strong> with their registered Date of Birth. All personal and identity records are irreversibly purged within 30 days, retaining only legally mandated financial settlement receipts.
                </p>
              </div>

              {/* Legal Entity Card */}
              <div className="border-t border-zinc-100 pt-3 bg-zinc-50 rounded-2xl p-3 border border-zinc-200/70 space-y-1 text-[11px]">
                <p className="font-black text-zinc-900">Legal Entity & Nodal Office:</p>
                <p className="text-zinc-600"><strong>Company:</strong> SHRI KRISHNA EVS · QuickPress Logistics</p>
                <p className="text-zinc-600"><strong>Proprietor:</strong> SAROJ KUMARI</p>
                <p className="text-zinc-600"><strong>Registered Office:</strong> 0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, UP 207123</p>
                <p className="text-zinc-600">
                  <strong>Official Legal Email:</strong>{" "}
                  <a href={`mailto:${CAPTAIN_SUPPORT_EMAIL_OFFICIAL}`} className="text-blue-600 font-bold underline">
                    {CAPTAIN_SUPPORT_EMAIL_OFFICIAL}
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CAPTAIN DELIVERY SOP (STEP-BY-STEP WORKFLOW)      */}
        {/* ======================================================== */}
        {activeTab === "sop" && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* SOP Banner */}
            <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/40 p-4 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                5-Step Standard Operating Procedure
              </span>
              <h2 className="text-base font-black text-zinc-900 leading-tight">
                QuickPress Zero-Commission Delivery SOP
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Follow these 5 steps to maintain a 5.0 Star Captain rating, ensure customer satisfaction, and earn instant daily payouts.
              </p>
            </div>

            {/* Step-by-Step SOP Cards */}
            <div className="space-y-2.5">
              {[
                {
                  step: 1,
                  badge: "CUSTOMER PICKUP",
                  title: "Doorstep Garment Pickup & OTP",
                  desc: "Reach the customer doorstep promptly. Inspect clothes, confirm item count with the customer, and input the 6-digit Customer Pickup OTP before packing clothes in the delivery bag.",
                  tip: "Never take clothes without verifying the Pickup OTP.",
                  color: "amber",
                },
                {
                  step: 2,
                  badge: "STORE HANDOVER",
                  title: "Safe Drop at Partner Laundry Store",
                  desc: "Transport garments safely to the assigned partner store. Tap 'Arrived at Store & Handover'. The store partner counts items and starts washing processing.",
                  tip: "Partner cannot start garment washing until you swipe store arrival.",
                  color: "blue",
                },
                {
                  step: 3,
                  badge: "SPLIT TRIP OPTION",
                  title: "Store Opt-Out & 75% Payout Choice",
                  desc: "Need to end your shift or take a break? Tap 'Leave Trip at Store' to collect 75% net pickup payout immediately. The return delivery leg is reassigned to another captain with a +20% bonus.",
                  tip: "Full flexibility to work on your own timetable.",
                  color: "indigo",
                },
                {
                  step: 4,
                  badge: "DISPATCH HANDOVER",
                  title: "Partner Store Dispatch Handover",
                  desc: "When clothes are washed, dried, ironed, and bagged, pick up the package from the store using the Partner Dispatch OTP.",
                  tip: "Verify hanger counts and garment tags match the order slip.",
                  color: "emerald",
                },
                {
                  step: 5,
                  badge: "DOORSTEP DELIVERY",
                  title: "Customer Delivery & Instant Payout",
                  desc: "Hand over fresh clothes cleanly to the customer, enter the 6-digit Customer Delivery OTP, and watch your 100% net earnings instantly credit to your wallet.",
                  tip: "0% Commission — 100% of delivery fees & tips belong to you.",
                  color: "emerald",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-zinc-900 text-white font-black text-xs">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-zinc-900">{item.title}</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">{item.desc}</p>
                  <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                    <span>{item.tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PARTNER CODE OF CONDUCT & SAFETY                  */}
        {/* ======================================================== */}
        {activeTab === "conduct" && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/40 p-4 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Professional Ethics & Safety Standards
              </span>
              <h2 className="text-base font-black text-zinc-900 leading-tight">
                QuickPress Captain Code of Conduct
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                As the face of QuickPress to our customers and partner stores, every captain adheres to these core ethical and safety rules.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xs space-y-3 text-xs text-zinc-700">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-900">Polite & Respectful Communication</h4>
                  <p className="text-zinc-600 mt-0.5">
                    Greet customers with a polite "Namaste / Good Day". Maintain professional courtesy at all times during pickups and handovers.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3 flex items-start gap-3">
                <div className="size-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Shield className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-900">Road Safety & Helmet Mandatory</h4>
                  <p className="text-zinc-600 mt-0.5">
                    Wearing an ISI-marked helmet is mandatory for every trip. Obey speed limits and traffic lights. Never use phone while driving.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3 flex items-start gap-3">
                <div className="size-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Lock className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-900">Zero Tolerance for Harassment</h4>
                  <p className="text-zinc-600 mt-0.5">
                    Customer phone numbers and addresses are strictly for active order navigation. Never contact a customer after delivery completion.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3 flex items-start gap-3">
                <div className="size-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-900">No Cash Extortion or Extra Demands</h4>
                  <p className="text-zinc-600 mt-0.5">
                    Never ask for extra fees or tips. All delivery fees are transparently handled through the QuickPress platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Bottom Support CTA Card */}
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-xs space-y-2 text-center">
          <p className="text-xs font-black text-zinc-900">Have questions about policy or guidelines?</p>
          <p className="text-[11px] text-zinc-500">
            Our Fleet Operations Team is available 24/7 to support you.
          </p>
          {onOpenSupport && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                onOpenSupport();
              }}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <HelpCircle className="size-4 text-emerald-400" />
              <span>Open 24/7 Helpline & Support Desk</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
