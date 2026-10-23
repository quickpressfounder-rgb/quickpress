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

const IconBike = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18.5" cy="17.5" r="3.5" />
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="15" cy="5" r="1" />
    <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
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

const IconExternalLink = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconGlobe = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconCopy = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const IconInstagram = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const IconLinkedIn = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const IconTwitter = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
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
    categoryLabel: "Customer Care & Order Desk",
    title: "Order & Garment Care Desk",
    desc: "Instant assistance with active laundry orders, pickup time rescheduling, special fabric care instructions, barcode tracking, and billing queries.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    whatsapp: "919258730561",
    email: "support@withquickpress.com",
    secondaryEmail: "official.quickpress@gmail.com",
    slaBadge: "Avg Response < 10 Mins",
    icon: (cls) => <IconPhone className={cls || "w-5 h-5"} />,
    actionType: "call",
  },
  {
    id: "b2b",
    categoryTag: "b2b",
    categoryLabel: "B2B & Institutional Accounts",
    title: "Corporate & Enterprise Care",
    desc: "Commercial garment care agreements for hotels, hospitals, student hostels, corporate offices, and uniform bulk care with formal monthly GST invoicing.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    whatsapp: "919258730561",
    email: "b2b@withquickpress.com",
    secondaryEmail: "info@withquickpress.com",
    slaBadge: "Dedicated Key Account Manager",
    icon: (cls) => <IconBuilding className={cls || "w-5 h-5"} />,
    actionType: "navigate_b2b",
  },
  {
    id: "partner",
    categoryTag: "partner",
    categoryLabel: "Partner Stores & Franchise",
    title: "Laundromat Hub & MD Desk",
    desc: "Equip your existing laundry store with Italian vacuum steam tables, connect to our hyper-local dispatch grid, or escalate directly to Managing Leadership.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    whatsapp: "919258730561",
    email: "partner@withquickpress.com",
    secondaryEmail: "official.quickpress@gmail.com",
    slaBadge: "Executive Priority Desk",
    icon: (cls) => <IconStore className={cls || "w-5 h-5"} />,
    actionType: "modal_partner",
  },
  {
    id: "fleet",
    categoryTag: "fleet",
    categoryLabel: "Delivery Captain Fleet",
    title: "Captain & Rider Logistics Hub",
    desc: "Join our hyper-local on-demand courier fleet across Kasganj, Noida, Greater Noida, and Western UP with weekly incentive bank deposits.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    whatsapp: "919258730561",
    email: "fleet@withquickpress.com",
    slaBadge: "Instant Joining Support",
    icon: (cls) => <IconBike className={cls || "w-5 h-5"} />,
    actionType: "modal_fleet",
  },
  {
    id: "legal",
    categoryTag: "legal",
    categoryLabel: "Legal, Statutory & Nodal",
    title: "Statutory Grievance & Legal Desk",
    desc: "Statutory compliance under Information Technology Act 2000 and Consumer Protection (E-Commerce) Rules 2020. Guaranteed nodal resolution.",
    phone: "+919258730561",
    phoneDisplay: "+91 9258730561",
    email: "legal@withquickpress.com",
    secondaryEmail: "grievance@withquickpress.com",
    slaBadge: "Statutory 48h Resolution",
    icon: (cls) => <IconShieldCheck className={cls || "w-5 h-5"} />,
    actionType: "email",
  },
];

const FAQS = [
  {
    q: "How fast does QuickPress dispatch a captain for pickup?",
    a: "Within all active operational zones (Kasganj, Noida, Greater Noida, Delhi NCR, Aligarh, Agra, Mathura), our average captain dispatch time is between 7 to 12 minutes upon order confirmation.",
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
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !message.trim()) {
      alert("Please fill in your Name, Phone Number, and Message.");
      return;
    }
    const ticketId = `QP-CARE-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedTicket(ticketId);
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setOrderId("");
    setMessage("");
  };

  const handleCopyAddress = () => {
    const address = "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED, C/O DHANI RAM, Jail Road Nagla Baini, Kasganj, Etah- 207123, Uttar Pradesh, India";
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  return (
    <div className="pt-24 sm:pt-28 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-20">
      {/* ─── Hero Section with Animated Ambient Emerald Radiant Glow ────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-12">
        {/* Animated Radial Emerald Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] sm:w-[650px] h-[360px] sm:h-[650px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-emerald-300 text-emerald-800 text-xs font-mono font-bold tracking-widest uppercase shadow-md animate-spring-up">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping" />
            <span>QUICKPRESS 24×7 CENTRAL DIRECT DIRECTORY & SUPPORT DESK</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tight leading-[1.08] max-w-5xl mx-auto animate-pop-zoom">
            We're Here to Help. <br />
            <span className="text-[#16a34a] relative inline-block">
              Let's Connect Directly.
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#22c55e]/40" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-700 max-w-3xl mx-auto leading-relaxed pt-2 animate-spring-up font-medium">
            Whether you need urgent order assistance, want to onboard your laundry store, require institutional corporate billing, or need statutory nodal support — connect directly with our dedicated teams.
          </p>

          {/* Quick 1-Click Action Bar: Pure White Floating Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs animate-pop-zoom">
            <a
              href="tel:+919258730561"
              className="px-5 py-3 rounded-2xl bg-white border-2 border-emerald-300 hover:border-[#16a34a] text-black hover:text-[#16a34a] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-bold cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
                <IconPhone className="w-3.5 h-3.5" />
              </div>
              <span>Helpline: +91 9258730561</span>
            </a>

            <a
              href="https://wa.me/919258730561?text=Hi%20QuickPress%20Support,%20I%20need%20assistance%20with%20my%20laundry%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 hover:border-[#22c55e] text-black hover:text-[#16a34a] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-bold cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
                <IconMessageCircle className="w-3.5 h-3.5" />
              </div>
              <span>WhatsApp: +91 9258730561</span>
            </a>

            <a
              href="mailto:official.quickpress@gmail.com"
              className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 hover:border-[#22c55e] text-black hover:text-[#16a34a] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-bold cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
                <IconMail className="w-3.5 h-3.5" />
              </div>
              <span>official.quickpress@gmail.com</span>
            </a>

            <div className="px-5 py-3 rounded-2xl bg-white border-2 border-zinc-200 text-zinc-700 shadow-md flex items-center gap-2.5 font-bold">
              <IconMapPin className="w-4 h-4 text-[#16a34a]" />
              <span>Headquarters: Kasganj, UP</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Department Directory ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
            DEPARTMENT DIRECTORY
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-black mt-2 tracking-tight">
            Direct Communication Channels
          </h2>
        </div>

        {/* Channels Grid: Pure White Elevated Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENT_CHANNELS.map((ch) => (
            <div
              key={ch.id}
              className="rounded-3xl p-7 border-2 border-zinc-200 hover:border-[#22c55e] bg-white hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between animate-pop-zoom space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16a34a] border border-emerald-300 flex items-center justify-center shadow-xs">
                    {ch.icon("w-6 h-6")}
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
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
                  {ch.phoneDisplay && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Helpline:</span>
                      <a href={`tel:${ch.phone}`} className="font-bold text-black hover:text-[#16a34a] transition-colors">
                        {ch.phoneDisplay}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Email:</span>
                    <a href={`mailto:${ch.email}`} className="font-bold text-[#16a34a] hover:underline truncate max-w-[170px]" title={ch.email}>
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
                    className="py-3 px-4 rounded-xl bg-white border-2 border-zinc-200 hover:border-[#22c55e] text-black hover:text-[#16a34a] font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-105 cursor-pointer"
                    title="Chat on WhatsApp"
                  >
                    <IconMessageCircle className="w-4 h-4 text-[#16a34a]" />
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
      <section id="inquiry-form-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Interactive Priority Support Ticket Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border-2 border-zinc-200 shadow-xl space-y-6 animate-slide-left">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-800 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full mb-3 shadow-xs">
                <IconMessageCircle className="w-3.5 h-3.5 text-[#16a34a]" />
                <span>DIRECT PRIORITY TICKET DESK</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
                Send Us a Message
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-medium">
                Our central operations team responds to priority inquiries within 10–20 minutes during service hours (7:00 AM – 10:00 PM IST).
              </p>
            </div>

            {submittedTicket ? (
              <div className="p-8 rounded-3xl bg-white border-2 border-emerald-300 text-center space-y-5 animate-pop-zoom shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#16a34a] border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-sm">
                  <IconCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-black">Inquiry Logged Successfully!</h3>
                  <p className="text-xs text-zinc-700 max-w-md mx-auto leading-relaxed mt-1 font-medium">
                    Thank you, <strong>{fullName}</strong>. Your inquiry has been routed into our central CRM with a priority tracking code:
                  </p>
                </div>

                <div className="inline-block px-6 py-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300 font-mono font-black text-base text-[#16a34a] shadow-xs">
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
                    <IconMessageCircle className="w-4 h-4" />
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                    {[
                      { id: "customer", label: "Customer Care" },
                      { id: "b2b", label: "B2B Bulk Laundry" },
                      { id: "partner", label: "Partner Store Hub" },
                      { id: "fleet", label: "Rider Fleet Desk" },
                      { id: "grievance", label: "Grievance / Legal" },
                      { id: "feedback", label: "General Feedback" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setInquiryType(item.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center border-2 cursor-pointer ${
                          inquiryType === item.id
                            ? "bg-[#22c55e] text-black border-[#16a34a] shadow-md font-black scale-102"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
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
                        className="w-full px-4 py-3 rounded-r-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-emerald-500/20 bg-white font-mono font-medium"
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-800 block mb-1">
                      Operational City / Zone *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                    >
                      <option value="Kasganj">Kasganj (Flagship Operations Hub)</option>
                      <option value="Noida">Noida (Sector 62 / Bhutani Alphathum)</option>
                      <option value="Greater Noida">Greater Noida & Gaur City</option>
                      <option value="Delhi NCR">Delhi NCR Hubs</option>
                      <option value="Aligarh">Aligarh (Civil Lines / Centre Point)</option>
                      <option value="Agra">Agra (Sanjay Place / Dayalbagh)</option>
                      <option value="Mathura">Mathura (Krishna Nagar / Highway)</option>
                      <option value="Other">Other Expansion City</option>
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-emerald-500/20 bg-white font-mono"
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-sm font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-102 hover:shadow-emerald-500/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Submit Priority Ticket</span>
                  <IconArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Registered Corporate HQ & Logistics Network */}
          <div className="lg:col-span-5 space-y-6 animate-slide-right">
            {/* Headquarters Card */}
            <div className="p-7 sm:p-8 rounded-3xl bg-white border-2 border-zinc-200 shadow-xl hover:border-emerald-300 transition-all space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-300 overflow-hidden flex items-center justify-center p-1.5 shadow-sm">
                    <img src={logoLight} alt="QuickPress Logo" className="w-full h-auto object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black font-mono">
                      QUICKPRESS TECHNOLOGIES PRIVATE LIMITED
                    </h3>
                    <span className="text-[11px] text-zinc-600 font-mono font-semibold">Kasganj Registered Headquarters</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                  Est. 2024
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-600 font-semibold">CIN:</span>
                  <span className="font-mono text-[#16a34a] font-black text-right">U96010UW2026PTC259787</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-600 font-semibold">Helpline:</span>
                  <a href="tel:+919258730561" className="font-black text-black hover:text-[#16a34a] transition-colors">
                    +91 9258730561
                  </a>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-600 font-semibold">Primary Email:</span>
                  <a href="mailto:official.quickpress@gmail.com" className="font-bold text-[#16a34a] hover:underline">
                    official.quickpress@gmail.com
                  </a>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-600 font-semibold">Support Hours:</span>
                  <span className="text-black font-medium text-right">Mon – Sat, 7 AM – 10 PM IST</span>
                </div>
              </div>

              {/* Registered Address Block with 1-Click Copy */}
              <div className="p-4 rounded-2xl bg-white border-2 border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-600 flex items-center gap-1.5">
                    <IconMapPin className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span>Registered Address</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="text-[11px] font-mono font-bold text-zinc-700 hover:text-[#16a34a] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>{copiedAddress ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed font-sans font-medium">
                  C/O DHANI RAM, Jail Road Nagla Baini, Kasganj, Etah - 207123, Uttar Pradesh, India
                </p>
              </div>

              {/* Direct Founder Desk Handles */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Founder Desk:</span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://www.instagram.com/unfiltered_himanshu_._/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black font-bold hover:text-[#e1306c] transition-colors flex items-center gap-1"
                    title="Himanshu Pal on Instagram"
                  >
                    <IconInstagram className="w-3.5 h-3.5 text-[#e1306c]" />
                    <span>Himanshu</span>
                  </a>
                  <span className="text-zinc-300">•</span>
                  <a
                    href="https://www.instagram.com/who_rishab_/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black font-bold hover:text-[#e1306c] transition-colors flex items-center gap-1"
                    title="Rishab Baghel on Instagram"
                  >
                    <IconInstagram className="w-3.5 h-3.5 text-[#e1306c]" />
                    <span>Rishab</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Statutory Compliance & Grievance Card */}
            <div className="p-7 rounded-3xl bg-white border-2 border-zinc-200 shadow-lg space-y-3 hover:border-emerald-300 transition-all">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs font-mono uppercase">
                <IconShieldCheck className="w-4 h-4 text-[#16a34a]" />
                <span>Statutory Compliance & Nodal Officer</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-sans font-medium">
                Under the Information Technology Act 2000 and Consumer Protection (E-Commerce) Rules:
              </p>
              <div className="text-xs text-zinc-800 font-mono space-y-1.5 pt-1">
                <p><strong>Legal Entity:</strong> QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</p>
                <p><strong>CIN:</strong> U96010UW2026PTC259787</p>
                <p><strong>Nodal Email:</strong> <a href="mailto:legal@withquickpress.com" className="text-[#16a34a] font-bold hover:underline">legal@withquickpress.com</a></p>
                <p><strong>Direct Helpline:</strong> <a href="tel:+919258730561" className="text-black font-bold hover:underline">+91 9258730561</a></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions (Accordion) ─────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-emerald-800 tracking-wider bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-300 shadow-xs">
            COMMON INQUIRIES
          </span>
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
                className="rounded-2xl border-2 border-zinc-200 bg-white overflow-hidden transition-all shadow-sm hover:border-[#22c55e] hover:shadow-md animate-spring-up"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm font-black text-black">{faq.q}</span>
                  <IconChevronDown
                    className={`w-4 h-4 text-black shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#16a34a]" : ""
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
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-white text-black rounded-3xl p-8 sm:p-12 text-center space-y-6 border-2 border-[#22c55e] shadow-2xl relative overflow-hidden animate-spring-up hover:shadow-emerald-500/20 transition-all duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border-2 border-emerald-300 inline-block shadow-xs">
            INSTANT ESCALATIONS
          </span>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black max-w-2xl mx-auto animate-pop-zoom">
            Need urgent assistance with an active garment order?
          </h2>

          <p className="text-xs sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed font-medium">
            Our operational dispatch hub operates continuously. Reach out right now for instantaneous pickup updates or special instructions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="tel:+919258730561"
              className="px-8 py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-xl hover:scale-105 hover:shadow-emerald-500/30 cursor-pointer flex items-center gap-2"
            >
              <IconPhone className="w-4 h-4" />
              <span>Call Helpline (+91 9258730561)</span>
            </a>
            <a
              href="https://wa.me/919258730561?text=Hi%20QuickPress%20Emergency%20Desk,%20I%20need%20urgent%20support%20with%20an%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 text-black border-2 border-zinc-300 hover:border-black text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <IconMessageCircle className="w-4 h-4 text-[#16a34a]" />
              <span>Chat On WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
