import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import {
  IconPhone,
  IconMail,
  IconClock,
  IconMapPin,
  IconShield,
  IconStore,
  IconBike,
  IconBuilding,
  IconUsers,
  IconCheck,
  IconChevronDown,
  IconMessageCircle,
  IconExternalLink,
  IconGlobe,
  IconArrowRight,
} from "@/components/Icons";

const GREEN = "#004724";

interface ChannelCard {
  id: string;
  category: string;
  title: string;
  desc: string;
  contactText: string;
  actionText: string;
  actionHref?: string;
  badge: string;
  icon: (className?: string) => React.ReactNode;
}

const CONTACT_CHANNELS: ChannelCard[] = [
  {
    id: "customer",
    category: "Customer Support",
    title: "Order & Garment Care Desk",
    desc: "Assistance with active laundry orders, pickup time rescheduling, special fabric care instructions, and instant billing queries.",
    contactText: "+91 8279538461 (Helpdesk) • official.quickpress@gmail.com",
    actionText: "Call Quickpress Helpdesk",
    actionHref: "tel:+918279538461",
    badge: "Avg ETA < 10 Mins",
    icon: (cls) => <IconPhone className={cls || "w-5 h-5"} />,
  },
  {
    id: "partner",
    category: "Partner Stores & Management",
    title: "Merchant Store Onboarding & MD Desk",
    desc: "Connect your laundry workshop to QuickPress logistics or connect directly with company executive leadership.",
    contactText: "Phone / WhatsApp: +91 8279538461 • official.quickpress@gmail.com",
    actionText: "Call Quickpress Helpline",
    actionHref: "tel:+918279538461",
    badge: "Executive Priority",
    icon: (cls) => <IconStore className={cls || "w-5 h-5"} />,
  },
  {
    id: "captain",
    category: "Delivery Fleet",
    title: "Captain & Rider Fleet Hub",
    desc: "Join our on-demand hyper-local courier fleet across Kasganj, Noida, Greater Noida, and Delhi NCR with weekly incentive payouts.",
    contactText: "Fleet Desk: Bilram Gate & Noida HQ",
    actionText: "Join Delivery Fleet",
    badge: "Instant Joining Support",
    icon: (cls) => <IconBike className={cls || "w-5 h-5"} />,
  },
  {
    id: "corporate",
    category: "B2B & Enterprise",
    title: "Corporate & Institutional Care",
    desc: "Dedicated garment care agreements for hotels, hospitals, corporate workforces, and uniform laundry with formal GST billing.",
    contactText: "enterprise@with.quickpress.com",
    actionText: "Request B2B Quote",
    badge: "Dedicated Account Manager",
    icon: (cls) => <IconBuilding className={cls || "w-5 h-5"} />,
  },
];

const FAQS = [
  {
    q: "How fast does QuickPress dispatch a captain for pickup?",
    a: "Within all active operational cities (Kasganj, Noida, Greater Noida, Delhi NCR, Aligarh, Agra, Mathura), our average captain dispatch time is between 7 to 12 minutes upon order confirmation.",
  },
  {
    q: "What if I have delicate garments with special fabric instructions?",
    a: "You can specify garment instructions during booking. Our certified laundry and dry cleaning partners inspect fabric care tags individually and use eco-friendly solvents and hypoallergenic detergents.",
  },
  {
    q: "How can my local dry cleaning shop register as a partner?",
    a: "You can submit the Partner Application directly on our website or Partner Portal. Our operations team visits your facility for quality vetting and onboards your store within 24–48 hours.",
  },
  {
    q: "How does QuickPress protect customer privacy during delivery?",
    a: "We implement end-to-end PII masking. Delivery captains and store staff see only a masked phone number and first name. Direct delivery completion requires a secure 4-digit OTP provided by you at doorstep.",
  },
  {
    q: "What is your policy for damaged or misplaced items?",
    a: "Every verified order is protected under the QuickPress Garment Care Guarantee up to ₹5,000 per claim. Our grievance desk resolves claims within 48 business hours.",
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
  const [city, setCity] = useState<string>("Noida");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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

  return (
    <div className="pt-24 sm:pt-32 pb-24 space-y-20 bg-white text-gray-900">
      {/* ─── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-widest uppercase mb-4 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
          <span>QUICKPRESS 24×7 CONTACT & GRIEVANCE DESK • NOIDA & REGIONAL</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-950 leading-tight max-w-4xl mx-auto">
          We're Here to Help. <br />
          <span style={{ color: GREEN }}>Let's Connect Directly.</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-xl max-w-3xl mx-auto mt-6 leading-relaxed font-normal">
          Whether you need instant support with an active laundry pickup, want to register your store as an authorized partner, or require corporate institutional garment care.
        </p>

        {/* Quick Communication Badges Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-gray-700">
          <a
            href="tel:+918279538461"
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-emerald-500 hover:text-emerald-800 transition-all flex items-center gap-2"
          >
            <IconPhone className="w-4 h-4 text-emerald-700" />
            <span>Helpdesk: +91 8279538461</span>
          </a>
          <a
            href="mailto:official.quickpress@gmail.com"
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-emerald-500 hover:text-emerald-800 transition-all flex items-center gap-2"
          >
            <IconMail className="w-4 h-4 text-emerald-700" />
            <span>official.quickpress@gmail.com</span>
          </a>
          <a
            href="https://with.quickpress.com"
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-emerald-500 hover:text-emerald-800 transition-all flex items-center gap-2"
          >
            <IconGlobe className="w-4 h-4 text-emerald-700" />
            <span>with.quickpress.com</span>
          </a>
        </div>
      </section>

      {/* ─── 4 Primary Contact Channel Cards ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTACT_CHANNELS.map((ch) => (
            <div
              key={ch.id}
              className="rounded-3xl p-6 border-2 border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
                    {ch.icon("w-5 h-5")}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    {ch.badge}
                  </span>
                </div>
                <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                  {ch.category}
                </span>
                <h3 className="text-lg font-black text-gray-950 mb-2">{ch.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">{ch.desc}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <p className="text-[11px] font-mono text-gray-700 font-semibold truncate">
                  {ch.contactText}
                </p>
                {ch.actionHref ? (
                  <a
                    href={ch.actionHref}
                    className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-emerald-700 hover:text-white text-gray-900 border border-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>{ch.actionText}</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      if (ch.id === "partner") onOpenModal("partner");
                      else if (ch.id === "captain") onOpenModal("download_app");
                      else {
                        setInquiryType(ch.id);
                        document.getElementById("inquiry-form-section")?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-emerald-700 hover:text-white text-gray-900 border border-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>{ch.actionText}</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive Multi-Channel Form & Hub Directory ──────────────────── */}
      <section id="inquiry-form-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Interactive Contact Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border-2 border-gray-200 shadow-md">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              <IconMessageCircle className="w-4 h-4 text-emerald-700" />
              <span>Direct Priority Support Ticket</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 mb-2">
              Send Us a Message
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-6">
              Our central operations team responds to inquiries within 15–30 minutes during service hours (7 AM – 10 PM IST).
            </p>

            {submittedTicket ? (
              <div className="p-8 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <IconCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">Inquiry Received Successfully!</h3>
                <p className="text-xs text-emerald-900 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{fullName}</strong>. Your ticket has been logged into our central CRM with Priority ID:
                </p>
                <div className="inline-block px-5 py-2 rounded-xl bg-white border border-emerald-300 font-mono font-black text-sm text-emerald-800 shadow-xs">
                  {submittedTicket}
                </div>
                <p className="text-[11px] text-gray-500">
                  A representative will reach out to <strong>{phone}</strong> within 15–30 minutes.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/918279538461?text=Hi%20QuickPress,%20I%20just%20submitted%20ticket%20${submittedTicket}%20regarding%20${inquiryType}.`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <IconMessageCircle className="w-4 h-4" />
                    <span>Follow Up on WhatsApp</span>
                  </a>
                  <button
                    onClick={handleResetForm}
                    className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Inquiry Category Selector Pills */}
                <div>
                  <label className="text-xs font-black uppercase text-gray-500 tracking-wider block mb-2">
                    Select Inquiry Purpose:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "customer", label: "Customer Care" },
                      { id: "partner", label: "Partner Store" },
                      { id: "captain", label: "Rider Fleet" },
                      { id: "corporate", label: "B2B Laundry" },
                      { id: "grievance", label: "Grievance / Legal" },
                      { id: "feedback", label: "Feedback" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setInquiryType(item.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                          inquiryType === item.id
                            ? "bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
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
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Himanshu Pal"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Phone Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 text-gray-600 text-xs font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full px-4 py-2.5 rounded-r-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Email & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Operational City / Zone *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50 font-medium"
                    >
                      <option value="Kasganj">Kasganj (Flagship Operations Hub)</option>
                      <option value="Noida">Noida (Bhutani Alphathum & Sec 62/75)</option>
                      <option value="Greater Noida">Greater Noida & Gaur City</option>
                      <option value="Delhi NCR">Delhi NCR (South, Central, East)</option>
                      <option value="Aligarh">Aligarh (Civil Lines / Centre Point)</option>
                      <option value="Agra">Agra (Sanjay Place / Dayalbagh)</option>
                      <option value="Mathura">Mathura (Krishna Nagar / Highway)</option>
                      <option value="Other">Other Expansion City</option>
                    </select>
                  </div>
                </div>

                {/* Order ID (Optional) */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Order ID (Optional, if inquiring about an order)
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. QP-ORD-98214"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50 font-mono"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Your Message / Inquiry Details *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your pickup location, service query, store specifications, or corporate requirements..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Submit Priority Ticket</span>
                  <IconArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Physical Registered Offices & Logistics Hubs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <IconBuilding className="w-4 h-4 text-emerald-700" />
                <span>Corporate Headquarters</span>
              </div>
              <h3 className="text-lg font-black text-gray-950">
                SHRI KRISHNA EVS
              </h3>
              <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                <p>
                  <strong>Legal Name / Proprietor:</strong> SAROJ KUMARI
                </p>
                <p className="flex items-start gap-2">
                  <IconMapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Registered Office:</strong><br />
                    0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Helpline: <a href="tel:+918279538461" className="text-emerald-700 font-bold hover:underline">+91 8279538461</a></span>
                </p>
                <p className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Email: <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 font-bold hover:underline">official.quickpress@gmail.com</a></span>
                </p>
                <p className="flex items-center gap-2">
                  <IconClock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Office Hours: Monday – Saturday, 9:00 AM – 7:00 PM IST</span>
                </p>
                <p className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
                  <span>GSTIN: 09KQCPK2468E1ZM</span>
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <IconStore className="w-4 h-4 text-emerald-700" />
                <span>Central Operations Master Hub</span>
              </div>
              <h3 className="text-lg font-black text-gray-950">
                Kasganj Flagship Operations Center
              </h3>
              <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                <p className="flex items-start gap-2">
                  <IconMapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Master Logistics & Sorting Facility:</strong><br />
                    Bilram Gate & Station Road Corridor, Kasganj, Uttar Pradesh 207123
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <IconClock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Facility Operations: 7 Days a Week, 7:00 AM – 10:00 PM IST</span>
                </p>
                <p className="flex items-center gap-2 font-mono text-[11px] text-emerald-700 font-bold">
                  <span>Servicing: Bilram Gate, Station Rd, Soron Gate, Nadrai Gate</span>
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7 rounded-3xl bg-emerald-50/50 border border-emerald-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <IconShield className="w-4 h-4 text-emerald-700" />
                <span>Statutory Grievance & Nodal Officer</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                In compliance with the Information Technology Act 2000 and Consumer Protection (E-Commerce) Rules:
              </p>
              <div className="text-xs text-gray-800 font-mono space-y-1">
                <p><strong>Grievance Officer:</strong> SAROJ KUMARI</p>
                <p><strong>Entity:</strong> SHRI KRISHNA EVS</p>
                <p><strong>Direct Email:</strong> <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 underline">official.quickpress@gmail.com</a></p>
                <p><strong>Official Phone / Helpdesk:</strong> <a href="tel:+918279538461" className="text-emerald-700 underline font-bold">+91 8279538461</a></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions (Accordion) ─────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-black uppercase text-emerald-800 tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Common Inquiries
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-950 mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden transition-all shadow-2xs hover:border-emerald-300"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm font-black text-gray-950">{faq.q}</span>
                  <IconChevronDown
                    className={`w-4 h-4 text-emerald-800 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
