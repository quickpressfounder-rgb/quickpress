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

const IconCompass = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const IconTarget = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconEye = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconHeartHandshake = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.18 0l1.71 1.39" />
  </svg>
);

const MISSION_PILLARS = [
  {
    number: "01",
    title: "Household Freedom",
    desc: "Reclaim 32+ hours every month for Indian families and students by turning the chore of laundry into a 1-tap digital delivery habit.",
    metric: "32+ hrs reclaimed / mo",
    icon: IconClock,
  },
  {
    number: "02",
    title: "Partner Dignity",
    desc: "Empower traditional dhobis and local laundromats with Italian vacuum steam equipment, predictable volumes, and guaranteed timely payouts.",
    metric: "25,000+ Partners targeted",
    icon: IconHeartHandshake,
  },
  {
    number: "03",
    title: "Medical-Grade Hygiene",
    desc: "Set the national benchmark with 80°C anti-bacterial thermal wash, individual QR/barcoding, and an unconditional ₹5,000 garment protection guarantee.",
    metric: "₹5,000 Care Guarantee",
    icon: IconShieldCheck,
  },
  {
    number: "04",
    title: "Hyper-Local Velocity",
    desc: "Dispatch captains within 10–12 minutes and return urgent steam-pressed garments within 2 hours through algorithmic micro-clustering.",
    metric: "10m dispatch • 2h express",
    icon: IconZap,
  },
];

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
      {/* ─── Hero Section with Animated Ambient Radiant Glow ────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-16">
        {/* Animated Radial Emerald Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] sm:w-[650px] h-[360px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold tracking-widest uppercase shadow-md animate-spring-up">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping" />
            <span>FOUNDER'S STORY • BORN IN KASGANJ, SERVING BHARAT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto animate-pop-zoom">
            Born in Kasganj. <br />
            <span className="text-[#16a34a] relative inline-block">
              Built to Simplify Everyday India.
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#22c55e]/40" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 animate-spring-up font-medium">
            The untold journey of how a young student from <strong>Suraj Prasad Daga Saraswati Vidya Mandir, Kasganj</strong> observed the silent, exhausting struggle of weekend laundry and urgent pressing in Indian households — and engineered an on-demand hyper-local revolution.
          </p>

          {/* Quick Metrics Bar: Pure White Floating Cards */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-mono animate-pop-zoom">
            <div className="bg-white border-2 border-zinc-200 hover:border-[#22c55e] rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-black text-black">10-12m</span>
              <div className="text-xs text-zinc-600 leading-tight text-left">
                <span className="font-black text-black block">Captain Dispatch</span>
                Doorstep Pickup
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-300 hover:border-[#16a34a] rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-black text-[#16a34a]">2 Hrs</span>
              <div className="text-xs text-zinc-600 leading-tight text-left">
                <span className="font-black text-black block">Express Steam Press</span>
                Emergency Turnaround
              </div>
            </div>

            <div className="bg-white border-2 border-zinc-200 hover:border-[#22c55e] rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-black text-black">Kasganj</span>
              <div className="text-xs text-zinc-600 leading-tight text-left">
                <span className="font-black text-black block">Home Roots</span>
                Uttar Pradesh, India
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Founder Spotlight: Pure White Luxury Card ────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="group relative rounded-3xl bg-white text-black p-8 sm:p-14 border-2 border-emerald-300 shadow-2xl overflow-hidden hover:border-[#22c55e] hover:shadow-emerald-500/15 transition-all duration-500 animate-spring-up hover:-translate-y-1">
          {/* Subtle Radiant Emerald Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-200/50 transition-all duration-500" />

          <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Founder Bio & Vision */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
                  Founder & Chief Executive Officer
                </span>
                <span className="text-xs font-mono text-zinc-600 flex items-center gap-1.5 font-semibold">
                  <IconMapPin className="w-4 h-4 text-[#16a34a]" />
                  <span>Kasganj, Uttar Pradesh</span>
                </span>
              </div>

              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-black">
                  Himanshu Pal
                </h2>
                <p className="text-sm font-mono text-[#16a34a] font-bold mt-1.5">
                  (Widely known to friends & community as Himanshu Baghel)
                </p>
              </div>

              <blockquote className="text-base sm:text-lg text-zinc-800 italic border-l-4 border-[#22c55e] bg-emerald-50/50 p-4 rounded-r-2xl leading-relaxed font-serif">
                "We didn't build QuickPress sitting in an air-conditioned skyscraper in a metro city. We conceived it on the streets of Kasganj by listening to mothers scrubbing clothes with sore hands, students rushing for morning college, and local iron-wallahs battling erratic power cuts."
              </blockquote>

              <div className="space-y-3 text-xs sm:text-sm text-zinc-700 leading-relaxed font-sans font-medium">
                <p>
                  Educated at <strong>Suraj Prasad Daga Saraswati Vidya Mandir, Kasganj</strong>, Himanshu’s foundation was built on discipline, humility, and the Indian spirit of solving grassroots problems through self-reliance.
                </p>
                <p>
                  Coupled with his deep self-taught mastery in <strong>Full Stack Engineering</strong>, high-throughput cloud architecture, and growth operations, he wrote the very first lines of QuickPress code to prove that world-class hyper-local technology can originate right out of Kasganj.
                </p>
              </div>

              {/* Founder Badges: Pure White with Crisp Border */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <span className="px-3.5 py-2 rounded-xl bg-white border-2 border-zinc-200 text-[11px] font-mono font-bold text-black shadow-xs hover:border-[#22c55e] transition-all">
                  ⚡ Full Stack Engineer & Architect
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-white border-2 border-zinc-200 text-[11px] font-mono font-bold text-black shadow-xs hover:border-[#22c55e] transition-all">
                  🏫 Saraswati Vidya Mandir Alumnus
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-white border-2 border-zinc-200 text-[11px] font-mono font-bold text-black shadow-xs hover:border-[#22c55e] transition-all">
                  🚀 Grassroots Execution Leader
                </span>
              </div>
            </div>

            {/* Right Column: Company Trust Card: Pure White with Emerald Accents */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl bg-white border-2 border-zinc-200 p-6 sm:p-8 space-y-6 text-left relative shadow-xl hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 animate-pop-zoom">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-200">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-300 overflow-hidden flex items-center justify-center p-1.5 shadow-sm">
                    <img src={logoLight} alt="QuickPress Logo" className="w-full h-auto object-contain" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-black font-mono">QuickPress Technologies</h4>
                    <span className="text-[11px] text-zinc-600 font-mono font-semibold">Kasganj Headquarters</span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-600 font-semibold">Corporate Entity:</span>
                    <span className="font-black text-black text-right">QuickPress Tech Pvt Ltd</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-600 font-semibold">CIN:</span>
                    <span className="font-mono text-[#16a34a] font-black text-right">U96010UW2026PTC259787</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-600 font-semibold">Registered Office:</span>
                    <span className="text-black font-bold text-right max-w-[170px] truncate" title="Jail Road Nagla Baini, Kasganj, UP">
                      Jail Road, Kasganj, UP
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-600 font-semibold">Founder Desk:</span>
                    <span className="font-black text-[#16a34a]">Himanshu Pal</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-zinc-800 leading-relaxed font-sans font-medium">
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
          <span className="px-3.5 py-1 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold uppercase tracking-widest shadow-xs">
            THE SPARK • WHY QUICKPRESS EXISTS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-black tracking-tight animate-pop-zoom">
            The Unspoken Struggle in 90 Million Indian Homes
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
            In modern India, food arrives in 10 minutes and groceries in 12 minutes. Yet, why were families still spending their precious Sundays soaked in laundry tubs, and panicking over delayed iron-wallahs?
          </p>

          {/* Interactive Toggle Switch: Pure White */}
          <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white border-2 border-zinc-200 shadow-md mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("struggle")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-300 cursor-pointer ${
                activeTab === "struggle"
                  ? "bg-black text-white shadow-lg scale-105"
                  : "bg-white text-zinc-700 hover:text-black"
              }`}
            >
              The Traditional Struggle (Before)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("solution")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-black transition-all duration-300 cursor-pointer ${
                activeTab === "solution"
                  ? "bg-[#22c55e] text-black shadow-lg shadow-emerald-500/20 scale-105"
                  : "bg-white text-zinc-700 hover:text-black"
              }`}
            >
              The QuickPress Experience (Now)
            </button>
          </div>
        </div>

        {/* Dynamic Comparison Grid: Pure White Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeTab === "struggle" ? (
            <>
              <div className="bg-white border-2 border-red-300 rounded-3xl p-7 space-y-4 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 animate-slide-left">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200">
                  ❌
                </div>
                <h3 className="text-lg font-black text-black font-mono">The Weekend Laundry Trap</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                  Working parents and students lose 8–10 hours every single weekend soaking, hand-scrubbing, and drying clothes on balconies and clotheslines. Sundays ruined by endless wet laundry.
                </p>
                <div className="text-[11px] font-mono text-red-700 font-bold pt-2">
                  Average Lost Time: 32+ hours / month
                </div>
              </div>

              <div className="bg-white border-2 border-red-300 rounded-3xl p-7 space-y-4 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 animate-slide-left">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200">
                  ❌
                </div>
                <h3 className="text-lg font-black text-black font-mono">The Urgent Pressing Panic</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                  Sudden job interview tomorrow morning? Wedding reception tonight? Traditional iron-wallahs (dhobis) take 3–4 days, suffer unpredictable power cuts, coal burn stains, or simple delays.
                </p>
                <div className="text-[11px] font-mono text-red-700 font-bold pt-2">
                  Zero accountability & last-minute stress
                </div>
              </div>

              <div className="bg-white border-2 border-red-300 rounded-3xl p-7 space-y-4 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 animate-slide-left">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200">
                  ❌
                </div>
                <h3 className="text-lg font-black text-black font-mono">Lost Clothes & Zero Recourse</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                  Manual paper registers, faded chalk marks, and clothes washed in contaminated stagnant water. If an expensive shirt was damaged or lost, customers received no refund or compensation.
                </p>
                <div className="text-[11px] font-mono text-red-700 font-bold pt-2">
                  Unorganized, unhygienic & untracked
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white border-2 border-emerald-300 rounded-3xl p-7 space-y-4 hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 hover:-translate-y-1.5 animate-pop-zoom">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-black flex items-center justify-center font-bold border border-emerald-300">
                  <IconCheck className="w-6 h-6 text-[#16a34a]" />
                </div>
                <h3 className="text-lg font-black text-black font-mono">10-Min Captain Doorstep Dispatch</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                  Tap once on the QuickPress app. A verified delivery captain reaches your home within 10–12 minutes with a secure, waterproof sealable laundry bag. Zero weekend effort.
                </p>
                <div className="text-[11px] font-mono text-emerald-800 font-bold pt-2">
                  Reclaim your entire weekend for family & rest
                </div>
              </div>

              <div className="bg-white border-2 border-emerald-300 rounded-3xl p-7 space-y-4 hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 hover:-translate-y-1.5 animate-pop-zoom">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-black flex items-center justify-center font-bold border border-emerald-300">
                  <IconZap className="w-6 h-6 text-[#16a34a]" />
                </div>
                <h3 className="text-lg font-black text-black font-mono">2-Hour Express Steam Pressing</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                  Got an urgent meeting or evening event? Choose Express Delivery. Italian vacuum steam tables remove wrinkles in seconds without burning delicate fabric, delivered back in 2 hours.
                </p>
                <div className="text-[11px] font-mono text-emerald-800 font-bold pt-2">
                  Crisp, wrinkle-free clothes when you need them most
                </div>
              </div>

              <div className="bg-white border-2 border-emerald-300 rounded-3xl p-7 space-y-4 hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 hover:-translate-y-1.5 animate-pop-zoom">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-black flex items-center justify-center font-bold border border-emerald-300">
                  <IconShieldCheck className="w-6 h-6 text-[#16a34a]" />
                </div>
                <h3 className="text-lg font-black text-black font-mono">Barcode Tracking & ₹5,000 Guarantee</h3>
                <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
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

      {/* ─── Vision & Mission: Pure White with Vibrant Emerald Accents ─────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-200">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold tracking-widest uppercase shadow-xs animate-spring-up">
            <IconCompass className="w-4 h-4 text-[#16a34a]" />
            <span>THE NORTH STAR • PURPOSE & AMBITION</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-black tracking-tight animate-pop-zoom">
            Our Vision & Mission
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
            Bridging cutting-edge technology with grassroots empathy to build India's most dependable, dignified, and sustainable garment care network.
          </p>
        </div>

        {/* Vision Hero Banner: Pure White with Emerald Radial Backdrop */}
        <div className="group relative rounded-3xl bg-white text-black p-8 sm:p-12 border-2 border-emerald-300 shadow-2xl overflow-hidden hover:border-[#22c55e] hover:shadow-emerald-500/15 transition-all duration-500 mb-10 animate-spring-up hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-200/40 transition-all duration-500" />
          <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold uppercase tracking-wider">
                <IconEye className="w-4 h-4 text-[#16a34a]" />
                <span>Our Vision</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-black tracking-tight leading-snug">
                To organize India's ₹2.5 Lakh Crore garment care economy and give every home effortless 10-minute doorstep service.
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed max-w-2xl font-sans font-medium">
                We envision a Bharat where no family spends their precious weekend soaked in laundry tubs, where students and working professionals never panic over un-ironed clothes, and where local laundromat partners thrive with sustainable, tech-enabled prosperity.
              </p>
            </div>

            <div className="lg:col-span-4 grid grid-cols-1 gap-3 font-mono">
              <div className="p-4 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm hover:shadow-md hover:border-[#16a34a] hover:scale-[1.02] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-[#16a34a]">100+ Cities</div>
                <div className="text-[11px] text-zinc-600 font-semibold">Expansion Target Across Bharat</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border-2 border-zinc-200 shadow-sm hover:shadow-md hover:border-black hover:scale-[1.02] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-black">32+ Hours</div>
                <div className="text-[11px] text-zinc-600 font-semibold">Reclaimed Per Month Per Household</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm hover:shadow-md hover:border-[#16a34a] hover:scale-[1.02] transition-all">
                <div className="text-2xl sm:text-3xl font-black text-[#16a34a]">25,000+</div>
                <div className="text-[11px] text-zinc-600 font-semibold">Local Partners & Captains Empowered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission: 4 Core Pillars Grid (Pure White Cards with Pop Animation) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-black text-black flex items-center justify-center font-bold shadow-sm">
              <IconTarget className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-black font-mono">
                Our 4 Mission Pillars
              </h3>
              <p className="text-xs text-zinc-600 font-medium">Every operational line of code we write is measured against these four fundamental commitments.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MISSION_PILLARS.map((pillar) => (
              <div
                key={pillar.number}
                className="group relative bg-white border-2 border-zinc-200 hover:border-[#22c55e] rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between hover:-translate-y-2 hover:scale-[1.02] animate-pop-zoom"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
                      Pillar {pillar.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-200 flex items-center justify-center text-zinc-900 group-hover:bg-[#22c55e] group-hover:text-black group-hover:border-[#22c55e] transition-all shadow-xs">
                      <pillar.icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h4 className="text-lg font-black text-black tracking-tight">
                    {pillar.title}
                  </h4>

                  <p className="text-xs text-zinc-700 leading-relaxed font-sans font-medium">
                    {pillar.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100 text-[11px] font-mono font-bold text-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span>{pillar.metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Interactive Journey & Milestones Timeline: Pure White ─────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="px-3.5 py-1 rounded-full bg-white border-2 border-zinc-300 text-black text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
            THE CHRONOLOGY
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight animate-pop-zoom">
            From Kasganj School Bench to National Platform
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-medium">
            Click through the defining chapters of how QuickPress evolved from a student observation into India's fastest garment care network.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Milestone Selectors: Pure White Cards */}
          <div className="lg:col-span-5 space-y-3">
            {MILESTONES.map((m, idx) => (
              <button
                key={m.year}
                type="button"
                onClick={() => setActiveMilestone(idx)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                  activeMilestone === idx
                    ? "border-[#22c55e] bg-white text-black shadow-xl scale-[1.02] ring-2 ring-emerald-500/20"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:scale-[1.01]"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    activeMilestone === idx
                      ? "bg-[#22c55e] border-[#16a34a] text-black shadow-md"
                      : "bg-white border-zinc-200 text-zinc-700"
                  }`}
                >
                  <m.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#16a34a]">{m.year}</span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                      {m.badge}
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-black mt-1">{m.title}</h4>
                </div>
              </button>
            ))}
          </div>

          {/* Active Milestone Card Detail: Pure White Luxury Elevation */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-12 border-2 border-black shadow-2xl relative min-h-[320px] flex flex-col justify-between animate-pop-zoom">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
                  {MILESTONES[activeMilestone].badge}
                </span>
                <span className="text-2xl font-black font-mono text-black">
                  {MILESTONES[activeMilestone].year}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                {MILESTONES[activeMilestone].title}
              </h3>

              <p className="text-sm sm:text-base text-zinc-700 leading-relaxed font-sans font-medium">
                {MILESTONES[activeMilestone].desc}
              </p>
            </div>

            <div className="pt-6 border-t border-zinc-200 flex items-center justify-between text-xs font-mono text-zinc-600">
              <span className="font-bold">Chapter {activeMilestone + 1} of {MILESTONES.length}</span>
              <button
                type="button"
                onClick={() => setActiveMilestone((prev) => (prev + 1) % MILESTONES.length)}
                className="text-black font-black hover:text-[#16a34a] transition-colors flex items-center gap-1.5 cursor-pointer hover:scale-105"
              >
                <span>Next Milestone</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Leadership Team: Pure White Elevated Cards ─────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-200">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="px-3.5 py-1 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold uppercase tracking-widest shadow-xs">
            LEADERSHIP
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight animate-pop-zoom">
            Built by School Friends. Driven by Conviction.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-medium">
            Classmates from Saraswati Vidya Mandir, uniting product architecture, tech engineering, and grassroots execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Himanshu Pal */}
          <div className="bg-white rounded-3xl p-8 border-2 border-[#22c55e] shadow-xl hover:shadow-2xl hover:border-[#16a34a] transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] space-y-5 animate-slide-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black text-white shadow-xs">
                Founder & CEO
              </span>
              <span className="text-xs font-mono text-zinc-500 font-bold">Kasganj, UP</span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-black">Himanshu Pal</h3>
              <p className="text-xs font-mono text-[#16a34a] font-bold">Himanshu Baghel</p>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed font-sans font-medium">
              Spearheads entire end-to-end Full Stack Software Engineering, Product Strategy, Algorithms, and Brand Growth. Committed to proving that deep-tech startups can be rooted outside Tier-1 metros.
            </p>

            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2 text-[11px] font-mono font-bold text-black">
              <span className="bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-xs">Product Architecture</span>
              <span className="bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-xs">Engineering & Growth</span>
            </div>
          </div>

          {/* Rishab Baghel */}
          <div className="bg-white rounded-3xl p-8 border-2 border-zinc-300 hover:border-[#22c55e] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] space-y-5 animate-slide-right">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white text-black border-2 border-zinc-300 shadow-xs">
                Co-Founder & Ops Lead
              </span>
              <span className="text-xs font-mono text-zinc-500 font-bold">Kasganj, UP</span>
            </div>

            <div>
              <h3 className="text-2xl font-black text-black">Rishab Baghel</h3>
              <p className="text-xs font-mono text-zinc-600 font-bold">Rishuuu</p>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed font-sans font-medium">
              Leads ground-level Fleet Logistics, Delivery Captain Recruitment, and Laundromat Partner Hub Quality Assurance. Ensures 100% SLA turnaround and on-time doorstep collections.
            </p>

            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2 text-[11px] font-mono font-bold text-black">
              <span className="bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-xs">Fleet Operations</span>
              <span className="bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-xs">Partner Success</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner: Pure White Radiant Card ───────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white text-black rounded-3xl p-8 sm:p-14 text-center space-y-6 border-2 border-[#22c55e] shadow-2xl relative overflow-hidden animate-spring-up hover:shadow-emerald-500/20 transition-all duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border-2 border-emerald-300 inline-block shadow-xs">
            EXPERIENCE THE DIFFERENCE
          </span>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-black max-w-2xl mx-auto animate-pop-zoom">
            Ready to give up your weekend laundry chore?
          </h2>

          <p className="text-xs sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed font-medium">
            Join thousands of happy households across Kasganj, Noida, and NCR who trust QuickPress for fresh, hygienic, steam-pressed clothes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => onOpenModal("booking")}
              className="px-8 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-105 hover:shadow-emerald-500/30 cursor-pointer"
            >
              Book Doorstep Pickup (10 Mins)
            </button>
            <button
              type="button"
              onClick={() => onNavigate("b2b-partner")}
              className="px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 text-black border-2 border-zinc-300 hover:border-black text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 cursor-pointer"
            >
              Partner With Us (B2B Bulk)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
