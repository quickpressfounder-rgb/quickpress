import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Package,
  RotateCw,
  Shirt,
  X,
  XCircle,
  Route,
  Zap,
} from "lucide-react";
import { RiderBottomNav } from "../components/RiderBottomNav";
import {
  acceptRiderOrder,
  fetchRiderOffers,
  rejectRiderOrder,
} from "../api/rider/rider-orders-api";
import { fetchRouteBookingState, type RouteBookingState } from "../api/rider/rider-route-booking-api";
import { CaptainRouteBookingModal } from "../components/navigation/CaptainRouteBookingModal";
import { useRiderContext } from "../context/RiderContext";
import { useLanguage } from "../lib/i18n";
import { subscribeRiderOffers, subscribeRiderOrders } from "../lib/rider-socket";
import {
  playOrderAlertSound,
  playSuccessChime,
  speakOrderAlert,
  speakText,
  stopOrderAlertSound,
  triggerHaptic,
  unlockAudioContext,
} from "../lib/captain-audio";
import { toast } from "sonner";
import { GoToPickupHUD, type ActiveOrderData } from "../components/dashboard/GoToPickupHUD";
import { CaptainSidebarDrawer } from "../components/layout/CaptainSidebarDrawer";

export interface OrderOfferItem {
  id: string;
  orderId?: string;
  orderCode?: string;
  type?: string;
  rideType?: string;
  isTransfer?: boolean;
  isReassigned?: boolean;
  isReassignedBonus?: boolean;
  extraBonusPercent?: number;
  extraBonusAmount?: number;
  pickupTitle?: string;
  pickupAddress: string;
  dropTitle?: string;
  dropAddress: string;
  pickupDistanceKm?: number;
  dropDistanceKm?: number;
  fare?: number;
  amount?: number;
  customerName?: string;
  customerPhone?: string;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  pickupOtp?: string;
  deliveryOtp?: string;
  dispatchOtp?: string;
  pickupCoords?: { lat: number; lng: number };
  dropCoords?: { lat: number; lng: number };
  customerCoords?: { lat: number; lng: number };
  partnerCoords?: { lat: number; lng: number };
  paymentMode?: string;
  items?: any[];
  placedAt?: string;
  expiresInSeconds?: number;
  isRouteMatch?: boolean;
  routeBadge?: string;
  isExpress?: boolean;
  expressFee?: number;
  riderExpressBonus?: number;
  expressRiderSharePercent?: number;
}

const ACTIVE_ORDER_STORAGE_KEY = "qp_active_rider_order";

export function RiderOrdersScreen() {
  const navigate = useNavigate();
  const { session, isOnline } = useRiderContext();
  const { t } = useLanguage();

  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [routeBooking, setRouteBooking] = useState<RouteBookingState | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  const loadRouteState = async () => {
    try {
      const res = await fetchRouteBookingState();
      if (res && res.riderId) {
        setRouteBooking(res);
      }
    } catch {}
  };

  useEffect(() => {
    loadRouteState();
  }, []);

  // Restore saved active order on client mount safely without hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
      if (saved) {
        setActiveOrder(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const [offers, setOffers] = useState<OrderOfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const loadOffers = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const rawOffers = await fetchRiderOffers();
      if (Array.isArray(rawOffers) && rawOffers.length > 0) {
        const formatted: OrderOfferItem[] = rawOffers.map((r: any) => {
          const c_lat = r.customerCoords?.lat ?? r.pickupCoords?.lat ?? r.pickupLocation?.latitude ?? r.pickupLocation?.lat ?? r.customerLocation?.lat;
          const c_lng = r.customerCoords?.lng ?? r.pickupCoords?.lng ?? r.pickupLocation?.longitude ?? r.pickupLocation?.lng ?? r.customerLocation?.lng;
          const p_lat = r.partnerCoords?.lat ?? r.dropCoords?.lat ?? r.partnerLocation?.latitude ?? r.partnerLocation?.lat ?? r.dropLocation?.lat;
          const p_lng = r.partnerCoords?.lng ?? r.dropCoords?.lng ?? r.partnerLocation?.longitude ?? r.partnerLocation?.lng ?? r.dropLocation?.lng;

          const custCoords = c_lat != null && c_lng != null ? { lat: Number(c_lat), lng: Number(c_lng) } : undefined;
          const partCoords = p_lat != null && p_lng != null ? { lat: Number(p_lat), lng: Number(p_lng) } : undefined;

          const pOtp = r.pickupOtp || (typeof r.otp?.pickup === "object" ? r.otp?.pickup?.code : r.otp?.pickup);
          const dOtp = r.deliveryOtp || (typeof r.otp?.delivery === "object" ? r.otp?.delivery?.code : r.otp?.delivery);
          const dispOtp = r.dispatchOtp || (typeof r.otp?.dispatch === "object" ? r.otp?.dispatch?.code : r.otp?.dispatch);

          return {
            id: r.offerId || r.id || r._id,
            orderId: r.orderId || r.rideId || r.id,
            orderCode: r.orderCode || r.code || (r.orderId ? String(r.orderId).slice(-6).toUpperCase() : undefined),
            type: r.type || r.rideType || "bike",
            rideType: r.rideType || (r.type === "delivery" || r.type === "handover_delivery" ? "delivery" : "pickup"),
            isTransfer: Boolean(r.isTransfer),
            isReassigned: Boolean(r.isReassigned),
            isReassignedBonus: Boolean(r.isReassignedBonus),
            extraBonusPercent: Number(r.extraBonusPercent || 0),
            extraBonusAmount: Number(r.extraBonusAmount || 0),
            pickupTitle: r.pickupTitle || r.pickupName || (r.rideType === "delivery" ? (r.partnerName || "Partner Store") : "Customer Pickup"),
            pickupAddress: r.pickupAddress || r.pickupLocation?.address || "Pickup Address",
            dropTitle: r.dropTitle || r.dropName || (r.rideType === "delivery" ? (r.customerName || "Customer Delivery") : (r.partnerName || "Partner Store")),
            dropAddress: r.dropAddress || r.dropLocation?.address || "Delivery Address",
            pickupDistanceKm: r.distanceKm ? Number((r.distanceKm * 0.3).toFixed(1)) : 0.5,
            dropDistanceKm: r.distanceKm ? Number(r.distanceKm) : 2.5,
            fare: Number(r.estimatedEarning || r.fare || 45),
            amount: Number(r.amount || r.total_amount || 0),
            paymentMode: r.paymentMode || r.payment_method || "cod",
            customerName: r.customerName || "Customer",
            customerPhone: r.customerPhone || "",
            partnerName: r.partnerName || "QuickPress Partner Store",
            partnerPhone: r.partnerPhone || "",
            partnerAddress: r.partnerAddress || "",
            pickupOtp: pOtp ? String(pOtp) : undefined,
            deliveryOtp: dOtp ? String(dOtp) : undefined,
            dispatchOtp: dispOtp ? String(dispOtp) : undefined,
            customerCoords: custCoords,
            partnerCoords: partCoords,
            pickupCoords: r.rideType === "delivery" ? partCoords : custCoords,
            dropCoords: r.rideType === "delivery" ? custCoords : partCoords,
            items: r.items || [],
            placedAt: r.placedAt || r.createdAt,
            expiresInSeconds: 120, // 2 minutes SLA
            isRouteMatch: Boolean(r.isRouteMatch),
            routeBadge: r.routeBadge || undefined,
            isExpress: Boolean(r.isExpress || r.express || (r.rideDoc && r.rideDoc.isExpress)),
            expressFee: Number(r.expressFee || (r.rideDoc && r.rideDoc.expressFee) || 40),
            riderExpressBonus: Number(r.riderExpressBonus || (r.rideDoc && r.rideDoc.riderExpressBonus) || 32),
            expressRiderSharePercent: Number(r.expressRiderSharePercent || 80),
          };
        });
        setOffers((prev) => {
          if (prev.length === 0 && formatted.length > 0) {
            try {
              unlockAudioContext();
              triggerHaptic([200, 100, 200, 100, 400]);
              playOrderAlertSound();
              speakOrderAlert(formatted[0].fare || 45, formatted[0].pickupTitle, formatted[0].dropTitle);
            } catch {}
          }
          return formatted;
        });
      } else {
        setOffers([]);
      }
    } catch {
      if (!isBackground) setOffers([]);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
    const timer = setInterval(() => {
      if (!activeOrder) {
        loadOffers(true);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeOrder]);

  // 2-minute SLA Timer (120s) for the top incoming offer
  useEffect(() => {
    if (offers.length === 0 || activeOrder) return;
    setCountdown(120);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadOffers(true);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offers.length, activeOrder]);

  // Real-time Socket.IO subscription for order lifecycle updates
  useEffect(() => {
    const unsub = subscribeRiderOrders((eventData) => {
      console.log("[RiderOrdersScreen] ⚡ Realtime order update:", eventData);
      loadOffers(true);
    });
    return () => {
      unsub();
    };
  }, []);

  // Subscribe to live WebSocket offers
  useEffect(() => {
    const unsubscribe = subscribeRiderOffers((rawOffer: any) => {
      const c_lat = rawOffer.customerCoords?.lat ?? rawOffer.pickupCoords?.lat ?? rawOffer.pickupLocation?.latitude ?? rawOffer.pickupLocation?.lat;
      const c_lng = rawOffer.customerCoords?.lng ?? rawOffer.pickupCoords?.lng ?? rawOffer.pickupLocation?.longitude ?? rawOffer.pickupLocation?.lng;
      const p_lat = rawOffer.partnerCoords?.lat ?? rawOffer.dropCoords?.lat ?? rawOffer.partnerLocation?.latitude ?? rawOffer.partnerLocation?.lat;
      const p_lng = rawOffer.partnerCoords?.lng ?? rawOffer.dropCoords?.lng ?? rawOffer.partnerLocation?.longitude ?? rawOffer.partnerLocation?.lng;

      const custCoords = c_lat != null && c_lng != null ? { lat: Number(c_lat), lng: Number(c_lng) } : undefined;
      const partCoords = p_lat != null && p_lng != null ? { lat: Number(p_lat), lng: Number(p_lng) } : undefined;

      const newOffer: OrderOfferItem = {
        id: rawOffer.id || rawOffer._id || `off-${Date.now()}`,
        orderId: rawOffer.orderId || rawOffer.id,
        orderCode: rawOffer.orderCode || rawOffer.code || (rawOffer.orderId ? String(rawOffer.orderId).slice(-6).toUpperCase() : undefined),
        type: rawOffer.type || "bike",
        rideType: rawOffer.rideType || (rawOffer.type === "delivery" || rawOffer.type === "handover_delivery" ? "delivery" : "pickup"),
        pickupTitle: rawOffer.pickupTitle || (rawOffer.rideType === "delivery" ? (rawOffer.partnerName || "Partner Store") : "Customer Pickup"),
        pickupAddress: rawOffer.pickupAddress || "",
        dropTitle: rawOffer.dropTitle || (rawOffer.rideType === "delivery" ? (rawOffer.customerName || "Customer Delivery") : (rawOffer.partnerName || "Partner Store")),
        dropAddress: rawOffer.dropAddress || "",
        pickupDistanceKm: rawOffer.pickupDistanceKm || 0.5,
        dropDistanceKm: rawOffer.dropDistanceKm || 2.5,
        fare: Number(rawOffer.fare || rawOffer.estimatedEarning || 45.0),
        amount: Number(rawOffer.amount || rawOffer.total_amount || 0),
        paymentMode: rawOffer.paymentMode || rawOffer.payment_method || "cod",
        customerName: rawOffer.customerName || "Customer",
        customerPhone: rawOffer.customerPhone || "",
        partnerName: rawOffer.partnerName || "QuickPress Partner Store",
        partnerPhone: rawOffer.partnerPhone || "",
        partnerAddress: rawOffer.partnerAddress || "",
        pickupOtp: rawOffer.pickupOtp ? String(rawOffer.pickupOtp) : undefined,
        deliveryOtp: rawOffer.deliveryOtp ? String(rawOffer.deliveryOtp) : undefined,
        dispatchOtp: rawOffer.dispatchOtp ? String(rawOffer.dispatchOtp) : undefined,
        customerCoords: custCoords,
        partnerCoords: partCoords,
        pickupCoords: rawOffer.rideType === "delivery" ? partCoords : custCoords,
        dropCoords: rawOffer.rideType === "delivery" ? custCoords : partCoords,
        items: rawOffer.items || [],
        placedAt: rawOffer.placedAt || rawOffer.createdAt,
        expiresInSeconds: 120,
        isExpress: Boolean(rawOffer.isExpress || rawOffer.express || (rawOffer.rideDoc && rawOffer.rideDoc.isExpress)),
        expressFee: Number(rawOffer.expressFee || (rawOffer.rideDoc && rawOffer.rideDoc.expressFee) || 40),
        riderExpressBonus: Number(rawOffer.riderExpressBonus || (rawOffer.rideDoc && rawOffer.rideDoc.riderExpressBonus) || 32),
        expressRiderSharePercent: Number(rawOffer.expressRiderSharePercent || 80),
      };

      unlockAudioContext();
      triggerHaptic([200, 100, 200, 100, 400]);
      playOrderAlertSound();
      speakOrderAlert(newOffer.fare || 45, newOffer.pickupTitle, newOffer.dropTitle);
      setOffers((prev) => [newOffer, ...prev.filter((o) => o.id !== newOffer.id)]);
    });

    return () => {
      stopOrderAlertSound();
      unsubscribe();
    };
  }, []);

  // Handle Accept: Immediately transitions to Go to Pickup HUD
  const handleAccept = async (offer: OrderOfferItem) => {
    try {
      stopOrderAlertSound();
      unlockAudioContext();
      triggerHaptic();
      playSuccessChime();
      speakText("ऑर्डर स्वीकार कर लिया गया है। पिकअप के लिए प्रस्थान करें।");
    } catch {}

    const targetId = offer.orderId || offer.id;
    toast.success(`Order Accepted for ${offer.pickupTitle || "Pickup"}! Moving to pickup... 🛵`);

    // Remove from queue
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));

    const newActiveOrder: ActiveOrderData = {
      orderId: targetId,
      orderCode: offer.orderCode || targetId.slice(-6).toUpperCase(),
      customerName: offer.customerName || "Customer",
      customerPhone: offer.customerPhone || "",
      partnerName: offer.partnerName || "QuickPress Partner Store",
      partnerPhone: offer.partnerPhone || "",
      partnerAddress: offer.partnerAddress || offer.dropAddress,
      pickupAddress: offer.pickupAddress || offer.pickupTitle || "Customer Pickup Location",
      pickupTitle: offer.pickupTitle || "Pickup Location",
      dropAddress: offer.dropAddress || offer.dropTitle || "QuickPress Partner Hub",
      dropTitle: offer.dropTitle || "Partner Hub",
      distanceMeters: Math.round((offer.pickupDistanceKm || 1.2) * 1000),
      pickupDistanceKm: offer.pickupDistanceKm || 1.2,
      dropDistanceKm: offer.dropDistanceKm || 2.5,
      fare: offer.fare || 45.0,
      amount: offer.amount || offer.fare || 45.0,
      paymentMode: offer.paymentMode || "cod",
      items: offer.items || [],
      placedAt: offer.placedAt || new Date().toISOString(),
      startOtp: offer.pickupOtp || "",
      deliveryOtp: offer.deliveryOtp || "",
      dispatchOtp: offer.dispatchOtp || "",
      customerCoords: offer.customerCoords,
      partnerCoords: offer.partnerCoords,
      pickupCoords: offer.pickupCoords,
      dropCoords: offer.dropCoords,
      rideType: offer.rideType || (offer.type === "delivery" || offer.type === "handover_delivery" ? "delivery" : "pickup"),
    };

    // Save to persistent storage and state
    try {
      localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(newActiveOrder));
    } catch {}
    setActiveOrder(newActiveOrder);

    // Call Real Backend API to claim trip
    try {
      const res = await acceptRiderOrder(targetId);
      if (res.ok && res.order) {
        const ord = res.order as any;
        const pickupOtp =
          (typeof ord.otp?.pickup === "object" ? ord.otp?.pickup?.code : ord.otp?.pickup) ||
          ord.pickupOtp ||
          newActiveOrder.startOtp;
        const deliveryOtp =
          (typeof ord.otp?.delivery === "object" ? ord.otp?.delivery?.code : ord.otp?.delivery) ||
          ord.deliveryOtp ||
          newActiveOrder.deliveryOtp;
        const dispatchOtp =
          (typeof ord.otp?.dispatch === "object" ? ord.otp?.dispatch?.code : ord.otp?.dispatch) ||
          ord.dispatchOtp ||
          newActiveOrder.dispatchOtp;

        const c_loc = ord.pickupLocation || ord.customerLocation || ord.deliveryLocation;
        const p_loc = ord.partnerLocation || ord.storeLocation;
        const c_lat = ord.customerCoords?.lat ?? c_loc?.latitude ?? c_loc?.lat;
        const c_lng = ord.customerCoords?.lng ?? c_loc?.longitude ?? c_loc?.lng;
        const p_lat = ord.partnerCoords?.lat ?? p_loc?.latitude ?? p_loc?.lat;
        const p_lng = ord.partnerCoords?.lng ?? p_loc?.longitude ?? p_loc?.lng;

        const custCoords = c_lat != null && c_lng != null ? { lat: Number(c_lat), lng: Number(c_lng) } : newActiveOrder.customerCoords;
        const partCoords = p_lat != null && p_lng != null ? { lat: Number(p_lat), lng: Number(p_lng) } : newActiveOrder.partnerCoords;

        const updatedActiveOrder: ActiveOrderData = {
          ...newActiveOrder,
          orderCode: ord.code || ord.orderCode || targetId.slice(-6).toUpperCase(),
          startOtp: pickupOtp ? String(pickupOtp) : newActiveOrder.startOtp,
          deliveryOtp: deliveryOtp ? String(deliveryOtp) : newActiveOrder.deliveryOtp,
          dispatchOtp: dispatchOtp ? String(dispatchOtp) : newActiveOrder.dispatchOtp,
          customerCoords: custCoords,
          partnerCoords: partCoords,
          pickupCoords: ord.rideType === "delivery" ? partCoords : custCoords,
          dropCoords: ord.rideType === "delivery" ? custCoords : partCoords,
          customerName: ord.customerName || newActiveOrder.customerName,
          customerPhone: ord.customerPhone || newActiveOrder.customerPhone,
          partnerName: ord.partnerName || newActiveOrder.partnerName,
          partnerPhone: ord.partnerPhone || newActiveOrder.partnerPhone,
          partnerAddress: ord.partnerAddress || newActiveOrder.partnerAddress,
          pickupAddress: ord.pickupAddress || newActiveOrder.pickupAddress,
          dropAddress: ord.deliveryAddress || ord.dropAddress || newActiveOrder.dropAddress,
          paymentMode: ord.paymentMode || ord.payment?.mode || newActiveOrder.paymentMode,
          amount: Number(ord.amount ?? ord.totalAmount ?? newActiveOrder.amount),
          fare: Number(ord.estimatedEarning ?? ord.fare ?? newActiveOrder.fare),
        };
        setActiveOrder(updatedActiveOrder);
        try {
          localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(updatedActiveOrder));
        } catch {}
      } else if (res.ok === false) {
        // If conflict or already claimed by another captain
        toast.error("Trip could not be claimed or is no longer available.");
        try {
          localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        } catch {}
        setActiveOrder(null);
        loadOffers(false);
      }
    } catch {}
  };

  // Handle Reject
  const handleReject = async (offer: OrderOfferItem) => {
    stopOrderAlertSound();
    triggerHaptic(60);
    const targetId = offer.orderId || offer.id;
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    await rejectRiderOrder(targetId).catch(() => {});
  };

  // Open Google Maps Road Turn-by-Turn Navigation for Offer
  const handleOpenGoogleMaps = (offer: OrderOfferItem) => {
    triggerHaptic(40);
    const target = offer.pickupCoords || offer.customerCoords || offer.partnerCoords;
    if (target && target.lat && target.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=two_wheeler`,
        "_blank"
      );
    } else {
      const dest = encodeURIComponent(offer.pickupAddress || offer.pickupTitle || "Kasganj");
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=two_wheeler`,
        "_blank"
      );
    }
  };

  const handleTripEnd = () => {
    try {
      localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
    } catch {}
    setActiveOrder(null);
  };

  // If an active order is in progress, render the GoToPickupHUD screen
  if (activeOrder) {
    return (
      <>
        <CaptainSidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          captainName={session?.fullName || "Captain"}
          captainId={session?.riderId || ""}
          rating={4.94}
        />
        <GoToPickupHUD
          order={activeOrder}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onTripCompleted={handleTripEnd}
          onCancelTrip={handleTripEnd}
        />
      </>
    );
  }

  const totalOrders = offers.length;

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-zinc-50/50 shadow-2xl overflow-y-auto text-zinc-900 select-none pb-24">
      {/* 1. Sticky Header with Live Orders Title */}
      <div
        className="sticky top-0 z-30 px-4 pb-3 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 12px, 16px)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <span>{t("orders.liveQueue", "Live Order Queue")}</span>
              {totalOrders > 0 ? (
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="flex size-2 rounded-full bg-zinc-300" />
              )}
            </h1>
            <p className="text-[11px] font-medium text-zinc-500">
              {totalOrders > 0
                ? `${totalOrders} active order${totalOrders > 1 ? "s" : ""} available for dispatch`
                : t("orders.waitingNotice", "Stay in your Work Zone to receive instant dispatches")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {totalOrders > 0 && (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                {totalOrders}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadOffers()}
              disabled={isLoading}
              className="flex size-8.5 items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl active:scale-95 transition-all"
              title="Refresh Queue"
            >
              <RotateCw
                className={`size-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* My Route Active Indicator Strip */}
      {routeBooking?.isActive && (
        <div
          onClick={() => setIsRouteModalOpen(true)}
          className="mx-3.5 mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/25">
              <Route className="size-4 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-white truncate">
                  My Route: {routeBooking.destinationName}
                </span>
                <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-black">
                  ±{routeBooking.maxDetourKm}km
                </span>
              </div>
              <p className="text-[10px] text-emerald-100 font-medium truncate">
                Prioritizing orders on your way · {routeBooking.remainingPassesToday ?? 3} passes left
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-white text-emerald-900 px-2.5 py-1 rounded-lg font-black shrink-0 ml-2 shadow-xs">
            Manage
          </span>
        </div>
      )}

      {totalOrders > 0 ? (
        <div className="flex-1 px-3.5 py-3 space-y-3.5">
          {offers.map((offer, idx) => {
            const isTop = idx === 0;
            const isDelivery =
              offer.rideType === "delivery" ||
              offer.type === "delivery" ||
              offer.isTransfer ||
              offer.type === "handover_delivery" ||
              offer.dropTitle?.toLowerCase().includes("customer") ||
              offer.pickupTitle?.toLowerCase().includes("store") ||
              offer.pickupTitle?.toLowerCase().includes("partner") ||
              offer.pickupTitle?.toLowerCase().includes("hub");

            return (
              <div
                key={offer.id}
                className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm transition-all space-y-3.5"
              >
                {/* 2-Minute SLA Countdown (Top incoming offer) */}
                {isTop && (
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-amber-600 animate-pulse" />
                        <span>Captain Response SLA</span>
                      </span>
                      <span className="font-mono text-xs font-black text-amber-800">
                        ⏱️ {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(countdown / 120) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Header: Service Type Pill + Order Code + Fare */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                        isDelivery
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isDelivery ? (
                        <>
                          <Package className="size-3" />
                          <span>Delivery Leg</span>
                        </>
                      ) : (
                        <>
                          <Shirt className="size-3" />
                          <span>Pickup Leg</span>
                        </>
                      )}
                    </span>

                    {offer.orderCode && (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-700">
                        #{offer.orderCode}
                      </span>
                    )}
                  </div>

                  {/* Guaranteed Payout Badge */}
                  <div className="flex items-center gap-1 rounded-xl bg-zinc-950 px-3 py-1 text-white shadow-xs">
                    <span className="text-[10px] font-medium text-zinc-400">Payout</span>
                    <span className="text-xs font-black text-white">
                      ₹{offer.fare?.toFixed(0) || "45"}
                    </span>
                  </div>
                </div>

                {/* ⚡ Express Priority Bonus Callout */}
                {offer.isExpress && (
                  <div className="flex items-center justify-between gap-2 px-3.5 py-3 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/15 border-2 border-amber-500/70 rounded-2xl shadow-md animate-pulse">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-8 rounded-xl bg-amber-500/40 items-center justify-center text-amber-900 dark:text-amber-200 shrink-0 border border-amber-500/60">
                        <Zap className="size-4.5 fill-amber-500" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide truncate">
                          ⚡ EXPRESS PICKUP + EXPRESS CHARGES KA {offer.expressRiderSharePercent || 80}% BONUS
                        </span>
                        <span className="block text-[10.5px] text-amber-900/90 dark:text-amber-300 font-medium">
                          Priority pickup! Surge bonus credited directly into your trip fare.
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold text-amber-900/80 dark:text-amber-300 block uppercase">Bonus</span>
                      <span className="text-base font-black text-amber-900 dark:text-amber-200">
                        +₹{offer.riderExpressBonus || Math.round((offer.expressFee || 40) * 0.8)}
                      </span>
                    </div>
                  </div>
                )}

                {/* On-Route Match Priority Badge */}
                {offer.routeBadge && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-300 rounded-2xl text-xs font-black text-emerald-800">
                    <span className="flex size-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="truncate">🎯 {offer.routeBadge}</span>
                  </div>
                )}

                {/* Route Timeline: Pickup & Drop Points */}
                <div className="rounded-2xl bg-zinc-50/70 border border-zinc-100 p-3 space-y-2.5">
                  {/* Point 1: Pickup */}
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-[9px] shrink-0 mt-0.5 shadow-2xs">
                      P
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-zinc-900 truncate">
                          {offer.pickupTitle || "Pickup Hub"}
                        </p>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {offer.pickupDistanceKm || 0.8} km
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium truncate">
                        {offer.pickupAddress}
                      </p>
                    </div>
                  </div>

                  {/* Dashed Connecting Line */}
                  <div className="ml-2 w-0.5 h-2 bg-zinc-200 border-dashed" />

                  {/* Point 2: Drop */}
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-white font-black text-[9px] shrink-0 mt-0.5 shadow-2xs">
                      D
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-zinc-900 truncate">
                          {offer.dropTitle || "Delivery Destination"}
                        </p>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {offer.dropDistanceKm || 2.4} km
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium truncate">
                        {offer.dropAddress}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meta details strip */}
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 px-1">
                  <span>
                    Payment: <strong className="text-zinc-800 font-bold uppercase">{offer.paymentMode || "COD"}</strong>
                  </span>
                  <span>
                    Est. Distance: <strong className="text-zinc-800 font-bold">{((offer.pickupDistanceKm || 0.8) + (offer.dropDistanceKm || 2.4)).toFixed(1)} km</strong>
                  </span>
                </div>

                {/* Action Buttons: [ Reject ] [ Google Maps 🗺️ ] [ Accept Order ] */}
                <div className="flex items-center gap-2 pt-0.5">
                  {/* Reject Button */}
                  <button
                    type="button"
                    onClick={() => handleReject(offer)}
                    className="flex size-11 items-center justify-center rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 active:scale-95 transition-all shrink-0"
                    aria-label="Reject order"
                    title="Pass order"
                  >
                    <X className="size-5 stroke-[2.2]" />
                  </button>

                  {/* Google Maps Road Navigation Preview Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenGoogleMaps(offer)}
                    className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 active:scale-95 transition-all shrink-0 cursor-pointer"
                    aria-label="Preview road navigation in Google Maps"
                    title="Open Google Maps Two-Wheeler Turn-by-Turn Navigation"
                  >
                    <Navigation className="size-5 stroke-[2.2] text-blue-600" />
                  </button>

                  {/* Accept CTA Button */}
                  <button
                    type="button"
                    onClick={() => handleAccept(offer)}
                    className="flex-1 flex items-center justify-center gap-2 h-11 font-black text-xs sm:text-sm rounded-2xl bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-900 text-white shadow-md active:scale-98 transition-all"
                  >
                    <span>Accept Order · ₹{offer.fare?.toFixed(0) || "45"}</span>
                    {isTop && (
                      <span className="flex items-center justify-center min-w-[24px] h-5 px-1 text-[10px] font-black rounded-full bg-white/20 text-white">
                        {countdown}s
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State: Queue is clear */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto space-y-4">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 shadow-xs">
            <span className="absolute size-20 rounded-full bg-emerald-500/10 animate-ping" />
            <Bike className="size-9 text-zinc-800" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-zinc-900">
              No Pending Orders in Queue
            </h3>
            <p className="text-xs text-zinc-500 font-medium max-w-xs leading-relaxed">
              Your dispatch radar is active. Orders in your service zone will automatically ring here.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => loadOffers()}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs rounded-xl border border-zinc-200 shadow-xs active:scale-95 transition-all"
            >
              {isLoading ? "Checking..." : "🔄 Refresh Queue"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all"
            >
              Back to Map
            </button>
          </div>
        </div>
      )}

      {/* 3. Strictly 2-Tab Bottom Navigation */}
      <RiderBottomNav active="orders" ordersBadgeCount={totalOrders} />

      {/* Route Booking Modal */}
      <CaptainRouteBookingModal
        isOpen={isRouteModalOpen}
        onClose={() => {
          setIsRouteModalOpen(false);
          loadRouteState();
          loadOffers(true);
        }}
        onUpdated={(updated) => {
          setRouteBooking(updated);
          loadOffers(true);
        }}
      />
    </div>
  );
}
