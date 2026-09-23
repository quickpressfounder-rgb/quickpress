import React, { useState } from "react";
import { PageType, ModalType } from "@/types";
import { ServicesDiagramSection } from "@/components/ServicesDiagram";
import {
  IconCheck,
  IconArrowRight,
  IconGooglePlay,
  IconSmartphone,
  IconApple,
  IconShield,
  IconBolt,
  IconSparkle,
} from "@/components/Icons";

const GREEN = "#1A7A3C";

const FAQ_ITEMS = [
  {
    q: "How fast is pickup and delivery?",
    a: "Pickup within 1-hour slot; doorstep return guaranteed in 24 hours for wash & steam press, 48 hours for dry cleaning.",
  },
  {
    q: "How do you prevent clothes from getting lost?",
    a: "Every garment bag is sealed with a unique serialized barcode QR tag at your doorstep and scanned at every checkpoint.",
  },
  {
    q: "Are the cleaning chemicals safe for sensitive skin?",
    a: "Yes. 100% plant-based, hypoallergenic botanical detergents with zero perchloroethylene, chlorine, or harsh bleaches.",
  },
  {
    q: "Can I customize starch level and folding preferences?",
    a: "Yes. In the app, select light/medium/crisp starch, and choose between hanger delivery or flat protective fold.",
  },
];

export function ServicesPage({
  onNavigate,
  onOpenModal,
  onSelectService,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
  onSelectService: (s: any) => void;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const PLAY_STORE_URL = "https://play.google.com/store/apps";

  const handleBookNowClick = () => {
    window.open(PLAY_STORE_URL, "_blank");
    onOpenModal("download_app");
  };

  return (
    <div className="pt-36 sm:pt-44 pb-24 bg-slate-50/70 min-h-screen space-y-16 sm:space-y-20">
      {/* ─── Compact Hero Header ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider mb-3 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-live-dot" />
          On-Demand Laundry & Garment Care
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight max-w-3xl mx-auto">
          Smart Services. Clear Diagram. <br />
          <span style={{ color: GREEN }}>Minimal Effort For You.</span>
        </h1>

        <p className="text-gray-600 text-xs sm:text-base max-w-2xl mx-auto mt-3 leading-relaxed">
          From daily wash & fold to bridal dry clean, sneaker spa & luxury leather care. Scan the live care diagram below and schedule pickup in under 30 seconds.
        </p>

        {/* Quick Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleBookNowClick}
            className="px-6 py-3 rounded-2xl font-black text-white text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-102 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{ background: GREEN }}
          >
            <IconGooglePlay className="w-4 h-4 text-emerald-300" />
            <span>Open QuickPress on Play Store →</span>
          </button>

          <button
            onClick={() => onNavigate("how-it-works")}
            className="px-5 py-3 rounded-2xl font-bold text-gray-800 text-xs sm:text-sm bg-white hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>How QuickPress Works</span>
            <IconArrowRight className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </section>

      {/* ─── Interactive Diagram & Minimalist Service Grid ────────────────── */}
      <section>
        <ServicesDiagramSection onOpenModal={onOpenModal} showTitle={false} />
      </section>

      {/* ─── 4-Step Visual Booking Flow Diagram ────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
              SIMPLE 4-STEP CYCLE
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-gray-950 mt-2">
              From Doorstep Pickup to Wardrobe-Ready
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {[
              {
                step: "01",
                title: "1-Click App Request",
                desc: "Pick your service and preferred 1-hour collection slot.",
                icon: IconSmartphone,
                badge: "<30s Booking",
              },
              {
                step: "02",
                title: "QR Sealed Pickup",
                desc: "Captain arrives, bags clothes, and seals with barcode tag.",
                icon: IconShield,
                badge: "Zero Lost Clothes",
              },
              {
                step: "03",
                title: "Precision Lab Wash",
                desc: "Fabric-specific drum cycle, temperature, and Italian press.",
                icon: IconSparkle,
                badge: "Eco Detergents",
              },
              {
                step: "04",
                title: "Doorstep Return",
                desc: "Delivered fresh, crisp on hangers or flat-fold with OTP proof.",
                icon: IconCheck,
                badge: "Guaranteed 24h SLA",
              },
            ].map((s, idx) => (
              <div
                key={s.step}
                className="bg-slate-50/80 rounded-2xl p-4 border border-gray-200/80 flex flex-col justify-between relative group hover:border-emerald-500 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-black flex items-center justify-center">
                      {s.step}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {s.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-gray-950 mb-1">{s.title}</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-xs items-center justify-center text-emerald-600">
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Compact FAQs (Minimal & Direct) ───────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            COMMON QUESTIONS
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-gray-950 mt-1">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-2.5">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{item.q}</span>
                  <span
                    className={`text-emerald-700 font-black text-sm transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-slate-50/50">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Final Quick CTA Banner ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white text-gray-950 rounded-3xl p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-emerald-200">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">
              READY IN 30 SECONDS
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-950">
              Ready for Zero-Friction Laundry?
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-lg">
              Download QuickPress now, book your doorstep slot, and enjoy clean, fresh, crisp clothes tomorrow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleBookNowClick}
              className="px-6 py-3.5 rounded-2xl font-black text-white bg-emerald-700 hover:bg-emerald-800 text-xs sm:text-sm shadow-md hover:scale-102 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <IconGooglePlay className="w-4 h-4 text-emerald-300" />
              <span>Get App on Play Store</span>
            </button>
            <button
              onClick={() => onOpenModal("booking")}
              className="px-5 py-3.5 rounded-2xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs sm:text-sm transition-all cursor-pointer"
            >
              Book in Web Browser
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
