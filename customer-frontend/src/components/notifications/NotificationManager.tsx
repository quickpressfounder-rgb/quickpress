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

export function NotificationManager() {
  const queryClient = useQueryClient();

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

    // Direct native permission request: asks directly from device/mobile/browser settings
    // without showing any custom in-app popup banners.
    const askNativeMobilePermission = async () => {
      try {
        // 1. Capacitor Native Mobile Platform check
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

        // 2. Browser / Mobile Web Native Permission API
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
      // 1. Attempt immediately
      void askNativeMobilePermission();

      // 2. Modern mobile browsers require a user gesture (tap/touch) to show the native system dialog.
      // Attach a one-time gesture trigger so the user's very first tap triggers the OS dialog directly.
      const handleUserGesture = () => {
        window.removeEventListener("click", handleUserGesture);
        window.removeEventListener("touchstart", handleUserGesture);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
          void askNativeMobilePermission();
        }
      };

      window.addEventListener("click", handleUserGesture, { once: true });
      window.addEventListener("touchstart", handleUserGesture, { once: true, passive: true });

      return () => {
        window.removeEventListener("click", handleUserGesture);
        window.removeEventListener("touchstart", handleUserGesture);
      };
    }

    return undefined;
  }, []);

  // Set up Firebase Cloud Messaging (FCM) Foreground Listener with Order Bell Chime
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    void setupForegroundMessageListener(() => {
      // Play instant order bell chime sound on incoming push
      playOrderBellNotificationSound();

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
    ],
    (payload: any) => {
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

      // 3. Display rich in-app toast with order link
      toast(title, {
        description: message,
        icon: <Bell className="size-4 text-amber-500 fill-amber-400" />,
        duration: 6000,
        action: {
          label: "View",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = orderId ? `/track/${orderId}` : "/notifications";
            }
          },
        },
      });

      // 4. Trigger native OS / Mobile push notification if permission is granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: message,
            icon: "/favicon.png",
            badge: "/favicon.png",
          });
        } catch (err) {
          console.warn("Native Notification error:", err);
        }
      }
    }
  );

  // Return null — no custom banner/popup is rendered
  return null;
}
