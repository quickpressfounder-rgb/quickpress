import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
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
  rejectRiderOrder,
} from "../api/rider/rider-orders-api";
import { useRiderContext } from "../context/RiderContext";
import { useLanguage } from "../lib/i18n";
import { subscribeRiderOffers, subscribeRiderOrders } from "../lib/rider-socket";
import {
  playOrderAlertSound,
  playTripAssignedBell,
  playSuccessChime,
  speakOrderAlert,
  speakTripAssigned,
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
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState<OrderOfferItem | null>(null);

  // Restore saved active order on client mount safely without hydration mismatch
  useEffect(() => {
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
          setActiveOrder(null);
        } else {
          setActiveOrder(parsed);
        }
      }
      localStorage.removeItem("qp_test_rider_offer");
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
        // In background polling, do not wipe existing active offers unless explicitly refreshed
        if (!isBackground) {
          setOffers([]);
        }
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
          loadOffers(true);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offers[0]?.id, Boolean(activeOrder)]);

  // Real-time Socket.IO subscription for order lifecycle updates
  useEffect(() => {
    const unsub = subscribeRiderOrders((eventData: any) => {
      console.log("[RiderOrdersScreen] ⚡ Realtime order update:", eventData);
      const ev = eventData?.event || eventData?.type;
      const targetOrderId = eventData?.orderId || eventData?.order?._id;
      if (ev === "order.cancelled" || ev === "rider.ride_cancelled") {
        if (targetOrderId) {
          setOffers((prev) => prev.filter((o) => o.orderId !== targetOrderId && o.id !== targetOrderId));
        }
      }

      // Handle direct trip assigned event
      if (ev === "order.trip_assigned" || ev === "order.rider_assigned" || eventData?.autoAssigned) {
        const tId = eventData?.orderId || eventData?.id;
        if (tId) {
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
          unlockAudioContext();
          triggerHaptic([350, 150, 350, 150, 600, 300]);
          playTripAssignedBell();
          speakTripAssigned(directOrder.fare, directOrder.pickupTitle);
          toast.success(`🔔 Trip #${directOrder.orderCode} Assigned! Bell baj rahi hai... 🛵`, {
            duration: 6000,
            action: {
              label: "Mute Bell",
              onClick: () => stopOrderAlertSound(),
            },
          });
          return;
        }
      }

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

      const isDirectAssigned = Boolean(
        rawOffer.autoAssigned ||
        rawOffer.isAssigned ||
        rawOffer.status === "assigned" ||
        rawOffer.orderStatus === "pickup_rider_accepted" ||
        rawOffer.orderStatus === "rider_assigned" ||
        rawOffer.event === "order.trip_assigned"
      );

      // If directly assigned, auto-activate HUD immediately and ring bell
      if (isDirectAssigned) {
        const assignedOrder: ActiveOrderData = {
          orderId: newOffer.orderId,
          orderCode: newOffer.orderCode || (newOffer.orderId ? newOffer.orderId.slice(-6).toUpperCase() : "TRIP"),
          customerName: newOffer.customerName || "Customer",
          customerPhone: newOffer.customerPhone || "",
          partnerName: newOffer.partnerName || "QuickPress Partner Store",
          partnerPhone: newOffer.partnerPhone || "",
          partnerAddress: newOffer.partnerAddress || newOffer.dropAddress,
          pickupAddress: newOffer.pickupAddress || newOffer.pickupTitle || "Customer Pickup Location",
          pickupTitle: newOffer.pickupTitle || "Pickup Location",
          dropAddress: newOffer.dropAddress || newOffer.dropTitle || "QuickPress Partner Hub",
          dropTitle: newOffer.dropTitle || "Partner Hub",
          distanceMeters: Math.round((newOffer.pickupDistanceKm || 1.2) * 1000),
          pickupDistanceKm: newOffer.pickupDistanceKm || 1.2,
          dropDistanceKm: newOffer.dropDistanceKm || 2.5,
          fare: newOffer.fare || 45.0,
          amount: newOffer.amount || newOffer.fare || 45.0,
          paymentMode: newOffer.paymentMode || "cod",
          items: newOffer.items || [],
          placedAt: newOffer.placedAt || new Date().toISOString(),
          startOtp: newOffer.pickupOtp || "",
          deliveryOtp: newOffer.deliveryOtp || "",
          dispatchOtp: newOffer.dispatchOtp || "",
          customerCoords: newOffer.customerCoords,
          partnerCoords: newOffer.partnerCoords,
          pickupCoords: newOffer.pickupCoords,
          dropCoords: newOffer.dropCoords,
          rideType: newOffer.rideType || "pickup",
        };

        try {
          localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(assignedOrder));
          localStorage.setItem("qp_active_delivery_order", JSON.stringify(assignedOrder));
        } catch {}
        setActiveOrder(assignedOrder);
        setIsHudMinimized(false);
        unlockAudioContext();
        triggerHaptic([350, 150, 350, 150, 600, 300]);
        playTripAssignedBell();
        speakTripAssigned(assignedOrder.fare, assignedOrder.pickupTitle);
        toast.success(`🔔 Trip #${assignedOrder.orderCode} Assigned! Bell baj rahi hai... 🛵`, {
          duration: 6000,
          action: {
            label: "Mute Bell",
            onClick: () => stopOrderAlertSound(),
          },
        });
        return;
      }

      unlockAudioContext();
      triggerHaptic([350, 150, 350, 150, 600, 300]);
      playTripAssignedBell();
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



      {/* 2. Active Trip In-Progress Card (Shown when HUD is minimized) */}
      {activeOrder && (
        <div className="px-3.5 pt-3">
          <div
            onClick={() => setIsHudMinimized(false)}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-lg shadow-emerald-700/20 border-2 border-emerald-400/40 flex items-center justify-between cursor-pointer active:scale-98 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl shadow-inner">
                <span>🛵</span>
                <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400 ring-2 ring-emerald-600 animate-ping" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-wide uppercase bg-white/20 px-2 py-0.5 rounded-full">
                    {activeOrder.rideType === "delivery" ? "Delivery In Progress" : "Trip Active"}
                  </span>
                  <span className="text-xs font-black text-amber-200">
                    #{activeOrder.orderCode}
                  </span>
                </div>
                <h4 className="text-sm font-black mt-0.5 leading-snug truncate">
                  {activeOrder.customerName || "Customer"} · ₹{activeOrder.fare.toFixed(2)}
                </h4>
                <p className="text-[11px] font-medium text-emerald-100 truncate">
                  {activeOrder.dropTitle || activeOrder.pickupTitle || activeOrder.dropAddress || "Trip in progress"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHudMinimized(false);
              }}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Resume</span>
              <span>➔</span>
            </button>
          </div>
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
                className={`rounded-3xl bg-white p-5 transition-all space-y-4 border ${
                  isTop
                    ? "border-emerald-400 shadow-xl shadow-emerald-600/10 ring-4 ring-emerald-500/10 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    : "border-zinc-200/90 shadow-md"
                }`}
              >
                {/* Top Header: Badge + SLA Countdown */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-semibold">
                    <span className="size-4 rounded-full bg-zinc-800 flex items-center justify-center text-white shrink-0">
                      <Bike className="size-2.5" />
                    </span>
                    <span>{isDelivery ? "Delivery Boost" : "Bike Boost"}</span>
                  </div>

                  {isTop && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      <Clock className="size-3 text-amber-600 animate-pulse" />
                      <span>{countdown > 60 ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` : `${countdown}s`}</span>
                    </span>
                  )}
                </div>

                {/* Big Bold Fare */}
                <div className="flex items-baseline justify-between">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
                    ₹{offer.fare?.toFixed(0) || "27"}
                  </h2>
                  {offer.orderCode && (
                    <span className="text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg">
                      #{offer.orderCode}
                    </span>
                  )}
                </div>

                {/* Route Stepper (Vertical Timeline matching reference) */}
                <div className="space-y-1">
                  {/* Point 1: Pickup */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="size-2 rounded-full bg-zinc-900 shrink-0 mt-1" />
                      <div className="w-[1.5px] h-7 bg-zinc-300 my-1" />
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <span className="font-bold text-sm text-zinc-900 block leading-tight">
                        {offer.pickupDistanceKm || 0.8} km
                      </span>
                      <p className="text-xs text-zinc-600 leading-snug mt-0.5">
                        <strong className="font-bold text-zinc-900">{offer.pickupTitle || "Sector 67 Noida"}</strong>
                        {" - "}
                        <span className="text-zinc-500">{offer.pickupAddress || "26, Block A, Sector 68, Noida"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Point 2: Drop */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-zinc-900 shrink-0 leading-none mt-0.5">▼</span>
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <span className="font-bold text-sm text-zinc-900 block leading-tight">
                        {offer.dropDistanceKm || 2.2} km
                      </span>
                      <p className="text-xs text-zinc-600 leading-snug mt-0.5">
                        <span className="bg-emerald-100/90 text-emerald-950 font-bold px-1.5 py-0.5 rounded inline-block">
                          {offer.dropTitle || "Sarfabad Village Sector 73 Noida"}
                        </span>
                        {" - "}
                        <span className="text-zinc-500">{offer.dropAddress || "Yadu Public School, Sector 73"}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* View Trip Breakdown Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setSelectedOfferForDetail(offer);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3 text-emerald-600" />
                    <span>View Full Route & Fare Breakdown</span>
                  </div>
                  <ChevronRight className="size-3.5 text-zinc-400" />
                </button>

                {/* Action Buttons: [ Circular Decline (-) ] [ Maps Navigation ] [ Large Yellow Accept ] */}
                <div className="flex items-center gap-3 pt-2">
                  {/* Reject / Pass Button (Circular with -) */}
                  <button
                    type="button"
                    onClick={() => handleReject(offer)}
                    className="size-13 sm:size-14 rounded-full border-2 border-zinc-300 bg-white hover:bg-zinc-100 active:scale-90 transition-all flex items-center justify-center text-zinc-700 shadow-xs cursor-pointer shrink-0"
                    title="Decline trip"
                    aria-label="Decline trip"
                  >
                    <Minus className="size-6 stroke-[2.5]" />
                  </button>

                  {/* Google Maps Route Preview Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenGoogleMaps(offer)}
                    className="size-13 sm:size-14 rounded-full border-2 border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 active:scale-90 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                    title="Preview Turn-by-Turn Route in Google Maps"
                    aria-label="Preview Route"
                  >
                    <Navigation className="size-5 text-blue-600 stroke-[2.2]" />
                  </button>

                  {/* Accept Button (Large bright yellow pill CTA) */}
                  <button
                    type="button"
                    onClick={() => handleAccept(offer)}
                    className="flex-1 h-13 sm:h-14 rounded-full bg-[#FFC700] hover:bg-[#FBBF24] active:scale-[0.98] transition-all flex items-center justify-center text-zinc-950 font-bold text-base sm:text-lg shadow-md cursor-pointer"
                  >
                    <span>{t("orders.accept", "Accept")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State: Queue is clear */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto space-y-4">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
            <span className="absolute size-20 rounded-full bg-emerald-500/15 animate-ping" />
            <Bike className="size-9 text-emerald-700" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-zinc-900">
              {t("orders.noOrders", "No Pending Orders in Queue")}
            </h3>
            <p className="text-xs text-zinc-500 font-medium max-w-xs leading-relaxed">
              {t("orders.waitingNotice", "Your dispatch radar is active. Orders in your service zone will automatically ring here.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => loadOffers()}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs rounded-xl border border-zinc-200 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {isLoading ? t("common.loading", "Checking...") : "🔄 " + t("common.refresh", "Refresh")}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              Map
            </button>
          </div>
        </div>
      )}

      {/* 3. 4-Tab Captain Bottom Navigation */}
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
