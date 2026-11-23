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
    const handleBackAction = (e?: Event) => {
      // 1. If any Modal / Sheet / Drawer / MapPicker is currently open → close the modal first
      const openModal = document.querySelector(
        '[data-modal="map-picker"], [data-modal], [role="dialog"], [aria-modal="true"], .fixed.z-50 button[aria-label*="Close" i], .fixed.z-50 button[aria-label*="close" i]'
      );
      if (openModal) {
        if (e) e.preventDefault();
        const closeBtn = document.querySelector<HTMLButtonElement>(
          '[data-modal="map-picker"] button[aria-label*="close" i], [role="dialog"] button[aria-label*="close" i], .fixed.z-50 button[aria-label*="close" i]'
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }
        return;
      }

      const currentPath = router.state.location.pathname;

      // 2. Registration screen: handle internal step back or double-back exit, NEVER go back to /auth
      if (currentPath.startsWith("/registration")) {
        const customEvt = new CustomEvent("qp:partner-registration-back", { cancelable: true });
        const handledInternally = !window.dispatchEvent(customEvt);
        if (handledInternally) {
          if (e) e.preventDefault();
          return;
        }

        // If at step 1 or not handled internally, double-back exits the app safely
        const now = Date.now();
        if (now - lastExitPress.current < 2000) {
          void App.exitApp();
        } else {
          if (e) e.preventDefault();
          lastExitPress.current = now;
          toast("Press back again to exit", { id: "back-exit-toast", duration: 2000 });
        }
        return;
      }

      // 3. Root screens: double-tap back to exit
      const isRootScreen =
        currentPath === "/dashboard" ||
        currentPath === "/" ||
        currentPath === "/auth" ||
        currentPath === "/orders";

      if (isRootScreen) {
        const now = Date.now();
        if (now - lastExitPress.current < 2000) {
          void App.exitApp();
        } else {
          if (e) e.preventDefault();
          lastExitPress.current = now;
          toast("Press back again to exit", { id: "back-exit-toast", duration: 2000 });
        }
        return;
      }

      // 4. Sub-screens: navigate 1 step back in history safely
      if (e) e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        void router.navigate({ to: "/orders" });
      }
    };

    // 1. Custom Webview back event (triggered from Android MainActivity)
    const handleCustomBack = (e: Event) => {
      handleBackAction(e);
    };

    window.addEventListener("qp:android-back", handleCustomBack);

    // 2. Capacitor Plugin listener
    let removeCapListener: (() => void) | undefined;
    App.addListener("backButton", () => {
      handleBackAction();
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
