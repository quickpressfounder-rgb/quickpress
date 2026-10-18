/**
 * Automatic QuickPress token refresh.
 *
 * The transport already retries a single 401 after rotating the JWT. This
 * module keeps the access token *ahead* of expiry so screens never see the
 * 401 at all:
 *
 *   • schedules a refresh ~2 minutes before `expiresAt`
 *   • refreshes when the tab regains focus after being hidden
 *   • refreshes when the device comes back online
 *
 * Firebase remains the identity provider — refresh only rotates the QuickPress
 * JWT pair issued by FastAPI (POST /api/auth/refresh).
 */

import type { AccountRole } from "@/shared/types";

import { refreshSession } from "./auth-service";
import { readSession, sessionExpiresAt, subscribeSession } from "./session-store";

const EARLY_MS = 2 * 60 * 1000; // refresh 2 minutes before expiry
const MIN_DELAY_MS = 5 * 1000;

/**
 * Start the refresh loop for one role. Returns a stop function; safe to call
 * on the server (no-op) and safe to call more than once.
 */
export function startSessionAutoRefresh(role: AccountRole): () => void {
  if (typeof window === "undefined") return () => {};

  let timer: number | null = null;
  let stopped = false;
  let running = false;

  const clear = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const refreshNow = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await refreshSession(role);
    } catch {
      /* offline / revoked — the transport 401 path handles the fallback */
    } finally {
      running = false;
      schedule();
    }
  };

  const schedule = () => {
    clear();
    if (stopped || !readSession(role)) return;
    const expiresAt = sessionExpiresAt(role);
    if (expiresAt === null) return;
    const delay = Math.max(MIN_DELAY_MS, expiresAt - EARLY_MS - Date.now());
    timer = window.setTimeout(() => void refreshNow(), delay);
  };

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    const expiresAt = sessionExpiresAt(role);
    if (expiresAt !== null && expiresAt - EARLY_MS <= Date.now()) void refreshNow();
    else schedule();
  };

  const onOnline = () => onVisible();

  const unsubscribe = subscribeSession(schedule);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);

  let removeCapacitorListener: (() => void) | undefined;
  if (typeof window !== "undefined") {
    import("@capacitor/app")
      .then(({ App }) => {
        if (stopped) return;
        const handle = App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) onVisible();
        });
        removeCapacitorListener = () => {
          handle.then((h) => h.remove()).catch(() => {});
        };
      })
      .catch(() => {});
  }

  schedule();

  return () => {
    stopped = true;
    clear();
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    removeCapacitorListener?.();
  };
}
