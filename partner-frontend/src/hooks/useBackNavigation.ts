import { App } from "@capacitor/app";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Universal Android Back Gesture & Hardware Back Button Handler.
 *
 * Rules:
 * 1. If any Modal / Sheet / Drawer is currently open → closes the modal first.
 * 2. If on a sub-screen (e.g. Dashboard -> Notifications -> OrderDetails) → navigates exactly 1 step back (`window.history.back()`).
 * 3. If on root screen (/dashboard, /auth, /) → prompts "Press back again to exit" before closing the app.
 */
export function useBackNavigation() {
  const router = useRouter();
  const lastExitPress = useRef(0);

  useEffect(() => {
    // 1. Custom Webview back event (triggered from Android MainActivity)
    const handleCustomBack = (e: Event) => {
      const openModal = document.querySelector(
        '[role="dialog"], [aria-modal="true"], .fixed.z-50 button[aria-label*="Close" i], .fixed.z-50 button[aria-label*="close" i]'
      );
      if (openModal) {
        e.preventDefault();
        const closeBtn = document.querySelector<HTMLButtonElement>(
          '.fixed.z-50 button[aria-label*="close" i], [role="dialog"] button[aria-label*="close" i]'
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }
        return;
      }

      const currentPath = router.state.location.pathname;
      if (currentPath === "/dashboard" || currentPath === "/" || currentPath === "/auth") {
        const now = Date.now();
        if (now - lastExitPress.current < 2000) {
          // Allow native finish
        } else {
          e.preventDefault();
          lastExitPress.current = now;
          toast("Press back again to exit", { id: "back-exit-toast", duration: 2000 });
        }
      } else {
        e.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          void router.navigate({ to: "/dashboard" });
        }
      }
    };

    window.addEventListener("qp:android-back", handleCustomBack);

    // 2. Capacitor Plugin listener
    let removeCapListener: (() => void) | undefined;
    App.addListener("backButton", ({ canGoBack }) => {
      const openModal = document.querySelector(
        '[role="dialog"], [aria-modal="true"], .fixed.z-50 button[aria-label*="Close" i], .fixed.z-50 button[aria-label*="close" i]'
      );
      if (openModal) {
        const closeBtn = document.querySelector<HTMLButtonElement>(
          '.fixed.z-50 button[aria-label*="close" i], [role="dialog"] button[aria-label*="close" i]'
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }
        return;
      }

      const currentPath = router.state.location.pathname;
      if (currentPath === "/dashboard" || currentPath === "/" || currentPath === "/auth") {
        const now = Date.now();
        if (now - lastExitPress.current < 2000) {
          void App.exitApp();
        } else {
          lastExitPress.current = now;
          toast("Press back again to exit", { id: "back-exit-toast", duration: 2000 });
        }
      } else if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        void router.navigate({ to: "/dashboard" });
      }
    })
      .then((handle) => {
        removeCapListener = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    return () => {
      window.removeEventListener("qp:android-back", handleCustomBack);
      if (removeCapListener) removeCapListener();
    };
  }, [router]);
}
