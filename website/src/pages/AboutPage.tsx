import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import logoLight from "@/assets/quickpress-logo.png";

// Clean, sharp vector outline icons (Strictly NO 3D, NO cartoon graphics)
const IconGraduationCap = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const IconMapPin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconClock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconShieldCheck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconSparkles = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </svg>
);

const IconZap = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconBuilding = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

const MILESTONES = [
  {
    year: "2018–2020",
    badge: "Formative Roots",
    title: "Classrooms of Saraswati Vidya Mandir, Kasganj",
    desc: "Early school education at Suraj Prasad Daga Saraswati Vidya Mandir. Imbibed values of self-reliance (स्वावलंबन), rigorous discipline, and a deep-rooted passion to build technology that impacts common Indian families.",
    icon: IconGraduationCap,
  },
  {
    year: "2021–2023",
    badge: "The Problem Identified",
    title: "Observing India's Broken Everyday Laundry & Pressing Crisis",
    desc: "Saw mothers, students, and working professionals spending 8–10 hours each week scrubbing clothes, while urgent requirements for ironed shirts before job interviews or functions resulted in panic due to delayed, unpredictable local dhobis.",
    icon: IconClock,
  },
  {
    year: "2024–2025",
    badge: "Architecting the Engine",
    title: "Engineering the 3-App Hyper-local Architecture",
    desc: "Designed and coded the unified ecosystem connecting Customers, Laundromat Partners, and Delivery Captains with GPS dispatch, live barcoded order tracking, and 80°C medical-grade thermal hygiene.",
    icon: IconZap,
  },
  {
    year: "2026 & Beyond",
    badge: "National Expansion",
    title: "Born in Kasganj, Scaling Across Bharat",
    desc: "Operating live across Kasganj, Noida, Greater Noida, and Western UP, on a bold mission to bring organized garment care to over 100+ Tier-2 and Tier-3 Indian cities.",
    icon: IconSparkles,
  },
];

export function AboutPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [activeTab, setActiveTab] = useState<"struggle" | "solution">("solution");
  const [activeMilestone, setActiveMilestone] = useState<number>(0);

  return (
    <div className="pt-24 sm:pt-28 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden">
      {/* ─── Hero Section with Animated Ambient Glow ────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-16">
        {/* Animated Radial Backdrop Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-widest uppercase shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping" />
            <span>FOUNDER'S STORY • BORN IN KASGANJ, SERVING BHARAT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            Born in Kasganj. <br />
            <span className="text-[#22c55e] relative inline-block">
              Built to Simplify Everyday India.
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#22c55e]/30" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed pt-2">
            The untold journey of how a young student from <strong>Suraj Prasad Daga Saraswati Vidya Mandir, Kasganj</strong> observed the silent, exhausting struggle of weekend laundry and urgent pressing in Indian households — and engineered an on-demand hyper-local revolution.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-left font-mono">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-black text-black">10-12m</span>
              <div className="text-xs text-zinc-500 leading-tight">
                <span className="font-bold text-zinc-900 block">Captain Dispatch</span>
                Doorstep Pickup
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-black text-[#22c55e]">2 Hrs</span>
              <div className="text-xs text-zinc-500 leading-tight">
                <span className="font-bold text-zinc-900 block">Express Steam Press</span>
                Emergency Turnaround
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-black text-black">Kasganj</span>
              <div className="text-xs text-zinc-500 leading-tight">
                <span className="font-bold text-zinc-900 block">Home Roots</span>
                Uttar Pradesh, India
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Founder Spotlight Card with Interactive Glow ──────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="group relative rounded-3xl bg-zinc-950 text-white p-8 sm:p-14 border border-zinc-800 shadow-2xl overflow-hidden hover:border-[#22c55e]/50 transition-all duration-300">
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#22c55e]/20 transition-all duration-500" />

          <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Founder Bio & Vision */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-[#22c55e] text-xs font-mono font-bold uppercase tracking-wider">
                  Founder & Chief Executive Officer
                </span>
                <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <IconMapPin className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Kasganj, Uttar Pradesh</span>
                </span>
              </div>

              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                  Himanshu Pal
                </h2>
                <p className="text-sm font-mono text-[#22c55e] font-semibold mt-1">
                  (Widely known to friends & community as Himanshu Baghel)
                </p>
              </div>

              <blockquote className="text-base sm:text-lg text-zinc-300 italic border-l-2 border-[#22c55e] pl-4 leading-relaxed font-serif">
                "We didn't build QuickPress sitting in an air-conditioned skyscraper in a metro city. We conceived it on the streets of Kasganj by listening to mothers scrubbing clothes with sore hands, students rushing for morning college, and local iron-wallahs battling erratic power cuts."
              </blockquote>

              <div className="space-y-3 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                <p>
                  Educated at <strong>Suraj Prasad Daga Saraswati Vidya Mandir, Kasganj</strong>, Himanshu’s foundation was built on discipline, humility, and the Indian spirit of solving grassroots problems through self-reliance.
                </p>
                <p>
                  Coupled with his deep self-taught mastery in <strong>Full Stack Engineering</strong>, high-throughput cloud architecture, and growth operations, he wrote the very first lines of QuickPress code to prove that world-class hyper-local technology can originate right out of Kasganj.
                </p>
              </div>

              {/* Founder Badges */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                  ⚡ Full Stack Engineer & Architect
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                  🏫 Saraswati Vidya Mandir Alumnus
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                  🚀 Grassroots Execution Leader
                </span>
              </div>
            </div>

            {/* Right Column: Founder & Company Trust Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-6 text-left relative shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="w-12 h-12 rounded-2xl bg-black border border-zinc-700 overflow-hidden flex items-center justify-center p-1.5">
                    <img src={logoLight} alt="QuickPress Logo" className="w-full h-auto object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white font-mono">QuickPress Technologies</h4>
                    <span className="text-[11px] text-zinc-400 font-mono">Kasganj Headquarters</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Corporate Entity:</span>
                    <span className="font-bold text-white text-right">QuickPress Tech Pvt Ltd</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">CIN:</span>
                    <span className="font-mono text-emerald-400 text-right">U96010UW2026PTC259787</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Registered Office:</span>
                    <span className="text-zinc-300 text-right max-w-[170px] truncate" title="Jail Road Nagla Baini, Kasganj, UP">
                      Jail Road, Kasganj, UP
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Founder Desk:</span>
                    <span className="font-bold text-[#22c55e]">Himanshu Pal</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed font-sans">
                  "Every garment handed to QuickPress represents someone's hard work, confidence, and trust. We treat it like our own family's clothes."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── The Problem Observed: The Everyday Household Struggle ─────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold uppercase tracking-widest">
            THE SPARK • WHY QUICKPRESS EXISTS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            The Unspoken Struggle in 90 Million Indian Homes
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            In modern India, food arrives in 10 minutes and groceries in 12 minutes. Yet, why were families still spending their precious Sundays soaked in laundry tubs, and panicking over delayed iron-wallahs?
          </p>

          {/* Interactive Toggle Switch */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 border border-zinc-200 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("struggle")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === "struggle"
                  ? "bg-black text-white shadow-md"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              The Traditional Struggle (Before)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("solution")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === "solution"
                  ? "bg-[#22c55e] text-black shadow-md font-black"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              The QuickPress Experience (Now)
            </button>
          </div>
        </div>

        {/* Dynamic Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeTab === "struggle" ? (
            <>
              <div className="bg-zinc-50 border border-red-200 rounded-3xl p-7 space-y-4 hover:shadow-lg transition-all animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                  ❌
                </div>
                <h3 className="text-lg font-black text-black font-mono">The Weekend Laundry Trap</h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Working parents and students lose 8–10 hours every single weekend soaking, hand-scrubbing, and drying clothes on balconies and clotheslines. Sundays ruined by endless wet laundry.
                </p>
                <div className="text-[11px] font-mono text-red-700 font-bold pt-2">
                  Average Lost Time: 32+ hours / month
                </div>
              </div>

              <div className="bg-zinc-50 border border-red-200 rounded-3xl p-7 space-y-4 hover:shadow-lg transition-all animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                  ❌
                </div>
                <h3 className="text-lg font-black text-black font-mono">The Urgent Pressing Panic</h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Sudden job interview tomorrow morning? Wedding reception tonight? Traditional iron-wallahs (dhobis) take 3–4 days, suffer unpredictable power cuts, coal burn stains, or simple delays.
                </p>
                <div className="text-[11px] font-mono text-red-700 font-bold pt-2">
                  Zero accountability & last-minute stress
                </div>
              </div>

              <div className="bg-zinc-50 border border-red-200 rounded-3xl p-7 space-y-4 hover:shadow-lg transition-all animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                  ❌
                </div>
                <h3 className="text-lg font-black text-black font-mono">Lost Clothes & Zero Recourse</h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Manual paper registers, faded chalk marks, and clothes washed in contaminated stagnant water. If an expensive shirt was damaged or lost, customers received no refund or compensation.
                </p>
                <div className="text-[11px] font-mono text-red-700 font-bold pt-2">
                  Unorganized, unhygienic & untracked
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-3xl p-7 space-y-4 hover:shadow-xl transition-all animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-[#22c55e] text-black flex items-center justify-center font-bold">
                  <IconCheck className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-lg font-black text-black font-mono">10-Min Captain Doorstep Dispatch</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                  Tap once on the QuickPress app. A verified delivery captain reaches your home within 10–12 minutes with a secure, waterproof sealable laundry bag. Zero weekend effort.
                </p>
                <div className="text-[11px] font-mono text-emerald-800 font-bold pt-2">
                  Reclaim your entire weekend for family & rest
                </div>
              </div>

              <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-3xl p-7 space-y-4 hover:shadow-xl transition-all animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-[#22c55e] text-black flex items-center justify-center font-bold">
                  <IconZap className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-lg font-black text-black font-mono">2-Hour Express Steam Pressing</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                  Got an urgent meeting or evening event? Choose Express Delivery. Italian vacuum steam tables remove wrinkles in seconds without burning delicate fabric, delivered back in 2 hours.
                </p>
                <div className="text-[11px] font-mono text-emerald-800 font-bold pt-2">
                  Crisp, wrinkle-free clothes when you need them most
                </div>
              </div>

              <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-3xl p-7 space-y-4 hover:shadow-xl transition-all animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-[#22c55e] text-black flex items-center justify-center font-bold">
                  <IconShieldCheck className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-lg font-black text-black font-mono">Barcode Tracking & ₹5,000 Guarantee</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                  Every garment is individually barcoded and photographed upon arrival. Processed with 80°C thermal anti-bacterial hygiene, backed by our ₹5,000 QuickPress Garment Care Guarantee.
                </p>
                <div className="text-[11px] font-mono text-emerald-800 font-bold pt-2">
                  100% Peace of mind & digital transparency
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── Interactive Journey & Milestones Timeline ─────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="px-3.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-mono font-bold uppercase tracking-wider">
            THE CHRONOLOGY
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            From Kasganj School Bench to National Platform
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Click through the defining chapters of how QuickPress evolved from a student observation into India's fastest garment care network.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Milestone Selectors */}
          <div className="lg:col-span-5 space-y-3">
            {MILESTONES.map((m, idx) => (
              <button
                key={m.year}
                type="button"
                onClick={() => setActiveMilestone(idx)}
                className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  activeMilestone === idx
                    ? "border-black bg-zinc-950 text-white shadow-xl scale-[1.02]"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeMilestone === idx ? "bg-[#22c55e] text-black" : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  <m.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#22c55e]">{m.year}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      {m.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mt-1">{m.title}</h4>
                </div>
              </button>
            ))}
          </div>

          {/* Active Milestone Card Detail with Ultra High Aesthetic */}
          <div className="lg:col-span-7 bg-zinc-50 rounded-3xl p-8 sm:p-12 border-2 border-black shadow-xl relative min-h-[320px] flex flex-col justify-between animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {MILESTONES[activeMilestone].badge}
                </span>
                <span className="text-2xl font-black font-mono text-black">
                  {MILESTONES[activeMilestone].year}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                {MILESTONES[activeMilestone].title}
              </h3>

              <p className="text-sm sm:text-base text-zinc-700 leading-relaxed font-sans">
                {MILESTONES[activeMilestone].desc}
              </p>
            </div>

            <div className="pt-6 border-t border-zinc-200 flex items-center justify-between text-xs font-mono text-zinc-500">
              <span>Chapter {activeMilestone + 1} of {MILESTONES.length}</span>
              <button
                type="button"
                onClick={() => setActiveMilestone((prev) => (prev + 1) % MILESTONES.length)}
                className="text-black font-bold hover:text-[#22c55e] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next Milestone</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Leadership Team ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-200">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold uppercase tracking-widest">
            LEADERSHIP
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            Built by School Friends. Driven by Conviction.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Classmates from Saraswati Vidya Mandir, uniting product architecture, tech engineering, and grassroots execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Himanshu Pal */}
          <div className="bg-white rounded-3xl p-8 border-2 border-black shadow-lg hover:shadow-2xl transition-all space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black text-white">
                Founder & CEO
              </span>
              <span className="text-xs font-mono text-zinc-400">Kasganj, UP</span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-black">Himanshu Pal</h3>
              <p className="text-xs font-mono text-[#22c55e] font-bold">Himanshu Baghel</p>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              Spearheads entire end-to-end Full Stack Software Engineering, Product Strategy, Algorithms, and Brand Growth. Committed to proving that deep-tech startups can be rooted outside Tier-1 metros.
            </p>

            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2 text-[11px] font-mono text-zinc-500">
              <span className="bg-zinc-100 px-2.5 py-1 rounded-lg">Product Architecture</span>
              <span className="bg-zinc-100 px-2.5 py-1 rounded-lg">Engineering & Growth</span>
            </div>
          </div>

          {/* Rishab Baghel */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-300 shadow-md hover:shadow-xl transition-all space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300">
                Co-Founder & Ops Lead
              </span>
              <span className="text-xs font-mono text-zinc-400">Kasganj, UP</span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-black">Rishab Baghel</h3>
              <p className="text-xs font-mono text-zinc-500 font-bold">Rishuuu</p>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              Leads ground-level Fleet Logistics, Delivery Captain Recruitment, and Laundromat Partner Hub Quality Assurance. Ensures 100% SLA turnaround and on-time doorstep collections.
            </p>

            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2 text-[11px] font-mono text-zinc-500">
              <span className="bg-zinc-100 px-2.5 py-1 rounded-lg">Fleet Operations</span>
              <span className="bg-zinc-100 px-2.5 py-1 rounded-lg">Partner Success</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom Call to Action Banner ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-zinc-950 text-white rounded-3xl p-8 sm:p-14 text-center space-y-6 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#22c55e]/15 rounded-full blur-3xl pointer-events-none" />

          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#22c55e] bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-800 inline-block">
            EXPERIENCE THE DIFFERENCE
          </span>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-2xl mx-auto">
            Ready to give up your weekend laundry chore?
          </h2>

          <p className="text-xs sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Join thousands of happy households across Kasganj, Noida, and NCR who trust QuickPress for fresh, hygienic, steam-pressed clothes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => onOpenModal("booking")}
              className="px-8 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-xl cursor-pointer"
            >
              Book Doorstep Pickup (10 Mins)
            </button>
            <button
              type="button"
              onClick={() => onNavigate("b2b-partner")}
              className="px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Partner With Us (B2B Bulk)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
