import React, { useState } from "react";
import { Bell, MapPin, Menu, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { isAudioMuted, toggleAudioMuted } from "../../lib/captain-audio";
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
    const next = toggleAudioMuted();
    setMuted(next);
    toast.info(next ? "Audio Alerts Muted 🔇" : "Audio Alerts Active 🔊");
  };

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-3.5 pb-2.5 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs select-none"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
    >
      {/* Left: Hamburger Menu */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open Navigation Menu"
        className="flex items-center justify-center size-9 -ml-1 text-zinc-800 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all"
      >
        <Menu className="size-5 stroke-[2.2]" />
      </button>

      {/* Center: Duty Toggle Pill (OFF DUTY / ON DUTY) */}
      <button
        type="button"
        disabled={loading}
        onClick={onToggleDuty}
        className={`relative flex items-center justify-between h-9 px-3 min-w-[132px] rounded-full transition-all duration-300 border shadow-xs ${
          isOnline
            ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/15"
            : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-150"
        } ${loading ? "opacity-75 cursor-not-allowed" : "active:scale-95 cursor-pointer"}`}
      >
        <span className="text-[11px] font-black tracking-wider uppercase">
          {loading ? "Updating..." : isOnline ? t("dash.onDuty", "ON DUTY") : t("dash.offDuty", "OFF DUTY")}
        </span>

        {/* Switch Toggle Dot */}
        <div
          className={`flex items-center justify-center size-6 rounded-full transition-all duration-300 shadow-2xs ${
            isOnline
              ? "bg-emerald-600 text-white shadow-emerald-600/30 ml-2"
              : "bg-zinc-400 text-white ml-2"
          }`}
        >
          <div className="size-2 rounded-full bg-white" />
        </div>
      </button>

      {/* Right: Audio Control & Notifications */}
      <div className="flex items-center gap-1.5 -mr-1">
        {/* Sound Toggle Button */}
        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={muted ? "Unmute Audio" : "Mute Audio"}
          className={`relative flex items-center justify-center size-8.5 rounded-xl transition-all active:scale-95 ${
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
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="relative flex items-center justify-center size-8.5 text-zinc-700 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all"
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
