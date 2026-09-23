import React, { useState, useEffect } from "react";
import { PageType, ModalType, ServiceInfo } from "@/types";
import {
  IconCheck,
  IconSparkle,
  IconBolt,
  IconShield,
  IconCpu,
  IconHandshake,
  IconVan,
  IconLaundry,
  IconBox,
  IconBriefcase,
  IconMapPin,
  IconUsers,
  IconChevronDown,
  IconArrowRight,
} from "@/components/Icons";
import { Logo } from "@/components/Navbar";
import logoLight from "@/assets/quickpress-logo.png";
import logoDark from "@/assets/quickpress-logo-dark.png";
import customerLogo from "@/assets/quickpress-customer-logo.jpg";
import partnerLogo from "@/assets/quickpress-partner-logo.png";
import captainLogo from "@/assets/quickpress-captain-logo.jpg";

const GREEN = "#1A7A3C";
const GREEN_LIGHT = "#22C55E";
const GREEN_DARK = "#0F4622";
const YELLOW = "#F59E0B";

const HERO_PIPELINE = [
  {
    id: 1,
    title: "Order Confirmed",
    badge: "Just now",
    desc: "Order #QP-84920 received & verified",
    icon: IconCheck,
    color: "#16A34A",
    bg: "#DCFCE7",
  },
  {
    id: 2,
    title: "Pickup Scheduled",
    badge: "10:30 AM",
    desc: "Driver Alex M. assigned (0.4 mi away)",
    icon: IconVan,
    color: "#2563EB",
    bg: "#DBEAFE",
  },
  {
    id: 3,
    title: "Processing Network",
    badge: "Active",
    desc: "Eco-care cleaning & inspection",
    icon: IconCpu,
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    id: 4,
    title: "Out for Delivery",
    badge: "On the way",
    desc: "Direct express route to 742 Evergreen",
    icon: IconBolt,
    color: "#D97706",
    bg: "#FEF3C7",
  },
  {
    id: 5,
    title: "Delivered & Inspected",
    badge: "Completed",
    desc: "Signed & returned in pristine condition",
    icon: IconShield,
    color: GREEN,
    bg: "#E8F7EE",
  },
];

const ORDER_PROCESSING_PIPELINE = [
  {
    step: 1,
    title: "1-Click App Intake",
    panel: "Customer App",
    eta: "Instant",
    icon: IconSparkle,
    color: "#059669",
    bg: "#ECFDF5",
    desc: "Customer selects services, sets custom fabric care preferences (starch level, fold vs hanger), and books a 1-hour doorstep collection slot.",
    tech: "Dynamic Geospatial Booking Engine",
    keyDeliverable: "Digital QR Token & Verified Timeslot",
  },
  {
    step: 2,
    title: "Captain Doorstep Pickup",
    panel: "Captain Fleet",
    eta: "<12 Mins",
    icon: IconVan,
    color: "#2563EB",
    bg: "#EFF6FF",
    desc: "Nearest fleet captain arrives with tamper-evident barcode laundry bags, confirms item count with customer, and scans the serialized bag tag.",
    tech: "Smart Multi-Stop Route Clustering",
    keyDeliverable: "Tamper-Evident Barcode Seal",
  },
  {
    step: 3,
    title: "Tagging & Pre-Wash QA",
    panel: "Partner Hub",
    eta: "+30 Mins",
    icon: IconCpu,
    color: "#7C3AED",
    bg: "#F5F3FF",
    desc: "Partner facility conducts high-res fabric camera inspection, logs existing stains, categorizes color batches, and generates digital weigh-in invoice.",
    tech: "Serialized Cloud POS & Fiber Inspection",
    keyDeliverable: "Itemized Pre-Wash Digital Receipt",
  },
  {
    step: 4,
    title: "Eco-Wash & Steam Ironing",
    panel: "Processing Hub",
    eta: "+2-4 Hours",
    icon: IconLaundry,
    color: "#059669",
    bg: "#ECFDF5",
    desc: "Garments undergo temperature-controlled eco-cleaning with RO-purified water and hypoallergenic detergents, followed by high-pressure Italian steam pressing.",
    tech: "RO Water + Italian Steam Formers",
    keyDeliverable: "Zero Shrinkage & Stain-Free Finish",
  },
  {
    step: 5,
    title: "6-Point Quality Audit",
    panel: "QA Station",
    eta: "+30 Mins",
    icon: IconShield,
    color: "#D97706",
    bg: "#FFFBEB",
    desc: "Senior QA auditor inspects cuffs, collars, crease sharpness, and button integrity. Items are packaged in breathable protective dust covers.",
    tech: "6-Point Master Inspection Protocol",
    keyDeliverable: "Breathable Garment Cover Packaging",
  },
  {
    step: 6,
    title: "Doorstep Express Return",
    panel: "Captain Fleet",
    eta: "Scheduled Slot",
    icon: IconCheck,
    color: "#16A34A",
    bg: "#DCFCE7",
    desc: "Captain returns fresh, crisp garments to customer's doorstep with live GPS route countdown, OTP confirmation, and contactless payment validation.",
    tech: "Secure Contactless OTP Verification",
    keyDeliverable: "Pristine Clothes & Digital Tax Invoice",
  },
];

export function HomePage({
  onNavigate,
  onOpenModal,
  onSelectService,
  onShowToast,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
  onSelectService: (s: ServiceInfo) => void;
  onShowToast: (msg: string) => void;
}) {
  const [activeStepIndex, setActiveStepIndex] = useState(1);
  const [activeProcessStage, setActiveProcessStage] = useState(1);
  const [email, setEmail] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % HERO_PIPELINE.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentStep = HERO_PIPELINE[activeStepIndex];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onShowToast(`Thank you! ${email} has been subscribed to QuickPress updates.`);
    setEmail("");
  };

  return (
    <div className="space-y-0">
      {/* ─── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 bg-white overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-900 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  The Smarter Way to Get Things Done
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black text-gray-950 leading-[1.08] tracking-tight">
                Everyday Services. <br />
                Made{" "}
                <span style={{ color: GREEN }} className="relative inline-block font-black">
                  Simple.
                  <svg
                    className="absolute left-0 -bottom-2 w-full h-3 text-yellow-400 opacity-90 -z-10"
                    viewBox="0 0 100 12"
                    preserveAspectRatio="none"
                  >
                    <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                QuickPress connects customers, businesses and verified service partners through one simple, reliable platform. Instant booking, transparent pricing, and effortless execution.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <button
                  onClick={() => onOpenModal("booking")}
                  className="px-8 py-4 rounded-full font-bold text-white text-base shadow-xl shadow-emerald-900/20 hover:shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  style={{ background: GREEN }}
                >
                  <span>Get Started</span>
                  <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => onNavigate("services")}
                  className="px-7 py-4 rounded-full font-bold text-gray-800 text-base bg-gray-100/90 hover:bg-gray-200/80 border border-gray-200/80 transition-all text-center cursor-pointer"
                >
                  Explore All Services
                </button>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                {[
                  { label: "Laundry & Garments", dot: "bg-emerald-500" },
                  { label: "Express Pickup", dot: "bg-blue-500" },
                  { label: "B2B Logistics", dot: "bg-purple-500" },
                  { label: "Verified Partners", dot: "bg-amber-500" },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200/60 text-gray-700"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
                    {pill.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Live Pipeline Simulator */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="relative w-full rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-emerald-50/60 via-white to-gray-50/80 border border-emerald-100 shadow-2xl shadow-emerald-950/5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-live-dot" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      QuickPress Live Dispatch Engine
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                    Order #QP-84920
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs relative overflow-hidden transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                        style={{ background: currentStep.bg }}
                      >
                        <currentStep.icon className="w-6 h-6" style={{ color: currentStep.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-base sm:text-lg">
                            {currentStep.title}
                          </h4>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: currentStep.bg, color: currentStep.color }}
                          >
                            {currentStep.badge}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                          {currentStep.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                      <span>Ecosystem Progress</span>
                      <span className="text-emerald-700 font-bold">
                        {Math.round(((activeStepIndex + 1) / HERO_PIPELINE.length) * 100)}% Verified
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${((activeStepIndex + 1) / HERO_PIPELINE.length) * 100}%`,
                          background: `linear-gradient(to right, ${GREEN}, ${YELLOW})`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-4">
                  {HERO_PIPELINE.map((step, idx) => {
                    const isCurrent = idx === activeStepIndex;
                    const isPassed = idx < activeStepIndex;
                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveStepIndex(idx)}
                        className={`p-2 rounded-xl text-left transition-all border flex flex-col items-center sm:items-start cursor-pointer ${
                          isCurrent
                            ? "bg-white border-emerald-500 shadow-md shadow-emerald-500/10 scale-[1.02]"
                            : isPassed
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                            : "bg-white/60 border-gray-100 text-gray-400 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                              isCurrent
                                ? "bg-emerald-700 text-white"
                                : isPassed
                                ? "bg-emerald-200 text-emerald-800"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="hidden sm:inline text-[10px] font-semibold truncate max-w-[55px]">
                            {step.title.split(" ")[0]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 bg-white/95 rounded-2xl p-3.5 border border-emerald-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800">Customer</span>
                    <span className="text-emerald-600 font-bold">→</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold">QuickPress</span>
                    <span className="text-emerald-600 font-bold">→</span>
                    <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-900">Partner</span>
                    <span className="text-emerald-600 font-bold">→</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900">Delivery</span>
                  </div>
                  <button
                    onClick={() => onNavigate("how-it-works")}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    View Flow Guide
                    <IconArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Capabilities Strip ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-gray-50/70 border-y border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-400 mb-8 sm:mb-10">
            Built for everyday convenience
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: "Fast Service", sub: "Quick & convenient operations with same-day scheduling", icon: IconBolt, color: "#059669", bg: "#ECFDF5" },
              { title: "Reliable Partners", sub: "Vetted & certified service ecosystem of professionals", icon: IconHandshake, color: "#2563EB", bg: "#EFF6FF" },
              { title: "Simple Experience", sub: "Designed around the customer for zero-friction booking", icon: IconSparkle, color: "#D97706", bg: "#FFFBEB" },
              { title: "Smart Operations", sub: "Technology-driven platform with live map telemetry", icon: IconCpu, color: "#7C3AED", bg: "#F5F3FF" },
            ].map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4 group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                  style={{ background: s.bg }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">{s.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Editorial Spotlight Teaser ───────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold tracking-widest uppercase">
                About QuickPress
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-gray-950 leading-[1.12]">
                One platform. <br />
                Multiple everyday <br />
                <span style={{ color: GREEN }}>needs.</span>
              </h2>

              <div className="w-16 h-1 rounded-full bg-yellow-400" />

              <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                QuickPress is an on-demand services platform engineered for modern urban living. From scheduled laundry pickup to point-to-point courier logistics and local business support, we eliminate the friction from daily errands.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate("about")}
                  className="px-6 py-3 rounded-full font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Learn Our Story & Mission</span>
                  <IconArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-[500px] rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-gray-50/90 p-6 sm:p-8 border border-emerald-100 shadow-xl overflow-hidden">
                {/* Background Grid Pattern & Pulse Rings */}
                <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
                
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-800">
                      QuickPress Connected Platform
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    Live Operations
                  </span>
                </div>

                {/* Central Dispatch Hub Orb */}
                <div className="relative z-10 flex flex-col items-center justify-center mb-6">
                  <div className="px-5 py-2.5 rounded-2xl shadow-md bg-white border border-emerald-200 flex items-center gap-2.5">
                    <img src={logoLight} alt="QuickPress" className="h-6 w-auto object-contain" />
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                      Live AI Dispatch
                    </span>
                  </div>
                </div>

                {/* The 3 Connected Pillars Grid */}
                <div className="grid grid-cols-3 gap-3 relative z-10">
                  {/* Pillar 1: Customer */}
                  <div className="bg-white rounded-2xl p-3.5 border border-yellow-200/90 shadow-xs text-center flex flex-col items-center justify-between hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl p-1 bg-[#FBBF24] flex items-center justify-center shadow-xs mb-2">
                      <img src={customerLogo} alt="Customer" className="w-full h-full object-contain rounded-lg" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-gray-950 block">Customer</span>
                      <span className="text-[9px] text-gray-500 font-semibold block leading-tight mt-0.5">
                        1-Click App Intake
                      </span>
                    </div>
                    <span className="mt-2 text-[9px] font-bold text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                      Doorstep ETA
                    </span>
                  </div>

                  {/* Pillar 2: Partner */}
                  <div className="bg-white rounded-2xl p-3.5 border border-emerald-200/90 shadow-xs text-center flex flex-col items-center justify-between hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl p-1 bg-white border border-gray-100 flex items-center justify-center shadow-xs mb-2">
                      <img src={partnerLogo} alt="Partner" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-gray-950 block">Partner Hub</span>
                      <span className="text-[9px] text-gray-500 font-semibold block leading-tight mt-0.5">
                        Eco-Wash Plant
                      </span>
                    </div>
                    <span className="mt-2 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Cloud POS
                    </span>
                  </div>

                  {/* Pillar 3: Captain */}
                  <div className="bg-white rounded-2xl p-3.5 border border-yellow-300/90 shadow-xs text-center flex flex-col items-center justify-between hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl p-1 bg-white border border-gray-100 flex items-center justify-center shadow-xs mb-2">
                      <img src={captainLogo} alt="Captain" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-gray-950 block">Captain Fleet</span>
                      <span className="text-[9px] text-gray-500 font-semibold block leading-tight mt-0.5">
                        Batched Transit
                      </span>
                    </div>
                    <span className="mt-2 text-[9px] font-bold text-yellow-900 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                      GPS Routing
                    </span>
                  </div>
                </div>

                {/* Bottom Telemetry Footer Strip */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 font-semibold">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Sub-12 Min Dispatch</span>
                  </div>
                  <button
                    onClick={() => onNavigate("ecosystem")}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Explore Ecosystem</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Order Processing Lifecycle Diagram ───────────────────── */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-t border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-8">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                  Live 6-Stage Processing Architecture
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-950 mt-2">
                  How Every Order Is Handled With Zero Error
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Click on any stage below to inspect the behind-the-scenes verification, technology, and delivery guarantees.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate("how-it-works")}
                  className="px-5 py-2.5 rounded-full font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 text-xs border border-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Full Technology Guide</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 6 Step Horizontal Timeline Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-8">
              {ORDER_PROCESSING_PIPELINE.map((p) => {
                const isCurrent = activeProcessStage === p.step;
                const isPassed = activeProcessStage > p.step;
                return (
                  <button
                    key={p.step}
                    onClick={() => setActiveProcessStage(p.step)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? "bg-white text-emerald-950 border-2 border-emerald-600 shadow-md scale-102 ring-2 ring-emerald-500/20"
                        : isPassed
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                          isCurrent
                            ? "bg-emerald-600 text-white"
                            : isPassed
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {p.step}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isCurrent
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200/70 text-gray-600"
                        }`}
                      >
                        {p.eta}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`text-xs font-black block leading-tight ${
                          isCurrent ? "text-emerald-950" : "text-gray-900"
                        }`}
                      >
                        {p.title}
                      </span>
                      <span
                        className={`text-[10px] block mt-0.5 ${
                          isCurrent ? "text-emerald-700 font-bold" : "text-gray-400"
                        }`}
                      >
                        {p.panel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Detailed Breakdown Box */}
            {(() => {
              const stage =
                ORDER_PROCESSING_PIPELINE.find((p) => p.step === activeProcessStage) ||
                ORDER_PROCESSING_PIPELINE[0];
              const StageIcon = stage.icon;
              return (
                <div className="bg-gradient-to-br from-gray-50 via-white to-emerald-50/40 rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs grid lg:grid-cols-12 gap-6 items-center animate-fade-in">
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
                        style={{ background: stage.bg }}
                      >
                        <StageIcon className="w-6 h-6" style={{ color: stage.color }} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          Stage {stage.step} of 6 • {stage.panel}
                        </span>
                        <h4 className="text-xl sm:text-2xl font-black text-gray-950 mt-1">
                          {stage.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {stage.desc}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block">
                          Engine Technology
                        </span>
                        <span className="font-bold text-gray-900">{stage.tech}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block">
                          Verified Output
                        </span>
                        <span className="font-bold text-emerald-800">{stage.keyDeliverable}</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-emerald-200/80 shadow-sm space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Stage Processing Time
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-800">
                      {stage.eta}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                      100% SLA Guarantee
                    </span>
                    <div className="pt-2 w-full flex gap-2">
                      <button
                        onClick={() =>
                          setActiveProcessStage((prev) => (prev > 1 ? prev - 1 : 6))
                        }
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() =>
                          setActiveProcessStage((prev) => (prev < 6 ? prev + 1 : 1))
                        }
                        className="flex-1 py-2 rounded-xl font-bold text-white text-xs shadow-xs hover:scale-102 transition-transform cursor-pointer"
                        style={{ background: GREEN }}
                      >
                        Next Step →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ─── Split Customer & Partner Banner ──────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Customer Card */}
            <div className="bg-gray-50 rounded-3xl p-8 sm:p-12 border border-gray-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  For Customers
                </span>
                <h3 className="text-3xl font-black text-gray-950 mt-4 mb-2">
                  Simple services. Better experience.
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                  Doorstep collection, real-time SMS updates, and 100% transparent pricing for all your daily laundry and courier errands.
                </p>
              </div>
              <button
                onClick={() => onOpenModal("booking")}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-white text-sm shadow-md hover:scale-105 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                style={{ background: GREEN }}
              >
                <span>Book a Service Now</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Partner Card */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-gray-950 shadow-xl border-2 border-emerald-100 flex flex-col justify-between relative overflow-hidden">
              <div>
                <span className="text-xs font-black tracking-widest text-emerald-800 uppercase bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                  For Partners
                </span>
                <h3 className="text-3xl font-black text-gray-950 mt-4 mb-2">
                  Grow your business with QuickPress.
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                  Join our verified network to receive guaranteed volume, dispatch software, and weekly automated payouts.
                </p>
              </div>
              <button
                onClick={() => onNavigate("partners")}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full font-black text-white bg-emerald-700 hover:bg-emerald-800 text-sm shadow-xl hover:scale-105 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>Explore Partner Benefits</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ecosystem Teaser (Clean Light Theme) ──────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-emerald-50/60 via-white to-gray-50/80 border-t border-gray-200/70 text-gray-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-900 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
            Dispatch Infrastructure
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-4 mb-4">
            Connecting people, services <br />
            <span style={{ color: GREEN }}>and possibilities.</span>
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm sm:text-base mb-8">
            Our unified intelligence engine routes orders dynamically across our 5 interconnected hubs.
          </p>

          <button
            onClick={() => onNavigate("ecosystem")}
            className="px-8 py-4 rounded-full font-bold text-white shadow-xl hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-2"
            style={{ background: GREEN }}
          >
            <span>Explore Live Ecosystem Node Map</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─── FAQs ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gray-50/70 border-t border-gray-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3.5">
            {[
              { q: "How fast can I get my laundry or courier pickup scheduled?", a: "You can book an immediate pickup in under 45 minutes or choose a scheduled 1-hour window that fits your weekly calendar." },
              { q: "How are QuickPress partner providers and drivers vetted?", a: "Every partner undergoes thorough background screening, equipment inspection, and maintains a minimum 4.8 customer satisfaction score." },
              { q: "What cities does QuickPress operate in?", a: "QuickPress operates in major urban regions. Enter your zip code in booking to see live availability." },
            ].map((faq, idx) => (
              <div
                key={faq.q}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-gray-900 text-sm sm:text-base cursor-pointer hover:bg-gray-50/60"
                >
                  <span>{faq.q}</span>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gray-100 transition-transform ${openFaq === idx ? "rotate-180 bg-emerald-100 text-emerald-800" : "text-gray-600"}`}>
                    <IconChevronDown className="w-4 h-4" />
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-gray-600 border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-white relative overflow-hidden text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" onClick={() => onNavigate("home")} />
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-gray-950 leading-tight mb-5">
            Ready to experience <br />
            <span style={{ color: GREEN }}>QuickPress?</span>
          </h2>

          <p className="text-base sm:text-xl text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">
            Discover a simpler, faster way to manage everyday laundry, parcels, and local logistics.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={() => onOpenModal("booking")}
              className="w-full sm:w-auto px-9 py-4 rounded-full font-bold text-white text-base shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ background: GREEN }}
            >
              <span>Get Started Now</span>
              <IconArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate("partners")}
              className="w-full sm:w-auto px-9 py-4 rounded-full font-bold text-emerald-800 text-base border-2 border-emerald-700 bg-white hover:bg-emerald-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Partner With Us</span>
              <IconArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="max-w-md mx-auto pt-6 border-t border-gray-200/80">
            <p className="text-xs font-semibold text-gray-500 mb-3">
              Subscribe for local coverage updates & special launch offers
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-xs cursor-pointer"
                style={{ background: GREEN }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
