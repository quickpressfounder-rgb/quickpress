import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePartnerContext } from "../../context/PartnerContext";
import { OfflineConfirmModal } from "./OfflineConfirmModal";

interface PartnerOnlineToggleProps {
  className?: string;
  showScheduleHint?: boolean;
}

export function PartnerOnlineToggle({
  className = "",
  showScheduleHint = false,
}: PartnerOnlineToggleProps) {
  const { isOnline, setOnline } = usePartnerContext();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Auto store timing check (8:00 AM - 10:00 PM)
  const [isWithinStoreHours, setIsWithinStoreHours] = useState(true);

  useEffect(() => {
    const checkHours = () => {
      const now = new Date();
      const currentHour = now.getHours();
      // Store open 8:00 AM (8) to 10:00 PM (22)
      setIsWithinStoreHours(currentHour >= 8 && currentHour < 22);
    };
    checkHours();
    const interval = setInterval(checkHours, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOnline) {
      // Prompt confirmation before going offline
      setShowConfirmModal(true);
    } else {
      // Instantly go online
      setIsToggling(true);
      setOnline(true);
      toast.success("Store is now ONLINE — Ready to receive laundry orders!");
      window.setTimeout(() => setIsToggling(false), 300);
    }
  };

  const handleConfirmOffline = (reason: string, durationMinutes?: number) => {
    setIsToggling(true);
    setOnline(false);
    setShowConfirmModal(false);
    const msg = durationMinutes
      ? `Store is paused for ${durationMinutes} mins (${reason})`
      : `Store is OFFLINE (${reason})`;
    toast.info(msg);
    window.setTimeout(() => setIsToggling(false), 300);
  };

  return (
    <>
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          disabled={isToggling}
          aria-label={isOnline ? "Switch to Offline" : "Switch to Online"}
          className={`group relative flex items-center h-8.5 w-[116px] px-1 rounded-full cursor-pointer select-none transition-colors duration-300 ease-in-out active:scale-95 border ${
            isOnline
              ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-500/50 text-white shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
              : "bg-zinc-100 hover:bg-zinc-200/80 border-zinc-200 text-zinc-600 shadow-2xs"
          }`}
        >
          {/* Text Labels Layer */}
          <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-black uppercase tracking-wider pointer-events-none">
            <span
              className={`transition-opacity duration-200 flex items-center gap-1.5 ${
                isOnline ? "opacity-100 text-white" : "opacity-0"
              }`}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-200 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
              </span>
              Online
            </span>
            <span
              className={`transition-opacity duration-200 ml-auto ${
                !isOnline ? "opacity-100 text-zinc-600" : "opacity-0"
              }`}
            >
              Offline
            </span>
          </div>

          {/* Smooth Sliding Circle Knob */}
          <span
            className={`size-6 rounded-full bg-white shadow-sm border border-zinc-200/50 flex items-center justify-center shrink-0 transition-transform duration-300 ease-out transform ${
              isOnline ? "translate-x-[82px]" : "translate-x-0"
            }`}
          >
            {isToggling ? (
              <span
                className={`size-3 rounded-full border-2 border-t-transparent animate-spin ${
                  isOnline ? "border-emerald-600" : "border-zinc-400"
                }`}
              />
            ) : (
              <span
                className={`size-2 rounded-full transition-colors duration-200 ${
                  isOnline ? "bg-emerald-600" : "bg-zinc-400"
                }`}
              />
            )}
          </span>
        </button>

        {/* Subtle auto store schedule indicator */}
        {showScheduleHint && !isWithinStoreHours && (
          <span
            className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
            title="Standard operating hours are 8:00 AM - 10:00 PM"
          >
            After Hours
          </span>
        )}
      </div>

      {/* Confirmation Bottom Sheet */}
      <OfflineConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmOffline}
        isLoading={isToggling}
      />
    </>
  );
}
