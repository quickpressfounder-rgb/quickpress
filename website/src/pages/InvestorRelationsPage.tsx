import React, { useState } from "react";
import { apiUrl } from "@/utils/api";
import { PageType, ModalType } from "@/types";

export function InvestorRelationsPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [investorName, setInvestorName] = useState("");
  const [investorFirm, setInvestorFirm] = useState("");
  const [investorEmail, setInvestorEmail] = useState("");
  const [investorPhone, setInvestorPhone] = useState("");
  const [inquiryType, setInquiryType] = useState("data_room");
  const [message, setMessage] = useState("");
  const [isConsultation, setIsConsultation] = useState(true);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      fetch(apiUrl("/api/public/contact-inquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${investorName} (${investorFirm})`,
          phone: investorPhone,
          email: investorEmail,
          inquiryType: "investor",
          city: "Institutional Desk",
          details: `Inquiry: ${inquiryType} | Firm: ${investorFirm}`,
          message: message || `Investor inquiry for ${inquiryType}`,
          isConsultation,
        }),
      }).catch(() => {});
    } catch {
      // Ignored
    }
    setRequestSubmitted(true);
  };

  return (
    <div className="pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-24">
      {/* ─── Hero Section with Ambient Glow ───────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-14 pb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[650px] h-[340px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
            <span>INVESTOR RELATIONS • QUICKPRESS TECHNOLOGIES</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            Building Sustainable <br />
            <span className="text-[#16a34a] inline-block">
              Hyperlocal Unit Economics.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 font-medium">
            QuickPress is organizing India's fragmented garment care economy through an asset-light, contribution-margin-positive network. By retrofitting existing neighborhood laundromats with high-efficiency IoT steam equipment, we combine deep tech scalability with robust cashflow fundamentals.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs">
            <a
              href="#meeting-form"
              className="px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black uppercase tracking-wider transition-all duration-300 shadow-lg hover:scale-105 cursor-pointer"
            >
              Request Investor Briefing
            </a>
            <button
              type="button"
              onClick={() => onNavigate("who-we-are")}
              className="px-6 py-3.5 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black text-black font-bold uppercase tracking-wider transition-all duration-300 shadow-sm hover:scale-105 cursor-pointer"
            >
              Platform Overview
            </button>
          </div>
        </div>
      </section>

      {/* ─── Corporate Snapshot & Statutory Profile ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="p-8 sm:p-10 rounded-3xl bg-zinc-50 border-2 border-zinc-200 hover:border-black transition-all space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-xs font-mono font-bold text-[#16a34a] uppercase">Statutory Entity Profile</span>
              <h2 className="text-xl sm:text-2xl font-black text-black">QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</h2>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              Incorporated under Companies Act, 2013 (Govt. of India)
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block mb-1">Corporate Identity (CIN):</span>
              <span className="font-black text-black text-sm">U74999UP2024PTC198141</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-1">Year of Incorporation:</span>
              <span className="font-black text-black text-sm">2024</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-1">Registered Headquarters:</span>
              <span className="font-black text-black text-sm">Kasganj, Uttar Pradesh, India</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-1">Primary Industry:</span>
              <span className="font-black text-black text-sm">On-Demand Garment Care & Logistics</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Business Model & Unit Economics Highlights ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            Asset-Light Architecture &amp; Unit Economics
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl mx-auto font-medium">
            How our 3-way marketplace generates sustainable margins without capital-heavy physical facility expenditures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Zero Store CapEx Model",
              desc: "Rather than building expensive centralized mega-factories, QuickPress retrofits existing neighborhood dry cleaners with Italian vacuum steam equipment. Store onboarding costs are recouped within months.",
              stat: "90% Lower CapEx",
              statLabel: "vs Centralized Laundry Plants",
            },
            {
              title: "High-Frequency Repeat Customer Base",
              desc: "Household laundry is an essential daily utility, not a discretionary luxury. Our customers average 3.8 to 4.2 bookings per month with industry-leading organic retention across active operational clusters.",
              stat: "4.2x / Month",
              statLabel: "Average Customer Repeat Frequency",
            },
            {
              title: "Contribution Margin 2 Positive",
              desc: "Short-radius batching (under 3.5 km delivery radius) and optimized rider routes produce strong positive contribution margins on every delivered bag, maintaining fair captain payouts.",
              stat: "CM2 Positive",
              statLabel: "From Day 1 of Cluster Maturity",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all hover:shadow-xl space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="text-2xl sm:text-3xl font-black text-black font-mono tracking-tight text-[#16a34a]">
                  {item.stat}
                </div>
                <div className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                  {item.statLabel}
                </div>
                <h3 className="text-xl font-black text-black tracking-tight pt-1">{item.title}</h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Governance, Secretarial & Shareholder Desk ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all space-y-6">
          <h2 className="text-2xl font-black text-black tracking-tight">Corporate Governance &amp; Shareholder Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-700 font-mono">
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
              <span className="font-bold text-black uppercase block">Registrar &amp; Secretarial Desk</span>
              <p className="text-zinc-600 font-sans">
                For statutory investor disclosures, board filings, share capital certificates, and institutional inquiries:
              </p>
              <div className="pt-1">
                <strong>Email:</strong>{" "}
                <a href="mailto:official.quickpress@gmail.com" className="text-black font-black hover:underline">
                  official.quickpress@gmail.com
                </a>
              </div>
              <div>
                <strong>Direct Desk:</strong> +91 92587 30561
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
              <span className="font-bold text-black uppercase block">Auditors &amp; Tax Compliance</span>
              <p className="text-zinc-600 font-sans">
                Statutory annual accounts, double-entry financial reconciliation, and GST compliance are conducted in accordance with ICAI standards.
              </p>
              <div className="pt-1">
                <strong>Jurisdiction:</strong> Registrar of Companies, Kanpur (Uttar Pradesh)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Request Investor Briefing / Data Room Form ─────────────────────── */}
      <section id="meeting-form" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black shadow-xl space-y-6">
          <div>
            <span className="text-xs font-mono font-bold text-[#16a34a] uppercase">Institutional Investor Desk</span>
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1">
              Schedule Management Briefing / Data Room Access
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-medium">
              Venture funds, angel networks, and family offices can submit credentials below to receive our investor deck and schedule a briefing with the founding team.
            </p>
          </div>

          {requestSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/20 text-black flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-2xl font-black text-black">Briefing Request Logged</h3>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-md mx-auto font-medium">
                Thank you, <strong>{investorName}</strong> ({investorFirm}). Our founding desk will verify institutional credentials and email the QuickPress Data Room access to <strong>{investorEmail}</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                    placeholder="e.g. Priya Nair"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Investment Firm / Family Office *</label>
                  <input
                    type="text"
                    required
                    value={investorFirm}
                    onChange={(e) => setInvestorFirm(e.target.value)}
                    placeholder="e.g. Bharat Ventures"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={investorEmail}
                    onChange={(e) => setInvestorEmail(e.target.value)}
                    placeholder="priya@bharatvc.com"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Direct Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={investorPhone}
                    onChange={(e) => setInvestorPhone(e.target.value)}
                    placeholder="+91 98111 22334"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">Inquiry Purpose *</label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                >
                  <option value="data_room">Request Confidential Data Room Access</option>
                  <option value="call">Schedule 30-Min Management Video Call</option>
                  <option value="site_visit">Kasganj Logistics Hub In-Person Site Visit</option>
                  <option value="general">General Investor Query</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">Brief Note / Fund Thesis (Optional)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share a brief note about your fund focus or areas of interest..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                />
              </div>

              {/* Consultation / Executive Briefing Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none bg-emerald-50/80 hover:bg-emerald-50 p-3.5 rounded-xl border border-emerald-300 transition-all">
                <input
                  type="checkbox"
                  checked={isConsultation}
                  onChange={(e) => setIsConsultation(e.target.checked)}
                  className="mt-0.5 size-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-400 accent-[#1A7A3C]"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    🤝 Request 1-on-1 Founder &amp; Executive Briefing Consultation
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Schedule a direct video call with our Founders to review unit economics, technology stack, and capital allocation roadmap.
                  </p>
                </div>
              </label>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-102"
              >
                Submit Institutional Request ➔
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

