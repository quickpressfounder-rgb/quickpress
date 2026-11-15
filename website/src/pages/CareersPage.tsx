import React, { useState } from "react";
import { PageType, ModalType } from "@/types";

interface OpenRole {
  id: string;
  title: string;
  department: "Engineering" | "Operations" | "Growth" | "Quality & Care";
  location: string;
  type: string;
  experience: string;
  desc: string;
  responsibilities: string[];
}

const ROLES: OpenRole[] = [
  {
    id: "eng-fullstack",
    title: "Senior Full-Stack Engineer (React 19 + Python 3.12)",
    department: "Engineering",
    location: "Remote / Hybrid (Kasganj / Noida)",
    type: "Full-Time",
    experience: "3–6 Years",
    desc: "Architect low-latency dispatch APIs, double-entry ledger settlement pipelines, and real-time WebSocket order tracking across our 3-app ecosystem.",
    responsibilities: [
      "Own core FastAPI microservices and Supabase PostgreSQL schema optimization",
      "Scale our React 19 + TanStack Router client applications for sub-second hydration",
      "Integrate hardware IoT Bluetooth weighing scales with captain mobile apps",
    ],
  },
  {
    id: "eng-mobile",
    title: "Lead Mobile Architect (Android / iOS / Capacitor)",
    department: "Engineering",
    location: "Remote / Hybrid",
    type: "Full-Time",
    experience: "4+ Years",
    desc: "Lead mobile development for the QuickPress Captain, Partner Store, and Customer applications with offline-first synchronization.",
    responsibilities: [
      "Design native background geo-fencing, turn-by-turn routing, and battery optimization",
      "Implement real-time push notification audio alarms for urgent order pickups",
      "Optimize APK size and memory footprints for low-spec Android devices in Tier 2/3 cities",
    ],
  },
  {
    id: "ops-hub-manager",
    title: "Central Logistics Hub Manager",
    department: "Operations",
    location: "Kasganj, Uttar Pradesh (On-Site)",
    type: "Full-Time",
    experience: "2–5 Years",
    desc: "Oversee daily laundry order throughput, captain dispatch queues, and strict garment care turnaround SLAs across our flagship Western UP hub.",
    responsibilities: [
      "Manage physical intake, digital weighing, and barcode tracking of thousands of daily garments",
      "Coordinate with local laundromat partners to ensure 80°C anti-bacterial hygiene protocols",
      "Maintain a 99.8% on-time dispatch and delivery SLA record",
    ],
  },
  {
    id: "growth-partner-onboarding",
    title: "Merchant Hub Growth Lead (Franchise Onboarding)",
    department: "Growth",
    location: "Western UP (Aligarh / Agra / Kasganj)",
    type: "Full-Time",
    experience: "2–4 Years",
    desc: "Onboard neighborhood dry cleaners and dhobis onto the QuickPress network, modernizing traditional workshops with Italian steam table setups.",
    responsibilities: [
      "Identify high-density laundry zones and build trust with local laundry shop owners",
      "Conduct store audits, equipment inspections, and digital POS app onboarding",
      "Drive partner retention, weekly earnings transparency, and volume scaling",
    ],
  },
  {
    id: "quality-garment-specialist",
    title: "Master Textile & Stain Restoration Specialist",
    department: "Quality & Care",
    location: "Kasganj Hub (On-Site)",
    type: "Full-Time",
    experience: "3+ Years",
    desc: "Champion fabric safety, delicate silk care, sneaker spa restoration, and hydrocarbon dry cleaning standards across our partner network.",
    responsibilities: [
      "Inspect care labels for delicate textiles (chiffon, cashmere, pure silks, wedding lehengas)",
      "Train partner staff on German enzymatic stain removals and solvent temperature control",
      "Resolve customer fabric grievances under our ₹5,000 Zero-Loss Guarantee",
    ],
  },
];

export function CareersPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [applyingRole, setApplyingRole] = useState<OpenRole | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [applicantNote, setApplicantNote] = useState("");
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  const departments = ["All", "Engineering", "Operations", "Growth", "Quality & Care"];

  const filteredRoles = ROLES.filter(
    (r) => selectedDept === "All" || r.department.toLowerCase() === selectedDept.toLowerCase()
  );

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationSuccess(true);
  };

  return (
    <div className="pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-24">
      {/* ─── Hero Section with Ambient Glow ───────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-14 pb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[650px] h-[340px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
            <span>WORK WITH US • CAREERS AT QUICKPRESS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            Build the Operating System <br />
            <span className="text-[#16a34a] relative inline-block">
              For India's Garment Logistics.
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#22c55e]/40" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 font-medium">
            We are solving hard grassroots engineering and real-world physical operations in Bharat. If you thrive on extreme ownership, zero bureaucracy, and making a daily difference for thousands of dhobis, riders, and families, join our team.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs">
            <a
              href="#openings"
              className="px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black uppercase tracking-wider transition-all duration-300 shadow-lg hover:scale-105 cursor-pointer"
            >
              View Open Roles ({ROLES.length})
            </a>
            <button
              type="button"
              onClick={() => onNavigate("who-we-are")}
              className="px-6 py-3.5 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black text-black font-bold uppercase tracking-wider transition-all duration-300 shadow-sm hover:scale-105 cursor-pointer"
            >
              Read Our Origin Story
            </button>
          </div>
        </div>
      </section>

      {/* ─── Culture & What Makes QuickPress Different ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            Why Work at QuickPress?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-medium">High agency, deep empathy, and the thrill of building real technology for the real world.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Grassroots Real Impact",
              desc: "Your code and operational decisions directly improve the livelihood of traditional iron-wallahs, local store owners, and delivery captains every single day.",
              badge: "PURPOSE DRIVEN",
            },
            {
              title: "Extreme Ownership & Speed",
              desc: "No multi-layered corporate politics. We ship to production multiple times a day, test on real devices on the streets of Kasganj, and iterate rapidly.",
              badge: "HIGH VELOCITY",
            },
            {
              title: "Competitive Pay & Equity",
              desc: "Top of market compensation, generous ESOP grants, comprehensive family health coverage, and complimentary doorstep laundry credits.",
              badge: "WEALTH CREATION",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all hover:shadow-xl space-y-4"
            >
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#16a34a] block">
                {item.badge}
              </span>
              <h3 className="text-xl font-black text-black tracking-tight">{item.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Open Positions Directory ─────────────────────────────────────── */}
      <section id="openings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
              Open Positions ({filteredRoles.length})
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">Find your next mission across engineering, logistics, and store growth.</p>
          </div>

          {/* Department Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all border-2 cursor-pointer ${
                  selectedDept.toLowerCase() === dept.toLowerCase()
                    ? "bg-[#22c55e] text-black border-black shadow-md font-black"
                    : "bg-white text-zinc-700 border-zinc-200 hover:border-black"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Roles List */}
        <div className="space-y-4">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-zinc-100 text-black font-mono font-bold text-[11px] border border-zinc-200">
                    {role.department}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    📍 {role.location}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    ⏱️ {role.type}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#16a34a]">
                    💼 {role.experience}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-black tracking-tight group-hover:text-[#16a34a] transition-colors">
                  {role.title}
                </h3>

                <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                  {role.desc}
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setApplyingRole(role);
                    setApplicationSuccess(false);
                  }}
                  className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md hover:scale-105 cursor-pointer"
                >
                  Apply For Role ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Application Modal ────────────────────────────────────────────── */}
      {applyingRole && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border-2 border-black shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#16a34a] uppercase">Job Application</span>
                <h3 className="text-xl font-black text-black">{applyingRole.title}</h3>
                <span className="text-xs text-zinc-500 font-mono">📍 {applyingRole.location}</span>
              </div>
              <button
                type="button"
                onClick={() => setApplyingRole(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-black hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {applicationSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/20 text-black flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-2xl font-black text-black">Application Received!</h4>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-md mx-auto font-medium">
                  Thank you, <strong>{applicantName}</strong>. Our engineering and operations hiring desk will review your profile and reach out to <strong>{applicantPhone}</strong> within 48 business hours.
                </p>
                <button
                  type="button"
                  onClick={() => setApplyingRole(null)}
                  className="px-6 py-3 rounded-xl bg-black text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g. Vikas Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="vikas@gmail.com"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Resume / CV Link (Google Drive / Notion / Dropbox) *</label>
                  <input
                    type="url"
                    required
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">GitHub / LinkedIn / Portfolio URL (Optional)</label>
                  <input
                    type="url"
                    value={portfolioLink}
                    onChange={(e) => setPortfolioLink(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Why QuickPress? (Short note)</label>
                  <textarea
                    rows={3}
                    value={applicantNote}
                    onChange={(e) => setApplicantNote(e.target.value)}
                    placeholder="What excites you about solving garment care logistics in Bharat?"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-102"
                >
                  Submit Application
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
