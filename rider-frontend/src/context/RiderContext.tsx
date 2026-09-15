import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { RiderSession } from "@/shared/types/rider";
import {
  logout as logoutRider,
  restoreRiderSession,
  startRiderAutoRefresh,
} from "@/api/rider/rider-auth-api";
import { updateRiderStatus } from "@/api/rider/rider-dashboard-api";
import { clearSession, readSession, writeSession } from "@/api/core/session-store";
import { apiGetJson } from "@/api/core/transport";
import { initRiderSocket, subscribeRiderStatus } from "@/lib/rider-socket";
import { onesignalLogin, onesignalLogout } from "@/api/core/onesignal";

type RiderContextValue = {
  session: RiderSession | null;
  phone: string;
  isOnline: boolean;
  /** True while the stored Firebase + JWT session is being restored on boot. */
  hydrating: boolean;
  setPhone: (phone: string) => void;
  setOnline: (next: boolean) => Promise<void>;
  toggleOnline: () => Promise<void>;
  signIn: (session: RiderSession) => void;
  signOut: () => void;
};

const RiderContext = createContext<RiderContextValue | null>(null);

const PENDING_PHONE_KEY = "qp.rider.pendingPhone";
const ONLINE_STORAGE_KEY = "qp.rider.isOnline";

export function RiderProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<RiderSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = readSession("rider") || readSession();
      if (stored) {
        const acc = (stored as any).account || stored;
        return {
          riderId: acc.linkedId ?? acc.id ?? (stored as any).riderId ?? (stored as any).id ?? "CP-9821",
          phone: acc.phone ?? (stored as any).phone ?? "",
          fullName: acc.name ?? acc.fullName ?? (stored as any).fullName ?? "Delivery Captain",
          isVerified: Boolean(acc.isVerified ?? acc.is_verified ?? (stored as any).isVerified ?? (stored as any).is_verified),
          isOnboarded: Boolean(acc.isOnboarded ?? acc.is_onboarded ?? (stored as any).isOnboarded ?? (stored as any).is_onboarded ?? true),
          isNewRider: !Boolean(acc.isOnboarded ?? acc.is_onboarded ?? (stored as any).isOnboarded ?? (stored as any).is_onboarded ?? true),
          token: stored.token,
          refreshToken: stored.refreshToken,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const [phone, setPhoneState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      window.sessionStorage.getItem(PENDING_PHONE_KEY) ||
      window.localStorage.getItem(PENDING_PHONE_KEY) ||
      ""
    );
  });

  const [isOnline, setOnlineState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(ONLINE_STORAGE_KEY);
    return stored !== null ? stored === "1" : true;
  });

  const [hydrating, setHydrating] = useState(false);

  const setPhone = useCallback((value: string) => {
    setPhoneState(value);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(PENDING_PHONE_KEY, value);
        window.localStorage.setItem(PENDING_PHONE_KEY, value);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Background restore / sync
  useEffect(() => {
    let active = true;
    void restoreRiderSession()
      .then((restored) => {
        if (!active) return;
        if (restored) {
          setSession(restored);
          if (restored.phone) setPhone(restored.phone);
          if (restored.riderId) {
            void onesignalLogin(restored.riderId);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrating(false);
      });
    return () => {
      active = false;
    };
  }, [setPhone]);

  // Sync real online state from backend on session change
  useEffect(() => {
    if (!session) return;
    let active = true;
    void apiGetJson<{ isOnline?: boolean; ok?: boolean }>("/api/rider/status")
      .then((res) => {
        if (!active || !res) return;
        if (typeof res.isOnline === "boolean") {
          setOnlineState(res.isOnline);
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(ONLINE_STORAGE_KEY, res.isOnline ? "1" : "0");
            } catch {}
          }
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [session]);

  // Real-time Socket.IO status event listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    initRiderSocket();
    const unsub = subscribeRiderStatus((data) => {
      if (data && typeof data.isOnline === "boolean") {
        setOnlineState(data.isOnline);
        try {
          window.localStorage.setItem(ONLINE_STORAGE_KEY, data.isOnline ? "1" : "0");
        } catch {}
      }
    });
    return unsub;
  }, []);

  // Token refresh: keeps the access token valid while the app stays open.
  useEffect(() => startRiderAutoRefresh(), []);

  const setOnlineWithBackend = useCallback(async (next: boolean) => {
    setOnlineState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ONLINE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
    try {
      await updateRiderStatus(next);
    } catch (err) {
      console.warn("[RiderContext] Failed to persist online status to backend:", err);
    }
  }, []);

  const toggleOnline = useCallback(async () => {
    await setOnlineWithBackend(!isOnline);
  }, [isOnline, setOnlineWithBackend]);

  const signIn = useCallback(
    (next: RiderSession) => {
      setSession(next);
      if (next.phone) setPhone(next.phone);
      if (next.riderId) {
        void onesignalLogin(next.riderId);
      }
      if (typeof window !== "undefined" && next.token) {
        writeSession(
          {
            token: next.token,
            refreshToken: next.refreshToken,
            isVerified: next.isVerified,
            isOnboarded: next.isOnboarded,
            status: next.isVerified ? "active" : "pending",
            kycStatus: next.isVerified ? "verified" : "pending",
            riderId: next.riderId,
            phone: next.phone,
            account: {
              id: next.riderId,
              linkedId: next.riderId,
              phone: next.phone,
              name: next.fullName,
              isVerified: next.isVerified,
              isOnboarded: next.isOnboarded,
              status: next.isVerified ? "active" : "pending",
              kycStatus: next.isVerified ? "verified" : "pending",
            },
          },
          "rider"
        );
      }
    },
    [setPhone],
  );
  const signOut = useCallback(() => {
    setSession(null);
    clearSession("rider");
    clearSession();
    void onesignalLogout();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("quickpress.session.rider");
        window.localStorage.removeItem("quickpress.remember.rider");
        window.localStorage.removeItem("qp.session.rider");
        window.localStorage.removeItem("qp.rider.activeOrder");
        window.localStorage.removeItem("qp.rider.pendingPhone");
        window.localStorage.removeItem("qp.rider.isOnline");
        window.localStorage.removeItem("qp_rider_token");
        window.localStorage.removeItem("qp_access_token");
        window.localStorage.removeItem("qp_active_rider_order");
        window.localStorage.removeItem("qp_rider_profile_photo");
        window.sessionStorage.removeItem("qp.rider.pendingPhone");
        window.sessionStorage.removeItem("qp_rider_token");
      } catch {}
    }
    void logoutRider().catch(() => undefined);
  }, []);

  const value = useMemo<RiderContextValue>(
    () => ({
      session,
      phone,
      isOnline,
      hydrating,
      setPhone,
      setOnline: setOnlineWithBackend,
      toggleOnline,
      signIn,
      signOut,
    }),
    [session, phone, isOnline, hydrating, setPhone, setOnlineWithBackend, toggleOnline, signIn, signOut],
  );

  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>;
}

export function useRiderContext() {
  const ctx = useContext(RiderContext);
  if (!ctx) {
    throw new Error("useRiderContext must be used inside <RiderProvider>");
  }
  return ctx;
}
