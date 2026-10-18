import React, { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle, Flame, Sparkles } from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";

interface CaptainSurgeAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords?: { lat: number; lng: number } | null;
}

export const CaptainSurgeAreaModal: React.FC<CaptainSurgeAreaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isSurgeEnabled, setIsSurgeEnabled] = useState(false);

  // Safe Native Android Back Button Interception (no router pushState corruption)
  useEffect(() => {
    if (!isOpen) return;

    let cleanup: (() => void) | null = null;
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/app")
        .then(({ App }) => {
          App.addListener("backButton", () => {
            triggerHaptic(20);
            onClose();
          })
            .then((handle) => {
              cleanup = () => handle.remove();
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerHaptic(20);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (cleanup) cleanup();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 text-zinc-900 select-none animate-in fade-in duration-200">
      {/* Top Floating Back Button (Video 00:26 Match) */}
      <div
        className="absolute top-4 left-4 z-20 pointer-events-auto"
        style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 16px), 52px)" }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            onClose();
          }}
          className="flex size-10 items-center justify-center rounded-full bg-white shadow-md border border-zinc-200 text-zinc-800 active:scale-90 transition-all cursor-pointer"
          aria-label="Back to Map"
        >
          <ArrowLeft className="size-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Background Stylized Map Graphic / Area View */}
      <div className="relative flex-1 w-full bg-[#E5ECE9] overflow-hidden">
        {/* Visual Map Grid Pattern */}
        <div
          className="absolute inset-0 size-full opacity-60 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1.5px, transparent 1.5px), radial-gradient(#cbd5e1 1.5px, #e5ece9 1.5px)`,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px",
          }}
        />

        {/* Kasganj Map Road Simulation */}
        <svg className="absolute inset-0 size-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-50 120 Q 150 180 320 160 T 500 240" stroke="#FFFFFF" strokeWidth="8" fill="none" opacity="0.9" />
          <path d="M120 -50 Q 160 200 220 400 T 260 700" stroke="#FFFFFF" strokeWidth="10" fill="none" opacity="0.9" />
          <path d="M220 400 L 450 360" stroke="#FFFFFF" strokeWidth="6" fill="none" opacity="0.9" />
          <path d="M-20 300 Q 180 280 400 480" stroke="#BFDBFE" strokeWidth="14" fill="none" opacity="0.7" />
        </svg>

        {/* Center Captain Location Blue Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <div className="size-16 rounded-full bg-blue-500/15 border border-blue-400/30 flex items-center justify-center animate-pulse">
            <div className="size-4.5 rounded-full bg-blue-600 border-2.5 border-white shadow-md" />
          </div>
          <span className="absolute -bottom-6 font-bold text-[11px] text-zinc-700 bg-white/90 px-2 py-0.5 rounded-md shadow-2xs border border-zinc-200">
            Kasganj Center
          </span>
        </div>
      </div>

      {/* Bottom Sheet Card (Exact Match to Reference Video 00:26 - 00:28) */}
      <div
        className="relative z-20 w-full bg-white rounded-t-3xl border-t border-zinc-200 shadow-2xl p-5 space-y-4"
        style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 24px), 32px)" }}
      >
        {/* Surge Fare Area Row with Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Flame className="size-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900">Surge Fare Area</h3>
              <p className="text-xs text-zinc-500">Live peak multiplier zones in Kasganj</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(30);
              setIsSurgeEnabled((prev) => !prev);
            }}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              isSurgeEnabled ? "bg-emerald-500" : "bg-zinc-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isSurgeEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Warning Banner (Video 00:27 Match) */}
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200/90 rounded-2xl text-rose-800 text-xs font-bold">
          <AlertCircle className="size-4 shrink-0 text-rose-600 stroke-[2.4]" />
          <span>No surge nearby! Standard base rates active across Kasganj.</span>
        </div>
      </div>
    </div>
  );
};
