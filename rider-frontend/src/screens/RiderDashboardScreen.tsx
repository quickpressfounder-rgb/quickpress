import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import { fetchRiderOffers, fetchRiderOrder } from "../api/rider/rider-orders-api";
import {
  fetchRiderDashboard,
  pushRiderLocation,
  updateRiderStatus,
} from "../api/rider/rider-dashboard-api";
import { fetchRiderProfile } from "../api/rider/rider-profile-api";

import { CaptainTopBar } from "../components/layout/CaptainTopBar";
import { CaptainSidebarDrawer } from "../components/layout/CaptainSidebarDrawer";
import { fetchUnreadCount } from "../api/rider/rider-notifications-api";
import { CaptainHomeOfflineScreen } from "../components/home/CaptainHomeOfflineScreen";
import { CaptainOnlineMapView } from "../components/map/CaptainOnlineMapView";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { formatCaptainId } from "../lib/format-ids";
import { useLanguage } from "../lib/i18n";
import {
  playDutyToggleSound,
  playOrderAlertSound,
  speakDutyStatus,
  speakOrderAlert,
  triggerHaptic,
  unlockAudioContext,
} from "../lib/captain-audio";
import {
  subscribeRiderOffers,
  subscribeRiderStatus,
  subscribeRiderWallet,
} from "../lib/rider-socket";
import { riderLocationEngine } from "../lib/rider-location-service";
import {
  bringAppToFront,
  canDrawOverlays,
  isBackgroundLocationGranted,
  isBatteryOptimizationIgnored,
  isNativeAndroidApp,
  registerGlobalNavigationHook,
  startFloatingBubble,
  stopFloatingBubble,
} from "../lib/captain-device-opt";

export function RiderDashboardScreen() {
  const navigate = useNavigate();
  const { session, isOnline, setOnline, signOut } = useRiderContext();
  const { t } = useLanguage();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [captainName, setCaptainName] = useState(() => {
    const name = session?.fullName;
    return name && name !== "Delivery Captain" && name !== "Delivery Partner" ? name : "Captain";
  });
  const [captainId, setCaptainId] = useState(() => {
    const rid = session?.riderId;
    return rid && rid !== "CAP-100101" && rid !== "CP-9821" && rid !== "RDR-8821" ? formatCaptainId(rid) : "";
  });
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [savedActiveOrder, setSavedActiveOrder] = useState<any>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const geoWatchIdRef = useRef<number | null>(null);

  // Restore saved active order safely and verify live server status
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qp_active_rider_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedActiveOrder(parsed);

        const targetId = parsed.orderId || parsed.id;
        if (targetId && !String(targetId).startsWith("TEST-")) {
          fetchRiderOrder(targetId)
            .then((serverOrder: any) => {
              const s = String(serverOrder?.status || serverOrder?.canonicalStatus || "").toLowerCase();
              if (["delivered", "completed", "cancelled", "failed"].includes(s)) {
                localStorage.removeItem("qp_active_rider_order");
                localStorage.removeItem("qp_active_delivery_order");
                setSavedActiveOrder(null);
              }
            })
            .catch((err: any) => {
              const st = err?.status || err?.statusCode;
              if (st === 404 || st === 410) {
                localStorage.removeItem("qp_active_rider_order");
                localStorage.removeItem("qp_active_delivery_order");
                setSavedActiveOrder(null);
              }
            });
        }
      }
    } catch {}
  }, []);

  // Load real metrics from MongoDB Atlas Backend
  const loadRealData = useCallback(async () => {
    try {
      const [dashRes, profileRes, offersRes, unreadRes] = await Promise.all([
        fetchRiderDashboard().catch(() => null),
        fetchRiderProfile().catch(() => null),
        fetchRiderOffers().catch(() => []),
        fetchUnreadCount().catch(() => 0),
      ]);

      if (profileRes) {
        const pName = profileRes.fullName || profileRes.name;
        if (pName && pName !== "Delivery Captain" && pName !== "Delivery Partner") {
          setCaptainName(pName);
        }
        const pId = profileRes.riderId || profileRes.id || session?.riderId;
        if (pId && pId !== "CAP-100101" && pId !== "CP-9821") {
          setCaptainId(formatCaptainId(pId));
        }
        const localDuty = typeof window !== "undefined" ? localStorage.getItem("qp.rider.isOnline") : null;
        if (localDuty !== null) {
          setOnline(localDuty === "1");
        } else if (profileRes.isOnline !== undefined) {
          setOnline(Boolean(profileRes.isOnline));
        }
      }

      if (Array.isArray(offersRes)) {
        setPendingOrdersCount(offersRes.length);
      }

      if (typeof unreadRes === "number") {
        setUnreadNotifCount(unreadRes);
      }

      if (dashRes) {
        setTodayEarnings(Number(dashRes.todayEarnings ?? (dashRes as any).metrics?.earningsToday ?? 0));
        setTodayDeliveries(
          Number(dashRes.todayDeliveries ?? (dashRes as any).metrics?.deliveriesCompletedToday ?? 0)
        );
      }
    } catch {
      // quiet fallback
    }
  }, [setOnline]);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  // Real-time Socket.IO subscription for instant dashboard metrics & profile sync
  useEffect(() => {
    const unsubStatus = subscribeRiderStatus(() => {
      loadRealData();
    });
    const unsubOffers = subscribeRiderOffers(() => {
      loadRealData();
    });
    const unsubWallet = subscribeRiderWallet(() => {
      loadRealData();
    });

    return () => {
      unsubStatus();
      unsubOffers();
      unsubWallet();
    };
  }, [loadRealData]);

  // Periodic polling for real-time notification badge updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchUnreadCount().then(setUnreadNotifCount).catch(() => {});
    }, 25000);
    return () => clearInterval(timer);
  }, []);

  // GPS Geolocation Tracking via High-Performance Engine
  useEffect(() => {
    riderLocationEngine.setOnline(isOnline);
    const unsubscribe = riderLocationEngine.subscribe((data) => {
      if (data.lat !== null && data.lng !== null) {
        setCurrentCoords({ lat: data.lat, lng: data.lng });
      }
    });
    return unsubscribe;
  }, [isOnline]);

  // Hook up global navigation for Floating Bubble taps
  useEffect(() => {
    return registerGlobalNavigationHook((targetRoute) => {
      navigate({ to: targetRoute as any });
    });
  }, [navigate]);

  // Ensure Floating Bubble matches duty state on launch
  useEffect(() => {
    if (isOnline) {
      startFloatingBubble();
    } else {
      stopFloatingBubble();
    }
  }, [isOnline]);

  // Permissions Gate: After registration, captain cannot enter home page until all permissions enabled
  useEffect(() => {
    if (isNativeAndroidApp()) {
      const bgOk = isBackgroundLocationGranted();
      const batteryOk = isBatteryOptimizationIgnored();
      const overlayOk = canDrawOverlays();
      if (!bgOk || !batteryOk || !overlayOk) {
        navigate({ to: "/permissions" });
      }
    } else {
      const allowed =
        typeof window !== "undefined" &&
        localStorage.getItem("qp_captain_permissions_allowed") === "1";
      if (!allowed) {
        navigate({ to: "/permissions" });
      }
    }
  }, [navigate]);

  // Handle Duty Toggle with Instant Voice Announcement & Instant Offline/Online Screen Switch
  const handleToggleDuty = async (overrideState?: boolean | any) => {
    unlockAudioContext();
    const nextState = typeof overrideState === "boolean" ? overrideState : !isOnline;

    // 1. Instant Synchronous Voice & Audio Feedback in Gesture Handler
    triggerHaptic(45);
    playDutyToggleSound(nextState);
    speakDutyStatus(nextState);

    // 2. Instant Optimistic State Update so Offline / Online Screen opens immediately
    setOnline(nextState);
    toast.success(nextState ? "Captain is ON DUTY 🟢" : "Captain is OFF DUTY 🔴");

    // 3. Background Persistence
    try {
      await updateRiderStatus(nextState);
    } catch {
      // quiet fallback
    }
  };

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-white shadow-2xl overflow-hidden text-neutral-900 select-none">
      {/* 1. Left Slide-Out Hamburger Drawer */}
      <CaptainSidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        captainName={captainName}
        captainId={captainId}
        onLogout={() => {
          setIsDrawerOpen(false);
          signOut();
          toast.success("Logged out successfully. See you soon, Captain! 🛵");
          navigate({ to: "/auth" });
        }}
        onOpenLanguage={() => {
          setIsDrawerOpen(false);
          navigate({ to: "/language" });
        }}
        onOpenOnboarding={() => {
          setIsDrawerOpen(false);
          navigate({ to: "/onboarding" });
        }}
      />

      {/* 2. Top Header Bar (Hamburger, Duty Switch, MapPin, Bell Badge, Sky-Blue Earnings Strip) */}
      <CaptainTopBar
        isOnline={isOnline}
        onToggleDuty={() => handleToggleDuty(!isOnline)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenNotifications={() => navigate({ to: "/notifications" })}
        onOpenEarnings={() => navigate({ to: "/wallet" })}
        todayEarnings={todayEarnings}
        notificationCount={unreadNotifCount}
        loading={dutyLoading}
      />

      {/* 3. Screen Switcher: Offline Home vs Online Map */}
      {!isOnline ? (
        // Offline Home View (Exact match to uploaded screenshot)
        <CaptainHomeOfflineScreen
          todayEarnings={todayEarnings}
          todayDeliveries={todayDeliveries}
          captainName={captainName}
          onGoOnline={() => handleToggleDuty(true)}
          onOpenWorkZoneInfo={() =>
            toast.info("Kasganj Work Zone active with ₹20 bonus per trip!")
          }
        />
      ) : (
        // Online Rapido Captain Full-Bleed Map View
        <CaptainOnlineMapView
          currentCoords={currentCoords}
          todayEarnings={todayEarnings}
          todayDeliveries={todayDeliveries}
          captainName={captainName}
          pendingOrdersCount={pendingOrdersCount}
          onOpenOrders={() => navigate({ to: "/orders" })}
          onRecenter={() => {
            window.dispatchEvent(new CustomEvent("qp:recenter_rider_map"));
            if (currentCoords) {
              toast.info("Map centered at live location 📍");
            }
          }}
          onOpenWorkZoneInfo={() =>
            toast.info("Kasganj Work Zone active with ₹20 bonus per trip!")
          }
        />
      )}

      {/* Active Trip Floating Pill (if order is active) */}
      {savedActiveOrder && (
        <div className="absolute bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => navigate({ to: "/orders" })}
            className="w-full flex items-center justify-between p-3.5 bg-white/95 backdrop-blur-md text-zinc-900 rounded-2xl shadow-lg border border-emerald-300 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
                🛵
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-zinc-900">Active Trip: {savedActiveOrder.customerName || "Customer"}</p>
                <p className="text-[10px] text-zinc-500 truncate max-w-[180px] sm:max-w-[220px]">{savedActiveOrder.pickupTitle || savedActiveOrder.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    localStorage.removeItem("qp_active_rider_order");
                    localStorage.removeItem("qp_active_delivery_order");
                  } catch {}
                  setSavedActiveOrder(null);
                  toast.info("Trip dismissed from dashboard.");
                }}
                className="flex items-center justify-center size-7 rounded-lg bg-zinc-100 hover:bg-rose-100 text-zinc-500 hover:text-rose-700 active:scale-95 transition-all text-xs font-bold"
                title="Dismiss Stale Trip"
              >
                ✕
              </button>
              <div className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span>Resume HUD</span>
                <span>➔</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 4. 2-Tab Rapido Captain Bottom Navigation with live badge count on Orders */}
      <RiderBottomNav active="dashboard" ordersBadgeCount={pendingOrdersCount} />
    </div>
  );
}
