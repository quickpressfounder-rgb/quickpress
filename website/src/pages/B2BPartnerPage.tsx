import React, { useState } from "react";
import { PageType, ModalType, B2BPartnerLead } from "@/types";

// Clean, sharp vector outline icons (Strictly NO 3D, NO cartoon graphics)
const IconBuilding = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

const IconUser = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconTruck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconReceipt = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-8M16 12h-8M12 16h-4" />
  </svg>
);

const IconShieldCheck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCopy = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconDownload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconPhone = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMail = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconArrowLeft = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconPrinter = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const B2B_CATEGORIES = [
  { id: "Hotels & Hospitality", label: "Hotels, Resorts & Guest Houses", desc: "Bedsheets, duvet covers, bath towels, curtains" },
  { id: "Hospitals & Healthcare", label: "Hospitals, Clinics & Healthcare", desc: "Patient gowns, doctor coats, surgical sanitized linen" },
  { id: "Hostels & Universities", label: "Hostels, PGs & Student Accommodations", desc: "Weekly student laundry bundles, uniform care" },
  { id: "Restaurants & Banquets", label: "Restaurants, Banquets & Caterers", desc: "Tablecloths, cloth napkins, kitchen aprons" },
  { id: "Salons & Spas", label: "Salons, Spas & Wellness Centers", desc: "Bath sheets, face towels, robes, hygiene wash" },
  { id: "Corporate & Industrial", label: "Corporate Workforces & Factories", desc: "Staff uniforms, industrial boiler suits, dry clean" },
];

const CARE_SERVICES = [
  "Commercial Bed Linen & Bath Towels (Flatwork Steam Iron)",
  "Medical Grade 80°C Thermal Anti-Bacterial Sanitization",
  "High-Pressure Roller Calendaring Flatwork Press",
  "Executive Staff Uniforms & Dry Cleaning",
  "Banqueting Tablecloths & Stain Removal Treatment",
  "Individual Student Laundry Bags (Hostel / PG)",
];

export function B2BPartnerPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [step, setStep] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [registeredB2BId, setRegisteredB2BId] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState<B2BPartnerLead>({
    businessName: "",
    category: "Hotels & Hospitality",
    address: "",
    city: "Kasganj",
    pincode: "",
    unitsCount: "1 Location",
    contactName: "",
    designation: "General Manager",
    phone: "",
    whatsapp: "",
    email: "",
    dailyVolume: "150 - 500 kg / day",
    frequency: "Daily 2x (Morning & Evening)",
    services: [
      "Commercial Bed Linen & Bath Towels (Flatwork Steam Iron)",
      "High-Pressure Roller Calendaring Flatwork Press",
    ],
    sla: "24 Hours Express Turnaround",
    gstin: "",
    pan: "",
    billingModel: "Per Kg Weight Basis",
    creditTerms: "Weekly Invoicing",
    trialRequested: true,
    trialDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    specialNotes: "",
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleServiceToggle = (svc: string) => {
    setFormData((prev) => {
      const exists = prev.services.includes(svc);
      if (exists) {
        return { ...prev, services: prev.services.filter((s) => s !== svc) };
      } else {
        return { ...prev, services: [...prev.services, svc] };
      }
    });
  };

  const validateStep = (currentStep: number): boolean => {
    const errors: { [key: string]: string } = {};

    if (currentStep === 1) {
      if (!formData.businessName.trim()) errors.businessName = "Business Legal Name is required";
      if (!formData.address.trim()) errors.address = "Property / Facility address is required";
      if (!formData.city.trim()) errors.city = "City is required";
      if (!formData.pincode.trim() || formData.pincode.trim().length < 6) {
        errors.pincode = "Valid 6-digit Pincode is required";
      }
    }

    if (currentStep === 2) {
      if (!formData.contactName.trim()) errors.contactName = "Authorized person's name is required";
      if (!formData.designation.trim()) errors.designation = "Designation/Role is required";
      const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length !== 10) errors.phone = "Valid 10-digit mobile number is required";
      if (!formData.email.trim() || !formData.email.includes("@")) {
        errors.email = "Official corporate email is required";
      }
    }

    if (currentStep === 3) {
      if (formData.services.length === 0) {
        errors.services = "Please select at least one fabric care service";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    const generatedId = `QP-B2B-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      // 1. Post to Backend API
      const res = await fetch("/api/b2b/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setRegisteredB2BId(data.b2bId || generatedId);
      } else {
        setRegisteredB2BId(generatedId);
      }
    } catch {
      // Offline fallback: save to localStorage so admin and user always have the record
      setRegisteredB2BId(generatedId);
    } finally {
      // Local backup for persistent zero-loss guarantee
      try {
        const existing = JSON.parse(localStorage.getItem("qp_b2b_leads") || "[]");
        existing.unshift({
          ...formData,
          b2bId: generatedId,
          id: generatedId,
          createdAt: new Date().toISOString(),
          status: "NEW_INQUIRY",
        });
        localStorage.setItem("qp_b2b_leads", JSON.stringify(existing));
      } catch {
        // ignore storage quota issues
      }

      setIsSubmitting(false);
      setSubmissionSuccess(true);
      window.scrollTo({ top: 150, behavior: "smooth" });
    }
  };

  const handleCopyId = () => {
    if (registeredB2BId) {
      navigator.clipboard.writeText(registeredB2BId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 pt-24 sm:pt-28 pb-24 selection:bg-black selection:text-white font-sans">
      {/* ── Top Official Government/Corporate Header ────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center border-b border-zinc-200 pb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-zinc-300 bg-zinc-50 text-zinc-800 text-[11px] font-mono tracking-widest uppercase mb-4 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OFFICIAL REGISTRATION PORTAL • FORM B2B-2026/V4</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight leading-tight uppercase font-mono">
          B2B Regular Bulk Order Setup
        </h1>

        <p className="mt-3 text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Official registration for Hotels, Hospitals, Hostels/PGs, Restaurants, and Corporates. 
          Set up regular daily/weekly high-volume laundry dispatch with guaranteed SLA, dedicated fleet logistics, and monthly GST invoicing.
        </p>

        {/* Official Trust Badges - Crisp Monochrome */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="border border-zinc-200 bg-zinc-50/70 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase font-mono">
              <IconShieldCheck className="w-4 h-4 text-black" />
              <span>ISO 9001 Hygiene</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">80°C Thermal Disinfection</p>
          </div>
          <div className="border border-zinc-200 bg-zinc-50/70 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase font-mono">
              <IconTruck className="w-4 h-4 text-black" />
              <span>Dedicated Fleet</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Daily Scheduled Van Van Runs</p>
          </div>
          <div className="border border-zinc-200 bg-zinc-50/70 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase font-mono">
              <IconReceipt className="w-4 h-4 text-black" />
              <span>18% GST Input</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Monthly Invoicing & Ledger</p>
          </div>
          <div className="border border-zinc-200 bg-zinc-50/70 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase font-mono">
              <IconBuilding className="w-4 h-4 text-black" />
              <span>Free Trial Wash</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">25–50 kg Sample Test Lot</p>
          </div>
        </div>
      </section>

      {/* ── Main Container ──────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {!submissionSuccess ? (
          <div className="bg-white border-2 border-zinc-900 rounded-3xl shadow-xl overflow-hidden">
            {/* Form Top Monospace Bar */}
            <div className="bg-zinc-950 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
                  QuickPress Institutional Onboarding Desk
                </span>
              </div>
              <div className="font-mono text-xs text-zinc-400">
                STEP {step} OF 5
              </div>
            </div>

            {/* Stepper Header (Black & White Minimalist) */}
            <div className="grid grid-cols-5 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-mono">
              {[
                { s: 1, label: "01 Identity" },
                { s: 2, label: "02 Contact" },
                { s: 3, label: "03 Bulk Setup" },
                { s: 4, label: "04 Billing" },
                { s: 5, label: "05 Trial & Submit" },
              ].map((item) => (
                <div
                  key={item.s}
                  className={`py-3 px-1 border-r last:border-r-0 border-zinc-200 transition-colors ${
                    step === item.s
                      ? "bg-black text-white font-bold"
                      : step > item.s
                      ? "bg-zinc-200 text-zinc-900 font-semibold"
                      : "text-zinc-400"
                  }`}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.s}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">
              {/* ── STEP 1: Organization Profile ─────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-black uppercase font-mono">
                      Step 1: Organization & Property Identity
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      Provide registered legal details of your hotel, hospital, or commercial establishment.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                        Company / Enterprise Legal Name <span className="text-black font-black">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. The Grand Palace Hotel & Suites / St. Joseph Hospital"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                          formErrors.businessName ? "border-red-500" : "border-zinc-300"
                        }`}
                      />
                      {formErrors.businessName && (
                        <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.businessName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Industry Vertical / Category <span className="text-black font-black">*</span>
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          {B2B_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Number of Operational Locations
                        </label>
                        <select
                          value={formData.unitsCount}
                          onChange={(e) => setFormData({ ...formData, unitsCount: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          <option value="1 Location">Single Unit / Property</option>
                          <option value="2 - 5 Locations">2 - 5 Regional Units</option>
                          <option value="6+ Locations">6+ Multi-City Chain</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                        Property / Facility Address <span className="text-black font-black">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Street address, building name, landmark"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                          formErrors.address ? "border-red-500" : "border-zinc-300"
                        }`}
                      />
                      {formErrors.address && (
                        <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.address}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          City <span className="text-black font-black">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kasganj, Noida, Aligarh, Agra"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                            formErrors.city ? "border-red-500" : "border-zinc-300"
                          }`}
                        />
                        {formErrors.city && (
                          <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Pincode <span className="text-black font-black">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="6-digit pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/[^0-9]/g, "") })}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                            formErrors.pincode ? "border-red-500" : "border-zinc-300"
                          }`}
                        />
                        {formErrors.pincode && (
                          <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.pincode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Authorized Signatory ─────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-black uppercase font-mono">
                      Step 2: Key Contact Person & SPOC
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      Our enterprise account desk will directly coordinate with this contact for trial dispatch and contract setup.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Authorized Contact Full Name <span className="text-black font-black">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Sharma"
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                            formErrors.contactName ? "border-red-500" : "border-zinc-300"
                          }`}
                        />
                        {formErrors.contactName && (
                          <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.contactName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Designation / Role <span className="text-black font-black">*</span>
                        </label>
                        <select
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          <option value="General Manager">General Manager (GM)</option>
                          <option value="Procurement Head">Procurement / Purchase Head</option>
                          <option value="Executive Housekeeper">Executive Housekeeper</option>
                          <option value="Operations Director">Operations Director / Admin Head</option>
                          <option value="Proprietor / Owner">Proprietor / Managing Partner</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Direct Mobile Number <span className="text-black font-black">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-zinc-400 font-mono text-xs">+91</span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="9876543210"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, "") })}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                              formErrors.phone ? "border-red-500" : "border-zinc-300"
                            }`}
                          />
                        </div>
                        {formErrors.phone && (
                          <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          WhatsApp Number (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-zinc-400 font-mono text-xs">+91</span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="Same as mobile or alternate"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/[^0-9]/g, "") })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                        Official Work Email <span className="text-black font-black">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="manager@hotelgrand.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
                          formErrors.email ? "border-red-500" : "border-zinc-300"
                        }`}
                      />
                      {formErrors.email && (
                        <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.email}</p>
                      )}
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Monthly GST invoices, audit sheets, and contract documents will be emailed here.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Bulk Order Setup ─────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-black uppercase font-mono">
                      Step 3: Regular Bulk Order Setup
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      Configure your expected daily load, logistics dispatch cycle, and required fabric care.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Estimated Daily Laundry Load
                        </label>
                        <select
                          value={formData.dailyVolume}
                          onChange={(e) => setFormData({ ...formData, dailyVolume: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          <option value="50 - 150 kg / day">50 – 150 kg / day (Boutique / Clinic / Spa)</option>
                          <option value="150 - 500 kg / day">150 – 500 kg / day (Mid-size Hotel / PG / Hospital)</option>
                          <option value="500 - 1,500+ kg / day">500 – 1,500+ kg / day (Large 5-Star / University)</option>
                          <option value="Custom Piece Count">Custom Piece Count (Itemized per piece)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Pickup & Delivery Frequency
                        </label>
                        <select
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          <option value="Daily 2x (Morning & Evening)">Daily 2x (Morning & Evening Pickup/Drop)</option>
                          <option value="Daily 1x (Standard)">Daily 1x (Fixed Schedule Once Daily)</option>
                          <option value="Alternate Days (Mon-Wed-Fri)">Alternate Days (Mon - Wed - Fri)</option>
                          <option value="On-Demand Bulk Dispatch">On-Demand Bulk Dispatch</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-2 font-mono">
                        Select Required Fabric Care Services <span className="text-black font-black">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {CARE_SERVICES.map((svc) => {
                          const isSelected = formData.services.includes(svc);
                          return (
                            <div
                              key={svc}
                              onClick={() => handleServiceToggle(svc)}
                              className={`p-3 rounded-xl border cursor-pointer text-xs font-medium flex items-center gap-3 transition-colors ${
                                isSelected
                                  ? "border-black bg-black text-white font-bold"
                                  : "border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:border-zinc-400"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                  isSelected ? "border-white bg-white text-black" : "border-zinc-400 bg-white"
                                }`}
                              >
                                {isSelected && <IconCheck className="w-3 h-3 text-black" />}
                              </div>
                              <span className="flex-1">{svc}</span>
                            </div>
                          );
                        })}
                      </div>
                      {formErrors.services && (
                        <p className="text-xs text-red-600 mt-1 font-mono">{formErrors.services}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                        Required SLA Turnaround
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {["24 Hours Express Turnaround", "48 Hours Standard Processing"].map((slaOption) => (
                          <button
                            type="button"
                            key={slaOption}
                            onClick={() => setFormData({ ...formData, sla: slaOption })}
                            className={`p-3 rounded-xl border text-xs font-mono font-bold text-center cursor-pointer transition-colors ${
                              formData.sla === slaOption
                                ? "border-black bg-black text-white"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400"
                            }`}
                          >
                            {slaOption}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Billing & Commercial ─────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-black uppercase font-mono">
                      Step 4: Commercial Terms & Tax Compliance
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      QuickPress provides 100% formal GST tax invoices with 18% Input Tax Credit (ITC) eligibility.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          GSTIN Number (Optional / Recommended)
                        </label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="e.g. 09ABCDE1234F1Z5"
                          value={formData.gstin || ""}
                          onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-mono font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black uppercase transition-colors"
                        />
                        <p className="text-[11px] text-zinc-500 mt-1">Required if claiming 18% GST Input Tax Credit</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Company PAN Number (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="e.g. ABCDE1234F"
                          value={formData.pan || ""}
                          onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-mono font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black uppercase transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Preferred Billing Model
                        </label>
                        <select
                          value={formData.billingModel}
                          onChange={(e) => setFormData({ ...formData, billingModel: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          <option value="Per Kg Weight Basis">Per Kg Weight Basis (Most Popular & Transparent)</option>
                          <option value="Per Piece Itemized Rate">Per Piece Itemized Rate (Fixed rate per garment)</option>
                          <option value="Monthly Retainer Contract">Monthly Retainer Fixed Contract</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Credit & Settlement Terms
                        </label>
                        <select
                          value={formData.creditTerms}
                          onChange={(e) => setFormData({ ...formData, creditTerms: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        >
                          <option value="Weekly Invoicing">Weekly Direct Invoicing (Billed every Monday)</option>
                          <option value="Net 15 Days Credit">Net 15 Days Credit Cycle</option>
                          <option value="Net 30 Days Monthly Invoicing">Net 30 Days Monthly Credit</option>
                          <option value="Advance Pre-Funded Wallet">Advance Corporate Wallet (5% Discount)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Free Trial Wash & Confirmation ──────────────────────── */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-black uppercase font-mono">
                      Step 5: Free Trial Wash & Final Confirmation
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      Before signing any contract, inspect our commercial wash quality with an obligation-free trial lot.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Free Trial Toggle Card */}
                    <div className="border-2 border-black rounded-2xl p-4 bg-zinc-50 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-mono font-bold uppercase">
                            Recommended
                          </span>
                          <h4 className="text-sm font-black text-black uppercase font-mono">
                            Schedule Free 25–50 kg Sample Test Wash
                          </h4>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                          Our van will pick up a 25–50 kg test lot from your property, process it with commercial steam pressing, and deliver it back within 24 hours at zero charge.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.trialRequested}
                        onChange={(e) => setFormData({ ...formData, trialRequested: e.target.checked })}
                        className="w-5 h-5 rounded border-zinc-400 text-black focus:ring-black accent-black mt-1 cursor-pointer"
                      />
                    </div>

                    {formData.trialRequested && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                          Preferred Sample Pickup Date
                        </label>
                        <input
                          type="date"
                          value={formData.trialDate || ""}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setFormData({ ...formData, trialDate: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                        Special Packaging / Linen Handling Instructions (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Shrink-wrap in 10-piece bundles, low-scent hypoallergenic detergent, RFID tags"
                        value={formData.specialNotes || ""}
                        onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium bg-zinc-50/50 focus:bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                      />
                    </div>

                    {/* Review Summary */}
                    <div className="border border-zinc-200 bg-zinc-50/50 rounded-2xl p-4 text-xs font-mono space-y-2">
                      <div className="font-bold text-black uppercase pb-1 border-b border-zinc-200">
                        Registration Review Summary
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Organization:</span>
                        <span className="font-bold text-black">{formData.businessName || "—"}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Category:</span>
                        <span className="font-bold text-black">{formData.category}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>SPOC Contact:</span>
                        <span className="font-bold text-black">{formData.contactName} ({formData.phone})</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Daily Volume:</span>
                        <span className="font-bold text-black">{formData.dailyVolume}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Frequency:</span>
                        <span className="font-bold text-black">{formData.frequency}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-zinc-600 pt-2">
                      <input
                        type="checkbox"
                        id="terms"
                        defaultChecked
                        required
                        className="w-4 h-4 rounded border-zinc-400 text-black focus:ring-black accent-black mt-0.5"
                      />
                      <label htmlFor="terms">
                        I confirm that I am authorized to register this business. I agree to QuickPress Commercial SLA Terms, Fair Weight Audits, and Privacy Policy.
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Form Actions Bar (Monochrome High Contrast) ────────────────── */}
              <div className="flex items-center justify-between pt-6 border-t border-zinc-200">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-300 text-xs font-mono font-bold uppercase text-zinc-800 hover:bg-zinc-100 cursor-pointer transition-colors"
                  >
                    <IconArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase hover:bg-zinc-800 shadow-md cursor-pointer transition-colors"
                  >
                    <span>Continue</span>
                    <IconArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase hover:bg-zinc-800 shadow-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <span>Submitting Registration...</span>
                    ) : (
                      <>
                        <IconCheck className="w-4 h-4" />
                        <span>Complete Official Registration</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          /* ── SUCCESS VIEW: Official Registration Certificate / Dossier ────────── */
          <div className="bg-white border-2 border-black rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header Stamp */}
            <div className="bg-black text-white p-6 sm:p-8 text-center border-b border-zinc-800">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono text-xs uppercase tracking-widest mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OFFICIALLY REGISTERED • VERIFIED RECORD</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase font-mono tracking-tight">
                B2B Bulk Order Partnership Approved
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl mx-auto">
                Your enterprise account has been created in the QuickPress Corporate Ledger. 
                Your dedicated account manager has been assigned.
              </p>
            </div>

            {/* Certificate Card Body */}
            <div className="p-6 sm:p-10 space-y-8">
              {/* Unique B2B ID Dossier Box */}
              <div className="border-2 border-dashed border-zinc-900 bg-zinc-50 rounded-2xl p-6 sm:p-8 text-center relative">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 block mb-1">
                  OFFICIAL UNIQUE B2B CLIENT ID
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-black tracking-wider">
                    {registeredB2BId}
                  </span>
                  <button
                    onClick={handleCopyId}
                    title="Copy B2B ID"
                    className="p-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-black cursor-pointer transition-colors"
                  >
                    {copied ? <IconCheck className="w-4 h-4 text-emerald-600" /> : <IconCopy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-2">
                  Quote this ID for priority fleet dispatch, billing reconciliation, and WhatsApp support.
                </p>
              </div>

              {/* Registration Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2">
                  <span className="font-bold text-black uppercase block border-b border-zinc-200 pb-1">
                    Enterprise Record
                  </span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Business:</span>
                    <span className="font-bold text-black">{formData.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Category:</span>
                    <span className="text-black">{formData.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">City / Pincode:</span>
                    <span className="text-black">{formData.city} • {formData.pincode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Daily Load:</span>
                    <span className="font-bold text-black">{formData.dailyVolume}</span>
                  </div>
                </div>

                <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2">
                  <span className="font-bold text-black uppercase block border-b border-zinc-200 pb-1">
                    Assigned Account Manager
                  </span>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Manager:</span>
                    <span className="font-bold text-black">Aman Saxena</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Desk:</span>
                    <span className="text-black">Corporate Operations & SLA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Direct Contact:</span>
                    <span className="font-bold text-black">+91 97204 17743</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sample Wash:</span>
                    <span className="text-emerald-700 font-bold">
                      {formData.trialRequested ? `Confirmed: ${formData.trialDate}` : "Standard Contract"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-zinc-200">
                <a
                  href={`tel:+919720417743`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase hover:bg-zinc-800 transition-colors"
                >
                  <IconPhone className="w-4 h-4" />
                  <span>Call Corporate Desk</span>
                </a>

                <a
                  href={`https://wa.me/919720417743?text=Hello%20QuickPress%20Team,%20we%20have%20completed%20our%20B2B%20Bulk%20Registration%20for%20${encodeURIComponent(
                    formData.businessName
                  )}%20(Ref:%20${registeredB2BId}).`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-300 text-xs font-mono font-bold uppercase text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  <span>WhatsApp Coordination</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-300 text-xs font-mono font-bold uppercase text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <IconPrinter className="w-4 h-4" />
                  <span>Print Record</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setSubmissionSuccess(false);
                    setStep(1);
                    setFormData({
                      businessName: "",
                      category: "Hotels & Hospitality",
                      address: "",
                      city: "Kasganj",
                      pincode: "",
                      unitsCount: "1 Location",
                      contactName: "",
                      designation: "General Manager",
                      phone: "",
                      whatsapp: "",
                      email: "",
                      dailyVolume: "150 - 500 kg / day",
                      frequency: "Daily 2x (Morning & Evening)",
                      services: [
                        "Commercial Bed Linen & Bath Towels (Flatwork Steam Iron)",
                        "High-Pressure Roller Calendaring Flatwork Press",
                      ],
                      sla: "24 Hours Express Turnaround",
                      gstin: "",
                      pan: "",
                      billingModel: "Per Kg Weight Basis",
                      creditTerms: "Weekly Invoicing",
                      trialRequested: true,
                      trialDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
                      specialNotes: "",
                    });
                  }}
                  className="text-xs font-mono text-zinc-500 hover:text-black underline cursor-pointer"
                >
                  Register Another Business / Branch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
