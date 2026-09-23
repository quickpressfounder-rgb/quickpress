import React from "react";
import { Navigation, MapPin, ShieldAlert, ShieldCheck } from "lucide-react";

interface CaptainLocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export function CaptainLocationPermissionModal({
  isOpen,
  onAllow,
  onDeny,
}: CaptainLocationPermissionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-center space-y-5 animate-in slide-in-from-bottom duration-300">
        {/* Icon Header */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-inner">
          <Navigation className="size-8 stroke-[2.5]" />
        </div>

        {/* Heading & Mandatory Prompt Text */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            High-Priority Duty Permission
          </span>
          <h2 className="text-xl font-black tracking-tight text-slate-950">
            Location Access
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed px-1">
            QuickPress uses your location to assign delivery requests, coordinate pickups and deliveries, provide delivery status, improve operational efficiency and support platform safety.
          </p>
        </div>

        {/* Explicit Background Location Explanation Box */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-left text-xs space-y-2.5 text-slate-800">
          <div className="flex items-start gap-2.5">
            <MapPin className="size-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Why background location is needed:</p>
              <p className="text-[11px] text-slate-600 leading-normal">
                To alert you of nearby doorstep pickup offers even when your phone is locked or mounted on your bike.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">When it is collected:</p>
              <p className="text-[11px] text-slate-600 leading-normal">
                Collected strictly while marked <strong>ON DUTY</strong>. Location sharing ceases immediately the second you toggle Duty to <strong>OFF</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Navigation className="size-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Payout calculation:</p>
              <p className="text-[11px] text-slate-600 leading-normal">
                Trip fares are calculated automatically based on accurate GPS distance traveled (₹8/km).
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onAllow}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Allow Location</span>
          </button>
          <button
            type="button"
            onClick={onDeny}
            className="w-full h-10 rounded-2xl text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Not Now
          </button>
        </div>

        {/* Learn More Link */}
        <div className="border-t border-slate-100 pt-3">
          <a
            href="https://with.quickpress.com/#privacy"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
          >
            <span>Learn more about Location & Privacy</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
