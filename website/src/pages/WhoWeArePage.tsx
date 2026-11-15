import React, { useState } from "react";
import { PageType, ModalType } from "@/types";

export function WhoWeArePage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "customers" | "partners" | "captains">("all");

  const pillars = [
    {
      id: "customers",
      tag: "For Customers",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
      title: "Effortless Garment Care at Your Doorstep",
      desc: "We eliminate the weekend laundry burden for millions of Indian households. With 45-minute captain dispatch, waterproof sealed laundry bags, and medical-grade 80°C anti-bacterial hygiene, your clothes return crisply pressed, hygienic, and ready to wear.",
      highlights: [
        "10–12 Minute captain doorstep dispatch",
        "Fabric-safe Italian vacuum steam pressing (zero scorch)",
        "Individual barcode tracking & ₹5,000 Zero-Loss Guarantee",
        "Live digital weight receipt & transparent pricing from ₹9/pc",
      ],
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        </svg>
      ),
    },
    {
      id: "partners",
      tag: "For Partner Stores",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-300",
      title: "Empowering Local Dhobis into High-Growth Hubs",
      desc: "Over 96% of India's laundry shops operate informally without modern equipment or steady demand. QuickPress equips neighborhood dry cleaners with industrial Italian steam tables, eco-friendly detergents, and our merchant app, tripling their daily processing capacity.",
      highlights: [
        "Zero franchise onboarding fees for local entrepreneurs",
        "Italian vacuum steam tables installed with operational training",
        "Consistent neighborhood order routing from digital customers",
        "Weekly guaranteed bank payouts with complete ledger transparency",
      ],
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
        </svg>
      ),
    },
    {
      id: "captains",
      tag: "For Delivery Captains",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
      title: "Dignity, Security & High-Yield Logistics",
      desc: "Our delivery captains are the heartbeat of the QuickPress grid. We believe hyper-local logistics should guarantee dignity of labor, fair per-kilometer earnings, instant payouts, and comprehensive insurance coverage on every ride.",
      highlights: [
        "Instant IMPS cashout to any Indian bank account",
        "Complimentary accidental and medical health insurance",
        "Predictable short-radius batching (under 3.5 km rides)",
        "Free professional waterproof kit, bags, and Bluetooth digital scale",
      ],
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5" />
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="15" cy="5" r="1" />
          <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
        </svg>
      ),
    },
  ];

  const filteredPillars = activeTab === "all" ? pillars : pillars.filter((p) => p.id === activeTab);

  return (
    <div className="pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-24">
      {/* ─── Hero Section with Ambient Glow ───────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-14 pb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[650px] h-[340px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
            <span>WHO WE ARE • QUICKPRESS TECHNOLOGIES</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            Better Garment Care <br />
            <span className="text-[#16a34a] relative inline-block">
              For Millions of Homes.
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#22c55e]/40" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 font-medium">
            QuickPress is organizing India's ₹2.5 Lakh Crore garment care economy. Born in Kasganj, Uttar Pradesh, we build deep technology that empowers grassroots dhobis, elevates delivery captains, and brings instant, hygienic laundry care directly to your doorstep.
          </p>

          {/* Quick CTA Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs">
            <button
              type="button"
              onClick={() => onOpenModal("booking")}
              className="px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black uppercase tracking-wider transition-all duration-300 shadow-lg hover:scale-105 cursor-pointer"
            >
              Experience QuickPress
            </button>
            <button
              type="button"
              onClick={() => onNavigate("careers")}
              className="px-6 py-3.5 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black text-black font-bold uppercase tracking-wider transition-all duration-300 shadow-sm hover:scale-105 cursor-pointer"
            >
              Work With Us
            </button>
          </div>
        </div>
      </section>

      {/* ─── Key Operating Metrics (Clean Zomato-Style Grid) ──────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { metric: "10-12 Mins", label: "Average Doorstep Pickup SLA", sub: "Fastest in Uttar Pradesh" },
            { metric: "99.8%", label: "On-Time Delivery Rate", sub: "Strict SLA adherence" },
            { metric: "₹5,000", label: "Zero-Loss Guarantee", sub: "100% Barcode protection" },
            { metric: "80°C", label: "Medical-Grade Hygiene", sub: "Anti-bacterial thermal care" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all duration-300 hover:shadow-xl group"
            >
              <div className="text-3xl sm:text-5xl font-black text-black font-mono tracking-tight group-hover:text-[#16a34a] transition-colors">
                {item.metric}
              </div>
              <div className="text-xs sm:text-sm font-black text-zinc-900 mt-2">
                {item.label}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono mt-1 font-medium">
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── The 3-Way Ecosystem: Customers, Partners, Captains ───────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            How We Drive The Hyperlocal Ecosystem
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto font-medium">
            A synchronized 3-way platform connecting households, certified laundromats, and delivery captains in real time.
          </p>

          {/* Interactive Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 font-mono text-xs">
            {[
              { id: "all", label: "All Ecosystem" },
              { id: "customers", label: "For Customers" },
              { id: "partners", label: "For Store Partners" },
              { id: "captains", label: "For Delivery Captains" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl font-bold transition-all border-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#22c55e] text-black border-black shadow-md font-black"
                    : "bg-white text-zinc-700 border-zinc-200 hover:border-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredPillars.map((pillar) => (
            <div
              key={pillar.id}
              className="p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all duration-300 hover:shadow-2xl flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 text-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-xs">
                    {pillar.icon}
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border ${pillar.badgeColor}`}>
                    {pillar.tag}
                  </span>
                </div>

                <h3 className="text-xl font-black text-black tracking-tight leading-snug">
                  {pillar.title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-medium">
                  {pillar.desc}
                </p>

                {/* Highlights List */}
                <ul className="space-y-2.5 pt-2 border-t border-zinc-100">
                  {pillar.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] mt-1.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                {pillar.id === "customers" && (
                  <button
                    type="button"
                    onClick={() => onOpenModal("booking")}
                    className="w-full py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Book A Pickup
                  </button>
                )}
                {pillar.id === "partners" && (
                  <button
                    type="button"
                    onClick={() => onOpenModal("partner")}
                    className="w-full py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Apply As Partner Hub
                  </button>
                )}
                {pillar.id === "captains" && (
                  <button
                    type="button"
                    onClick={() => onOpenModal("download_app")}
                    className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Download Captain App
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Ground Roots Story & Founder Vision ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-50 border-2 border-zinc-200 hover:border-black transition-all space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#16a34a]">
              The Ground Roots Origin • Kasganj, UP
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
              "We didn't build QuickPress from an air-conditioned tower. We built it on the streets."
            </h2>
          </div>

          <div className="text-xs sm:text-sm text-zinc-700 leading-relaxed space-y-4 font-medium">
            <p>
              Growing up in Kasganj, Western Uttar Pradesh, our founder Himanshu Pal saw first-hand the daily struggle of ordinary families. Mothers spent precious Sunday mornings scrubbing collar dirt with harsh soaps; local dhobis worked 14-hour days over suffocating charcoal irons; and college students had no dependable way to get clean clothes before crucial interviews.
            </p>
            <p>
              Rather than building another app for Tier 1 metro elites, QuickPress was founded on a simple principle: <strong>True technological innovation belongs to the grassroots of Bharat.</strong> By combining modern IoT laundry equipment, mobile applications, and hyperlocal algorithmic routing, we prove that world-class software engineering can originate from any corner of India.
            </p>
          </div>

          {/* Founder Quote Card */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-base font-black text-black">Himanshu Pal &amp; Rishab Baghel</div>
              <div className="text-xs text-zinc-500 font-mono">Founding Desk • QuickPress Technologies Private Limited</div>
            </div>
            <div className="text-xs font-mono font-bold text-black px-3.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-300">
              Est. 2024 • Kasganj HQ
            </div>
          </div>
        </div>
      </section>

      {/* ─── Our Core Operating Values ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            Our Guiding Principles
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-medium">The non-negotiables that guide every product decision and customer pickup.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Grassroots Empathy",
              desc: "Solve for the daily reality of everyday families and store partners, not theoretical abstractions.",
            },
            {
              title: "Financial Precision",
              desc: "Double-entry ledger accuracy with zero rounding losses. Fair earnings for riders and transparent pricing for users.",
            },
            {
              title: "Relentless Garment Science",
              desc: "RO-water washing, Italian steam vacuum tables, and hydrocarbon dry cleaning that preserve fabric life for years.",
            },
            {
              title: "Extreme Ownership",
              desc: "Every garment handed to us represents someone's hard work, confidence, and trust. We treat it like our family's.",
            },
          ].map((val, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black transition-all hover:shadow-lg space-y-3"
            >
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-black font-mono font-black text-sm flex items-center justify-center border border-zinc-200">
                0{idx + 1}
              </div>
              <h3 className="text-lg font-black text-black tracking-tight">{val.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA Banner ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="p-8 sm:p-12 rounded-3xl bg-black text-white text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#22c55e]/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
            Ready to experience India's freshest garment care?
          </h2>

          <p className="text-xs sm:text-base text-zinc-400 max-w-xl mx-auto font-medium">
            Join thousands of happy households across Kasganj, Noida, and NCR who trust QuickPress for doorstep laundry.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onOpenModal("booking")}
              className="px-8 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-105 cursor-pointer"
            >
              Book Doorstep Pickup (10 Mins)
            </button>
            <button
              type="button"
              onClick={() => onNavigate("contact")}
              className="px-8 py-4 rounded-2xl bg-white hover:bg-zinc-100 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 cursor-pointer"
            >
              Contact Our Desk
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
