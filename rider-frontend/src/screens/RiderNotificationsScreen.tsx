import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Clock,
  PackageCheck,
  Truck,
  WalletCards,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  BellOff,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderNotifications,
  markRiderNotificationRead,
  markAllRiderNotificationsRead,
  fetchUnreadCount,
} from "@/api/rider/rider-notifications-api";
import { playArrivalChime, triggerHaptic } from "@/lib/captain-audio";
import { subscribeRiderNotifications } from "@/lib/rider-socket";
import { RiderBottomNav } from "@/components/RiderBottomNav";
import type { RiderNotification, RiderNotificationKind } from "@/shared/types/rider";

type FilterTab = "all" | "orders" | "earnings" | "system";

const cleanText = (str?: string) => {
  if (!str) return "";
  return str
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu,
      ""
    )
    .trim();
};

export const RiderNotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<RiderNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const items = await fetchRiderNotifications();
      setNotifications(items);
    } catch (err) {
      console.warn("[RiderNotificationsScreen] Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Real-time Socket.IO subscription for instant live notification deliveries from Admin Panel
  useEffect(() => {
    const unsub = subscribeRiderNotifications((notif) => {
      console.log("[RiderNotificationsScreen] ⚡ Realtime notification received from Admin:", notif);
      try {
        playArrivalChime();
        triggerHaptic(40);
        const title = notif?.title || "New Notification";
        const desc = notif?.message || notif?.description || notif?.body || "";
        toast.info(title, { description: desc });
      } catch {}
      void loadNotifications(true);
    });

    return () => {
      unsub();
    };
  }, [loadNotifications]);

  // Mark single notification read & open deep-link if applicable
  const handleNotificationClick = async (item: RiderNotification) => {
    triggerHaptic(30);
    if (item.unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
      );
      markRiderNotificationRead(item.id).catch(() => {});
    }

    // Action routing based on category/payload
    if (item.orderId) {
      navigate({ to: "/orders" });
    } else if (item.kind === "payment") {
      navigate({ to: "/wallet" });
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    triggerHaptic(40);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await markAllRiderNotificationsRead();
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Filter based on active tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "orders") {
      return (
        item.kind === "new-order" ||
        item.kind === "pickup-reminder" ||
        item.kind === "delivery-reminder" ||
        item.title.toLowerCase().includes("order") ||
        item.title.toLowerCase().includes("pickup") ||
        item.title.toLowerCase().includes("delivery")
      );
    }
    if (activeTab === "earnings") {
      return (
        item.kind === "payment" ||
        item.title.toLowerCase().includes("payout") ||
        item.title.toLowerCase().includes("wallet") ||
        item.title.toLowerCase().includes("settled") ||
        item.title.toLowerCase().includes("surge")
      );
    }
    if (activeTab === "system") {
      return (
        item.kind === "system" ||
        item.title.toLowerCase().includes("welcome") ||
        item.title.toLowerCase().includes("guidelines") ||
        item.title.toLowerCase().includes("verified") ||
        item.title.toLowerCase().includes("safety")
      );
    }
    return true;
  });

  // Category Icon Selector (100% Professional Vector Icons - Zero Cartoon Emojis)
  const renderCategoryIcon = (item: RiderNotification) => {
    const titleLower = item.title.toLowerCase();
    const isCancelled = titleLower.includes("cancel") || titleLower.includes("cancelled");
    const isEarnings = item.kind === "payment" || titleLower.includes("payout") || titleLower.includes("settled");
    const isOrder =
      item.kind === "new-order" ||
      item.kind === "pickup-reminder" ||
      item.kind === "delivery-reminder" ||
      titleLower.includes("order") ||
      titleLower.includes("pickup");

    if (isCancelled) {
      return (
        <div className="flex items-center justify-center size-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 shrink-0 shadow-xs">
          <AlertCircle className="size-5 stroke-[2.2]" />
        </div>
      );
    }

    if (isEarnings) {
      return (
        <div className="flex items-center justify-center size-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#00873D] shrink-0 shadow-xs">
          <WalletCards className="size-5 stroke-[2.2]" />
        </div>
      );
    }

    if (isOrder) {
      return (
        <div className="flex items-center justify-center size-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 shrink-0 shadow-xs">
          <PackageCheck className="size-5 stroke-[2.2]" />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center size-10 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-800 shrink-0 shadow-xs">
        <ShieldCheck className="size-5 stroke-[2.2]" />
      </div>
    );
  };

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-slate-50 text-zinc-900 overflow-hidden select-none">
      {/* 1. Sticky Professional Header Bar */}
      <header
        className="sticky top-0 z-30 flex flex-col bg-white border-b border-zinc-200 shadow-xs shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(30);
                if (window.history.length > 1) window.history.back();
                else navigate({ to: "/dashboard" });
              }}
              aria-label="Go Back"
              className="flex items-center justify-center size-9 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-5 stroke-[2.4]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-zinc-950 tracking-tight">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 rounded-full border border-emerald-300">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-zinc-500">
                Captain dispatch feed and account events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              aria-label="Refresh Feed"
              className="flex items-center justify-center size-8.5 rounded-xl text-zinc-600 hover:bg-zinc-100 active:scale-95 transition-all"
              title="Refresh Notifications"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 active:scale-95 transition-all"
                title="Mark all notifications as read"
              >
                <CheckCheck className="size-3.5 stroke-[2.5]" />
                <span className="text-[11px] font-black">Read All</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Category Filter Tabs (Professional, Clean, Zero Cartoon Emojis) */}
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto bg-white border-t border-zinc-100 no-scrollbar">
          {[
            { id: "all", label: "All" },
            { id: "orders", label: "Orders" },
            { id: "earnings", label: "Earnings" },
            { id: "system", label: "System" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setActiveTab(tab.id as FilterTab);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 4. Notification Items List */}
      <main className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
            <div className="size-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-zinc-600">Connecting to notification pipeline...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 space-y-3">
            <div className="flex items-center justify-center size-14 rounded-3xl bg-zinc-200/70 text-zinc-500 shadow-inner">
              <BellOff className="size-7 stroke-[1.8]" />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">No Notifications Available</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                You are all caught up. Live delivery dispatches, order updates, and payout alerts will show up here.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <article
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`group relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                item.unread
                  ? "bg-white border-emerald-300 shadow-xs hover:border-emerald-400 ring-1 ring-emerald-200/50"
                  : "bg-white/80 border-zinc-200 hover:border-zinc-300 hover:bg-white"
              }`}
            >
              {/* Category Icon */}
              {renderCategoryIcon(item)}

              {/* Text Information */}
              <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <h2
                      className={`text-xs tracking-tight truncate ${
                        item.unread ? "font-black text-zinc-950" : "font-bold text-zinc-800"
                      }`}
                    >
                      {cleanText(item.title)}
                    </h2>
                    {item.unread && (
                      <span
                        className="size-2.5 rounded-full bg-[#00C853] shrink-0 shadow-xs ring-4 ring-emerald-100"
                        title="Unread"
                      />
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed break-words font-medium">
                    {cleanText(item.body)}
                  </p>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100/80 text-[10px] text-zinc-500 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-zinc-400" />
                    <span>{item.time}</span>
                  </span>

                  {(item.orderId || item.kind === "payment") && (
                    <span className="flex items-center gap-0.5 text-emerald-700 font-black group-hover:translate-x-0.5 transition-transform">
                      <span>{item.orderId ? "View Order" : "View Wallet"}</span>
                      <ChevronRight className="size-3" />
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* 5. Captain Bottom Navigation Bar */}
      <RiderBottomNav active="dashboard" />
    </div>

  );
};
