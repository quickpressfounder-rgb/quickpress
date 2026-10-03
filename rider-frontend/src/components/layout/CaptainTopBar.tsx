import React, { useState } from "react";
import { Bell, Menu, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { isAudioMuted, toggleAudioMuted, triggerHaptic } from "../../lib/captain-audio";
import { toast } from "sonner";

interface CaptainTopBarProps {
  isOnline: boolean;
  onToggleDuty: () => void;
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
  loading?: boolean;
}

export const CaptainTopBar: React.FC<CaptainTopBarProps> = ({
  isOnline,
  onToggleDuty,
  onOpenDrawer,
  onOpenNotifications,
  notificationCount = 0,
  loading = false,
}) => {
  const { t } = useLanguage();
  const [muted, setMuted] = useState(() => isAudioMuted());

  const handleToggleSound = () => {
    triggerHaptic(30);
    const next = toggleAudioMuted();
    setMuted(next);
    toast.info(next ? "Audio Alerts Muted 🔇" : "Audio Alerts Active 🔊");
  };

  const handleDutyClick = () => {
    triggerHaptic(45);
    onToggleDuty();
  };

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-3.5 pb-2.5 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs select-none"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
    >
      {/* Left: Hamburger Menu */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(25);
          onOpenDrawer();
        }}
        aria-label="Open Navigation Menu"
        className="flex items-center justify-center size-9 -ml-1 text-zinc-800 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
      >
        <Menu className="size-5 stroke-[2.2]" />
      </button>

      {/* Center: Duty Toggle Pill (OFF DUTY / ON DUTY) */}
      <button
        type="button"
        disabled={loading}
        onClick={handleDutyClick}
        className={`relative flex items-center justify-between h-9 px-3 min-w-[136px] rounded-full transition-all duration-300 border shadow-xs ${
          isOnline
            ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/20"
            : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-150"
        } ${loading ? "opacity-75 cursor-not-allowed" : "active:scale-95 cursor-pointer"}`}
      >
        <div className="flex items-center gap-1.5">
          {isOnline && (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
          )}
          <span className="text-[11px] font-black tracking-wider uppercase">
            {loading ? "Updating..." : isOnline ? t("dash.onDuty", "ON DUTY") : t("dash.offDuty", "OFF DUTY")}
          </span>
        </div>

        {/* Switch Toggle Dot */}
        <div
          className={`flex items-center justify-center size-6 rounded-full transition-all duration-300 shadow-2xs ${
            isOnline
              ? "bg-emerald-600 text-white shadow-emerald-600/40 ml-2"
              : "bg-zinc-400 text-white ml-2"
          }`}
        >
          <div className="size-2 rounded-full bg-white shadow-xs" />
        </div>
      </button>

      {/* Right: Audio Control & Notifications */}
      <div className="flex items-center gap-1.5 -mr-1">
        {/* Sound Toggle Button */}
        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={muted ? "Unmute Audio" : "Mute Audio"}
          className={`relative flex items-center justify-center size-8.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
            muted
              ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
          title={muted ? "Audio Alerts Muted" : "Audio Alerts Active"}
        >
          {muted ? (
            <VolumeX className="size-4 stroke-[2.2]" />
          ) : (
            <Volume2 className="size-4 stroke-[2.2]" />
          )}
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(25);
            if (onOpenNotifications) onOpenNotifications();
          }}
          aria-label="Notifications"
          className="relative flex items-center justify-center size-8.5 text-zinc-700 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
        >
          <Bell className="size-4.5 stroke-[2.2]" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-black text-white bg-red-600 rounded-full border-2 border-white shadow-xs">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
