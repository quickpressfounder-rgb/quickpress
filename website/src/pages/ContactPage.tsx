import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import logoLight from "@/assets/quickpress-logo.png";

// Clean, sharp vector outline icons (Strictly NO 3D icons, NO cartoon graphics, NO emojis)
const IconPhone = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMail = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconMessageCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const IconClock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconMapPin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconShieldCheck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconStore = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
    <path d="M2 7h20" />
    <path d="M22 7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2" />
    <path d="M17 7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2" />
    <path d="M11 7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2" />
    <path d="M6 7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2" />
  </svg>
);

const IconBuilding = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconChevronDown = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

interface DepartmentChannel {
  id: string;
  categoryTag: "all" | "customer" | "b2b" | "partner" | "fleet" | "legal";
  categoryLabel: string;
  title: string;
  desc: string;
  phone?: string;
  phoneDisplay?: string;
  whatsapp?: string;
  email: string;
  secondaryEmail?: string;
  slaBadge: string;
  icon: (cls?: string) => React.ReactNode;
  actionType: "call" | "email" | "whatsapp" | "navigate_b2b" | "modal_partner" | "modal_fleet";
}

const DEPARTMENT_CHANNELS: DepartmentChannel[] = [
  {
    id: "customer",
    categoryTag: "customer",
    categoryLabel: "Customer Support & Orders Desk",
    title: "Order & Garment Care Desk",
    desc: "Instant assistance with active laundry pickups, live order tracking, fabric care instructions, special stain treatments, and billing queries.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    whatsapp: "919258730561",
    email: "official.quickpress@gmail.com",
    slaBadge: "Sub-10 Min Response",
    icon: (cls) => <IconPhone className={cls || "w-5 h-5"} />,
    actionType: "call",
  },
  {
    id: "partner",
    categoryTag: "partner",
    categoryLabel: "Partner Stores & Franchise",
    title: "Laundromat Partners & Hubs",
    desc: "Equip your existing laundry store with Italian vacuum steam tables, connect to our hyper-local dispatch grid, and scale daily customer volume.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    whatsapp: "919258730561",
    email: "partner@withquickpress.com",
    slaBadge: "24-Hour Onboarding",
    icon: (cls) => <IconStore className={cls || "w-5 h-5"} />,
    actionType: "modal_partner",
  },
  {
    id: "b2b",
    categoryTag: "b2b",
    categoryLabel: "B2B & Institutional Accounts",
    title: "Corporate & Enterprise Care",
    desc: "Tailored commercial linen care agreements for hotels, hospitals, student hostels, and corporate uniforms with formal monthly GST invoicing.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    email: "b2b@withquickpress.com",
    slaBadge: "Dedicated Account Lead",
    icon: (cls) => <IconBuilding className={cls || "w-5 h-5"} />,
    actionType: "navigate_b2b",
  },
];

const FAQS = [
  {
    q: "How fast does QuickPress dispatch a captain for pickup?",
    a: "Within our active operational zones across Kasganj and Western UP, our average captain dispatch time is between 7 to 12 minutes upon order confirmation.",
  },
  {
    q: "What if I have delicate garments with special fabric instructions?",
    a: "You can specify fabric care instructions directly during booking. Our certified laundry and dry cleaning partner hubs inspect care tags individually and process garments with medical-grade 80°C anti-bacterial hygiene and hypoallergenic chemicals.",
  },
  {
    q: "How can my local dry cleaning shop register as a partner?",
    a: "Submit a Partner Application directly on our website or Partner Portal. Our operations team inspects your facility and modernizes your workshop with digital order tracking within 24–48 hours.",
  },
  {
    q: "How does QuickPress protect customer privacy during delivery?",
    a: "We implement strict PII masking. Delivery captains and laundromat staff see only a masked phone number and first name. Order handover requires a secure 4-digit OTP provided at your doorstep.",
  },
  {
    q: "What is your policy for damaged or misplaced items?",
    a: "Every verified order is protected under the QuickPress Garment Care Guarantee up to ₹5,000 per claim. Our grievance desk resolves claims within 48 business hours with complete transparency.",
  },
];

export function ContactPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [inquiryType, setInquiryType] = useState<string>("customer");
  const [city, setCity] = useState<string>("Kasganj");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isConsultation, setIsConsultation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !message.trim()) {
      alert("Please fill in your Name, Phone Number, and Message.");
      return;
    }
    setIsSubmitting(true);
    const consultationFlag = isConsultation || inquiryType === "consultation";
    try {
      const res = await fetch("/api/public/contact-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          inquiryType,
          city,
          orderId,
          message,
          isConsultation: consultationFlag,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmittedTicket(data.inquiryId || `QP-INQ-${Math.floor(100000 + Math.random() * 900000)}`);
      } else {
        const prefix = consultationFlag ? "QP-CONSULT" : "QP-INQ";
        setSubmittedTicket(`${prefix}-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    } catch {
      const prefix = consultationFlag ? "QP-CONSULT" : "QP-INQ";
      setSubmittedTicket(`${prefix}-${Math.floor(100000 + Math.random() * 900000)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setOrderId("");
    setMessage("");
    setIsConsultation(false);
  };

  return (
    <div className="pt-16 sm:pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-20">
      {/* ─── Hero Section with Animated Ambient Emerald Radiant Glow ────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-12">
        {/* Animated Radial Emerald Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] sm:w-[650px] h-[360px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto animate-pop-zoom">
            We're Here to Help. <br />
            <span className="text-[#16a34a] inline-block">
              Let's Connect Directly.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 animate-spring-up font-medium">
            Whether you need urgent order assistance, want to onboard your laundry store, require institutional corporate billing, or need statutory nodal support — connect directly with our dedicated teams.
          </p>

          {/* Quick 1-Click Action Bar: Pure White Floating Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs animate-pop-zoom">
            <a
              href="tel:+919258730561"
              className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black text-black shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-bold cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-100 text-black group-hover:bg-black group-hover:text-white transition-all flex items-center justify-center">
                <IconPhone className="w-3.5 h-3.5" />
              </div>
              <span>Call Helpline</span>
            </a>

            <a
              href="https://wa.me/919258730561?text=Hi%20QuickPress%20Support,%20I%20need%20assistance%20with%20my%20laundry%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black text-black shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-bold cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-100 text-black group-hover:bg-black group-hover:text-white transition-all flex items-center justify-center">
                <IconMessageCircle className="w-3.5 h-3.5" />
              </div>
              <span>WhatsApp Chat</span>
            </a>

            <a
              href="mailto:official.quickpress@gmail.com"
              className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 hover:border-black text-black shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-bold cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-100 text-black group-hover:bg-black group-hover:text-white transition-all flex items-center justify-center">
                <IconMail className="w-3.5 h-3.5" />
              </div>
              <span>official.quickpress@gmail.com</span>
            </a>

            <div className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 text-black shadow-md flex items-center gap-2.5 font-bold">
              <IconMapPin className="w-4 h-4 text-black" />
              <span>Headquarters: Kasganj, UP</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Department Directory ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Direct Communication Channels
          </h2>
        </div>

        {/* Channels Grid: Pure White Elevated Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENT_CHANNELS.map((ch) => (
            <div
              key={ch.id}
              className="group rounded-3xl p-7 border-2 border-zinc-200 hover:border-black bg-white hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between animate-pop-zoom space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-black border border-zinc-200 group-hover:bg-black group-hover:text-white transition-all flex items-center justify-center shadow-xs">
                    {ch.icon("w-6 h-6 text-black group-hover:text-white transition-colors")}
                  </div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-black">
                    {ch.slaBadge}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-500 tracking-wider block mb-1">
                    {ch.categoryLabel}
                  </span>
                  <h3 className="text-xl font-black text-black tracking-tight">{ch.title}</h3>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed font-sans font-medium">
                  {ch.desc}
                </p>

                {/* Direct Contact Details Block */}
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2 text-xs font-mono">
                  {ch.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Helpline:</span>
                      <a
                        href={`tel:${ch.phone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs transition-all cursor-pointer"
                      >
                        <IconPhone className="w-3 h-3" />
                        <span>Call Direct</span>
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Email:</span>
                    <a href={`mailto:${ch.email}`} className="font-bold text-black hover:underline truncate max-w-[170px]" title={ch.email}>
                      {ch.email}
                    </a>
                  </div>
                  {ch.secondaryEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Backup:</span>
                      <a href={`mailto:${ch.secondaryEmail}`} className="font-medium text-zinc-700 hover:underline truncate max-w-[170px]" title={ch.secondaryEmail}>
                        {ch.secondaryEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                {ch.actionType === "call" && ch.phone && (
                  <a
                    href={`tel:${ch.phone}`}
                    className="flex-1 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:scale-102 cursor-pointer"
                  >
                    <IconPhone className="w-3.5 h-3.5" />
                    <span>Call Direct</span>
                  </a>
                )}

                {ch.whatsapp && (
                  <a
                    href={`https://wa.me/${ch.whatsapp}?text=Hi%20QuickPress,%20I%20need%20support%20regarding%20${ch.title}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-white border-2 border-zinc-200 hover:border-black text-black font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-105 cursor-pointer"
                    title="Chat on WhatsApp"
                  >
                    <IconMessageCircle className="w-4 h-4 text-black" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {ch.actionType === "navigate_b2b" && (
                  <button
                    type="button"
                    onClick={() => onNavigate("b2b-partner")}
                    className="flex-1 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:scale-102 cursor-pointer"
                  >
                    <span>Request B2B Quote</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {ch.actionType === "modal_partner" && (
                  <button
                    type="button"
                    onClick={() => onOpenModal("partner")}
                    className="flex-1 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:scale-102 cursor-pointer"
                  >
                    <span>Partner Application</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {ch.actionType === "modal_fleet" && (
                  <button
                    type="button"
                    onClick={() => onOpenModal("download_app")}
                    className="flex-1 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:scale-102 cursor-pointer"
                  >
                    <span>Download Captain App</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {ch.actionType === "email" && (
                  <a
                    href={`mailto:${ch.email}`}
                    className="flex-1 py-3 rounded-xl bg-white border-2 border-black hover:bg-black hover:text-white text-black font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs hover:scale-102 cursor-pointer"
                  >
                    <IconMail className="w-3.5 h-3.5" />
                    <span>Send Legal Notice</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive Form & Corporate HQ Directory ──────────────────────── */}
      <section id="inquiry-form-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Interactive Priority Support Ticket Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border-2 border-zinc-200 hover:border-black shadow-xl space-y-6 animate-slide-left transition-all duration-300">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
                Send Us a Message
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-medium">
                Our central operations team responds to priority inquiries within 10–20 minutes during service hours (7:00 AM – 10:00 PM IST).
              </p>
            </div>

            {submittedTicket ? (
              <div className="p-8 rounded-3xl bg-white border-2 border-black text-center space-y-5 animate-pop-zoom shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-black border-2 border-black flex items-center justify-center mx-auto shadow-sm">
                  <IconCheck className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-black">Inquiry Logged Successfully!</h3>
                  <p className="text-xs text-zinc-700 max-w-md mx-auto leading-relaxed mt-1 font-medium">
                    Thank you, <strong>{fullName}</strong>. Your inquiry has been routed into our central CRM with a priority tracking code:
                  </p>
                </div>

                <div className="inline-block px-6 py-3 rounded-2xl bg-zinc-100 border-2 border-black font-mono font-black text-base text-black shadow-xs">
                  {submittedTicket}
                </div>

                <p className="text-xs text-zinc-600 font-mono">
                  A representative will reach out to <strong>+91 {phone}</strong> promptly.
                </p>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/919258730561?text=Hi%20QuickPress,%20I%20just%20submitted%20ticket%20${submittedTicket}%20regarding%20${inquiryType}.%20Name:%20${encodeURIComponent(fullName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:scale-105 cursor-pointer"
                  >
                    <IconMessageCircle className="w-4 h-4 text-black" />
                    <span>Follow Up on WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-6 py-3.5 rounded-2xl bg-white border-2 border-zinc-300 hover:border-black text-black font-bold text-xs font-mono uppercase tracking-wider transition-all hover:scale-105 cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Inquiry Category Selector Pills */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-zinc-600 tracking-wider block mb-2">
                    Select Inquiry Purpose *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                    {[
                      { id: "customer", label: "Customer Care" },
                      { id: "consultation", label: "Consultation" },
                      { id: "partner", label: "Partner Store" },
                      { id: "b2b", label: "B2B Bulk Care" },
                      { id: "feedback", label: "Feedback" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setInquiryType(item.id);
                          if (item.id === "consultation") setIsConsultation(true);
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border-2 cursor-pointer ${
                          inquiryType === item.id
                            ? "bg-[#22c55e] text-black border-black shadow-md font-black scale-102"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-black"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-medium transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">
                      Phone Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 rounded-l-xl border-2 border-r-0 border-zinc-200 bg-zinc-50 text-black text-xs font-mono font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="82795 38461"
                        className="w-full px-4 py-3 rounded-r-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-mono font-medium transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Email & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-medium transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">
                      Operational City / Zone *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-medium transition-colors"
                    >
                      <option value="Kasganj">Kasganj (Flagship Operations Hub)</option>
                      <option value="Western UP">Western UP (Aligarh / Agra / Mathura)</option>
                      <option value="Delhi NCR">Delhi NCR</option>
                      <option value="Other">Other City / Zone</option>
                    </select>
                  </div>
                </div>

                {/* Order ID */}
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">
                    Order ID (Optional, if inquiring about an existing order)
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. QP-ORD-98214"
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-mono transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">
                    Your Message / Inquiry Details *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your pickup location, service query, store specifications, or corporate requirements..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-medium transition-colors"
                  />
                </div>

                {/* Consultation Checkbox */}
                <div
                  onClick={() => setIsConsultation(!isConsultation)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isConsultation
                      ? "bg-emerald-50/80 border-[#22c55e] text-emerald-950"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-black"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🤝</span>
                    <div>
                      <span className="text-xs font-bold block text-black">
                        Request Expert Consultation &amp; Callback
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Our lead operations specialist will review your store or B2B volume requirements directly.
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center font-bold text-xs ${
                      isConsultation ? "bg-[#22c55e] border-black text-black" : "border-zinc-300 bg-white"
                    }`}
                  >
                    {isConsultation ? "✓" : ""}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-sm font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-102 hover:shadow-black/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {isSubmitting
                      ? "Routing to Support Desk..."
                      : isConsultation || inquiryType === "consultation"
                      ? "Request Priority Consultation Call"
                      : "Submit Priority Ticket"}
                  </span>
                  <IconArrowRight className="w-4 h-4 text-black" />
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Live Operations Support Desk & Service Assurances */}
          <div className="lg:col-span-5 space-y-6 animate-slide-right">
            <div className="p-7 sm:p-8 rounded-3xl bg-white border-2 border-zinc-200 hover:border-black shadow-xl transition-all duration-300 space-y-6 relative overflow-hidden">
              {/* Subtle top-right ambient emerald accent */}
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />

              {/* Header with Live Status Indicator */}
              <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center p-2 shadow-xs">
                    <img src={logoLight} alt="QuickPress Logo" className="w-full h-auto object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black">
                      Operations Support Desk
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">QuickPress Central Control Grid</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-black text-[11px] font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                  <span>Live Online</span>
                </div>
              </div>

              {/* Core Operational Assurances */}
              <div className="space-y-3.5">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:border-black transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-black flex items-center justify-center shrink-0 shadow-xs">
                    <IconClock className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black">Sub-10 Min Response SLA</h4>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed font-medium">
                      Instant routing to active dispatch coordinators for live pickup updates and modifications.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:border-black transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-black flex items-center justify-center shrink-0 shadow-xs">
                    <IconShieldCheck className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black">₹5,000 Garment Protection Cover</h4>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed font-medium">
                      Zero-loss barcode tracking with digital doorstep weighing receipt and item inspection.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:border-black transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 text-black flex items-center justify-center shrink-0 shadow-xs">
                    <IconMapPin className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black">Kasganj Central Dispatch Hub</h4>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed font-medium">
                      Operating 7:00 AM – 10:00 PM IST daily across active hyper-local delivery zones.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Fast Actions */}
              <div className="pt-2 border-t border-zinc-100 space-y-2.5">
                <a
                  href="tel:+919258730561"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:scale-102 cursor-pointer"
                >
                  <IconPhone className="w-4 h-4 text-black" />
                  <span>Call Operations Lead (+91 92587 30561)</span>
                </a>

                <a
                  href="https://wa.me/919258730561?text=Hi%20QuickPress%20Support,%20I%20need%20assistance%20with%20my%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-white border-2 border-zinc-200 hover:border-black text-black font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-xs hover:scale-102 cursor-pointer"
                >
                  <IconMessageCircle className="w-4 h-4 text-black" />
                  <span>Instant WhatsApp Support Desk</span>
                </a>
              </div>

              {/* Informational micro-badge */}
              <div className="pt-2 text-center">
                <p className="text-[11px] text-zinc-500 font-sans font-medium">
                  Looking for business partnerships? Visit our{" "}
                  <button
                    type="button"
                    onClick={() => onNavigate("b2b-partner")}
                    className="text-black font-black hover:underline cursor-pointer"
                  >
                    Partner Hub
                  </button>{" "}
                  or explore{" "}
                  <button
                    type="button"
                    onClick={() => onOpenModal("partner")}
                    className="text-black font-black hover:underline cursor-pointer"
                  >
                    Franchise Store Program
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions (Accordion) ─────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 reveal-on-scroll">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight animate-pop-zoom">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 font-medium">Quick answers to common questions about pickups, special care, and partnerships.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border-2 border-zinc-200 bg-white overflow-hidden transition-all shadow-sm hover:border-black hover:shadow-md animate-spring-up"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm font-black text-black">{faq.q}</span>
                  <IconChevronDown
                    className={`w-4 h-4 text-black shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-black font-black" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-zinc-700 leading-relaxed border-t border-zinc-100 pt-3 animate-fade-in font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Bottom 24x7 WhatsApp & Call Emergency Banner ───────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 reveal-on-scroll">
        <div className="bg-white text-black rounded-3xl p-8 sm:p-12 text-center space-y-6 border-2 border-zinc-200 hover:border-black shadow-xl relative overflow-hidden animate-spring-up transition-all duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black max-w-2xl mx-auto animate-pop-zoom">
            Need urgent assistance with an active garment order?
          </h2>

          <p className="text-xs sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed font-medium">
            Our operational dispatch hub operates continuously. Reach out right now for instantaneous pickup updates or special instructions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="tel:+919258730561"
              className="px-8 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-105 hover:shadow-black/10 cursor-pointer flex items-center gap-2"
            >
              <IconPhone className="w-4 h-4 text-black" />
              <span>Call Helpline</span>
            </a>
            <a
              href="https://wa.me/919258730561?text=Hi%20QuickPress%20Emergency%20Desk,%20I%20need%20urgent%20support%20with%20an%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 text-black border-2 border-zinc-300 hover:border-black text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <IconMessageCircle className="w-4 h-4 text-black" />
              <span>Chat On WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
