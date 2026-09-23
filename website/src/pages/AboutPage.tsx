import React from "react";
import { PageType, ModalType } from "@/types";
import {
  IconCheck,
  IconShield,
  IconSparkle,
  IconAward,
  IconUsers,
  IconCode,
  IconTrendingUp,
  IconBriefcase,
  IconCpu,
} from "@/components/Icons";
import logoLight from "@/assets/quickpress-logo.png";

const GREEN = "#1A7A3C";
const YELLOW = "#F59E0B";

const VALUES = [
  {
    title: "Technology That Simplifies",
    desc: "Technology should make life easier, not more complicated. Every feature is designed to reduce friction for customers and partners alike.",
    icon: IconSparkle,
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    title: "Different Strengths, One Direction",
    desc: "Great businesses are built when diverse expertise—Business, Leadership, Tech, Finance, and Execution—unite behind a single bold mission.",
    icon: IconUsers,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    title: "Relentless Everyday Improvement",
    desc: "Learning from every customer, learning from every partner, learning from every mistake, and improving with every step.",
    icon: IconAward,
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    title: "100% Trust & Accountability",
    desc: "Treating every doorstep pickup, item care, and scheduled return with absolute reliability and complete transparency.",
    icon: IconShield,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
];

export function AboutPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  return (
    <div className="pt-24 sm:pt-32 pb-24 space-y-24 bg-white">
      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-100">
          Our Story & Leadership
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-950 leading-tight max-w-4xl mx-auto">
          Three Friends. One Idea. <br />
          <span style={{ color: GREEN }}>A Bigger Vision.</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-xl max-w-3xl mx-auto mt-6 leading-relaxed">
          Every journey starts somewhere. For QuickPress, it started with three school friends from <strong>Suraj Prasad Daga Saraswati Vidya Mandir</strong> who united their skills to simplify everyday living.
        </p>
      </section>

      {/* ─── The Origin Story: Three Friends & School Roots ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 rounded-3xl p-8 sm:p-14 border border-gray-200/80 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              From Classmates to Co-Builders
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
              How curiosity turned into a shared ambition.
            </h2>
            <div className="space-y-4 text-gray-600 text-sm sm:text-base leading-relaxed">
              <p>
                Back then at <strong>Suraj Prasad Daga Saraswati Vidya Mandir</strong>, we were simply classmates with different interests, different strengths, and a common curiosity about how great businesses are built.
              </p>
              <p>
                Over time, our individual passions sharpened into distinct, complementary capabilities:
              </p>
              <ul className="space-y-3 pt-2">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong>Himanshu Pal (Himanshu Baghel)</strong> developed a multifaceted mastery across <strong>Full Stack Development</strong>, <strong>Growth Marketing Leadership</strong>, and <strong>End-to-End Business Ownership</strong> from the ground up.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-yellow-500 text-gray-950 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong>Rishab Baghel (Rishuuu)</strong> brought an execution-first entrepreneurial mindset, driving <strong>Business Development, Leadership & Actionable Execution</strong>.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl border border-gray-100 flex flex-col items-center text-center space-y-4">
              <img src={logoLight} alt="QuickPress" className="h-8 w-auto" />
              <div className="w-12 h-1 rounded-full bg-yellow-400" />
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "We believe great businesses are not built by one person. They are built when different people bring different strengths to the same vision."
              </p>
              <div className="w-full pt-4 border-t border-gray-100 flex flex-col gap-2 text-xs text-left">
                <div>
                  <span className="text-gray-400 font-bold block text-[10px] uppercase">Corporate Entity</span>
                  <span className="text-gray-900 font-bold text-xs">
                    Shree Krishna EVs
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[10px] uppercase">Registered Office</span>
                  <span className="text-emerald-700 font-medium text-[11px] leading-tight block">
                    0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Visual Organizational Hierarchy Tree (As requested by Founder) ─────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Organizational Structure
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            The Leadership Hierarchy
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-2">
            Clear accountability, aligned leadership, and relentless execution.
          </p>
        </div>

        {/* Tree Layout Container */}
        <div className="bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50 rounded-3xl p-6 sm:p-12 border border-gray-200/80 shadow-md">
          {/* ── TIER 1: FOUNDER (Himanshu Pal / Himanshu Baghel) ── */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-600 shadow-xl relative text-center">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black bg-emerald-800 text-white uppercase tracking-widest shadow-md">
                Founder & Business Owner
              </span>

              <div className="mt-2">
                <h3 className="text-2xl sm:text-3xl font-black text-gray-950">
                  Himanshu Pal
                </h3>
                <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5">
                  (People Call Me: Himanshu Baghel)
                </p>

                {/* Badges / Domains */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                    <IconCode className="w-3.5 h-3.5 text-emerald-700" />
                    Full Stack Developer
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-900 text-xs font-bold">
                    <IconTrendingUp className="w-3.5 h-3.5 text-yellow-700" />
                    Marketing Leader
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                    <IconBriefcase className="w-3.5 h-3.5 text-blue-700" />
                    Business Owner & Strategy
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 mt-4 leading-relaxed max-w-lg mx-auto">
                  Architect of the QuickPress vision, technical infrastructure, and marketing roadmap. Driving overall business strategy, product architecture, and long-term ecosystem development.
                </p>
              </div>
            </div>

            {/* Vertical Connector Line from Tier 1 to Tier 2 */}
            <div className="w-0.5 h-12 bg-emerald-600/70 my-1 relative">
              <div className="w-2 h-2 rounded-full bg-emerald-600 absolute bottom-0 -left-[3px]" />
            </div>
          </div>

          {/* ── TIER 2: CEO (Rishab Baghel / Rishuuu) ── */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 border-2 border-yellow-500 shadow-lg relative text-center">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black bg-yellow-400 text-gray-950 uppercase tracking-widest shadow-md">
                Chief Executive Officer (CEO)
              </span>

              <div className="mt-2">
                <h3 className="text-xl sm:text-2xl font-black text-gray-950">
                  Rishab Baghel
                </h3>
                <p className="text-xs font-bold text-yellow-800 mt-0.5">
                  (Known As: Rishuuu)
                </p>

                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-900 text-xs font-bold">
                    Business Development
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                    Leadership & Execution
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                  Leading executive decision-making, strategic partnerships, daily business development, and driving company execution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why QuickPress? ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white text-gray-950 rounded-3xl p-8 sm:p-14 border border-gray-200 shadow-xl grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Our Vision
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
              Why QuickPress?
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              We saw an opportunity to build something that could make everyday services simpler, faster, and more accessible. QuickPress is our attempt to turn that vision into reality.
            </p>
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <p className="text-base sm:text-lg font-bold text-emerald-950">
                "Technology should make life easier — not more complicated."
              </p>
              <p className="text-xs text-emerald-900/80 mt-2 leading-relaxed">
                From the way customers discover and order services to the way partners manage their business and teams deliver those services, we want to create a connected ecosystem that works for everyone.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-5 bg-slate-50 rounded-2xl border border-gray-200 text-center">
              <p className="text-2xl sm:text-3xl font-black text-emerald-700">100%</p>
              <p className="text-xs text-gray-600 mt-1 font-semibold">Reliability Focus</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-gray-200 text-center">
              <p className="text-2xl sm:text-3xl font-black text-emerald-800">Unified</p>
              <p className="text-xs text-gray-600 mt-1 font-semibold">Service Ecosystem</p>
            </div>
            <div className="p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center col-span-2">
              <p className="text-xl sm:text-2xl font-black text-emerald-950">Built by Friends</p>
              <p className="text-xs text-emerald-800 mt-0.5">Driven by ambition. Made for what comes next.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Core Values ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Our DNA
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 mt-3">
            Values that guide how we build
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((val) => (
            <div
              key={val.title}
              className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-xs hover:shadow-lg transition-all"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: val.bg }}
              >
                <val.icon className="w-6 h-6" style={{ color: val.color }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{val.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Still Just Getting Started Banner ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-emerald-50 via-white to-yellow-50/50 rounded-3xl p-8 sm:p-14 border border-emerald-100 shadow-md space-y-6">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            Still Just Getting Started
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
            We are not presenting QuickPress as a finished story. <br />
            <span style={{ color: GREEN }}>We are building it every day.</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2 text-xs font-bold text-gray-700">
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
              Learning from every customer
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
              Learning from every partner
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
              Learning from every mistake
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
              Improving with every step
            </div>
          </div>
          <p className="text-sm font-black text-gray-900 pt-2">
            The journey that started between school friends is now becoming something much bigger.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onOpenModal("booking")}
              className="px-8 py-3.5 rounded-full font-bold text-white text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
              style={{ background: GREEN }}
            >
              Book a Service →
            </button>
            <button
              onClick={() => onNavigate("partners")}
              className="px-8 py-3.5 rounded-full font-bold text-gray-950 text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
              style={{ background: YELLOW }}
            >
              Partner With Us →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
