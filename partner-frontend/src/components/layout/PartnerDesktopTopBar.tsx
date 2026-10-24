import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Globe,
  HelpCircle,
  LogOut,
  Search,
  Settings2,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { partnerRoutes } from "../../navigation/partner-routes";
import { useLanguage } from "../../lib/i18n";
import { fetchPartnerUnreadCount } from "@/api/partner/partner-profile-api";
import { subscribePartnerNotifications } from "../../lib/partner-socket";
import { playPartnerOrderAlertChime } from "../../lib/partner-order-alert-sound";

export function PartnerDesktopTopBar({
  title,
  subtitle,
  shopName,
  shopLogo,
  isOnline,
  onToggleStatus,
  onLogout,
  unreadCount = 0,
  searchQuery = "",
  onSearchChange,
}: {
  title?: string;
  subtitle?: string;
  shopName?: string;
  shopLogo?: string;
  isOnline?: boolean;
  onToggleStatus?: () => void;
  onLogout?: () => void;
  unreadCount?: number;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  const { language, openLanguageModal } = useLanguage();
  const [imgFailed, setImgFailed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(unreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    void fetchPartnerUnreadCount().then((cnt) => {
      if (mounted) setLiveUnreadCount(cnt);
    });
    const unsub = subscribePartnerNotifications(() => {
      if (mounted) setLiveUnreadCount((prev) => prev + 1);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    setImgFailed(false);
  }, [shopLogo]);

  // Close dropdowns on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleTestChime = () => {
    try {
      playPartnerOrderAlertChime();
      toast.success("Order alert buzzer test ringing!");
    } catch {
      toast.error("Could not play sound. Please click anywhere to enable audio.");
    }
  };

  const displayName = (shopName || "Himanshu").split(" ")[0];

  return (
    <header className="sticky top-0 z-30 hidden h-14 w-full items-center justify-between border-b border-zinc-200/80 bg-white px-5 md:flex select-none">
      {/* Left: Classic Zomato-style brand wordmark */}
      <div className="flex items-center gap-3">
        <Link
          to={partnerRoutes.dashboard}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
        >
          <span className="text-[22px] font-black tracking-tight text-zinc-950 font-sans lowercase">
            quickpress
          </span>
        </Link>
      </div>

      {/* Right: Controls matching Zomato Merchant top bar */}
      <div className="flex items-center gap-3">
        {/* Assistant / Buzzer Test AI Circular Button */}
        <button
          type="button"
          onClick={handleTestChime}
          title="Test Order Alert Sound (🔊)"
          className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="size-4 fill-white text-white" />
        </button>

        {/* Notifications Bell with Red Badge */}
        <Link
          to={partnerRoutes.notifications}
          title="Notifications"
          className="relative flex size-8 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-all cursor-pointer"
        >
          <Bell className="size-4.5 stroke-[2.2]" />
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-2xs">
            {Math.max(unreadCount, liveUnreadCount, 1)}
          </span>
        </Link>

        {/* Settings Gear */}
        <Link
          to={partnerRoutes.settings}
          title="Store Settings"
          className="flex size-8 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-all cursor-pointer"
        >
          <Settings2 className="size-4.5 stroke-[2.2]" />
        </Link>

        {/* Share Feedback text link */}
        <button
          type="button"
          onClick={() => {
            toast.info("Share feedback: email official.quickpress@gmail.com");
          }}
          className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline decoration-zinc-300 hover:decoration-zinc-800 transition-colors cursor-pointer px-1"
        >
          Share feedback
        </button>

        {/* Store Status Dropdown Pill (Offline ▾ / Online ▾) */}
        <div className="relative" ref={statusRef}>
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              isOnline
                ? "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                : "border-rose-300 bg-white text-rose-600 hover:bg-rose-50"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>{isOnline ? "Online" : "Offline"}</span>
            <ChevronDown
              className={`size-3 transition-transform duration-200 ${
                statusDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Quick Status Toggle Dropdown */}
          {statusDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in duration-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (!isOnline && onToggleStatus) onToggleStatus();
                  setStatusDropdownOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-bold transition-colors cursor-pointer ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Online (Accepting Orders)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isOnline && onToggleStatus) onToggleStatus();
                  setStatusDropdownOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-bold transition-colors cursor-pointer ${
                  !isOnline
                    ? "bg-rose-50 text-rose-700"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span className="size-2 rounded-full bg-rose-500" />
                <span>Offline (Paused / Closed)</span>
              </button>
            </div>
          )}
        </div>

        {/* Store Profile Avatar Pill (Himans... ▾) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2.5 text-xs font-bold text-zinc-900 transition-all hover:bg-zinc-50 cursor-pointer shadow-2xs"
            aria-expanded={dropdownOpen}
          >
            <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700 font-black text-[11px]">
              {shopLogo && !imgFailed ? (
                <img
                  src={shopLogo}
                  alt={shopName || "Partner"}
                  className="size-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <UserRound className="size-3.5 text-blue-700" />
              )}
            </div>
            <span className="max-w-[80px] truncate font-bold text-zinc-900">
              {displayName}
            </span>
            <ChevronDown
              className={`size-3 text-zinc-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-xs font-black text-zinc-900 truncate">
                  {shopName || "Partner Store"}
                </p>
                <p className="text-[10px] font-semibold text-zinc-500">
                  QuickPress Partner Outlet
                </p>
              </div>

              <div className="py-1 space-y-0.5 text-xs">
                <Link
                  to={partnerRoutes.shop}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                >
                  <Store className="size-4 text-zinc-500" />
                  <span>Outlet Info</span>
                </Link>

                <Link
                  to={partnerRoutes.services}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                >
                  <Sparkles className="size-4 text-zinc-500" />
                  <span>Menu &amp; Rate Card</span>
                </Link>

                <Link
                  to={partnerRoutes.settings}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                >
                  <Settings2 className="size-4 text-zinc-500" />
                  <span>Store Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    openLanguageModal();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="size-4 text-zinc-500" />
                    <span>Language</span>
                  </div>
                  <span className="uppercase text-[10px] font-black bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">
                    {language}
                  </span>
                </button>
              </div>

              {onLogout && (
                <div className="pt-1 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="size-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
