import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Send,
  Sparkles,
  Bike,
  Wallet,
  ShieldCheck,
  Info,
  Clock,
  Radio,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderNotifications,
  markRiderNotificationRead,
  markAllRiderNotificationsRead,
  sendTestNotification,
} from "@/api/rider/rider-notifications-api";
import { requestOneSignalPermission } from "@/api/core/onesignal";
import { playArrivalChime } from "@/lib/captain-audio";
import type { RiderNotification, RiderNotificationKind } from "@/shared/types/rider";

interface CaptainNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationChange?: () => void;
}

type TabType = "all" | "orders" | "earnings" | "system";

export const CaptainNotificationsModal: React.FC<CaptainNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNotificationChange,
}) => {
  const [notifications, setNotifications] = useState<RiderNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [pushStatus, setPushStatus] = useState<string>("checking");
  const [isTesting, setIsTesting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchRiderNotifications();
      setNotifications(items);
    } catch (err) {
      console.warn("Failed to load rider notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check browser Notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      void loadItems();
    }
  }, [isOpen, loadItems]);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestOneSignalPermission();
      if (granted) {
        setPushStatus("granted");
        toast.success("Push notifications enabled! You'll receive real-time trip dispatches.");
      } else {
        toast.info("Push notification permission was dismissed or blocked in browser settings.");
      }
    } catch {
      toast.error("Could not request notification permission.");
    }
  };

  const handleSendTestPush = async () => {
    setIsTesting(true);
    try {
      await sendTestNotification(
        "QuickPress Order Alert: Kasganj Hub",
        "New pickup request from Domino Kasganj. High priority trip — Earn ₹95!",
      );
      playArrivalChime();
      toast.success("Dispatch notification sent & chime triggered!");
      await loadItems();
      onNotificationChange?.();
    } catch {
      toast.error("Failed to send test push notification.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleMarkOneRead = async (item: RiderNotification) => {
    if (!item.unread) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)),
    );
    try {
      await markRiderNotificationRead(item.id);
      onNotificationChange?.();
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await markAllRiderNotificationsRead();
      toast.success("All notifications marked as read");
      onNotificationChange?.();
    } catch {
      toast.error("Could not mark all as read");
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "orders") {
      return (
        item.kind === "new-order" ||
        item.kind === "pickup-reminder" ||
        item.kind === "delivery-reminder"
      );
    }
    if (activeTab === "earnings") {
      return item.kind === "payment";
    }
    if (activeTab === "system") {
      return item.kind === "system";
    }
    return true;
  });

  const getNotificationIcon = (kind: RiderNotificationKind) => {
    switch (kind) {
      case "new-order":
      case "pickup-reminder":
      case "delivery-reminder":
        return <Bike className="w-5 h-5 text-amber-600" />;
      case "payment":
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
    }
  };

  const getIconBg = (kind: RiderNotificationKind) => {
    switch (kind) {
      case "new-order":
      case "pickup-reminder":
      case "delivery-reminder":
        return "bg-amber-50 border-amber-200";
      case "payment":
        return "bg-emerald-50 border-emerald-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
              <Bell className="w-5 h-5 stroke-[2.4]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-red-600 rounded-full border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-neutral-900 tracking-tight">
                  Captain Alerts
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Live dispatches, surge targets & platform alerts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-9 h-9 text-neutral-500 rounded-full hover:bg-neutral-100 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Engine Banner & Test Action */}
        <div className="px-5 py-3 bg-neutral-50/80 border-b border-neutral-100 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pushStatus === "granted" ? "bg-emerald-400 opacity-75" : "bg-amber-400 opacity-75"}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pushStatus === "granted" ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              <span className="text-xs font-bold text-neutral-700">
                {pushStatus === "granted"
                  ? "Web Push Active (OneSignal Connected)"
                  : "Push Alerts Not Allowed"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {pushStatus !== "granted" && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded-lg shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  Enable Push
                </button>
              )}

              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isTesting}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white border border-neutral-300 text-neutral-800 rounded-lg shadow-2xs hover:bg-neutral-100 active:scale-95 transition-all"
                title="Send simulated dispatch alert to verify siren & push"
              >
                <Send className="w-3 h-3 text-amber-600" />
                <span>{isTesting ? "Sending..." : "Test Push"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Mark All Read */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-neutral-100 bg-white">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "orders", label: "Orders" },
                { id: "earnings", label: "Earnings" },
                { id: "system", label: "System" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-neutral-900 text-white shadow-2xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-900"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-neutral-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500 space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 text-neutral-400">
                <Bell className="w-6 h-6 stroke-[1.8]" />
              </div>
              <p className="text-sm font-bold text-neutral-800">No notifications here</p>
              <p className="text-xs text-neutral-400 max-w-xs">
                You are all caught up! New delivery requests and bonus updates will appear here in real-time.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkOneRead(item)}
                className={`group flex items-start gap-3.5 py-3 px-2 rounded-2xl cursor-pointer transition-all ${
                  item.unread
                    ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                    : "hover:bg-neutral-50"
                }`}
              >
                {/* Icon Box */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-2xl border shrink-0 transition-transform group-hover:scale-105 ${getIconBg(
                    item.kind,
                  )}`}
                >
                  {getNotificationIcon(item.kind)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <h4
                      className={`text-xs tracking-tight truncate ${
                        item.unread ? "font-black text-neutral-900" : "font-bold text-neutral-700"
                      }`}
                    >
                      {item.title}
                    </h4>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed break-words">
                    {item.body}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>FastAPI & OneSignal Push Engine</span>
          </span>
          <span className="font-bold text-neutral-700">QuickPress Captain v2.0</span>
        </div>
      </div>
    </div>
  );
};
