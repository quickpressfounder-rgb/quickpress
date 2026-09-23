import React, { useState } from "react";
import { PageType, ModalType, PartnerCaseStudy } from "@/types";
import {
  IconCheck,
  IconHandshake,
  IconShield,
  IconBolt,
  IconAward,
  IconArrowRight,
  IconStar,
  IconBriefcase,
  IconCpu,
  IconVan,
  IconSparkle,
} from "@/components/Icons";

const GREEN = "#1A7A3C";
const YELLOW = "#F59E0B";

const PARTNER_CATEGORIES = [
  {
    id: "store",
    badge: "Laundry & Dry Cleaners",
    title: "Store & Laundromat Partners",
    tagline: "Boost your store's daily revenue with automated digital pickups",
    commission: "Zero Upfront Fees",
    areaRequired: "Any Existing Store",
    payoutCycle: "Instant / Daily Bank Payouts",
    monthlyRevenue: "₹1,50,000 – ₹3,50,000+ / mo",
    description:
      "Connect your existing dry cleaner, laundry shop, or ironing facility to QuickPress. Receive scheduled customer orders directly on the Partner App without marketing spend.",
    inclusions: [
      "Guaranteed neighborhood order flow from the QuickPress Customer App",
      "Free QuickPress Partner Merchant App & Cloud POS Billing",
      "Doorstep pickup & drop handled entirely by QuickPress Captains",
      "Automated garment tagging, digital receipts & customer notifications",
      "Premium eco-packaging support & detergent bulk supply discounts",
      "Dedicated partner relationship manager & 24/7 partner helpline",
    ],
    accentColor: GREEN,
    bgHeader: "bg-emerald-900",
  },
  {
    id: "fleet",
    badge: "Delivery Captains & Fleet",
    title: "Rider & Fleet Logistics Partners",
    tagline: "Drive, deliver and earn with smart batch-routed pickups",
    commission: "High Per-Trip Earnings + Bonuses",
    areaRequired: "2-Wheeler / Electric Bike",
    payoutCycle: "Weekly Guaranteed Payouts",
    monthlyRevenue: "₹35,000 – ₹65,000+ / mo",
    description:
      "Join the QuickPress Captain Fleet. Pick up garments from customer doorsteps and transfer to verified hubs with live GPS navigation and optimized return routes.",
    inclusions: [
      "Intelligent cluster route batching — zero wasted travel distance",
      "Flexible working slots (Morning, Evening, or Full-Day)",
      "Daily trip incentives, peak-hour bonuses & milestone rewards",
      "Free QuickPress delivery bag, safety jacket & mobile holster",
      "Accidental insurance coverage & cashless medical support",
      "Real-time instant wallet payouts with bank transfer support",
    ],
    accentColor: "#D97706",
    bgHeader: "bg-[#78350F]",
  },
];

const CASE_STUDIES: PartnerCaseStudy[] = [
  {
    name: "Apex Eco Laundromat (Noida Hub)",
    business: "Commercial Laundry & Dry Cleaner",
    location: "Sector 76, Noida",
    category: "Store Partner",
    growth: "+185% Monthly Orders",
    monthlyRevenue: "₹3,40,000 / mo",
    quote:
      "Partnering with QuickPress solved our customer acquisition completely. The app routes orders directly to our store every single morning without any local ad spend.",
    duration: "Partner since 2024",
  },
  {
    name: "Express Delivery Fleet Partner",
    business: "Independent 2-Wheeler & Logistics",
    location: "Sector 62 & 75, Noida",
    category: "Fleet Logistics Partner",
    growth: "+140% Driver Utilization",
    monthlyRevenue: "₹1,85,000 / mo",
    quote:
      "QuickPress route batching software eliminated empty return trips for our riders. Our delivery team completes 40+ scheduled pickups daily with consistent weekly payouts.",
    duration: "Partner since 2025",
  },
  {
    name: "Classic Steam Press & Dry Cleaners",
    business: "Neighborhood Garment Care Store",
    location: "Sector 50, Noida",
    category: "Store Partner",
    growth: "+210% New Monthly Customers",
    monthlyRevenue: "₹2,20,000 / mo",
    quote:
      "The QuickPress Partner App is extremely easy to use. Clothes get picked up by captains on time and our machine capacity is now 100% utilized.",
    duration: "Partner since 2024",
  },
];

export function PartnersPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<"store" | "fleet">("store");
  const selectedModel = PARTNER_CATEGORIES.find((m) => m.id === selectedPartnerId) || PARTNER_CATEGORIES[0];

  // Partner Earnings Calculator State (in ₹)
  const [partnerType, setPartnerType] = useState<"laundromat" | "courier" | "specialist">("laundromat");
  const [dailyOrders, setDailyOrders] = useState(30);

  const avgOrderValue = partnerType === "laundromat" ? 280 : partnerType === "courier" ? 120 : 450;
  const grossMonthly = Math.round(dailyOrders * avgOrderValue * 26 * 0.85).toLocaleString("en-IN");

  return (
    <div className="pt-24 sm:pt-32 pb-24 space-y-24 bg-white">
      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-200">
          QuickPress Partner Network
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-950 leading-tight max-w-4xl mx-auto">
          Grow your laundry or delivery business <br />
          <span style={{ color: GREEN }}>with automated digital demand.</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-xl max-w-3xl mx-auto mt-6 leading-relaxed">
          Partner with India's fastest-growing on-demand laundry and express delivery ecosystem. Join as a <strong>Store Partner</strong> or <strong>Delivery Captain</strong> with zero upfront listing fees.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button
            onClick={() => onOpenModal("partner")}
            className="px-8 py-4 rounded-full font-black text-white text-sm shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
            style={{ background: GREEN }}
          >
            <IconHandshake className="w-4 h-4" />
            <span>Join as QuickPress Partner →</span>
          </button>
          <a
            href="#partner-categories"
            className="px-7 py-4 rounded-full font-bold text-gray-800 text-sm bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
          >
            Explore Partner Programs
          </a>
        </div>
      </section>

      {/* ─── Partner Categories Showcase ────────────────────────────────────── */}
      <section id="partner-categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Partnership Programs
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            Choose How You Want to Grow
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-2">
            Whether you own a neighborhood laundry store or a fleet of delivery riders, QuickPress powers your scale.
          </p>

          {/* Model Switcher Tabs */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => setSelectedPartnerId("store")}
              className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                selectedPartnerId === "store"
                  ? "bg-emerald-800 text-white shadow-lg scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <IconSparkle className="w-4 h-4 text-yellow-400" />
              <span>Laundromat & Store Partner</span>
            </button>
            <button
              onClick={() => setSelectedPartnerId("fleet")}
              className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                selectedPartnerId === "fleet"
                  ? "bg-amber-700 text-white shadow-lg scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <IconVan className="w-4 h-4 text-yellow-300" />
              <span>Rider & Fleet Logistics Partner</span>
            </button>
          </div>
        </div>

        {/* Selected Model Detailed View */}
        <div className="bg-white rounded-3xl border-2 border-gray-200/90 shadow-2xl overflow-hidden animate-fade-in">
          {/* Header Banner */}
          <div className="p-8 sm:p-12 text-gray-950 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider">
                {selectedModel.badge}
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-gray-950">{selectedModel.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl leading-relaxed">
                {selectedModel.description}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center shrink-0 min-w-[220px] shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Upfront Joining Cost
              </span>
              <span className="text-3xl sm:text-4xl font-black text-emerald-800 block mt-0.5">
                {selectedModel.commission}
              </span>
              <span className="text-[11px] text-gray-500 font-semibold block mt-1">
                Payout: {selectedModel.payoutCycle}
              </span>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
            <div className="bg-white p-6 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Eligibility</span>
              <span className="text-lg font-black text-gray-900 block mt-1">{selectedModel.areaRequired}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Quick 24h verification</span>
            </div>
            <div className="bg-white p-6 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Estimated Revenue</span>
              <span className="text-lg font-black text-emerald-700 block mt-1">{selectedModel.monthlyRevenue}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Direct app order volume</span>
            </div>
            <div className="bg-white p-6 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Settlement Cycle</span>
              <span className="text-lg font-black text-yellow-600 block mt-1">{selectedModel.payoutCycle}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Direct to your bank account</span>
            </div>
            <div className="bg-white p-6 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Logistics Support</span>
              <span className="text-lg font-black text-gray-900 block mt-1">100% Doorstep Fleet</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Handled by QuickPress Captains</span>
            </div>
          </div>

          {/* Inclusions & Support Grid */}
          <div className="p-8 sm:p-12">
            <div className="max-w-3xl mx-auto space-y-4">
              <h4 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                What QuickPress Provides to You
              </h4>
              <p className="text-xs text-gray-500">
                Full technological, operational, and customer service support from Day 1:
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 pt-2">
                {selectedModel.inclusions.map((inc) => (
                  <li key={inc} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>

              {/* Action Callout */}
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black text-emerald-950 block">
                    Ready to grow with QuickPress?
                  </span>
                  <span className="text-[11px] text-emerald-700 block">
                    Onboard in under 24 hours with dedicated assistance.
                  </span>
                </div>
                <button
                  onClick={() => onOpenModal("partner")}
                  className="w-full sm:w-auto px-6 py-3 rounded-full font-black text-white text-xs shadow-md hover:scale-105 transition-all cursor-pointer shrink-0"
                  style={{ background: GREEN }}
                >
                  Join as Partner Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6-Step Franchise Launch Roadmap ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Onboarding Journey
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            How You Launch Your QuickPress Franchise
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-2">
            From initial application to grand opening in 21 to 30 days.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Application & Territory Review",
              desc: "Submit your preferred city/pincode. Our team conducts demographic and demand feasibility analysis within 48 hours.",
              icon: IconBriefcase,
            },
            {
              step: "02",
              title: "Agreement & Pincode Lock",
              desc: "Sign the franchise agreement and secure exclusive territorial rights to protect your neighborhood customer base.",
              icon: IconShield,
            },
            {
              step: "03",
              title: "Store Setup & Machine Delivery",
              desc: "QuickPress engineering team oversees interior fit-out, machine installation, plumbing, electricals, and branding.",
              icon: IconCpu,
            },
            {
              step: "04",
              title: "Staff Training & Chemical SOPs",
              desc: "Comprehensive 14-day training covering fabric chemistry, delicate pressing, POS software, and customer service.",
              icon: IconAward,
            },
            {
              step: "05",
              title: "App Integration & Route Sync",
              desc: "Your hub is connected to the QuickPress cloud engine, enabling automated dispatch routing and driver fleet sync.",
              icon: IconVan,
            },
            {
              step: "06",
              title: "Grand Launch & App Order Blitz",
              desc: "Official store opening backed by localized digital ads, neighborhood flyer drops, and guaranteed Day 1 app orders.",
              icon: IconSparkle,
            },
          ].map((road) => (
            <div
              key={road.step}
              className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-xs hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <road.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  STEP {road.step}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{road.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{road.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive Partner Earnings Calculator (in ₹) ────────────────────── */}
      <section id="calculator" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white text-gray-950 rounded-3xl p-8 sm:p-14 border-2 border-emerald-200 shadow-2xl grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Partner Earnings Estimator
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
              Calculate your projected monthly net revenue.
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Adjust your target daily capacity to preview monthly gross and net earnings across our dispatch ecosystem.
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "laundromat", label: "Laundromat Store Partner" },
                { id: "courier", label: "Fleet Logistics Partner" },
                { id: "specialist", label: "Commercial Laundry Facility" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setPartnerType(type.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    partnerType === type.id
                      ? "bg-emerald-700 text-white font-black shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-6 sm:p-8 border border-gray-200 space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2 text-gray-700">
                <span>Daily Order Capacity</span>
                <span className="text-emerald-800 font-black">{dailyOrders} Orders / Day</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={dailyOrders}
                onChange={(e) => setDailyOrders(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>10 / day (Starter Store)</span>
                <span>50 / day (Active Store)</span>
                <span>120+ / day (Large Facility)</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                Estimated Monthly Net Payout
              </span>
              <p className="text-4xl font-black text-gray-950">₹{grossMonthly}</p>
              <p className="text-xs text-gray-500">
                Calculated at 26 operating days/mo with 85% average net partner payout rate.
              </p>
            </div>

            <button
              onClick={() => onOpenModal("partner")}
              className="w-full py-4 rounded-full font-black text-white bg-emerald-700 hover:bg-emerald-800 text-sm shadow-xl hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
            >
              Join as QuickPress Partner →
            </button>
          </div>
        </div>
      </section>

      {/* ─── Case Studies ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Real Partner Stories
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            Proven growth from day one
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CASE_STUDIES.map((cs) => (
            <div
              key={cs.name}
              className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                    {cs.category}
                  </span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <IconStar key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <h3 className="text-xl font-black text-gray-900 mb-1">{cs.name}</h3>
                <p className="text-xs text-gray-400 mb-4">{cs.location} • {cs.duration}</p>

                <p className="text-xs sm:text-sm text-gray-600 italic leading-relaxed mb-6">
                  "{cs.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Growth</span>
                  <span className="text-sm font-black text-emerald-700">{cs.growth}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Monthly Vol</span>
                  <span className="text-sm font-black text-gray-900">{cs.monthlyRevenue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
