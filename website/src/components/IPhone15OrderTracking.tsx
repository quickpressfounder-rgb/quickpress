import React, { useState } from "react";
import { IconCheck, IconPhone } from "./Icons";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

interface IPhone15OrderTrackingProps {
  onOpenBooking?: () => void;
  onShowToast?: (msg: string) => void;
}

export function IPhone15OrderTracking({
  onOpenBooking,
  onShowToast,
}: IPhone15OrderTrackingProps) {
  const [activeTab, setActiveTab] = useState<"map" | "timeline">("map");
  const [isDynamicIslandExpanded, setIsDynamicIslandExpanded] = useState(false);

  const handleActionClick = () => {
    if (onShowToast) {
      onShowToast("Opening live tracking in the QuickPress customer app...");
    }
    if (onOpenBooking) {
      onOpenBooking();
    } else {
      handleGetStartedRedirect();
    }
  };

  return (
    <div className="relative group mx-auto flex items-center justify-center select-none">
      {/* Subtle outer atmospheric halo glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 via-emerald-600/10 to-teal-400/20 rounded-[64px] blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* ─── REAL IPHONE 15 PRO CHASSIS ─── */}
      <div className="relative w-[320px] sm:w-[350px] rounded-[54px] p-3.5 bg-gradient-to-b from-[#4A4B50] via-[#28292D] to-[#18191C] shadow-[0_30px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.18),inset_0_1px_2px_rgba(255,255,255,0.4)] transition-all duration-500 hover:scale-[1.02]">
        {/* Hardware: Left Side Buttons */}
        {/* Action Button */}
        <div className="absolute -left-[6px] top-24 w-1.5 h-7 bg-[#34353A] rounded-l-md border-r border-[#1B1C1E] shadow-xs" />
        {/* Volume Up */}
        <div className="absolute -left-[6px] top-36 w-1.5 h-12 bg-[#34353A] rounded-l-md border-r border-[#1B1C1E] shadow-xs" />
        {/* Volume Down */}
        <div className="absolute -left-[6px] top-52 w-1.5 h-12 bg-[#34353A] rounded-l-md border-r border-[#1B1C1E] shadow-xs" />
        {/* Hardware: Right Side Power Button */}
        <div className="absolute -right-[6px] top-36 w-1.5 h-16 bg-[#34353A] rounded-r-md border-l border-[#1B1C1E] shadow-xs" />

        {/* Inner Screen Bezel with OLED Black Finish */}
        <div className="relative rounded-[42px] bg-[#0A120D] text-white overflow-hidden border border-white/10 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)] flex flex-col justify-between min-h-[640px] font-sans">
          {/* ─── TOP STATUS BAR & DYNAMIC ISLAND ─── */}
          <div className="pt-2 px-5 pb-1 relative z-40 bg-[#0A120D]/90 backdrop-blur-md">
            {/* Dynamic Island Pill */}
            <div
              onClick={() => setIsDynamicIslandExpanded(!isDynamicIslandExpanded)}
              className={`mx-auto bg-black rounded-full flex items-center justify-between px-3 cursor-pointer shadow-md border border-white/5 transition-all duration-300 ${
                isDynamicIslandExpanded
                  ? "w-[92%] h-11 px-4 scale-102 bg-gray-950"
                  : "w-32 h-7 hover:scale-105"
              }`}
            >
              {isDynamicIslandExpanded ? (
                <div className="flex items-center justify-between w-full text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛵</span>
                    <div>
                      <span className="font-bold text-emerald-400 block leading-tight">Captain Rahul</span>
                      <span className="text-[9px] text-gray-400 block leading-tight">12 mins away • 1.4 km</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                    <span>🛵</span>
                    <span>12m</span>
                  </div>
                  {/* Front Camera Lens Accent */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-dot" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1A1F2C] border border-[#2D3748] flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-[#0F172A]" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Status Bar Icons (Left: Clock, Right: 5G & Battery) */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-300 mt-1 px-1">
              <span>9:41</span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="tracking-tighter">5G</span>
                {/* Battery Icon */}
                <div className="w-5 h-2.5 rounded-xs border border-gray-300 p-0.5 flex items-center">
                  <div className="h-full w-full bg-emerald-400 rounded-2xs" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── LIVE ORDER TRACKING SCREEN CONTENT ─── */}
          <div className="px-4 py-2 flex-1 flex flex-col justify-between space-y-3">
            {/* Top In-App Header */}
            <div className="flex items-center justify-between border-b border-emerald-950/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                <span className="text-xs font-black tracking-wide text-white">LIVE ORDER TRACKING</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                #QP-8492
              </span>
            </div>

            {/* Status Alert Banner */}
            <div className="bg-gradient-to-r from-emerald-950/90 to-[#0e2c18] border border-emerald-800/60 rounded-2xl p-3 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Out For Delivery
                </span>
                <span className="text-xs font-black text-white">ETA 11:15 AM</span>
              </div>
              <h4 className="text-sm font-bold text-gray-100">Captain Rahul is on the way</h4>
              <p className="text-[11px] text-gray-300 leading-snug mt-0.5">
                Delivering 8 clean & crisp steam-pressed garments to Civil Lines, Kasganj.
              </p>
            </div>

            {/* Toggle View: Live GPS Map vs Milestones */}
            <div className="grid grid-cols-2 p-0.5 bg-black/50 rounded-xl border border-emerald-950 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "map"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                🗺️ Live GPS Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "timeline"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                ⏱️ Order Timeline
              </button>
            </div>

            {/* ─── TAB 1: Real Live Map View ─── */}
            {activeTab === "map" && (
              <div className="relative rounded-2xl bg-[#0F1E14] border border-emerald-900/70 p-3 h-44 overflow-hidden flex flex-col justify-between shadow-inner">
                {/* Stylized Dark Grid Map Lines */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-grid-pattern-dark" />

                {/* SVG Route Line with Animated Dashflow */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 170" fill="none">
                  {/* Road Path Base */}
                  <path
                    d="M 40 140 Q 90 120 130 90 T 220 50 L 260 35"
                    stroke="#1E3A2B"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Glowing Animated Dash Route */}
                  <path
                    d="M 40 140 Q 90 120 130 90 T 220 50 L 260 35"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="6 6"
                    className="animate-dash"
                  />
                </svg>

                {/* Map Point 1: Kasganj Hub (Origin) */}
                <div className="absolute left-6 bottom-4 flex items-center gap-1.5 z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-500 text-xs flex items-center justify-center shadow-lg">
                    🏪
                  </div>
                  <span className="text-[9px] font-black text-gray-300 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-xs">
                    Kasganj Hub
                  </span>
                </div>

                {/* Map Point 2: Moving Captain Rahul (Current Position) */}
                <div className="absolute left-1/2 top-14 -translate-x-1/2 z-20 flex flex-col items-center">
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping" />
                    <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-sm">
                      🛵
                    </div>
                  </div>
                  <span className="mt-1 text-[9px] font-black text-white bg-emerald-950 border border-emerald-600 px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    Rahul • 1.4 km
                  </span>
                </div>

                {/* Map Point 3: Customer Home (Destination) */}
                <div className="absolute right-4 top-4 flex items-center gap-1.5 z-10">
                  <span className="text-[9px] font-black text-white bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-xs">
                    Your Doorstep
                  </span>
                  <div className="w-6 h-6 rounded-full bg-amber-500 border border-white text-xs flex items-center justify-center shadow-lg animate-bounce">
                    📍
                  </div>
                </div>

                {/* Speed & Traffic Badge */}
                <div className="mt-auto self-start z-10 bg-black/75 backdrop-blur-sm border border-emerald-800/80 rounded-lg px-2 py-1 text-[9px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-dot" />
                  <span>Bilram Road Clear • Avg. 24 km/h</span>
                </div>
              </div>
            )}

            {/* ─── TAB 2: Live Milestones Timeline ─── */}
            {activeTab === "timeline" && (
              <div className="rounded-2xl bg-black/40 border border-emerald-950 p-3 h-44 overflow-y-auto space-y-2.5 text-[10px]">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                    <IconCheck className="w-2.5 h-2.5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-200">10:15 AM • Picked Up & Barcoded</div>
                    <div className="text-[9px] text-gray-400">100% loss-free barcode QR sealed at doorstep.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                    <IconCheck className="w-2.5 h-2.5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-200">10:45 AM • Eco-Washed & Steam Pressed</div>
                    <div className="text-[9px] text-gray-400">Italian vacuum press finish & fabric inspection.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shrink-0 mt-0.5 animate-live-dot">
                    🛵
                  </div>
                  <div>
                    <div className="font-bold text-emerald-400">11:02 AM • Out for Doorstep Delivery</div>
                    <div className="text-[9px] text-gray-300">Captain Rahul dispatched via Hero Electric fleet.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 opacity-60">
                  <div className="w-4 h-4 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                    ⏳
                  </div>
                  <div>
                    <div className="font-bold text-gray-300">11:15 AM • Doorstep Handover & OTP</div>
                    <div className="text-[9px] text-gray-500">Inspect garments & share 4-digit code.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Captain Profile Card & Delivery Security OTP */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-800 border border-emerald-400/50 flex items-center justify-center text-base shrink-0">
                  👨‍✈️
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>Rahul Kumar</span>
                    <span className="text-[10px] text-amber-400">⭐ 4.9</span>
                  </div>
                  <div className="text-[9px] text-gray-400 truncate">QuickPress Captain #04 • KYC Verified</div>
                </div>
              </div>

              {/* Delivery OTP Badge */}
              <div className="text-right shrink-0 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-700/60">
                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Delivery OTP
                </span>
                <span className="text-xs font-black tracking-widest text-white">4 9 2 0</span>
              </div>
            </div>

            {/* Interactive Redirect CTA Button */}
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs shadow-lg shadow-emerald-900/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Track in QuickPress App</span>
              <span>→</span>
            </button>
          </div>

          {/* ─── BOTTOM IPHONE HOME INDICATOR ─── */}
          <div className="pb-2 pt-1 flex justify-center">
            <div className="w-32 h-1 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
