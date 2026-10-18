import React, { useState } from "react";
import { Bell, ChevronDown, ChevronUp, MapPin, Menu, Wallet, History, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { isAudioMuted, toggleAudioMuted, triggerHaptic } from "../../lib/captain-audio";
import { toast } from "sonner";

interface CaptainTopBarProps {
  isOnline: boolean;
  onToggleDuty: () => void;
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
  onOpenEarnings?: () => void;
  onOpenLocation?: () => void;
  onOpenRateCard?: () => void;
  todayEarnings?: number;
  walletBalance?: number;
  lastOrderEarnings?: number;
  notificationCount?: number;
  loading?: boolean;
}

export const CaptainTopBar: React.FC<CaptainTopBarProps> = ({
  isOnline,
  onToggleDuty,
  onOpenDrawer,
  onOpenNotifications,
  onOpenEarnings,
  onOpenLocation,
  onOpenRateCard,
  todayEarnings = 0,
  walletBalance = 0,
  lastOrderEarnings = 0,
  notificationCount = 0,
  loading = false,
}) => {
  const { t } = useLanguage();
  const [isEarningsExpanded, setIsEarningsExpanded] = useState(false);
  const [muted, setMuted] = useState(() => isAudioMuted());

  const handleToggleSound = () => {
    triggerHaptic(30);
    const next = toggleAudioMuted();
    setMuted(next);
  };

  const handleDutyClick = () => {
    triggerHaptic(45);
    onToggleDuty();
  };

  return (
    <div className="sticky top-0 z-40 w-full select-none shadow-xs">
      {/* 1. Main White Header Bar */}
      <header
        className="flex items-center justify-between px-3.5 pb-2.5 bg-white border-b border-zinc-200/70"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 52px)" }}
      >
        {/* Left: Hamburger Menu */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(25);
            onOpenDrawer();
          }}
          aria-label="Open Navigation Menu"
          className="flex items-center justify-center size-9 -ml-1 text-zinc-900 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
        >
          <Menu className="size-5.5 stroke-[2.4]" />
        </button>

        {/* Center: Duty Toggle Pill (OFF DUTY / ON DUTY) - Screenshot 3 Match */}
        <button
          type="button"
          disabled={loading}
          onClick={handleDutyClick}
          className={`relative flex items-center justify-between h-9 px-3 min-w-[136px] rounded-full transition-all duration-300 border ${
            isOnline
              ? "bg-[#E8F5E9] border-[#A5D6A7] text-[#1B5E20]"
              : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-150"
          } ${loading ? "opacity-75 cursor-not-allowed" : "active:scale-95 cursor-pointer shadow-xs"}`}
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
                ? "bg-[#00C853] text-white ml-2"
                : "bg-zinc-400 text-white ml-2"
            }`}
          >
            <div className="size-2 rounded-full bg-white shadow-xs" />
          </div>
        </button>

        {/* Right: Map Pin & Notifications Bell (Screenshot 3 Match) */}
        <div className="flex items-center gap-1 -mr-1">
          {/* Location Pin */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              if (onOpenLocation) onOpenLocation();
            }}
            aria-label="Current Location"
            className="flex items-center justify-center size-9 text-zinc-700 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
          >
            <MapPin className="size-5 text-zinc-800 stroke-[2.2]" />
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(25);
              if (onOpenNotifications) onOpenNotifications();
            }}
            aria-label="Notifications"
            className="relative flex items-center justify-center size-9 text-zinc-800 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
          >
            <Bell className="size-5 stroke-[2.2]" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 flex size-2 rounded-full bg-red-600 ring-2 ring-white" />
            )}
          </button>
        </div>
      </header>

      {/* 2. Attached Rapido Sky-Blue Strip: Today's Earnings ₹0 ⌄ (Video 00:00, 00:14 Match) */}
      <div className="w-full bg-[#E8F0FE] border-b border-[#D2E3FC]">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsEarningsExpanded((prev) => !prev);
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[#1E3A8A] active:bg-[#DBEAFE] transition-colors cursor-pointer"
        >
          <span className="text-xs font-bold tracking-tight text-zinc-800">
            {t("earnings.todayEarnings", "Today's Earnings")}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-black">
              ₹{todayEarnings.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            {isEarningsExpanded ? (
              <ChevronUp className="size-4 text-zinc-700 stroke-[2.5]" />
            ) : (
              <ChevronDown className="size-4 text-zinc-700 stroke-[2.5]" />
            )}
          </div>
        </button>

        {/* Expandable 3-Card Dropdown (Video 00:00 & 00:14) */}
        {isEarningsExpanded && (
          <div className="px-3 pb-3 pt-1 animate-in slide-in-from-top-2 duration-200 space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              {/* Card 1: Balance */}
              <div
                onClick={() => {
                  triggerHaptic(20);
                  if (onOpenEarnings) onOpenEarnings();
                }}
                className="bg-white p-2.5 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-bold text-zinc-600 truncate">Balance</span>
                  <Wallet className="size-3 text-emerald-600" />
                </div>
                <span className="text-sm font-black text-zinc-950 truncate">
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Card 2: Today's Earnings */}
              <div
                onClick={() => {
                  triggerHaptic(20);
                  if (onOpenEarnings) onOpenEarnings();
                }}
                className="bg-white p-2.5 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-bold text-zinc-600 truncate">Today's</span>
                  <span className="text-[10px] font-black text-blue-600">₹</span>
                </div>
                <span className="text-sm font-black text-zinc-950 truncate">
                  ₹{todayEarnings.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Card 3: Last Order Earnings */}
              <div
                onClick={() => {
                  triggerHaptic(20);
                  if (onOpenEarnings) onOpenEarnings();
                }}
                className="bg-white p-2.5 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-bold text-zinc-600 truncate">Last Order</span>
                  <History className="size-3 text-amber-500" />
                </div>
                <span className="text-sm font-black text-zinc-950 truncate">
                  ₹{lastOrderEarnings.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* View Rate Card Link */}
            <div className="flex items-center justify-center pt-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  if (onOpenRateCard) onOpenRateCard();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 active:scale-95 transition-all cursor-pointer py-1 px-3 rounded-lg hover:bg-blue-100/50"
              >
                <ArrowUpRight className="size-3.5 stroke-[2.5]" />
                <span>View Rate Card</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

