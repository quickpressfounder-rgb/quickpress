import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Globe,
  LogOut,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
} from "lucide-react";

import { partnerRoutes } from "../../navigation/partner-routes";
import { useLanguage, SUPPORTED_LANGUAGES } from "../../lib/i18n";

import { fetchPartnerUnreadCount } from "@/api/partner/partner-profile-api";
import { subscribePartnerNotifications } from "../../lib/partner-socket";

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
  const { language, openLanguageModal, t } = useLanguage();
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const [imgFailed, setImgFailed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(unreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const displayTitle = title
    ? (title.toLowerCase() === "dashboard" ? t("nav.dashboard", "Dashboard")
       : title.toLowerCase() === "profile" ? t("nav.profile", "Profile")
       : title.toLowerCase() === "orders" ? t("nav.orders", "Orders")
       : title.toLowerCase() === "services" ? t("nav.services", "Services")
       : title.toLowerCase() === "settings" ? t("nav.settings", "Settings")
       : title.toLowerCase() === "shop" || title.toLowerCase() === "store" ? t("nav.store", "Store")
       : title.toLowerCase() === "analytics" ? t("nav.analytics", "Analytics")
       : title)
    : t("nav.dashboard", "Dashboard");

  return (
    <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-slate-200/90 bg-white px-8 md:flex">
      {/* Title & Subtitle or Search */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-950">
          {displayTitle}
        </h1>
        {subtitle ? (
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {onSearchChange ? (
          <div className="relative w-56 lg:w-72">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("common.searchPlaceholder", "Search orders, customers, services...")}
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            />
          </div>
        ) : null}

        {/* Analytics Shortcut Button */}
        <Link
          to={partnerRoutes.analytics}
          title="Store Analytics & Growth"
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 transition-all hover:bg-slate-50 active:scale-95 shadow-2xs"
        >
          <TrendingUp className="size-4 text-blue-600" />
          <span className="hidden lg:inline">{t("nav.analytics", "Analytics")}</span>
        </Link>

        {/* Language Switcher Button */}
        <button
          type="button"
          onClick={openLanguageModal}
          title="Change App Language"
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 transition-all hover:bg-slate-50 active:scale-95 cursor-pointer shadow-2xs"
        >
          <Globe className="size-4 text-blue-600" />
          <span className="font-extrabold">{currentLang?.nativeName || "Language"}</span>
          <span className="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
            {language}
          </span>
        </button>

        {/* Store Live Status Pill */}
        <button
          type="button"
          onClick={onToggleStatus}
          className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isOnline
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-100 text-slate-600"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              isOnline ? "bg-blue-600 animate-ping inline-block" : "bg-slate-400"
            }`}
          />
          <span>{isOnline ? t("common.storeOnline", "Store Online") : t("common.storeOffline", "Store Offline")}</span>
        </button>

        {/* Notifications */}
        <Link
          to={partnerRoutes.notifications}
          className="relative flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 transition-colors hover:bg-slate-50 shadow-2xs"
        >
          <Bell className="size-4" />
          {Math.max(unreadCount, liveUnreadCount) > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-black text-[9px] font-black text-white">
              {Math.max(unreadCount, liveUnreadCount) > 9 ? "9+" : Math.max(unreadCount, liveUnreadCount)}
            </span>
          ) : null}
        </Link>

        {/* Store Profile Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-1.5 pr-2.5 transition-colors hover:bg-slate-50 cursor-pointer active:scale-95 shadow-2xs"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="relative size-7 shrink-0 overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white font-black text-[11px]">
              {shopLogo && !imgFailed ? (
                <img
                  src={shopLogo}
                  alt={shopName || "Partner Store"}
                  className="size-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span>{(shopName || "QP").slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs font-black text-slate-950 max-w-[130px] truncate">
              {shopName || "Partner Store"}
            </span>
            <ChevronDown
              className={`size-3.5 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Interactive Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Store Identity Header */}
              <div className="px-3 py-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-black text-foreground truncate">{shopName || "Partner Store"}</p>
                </div>
                <p className="mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓</span> Verified Merchant Outlet
                </p>
              </div>

              {/* Navigation Links */}
              <div className="py-1 space-y-0.5">
                <Link
                  to={partnerRoutes.profile}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <UserRound className="size-4 text-muted-foreground" />
                  <span>Store Profile & KYC</span>
                </Link>

                <Link
                  to={partnerRoutes.analytics}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Analytics & Growth</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                    Live
                  </span>
                </Link>

                <Link
                  to={partnerRoutes.shop}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <Sparkles className="size-4 text-muted-foreground" />
                  <span>Store Management</span>
                </Link>

                <Link
                  to={partnerRoutes.settings}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <Settings2 className="size-4 text-muted-foreground" />
                  <span>Store Settings</span>
                </Link>
              </div>

              {/* Sign Out Option */}
              {onLogout && (
                <div className="pt-1 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
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
