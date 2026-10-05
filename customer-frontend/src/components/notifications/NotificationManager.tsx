import { useEffect } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/shared/hooks/use-realtime";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestPushNotificationPermission,
  setupForegroundMessageListener,
} from "@/api/core/firebase-messaging";
import { playOrderBellNotificationSound } from "@/lib/order-success-sound";
import { readCachedSettings } from "@/api/customer/settings-api";
import { triggerMobileOsNotification } from "@/lib/notifications";
import { CACHE_KEYS, clearCache } from "@/api/customer/api/cache";

export function NotificationManager() {
  const queryClient = useQueryClient();

  // Register service worker proactively on mount for instant mobile push ready state
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isPushNotificationSupported()) {
      return undefined;
    }

    const current = getNotificationPermission();

    // If permission was already granted in a past session, ensure foreground listener & FCM sync is active
    if (current === "granted") {
      void requestPushNotificationPermission();
      return undefined;
    }

    // Ask for permission directly if in default state (not yet decided)
    const askNativeMobilePermission = async () => {
      try {
        // 1. Android Native App check (Native interface already available)
        if (typeof window !== "undefined" && (window as any).AndroidNotification?.showNotification) {
          void requestPushNotificationPermission();
          return;
        }

        // 2. Capacitor Native Mobile Platform check
        const cap = (window as any).Capacitor;
        if (cap?.isNativePlatform?.()) {
          const push = cap.Plugins?.PushNotifications;
          if (push) {
            const check = await push.checkPermissions?.();
            if (check?.receive !== "granted") {
              const res = await push.requestPermissions?.();
              if (res?.receive === "granted") {
                await push.register?.();
                void requestPushNotificationPermission();
                return;
              }
            } else {
              await push.register?.();
              void requestPushNotificationPermission();
              return;
            }
          }
        }

        // 3. Browser / Mobile Web Native Permission API
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "default") {
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              void requestPushNotificationPermission();
            }
          }
        }
      } catch (err) {
        console.debug("[NotificationManager] Native permission request:", err);
      }
    };

    if (current === "default") {
      void askNativeMobilePermission();
    }

    // Also listen for post-login trigger
    const handlePostLoginTrigger = () => {
      void askNativeMobilePermission();
    };

    window.addEventListener("qp:request-post-login-permissions", handlePostLoginTrigger);
    return () => {
      window.removeEventListener("qp:request-post-login-permissions", handlePostLoginTrigger);
    };
  }, []);

  // Set up Firebase Cloud Messaging (FCM) Foreground Listener with Order Bell Chime
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    void setupForegroundMessageListener((payload: any) => {
      const cached = readCachedSettings();
      if (cached?.notifications?.push === false) {
        return;
      }
      // Play instant order bell chime sound on incoming push
      playOrderBellNotificationSound();

      const notif = payload?.notification || {};
      const data = payload?.data || {};
      const title = notif.title || data.title || "🔔 QuickPress Order Update";
      const message = notif.body || data.body || data.message || "Your laundry order has an update.";
      const orderId = data.orderId;

      // Dispatch to mobile phone's native OS notification tray
      void triggerMobileOsNotification({
        title,
        body: message,
        orderId,
      });

      // Refresh notification queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    }).then((unsub) => {
      if (unsub) cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [queryClient]);

  // Real-time broadcast & order lifecycle event listener
  useRealtimeEvent(
    [
      "admin_broadcast",
      "notification_created",
      "notification.created",
      "order_status_updated",
      "order_status_changed",
      "order_accepted",
      "order_ready",
      "order_picked_up",
      "order_out_for_delivery",
      "order_delivered",
      "rider_assigned",
      "order.created",
      "order.accepted",
      "order.assigned",
      "order.reached_shop",
      "order.picked",
      "order.washing",
      "order.ironing",
      "order.ready",
      "order.out_for_delivery",
      "order.delivered",
    ],
    (payload: any) => {
      const cached = readCachedSettings();
      if (cached?.notifications?.push === false) {
        return;
      }
      const title = payload?.title || payload?.event || "🔔 QuickPress Order Update";
      const message = payload?.message || payload?.description || payload?.text || "Your laundry order has an update.";
      const orderId = payload?.orderId || payload?.id;

      // 1. Play signature order bell chime sound
      playOrderBellNotificationSound();

      // 2. Invalidate caches so UI & badge update instantly
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      }
      clearCache(CACHE_KEYS.recentOrders);

      // 3. Display compact in-app toast with order link
      toast(title, {
        description: message,
        icon: <Bell className="size-4 text-amber-500 fill-amber-400" />,
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = orderId ? `/track/${orderId}` : "/notifications";
            }
          },
        },
      });

      // 4. Trigger real mobile phone system tray / status bar notification
      void triggerMobileOsNotification({
        title,
        body: message,
        orderId,
      });
    }
  );

  return null;
}
