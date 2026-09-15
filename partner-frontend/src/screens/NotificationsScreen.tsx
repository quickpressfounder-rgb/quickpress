import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  Gift,
  PackageCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerListSkeleton } from "../components/PartnerSkeletons";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  fetchPartnerNotifications,
  markNotificationsRead,
} from "@/api/partner/partner-profile-api";
import type { PartnerNotification } from "@/shared/types/partner";

type FilterKind = "all" | "order" | "payout" | "alert" | "promo";

const KIND_META: Record<
  PartnerNotification["kind"],
  {
    icon: typeof PackageCheck;
    label: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconColor: string;
    borderColor: string;
  }
> = {
  order: {
    icon: PackageCheck,
    label: "Order",
    badgeBg: "bg-emerald-50 border border-emerald-200/80",
    badgeText: "text-emerald-700",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-500/30",
  },
  payout: {
    icon: Wallet,
    label: "Payout",
    badgeBg: "bg-blue-50 border border-blue-200/80",
    badgeText: "text-blue-700",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-600",
    borderColor: "border-blue-500/30",
  },
  alert: {
    icon: TriangleAlert,
    label: "Alert",
    badgeBg: "bg-amber-50 border border-amber-200/80",
    badgeText: "text-amber-800",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    borderColor: "border-amber-500/30",
  },
  promo: {
    icon: Gift,
    label: "Offer",
    badgeBg: "bg-purple-50 border border-purple-200/80",
    badgeText: "text-purple-700",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-600",
    borderColor: "border-purple-500/30",
  },
};

export function NotificationsScreen() {
  const navigate = useNavigate();
  const { data: items, setData } = usePartnerResource(fetchPartnerNotifications);
  const [selectedFilter, setSelectedFilter] = useState<FilterKind>("all");

  const unreadCount = useMemo(() => {
    return items ? items.filter((i) => !i.read).length : 0;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (selectedFilter === "all") return items;
    return items.filter((i) => i.kind === selectedFilter);
  }, [items, selectedFilter]);

  const handleReadAll = async () => {
    if (!items || unreadCount === 0) {
      toast.info("All notifications are already marked as read");
      return;
    }
    setData(items.map((item) => ({ ...item, read: true })));
    try {
      await markNotificationsRead();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications read");
    }
  };

  const handleMarkItemRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!items) return;
    setData(
      items.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const handleNotificationClick = (item: PartnerNotification) => {
    handleMarkItemRead(item.id);
    // If notification mentions an order or is order-kind, navigate to orders
    if (item.kind === "order" || item.title.toLowerCase().includes("order")) {
      navigate({ to: partnerRoutes.orders });
    } else if (item.kind === "payout" || item.title.toLowerCase().includes("payout")) {
      navigate({ to: partnerRoutes.earnings });
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: partnerRoutes.dashboard });
    }
  };

  return (
    <PartnerLayout activeTab="dashboard" hideBottomNav={false}>
      {/* Top Mobile & Desktop Sticky Bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Back"
              className="flex size-10 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-zinc-700 shadow-2xs transition-all hover:bg-zinc-100 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs animate-pulse">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-zinc-500">
                Live store alerts, order bookings & payouts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleReadAll()}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              unreadCount > 0
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 shadow-2xs"
                : "border border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed opacity-60"
            }`}
          >
            <CheckCheck className="size-3.5" />
            <span className="hidden xs:inline">Mark all read</span>
            <span className="xs:hidden">Read all</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="no-scrollbar mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 pb-2.5 sm:px-6">
          {(
            [
              { id: "all", label: "All" },
              { id: "order", label: "Orders" },
              { id: "payout", label: "Payouts" },
              { id: "alert", label: "Alerts" },
              { id: "promo", label: "Offers" },
            ] as const
          ).map((tab) => {
            const isActive = selectedFilter === tab.id;
            const count =
              tab.id === "all"
                ? items?.length || 0
                : items?.filter((i) => i.kind === tab.id).length || 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List Container */}
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
        {!items ? (
          <div className="space-y-3 pt-2">
            <PartnerListSkeleton />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <BellRing className="size-7" />
            </div>
            <h3 className="mt-4 text-base font-black text-zinc-900">
              {selectedFilter === "all" ? "All Caught Up!" : `No ${selectedFilter} updates`}
            </h3>
            <p className="mt-1 max-w-xs text-xs text-zinc-500 font-medium">
              {selectedFilter === "all"
                ? "You don't have any new notifications right now. Upcoming laundry orders and settlement receipts will appear here in real-time."
                : `There are currently no notifications in the ${selectedFilter} category.`}
            </p>
            {selectedFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1 pb-12">
            {filteredItems.map((item) => {
              const meta = KIND_META[item.kind] || KIND_META.alert;
              const Icon = meta.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3.5 rounded-2xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                    !item.read
                      ? "border-emerald-400/60 bg-gradient-to-r from-emerald-50/60 via-white to-white shadow-xs"
                      : "border-zinc-200/90 bg-white hover:border-zinc-300"
                  }`}
                >
                  {/* Left Icon Badge */}
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg} ${meta.iconColor} transition-transform group-hover:scale-105`}
                  >
                    <Icon className="size-5.5" strokeWidth={2.2} />
                  </span>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${meta.badgeBg} ${meta.badgeText}`}
                      >
                        {meta.label}
                      </span>
                      {!item.read && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Unread
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                        <Clock className="size-3" />
                        {item.time}
                      </span>
                    </div>

                    <h4
                      className={`mt-1.5 text-sm tracking-tight ${
                        !item.read
                          ? "font-black text-zinc-950"
                          : "font-bold text-zinc-800"
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="mt-0.5 text-xs font-medium text-zinc-600 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {/* Right Action Hint */}
                  <div className="flex items-center self-center shrink-0 pl-1 text-zinc-400 group-hover:text-zinc-700 transition-colors">
                    <ChevronRight className="size-4.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Toaster />
    </PartnerLayout>
  );
}
