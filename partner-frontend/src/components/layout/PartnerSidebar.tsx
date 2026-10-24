import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Globe,
  HelpCircle,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import {
  partnerRoutes,
  partnerOperationsLinks,
  partnerManagementLinks,
} from "../../navigation/partner-routes";
import { useLanguage } from "../../lib/i18n";

export function PartnerSidebar({
  shopName,
  shopLogo,
  isOnline,
  onToggleStatus,
  onLogout,
}: {
  shopName?: string;
  shopLogo?: string;
  isOnline?: boolean;
  onToggleStatus?: () => void;
  onLogout?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { language, openLanguageModal, t } = useLanguage();
  const [logoFailed, setLogoFailed] = useState(false);
  const [bottomLogoFailed, setBottomLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
    setBottomLogoFailed(false);
  }, [shopLogo]);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-zinc-200/80 bg-white transition-all duration-300 md:flex lg:w-72 select-none">
      {/* Brand Header: Official Transparent QuickPress Partner Logo */}
      <div className="flex flex-col border-b border-zinc-200/80 px-5 pt-4 pb-3.5 bg-white">
        <Link to={partnerRoutes.dashboard} className="flex items-center gap-2 group transition-opacity hover:opacity-90">
          <img
            src="/quickpress-partner-onboarding-transparent.png"
            alt="QuickPress Partner"
            className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Merchant Outlet Identity Pill */}
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-2 transition-all hover:border-zinc-300">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-50 flex items-center justify-center text-emerald-800 font-black text-xs">
            {shopLogo && !logoFailed ? (
              <img
                src={shopLogo}
                alt={shopName || "QuickPress Store"}
                className="size-full object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Store className="size-4.5 text-emerald-700" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="truncate font-black text-xs text-zinc-950 tracking-tight"
              title={shopName || "Partner Store"}
            >
              {shopName || "Partner Store"}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="size-1.5 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
              <p className="text-[10px] font-black text-emerald-700 truncate flex items-center gap-0.5">
                <span>✓</span> Verified Merchant Outlet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Zomato-style Store Status Card with Instant Smooth Switch */}
      <div className="px-4 pt-3 pb-1">
        <div className={`flex items-center justify-between rounded-2xl border p-3 transition-all duration-200 ${
          isOnline
            ? "border-emerald-200/90 bg-emerald-50/50 shadow-2xs"
            : "border-zinc-200 bg-zinc-50/80"
        }`}>
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2.5 rounded-full transition-all duration-300 ${
                isOnline
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                  : "bg-zinc-400"
              }`}
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                {t("common.storeStatus", "Store Acceptance")}
              </p>
              <p className={`text-xs font-black ${isOnline ? "text-emerald-950" : "text-zinc-700"}`}>
                {isOnline ? "Accepting Orders 🟢" : "Store Paused / Closed 🔴"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleStatus}
            aria-label="Toggle store online status"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isOnline ? "bg-emerald-600" : "bg-zinc-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isOnline ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
          {t("nav.operations", "Operations")}
        </div>
        {partnerOperationsLinks.map((link) => {
          const isActive = pathname === link.to || (link.to !== "/dashboard" && pathname.startsWith(`${link.to}/`));
          const Icon = link.icon;
          const translatedLabel = t(`nav.${link.id}`, link.label);
          return (
            <Link
              key={link.id}
              to={link.to}
              className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs border border-emerald-200/90"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-emerald-600" : "text-zinc-500 group-hover:text-zinc-900"
                }`}
              />
              <span className="flex-1 truncate">{translatedLabel}</span>
              {link.id === "dashboard" && (
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              )}
            </Link>
          );
        })}

        <div className="pt-3 px-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
          {t("nav.management", "Management")}
        </div>
        {partnerManagementLinks.map((link) => {
          const isActive = pathname === link.to || (link.to !== "/dashboard" && pathname.startsWith(`${link.to}/`));
          const Icon = link.icon;
          const translatedLabel = t(`nav.${link.id}`, link.label);
          return (
            <Link
              key={link.id}
              to={link.to}
              className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs border border-emerald-200/90"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-emerald-600" : "text-zinc-500 group-hover:text-zinc-900"
                }`}
              />
              <span className="flex-1 truncate">{translatedLabel}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="border-t border-zinc-200/80 p-4 space-y-2 bg-white">
        {/* Language Selection Button */}
        <button
          type="button"
          onClick={openLanguageModal}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-2.5 transition-colors hover:bg-zinc-100 active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-emerald-600" />
            <span className="text-xs font-bold text-zinc-900">
              {t("common.language", "Language / भाषा")}
            </span>
          </div>
          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
            {language}
          </span>
        </button>

        <Link
          to={partnerRoutes.profile}
          className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-zinc-50"
        >
          <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-50 flex items-center justify-center text-emerald-800 font-black text-xs">
            {shopLogo && !bottomLogoFailed ? (
              <img
                src={shopLogo}
                alt={shopName || "Partner Account"}
                className="size-full object-cover"
                onError={() => setBottomLogoFailed(true)}
              />
            ) : (
              <span>{(shopName || "QP").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-zinc-950">
              {shopName || "Partner Account"}
            </p>
            <p className="text-[10px] text-zinc-500 font-semibold">
              {t("common.manageProfile", "Manage profile & KYC")}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
        >
          <LogOut className="size-4" />
          <span>{t("common.signOut", "Sign out")}</span>
        </button>
      </div>
    </aside>
  );
}
