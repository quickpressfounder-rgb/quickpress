import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PartnerSession } from "@/shared/types/partner";
import {
  getStoredPartnerSession,
  logout as logoutPartner,
  restorePartnerSession,
  startPartnerAutoRefresh,
} from "@/api/partner/partner-auth-api";
import { toggleStoreStatus, fetchPartnerProfile } from "@/api/partner/partner-profile-api";
import { initPartnerSocket, subscribePartnerStatus } from "@/lib/partner-socket";
import { readSession, writeSession } from "@/api/core/session-store";

type PartnerContextValue = {
  session: PartnerSession | null;
  phone: string;
  isOnline: boolean;
  isStoreOpen: boolean;
  /** True while the stored Firebase + JWT session is being restored on boot. */
  hydrating: boolean;
  setPhone: (phone: string) => void;
  setOnline: (next: boolean) => Promise<void>;
  toggleOnline: () => Promise<void>;
  signIn: (session: PartnerSession) => void;
  signOut: () => void;
};

const PENDING_PHONE_KEY = "qp.partner.pendingPhone";
const ONLINE_STORAGE_KEY = "qp.partner.isOnline";

function getStoredPhone(): string {
  if (typeof window === "undefined") return "";
  return (
    window.sessionStorage.getItem(PENDING_PHONE_KEY) ||
    window.localStorage.getItem(PENDING_PHONE_KEY) ||
    window.localStorage.getItem("qp.partner.rememberedPhone") ||
    ""
  );
}

const PartnerContext = createContext<PartnerContextValue | null>(null);

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PartnerSession | null>(getStoredPartnerSession);
  const [phone, setPhoneState] = useState(() => getStoredPartnerSession()?.phone || getStoredPhone());
  const [hydrating, setHydrating] = useState(() => !getStoredPartnerSession());
  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(ONLINE_STORAGE_KEY);
    return stored !== null ? stored === "1" : true;
  });

  const setPhone = useCallback((newPhone: string) => {
    setPhoneState(newPhone);
    if (typeof window !== "undefined") {
      if (newPhone) {
        window.sessionStorage.setItem(PENDING_PHONE_KEY, newPhone);
        window.localStorage.setItem(PENDING_PHONE_KEY, newPhone);
      } else {
        window.sessionStorage.removeItem(PENDING_PHONE_KEY);
        window.localStorage.removeItem(PENDING_PHONE_KEY);
      }
    }
  }, []);

  // Auto login: stored QuickPress JWT + live Firebase user → signed in.
  useEffect(() => {
    let active = true;
    void restorePartnerSession()
      .then((restored) => {
        if (!active) return;
        if (restored) {
          setSession(restored);
          if (restored.phone) setPhone(restored.phone);
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

  // Sync real store status from backend on session restore
  useEffect(() => {
    if (!session) return;
    let active = true;
    void fetchPartnerProfile()
      .then((prof) => {
        if (!active || !prof) return;
        const online = prof.isOnline ?? prof.isStoreOpen ?? true;
        setIsOnlineState(online);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(ONLINE_STORAGE_KEY, online ? "1" : "0");
          } catch {}
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [session]);

  // Realtime Socket.IO listener for store status
  useEffect(() => {
    if (typeof window === "undefined") return;
    initPartnerSocket();
    const unsub = subscribePartnerStatus((data) => {
      if (data && typeof data.isOnline === "boolean") {
        setIsOnlineState(data.isOnline);
        try {
          window.localStorage.setItem(ONLINE_STORAGE_KEY, data.isOnline ? "1" : "0");
        } catch {}
      }
    });
    return unsub;
  }, []);

  // Token refresh: keeps the access token valid while the app stays open.
  useEffect(() => startPartnerAutoRefresh(), []);

  const setOnline = useCallback(async (next: boolean) => {
    setIsOnlineState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ONLINE_STORAGE_KEY, next ? "1" : "0");
      } catch {}
    }
    try {
      await toggleStoreStatus(next);
    } catch (err) {
      console.warn("[PartnerContext] Failed to persist store status:", err);
    }
  }, []);

  const toggleOnline = useCallback(async () => {
    await setOnline(!isOnline);
  }, [isOnline, setOnline]);

  const signIn = useCallback((next: PartnerSession) => {
    setSession(next);
    const curr = readSession("partner");
    if (curr && curr.account) {
      writeSession(
        {
          ...curr,
          status: next.isVerified ? "active" : curr.status,
          isVerified: Boolean(next.isVerified),
          isOnboarded: Boolean(next.isOnboarded),
          account: {
            ...curr.account,
            name: next.businessName || curr.account.name,
            linkedId: next.partnerId || curr.account.linkedId,
            isVerified: Boolean(next.isVerified),
            isOnboarded: Boolean(next.isOnboarded),
            status: next.isVerified ? "active" : curr.account.status,
          },
        },
        "partner",
      );
    }
  }, []);
  const signOut = useCallback(() => {
    setSession(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("quickpress:partner:cached_orders");
        window.localStorage.removeItem("qp.partner.cachedOrders");
        window.localStorage.removeItem("qp.partner.cachedDashboard");
        window.localStorage.removeItem("qp.partner.profile_cache");
        window.localStorage.removeItem("qp.partner.pendingPhone");
        window.localStorage.removeItem("qp.partner.isOnline");
        window.sessionStorage.removeItem("qp.partner.pendingPhone");
      } catch {}
    }
    void logoutPartner().catch(() => undefined);
  }, []);

  const value = useMemo<PartnerContextValue>(
    () => ({
      session,
      phone,
      isOnline,
      isStoreOpen: isOnline,
      hydrating,
      setPhone,
      setOnline,
      toggleOnline,
      signIn,
      signOut,
    }),
    [session, phone, isOnline, hydrating, setPhone, setOnline, toggleOnline, signIn, signOut],
  );

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartnerContext() {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error("usePartnerContext must be used inside <PartnerProvider>");
  }
  return ctx;
}
