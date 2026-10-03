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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-border/80 bg-background/85 px-8 backdrop-blur-md md:flex">
      {/* Title & Subtitle or Search */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          {displayTitle}
        </h1>
        {subtitle ? (
          <p className="text-xs font-semibold text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {onSearchChange ? (
          <div className="relative w-56 lg:w-72">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("common.searchPlaceholder", "Search orders, customers, services...")}
              className="h-10 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-xs font-medium text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : null}

        {/* Analytics Shortcut Button */}
        <Link
          to={partnerRoutes.analytics}
          title="Store Analytics & Growth"
          className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-95 shadow-2xs"
        >
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden lg:inline">{t("nav.analytics", "Analytics")}</span>
        </Link>

        {/* Language Switcher Button */}
        <button
          type="button"
          onClick={openLanguageModal}
          title="Change App Language"
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-95 cursor-pointer shadow-2xs"
        >
          <Globe className="size-4 text-amber-500" />
          <span className="font-extrabold">{currentLang?.nativeName || "Language"}</span>
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 dark:text-amber-300">
            {language}
          </span>
        </button>

        {/* Store Live Status Pill */}
        <button
          type="button"
          onClick={onToggleStatus}
          className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isOnline
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              isOnline ? "bg-emerald-500 animate-ping inline-block" : "bg-zinc-400"
            }`}
          />
          <span>{isOnline ? t("common.storeOnline", "Store Online") : t("common.storeOffline", "Store Offline")}</span>
        </button>

        {/* Notifications */}
        <Link
          to={partnerRoutes.notifications}
          className="relative flex size-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white">
              {unreadCount}
            </span>
          ) : null}
        </Link>

        {/* Store Profile Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-card p-1.5 pr-2.5 transition-colors hover:bg-muted cursor-pointer active:scale-95"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="relative size-7 shrink-0 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-[11px]">
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
            <span className="text-xs font-bold text-foreground max-w-[130px] truncate">
              {shopName || "Partner Store"}
            </span>
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
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
