import React, { useState } from "react";
import { IconClose, IconCheck, IconMapPin } from "./Icons";

interface AreaUnavailableModalProps {
  isOpen: boolean;
  cityName: string;
  onClose: () => void;
  onSwitchToKasganj: () => void;
  onShowToast: (msg: string) => void;
}

export function AreaUnavailableModal({
  isOpen,
  cityName,
  onClose,
  onSwitchToKasganj,
  onShowToast,
}: AreaUnavailableModalProps) {
  const [contactInput, setContactInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInput.trim()) return;
    setIsSubmitted(true);
    onShowToast(`🎉 You're on the priority waitlist for ${cityName || "your city"}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-slide-up max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-5 text-3xl shadow-sm">
          🚚
        </div>

        <div className="text-center space-y-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-live-dot" />
            Service Area Notice
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-950">
            We haven't launched in {cityName || "your area"} yet!
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
            QuickPress currently operates exclusively across <strong className="text-emerald-900 font-bold">Kasganj, Uttar Pradesh</strong> with sub-12 minute captain dispatch and guaranteed 45-min doorstep pickup.
          </p>
        </div>

        {/* Current Active City Info Card */}
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
          <IconMapPin className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-black text-emerald-950">Active Super-Hub: Kasganj, UP</div>
            <p className="text-emerald-800/90 text-[11px] mt-0.5 leading-snug">
              24 Partner Laundromats • Sub-12 min pickup • Live GPS order tracking active.
            </p>
          </div>
        </div>

        {/* Priority Waitlist Form */}
        {!isSubmitted ? (
          <form onSubmit={handleWaitlistSubmit} className="space-y-3 mb-6 text-left">
            <label className="block text-xs font-bold text-gray-800">
              Want QuickPress in {cityName || "your city"}? Get notified on launch:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="Enter Mobile Number or Email"
                required
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                Notify Me
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              Zero spam. We'll only send a single launch alert when captains go live in your pincode.
            </p>
          </form>
        ) : (
          <div className="bg-emerald-100/70 border border-emerald-300 rounded-2xl p-4 mb-6 text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center mx-auto text-sm font-bold">
              ✓
            </div>
            <div className="text-xs font-black text-emerald-950">You're on the priority waitlist!</div>
            <p className="text-[11px] text-emerald-800">
              We'll notify you as soon as QuickPress expands to {cityName || "your area"}.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onSwitchToKasganj}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-black text-xs shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Switch to Kasganj Hub (Explore Services Demo)</span>
            <span>→</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-800 font-bold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
