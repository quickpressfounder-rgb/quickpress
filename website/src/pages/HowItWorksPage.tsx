import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import {
  IconCheck,
  IconBolt,
  IconVan,
  IconShield,
  IconCpu,
  IconSparkle,
  IconArrowRight,
  IconBox,
} from "@/components/Icons";

const GREEN = "#1A7A3C";
const YELLOW = "#F59E0B";

const STAGES = [
  {
    step: "01",
    label: "Book & Customize",
    title: "Instant Digital Booking in Under 60 Seconds",
    desc: "Choose the exact service you need with custom preferences (hypoallergenic detergent, delicate hang-dry, delivery contact notes) and instant transparent pricing.",
    icon: IconBolt,
    accent: GREEN,
    bg: "#E8F7EE",
    details: [
      "Select convenient 1-hour pickup window or immediate on-demand dispatch (<45m)",
      "Add custom garment care instructions (starch level, fold vs hanger preferences)",
      "Zero upfront payment required—review weight validation before paying",
    ],
    mockPreview: {
      title: "Booking Intake Verified",
      tag: "Step 1 Completed",
      info: "Order #QP-94820 • 15 lbs Wash & Fold • 10:30 AM Slot",
    },
  },
  {
    step: "02",
    label: "Doorstep Pickup",
    title: "Precision Collection with Secure Barcode Tagging",
    desc: "A verified QuickPress courier arrives at your location with specialized weather-resistant bags. Each bag is sealed with a unique tamper-evident barcode.",
    icon: IconVan,
    accent: "#2563EB",
    bg: "#EFF6FF",
    details: [
      "Real-time SMS with live driver ETA and contact profile",
      "Tamper-evident bag sealing with digital barcode scan",
      "Contactless doorstep handoff or lobby concierge handover",
    ],
    mockPreview: {
      title: "Courier En Route",
      tag: "Driver 0.4 mi away",
      info: "Alex Morgan (4.95 Rating) • Van #842 • ETA: 4 Mins",
    },
  },
  {
    step: "03",
    label: "Care & Eco-Processing",
    title: "Expert Network Care & High-Standard Eco-Treatment",
    desc: "Your items are routed directly to the nearest certified partner facility. Garments are inspected, separated by color/fabric, and treated with eco-friendly formulas.",
    icon: IconCpu,
    accent: "#7C3AED",
    bg: "#F5F3FF",
    details: [
      "Multi-point intake inspection checking pockets and fabric sensitivity",
      "Automated weight and garment count validation recorded to your digital receipt",
      "Eco-friendly cold-water wash cycles and hypoallergenic botanical detergents",
    ],
    mockPreview: {
      title: "Active In Facility",
      tag: "Eco-Care Cycle",
      info: "Station #14 • Delicate Fabric Profile • Quality Inspected",
    },
  },
  {
    step: "04",
    label: "Safe White-Glove Return",
    title: "Inspection, Crisp Packaging & Scheduled Delivery",
    desc: "Your cleaned and pressed items undergo final quality inspection, are packaged in 100% recyclable protective covers, and returned right on schedule.",
    icon: IconShield,
    accent: "#D97706",
    bg: "#FEF3C7",
    details: [
      "Neatly folded in crisp stacks or hung on eco-hangers per your preference",
      "GPS courier route optimization ensures delivery during your chosen window",
      "Photo confirmation of delivery sent to your phone with instant digital receipt",
    ],
    mockPreview: {
      title: "Delivered & Signed",
      tag: "Delivered on Time",
      info: "Pristine condition • Doorstep photo captured • Satisfaction 100%",
    },
  },
];

export function HowItWorksPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const currentStage = STAGES[activeStageIndex];

  return (
    <div className="pt-24 sm:pt-32 pb-24 space-y-24 bg-white">
      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold tracking-widest uppercase mb-4">
          The QuickPress Process
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-950 leading-tight max-w-4xl mx-auto">
          From request to delivery, <br />
          <span style={{ color: GREEN }}>without the complexity.</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
          Explore how our proprietary dispatch engine, verified partner network, and quality inspections orchestrate effortless service from start to finish.
        </p>
      </section>

      {/* ─── Interactive Stage Simulator ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 rounded-3xl p-6 sm:p-12 border border-gray-200/80 shadow-md">
          {/* Stage Selector Pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            {STAGES.map((stg, idx) => {
              const isSelected = idx === activeStageIndex;
              return (
                <button
                  key={stg.step}
                  onClick={() => setActiveStageIndex(idx)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20 scale-[1.02]"
                      : "bg-white/60 border-gray-200/80 text-gray-500 hover:bg-white"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-emerald-800 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {stg.step}
                  </span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Stage {stg.step}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-bold truncate block ${
                        isSelected ? "text-gray-900" : "text-gray-600"
                      }`}
                    >
                      {stg.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed View */}
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: currentStage.bg }}
                >
                  <currentStage.icon className="w-6 h-6" style={{ color: currentStage.accent }} />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                    Step {currentStage.step} of 04
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">
                    {currentStage.title}
                  </h3>
                </div>
              </div>

              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                {currentStage.desc}
              </p>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-900 block">
                  Stage Protocols:
                </span>
                <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700">
                  {currentStage.details.map((d) => (
                    <li key={d} className="flex items-start gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
                        style={{ background: currentStage.accent }}
                      >
                        <IconCheck className="w-2.5 h-2.5" />
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Simulated Device / Card Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-gray-200/90 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-live-dot" />
                    <span className="text-xs font-bold uppercase text-gray-700">
                      Live Telemetry
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full">
                    {currentStage.mockPreview.tag}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {currentStage.mockPreview.title}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    {currentStage.mockPreview.info}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-gray-500 font-semibold">
                  <span>SLA Adherence</span>
                  <span className="text-emerald-700 font-bold">100% Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Technology Architecture Breakdown ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            The Engine
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            Technology behind the speed
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-4">
            How QuickPress uses intelligent routing, capacity forecasting, and live tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Geospatial Routing Engine",
              desc: "Algorithms cluster neighborhood orders into optimal delivery sequences, reducing transit delays and courier idle time.",
              icon: IconBolt,
            },
            {
              title: "Automated Partner Matching",
              desc: "Orders are dynamically dispatched to the partner facility with matching fabric equipment, certified staff, and lowest queue latency.",
              icon: IconCpu,
            },
            {
              title: "End-to-End Barcode Tagging",
              desc: "Every order receives a serialized digital tag scanned at collection, sorting, wash, press, and dispatch to eliminate lost garments.",
              icon: IconShield,
            },
          ].map((tech) => (
            <div
              key={tech.title}
              className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-6">
                <tech.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{tech.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ₹5,000 Protection Guarantee ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white text-gray-950 rounded-3xl p-8 sm:p-12 border-2 border-emerald-100 shadow-xl grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
              Safety & Security
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-gray-950">
              Comprehensive Protection up to ₹5,000 included with every order.
            </h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              In the rare event of damage, delay, or transit issues, our dedicated claims desk resolves issues within 24 hours. Your peace of mind is guaranteed.
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <button
              onClick={() => onOpenModal("booking")}
              className="px-8 py-4 rounded-full font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-xl cursor-pointer text-sm"
            >
              Start Your First Order →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
