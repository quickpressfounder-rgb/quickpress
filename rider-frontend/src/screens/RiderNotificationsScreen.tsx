import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Clock,
  Headphones,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderNotifications,
  markRiderNotificationRead,
  markAllRiderNotificationsRead,
} from "../api/rider/rider-notifications-api";
import { playArrivalChime, triggerHaptic } from "../lib/captain-audio";
import { subscribeRiderNotifications } from "../lib/rider-socket";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { CaptainSupportModal } from "../components/support/CaptainSupportModal";
import type { RiderNotification } from "../shared/types/rider";

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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

  // Real-time Socket.IO subscription for instant live notification deliveries
  useEffect(() => {
    const unsub = subscribeRiderNotifications((notif) => {
      console.log("[RiderNotificationsScreen] ⚡ Realtime notification received:", notif);
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

  // Mark single notification read & open deep-link
  const handleNotificationClick = async (item: RiderNotification) => {
    triggerHaptic(30);
    if (item.unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
      );
      markRiderNotificationRead(item.id).catch(() => {});
    }

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

  // Category Icon Selector
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
        <div className="flex items-center justify-center size-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 shrink-0 shadow-2xs">
          <AlertCircle className="size-5 stroke-[2.2]" />
        </div>
      );
    }

    if (isEarnings) {
      return (
        <div className="flex items-center justify-center size-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0 shadow-2xs">
          <WalletCards className="size-5 stroke-[2.2]" />
        </div>
      );
    }

    if (isOrder) {
      return (
        <div className="flex items-center justify-center size-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 shrink-0 shadow-2xs">
          <PackageCheck className="size-5 stroke-[2.2]" />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center size-10 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-800 shrink-0 shadow-2xs">
        <ShieldCheck className="size-5 stroke-[2.2]" />
      </div>
    );
  };

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-800 select-none font-sans">
      {/* 1. Header Bar matching Rapido / QuickPress Wallet Screen */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-zinc-200/70 shadow-2xs shrink-0 select-none"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(30);
                if (window.history.length > 1) window.history.back();
                else navigate({ to: "/dashboard" });
              }}
              className="p-1.5 -ml-1 text-zinc-900 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-6 text-zinc-950 stroke-[2.2]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-zinc-950 flex items-center gap-1.5">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-zinc-500">
                Captain dispatch feed & live alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setIsHelpOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 transition-all text-xs font-bold text-zinc-900 shadow-2xs cursor-pointer"
            >
              <Headphones className="size-3.5 text-zinc-700" />
              <span>Help</span>
            </button>

            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="p-2 text-black hover:bg-zinc-100 rounded-xl active:scale-95 transition-all"
              title="Refresh Notifications"
            >
              <RefreshCw className={`size-4 text-black ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl active:scale-95 transition-all"
                title="Mark all as read"
              >
                <CheckCheck className="size-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Integrated Sub-Tabs with Solid Yellow Underline */}
        <div className="grid grid-cols-4 text-center text-xs font-bold border-t border-zinc-100">
          {[
            { id: "all", label: "All" },
            { id: "orders", label: "Orders" },
            { id: "earnings", label: "Earnings" },
            { id: "system", label: "System" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setActiveTab(tab.id as FilterTab);
                }}
                className={`py-3 relative cursor-pointer transition-colors ${
                  active ? "text-zinc-950 font-black" : "text-zinc-500 hover:text-zinc-800 font-bold"
                }`}
              >
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#FFC700] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Scrollable Content Body */}
      <div
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#F8F9FA]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      >
        {/* Lilac / Purple Explainer Banner matching Wallet Screen */}
        <div
          onClick={() => {
            triggerHaptic(20);
            toast.info("Notification Bell: Live audio tones and popups keep you ready for incoming orders.");
          }}
          className="p-4 rounded-2xl bg-gradient-to-r from-[#EDE9FE] to-[#F5F3FF] border border-[#DDD6FE] text-zinc-900 shadow-2xs flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="size-6 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-zinc-950 leading-snug">
                Real-Time Dispatch Feed Active
              </h4>
              <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">
                Audio alerts will ring for new orders, surge boosts & wallet payouts
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-zinc-500 shrink-0 ml-2" />
        </div>

        {/* Notifications List as a Unified Divided Card */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-12 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <div className="size-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-zinc-600">Connecting to notification pipeline...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-zinc-100 text-zinc-400">
              <BellOff className="size-7 stroke-[1.8]" />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">No Notifications Available</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                You are all caught up! Live delivery dispatches, surge bonuses, and wallet settlements will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden divide-y divide-zinc-100">
            {filteredNotifications.map((item) => (
              <article
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-zinc-50 ${
                  item.unread ? "bg-amber-50/20" : ""
                }`}
              >
                {/* Category Icon */}
                {renderCategoryIcon(item)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2
                      className={`text-xs tracking-tight truncate ${
                        item.unread ? "font-black text-zinc-950" : "font-bold text-zinc-800"
                      }`}
                    >
                      {cleanText(item.title)}
                    </h2>
                    {item.unread && (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed break-words font-medium">
                    {cleanText(item.body)}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100 text-[10px] text-zinc-400 font-bold">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-zinc-400" />
                      <span>{item.time}</span>
                    </span>

                    {(item.orderId || item.kind === "payment") && (
                      <span className="flex items-center gap-0.5 text-zinc-900 font-black">
                        <span>{item.orderId ? "View Order" : "View Wallet"}</span>
                        <ChevronRight className="size-3" />
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* 3. Bottom Nav */}
      <RiderBottomNav active="dashboard" />

      {/* 4. Support Modal */}
      <CaptainSupportModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};
