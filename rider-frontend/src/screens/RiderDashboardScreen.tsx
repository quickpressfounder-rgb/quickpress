import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import { fetchRiderOffers } from "../api/rider/rider-orders-api";
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

export function RiderDashboardScreen() {
  const navigate = useNavigate();
  const { session, isOnline, setOnline, signOut } = useRiderContext();
  const { t } = useLanguage();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [captainName, setCaptainName] = useState(session?.fullName || "Captain");
  const [captainId, setCaptainId] = useState(session?.riderId || "");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [savedActiveOrder, setSavedActiveOrder] = useState<any>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const geoWatchIdRef = useRef<number | null>(null);

  // Restore saved active order safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qp_active_rider_order");
      if (saved) setSavedActiveOrder(JSON.parse(saved));
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
        setCaptainName(profileRes.fullName || profileRes.name || "Captain");
        setCaptainId(profileRes.riderId || profileRes.id || "");
        setOnline(Boolean(profileRes.isOnline));
      }

      if (Array.isArray(offersRes)) {
        setPendingOrdersCount(offersRes.length);
        if (offersRes.length > 0) {
          navigate({ to: "/orders" });
          return;
        }
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
      navigate({ to: "/orders" });
    });
    const unsubWallet = subscribeRiderWallet(() => {
      loadRealData();
    });

    return () => {
      unsubStatus();
      unsubOffers();
      unsubWallet();
    };
  }, [loadRealData, navigate]);

  // Periodic polling for real-time notification badge updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchUnreadCount().then(setUnreadNotifCount).catch(() => {});
    }, 25000);
    return () => clearInterval(timer);
  }, []);

  // GPS Geolocation Tracking
  useEffect(() => {
    if (!navigator?.geolocation) return;

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        if (isOnline) {
          const isMock = Boolean(
            (pos.coords as any).isMock ||
            (pos as any).isMock ||
            (pos.coords as any).isFromMockProvider ||
            (pos.coords as any).mocked
          );
          pushRiderLocation(coords.lat, coords.lng, {
            isMock,
            heading: pos.coords.heading ?? undefined,
            speed: pos.coords.speed ?? undefined,
            accuracy: pos.coords.accuracy ?? undefined,
          }).catch(() => {});
        }
      },
      () => {
        setCurrentCoords({ lat: 27.8118, lng: 78.6477 });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, [isOnline]);

  // Live Offers Stream: When an offer arrives, switch immediately to the Orders tab!
  useEffect(() => {
    if (!isOnline) return;

    const unsubscribe = subscribeRiderOffers((rawOffer: any) => {
      unlockAudioContext();
      triggerHaptic([200, 100, 200, 100, 400]);
      playOrderAlertSound();
      const fare = Number(rawOffer?.fare || rawOffer?.estimatedEarning || 45);
      const pickupTitle = rawOffer?.pickupTitle || rawOffer?.partnerName || "पिकअप हब";
      const dropTitle = rawOffer?.dropTitle || rawOffer?.customerName || "कस्टमर लोकेशन";
      speakOrderAlert(fare, pickupTitle, dropTitle);
      setPendingOrdersCount((prev) => prev + 1);
      toast.info(`🚨 New Order (₹${fare})! Switching to Orders...`);
      // Auto-switch to the Orders tab as requested by user
      navigate({ to: "/orders" });
    });

    fetchRiderOffers()
      .then((offers) => {
        if (Array.isArray(offers) && offers.length > 0) {
          setPendingOrdersCount(offers.length);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
    };
  }, [isOnline, navigate]);

  // Handle Duty Toggle
  const handleToggleDuty = async () => {
    unlockAudioContext();
    setDutyLoading(true);
    const nextState = !isOnline;
    try {
      await updateRiderStatus(nextState);
      setOnline(nextState);
      playDutyToggleSound(nextState);
      speakDutyStatus(nextState);
      triggerHaptic();
      toast.success(nextState ? "Captain is ON DUTY 🟢" : "Captain is OFF DUTY 🔴");
    } catch {
      toast.error("Failed to update duty status. Please check your network.");
    } finally {
      setDutyLoading(false);
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

      {/* 2. Top Header Bar (Hamburger, Duty Switch, MapPin, Bell Badge) */}
      <CaptainTopBar
        isOnline={isOnline}
        onToggleDuty={handleToggleDuty}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenNotifications={() => navigate({ to: "/notifications" })}
        notificationCount={unreadNotifCount}
        loading={dutyLoading}
      />

      {/* 3. Screen Switcher: Offline Home vs Online Map (Order Queue is exclusively on /orders) */}
      {!isOnline ? (
        // Offline Home View (Exact match to uploaded screenshot)
        <CaptainHomeOfflineScreen
          todayEarnings={todayEarnings}
          todayDeliveries={todayDeliveries}
          captainName={captainName}
          onGoOnline={handleToggleDuty}
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
            <div className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <span>Resume HUD</span>
              <span>➔</span>
            </div>
          </button>
        </div>
      )}

      {/* 4. Strictly 2-Tab Bottom Navigation with live badge count on Orders */}
      <RiderBottomNav active="dashboard" ordersBadgeCount={pendingOrdersCount} />
    </div>
  );
}
