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
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border/80 bg-card/95 backdrop-blur-md transition-all duration-300 md:flex lg:w-72">
      {/* Partner Store Header with Real Store Image */}
      <div className="flex h-20 items-center gap-3 border-b border-border/60 px-5">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500/30 shadow-sm bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-base group">
          {shopLogo && !logoFailed ? (
            <img
              src={shopLogo}
              alt={shopName || "QuickPress Store"}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Store className="size-5.5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-black text-sm text-foreground tracking-tight"
            title={shopName || "Partner Store"}
          >
            {shopName || "Partner Store"}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
              <span>✓</span> {t("common.verifiedPartner", "Verified Partner")}
            </p>
          </div>
        </div>
      </div>

      {/* Store status card */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/40 p-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2.5 rounded-full ${
                isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" : "bg-zinc-400"
              }`}
            />
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {t("common.storeStatus", "Store Status")}
              </p>
              <p className="text-xs font-bold text-foreground">
                {isOnline ? t("common.acceptingOrders", "Accepting Orders") : t("common.storeClosed", "Store Closed")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleStatus}
            aria-label="Toggle store online status"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isOnline ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isOnline ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/70">
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
                  ? "bg-primary text-brand-dark shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-brand-dark" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span className="flex-1 truncate">{translatedLabel}</span>
            </Link>
          );
        })}

        <div className="pt-3 px-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/70">
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
                  ? "bg-primary text-brand-dark shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-brand-dark" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span className="flex-1 truncate">{translatedLabel}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="border-t border-border/70 p-4 space-y-2">
        {/* Language Selection Button */}
        <button
          type="button"
          onClick={openLanguageModal}
          className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-muted/40 p-2.5 transition-colors hover:bg-muted active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-foreground">
              {t("common.language", "Language / भाषा")}
            </span>
          </div>
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
            {language}
          </span>
        </button>

        <Link
          to={partnerRoutes.profile}
          className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted"
        >
          <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xs">
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
            <p className="truncate text-xs font-bold text-foreground">
              {shopName || "Partner Account"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("common.manageProfile", "Manage profile")}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="size-4" />
          <span>{t("common.signOut", "Sign out")}</span>
        </button>
      </div>
    </aside>
  );
}
