import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Minus,
  Navigation,
  Package,
  RotateCw,
  Shirt,
  X,
  XCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { RiderTripDetailModal } from "../components/trips/RiderTripDetailModal";
import {
  acceptRiderOrder,
  fetchRiderOffers,
  fetchRiderOrder,
  rejectRiderOrder,
} from "../api/rider/rider-orders-api";
import { useRiderContext } from "../context/RiderContext";
import { useLanguage } from "../lib/i18n";
import { subscribeRiderOffers, subscribeRiderOrders } from "../lib/rider-socket";
import {
  playSuccessChime,
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
  isMissed?: boolean;
  missedReason?: string;
}

const ACTIVE_ORDER_STORAGE_KEY = "qp_active_rider_order";

export function RiderOrdersScreen() {
  const navigate = useNavigate();
  const { session, isOnline } = useRiderContext();
  const { t } = useLanguage();

  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState<OrderOfferItem | null>(null);

  // Restore saved active order on client mount safely and listen for instant active order updates
  useEffect(() => {
    const handleActiveOrderUpdate = (e: any) => {
      if (e?.detail) {
        setActiveOrder(e.detail);
        setIsHudMinimized(false);
        setOffers((prev) => prev.filter((o) => o.orderId !== e.detail.orderId && o.id !== e.detail.orderId));
      }
    };
    window.addEventListener("qp:active_order_updated", handleActiveOrderUpdate);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_ORDER_STORAGE_KEY) {
        if (!e.newValue) {
          setActiveOrder(null);
        } else {
          try {
            setActiveOrder(JSON.parse(e.newValue));
          } catch {}
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    try {
      const saved = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isTest = Boolean(
          parsed &&
            (String(parsed.id || "").toUpperCase().includes("TEST") ||
              String(parsed.orderId || "").toUpperCase().includes("TEST") ||
              String(parsed.orderCode || "").toUpperCase().includes("TEST") ||
              String(parsed.customerName || "").toLowerCase().includes("sector 67") ||
              String(parsed.pickupAddress || "").toLowerCase().includes("sector 67"))
        );

        if (isTest) {
          localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
          localStorage.removeItem("qp_active_delivery_order");
          setActiveOrder(null);
        } else {
          setActiveOrder(parsed);

          // Verify with server if order is actually still active
          const targetId = parsed.orderId || parsed.id;
          if (targetId) {
            fetchRiderOrder(targetId)
              .then((serverOrder: any) => {
                const s = String(serverOrder?.status || serverOrder?.canonicalStatus || "").toLowerCase();
                const isFinished = ["delivered", "completed", "cancelled", "failed"].includes(s);
                if (isFinished) {
                  localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
                  localStorage.removeItem("qp_active_delivery_order");
                  setActiveOrder(null);
                  toast.info(`Order #${parsed.orderCode || targetId.slice(-6).toUpperCase()} was completed.`);
                }
              })
              .catch((err: any) => {
                const st = err?.status || err?.statusCode;
                if (st === 404 || st === 410) {
                  localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
                  localStorage.removeItem("qp_active_delivery_order");
                  setActiveOrder(null);
                }
              });
          }
        }
      }
      localStorage.removeItem("qp_test_rider_offer");
    } catch {}

    return () => {
      window.removeEventListener("qp:active_order_updated", handleActiveOrderUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const [offers, setOffers] = useState<OrderOfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const loadOffers = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const rawOffers = await fetchRiderOffers();
      if (Array.isArray(rawOffers) && rawOffers.length > 0) {
        const validRawOffers = rawOffers.filter((r: any) => {
          return !r.is_demo && !r.isDemo && String(r.orderCode || r.code || "").toUpperCase() !== "MOCK_DEMO";
        });
        const formatted: OrderOfferItem[] = validRawOffers.map((r: any) => {
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
            expiresInSeconds: 900, // 15 minutes SLA
            isRouteMatch: Boolean(r.isRouteMatch),
            routeBadge: r.routeBadge || undefined,
            isExpress: Boolean(r.isExpress || r.express || (r.rideDoc && r.rideDoc.isExpress)),
            expressFee: Number(r.expressFee || (r.rideDoc && r.rideDoc.expressFee) || 40),
            riderExpressBonus: Number(r.riderExpressBonus || (r.rideDoc && r.rideDoc.riderExpressBonus) || 32),
            expressRiderSharePercent: Number(r.expressRiderSharePercent || 80),
          };
        });
        setOffers((prev) => {
          if (
            prev.length === formatted.length &&
            prev.every((p, idx) => p.id === formatted[idx].id && p.placedAt === formatted[idx].placedAt && p.fare === formatted[idx].fare)
          ) {
            return prev;
          }
          return formatted;
        });
      } else {
        // In background polling, do not wipe existing active offers unless explicitly refreshed
        if (!isBackground) {
          setOffers((prev) => (prev.length === 0 ? prev : []));
        }
      }
    } catch {
      if (!isBackground) setOffers((prev) => (prev.length === 0 ? prev : []));
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
    }, 4000);
    return () => clearInterval(timer);
  }, [activeOrder]);

  // 15-minute SLA Countdown Timer
  useEffect(() => {
    if (offers.length === 0 || activeOrder) return;
    const topOffer = offers[0];
    const initialElapsed = topOffer?.placedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(topOffer.placedAt).getTime()) / 1000))
      : 0;
    const initialRemaining = Math.max(15, 900 - initialElapsed);
    setCountdown(initialRemaining);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setOffers((current) =>
            current.map((o, idx) =>
              idx === 0 && !o.isMissed
                ? { ...o, isMissed: true, missedReason: "Sorry, this order was accepted by another captain." }
                : o
            )
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offers[0]?.id, offers[0]?.isMissed, Boolean(activeOrder)]);

  // Real-time Socket.IO subscription for order lifecycle updates
  useEffect(() => {
    const unsub = subscribeRiderOrders((eventData: any) => {
      console.log("[RiderOrdersScreen] ⚡ Realtime order update:", eventData);
      const ev = eventData?.event || eventData?.type;
      const targetOrderId = eventData?.orderId || eventData?.order?._id;

      if (ev === "ride.claimed") {
        if (targetOrderId) {
          setOffers((prev) =>
            prev.map((o) =>
              o.orderId === targetOrderId || o.id === targetOrderId
                ? { ...o, isMissed: true, missedReason: "Sorry, this order was accepted by another captain." }
                : o
            )
          );
        }
      } else if (
        ev === "order.cancelled" ||
        ev === "rider.ride_cancelled" ||
        ev === "order.delivered" ||
        ev === "order.completed"
      ) {
        if (targetOrderId) {
          setOffers((prev) => prev.filter((o) => o.orderId !== targetOrderId && o.id !== targetOrderId));
          setActiveOrder((prev) => {
            if (prev && (prev.orderId === targetOrderId || prev.id === targetOrderId)) {
              try {
                localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
                localStorage.removeItem("qp_active_delivery_order");
              } catch {}
              return null;
            }
            return prev;
          });
        }
      }

      // Handle direct trip assigned event (when explicitly assigned to this captain)
      if (ev === "order.trip_assigned" || ev === "order.rider_assigned") {
        const tId = eventData?.orderId || eventData?.id;
        const myRiderId = session?.riderId || (typeof window !== "undefined" ? localStorage.getItem("qp_rider_id") : "");
        const assignedRider = eventData?.riderId || eventData?.rider?.id || eventData?.assignedRiderId;

        if (tId && (!assignedRider || assignedRider === myRiderId)) {
          const directOrder: ActiveOrderData = {
            orderId: tId,
            orderCode: eventData.orderCode || tId.slice(-6).toUpperCase(),
            customerName: eventData.customerName || "Customer",
            customerPhone: eventData.customerPhone || "",
            partnerName: eventData.partnerName || "QuickPress Partner Store",
            partnerPhone: eventData.partnerPhone || "",
            partnerAddress: eventData.partnerAddress || eventData.dropAddress || "",
            pickupAddress: eventData.pickupAddress || eventData.pickupTitle || "Customer Pickup Location",
            pickupTitle: eventData.pickupTitle || "Pickup Location",
            dropAddress: eventData.dropAddress || eventData.dropTitle || "QuickPress Partner Hub",
            dropTitle: eventData.dropTitle || "Partner Hub",
            distanceMeters: Math.round((eventData.pickupDistanceKm || eventData.distanceKm || 1.2) * 1000),
            pickupDistanceKm: Number(eventData.pickupDistanceKm || eventData.distanceKm || 1.2),
            dropDistanceKm: Number(eventData.dropDistanceKm || 2.5),
            fare: Number(eventData.fare || eventData.estimatedEarning || 45.0),
            amount: Number(eventData.amount || eventData.fare || 45.0),
            paymentMode: eventData.paymentMode || "cod",
            items: eventData.items || [],
            placedAt: eventData.placedAt || new Date().toISOString(),
            startOtp: String(eventData.pickupOtp || ""),
            deliveryOtp: String(eventData.deliveryOtp || ""),
            dispatchOtp: String(eventData.handoverOtp || eventData.dispatchOtp || ""),
            customerCoords: eventData.customerCoords,
            partnerCoords: eventData.partnerCoords,
            pickupCoords: eventData.pickupCoords,
            dropCoords: eventData.dropCoords,
            rideType: eventData.rideType || "pickup",
          };
          try {
            localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(directOrder));
            localStorage.setItem("qp_active_delivery_order", JSON.stringify(directOrder));
          } catch {}
          setActiveOrder(directOrder);
          setIsHudMinimized(false);
          setOffers((prev) => prev.filter((o) => o.orderId !== tId && o.id !== tId));
          return;
        } else if (tId && assignedRider && assignedRider !== myRiderId) {
          // Assigned to another captain, remove from our queue
          setOffers((prev) => prev.filter((o) => o.orderId !== tId && o.id !== tId));
        }
      }

      loadOffers(true);
    });
    return () => {
      unsub();
    };
  }, [session?.riderId]);

  // Subscribe to live WebSocket offers for 0-latency Live Queue updates
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

      // Add offer to Live Queue instantly with deduplication (GlobalOrderDispatchListener handles modal & siren)
      setOffers((prev) => {
        const exists = prev.some((o) => o.orderId === newOffer.orderId || o.id === newOffer.id);
        if (exists) {
          return prev.map((o) => (o.orderId === newOffer.orderId || o.id === newOffer.id ? newOffer : o));
        }
        return [newOffer, ...prev];
      });
    });

    return () => {
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
    setIsHudMinimized(false);

    // Call Real Backend API to claim trip (skip for simulated test orders)
    if (targetId.startsWith("TEST-")) {
      return;
    }

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
    if (!targetId.startsWith("TEST-")) {
      await rejectRiderOrder(targetId).catch(() => {});
    }
  };

  // Handle Dismiss Missed Order
  const handleDismissMissed = (offer: OrderOfferItem) => {
    triggerHaptic(20);
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
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

  // If an active order is in progress and HUD is not minimized, render the GoToPickupHUD screen
  if (activeOrder && !isHudMinimized) {
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
          onBackToTrips={() => setIsHudMinimized(true)}
        />
      </>
    );
  }

  const totalOrders = offers.length;

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F9FAFB] shadow-2xl overflow-y-auto text-zinc-900 select-none pb-24">
      {/* 1. Clean Top Header (Screenshot 3 & 4 Match) */}
      <div
        className="sticky top-0 z-30 px-5 pb-3 bg-white border-b border-zinc-200/80 shadow-2xs"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 52px)" }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
            {totalOrders} Order{totalOrders !== 1 ? "s" : ""}
          </h1>

          <button
            type="button"
            onClick={() => loadOffers()}
            disabled={isLoading}
            className="flex size-8 items-center justify-center text-zinc-500 hover:text-zinc-950 rounded-lg active:scale-95 transition-all cursor-pointer"
            title="Refresh Orders"
          >
            <RotateCw className={`size-4 ${isLoading ? "animate-spin text-zinc-900" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top "Go To" Pill Button (Screenshot 3 & 4 Match) */}
      <div className="px-5 pt-3 pb-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            toast.info("Set Preferred Destination: Receive rides on your route home 🛵");
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200/90 shadow-2xs text-xs font-bold text-zinc-800 active:scale-95 transition-all cursor-pointer"
        >
          <MapPin className="size-3.5 fill-zinc-900 text-zinc-900" />
          <span>Go To</span>
        </button>
      </div>

      {/* 3. Active Trip In-Progress Card (Shown when HUD is minimized) */}
      {activeOrder && (
        <div className="px-4 pt-2">
          <div
            onClick={() => setIsHudMinimized(false)}
            className="p-3.5 rounded-2xl bg-zinc-900 text-white border border-zinc-700 shadow-md flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">🛵</span>
              <div className="min-w-0">
                <p className="text-xs font-black truncate">Active Trip #{activeOrder.orderCode}</p>
                <p className="text-[11px] text-zinc-400 truncate">{activeOrder.dropTitle || activeOrder.dropAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTripEnd();
                  toast.info(`Trip #${activeOrder.orderCode || ""} dismissed.`);
                }}
                className="px-2 py-1 bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 text-xs font-bold rounded-lg"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHudMinimized(false);
                }}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-lg flex items-center gap-1"
              >
                Resume ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Orders List or Clean Empty State */}
      {totalOrders > 0 ? (
        <div className="flex-1 px-4 py-3 space-y-4">
          {offers.map((offer) => {
            return (
              <div key={offer.id} className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Left status indicator if Missed (Screenshot 3 Match) */}
                {offer.isMissed && (
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-2">
                    <div className="size-6.5 rounded-full bg-red-50 border border-red-300 text-red-600 flex items-center justify-center font-black text-xs shadow-2xs">
                      !
                    </div>
                    <span className="text-[10px] font-bold text-red-600 tracking-tight">Missed</span>
                  </div>
                )}

                {/* Main Dark Order Card (Screenshot 3 Match) */}
                <div className="flex-1 rounded-3xl bg-[#373A42] p-4.5 sm:p-5 text-white shadow-xl border border-zinc-700/50 space-y-3.5">
                  {/* Missed Warning Alert Pill (Screenshot 3 Match) */}
                  {offer.isMissed && (
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-left">
                      <AlertCircle className="size-4.5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-red-950">You missed the order</h4>
                        <p className="text-[11px] text-red-800 mt-0.5 leading-snug">
                          {offer.missedReason || "Sorry, this order was accepted by another captain."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fare & SLA Row (for active offers) */}
                  {!offer.isMissed && (
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-700/60">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">₹{offer.fare?.toFixed(0) || "45"}</span>
                        {offer.orderCode && (
                          <span className="text-[11px] text-zinc-400 font-semibold bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60">
                            #{offer.orderCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {countdown > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-600/40 px-2.5 py-0.5 rounded-full">
                            <Clock className="size-3 text-amber-400 animate-pulse" />
                            <span>{countdown > 60 ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` : `${countdown}s`}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Route Stepper (Pickup -> Drop with precise km, Screenshot 3 Match) */}
                  <div className="space-y-1 py-0.5">
                    {/* Pickup Point */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="size-2 rounded-full bg-white shrink-0 mt-1" />
                        <div className="w-[1.5px] h-8 bg-zinc-500/80 my-0.5" />
                      </div>
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <span className="font-extrabold text-sm text-white block leading-tight">
                          {offer.pickupDistanceKm || 1.7} km
                        </span>
                        <p className="text-xs text-zinc-300 leading-snug mt-1">
                          <strong className="font-bold text-white">{offer.pickupTitle || "Tarora - 1"}</strong>
                          {" - "}
                          <span className="text-zinc-300">{offer.pickupAddress || "near Gayatri Temple, Kasganj"}</span>
                        </p>
                      </div>
                    </div>

                    {/* Drop Point */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-0.5">
                        <span className="text-[10px] text-white shrink-0 leading-none">▼</span>
                      </div>
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <span className="font-extrabold text-sm text-white block leading-tight">
                          {offer.dropDistanceKm || 2.5} km
                        </span>
                        <p className="text-xs text-zinc-300 leading-snug mt-1">
                          <strong className="font-bold text-white">{offer.dropTitle || "Kasganj Junction"}</strong>
                          {" - "}
                          <span className="text-zinc-300">{offer.dropAddress || "Kasganj Railway Station, Kasganj"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: [ Circular (-) ] [ Yellow Accept CTA ] (Screenshot 3 Match) */}
                  <div className="flex items-center gap-3 pt-1">
                    {/* Reject or Dismiss Circular Button */}
                    <button
                      type="button"
                      onClick={() => (offer.isMissed ? handleDismissMissed(offer) : handleReject(offer))}
                      className="size-12 rounded-full border border-zinc-600 bg-zinc-700/80 hover:bg-zinc-700 text-zinc-300 active:scale-90 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                      title={offer.isMissed ? "Dismiss" : "Decline trip"}
                      aria-label="Decline or Dismiss"
                    >
                      <Minus className="size-5 stroke-[2.4]" />
                    </button>

                    {/* Large Yellow Accept Button */}
                    <button
                      type="button"
                      disabled={offer.isMissed}
                      onClick={() => handleAccept(offer)}
                      className={`flex-1 h-12 rounded-full font-black text-base transition-all flex items-center justify-center shadow-md ${
                        offer.isMissed
                          ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                          : "bg-[#FFC700] hover:bg-[#FBBF24] active:scale-[0.98] text-zinc-950 cursor-pointer"
                      }`}
                    >
                      <span>{t("orders.accept", "Accept")}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State: Searching for orders... (Screenshot 4 Match) */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[50vh]">
          <div className="relative flex items-center justify-center size-14 mb-3">
            <span className="absolute size-10 rounded-full bg-zinc-300/40 animate-ping opacity-60" />
            <span className="relative size-3 rounded-full bg-zinc-400" />
          </div>
          <p className="text-sm sm:text-base font-medium text-zinc-700 tracking-tight">
            Searching for orders...
          </p>
        </div>
      )}

      {/* 5. 2-Tab Captain Bottom Navigation */}
      <RiderBottomNav active="orders" ordersBadgeCount={totalOrders} />

      {/* 4. Full Trip Details & Fare Slip Modal */}
      {selectedOfferForDetail && (
        <RiderTripDetailModal
          isOpen={Boolean(selectedOfferForDetail)}
          onClose={() => setSelectedOfferForDetail(null)}
          trip={{
            orderId: selectedOfferForDetail.orderId || selectedOfferForDetail.id,
            orderCode: selectedOfferForDetail.orderCode,
            customerName: selectedOfferForDetail.customerName,
            customerPhone: selectedOfferForDetail.customerPhone,
            pickupAddress: selectedOfferForDetail.pickupAddress,
            pickupTitle: selectedOfferForDetail.pickupTitle,
            dropAddress: selectedOfferForDetail.dropAddress,
            dropTitle: selectedOfferForDetail.dropTitle,
            partnerName: selectedOfferForDetail.partnerName,
            partnerAddress: selectedOfferForDetail.partnerAddress,
            fare: selectedOfferForDetail.fare || 45,
            baseFare: 35,
            distanceKm: (selectedOfferForDetail.pickupDistanceKm || 0.8) + (selectedOfferForDetail.dropDistanceKm || 2.2),
            paymentMode: selectedOfferForDetail.paymentMode,
            amount: selectedOfferForDetail.amount,
            pickupOtp: selectedOfferForDetail.pickupOtp,
            dispatchOtp: selectedOfferForDetail.dispatchOtp,
            deliveryOtp: selectedOfferForDetail.deliveryOtp,
            status: "Offer Queue",
          }}
        />
      )}
    </div>
  );
}
