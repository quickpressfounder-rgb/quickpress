import { useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

/**
 * Handles Android hardware back button cleanly so that:
 * 1. The user is NEVER logged out when backing out of the app.
 * 2. On root screens (/dashboard, /verification, /auth, /), double-tap back within 2s exits/minimizes the app.
 * 3. On registration, handles step navigation or double-tap exit without logging out.
 * 4. On sub-screens, navigates safely to the parent screen.
 */
export function CapacitorBackHandler() {
  const router = useRouter();
  const routerState = useRouterState();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    const listenerPromise = CapApp.addListener("backButton", ({ canGoBack }) => {
      if (!isMounted) return;
      const currentPath = routerState.location.pathname;

      // 1. Root screens: double-back to minimize/exit app. NEVER navigate to /auth or logout!
      if (
        currentPath === "/dashboard" ||
        currentPath === "/verification" ||
        currentPath === "/auth" ||
        currentPath === "/"
      ) {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          void CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          toast.info("Press back again to exit QuickPress Captain", { duration: 1800 });
        }
        return;
      }

      // 2. Registration screen: double back exits, or internal back handles steps
      if (currentPath === "/registration") {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          void CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          toast.info("Press back again to exit QuickPress Captain", { duration: 1800 });
        }
        return;
      }

      // 3. Operational subpages: safely return to /dashboard without touching login history
      if (
        currentPath === "/orders" ||
        currentPath === "/deliveries" ||
        currentPath === "/wallet" ||
        currentPath === "/profile" ||
        currentPath === "/history" ||
        currentPath === "/incentives" ||
        currentPath === "/notifications"
      ) {
        router.navigate({ to: "/dashboard" });
        return;
      }

      // 4. Safe fallback for other subpages
      if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.exitApp();
      }
    });

    return () => {
      isMounted = false;
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [router, routerState.location.pathname]);

  return null;
}
