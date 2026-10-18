import React, { useState } from "react";
import { ArrowLeft, Heart, Info, Trash2, Plus, MapPin, X } from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";
import { toast } from "sonner";

interface CaptainGoToAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
}

export const CaptainGoToAreaModal: React.FC<CaptainGoToAreaModalProps> = ({
  isOpen,
  onClose,
  isActive,
  onToggleActive,
}) => {
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [savedAreas, setSavedAreas] = useState<string[]>([
    "Nameni, Uttar Pradesh, India",
    "Kasganj Junction, Railway Colony",
  ]);

  if (!isOpen) return null;

  const handleToggle = () => {
    triggerHaptic(30);
    if (!isActive) {
      setShowConfirmPopup(true);
    } else {
      onToggleActive(false);
      toast.info("Go To Area route filter disabled.");
    }
  };

  const handleConfirmOn = () => {
    triggerHaptic(40);
    setShowConfirmPopup(false);
    onToggleActive(true);
    toast.success("Go To Area activated for 45 minutes!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-zinc-900 select-none animate-in fade-in duration-200">
      {/* Top Header Bar (Video 00:31 Match) */}
      <header
        className="flex items-center gap-3 px-4 pb-3 border-b border-zinc-200 bg-white"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 52px)" }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            onClose();
          }}
          className="flex size-9 items-center justify-center rounded-xl text-zinc-800 hover:bg-zinc-100 active:scale-90 transition-all cursor-pointer"
        >
          <ArrowLeft className="size-5.5 stroke-[2.4]" />
        </button>
        <h1 className="text-base font-black text-zinc-950">Go to Area</h1>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pink Hero Banner (Video 00:31 Match) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 p-4 border border-rose-200/80 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="space-y-1 max-w-[240px]">
              <h2 className="text-sm font-black text-zinc-900 leading-snug">
                Get orders to your home or anywhere you want to go
              </h2>
              <button
                type="button"
                onClick={() => toast.info("Filter dispatches specifically towards your return journey home.")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800"
              >
                <Info className="size-3" />
                <span>Know more</span>
              </button>
            </div>
            <div className="flex size-11 items-center justify-center rounded-full bg-rose-100 text-rose-500 shrink-0 shadow-xs">
              <Heart className="size-6 fill-rose-500 text-rose-500" />
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-zinc-600">
            Saved drop areas (Switch ON up to 3 areas)
          </h3>
        </div>

        {/* Saved Areas List */}
        <div className="space-y-3">
          {savedAreas.map((area, idx) => (
            <div
              key={area}
              className="p-4 rounded-2xl border border-zinc-200/90 bg-white shadow-2xs flex items-center justify-between"
            >
              <div className="space-y-2 min-w-0 pr-2">
                <p className="text-xs font-black text-zinc-900 truncate">{area}</p>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setSavedAreas((prev) => prev.filter((_, i) => i !== idx));
                    toast.info("Area removed from saved list.");
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              {/* Area Switch Toggle */}
              <button
                type="button"
                onClick={handleToggle}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isActive ? "bg-amber-400" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div
        className="p-4 border-t border-zinc-200 bg-white"
        style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 20px)" }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic(25);
            toast.info("Tap on map to add custom Kasganj destination.");
          }}
          className="w-full py-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 font-black text-xs active:scale-98 transition-all cursor-pointer shadow-2xs"
        >
          Add new area
        </button>
      </div>

      {/* 45-Minute Confirmation Modal (Exact Match to Reference Video 00:32 - 00:33) */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-500 shadow-sm">
              <Heart className="size-8 fill-rose-500 text-rose-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-zinc-950">Go To Area is turned ON</h3>
              <p className="text-xs text-zinc-500 font-medium">
                You will get orders towards this area for the next 45 min
              </p>
            </div>

            {/* OK Yellow Button (Video 00:32 Match) */}
            <button
              type="button"
              onClick={handleConfirmOn}
              className="w-full py-3 bg-[#FFC107] hover:bg-[#FFB300] text-zinc-950 font-black text-sm rounded-xl active:scale-98 transition-all cursor-pointer shadow-md"
            >
              OK
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmPopup(false)}
              className="w-full text-xs font-bold text-zinc-500 hover:text-zinc-800 py-1 cursor-pointer"
            >
              Add more areas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
