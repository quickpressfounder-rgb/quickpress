import React, { useState } from "react";

// Official Government of India Ashok Emblem Vector (Stylized Lion Capital)
export const IconGovtEmblem = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="#1D4ED8" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
    {/* Ashoka Chakra 24-spoke stylized center */}
    <circle cx="24" cy="24" r="16" stroke="#000080" strokeWidth="1.8" />
    <circle cx="24" cy="24" r="3.5" fill="#000080" />
    {/* Spokes */}
    {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345].map((deg) => (
      <line
        key={deg}
        x1="24"
        y1="24"
        x2="24"
        y2="8.5"
        stroke="#000080"
        strokeWidth="1.2"
        strokeLinecap="round"
        transform={`rotate(${deg} 24 24)`}
      />
    ))}
  </svg>
);

// Official #startupindia Wing Logo Vector
export const IconStartupIndia = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Flying arrow / dynamic sparks in Indian Tricolor */}
    {/* Saffron spark */}
    <path
      d="M12 44L28 12C29.2 9.6 32.8 9.6 34 12L42 28L28 34L12 44Z"
      fill="#FF671F"
    />
    {/* Blue dynamic spark */}
    <path
      d="M28 34L42 28L54 40C56 42 54.8 45.5 52 46L36 48L28 34Z"
      fill="#06038D"
    />
    {/* Green foundation spark */}
    <path
      d="M14 46L36 48L48 56C50 57.5 48.5 60 46 60L20 58C16 57.5 13 54 14 46Z"
      fill="#046A38"
    />
    {/* Center energetic burst dot */}
    <circle cx="34" cy="30" r="3" fill="#FFFFFF" />
  </svg>
);

export function DPIITRecognitionBadge({
  className = "",
}: {
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className={`relative inline-block w-full max-w-3xl mx-auto ${className}`}>
        {/* Subtle Ambient Indian Tricolor Radiant Aura */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-orange-400/20 via-emerald-400/15 to-blue-500/20 blur-xl opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Floating Badge Card with Shimmer & Spring Entrance */}
        <div
          onClick={() => setShowModal(true)}
          className="relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-emerald-300/80 hover:border-[#16a34a] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer group overflow-hidden"
        >
          {/* Top Indian Tricolor Micro Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF671F] via-[#FFFFFF] to-[#046A38]" />

          {/* Shimmer Light Sweep across Badge */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Dual Logo Lockup (Govt Emblem + Startup India Wing) */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex items-center -space-x-2 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center justify-center p-1.5 shadow-sm">
                  <IconGovtEmblem className="w-8 h-8" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-300 flex items-center justify-center p-1.5 shadow-md group-hover:scale-105 transition-transform">
                  <IconStartupIndia className="w-8 h-8" />
                </div>
              </div>

              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-[#FF671F] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                    GOVT OF INDIA
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-[#046A38] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    RECOGNIZED STARTUP
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight mt-0.5 flex items-center gap-1.5">
                  <span>Recognized by</span>
                  <span className="text-zinc-900 underline decoration-[#FF671F] decoration-2 underline-offset-4">DPIIT</span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-[#06038D] font-extrabold italic tracking-normal">#startupindia</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-zinc-600 font-medium">
                  Department for Promotion of Industry and Internal Trade • Ministry of Commerce & Industry
                </p>
              </div>
            </div>

            {/* Right: Verified Badge & CTA */}
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                  <span>DPIIT Certified</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-zinc-500">
                  Govt. Recognition Active
                </div>
              </div>

              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-[#22c55e] text-[#16a34a] hover:text-black border border-emerald-300 font-mono text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>View Details</span>
                <span className="text-xs">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recognition Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-300 shadow-2xl animate-pop-zoom space-y-6 text-left font-sans">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-300 flex items-center justify-center p-1.5 shadow-sm">
                <IconStartupIndia className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-[#FF671F] tracking-widest">
                  OFFICIAL RECOGNITION
                </span>
                <h3 className="text-xl font-black text-black tracking-tight">
                  Startup India & DPIIT
                </h3>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Recognizing Authority:</span>
                  <span className="font-bold text-black text-right">DPIIT, Govt. of India</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Ministry:</span>
                  <span className="font-bold text-black text-right">Commerce & Industry</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Entity Name:</span>
                  <span className="font-bold text-black text-right">QUICKPRESS TECHNOLOGIES PVT LTD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CIN:</span>
                  <span className="font-bold text-[#16a34a] text-right">U96010UW2026PTC259787</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Headquarters:</span>
                  <span className="font-bold text-black text-right">Kasganj, Uttar Pradesh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Initiative:</span>
                  <span className="font-black text-[#06038D] text-right">#startupindia Grid</span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 font-sans leading-relaxed font-medium">
                QuickPress is certified under the Startup India initiative by the Department for Promotion of Industry and Internal Trade (DPIIT), Ministry of Commerce and Industry, Government of India. This empowers our mission to organize India's garment care ecosystem through clean technology and verified local laundromat hubs.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
