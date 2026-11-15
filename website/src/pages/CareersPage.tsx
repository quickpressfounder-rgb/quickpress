import React, { useState, useEffect } from "react";
import { PageType, ModalType } from "@/types";
import { apiUrl } from "@/utils/api";

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

const ROLES: OpenRole[] = [];

export function CareersPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [roles, setRoles] = useState<OpenRole[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [applyingRole, setApplyingRole] = useState<OpenRole | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [applicantNote, setApplicantNote] = useState("");
  const [isConsultation, setIsConsultation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [applicationTicket, setApplicationTicket] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const res = await fetch(apiUrl("/api/public/careers/jobs"));
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setRoles(data);
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  const departments = ["All", "Engineering", "Operations", "Growth", "Quality & Care"];

  const filteredRoles = (roles || []).filter(
    (r) => selectedDept === "All" || (r?.department || "").toLowerCase() === selectedDept.toLowerCase()
  );

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingRole) return;
    setIsSubmitting(true);
    const payload = {
      applicantName,
      applicantPhone,
      applicantEmail,
      roleId: applyingRole.id,
      roleTitle: applyingRole.title,
      experience: applyingRole.experience,
      portfolioLink,
      resumeUrl,
      applicantNote,
      isConsultation,
      createdAt: new Date().toISOString(),
      status: "received",
    };

    let generatedTicket = `QP-APP-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const res = await fetch(apiUrl("/api/public/careers/apply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        generatedTicket = data.applicationId || generatedTicket;
      }
    } catch {
      // Offline fallback
    } finally {
      // Cache locally so admin panel on same browser/device or sync sees it immediately
      try {
        const cached = JSON.parse(localStorage.getItem("qp_submitted_job_applications") || "[]");
        cached.unshift({ ...payload, id: generatedTicket, _id: generatedTicket });
        localStorage.setItem("qp_submitted_job_applications", JSON.stringify(cached.slice(0, 50)));
      } catch {
        /* ignore localStorage quota */
      }

      setApplicationTicket(generatedTicket);
      setApplicationSuccess(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-20">
      {/* ─── Hero Section with Ambient Glow ───────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-14 pb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[650px] h-[340px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
            <span>WORK WITH US • CAREERS AT QUICKPRESS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            Build the Operating System <br />
            <span className="text-[#16a34a] inline-block">
              For India's Garment Logistics.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-zinc-700 max-w-2xl mx-auto leading-relaxed pt-1 font-medium">
            We are solving hard grassroots engineering and real-world physical operations in Bharat. Join our team to make a daily difference for thousands of local dhobis, riders, and families.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs">
            <a
              href="#openings"
              className="px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black uppercase tracking-wider transition-all duration-300 shadow-lg hover:scale-105 cursor-pointer"
            >
              View Open Roles ({filteredRoles.length})
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
          {filteredRoles.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-50 border-2 border-zinc-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-xl font-bold">
                💼
              </div>
              <h3 className="text-xl font-black text-black">No Open Positions Currently Posted</h3>
              <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed font-medium">
                We are actively looking for exceptional talent in engineering, logistics, and store growth. Submit your profile below and we will reach out as roles open up.
              </p>
              <button
                type="button"
                onClick={() => {
                  setApplyingRole({
                    id: "general-app",
                    title: "General Profile / Future Opportunities",
                    department: "Operations",
                    location: "India / Remote",
                    type: "Full-Time",
                    experience: "Open",
                    desc: "General application for upcoming engineering, store operations, or logistics roles.",
                    responsibilities: [],
                  });
                  setApplicationSuccess(false);
                  setApplicationTicket(null);
                }}
                className="px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md hover:scale-105 cursor-pointer inline-block"
              >
                Submit General Application ➔
              </button>
            </div>
          ) : (
            filteredRoles.map((role: any) => (
              <div
                key={role.id || role._id || role.title}
                className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-zinc-100 text-black font-mono font-bold text-[11px] border border-zinc-200">
                      {role.department || "Operations"}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-600 inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>{role.location || "Kasganj / Noida / Remote"}</span>
                    </span>
                    <span className="text-[11px] font-mono text-zinc-600 inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>{role.type || "Full-Time"}</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#16a34a] inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-[#16a34a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      <span>{role.experience || "Freshers / Experienced"}</span>
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-black tracking-tight group-hover:text-[#16a34a] transition-colors">
                    {role.title}
                  </h3>

                  <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                    {role.desc || ""}
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setApplyingRole(role);
                      setApplicationSuccess(false);
                      setApplicationTicket(null);
                    }}
                    className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md hover:scale-105 cursor-pointer"
                  >
                    Apply For Role ➔
                  </button>
                </div>
              </div>
            ))
          )}
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
                <span className="text-xs text-zinc-500 font-mono inline-flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{applyingRole.location}</span>
                </span>
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
                {applicationTicket && (
                  <div className="inline-block px-4 py-2 rounded-xl bg-zinc-100 border border-zinc-300 font-mono font-bold text-xs text-black">
                    Application Docket: {applicationTicket}
                  </div>
                )}
                <p className="text-xs text-zinc-600 leading-relaxed max-w-md mx-auto font-medium">
                  Thank you, <strong>{applicantName}</strong>. Our engineering and operations hiring desk has received your profile and will reach out to <strong>{applicantPhone}</strong> within 48 business hours.
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

                {/* Consultation Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 rounded-xl border border-zinc-200 hover:border-black bg-zinc-50 transition-all">
                  <input
                    type="checkbox"
                    checked={isConsultation}
                    onChange={(e) => setIsConsultation(e.target.checked)}
                    className="size-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-400 accent-[#1A7A3C]"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Request Pre-Interview Consultation &amp; Culture Chat
                  </span>
                </label>

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
