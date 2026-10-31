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
          className={`relative flex items-center justify-between h-8 min-w-[96px] px-2.5 rounded-full cursor-pointer select-none transition-all duration-300 shadow-sm active:scale-95 ${
            isOnline
              ? "bg-[#16a34a] hover:bg-[#15803d] text-white"
              : "bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
          }`}
        >
          {/* Label Text */}
          <span
            className={`text-[12px] font-black tracking-wide transition-colors duration-200 flex items-center gap-1.5 ${
              isOnline ? "text-white pl-0.5" : "text-zinc-700 pr-5"
            }`}
          >
            {isOnline && (
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
            )}
            {isOnline ? "Online" : "Offline"}
          </span>

          {/* Sliding Circular Knob */}
          <span
            className={`size-5 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ease-out ${
              isOnline ? "translate-x-0" : "-translate-x-14"
            }`}
          >
            {isToggling ? (
              <span className="size-2.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            ) : isOnline ? (
              <span className="size-2 rounded-full bg-emerald-600" />
            ) : (
              <span className="size-2 rounded-full bg-zinc-400" />
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
