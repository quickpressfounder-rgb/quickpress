import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Bell, ChevronDown, UserRound } from "lucide-react";

import { partnerRoutes } from "../../navigation/partner-routes";
import type { DashboardShop } from "./DashboardCards";

/**
 * Sprint 3.2 — Partner dashboard top header.
 * Shop logo, shop name, partner name, online/offline toggle, bell, profile.
 */
export function DashboardHeader({
  shop,
  isOnline,
  onToggleOnline,
}: {
  shop: DashboardShop;
  isOnline: boolean;
  onToggleOnline: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 w-full app-header-safe bg-white/95 backdrop-blur-md border-b border-zinc-200/60 shadow-2xs">
      <div className="glass-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-black tracking-tight text-brand-dark">
            {shop.logoInitials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-foreground md:text-base">
              {shop.shopName}
            </p>
            <p className="flex min-w-0 items-center gap-1.5 text-[0.68rem] font-semibold text-muted-foreground">
              <span className="truncate">{shop.partnerName}</span>
              {shop.isVerified ? (
                <span className="flex shrink-0 items-center gap-0.5 text-brand-green">
                  <BadgeCheck className="size-3.5" /> Verified
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <OnlineToggle isOnline={isOnline} onToggle={onToggleOnline} />

          <button
            type="button"
            aria-label="Notifications"
            onClick={() => navigate({ to: partnerRoutes.notifications })}
            className="relative flex size-10 items-center justify-center rounded-2xl bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <Bell className="size-5" />
            {shop.notifications > 0 ? (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-secondary text-[0.55rem] font-black text-secondary-foreground">
                {shop.notifications}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            aria-label="Profile"
            onClick={() => navigate({ to: partnerRoutes.profile })}
            className="flex items-center gap-1 rounded-2xl bg-muted px-2 py-2 text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <UserRound className="size-5" />
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}

function OnlineToggle({ isOnline, onToggle }: { isOnline: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOnline}
      aria-label="Online status"
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-full px-2 py-1.5 transition-all duration-300 active:scale-[0.95] ${
        isOnline ? "bg-secondary/15" : "bg-muted"
      }`}
    >
      <span className="relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300"
        style={{ backgroundColor: isOnline ? "var(--brand-green)" : "var(--muted-foreground)" }}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-background shadow-soft transition-all duration-300 ${
            isOnline ? "left-[1.15rem]" : "left-0.5"
          }`}
        />
      </span>
      <span
        className={`hidden text-[0.66rem] font-black uppercase tracking-wider sm:block ${
          isOnline ? "text-brand-green" : "text-muted-foreground"
        }`}
      >
        {isOnline ? "Online" : "Offline"}
      </span>
    </button>
  );
}
