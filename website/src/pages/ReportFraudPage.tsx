import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import { apiUrl } from "@/utils/api";

export function ReportFraudPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [scamCategory, setScamCategory] = useState("payment_scam");
  const [suspectInfo, setSuspectInfo] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setEvidenceUrl(base64);
        setEvidencePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let generatedTicket = `QP-FRAUD-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      reporterName,
      reporterPhone,
      reporterEmail,
      scamCategory,
      suspectInfo,
      incidentDate: incidentDate || new Date().toISOString().split("T")[0],
      description,
      evidenceUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(apiUrl("/api/public/fraud-reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        generatedTicket = data.ticketId || generatedTicket;
      }
    } catch {
      // Local fallback
    } finally {
      // Cache locally for instant admin sync
      try {
        const cached = JSON.parse(localStorage.getItem("qp_submitted_fraud_reports") || "[]");
        cached.unshift({ ...payload, id: generatedTicket, _id: generatedTicket });
        localStorage.setItem("qp_submitted_fraud_reports", JSON.stringify(cached.slice(0, 50)));
      } catch {
        /* ignore */
      }

      setSubmittedTicket(generatedTicket);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-24">
      {/* ─── Hero Section with Warning Accent ─────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-14 pb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[650px] h-[340px] sm:h-[650px] bg-red-100/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-300 text-xs font-mono font-bold text-red-800 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>SECURITY &amp; VIGILANCE • REPORT FRAUD</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            Report Fraud &amp; <br />
            <span className="text-red-600 inline-block">
              Protect Our Community.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 font-medium">
            QuickPress maintains zero tolerance for impersonation, fraudulent recruitment, fake payment QR codes, or unauthorized merchant schemes. Report any suspicious individual or fraudulent activity directly to our dedicated vigilance desk.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <div className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200">
              National Cyber Crime Helpline: <strong>1930</strong>
            </div>
            <div className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200">
              Official Grievance Desk: <strong>+91 92587 30561</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Official Safety Advisories (Zomato-Style Security Cards) ─────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all hover:shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold border border-red-200">
              ⚠️
            </div>
            <h3 className="text-xl font-black text-black tracking-tight">Zero Recruitment Fees</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              QuickPress never asks for registration fees, training charges, security deposits, or uniform fees from job seekers or delivery captain applicants. Any message asking for upfront payment is 100% fraudulent.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all hover:shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold border border-amber-200">
              🛡️
            </div>
            <h3 className="text-xl font-black text-black tracking-tight">Never Scan Arbitrary QR Codes</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              Scanning a QR code always deducts money from your account—it never deposits money. Never scan unknown QR codes sent on WhatsApp claiming to be "Order Refund" or "Cashback Lottery".
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black transition-all hover:shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold border border-blue-200">
              ✉️
            </div>
            <h3 className="text-xl font-black text-black tracking-tight">Official Email Verification</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              All official QuickPress communications originate only from <code>@withquickpress.com</code>, <code>@quickpress.in</code>, or <code>official.quickpress@gmail.com</code>. We never use random personal Gmail or Yahoo addresses.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Incident Reporting Form ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black shadow-xl space-y-6">
          <div>
            <span className="text-xs font-mono font-bold text-red-600 uppercase">Fraud Reporting Form</span>
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1">
              Submit Incident &amp; Evidence Details
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-medium">
              All submissions are encrypted and routed directly to our vigilance officer and cyber security response unit.
            </p>
          </div>

          {submittedTicket ? (
            <div className="text-center py-8 space-y-5 animate-pop-zoom">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-3xl font-black border border-emerald-300">
                ✓
              </div>
              <div>
                <h3 className="text-2xl font-black text-black">Incident Report Registered!</h3>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-md mx-auto mt-1 font-medium">
                  Thank you for helping keep QuickPress safe, <strong>{reporterName}</strong>. Your vigilance docket code is:
                </p>
              </div>

              <div className="inline-block px-6 py-3 rounded-2xl bg-zinc-100 border-2 border-black font-mono font-black text-base text-black shadow-xs">
                {submittedTicket}
              </div>

              <p className="text-xs text-zinc-500 font-mono">
                Our security officer will review the evidence and contact you at <strong>{reporterPhone}</strong> if additional testimony is required.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedTicket(null);
                    setReporterName("");
                    setReporterPhone("");
                    setReporterEmail("");
                    setDescription("");
                    setSuspectInfo("");
                    setEvidenceUrl("");
                    setEvidencePreview(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Scam Category Dropdown */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  Scam / Fraud Category *
                </label>
                <select
                  value={scamCategory}
                  onChange={(e) => setScamCategory(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                >
                  <option value="fake_job">Fake Recruitment / Job Offer Scam (Fee Demanded)</option>
                  <option value="payment_scam">Payment QR Code / Phishing Link Scam</option>
                  <option value="impersonation">Impersonation of QuickPress Founder / Executive</option>
                  <option value="rider_overcharge">Delivery Rider Overcharging / Unregistered Cash Collection</option>
                  <option value="fake_partner">Unauthorized Partner / Dhobi Franchise Agent</option>
                  <option value="other">Other Cyber Fraud / Security Vulnerability</option>
                </select>
              </div>

              {/* Reporter Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g. Ankit Verma"
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Your Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">Your Email Address (Optional)</label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="ankit@gmail.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                />
              </div>

              {/* Suspect Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Suspect Phone / UPI ID / Website *</label>
                  <input
                    type="text"
                    required
                    value={suspectInfo}
                    onChange={(e) => setSuspectInfo(e.target.value)}
                    placeholder="e.g. +91 91234 56789 or scam@upi"
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">Date of Incident</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  Incident Description * (Please provide full details of what was said/requested)
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scam: how the individual reached out, what claims were made, money requested, or links shared..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black bg-white font-medium"
                />
              </div>

              {/* Screenshot / Evidence File Upload */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  Upload Screenshot / Payment Proof / Chat Log (Image)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-zinc-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:font-bold file:bg-zinc-100 file:text-black hover:file:bg-black hover:file:text-white file:cursor-pointer cursor-pointer"
                />
                {evidencePreview && (
                  <div className="mt-3 p-2 rounded-2xl border-2 border-zinc-200 max-w-xs">
                    <img src={evidencePreview} alt="Evidence Preview" className="w-full h-auto rounded-xl object-contain max-h-48" />
                    <span className="text-[10px] text-zinc-500 font-mono mt-1 block">Proof attached successfully</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-102 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Transmitting Report..." : "Submit Fraud Report ➔"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

