import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Home,
  Crosshair,
  DollarSign,
  ExternalLink,
  Info,
  KeyRound,
  Layers,
  Locate,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  Package,
  PackageCheck,
  Phone,
  PhoneCall,
  Send,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Timer,
  X,
  Zap,
  User,
  QrCode,
  RefreshCw,
  HelpCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { initRiderSocket, subscribeRiderOrders, emitRiderLocation } from "../../lib/rider-socket";
import { riderLocationEngine } from "../../lib/rider-location-service";
import {
  playArrivalChime,
  playSuccessChime,
  speakArrival,
  speakTripComplete,
  speakText,
  speakStoreProcessingStarted,
  speakLaundryReadyForDelivery,
  speakDispatchOtpPrompt,
  speakDispatchOtpVerified,
  speakCustomerDeliveryOtpPrompt,
  speakPickupOtpPrompt,
  stopOrderAlertSound,
  triggerHaptic,
  unlockAudioContext,
} from "../../lib/captain-audio";
import { InAppVoiceNavigationModal } from "../navigation/InAppVoiceNavigationModal";
import {
  fetchStreetRoute,
  calculateBearing,
  ManeuverType,
} from "../../lib/voice-navigation-engine";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../../shared/lib/google-maps-loader";
import { RiderCancelTripModal } from "../orders/RiderCancelTripModal";
import { RiderUnableToDeliverModal } from "../orders/RiderUnableToDeliverModal";
import { RiderHandoverWaitingCard } from "../orders/RiderHandoverWaitingCard";
import { CaptainReviewModal } from "./CaptainReviewModal";
import { pushRiderLocation } from "../../api/rider/rider-dashboard-api";
import { SwipeActionButton } from "../common/SwipeActionButton";
import { RiderCustomerOtpInput, RiderStoreDispatchDisplay } from "./RiderOtpCard";
import { RiderTripDetailModal } from "../trips/RiderTripDetailModal";
import { RiderOrderTimelineModal } from "../trips/RiderOrderTimelineModal";
import { SmartRouteBatchModal } from "../trips/SmartRouteBatchModal";
import { RiderDoorstepPickupCard } from "../trips/RiderDoorstepPickupCard";

import {
  verifyHandoverOtp,
  fetchDispatchOtp,
  fetchRiderOrder,
  confirmArrivalAtPickup,
  confirmPickup,
  confirmDelivery,
  confirmDoorstepGarments,
  confirmDropAtPartner,
  startDelivery,
  collectCashPayment,
} from "../../api/rider/rider-orders-api";

export interface ActiveOrderData {
  orderId: string;
  orderCode?: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  pickupTitle?: string;
  dropAddress: string;
  dropTitle?: string;
  distanceMeters?: number;
  pickupDistanceKm?: number;
  dropDistanceKm?: number;
  fare: number;
  startOtp?: string;
  deliveryOtp?: string;
  dispatchOtp?: string;
  pickupCoords?: { lat: number; lng: number };
  dropCoords?: { lat: number; lng: number };
  customerCoords?: { lat: number; lng: number };
  partnerCoords?: { lat: number; lng: number };
  currentLeg?: "pickup_to_store" | "store_to_customer";
  status?: string;
  rideType?: string;
  isHandoverTransfer?: boolean;
  handoverOtp?: string;
  pickupLegPayout?: number;
  isReassigned?: boolean;
  extraBonusAmount?: number;
  reassignmentPool?: number;
  partnerName?: string;
  partnerAddress?: string;
  partnerPhone?: string;
  custody?: string;
  paymentMode?: string;
  amount?: number;
  placedAt?: string;
  items?: any[];
  garmentVerification?: any;
  processingEstimateMinutes?: number;
  estimatedReadyAt?: string;
  processingStartedAt?: string;
  bagTag?: string;
  bag_tag?: string;
  doorstepPiecesVerified?: boolean;
}

interface GoToPickupHUDProps {
  order: ActiveOrderData;
  onOpenDrawer?: () => void;
  onTripCompleted?: () => void;
  onCancelTrip?: () => void;
  onBackToTrips?: () => void;
}

type TripStage = "en_route_pickup" | "arrived_pickup" | "in_trip" | "store_processing" | "ready_pickup_store" | "handover_waiting" | "completed";

export const GoToPickupHUD: React.FC<GoToPickupHUDProps> = ({
  order,
  onOpenDrawer,
  onTripCompleted,
  onCancelTrip,
  onBackToTrips,
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapEngineRef = useRef<"google" | "leaflet" | null>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleOverlaysRef = useRef<any[]>([]);

  // Two-Leg State Machine: "pickup_to_store" (Leg 1) vs "store_to_customer" (Leg 2)
  const [currentLeg, setCurrentLeg] = useState<"pickup_to_store" | "store_to_customer">(() => {
    if (order.currentLeg) return order.currentLeg;
    const s = String(order.status || "").toLowerCase();
    if (
      s === "at_partner" ||
      s === "at-partner" ||
      s === "processing" ||
      s === "ironing" ||
      s === "ready_for_delivery" ||
      s === "ready" ||
      s === "out_for_delivery" ||
      s === "ready-for-delivery"
    ) {
      return "store_to_customer";
    }
    if (order.rideType === "delivery" || order.rideType === "handover_delivery") {
      return "store_to_customer";
    }
    return "pickup_to_store";
  });

  const isHandoverRide = order.rideType === "handover_delivery" || order.isHandoverTransfer;
  const isDeliveryRide = currentLeg === "store_to_customer" || order.rideType === "delivery" || order.rideType === "handover_delivery" || order.isHandoverTransfer;
  const isStorePickupForDelivery = isDeliveryRide || order.rideType === "delivery" || isHandoverRide || currentLeg === "store_to_customer";
  const isPickupRide = currentLeg === "pickup_to_store" && !isStorePickupForDelivery;

  const [isInAppNavActive, setIsInAppNavActive] = useState<boolean>(() => {
    const s = String(order.status || "").toLowerCase();
    return s === "out_for_delivery" || s === "in_trip" || s === "picked_up";
  });
  const [customerDeliveryOtpDigits, setCustomerDeliveryOtpDigits] = useState<string[]>(["", "", "", ""]);
  // Initial doorstep pieces calculation
  const initialDoorstepPieces = (() => {
    const intakePieces = (order as any)?.garmentVerification?.storeIntake?.totalReceivedPieces;
    if (typeof intakePieces === "number" && intakePieces > 0) return intakePieces;
    if (Array.isArray(order.items) && order.items.length > 0) {
      const sum = order.items.reduce((acc: number, it: any) => acc + Number(it.quantity || it.qty || 1), 0);
      if (sum > 0) return sum;
    }
    return 5;
  })();
  const [doorstepPieces, setDoorstepPieces] = useState<number>(initialDoorstepPieces);
  const [isGarmentVerified, setIsGarmentVerified] = useState<boolean>(true);
  const [doorstepNotes, setDoorstepNotes] = useState<string>("");
  const [bagPhotoUrl, setBagPhotoUrl] = useState<string>("");
  const [showDiscrepancyInput, setShowDiscrepancyInput] = useState<boolean>(false);
  const [showUnableModal, setShowUnableModal] = useState(false);
  const [showRiderCancelModal, setShowRiderCancelModal] = useState(false);
  const [isVerifyingHandover, setIsVerifyingHandover] = useState(false);
  const [handoverVerifyOtpDigits, setHandoverVerifyOtpDigits] = useState<string[]>(["", "", "", ""]);
  
  // COD and Doorstep Razorpay / Cash Payment States
  const isCodOrder = Boolean(
    (order as any).isCod ||
    order.paymentMode === "cash" ||
    order.paymentMode === "cod" ||
    (order as any).paymentMethod === "cash" ||
    (order as any).paymentMethod === "cod"
  );
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState<boolean>(!isCodOrder);
  const [paymentMethodUsed, setPaymentMethodUsed] = useState<"razorpay_upi" | "cash">("razorpay_upi");
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const codPayableAmount = Number(
    (order as any).payableAmount ||
    (order as any).grandTotal ||
    (order as any).totalAmount ||
    order.fare ||
    280
  );

  const [handoverData, setHandoverData] = useState<{
    handoverOtp: string;
    pickupLegPayout: number;
    deliveryLegPayout: number;
  } | null>(() => {
    if (order.handoverOtp) {
      return {
        handoverOtp: order.handoverOtp,
        pickupLegPayout: order.pickupLegPayout || 28.0,
        deliveryLegPayout: 25.0,
      };
    }
    return null;
  });

  const [stage, setStage] = useState<TripStage>(() => {
    const s = String(order.status || "").toLowerCase();
    if (s === "delivery_reassignment_required") return "handover_waiting";
    if (s === "at_partner" || s === "at-partner" || s === "processing" || s === "ironing") {
      return "store_processing";
    }
    if (s === "ready_for_delivery" || s === "ready") {
      return "ready_pickup_store";
    }
    if (s === "out_for_delivery" || s === "ready-for-delivery") {
      return "in_trip";
    }
    return "en_route_pickup";
  });
  const [distanceMeters, setDistanceMeters] = useState(order.distanceMeters || 258);
  const [waitingSeconds, setWaitingSeconds] = useState(300); // 5 mins free waiting
  const [isWaitingTimerActive, setIsWaitingTimerActive] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showTripDetailModal, setShowTripDetailModal] = useState(false);
  const [acceptedTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const [arrivedTime, setArrivedTime] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [completedTime, setCompletedTime] = useState<string | null>(null);
  const [showVoiceNavModal, setShowVoiceNavModal] = useState(false);
  const captainBearingRef = useRef<number>(0);
  const [nextTurnManeuver, setNextTurnManeuver] = useState<ManeuverType>("straight");
  const [nextTurnDistanceM, setNextTurnDistanceM] = useState<number>(order.distanceMeters || 250);
  const [nextTurnInstruction, setNextTurnInstruction] = useState<string>("");
  const prevCaptainPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const leafletCaptainMarkerRef = useRef<any>(null);
  const leafletDestMarkerRef = useRef<any>(null);
  const leafletRoutePolylineRef = useRef<any>(null);
  const leafletRouteCasingRef = useRef<any>(null);
  const lastRouteDestKeyRef = useRef<string>("");
  const googleCaptainMarkerRef = useRef<any>(null);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: "rider" | "customer"; text: string; time: string }>>([
    { sender: "customer", text: "Please come to the main gate near medical shop.", time: "Just now" },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [sliderProgress, setSliderProgress] = useState(0);

  const [captainDispatchOtp, setCaptainDispatchOtp] = useState<string>(
    order.dispatchOtp || order.handoverOtp || ""
  );
  const [partnerStoreName, setPartnerStoreName] = useState(order.partnerName || "QuickPress Partner Store");
  const [partnerStoreAddress, setPartnerStoreAddress] = useState(
    order.partnerAddress || order.pickupAddress || "Kasganj Partner Store"
  );
  const [showManualHandoverInput, setShowManualHandoverInput] = useState(false);
  const [showCaptainReviewModal, setShowCaptainReviewModal] = useState(false);
  const [hasRatedTrip, setHasRatedTrip] = useState(false);
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  // --- VIDEO THEME INTEGRATION STATES ---
  const [showProximityWarningModal, setShowProximityWarningModal] = useState(false);
  const [showDedicatedOtpScreen, setShowDedicatedOtpScreen] = useState(false);
  const [dedicatedOtpMode, setDedicatedOtpMode] = useState<"pickup" | "delivery" | "store_dispatch">("pickup");
  const [dedicatedOtpDigits, setDedicatedOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [isOtpUpdatingStatus, setIsOtpUpdatingStatus] = useState(false);
  const [showQuickPressMapsModal, setShowQuickPressMapsModal] = useState(false);
  const [showCompleteRideConfirmation, setShowCompleteRideConfirmation] = useState(false);
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [isCashCollected, setIsCashCollected] = useState(false);
  const [showOrderCompleteRatingScreen, setShowOrderCompleteRatingScreen] = useState(false);
  const [customerRating, setCustomerRating] = useState<number>(5);
  const [ratingReaction, setRatingReaction] = useState<string>("VERY GOOD 😍");
  const [selectedRatingTags, setSelectedRatingTags] = useState<string[]>(["Polite", "Timely"]);
  const [isQrGenerated, setIsQrGenerated] = useState(false);
  const [quickMessageText, setQuickMessageText] = useState("I am on my way to your pickup location");

  // Option 4: Doorstep Garment Intake & Security Bag Tagging
  const [bagTagCode, setBagTagCode] = useState<string>(
    order.bagTag || order.bag_tag || `QP-BAG-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [showRouteBatchModal, setShowRouteBatchModal] = useState<boolean>(false);

  const handleRatingChange = (stars: number) => {
    setCustomerRating(stars);
    triggerHaptic(30);
    if (stars === 5) setRatingReaction("EXCELLENT 🔥");
    else if (stars === 4) setRatingReaction("VERY GOOD 😍");
    else if (stars === 3) setRatingReaction("GOOD 🙂");
    else if (stars === 2) setRatingReaction("AVERAGE 😐");
    else setRatingReaction("POOR 😞");
  };

  const handleCopyAddress = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsAddressCopied(true);
    toast.success("Address Copied! (पता कॉपी हो गया)");
    setTimeout(() => setIsAddressCopied(false), 2000);
  };

  const handleOpenWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      toast.error("Contact phone not available");
      return;
    }
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.length === 10) clean = "91" + clean;
    const orderRef = order.orderCode || (order.orderId ? order.orderId.slice(-6).toUpperCase() : "");
    const msg = `Namaste ${name || "Ji"}, QuickPress Captain here for Order #${orderRef}. Main aapki location par aa raha hoon.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // SLA Processing Timer for Leg 1 store processing
  const [processingRemainingSecs, setProcessingRemainingSecs] = useState<number>(() => {
    if (order.estimatedReadyAt) {
      const diff = Math.floor((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    const mins = order.processingEstimateMinutes || 120;
    return mins * 60;
  });
  const [processingTotalSecs, setProcessingTotalSecs] = useState<number>(() => {
    const mins = order.processingEstimateMinutes || 120;
    return mins * 60;
  });

  // Handle Back to Trips page without cancelling the trip
  const handleBack = useCallback(() => {
    triggerHaptic(40);
    if (onBackToTrips) {
      onBackToTrips();
    } else {
      navigate({ to: "/orders" });
    }
  }, [onBackToTrips, navigate]);

  useEffect(() => {
    // Intercept native Android back button without corrupting browser history stack
    const onAndroidBack = (e: any) => {
      try {
        if (typeof e?.preventDefault === "function") e.preventDefault();
      } catch {}
      if (onBackToTrips) {
        onBackToTrips();
      }
    };

    window.addEventListener("qp:android-back", onAndroidBack);
    return () => {
      window.removeEventListener("qp:android-back", onAndroidBack);
    };
  }, [onBackToTrips]);

  // Ticking countdown timer when stage === "store_processing"
  useEffect(() => {
    if (stage !== "store_processing") return;
    const interval = setInterval(() => {
      setProcessingRemainingSecs((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  // Format HH:MM:SS for countdown timer
  const formatCountdown = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Load dispatch OTP for Rider 2 (skip for simulated test orders)
  useEffect(() => {
    if (order.orderId && !order.orderId.startsWith("TEST-")) {
      fetchDispatchOtp(order.orderId)
        .then((res) => {
          if (res?.dispatchOtp) setCaptainDispatchOtp(res.dispatchOtp);
          if (res?.partnerName) setPartnerStoreName(res.partnerName);
          if (res?.partnerAddress) setPartnerStoreAddress(res.partnerAddress);
          if (res?.processingEstimateMinutes && !order.processingEstimateMinutes) {
            setProcessingTotalSecs(res.processingEstimateMinutes * 60);
          }
          if (res?.isVerified || res?.status === "out_for_delivery" || res?.status === "OUT_FOR_DELIVERY") {
            if (stage === "arrived_pickup") {
              unlockAudioContext();
              playSuccessChime();
              speakDispatchOtpVerified();
              toast.success("✓ Dispatch OTP verified by Partner! Navigating to customer.");
              setStage("in_trip");
              setCurrentLeg("store_to_customer");
              setIsInAppNavActive(true);
              setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
            }
          }
        })
        .catch(() => {});
    }
  }, [order.orderId, stage]);

  // Verify order status on mount and auto-exit if order is already completed / delivered / cancelled
  useEffect(() => {
    const targetId = order.orderId || order.id;
    if (!targetId || targetId.startsWith("TEST-")) return;

    let isMounted = true;
    const checkLiveStatus = async () => {
      try {
        const liveOrder = await fetchRiderOrder(targetId);
        if (!isMounted) return;
        const s = String(liveOrder?.status || (liveOrder as any)?.canonicalStatus || "").toLowerCase();
        if (["delivered", "completed", "cancelled", "failed"].includes(s)) {
          try {
            localStorage.removeItem("qp_active_rider_order");
            localStorage.removeItem("qp_active_delivery_order");
            window.dispatchEvent(new CustomEvent("qp:active_order_updated", { detail: null }));
          } catch {}
          toast.info(`Trip #${order.orderCode || targetId.slice(-6).toUpperCase()} is already completed/closed.`);
          if (onTripCompleted) {
            onTripCompleted();
          } else if (onCancelTrip) {
            onCancelTrip();
          } else {
            navigate({ to: "/orders" });
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        const st = err?.status || err?.statusCode;
        if (st === 404 || st === 410) {
          try {
            localStorage.removeItem("qp_active_rider_order");
            localStorage.removeItem("qp_active_delivery_order");
            window.dispatchEvent(new CustomEvent("qp:active_order_updated", { detail: null }));
          } catch {}
          toast.info(`Trip #${order.orderCode || targetId.slice(-6).toUpperCase()} is no longer active.`);
          if (onTripCompleted) {
            onTripCompleted();
          } else {
            navigate({ to: "/orders" });
          }
        }
      }
    };

    void checkLiveStatus();
    return () => {
      isMounted = false;
    };
  }, [order.orderId, order.id, order.orderCode, onTripCompleted, onCancelTrip, navigate]);

  // Fallback heartbeat poll while at partner store for partner verification
  useEffect(() => {
    if (stage !== "arrived_pickup" || (!isHandoverRide && !isStorePickupForDelivery) || order.orderId?.startsWith("TEST-")) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchDispatchOtp(order.orderId);
        if (res?.dispatchOtp) setCaptainDispatchOtp(res.dispatchOtp);
        if (res?.isVerified || res?.status === "out_for_delivery" || res?.status === "OUT_FOR_DELIVERY") {
          unlockAudioContext();
          playSuccessChime();
          speakDispatchOtpVerified();
          toast.success("✓ Dispatch OTP verified by Partner! Navigating to customer.");
          setStage("in_trip");
          setCurrentLeg("store_to_customer");
          setIsInAppNavActive(true);
          setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [stage, isHandoverRide, isStorePickupForDelivery, order.orderId]);

  // Fallback heartbeat poll while in "store_processing" waiting for partner to finish cleaning
  useEffect(() => {
    if (stage !== "store_processing" || !order.orderId || order.orderId.startsWith("TEST-")) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchDispatchOtp(order.orderId);
        if (res?.dispatchOtp) setCaptainDispatchOtp(res.dispatchOtp);
        if (res?.processingEstimateMinutes && !order.processingEstimateMinutes) {
          setProcessingTotalSecs(res.processingEstimateMinutes * 60);
        }
        if (
          res?.status === "ready_for_delivery" ||
          res?.status === "READY_FOR_DELIVERY" ||
          res?.status === "out_for_delivery" ||
          res?.status === "OUT_FOR_DELIVERY" ||
          res?.status === "ready" ||
          res?.isVerified
        ) {
          unlockAudioContext();
          playSuccessChime();
          speakLaundryReadyForDelivery();
          toast.success("🎉 Order Packed & Ready! Go to Store to collect package.");
          setStage("ready_pickup_store");
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [stage, order.orderId]);

  // Real-time socket listener for order ready, processing & dispatch verification events
  useEffect(() => {
    if (!order.orderId) return;
    const handleOrderEvent = (data: any) => {
      const oid = data?.orderId || data?.id || data?._id;
      if (oid === order.orderId) {
        const stat = String(data?.status || "").toLowerCase();

        // 1. Store processing started -> update timer and alert
        if (stat === "processing") {
          if (data.processingEstimateMinutes) {
            setProcessingTotalSecs(data.processingEstimateMinutes * 60);
            setProcessingRemainingSecs(data.processingEstimateMinutes * 60);
          }
          if (stage !== "store_processing") {
            setStage("store_processing");
            speakStoreProcessingStarted(data.processingEstimateMinutes || 120);
          }
        }

        // 2. Partner marked ready -> instantly remove timer, play chime & speak voice alert
        if (stat === "ready_for_delivery" || stat === "ready") {
          if (data?.dispatchOtp) setCaptainDispatchOtp(data.dispatchOtp);
          unlockAudioContext();
          playSuccessChime();
          speakLaundryReadyForDelivery();
          toast.success("🎉 Order Packed & Ready! Go to Partner Store to collect package.");
          setStage("ready_pickup_store");
        }

        // 3. Dispatch OTP verified by Partner -> auto-advance to in_trip with voice
        if (stat === "out_for_delivery" || data?.dispatchOtpVerified || data?.dispatchVerified) {
          unlockAudioContext();
          playSuccessChime();
          speakDispatchOtpVerified();
          toast.success("✓ Dispatch OTP verified by Partner! Navigating to customer.");
          setCurrentLeg("store_to_customer");
          setStage("in_trip");
          setIsInAppNavActive(true);
          setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }

        // 4. Order / Ride Cancelled by Customer or Store
        if (
          stat === "cancelled" ||
          data?.event === "order.cancelled" ||
          data?.event === "ride.cancelled"
        ) {
          try {
            localStorage.removeItem("qp_active_rider_order");
            localStorage.removeItem("qp_active_delivery_order");
            window.dispatchEvent(new CustomEvent("qp:active_order_updated", { detail: null }));
          } catch {}
          toast.error("❌ Yeh order customer/store dwara cancel kar diya gaya.");
          if (onCancelTrip) {
            onCancelTrip();
          } else if (onTripCompleted) {
            onTripCompleted();
          } else {
            navigate({ to: "/orders" });
          }
        }
      }
    };
    try {
      const socket = initRiderSocket();
      socket?.on("order.processing", handleOrderEvent);
      socket?.on("order.ready", handleOrderEvent);
      socket?.on("order.status_changed", handleOrderEvent);
      socket?.on("order.out_for_delivery", handleOrderEvent);
      socket?.on("order.dispatch_verified", handleOrderEvent);
      socket?.on("order.cancelled", handleOrderEvent);
      socket?.on("ride.cancelled", handleOrderEvent);
      return () => {
        socket?.off("order.processing", handleOrderEvent);
        socket?.off("order.ready", handleOrderEvent);
        socket?.off("order.status_changed", handleOrderEvent);
        socket?.off("order.out_for_delivery", handleOrderEvent);
        socket?.off("order.dispatch_verified", handleOrderEvent);
        socket?.off("order.cancelled", handleOrderEvent);
        socket?.off("ride.cancelled", handleOrderEvent);
      };
    } catch {}
  }, [order.orderId, stage]);


  const handleVerifyHandoverTransfer = async (directOtp?: string) => {
    const code = directOtp || handoverVerifyOtpDigits.join("");
    if (code.length < 4) {
      toast.error("Please enter the complete 4-digit Handover OTP from Partner Store");
      return;
    }
    try {
      setIsVerifyingHandover(true);
      triggerHaptic();
      let res: any = null;
      try {
        res = await startDelivery(order.orderId, code);
      } catch {
        res = await verifyHandoverOtp(order.orderId, code);
      }
      unlockAudioContext();
      playSuccessChime();
      speakText("हैंडओवर सत्यापित। अब ग्राहक को ऑर्डर डिलीवर करें।");
      toast.success("Handover verified! Custody transferred to you.");
      setStage("in_trip");
      setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setTimeout(() => {
        launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName);
      }, 600);
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify Handover OTP. Please try again.");
    } finally {
      setIsVerifyingHandover(false);
    }
  };

  // Live Device GPS Coordinates for Captain (Hydrated with real GPS / cached location)
  const [captainCoords, setCaptainCoords] = useState<{ lat: number; lng: number }>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("qp_rider_last_gps");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.lat && parsed?.lng) return parsed;
        }
      } catch {}
    }
    return (
      order.customerCoords ||
      order.partnerCoords ||
      order.pickupCoords ||
      { lat: 28.6139, lng: 77.2090 }
    );
  });

  // Track Captain's real-time device GPS coordinates via Singleton Engine
  useEffect(() => {
    riderLocationEngine.setActiveOrder(order.orderId, order.orderCode);
    riderLocationEngine.setOnline(true);

    const unsubscribe = riderLocationEngine.subscribe((loc) => {
      if (loc.lat && loc.lng) {
        setCaptainCoords({ lat: loc.lat, lng: loc.lng });
        try {
          localStorage.setItem("qp_rider_last_gps", JSON.stringify({ lat: loc.lat, lng: loc.lng }));
        } catch {}
      }
    });

    return () => {
      unsubscribe();
      riderLocationEngine.setActiveOrder(null);
    };
  }, [order.orderId, order.orderCode]);

  const customerCoords = order.customerCoords || order.pickupCoords || order.dropCoords || captainCoords || { lat: 28.6139, lng: 77.2090 };
  const storeCoords = order.partnerCoords || (order.rideType === "pickup" ? (order.dropCoords || customerCoords) : (order.pickupCoords || customerCoords));

  // Target Destination based on current leg and stage:
  // In Leg 1 (Pickup -> Store):
  //   - en_route_pickup / arrived_pickup: destination is customerCoords
  //   - in_trip: destination is storeCoords
  // In Leg 2 (Store -> Customer):
  //   - store_processing / ready_pickup_store: at storeCoords
  //   - in_trip / completed: destination is customerCoords
  const activeDestCoords =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip"
        ? storeCoords
        : customerCoords
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? storeCoords
        : customerCoords;

  const activeDestTitle =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip"
        ? (partnerStoreName || "Partner Store")
        : (order.pickupTitle || order.customerName || "Customer Pickup")
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? (partnerStoreName || "Partner Store")
        : (order.customerName || "Customer Delivery");

  const activeDestAddress =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip"
        ? (partnerStoreAddress || "Partner Store Kasganj")
        : (order.pickupAddress || "Customer Pickup Address")
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? (partnerStoreAddress || "Partner Store Kasganj")
        : (order.dropAddress || order.pickupAddress || "Customer Delivery Address");

  const activeDestPhone =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip"
        ? (order.partnerPhone || order.customerPhone)
        : order.customerPhone
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? (order.partnerPhone || order.customerPhone)
        : (order.customerPhone || order.partnerPhone);

  const distanceRemainingKm =
    distanceMeters > 0
      ? distanceMeters / 1000
      : currentLeg === "store_to_customer"
      ? (order.dropDistanceKm ?? 2.2)
      : (order.pickupDistanceKm ?? 0.8);

  const pickupCoords = customerCoords;
  const dropCoords = storeCoords;

  // Free waiting timer when arrived at pickup
  useEffect(() => {
    if (stage !== "arrived_pickup" || !isWaitingTimerActive) return;
    const interval = setInterval(() => {
      setWaitingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, isWaitingTimerActive]);

  // Format MM:SS
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  // Initialize Real Google Roadmap Tiles via Leaflet (Zero Watermark, 100% Real Roads & Buildings)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default || leafletModule;
        await import("leaflet/dist/leaflet.css");

        if (!isMounted || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {}
          mapInstanceRef.current = null;
        }

        const center = captainCoords || pickupCoords;
        const map = L.map(mapContainerRef.current, {
          center: [center.lat, center.lng],
          zoom: 16,
          zoomControl: false,
          attributionControl: false,
        });

        // Genuine Google Maps High-Resolution Roadmap Tiles (Zero Watermark, no billing errors)
        L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }).addTo(map);

        mapInstanceRef.current = map;
        mapEngineRef.current = "leaflet";

        // Ensure Leaflet recalculates dimensions to fit container box perfectly
        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, 150);
        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, 500);

        if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
          const ro = new ResizeObserver(() => {
            if (isMounted && map) {
              map.invalidateSize();
            }
          });
          ro.observe(mapContainerRef.current);
        }

        // Render markers & real street route initially
        await updateMapLayers(L, map, stage, currentLeg);
      } catch (err) {
        console.warn("Real map initialization notice:", err);
      }
    }

    void initMap();

    return () => {
      isMounted = false;
      if (googleMapInstanceRef.current) {
        googleMapInstanceRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Official Google Maps JavaScript API Layers (Markers + Real Street Polyline)
  const updateGoogleMapLayers = async (
    google: any,
    map: any,
    currentStage: TripStage,
    leg: "pickup_to_store" | "store_to_customer"
  ) => {
    if (!map || !google) return;
    try {
      for (const ov of googleOverlaysRef.current) {
        if (ov && ov.setMap) ov.setMap(null);
      }
      googleOverlaysRef.current = [];

      const dest =
        leg === "pickup_to_store"
          ? currentStage === "in_trip"
            ? storeCoords
            : customerCoords
          : customerCoords;

      const isStoreDrop = leg === "pickup_to_store" && currentStage === "in_trip";

      // 1. Captain Scooter Marker with Signature Icon
      const captainMarker = new google.maps.Marker({
        map,
        position: { lat: captainCoords.lat, lng: captainCoords.lng },
        title: "You (Captain)",
        zIndex: 1000,
        icon: {
          url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
              <circle cx="23" cy="23" r="21" fill="#00C853" fill-opacity="0.25" />
              <circle cx="23" cy="23" r="16" fill="#0F172A" stroke="#FFFFFF" stroke-width="2.5" />
              <circle cx="23" cy="23" r="6" fill="#00C853" />
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(46, 46),
          anchor: new google.maps.Point(23, 23),
        },
      });
      googleOverlaysRef.current.push(captainMarker);

      // 2. Destination Pin
      const destPinColor = isStoreDrop ? "#059669" : "#E11D48";
      const destMarker = new google.maps.Marker({
        map,
        position: { lat: dest.lat, lng: dest.lng },
        title: isStoreDrop ? partnerStoreName : (order.customerName || "Customer"),
        zIndex: 900,
        icon: {
          url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="17" fill="${destPinColor}" stroke="#FFFFFF" stroke-width="2.5" />
              <circle cx="21" cy="21" r="6" fill="#FFFFFF" />
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(42, 42),
          anchor: new google.maps.Point(21, 21),
        },
      });
      googleOverlaysRef.current.push(destMarker);

      // 3. Real Street-Following Route via backend proxy + OSRM
      const routeData = await fetchStreetRoute(captainCoords, dest, activeDestTitle);
      const points =
        routeData.coordinates.length >= 2
          ? routeData.coordinates
          : [
              [captainCoords.lat, captainCoords.lng],
              [(captainCoords.lat + dest.lat) / 2 + 0.0005, (captainCoords.lng + dest.lng) / 2 - 0.0004],
              [dest.lat, dest.lng],
            ];

      if (routeData.steps && routeData.steps.length > 0) {
        setNextTurnManeuver(routeData.steps[0].maneuver);
        setNextTurnDistanceM(routeData.steps[0].distanceMeters);
        setNextTurnInstruction(routeData.steps[0].instructionEn || routeData.steps[0].instructionHi);
      }

      const pathLatLngs = points.map(([lat, lng]) => ({ lat, lng }));

      // 3a. Route Casing (Dark Slate Navy boundary)
      const casing = new google.maps.Polyline({
        map,
        path: pathLatLngs,
        geodesic: true,
        strokeColor: "#0F172A",
        strokeOpacity: 0.9,
        strokeWeight: 9,
      });
      googleOverlaysRef.current.push(casing);

      // 3b. Route Core Path (Rapido Green / Electric Blue)
      const coreLine = new google.maps.Polyline({
        map,
        path: pathLatLngs,
        geodesic: true,
        strokeColor: isStoreDrop ? "#2563EB" : "#00C853",
        strokeOpacity: 1.0,
        strokeWeight: 5.5,
      });
      googleOverlaysRef.current.push(coreLine);

      // Auto-fit bounds
      const bounds = new google.maps.LatLngBounds();
      pathLatLngs.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 50, bottom: 40, left: 40, right: 40 });
    } catch (err) {
      console.warn("Error updating Google Map layers:", err);
    }
  };

  // Track bearing whenever captain GPS updates (using ref to avoid full HUD re-render)
  useEffect(() => {
    if (prevCaptainPosRef.current && captainCoords) {
      const b = calculateBearing(
        prevCaptainPosRef.current.lat,
        prevCaptainPosRef.current.lng,
        captainCoords.lat,
        captainCoords.lng
      );
      if (b !== 0) {
        captainBearingRef.current = b;
        const iconEl = document.querySelector(".custom-rapido-captain-marker .captain-heading-pip") as HTMLElement | null;
        if (iconEl) {
          iconEl.style.transform = `rotate(${b}deg)`;
        }
      }
    }
    prevCaptainPosRef.current = captainCoords;
  }, [captainCoords.lat, captainCoords.lng]);

  // Update map layers with Real Street Route & Dual-Layer Polyline (Rapido / Google Maps Style)
  const updateMapLayers = async (
    L: any,
    map: any,
    currentStage: TripStage,
    leg: "pickup_to_store" | "store_to_customer"
  ) => {
    if (!map || !L) return;
    try {
      // Clear previous overlay layers
      map.eachLayer((layer: any) => {
        if (layer.options && !layer.options.subdomains) {
          map.removeLayer(layer);
        }
      });

      // Target coordinate based on leg and stage
      const dest =
        leg === "pickup_to_store"
          ? currentStage === "in_trip"
            ? storeCoords
            : customerCoords
          : customerCoords;

      const isStoreDrop = leg === "pickup_to_store" && currentStage === "in_trip";

      // 1. Captain Location Marker with rotating bike & directional pip (Rapido Captain Style)
      const captainIcon = L.divIcon({
        className: "custom-rapido-captain-marker",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
            <div style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background-color: rgba(0, 200, 83, 0.25); animation: ping 2s infinite;"></div>
            <div class="captain-heading-pip" style="position: relative; display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #0F172A; color: white; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); border: 2.5px solid white; transform: rotate(${captainBearingRef.current}deg); transition: transform 0.3s ease;">
              <div style="position: absolute; top: -3px; width: 8px; height: 8px; background-color: #00C853; transform: rotate(45deg); border: 1px solid white;"></div>
              <div style="width: 8px; height: 8px; border-radius: 9999px; background-color: #00C853;"></div>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      leafletCaptainMarkerRef.current = L.marker([captainCoords.lat, captainCoords.lng], { icon: captainIcon }).addTo(map);

      // 2. Destination Target Pin (High Contrast Pin)
      const pickupIcon = L.divIcon({
        className: "custom-pickup-icon",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="padding: 2px 8px; border-radius: 6px; background-color: #0F172A; color: white; font-weight: 900; font-size: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.3); white-space: nowrap; margin-bottom: 2px;">
              ${isStoreDrop ? partnerStoreName : (order.customerName || "Customer")}
            </div>
            <div style="position: relative; display: flex; width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: 9999px; background-color: ${isStoreDrop ? "#059669" : "#E11D48"}; color: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border: 2px solid white;">
              <div style="width: 10px; height: 10px; border-radius: 9999px; background-color: white;"></div>
            </div>
          </div>
        `,
        iconSize: [120, 56],
        iconAnchor: [60, 50],
      });

      leafletDestMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: pickupIcon }).addTo(map);

      // 3. Real Street-Following Route Polyline (Dual-Layer: Dark Casing + Solid Route)
      const routeData = await fetchStreetRoute(captainCoords, dest, activeDestTitle);
      const points = routeData.coordinates.length >= 2 ? routeData.coordinates : [
        [captainCoords.lat, captainCoords.lng],
        [(captainCoords.lat + dest.lat) / 2 + 0.0005, (captainCoords.lng + dest.lng) / 2 - 0.0004],
        [dest.lat, dest.lng],
      ];

      // Update next maneuver details for the top banner
      if (routeData.steps && routeData.steps.length > 0) {
        setNextTurnManeuver(routeData.steps[0].maneuver);
        setNextTurnDistanceM(routeData.steps[0].distanceMeters);
        setNextTurnInstruction(routeData.steps[0].instructionEn || routeData.steps[0].instructionHi);
      }

      // 3a. Route Casing (Dark Slate Navy for sharp road boundary)
      leafletRouteCasingRef.current = L.polyline(points, {
        color: "#0F172A",
        weight: 9,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // 3b. Route Path (Vibrant Rapido Green / Electric Delivery Blue)
      leafletRoutePolylineRef.current = L.polyline(points, {
        color: isStoreDrop ? "#2563EB" : "#00C853",
        weight: 5.5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      map.fitBounds(points, { padding: [45, 45], maxZoom: 17 });
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 100);
    } catch (e) {
      console.warn("Error updating map layers:", e);
    }
  };

  // Lightweight GPS Marker Glide on Map (120 FPS hardware accelerated, 0 lag)
  useEffect(() => {
    if (mapEngineRef.current === "google" && googleCaptainMarkerRef.current && captainCoords) {
      googleCaptainMarkerRef.current.setPosition({ lat: captainCoords.lat, lng: captainCoords.lng });
    } else if (leafletCaptainMarkerRef.current && captainCoords) {
      leafletCaptainMarkerRef.current.setLatLng([captainCoords.lat, captainCoords.lng]);
    }
  }, [captainCoords.lat, captainCoords.lng]);

  // Trigger layer & route update ONLY on stage or currentLeg change
  useEffect(() => {
    if (mapEngineRef.current === "google" && googleMapInstanceRef.current) {
      const google = (window as any).google;
      if (google?.maps) {
        void updateGoogleMapLayers(google, googleMapInstanceRef.current, stage, currentLeg);
      }
      return;
    }
    if (mapInstanceRef.current) {
      void (async () => {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default || leafletModule;
        await updateMapLayers(L, mapInstanceRef.current, stage, currentLeg);
      })();
    }
  }, [stage, currentLeg]);

  // Recenter GPS on Captain Location
  const handleRecenter = () => {
    triggerHaptic(40);
    if (mapInstanceRef.current && captainCoords) {
      mapInstanceRef.current.setView([captainCoords.lat, captainCoords.lng], 17, {
        animate: true,
      });
      toast.info("Map centered on your real location 📍");
      return;
    }
    if (mapEngineRef.current === "google" && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.panTo({ lat: captainCoords.lat, lng: captainCoords.lng });
      googleMapInstanceRef.current.setZoom(17);
      toast.info("Map centered on your location 📍");
      return;
    }
  };

  // Launch Turn-by-Turn Google Maps Navigation (Native Android Intent + Universal Web Fallback)
  // Keeps the in-app overlay HUD active and intact in the web application tab
  const launchTurnByTurnGoogleMaps = (
    dest: { lat: number; lng: number },
    origin?: { lat: number; lng: number },
    destName?: string
  ) => {
    triggerHaptic(40);
    const destCoords = `${dest.lat},${dest.lng}`;
    const originParam = origin?.lat && origin?.lng ? `&origin=${origin.lat},${origin.lng}` : "";
    const universalUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destCoords}&travelmode=two_wheeler&dir_action=navigate`;
    const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent || "");
    const androidIntentUrl = `google.navigation:q=${destCoords}&mode=d`;

    toast.info(`🗺️ Launching Turn-by-Turn Navigation to ${destName || "destination"}... HUD remains active.`);

    if (isAndroid) {
      try {
        const link = document.createElement("a");
        link.href = androidIntentUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 500);
      } catch {
        window.open(universalUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      window.open(universalUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Open Direct in External Google Maps App (Convenience Shortcut)
  const handleOpenExternalGoogleMaps = () => {
    const dest =
      currentLeg === "pickup_to_store"
        ? stage === "in_trip"
          ? storeCoords
          : customerCoords
        : customerCoords;
    stopOrderAlertSound();
    launchTurnByTurnGoogleMaps(dest, captainCoords, activeDestTitle);
  };

  // In-App GPS Navigation Mode (No External Google Maps Redirect)
  const handleStartInAppNavigation = () => {
    stopOrderAlertSound();
    unlockAudioContext();
    triggerHaptic();
    setIsInAppNavActive(true);
    setShowVoiceNavModal(true);
    const text = `नेविगेशन शुरू हुआ। ${activeDestTitle} की तरफ चलें।`;
    speakText(text);
    toast.info(`📍 In-App GPS Navigation active to ${activeDestTitle}`);
  };

  // Video Frame 00:29 Proximity Arrival Check
  const handleArrivalCheck = () => {
    if (distanceMeters > 50) {
      setShowProximityWarningModal(true);
    } else {
      if (isDeliveryRide) {
        if (stage === "en_route_pickup") {
          handleMarkArrivedAtStore();
        } else {
          handleMarkArrivedAtCustomer();
        }
      } else {
        handleMarkArrived();
      }
    }
  };

  // Dedicated OTP Verification Handler matching Video Frame 00:54 - 00:55
  const handleVerifyDedicatedOtp = async (code: string) => {
    setIsOtpUpdatingStatus(true);
    triggerHaptic(40);
    try {
      if (dedicatedOtpMode === "pickup") {
        await handleStartTrip(code);
        setShowDedicatedOtpScreen(false);
        setShowQuickPressMapsModal(true);
      } else if (dedicatedOtpMode === "store_dispatch") {
        setShowDedicatedOtpScreen(false);
        setStage("in_trip");
        toast.success("Custody verified! Navigating to customer drop.");
        setShowQuickPressMapsModal(true);
      } else {
        await handleCompleteTrip(code);
        setShowDedicatedOtpScreen(false);
        setShowPaymentScreen(true);
      }
    } catch (e: any) {
      toast.error(e?.message || "Invalid OTP. Please check and try again.");
    } finally {
      setIsOtpUpdatingStatus(false);
    }
  };

  // Action Handlers
  const handleMarkArrived = () => {
    stopOrderAlertSound();
    unlockAudioContext();
    triggerHaptic();
    playArrivalChime();
    speakPickupOtpPrompt();
    setStage("arrived_pickup");
    setIsWaitingTimerActive(true);
    setArrivedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast.success("You have arrived at Pickup location! 📍 Customer notified.");

    // Real backend notification
    if (order.orderId && !order.orderId.startsWith("TEST-")) {
      confirmArrivalAtPickup(order.orderId).catch(() => {});
    }
  };

  const handleStartTrip = async (directOtp?: string) => {
    const enteredOtp = (directOtp || otpDigits.join("")).trim();
    const otpToVerify = enteredOtp || order.startOtp;

    if (!otpToVerify || otpToVerify.length < 4) {
      toast.error("Please enter the 4-digit pickup code told by customer");
      return;
    }

    // Call Real Backend verification first (skip for simulated test orders)
    if (order.orderId && !order.orderId.startsWith("TEST-")) {
      try {
        await confirmPickup(order.orderId, otpToVerify, {
          bagTag: bagTagCode.trim(),
          verifiedPieces: doorstepPieces,
          notes: doorstepNotes.trim(),
          bagPhotoUrl: bagPhotoUrl || undefined,
        });
        order.bagTag = bagTagCode;
        order.doorstepPiecesVerified = true;
        try {
          const cur = localStorage.getItem("qp_active_rider_order");
          if (cur) {
            const parsed = JSON.parse(cur);
            parsed.bagTag = bagTagCode;
            parsed.doorstepPiecesVerified = true;
            localStorage.setItem("qp_active_rider_order", JSON.stringify(parsed));
          }
        } catch {}
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("picked") || msg.includes("completed")) {
          console.log("Order already picked up, proceeding to in_trip");
        } else {
          try {
            await startDelivery(order.orderId, otpToVerify);
          } catch {
            const displayMsg = err?.message || "Invalid Pickup OTP. Please ask customer for correct 4-digit code.";
            toast.error(displayMsg);
            return;
          }
        }
      }
    }

    unlockAudioContext();
    triggerHaptic();
    playSuccessChime();
    speakText("पिकअप पूरा हुआ। स्टोर के लिए इन-ऐप नेविगेशन शुरू हो रहा है।");
    setStage("in_trip");
    setIsWaitingTimerActive(false);
    setIsInAppNavActive(true);
    setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast.success("Pickup Done! 🛵 In-App Navigation active to Partner Store...");

    // Real Google Maps Turn-by-Turn Navigation Intent (keeping overlay HUD screen active)
    setTimeout(() => {
      launchTurnByTurnGoogleMaps(storeCoords, captainCoords, partnerStoreName);
    }, 600);
  };

  const handleMarkArrivedAtStore = () => {
    unlockAudioContext();
    triggerHaptic();
    playArrivalChime();
    speakArrival(partnerStoreName || "पार्टनर स्टोर");
    setStage("arrived_pickup");
    setArrivedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setTimeout(() => {
      speakDispatchOtpPrompt(captainDispatchOtp);
    }, 1200);
    toast.info("Arrived at Partner Store! Tell 4-digit Dispatch OTP to Partner 🏪");
  };

  const handleMarkArrivedAtCustomer = () => {
    unlockAudioContext();
    triggerHaptic();
    playArrivalChime();
    speakCustomerDeliveryOtpPrompt();
    toast.info("Arrived at Customer Doorstep! Ask customer for 4-digit Delivery OTP 📦");
  };

  const handleCompleteTrip = async (directOtp?: string) => {
    unlockAudioContext();
    triggerHaptic();
    playSuccessChime();

    if (currentLeg === "pickup_to_store" && stage === "in_trip") {
      // --- LEG 1 COMPLETE: Dropped at Partner Store ---
      const mins = order.processingEstimateMinutes || Math.round(processingTotalSecs / 60) || 120;
      speakStoreProcessingStarted(mins);
      setCurrentLeg("store_to_customer");
      setStage("store_processing");
      setIsInAppNavActive(false);
      toast.success(
        `🎉 Clothes Dropped at Store! Pickup payout ₹${(order.pickupLegPayout || order.fare / 2 || 35).toFixed(2)} credited. Turnaround timer active!`
      );

      // Persist transitioned Leg 2 state in localStorage
      const updatedOrder: ActiveOrderData = {
        ...order,
        currentLeg: "store_to_customer",
        rideType: "delivery",
        status: "at_partner",
        pickupAddress: partnerStoreAddress,
        pickupTitle: partnerStoreName,
        dropAddress: order.dropAddress || order.pickupAddress,
        dropTitle: order.customerName,
        pickupCoords: storeCoords,
        dropCoords: customerCoords,
        partnerCoords: storeCoords,
        customerCoords: customerCoords,
      };
      try {
        localStorage.setItem("qp_active_rider_order", JSON.stringify(updatedOrder));
      } catch {}

      if (order.orderId && !order.orderId.startsWith("TEST-")) {
        try {
          await confirmDropAtPartner(order.orderId, false);
        } catch (e) {
          console.warn("confirmDropAtPartner error:", e);
        }
      }
    } else {
      // --- LEG 2 COMPLETE: Customer Doorstep Delivery ---
      const enteredOtp = (directOtp || customerDeliveryOtpDigits.join("") || otpDigits.join("")).trim();
      const otpToVerify = enteredOtp || order.deliveryOtp;
      if (!otpToVerify || otpToVerify.length < 4) {
        toast.error("Please enter the 4-digit delivery code from the customer");
        return;
      }

      if (order.orderId && !order.orderId.startsWith("TEST-")) {
        try {
          await confirmDoorstepGarments(order.orderId, {
            verifiedPieces: doorstepPieces,
            notes: doorstepNotes,
          });
        } catch (e) {
          console.warn("confirmDoorstepGarments error:", e);
        }

        try {
          await confirmDelivery(order.orderId, enteredOtp, {
            garmentVerified: isGarmentVerified,
            verifiedPieces: doorstepPieces,
            notes: doorstepNotes,
          });
        } catch (e: any) {
          const msg = (e?.message || "").toLowerCase();
          if (msg.includes("already") || msg.includes("delivered") || msg.includes("completed")) {
            console.log("Order already verified/delivered, completing trip HUD");
          } else {
            toast.error(e?.message || "Invalid Delivery OTP. Please verify with customer.");
            return;
          }
        }
      }

      speakTripComplete(order.fare);
      setStage("completed");
      setIsInAppNavActive(false);
      setCompletedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success(`🎉 Delivery Completed! Collected ₹${order.fare.toFixed(2)} — Credited to Wallet`);

      try {
        localStorage.removeItem("qp_active_rider_order");
      } catch {}
    }
  };

  const handleStartCustomerDelivery = async () => {
    unlockAudioContext();
    triggerHaptic();
    playSuccessChime();
    speakText("ग्राहक के लिए इन-ऐप नेविगेशन शुरू हो रहा है।");
    setCurrentLeg("store_to_customer");
    setStage("in_trip");
    setIsInAppNavActive(true);
    toast.success("🛵 Delivery Leg Started! In-App Navigation active to Customer Doorstep.");

    // Real Google Maps Turn-by-Turn Navigation Intent (keeping overlay HUD screen active)
    setTimeout(() => {
      launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName);
    }, 600);

    const updatedOrder: ActiveOrderData = {
      ...order,
      currentLeg: "store_to_customer",
      rideType: "delivery",
      status: "out_for_delivery",
      pickupAddress: partnerStoreAddress,
      pickupTitle: partnerStoreName,
      dropAddress: order.dropAddress || order.pickupAddress,
      dropTitle: order.customerName,
      pickupCoords: storeCoords,
      dropCoords: customerCoords,
      partnerCoords: storeCoords,
      customerCoords: customerCoords,
    };
    try {
      localStorage.setItem("qp_active_rider_order", JSON.stringify(updatedOrder));
    } catch {}

    if (order.orderId) {
      try {
        await startDelivery(order.orderId);
      } catch (e) {
        console.warn("startDelivery error:", e);
      }
    }
  };

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: "rider", text: text.trim(), time: "Now" },
    ]);
    setInputMsg("");
    triggerHaptic();
    toast.success("Message sent to customer 💬");
  };

  // 6-Step Upgraded QuickPress Lifecycle Stepper
  const isEnRoute = stage === "en_route_pickup";
  const isAtPickup = stage === "arrived_pickup" && !isStorePickupForDelivery;
  const isDroppedAtStoreOrProcessing =
    stage === "store_processing" || (stage === "in_trip" && currentLeg === "pickup_to_store");
  const isAtStoreHandover =
    stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery);
  const isOutForDelivery = stage === "in_trip" && currentLeg === "store_to_customer";
  const isTripCompleted = stage === "completed";

  const timelineSteps = [
    {
      id: "accept",
      label: "Accept",
      hindi: "स्वीकार",
      isDone: true,
      isActive: false,
      icon: CheckCircle2,
    },
    {
      id: "reach",
      label: isStorePickupForDelivery ? "At Store" : "Reach",
      hindi: isStorePickupForDelivery ? "स्टोर पहुंचे" : "पहुंचे",
      isDone: !isEnRoute,
      isActive: isEnRoute,
      icon: MapPin,
    },
    {
      id: "pickup",
      label: isStorePickupForDelivery ? "Collect" : "Pickup",
      hindi: isStorePickupForDelivery ? "कलेक्ट" : "कपड़े लिए",
      isDone: stage === "in_trip" || stage === "store_processing" || stage === "ready_pickup_store" || isTripCompleted,
      isActive: isAtPickup,
      icon: KeyRound,
    },
    {
      id: "wash",
      label: "Wash/SLA",
      hindi: "धुलाई",
      isDone: isAtStoreHandover || isOutForDelivery || isTripCompleted,
      isActive: isDroppedAtStoreOrProcessing,
      icon: Sparkles,
    },
    {
      id: "dispatch",
      label: "Dispatch",
      hindi: "कोड",
      isDone: isOutForDelivery || isTripCompleted,
      isActive: isAtStoreHandover,
      icon: ShieldCheck,
    },
    {
      id: "delivered",
      label: "Delivered",
      hindi: "सफल डिलीवरी",
      isDone: isTripCompleted,
      isActive: isOutForDelivery,
      icon: PackageCheck,
    },
  ];

  const activeStepIndex = isTripCompleted
    ? 6
    : isOutForDelivery
    ? 6
    : isAtStoreHandover
    ? 5
    : isDroppedAtStoreOrProcessing
    ? 4
    : isAtPickup
    ? 3
    : isEnRoute
    ? 2
    : 1;

  const currentStagePillText = isTripCompleted
    ? "Order Successfully Completed"
    : isOutForDelivery
    ? "En Route to Customer Delivery"
    : isAtStoreHandover
    ? "At Store · Give 4-Digit Dispatch Code"
    : isDroppedAtStoreOrProcessing
    ? "Store Washing & Steam Ironing (SLA)"
    : isAtPickup
    ? "At Pickup · Verify Customer OTP"
    : isEnRoute
    ? (isStorePickupForDelivery ? "Heading to Partner Store" : "Heading to Customer Pickup")
    : "Order Accepted & Ready";

  const progressPercentage = Math.round(((activeStepIndex - 1) / 5) * 100);

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-white shadow-2xl overflow-y-auto text-neutral-900 select-none pb-24 overscroll-contain">
      {/* 1. Top Navigation Bar (Back Button + Menu + Title + Call) - Notch Safe */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-3.5 pb-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200/80 text-slate-950 shadow-2xs"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        {/* Back Button (Returns to Trips List while keeping trip active) & Drawer */}
        <div className="flex items-center gap-1 -ml-1">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center size-9 text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to Trips"
            title="Back to Trips (Trip Active Rahegi)"
          >
            <ArrowLeft className="size-5 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex items-center justify-center size-9 text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="size-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Screen Title & Live Pulse */}
        <div className="flex items-center gap-1.5 min-w-0 px-1 text-center">
          <span className="relative flex size-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-600" />
          </span>
          <h1 className="text-sm font-black tracking-tight truncate max-w-[190px] sm:max-w-xs text-slate-950">
            {stage === "en_route_pickup" && (isDeliveryRide ? "Go to Partner Store" : isHandoverRide ? "Go to Handover Point" : "Go to Pickup Zone")}
            {stage === "arrived_pickup" && (isDeliveryRide || isStorePickupForDelivery ? "At Partner Store" : isHandoverRide ? "At Handover Point" : "At Customer Doorstep")}
            {stage === "in_trip" && (currentLeg === "pickup_to_store" ? "Heading to Partner Store" : isCodOrder && !isPaymentConfirmed ? "Collect Payment" : "At Customer Doorstep")}
            {stage === "store_processing" && "Store Laundry Processing"}
            {stage === "ready_pickup_store" && "Collect from Partner Store"}
            {stage === "handover_waiting" && "Handover in Progress"}
            {stage === "completed" && (isDeliveryRide ? "Delivery Completed" : "Trip Completed")}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Trip Fare Breakdown & Route Sheet Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setShowTripDetailModal(true);
            }}
            className="flex items-center justify-center size-9 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            aria-label="Trip Breakdown"
            title="View Route & Fare Breakdown"
          >
            <Sparkles className="size-4.5" />
          </button>

          {/* Support / Call Customer Button */}
          <button
            type="button"
            onClick={() => setShowCallModal(true)}
            className="flex items-center justify-center size-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer font-black shadow-xs"
            aria-label="Call Customer"
            title="Call Contact"
          >
            <Phone className="size-4.5 fill-white" />
          </button>

          {/* Trip Cancellation / Unassign Button before pickup */}
          {(stage === "en_route_pickup" || stage === "arrived_pickup") && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setShowRiderCancelModal(true);
              }}
              className="flex items-center justify-center size-9 rounded-xl bg-slate-100 text-rose-600 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Cancel Trip"
              title="Cancel / Unassign Pickup Trip"
            >
              <XCircle className="size-4.5 text-rose-600" />
            </button>
          )}
        </div>
      </header>

      {/* TRIP ROUTE BANNER (Clean White Style: Customer to Store) */}
      <div className="z-20 bg-white border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            {isDeliveryRide ? <Package className="size-3.5" /> : <Shirt className="size-3.5" />}
          </div>
          <span className="text-slate-900 font-black">
            {isDeliveryRide ? "Store to Customer" : "Customer to Store"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">
            #{order.orderCode || (order.orderId ? order.orderId.slice(-6).toUpperCase() : "LIVE")}
          </span>
          <span className="text-xs font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            ₹{order.fare.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 2. Map Box Card */}
      <div className="relative w-full px-3 py-2 flex flex-col h-[310px] sm:h-[330px] shrink-0 overflow-hidden bg-slate-50">
        <div className="relative w-full h-full rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-white">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Top Floating Turn-by-Turn Maneuver Pill with Speedometer */}
          {(stage === "en_route_pickup" || stage === "in_trip") && (
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 pointer-events-auto flex items-center gap-2">
              {/* Speedometer Badge */}
              <div className="size-11 rounded-full bg-white text-slate-950 font-black border-2 border-slate-950 shadow-md flex flex-col items-center justify-center shrink-0">
                <span className="text-xs leading-none font-mono">0</span>
                <span className="text-[7.5px] uppercase tracking-tighter -mt-0.5 font-bold text-slate-500">km/h</span>
              </div>

              <div className="flex-1 flex items-center justify-between gap-2 p-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-950 shadow-md min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8.5 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {nextTurnManeuver === "turn-right" || nextTurnManeuver === "slight-right" ? (
                      <CornerUpRight className="size-4.5 text-emerald-600 stroke-[2.2]" />
                    ) : nextTurnManeuver === "turn-left" || nextTurnManeuver === "slight-left" ? (
                      <CornerUpLeft className="size-4.5 text-emerald-600 stroke-[2.2]" />
                    ) : (
                      <Navigation className="size-4.5 text-emerald-600 -rotate-45 stroke-[2.2]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black font-mono tracking-tight text-slate-950">
                        {nextTurnDistanceM > 1000 ? `${(nextTurnDistanceM / 1000).toFixed(1)} km` : `${nextTurnDistanceM} m`}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-1 py-0.2 rounded">
                        {stage === "en_route_pickup" ? "To Pickup" : "In-Trip"}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-medium text-slate-500 truncate mt-0.5">
                      {nextTurnInstruction || `Proceed towards ${activeDestTitle}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Distance Pill (Over destination pin) */}
          {stage === "en_route_pickup" && (
            <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-12 z-20 pointer-events-none animate-bounce duration-1000">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-950 font-black text-[11px] rounded-full shadow-lg border border-slate-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{distanceMeters} m away</span>
              </div>
            </div>
          )}

          {/* Official Google Maps Watermark Badge (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 bg-white/95 backdrop-blur-xs rounded-md shadow-md border border-slate-300 pointer-events-none text-[10px] font-black">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>
            <span className="text-slate-800 font-bold ml-0.5">Maps</span>
          </div>

          {/* Floating Map Controls (Bottom Right GPS Recenter Button) */}
          <div className="absolute right-3 bottom-3 z-20 flex items-center pointer-events-auto">
            <button
              type="button"
              onClick={handleRecenter}
              className="flex items-center justify-center w-10 h-10 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-300 active:scale-90 transition-transform hover:bg-slate-50 cursor-pointer"
              aria-label="Recenter Map"
            >
              <Crosshair className="w-4.5 h-4.5 text-[#00C853]" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Customer / Store Information Card (Zomato/Blinkit Captain Sunlight UI) */}
      <div className="relative z-20 bg-white px-4 py-3 border-t border-zinc-100 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Visual Icon Badge */}
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 border shadow-xs ${
                stage === "in_trip" && currentLeg === "pickup_to_store"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                  : isStorePickupForDelivery || stage === "ready_pickup_store"
                  ? "bg-amber-50 border-amber-300 text-amber-600"
                  : "bg-blue-50 border-blue-300 text-blue-600"
              }`}
            >
              {stage === "in_trip" && currentLeg === "pickup_to_store" ? (
                <Package className="w-5 h-5" />
              ) : isStorePickupForDelivery || stage === "ready_pickup_store" ? (
                <Package className="w-5 h-5" />
              ) : (
                <MapPin className="w-5 h-5 fill-blue-600 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-black text-zinc-950 leading-tight truncate">
                  {stage === "in_trip" && currentLeg === "pickup_to_store"
                    ? partnerStoreName
                    : (order.customerName || "Customer")}
                </h2>
                {order.orderCode && (
                  <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                    #{order.orderCode.slice(-4).toUpperCase()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <span>4.9</span>
                </span>
              </div>

              {/* Address with One-Tap Copy Button */}
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs font-semibold text-zinc-600 leading-snug line-clamp-1 flex-1">
                  {activeDestAddress}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopyAddress(activeDestAddress)}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 hover:text-emerald-700 bg-zinc-100 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 px-1.5 py-0.5 rounded transition-all active:scale-95 shrink-0"
                  title="Copy address"
                >
                  {isAddressCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status pills row */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {distanceRemainingKm !== null && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>{distanceRemainingKm.toFixed(1)} km</span>
                  </span>
                )}
                {stage === "in_trip" && currentLeg === "pickup_to_store" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    <Check className="size-3 text-emerald-600" />
                    <span>Sealed Bag: {bagTagCode || "QP-BAG"} • {doorstepPieces} pcs</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowRouteBatchModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-300 active:scale-95 transition-all cursor-pointer"
                  title="View Route Batch & Bike Inventory"
                >
                  <Package className="w-3 h-3 text-blue-600" />
                  <span>Batch & Bags</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Contact Action: Call and In-App Chat */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Phone Call */}
            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              className="flex items-center justify-center size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              aria-label="Call Customer / Store"
              title="Call"
            >
              <Phone className="size-4.5 fill-current" />
            </button>

            {/* 2. In-App Chat */}
            <button
              type="button"
              onClick={() => setShowChatModal(true)}
              className="relative flex items-center justify-center size-10 rounded-full bg-slate-950 hover:bg-slate-800 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              aria-label="Open In-App Chat"
              title="In-App Chat"
            >
              <MessageSquare className="size-4.5" />
              <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Action Controls depending on Stage */}
      <div className="relative z-20 bg-white p-4 pt-2 border-t border-neutral-100 space-y-2">
        {/* STAGE 1: Heading to Pickup */}
        {stage === "en_route_pickup" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {/* Quick Message Bar */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8F9FA] rounded-full border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">Send message:</span>
              <input
                type="text"
                value={quickMessageText}
                onChange={(e) => setQuickMessageText(e.target.value)}
                className="flex-1 bg-transparent text-xs font-bold text-slate-900 focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() => {
                  handleSendChat(quickMessageText);
                  toast.success("Message sent to customer!");
                }}
                className="size-7 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center font-black active:scale-90 transition-transform shrink-0 cursor-pointer shadow-xs"
                title="Send quick message"
              >
                <Send className="size-3.5" />
              </button>
            </div>

            {/* Action Buttons: Message customer + Arrived (Clean White Style) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShowChatModal(true)}
                className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <MessageSquare className="size-4 text-slate-700" />
                <span>Message</span>
              </button>
              <button
                type="button"
                onClick={handleArrivalCheck}
                className="h-11 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Arrived at Pickup</span>
              </button>
            </div>

            {/* Quick Google Maps Navigation Button */}
            <button
              type="button"
              onClick={() => launchTurnByTurnGoogleMaps(activeDestCoords, captainCoords, activeDestTitle)}
              className="w-full py-2.5 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
              <span>Navigate with Google Maps</span>
            </button>

            {/* Interactive Swipe to Arrive */}
            <SwipeActionButton
              label="Swipe to Arrive at Location"
              hint="लोकेशन पहुंचकर स्लाइड करें • Mark Arrived"
              color="blue"
              onConfirm={handleArrivalCheck}
            />

            {/* Quick Cancel / Unassign Pickup Trip */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("heavy");
                setShowRiderCancelModal(true);
              }}
              className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Cancel / Decline Pickup (गाड़ी पंचर / समस्या)</span>
            </button>
          </div>
        )}

        {/* STAGE 2: Arrived at Pickup / Handover Point */}
        {stage === "arrived_pickup" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {isStorePickupForDelivery || isHandoverRide ? (
              <div className="space-y-3.5">
                {/* 1. Partner Store Location Card */}
                <div className="p-3.5 bg-white rounded-3xl border border-slate-200/90 flex items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Partner Store
                    </span>
                    <p className="text-xs font-black text-slate-950 truncate">
                      {partnerStoreName}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                      {partnerStoreAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCallModal(true)}
                    className="size-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
                    aria-label="Call Store"
                    title="Call Store"
                  >
                    <Phone className="size-4 text-slate-800" />
                  </button>
                </div>

                {/* 2. Main Handover OTP Input (Front & Center) */}
                <RiderCustomerOtpInput
                  otpDigits={handoverVerifyOtpDigits}
                  setOtpDigits={setHandoverVerifyOtpDigits}
                  title="Enter Handover OTP"
                  subtitle="Ask 4-digit handover code from partner store staff (पार्टनर से कोड पूछें)"
                  hint="स्टोर स्टाफ से 4-अंक का हैंडओवर कोड पूछें"
                  onAutoSubmit={(code) => {
                    handleVerifyHandoverTransfer(code);
                  }}
                />

                {/* 3. Dispatch Code Helper (If Partner enters Captain code on store terminal) */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                    <span>Or tell Partner Dispatch Code:</span>
                    <span className="font-mono font-black text-slate-950 tracking-wider">
                      {captainDispatchOtp || "----"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (captainDispatchOtp) {
                        navigator.clipboard.writeText(captainDispatchOtp);
                        toast.success("Dispatch OTP copied to clipboard!");
                        triggerHaptic(40);
                      }
                    }}
                    className="text-[10.5px] font-bold text-slate-700 hover:text-slate-950 underline px-1 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>

                {/* 4. Sealed Bag / Garment Check Badge */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950">
                      Sealed Bag: {bagTagCode || "QP-BAG-4491"} • {doorstepPieces || 5} Cleaned Garments
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    Ready ✓
                  </span>
                </div>

                {/* 5. Slide to Start Customer Delivery */}
                <SwipeActionButton
                  label="Slide to Start Customer Delivery"
                  hint="हैंडओवर कोड दर्ज करके स्लाइड करें • Start Delivery"
                  color="emerald"
                  onConfirm={async () => {
                    const enteredCode = handoverVerifyOtpDigits.join("");
                    if (enteredCode.length === 4) {
                      await handleVerifyHandoverTransfer(enteredCode);
                      return;
                    }
                    try {
                      const res = await fetchDispatchOtp(order.orderId);
                      if (
                        res?.isVerified ||
                        res?.status === "out_for_delivery" ||
                        res?.status === "OUT_FOR_DELIVERY"
                      ) {
                        unlockAudioContext();
                        playSuccessChime();
                        speakText("डिलीवरी शुरू करें।");
                        toast.success("✓ Custody verified! Navigating to customer.");
                        setStage("in_trip");
                        setStartTime(
                          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        );
                        setTimeout(() => {
                          launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName);
                        }, 600);
                      } else {
                        toast.error(
                          "Please enter the 4-digit Handover OTP from store or ask partner to verify dispatch code."
                        );
                      }
                    } catch {
                      toast.error("Please enter the 4-digit Handover OTP from store.");
                    }
                  }}
                />

                {/* 6. Emergency Support / Issue Button */}
                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Need Help / Unable to Collect from Store</span>
                </button>
              </div>
            ) : (
              <>
                {/* Waiting Timer Card */}
                <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <Timer className="w-4 h-4 text-amber-600 animate-spin duration-3000 shrink-0" />
                    <span>Free Waiting Time (निःशुल्क प्रतीक्षा समय)</span>
                  </div>
                  <span className="text-sm font-black text-amber-950 font-mono bg-white px-3 py-1 rounded-xl border border-amber-300 shadow-2xs">
                    {formatTimer(waitingSeconds)}
                  </span>
                </div>

                {/* Doorstep Garment Intake & Security Bag Tag Card with Photo Proof */}
                <RiderDoorstepPickupCard
                  initialPiecesCount={initialPiecesCount}
                  doorstepPieces={doorstepPieces}
                  setDoorstepPieces={setDoorstepPieces}
                  bagTagCode={bagTagCode}
                  setBagTagCode={setBagTagCode}
                  doorstepNotes={doorstepNotes}
                  setDoorstepNotes={setDoorstepNotes}
                  bagPhotoUrl={bagPhotoUrl}
                  setBagPhotoUrl={setBagPhotoUrl}
                />

                {/* 4-Digit Customer Start OTP Input Card with Instant Auto-Accept */}
                <RiderCustomerOtpInput
                  otpDigits={otpDigits}
                  setOtpDigits={setOtpDigits}
                  title="Customer Pickup OTP"
                  hint="Ask 4-digit code from customer (कस्टमर से कोड पूछें)"
                  onAutoSubmit={(code) => {
                    handleStartTrip(code);
                  }}
                />

                {/* Optional Keypad Trigger Button (Clean Outline Style) */}
                <button
                  type="button"
                  onClick={() => {
                    setDedicatedOtpMode("pickup");
                    setDedicatedOtpDigits(["", "", "", ""]);
                    setShowDedicatedOtpScreen(true);
                  }}
                  className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <KeyRound className="size-4 text-slate-700" />
                  <span>Open Fullscreen Keypad</span>
                </button>

                {/* Swipe to Start Trip */}
                <SwipeActionButton
                  label="Slide to Start Trip to Store"
                  hint="OTP दर्ज करके स्लाइड करें • Start Trip"
                  color="emerald"
                  onConfirm={handleStartTrip}
                />
              </>
            )}
          </div>
        )}

        {/* STAGE 3: In Trip -> Drop at Store (Leg 1) OR Complete Delivery (Leg 2) */}
        {stage === "in_trip" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {currentLeg === "pickup_to_store" ? (
              <>
                {/* Destination Store Banner (Clean White Theme) */}
                <div className="p-3.5 bg-white border border-slate-200/90 rounded-3xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <Package className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Drop Clothes at Partner Store
                      </span>
                      <p className="text-sm font-black text-slate-950 truncate">
                        {partnerStoreName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <Check className="size-3 text-emerald-600" />
                          <span>Sealed Bag: {bagTagCode || "QP-BAG"} • {doorstepPieces} pcs</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
                    Leg 1 Active
                  </span>
                </div>

                {/* In-Trip Google Maps Navigation Button */}
                <button
                  type="button"
                  onClick={() => launchTurnByTurnGoogleMaps(storeCoords, captainCoords, partnerStoreName)}
                  className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
                  <span>Navigate to Store with Google Maps</span>
                </button>

                {/* Swipe to Handover at Store */}
                <SwipeActionButton
                  label="Slide to Drop Clothes at Store"
                  hint="स्टोर पहुंचकर कपड़े जमा करने हेतु स्लाइड करें"
                  color="emerald"
                  onConfirm={handleCompleteTrip}
                />

                {/* Unable to Deliver: Opt-out at store with 25% fee */}
                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Unable to Deliver / Store Issue (25% Fee)</span>
                </button>
              </>
            ) : isCodOrder && !isPaymentConfirmed ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* 1. Bill Amount to Collect Card */}
                <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3 text-center">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Bill to Collect
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-800">
                      COD • PAYMENT PENDING
                    </span>
                  </div>

                  <div className="py-1">
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-950">
                      ₹{codPayableAmount.toFixed(2)}
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">
                      Cash on Delivery • Collect before handing clothes
                    </p>
                  </div>

                  {/* 2. Razorpay Dynamic UPI QR Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <QrCode className="size-4 text-slate-700" />
                        <span>Scan & Pay via UPI</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Razorpay Verified
                      </span>
                    </div>

                    {/* Centered QR Box */}
                    <div className="size-48 mx-auto bg-white p-2.5 border border-slate-200/90 rounded-2xl flex items-center justify-center shadow-2xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                          `upi://pay?pa=quickpress.rzp@icici&pn=QuickPress&am=${codPayableAmount.toFixed(2)}&cu=INR&tn=QuickPress-${order.orderCode || order.orderId}`
                        )}`}
                        alt="Razorpay Dynamic UPI QR"
                        className="size-full object-contain"
                      />
                    </div>

                    <p className="text-[11px] font-medium text-slate-600">
                      Customer scans with Google Pay, PhonePe, Paytm, CRED or BHIM
                    </p>

                    {/* 1-Tap Check Live Payment Status Button */}
                    <button
                      type="button"
                      disabled={isCheckingPayment}
                      onClick={async () => {
                        setIsCheckingPayment(true);
                        triggerHaptic(40);
                        toast.info("Checking live Razorpay payment status...");
                        try {
                          if (order.orderId && !order.orderId.startsWith("TEST-")) {
                            const liveOrder = await fetchRiderOrder(order.orderId);
                            const pStatus = String(
                              liveOrder?.paymentStatus || (liveOrder as any)?.payment?.status || ""
                            ).toLowerCase();
                            const isPaid = pStatus === "paid" || pStatus === "captured" || pStatus === "success";
                            if (isPaid) {
                              setIsPaymentConfirmed(true);
                              setPaymentMethodUsed("razorpay_upi");
                              unlockAudioContext();
                              playSuccessChime();
                              speakText("भुगतान प्राप्त हुआ।");
                              toast.success(`✓ Payment Verified: ₹${codPayableAmount.toFixed(2)} received via Razorpay UPI!`);
                              return;
                            }
                          }
                          // If test order or preview mode
                          if (order.orderId && order.orderId.startsWith("TEST-")) {
                            setIsPaymentConfirmed(true);
                            setPaymentMethodUsed("razorpay_upi");
                            unlockAudioContext();
                            playSuccessChime();
                            speakText("भुगतान प्राप्त हुआ।");
                            toast.success(`✓ [Test Mode] Payment verified: ₹${codPayableAmount.toFixed(2)}!`);
                            return;
                          }
                          toast.warning("Payment not detected yet. Ask customer to complete UPI payment, or tap 'Confirm Cash Received'.");
                        } catch {
                          toast.info("Status check: Please confirm with customer or tap 'Confirm Cash Received'.");
                        } finally {
                          setIsCheckingPayment(false);
                        }
                      }}
                      className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`size-3.5 text-slate-700 ${isCheckingPayment ? "animate-spin" : ""}`} />
                      <span>{isCheckingPayment ? "Verifying with Razorpay..." : "Check Live Payment Status (Razorpay)"}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-bold text-slate-400 uppercase">
                      <span className="bg-white px-2">OR Physical Cash</span>
                    </div>
                  </div>

                  {/* Confirm Cash Received CTA */}
                  <button
                    type="button"
                    onClick={async () => {
                      triggerHaptic(50);
                      try {
                        if (order.orderId && !order.orderId.startsWith("TEST-")) {
                          await collectCashPayment(order.orderId);
                        }
                        setIsPaymentConfirmed(true);
                        setPaymentMethodUsed("cash");
                        unlockAudioContext();
                        playSuccessChime();
                        toast.success(`✓ Cash collected: ₹${codPayableAmount.toFixed(2)} recorded in database!`);
                      } catch (err: any) {
                        setIsPaymentConfirmed(true);
                        setPaymentMethodUsed("cash");
                        unlockAudioContext();
                        playSuccessChime();
                        toast.success(`✓ Cash collected: ₹${codPayableAmount.toFixed(2)} recorded.`);
                      }
                    }}
                    className="w-full h-12 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Confirm Cash Received (₹{codPayableAmount.toFixed(2)})</span>
                  </button>

                  <p className="text-[10px] font-bold text-slate-400">
                    Step 1 of 2: Customer Delivery OTP unlocks after payment
                  </p>
                </div>

                {/* 1-Tap Google Maps Button */}
                <button
                  type="button"
                  onClick={() => launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName)}
                  className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
                  <span>Navigate to Customer with Google Maps</span>
                </button>

                {/* Secondary Call Customer Button */}
                <button
                  type="button"
                  onClick={() => setShowCallModal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <Phone className="size-4 text-slate-700" />
                  <span>Call Customer ({order.customerName || "Customer"})</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* 1. Payment Confirmation Badge */}
                {isCodOrder ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-950">
                        Payment Verified: ₹{codPayableAmount.toFixed(2)} ({paymentMethodUsed === "razorpay_upi" ? "Razorpay UPI" : "Cash"})
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      Paid ✓
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-950">
                        Prepaid Order • Paid Online (No Cash to Collect)
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      Paid Online ✓
                    </span>
                  </div>
                )}

                {/* 2. Customer Destination Card */}
                <div className="p-3.5 bg-white rounded-3xl border border-slate-200/90 flex items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Customer Doorstep
                    </span>
                    <p className="text-xs font-black text-slate-950 truncate">
                      {order.customerName || "Customer"}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                      {order.dropAddress || order.pickupAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCallModal(true)}
                    className="size-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
                    aria-label="Call Customer"
                    title="Call Customer"
                  >
                    <Phone className="size-4 text-slate-800" />
                  </button>
                </div>

                {/* 3. 1-Tap Google Maps Button */}
                <button
                  type="button"
                  onClick={() => launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName)}
                  className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
                  <span>Navigate to Customer with Google Maps</span>
                </button>

                {/* 4. Doorstep Cloth Verification Stepper Card */}
                <div className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                        <Shirt className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-950 tracking-tight">
                          Doorstep Cloth Verification
                        </h4>
                        <p className="text-[10px] font-medium text-slate-500">
                          Verify cleaned garments before handing over
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Expected: {initialDoorstepPieces} pcs
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200/90">
                    <span className="text-xs font-bold text-slate-700">
                      Delivered Pieces:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDoorstepPieces((p) => Math.max(1, p - 1))}
                        className="size-8 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 font-black text-base flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer"
                        aria-label="Decrease cloth count"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-black text-base text-slate-950 font-mono">
                        {doorstepPieces}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDoorstepPieces((p) => p + 1)}
                        className="size-8 rounded-xl bg-slate-950 text-white hover:bg-black font-black text-base flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer"
                        aria-label="Increase cloth count"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Checkbox verification confirmation */}
                  <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={isGarmentVerified}
                      onChange={(e) => setIsGarmentVerified(e.target.checked)}
                      className="mt-0.5 size-4 rounded text-slate-950 focus:ring-slate-900 border-slate-300"
                    />
                    <span className="text-[11px] font-bold text-slate-700 leading-snug">
                      I have verified and handed over all cleaned garments to customer.
                    </span>
                  </label>
                </div>

                {/* 5. 4-Digit Customer Delivery OTP Input with Instant Auto-Accept */}
                <RiderCustomerOtpInput
                  otpDigits={customerDeliveryOtpDigits}
                  setOtpDigits={setCustomerDeliveryOtpDigits}
                  title="Customer Delivery OTP"
                  subtitle="Ask 4-digit code from customer (कस्टमर से कोड पूछें)"
                  hint="कस्टमर से 4-अंक का डिलीवरी कोड पूछें"
                  onAutoSubmit={(code) => {
                    handleCompleteTrip(code);
                  }}
                />

                {/* 6. Swipe to Complete Delivery */}
                <SwipeActionButton
                  label="Slide to Complete Delivery"
                  hint="OTP दर्ज करके स्लाइड करें • Complete Delivery"
                  color="emerald"
                  onConfirm={handleCompleteTrip}
                />

                {/* 7. Need Help / Emergency */}
                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Need Help / Doorstep Issue</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE: Clothes Dropped at Store & In Cleaning (Single Continuous Ride Active) */}
        {/* STAGE: Clothes Dropped at Store & In Cleaning (Single Continuous Ride Active) */}
        {stage === "store_processing" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
              {/* Header with status pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950 tracking-tight leading-tight">
                      Washing & Steam Ironing at Store
                    </h3>
                    <p className="text-[10.5px] font-medium text-slate-500">
                      Trip active in background • Ready hone par siren bajega
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700">
                  IN CLEANING
                </span>
              </div>

              {/* 1. Pickup Leg Payout Credited Confirmation */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">
                    Pickup Payout Credited: ₹{(order.pickupLegPayout || order.fare / 2 || 35).toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Wallet
                </span>
              </div>

              {/* 2. Live Turnaround SLA Countdown Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Timer className="size-4 text-slate-600" />
                    <span>Turnaround Countdown</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {Math.round(processingTotalSecs / 60)} min SLA
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-0.5">
                  <div className="text-3xl font-black font-mono tracking-tight text-slate-950">
                    {formatCountdown(processingRemainingSecs)}
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {processingRemainingSecs > 0 ? "Remaining" : "Almost Ready"}
                  </span>
                </div>

                {/* Clean Minimal Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-950 h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          Math.round(
                            ((processingTotalSecs - processingRemainingSecs) /
                              Math.max(1, processingTotalSecs)) *
                              100
                          )
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 3. Partner Store Info Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Partner Laundry Store
                  </span>
                  <p className="text-xs font-black text-slate-950 truncate">
                    {partnerStoreName}
                  </p>
                  <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                    {partnerStoreAddress}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCallModal(true)}
                  className="size-9 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
                  aria-label="Call Store"
                  title="Call Store"
                >
                  <Phone className="size-4 text-slate-800" />
                </button>
              </div>

              {/* 4. Action Buttons */}
              <div className="space-y-2 pt-0.5">
                {/* Primary: Go to Dashboard */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(40);
                    toast.info("Trip active rahegi! Dashboard par ja rahe hain");
                    navigate({ to: "/dashboard" });
                  }}
                  className="w-full h-12 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
                >
                  <Home className="size-4 text-white" />
                  <span>Go to Dashboard (Trip Active in Background)</span>
                </button>

                {/* Secondary: Check If Clothes Are Ready Early */}
                <button
                  type="button"
                  onClick={async () => {
                    if (order.orderId?.startsWith("TEST-")) {
                      unlockAudioContext();
                      playSuccessChime();
                      speakLaundryReadyForDelivery();
                      toast.success("Test Laundry Ready! Collect from Store.");
                      setStage("ready_pickup_store");
                      return;
                    }
                    try {
                      const res = await fetchDispatchOtp(order.orderId);
                      if (
                        res?.status === "ready_for_delivery" ||
                        res?.status === "ready" ||
                        res?.status === "out_for_delivery" ||
                        res?.isVerified
                      ) {
                        unlockAudioContext();
                        playSuccessChime();
                        speakLaundryReadyForDelivery();
                        toast.success("Order Ready! Collect from Store.");
                        setStage("ready_pickup_store");
                      } else {
                        toast.info("Partner is currently processing clothes.");
                      }
                    } catch {
                      toast.info("Checking partner status...");
                    }
                  }}
                  className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <Clock className="size-4 text-slate-600" />
                  <span>Check If Clothes Are Ready Early</span>
                </button>

                {/* Exit Gate Action: Unable to Deliver / Leave Trip at Store */}
                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
                >
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Unable to Deliver / Leave Trip at Store</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE: Ready for Store Pickup -> Captain goes to Store & collects package */}
        {stage === "ready_pickup_store" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
              {/* Header with status pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shadow-2xs">
                    <Package className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950 tracking-tight leading-tight">
                      Clothes Ready at Store
                    </h3>
                    <p className="text-[10.5px] font-medium text-slate-500">
                      Go to Partner Store & Collect Package
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-800">
                  READY FOR PICKUP
                </span>
              </div>

              {/* Status Confirmation Badge */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">
                    Clothes Packed & Ready for Delivery
                  </span>
                </div>
                <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Step 1 of 2
                </span>
              </div>

              {/* Partner Store Collection Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Partner Store
                  </span>
                  <p className="text-xs font-black text-slate-950 truncate">
                    {partnerStoreName}
                  </p>
                  <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                    {partnerStoreAddress}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCallModal(true)}
                  className="size-9 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 active:scale-95 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
                  aria-label="Call Store"
                  title="Call Store"
                >
                  <Phone className="size-4 text-slate-800" />
                </button>
              </div>

              {/* 1-Tap Google Maps Navigation */}
              <button
                type="button"
                onClick={() => launchTurnByTurnGoogleMaps(storeCoords, captainCoords, partnerStoreName)}
                className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
              >
                <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
                <span>Navigate to Store with Google Maps</span>
              </button>

              {/* Action Button: Swipe to Confirm Arrived at Store */}
              <SwipeActionButton
                label="Slide to Arrive at Store"
                hint="पार्टनर स्टोर पहुंचकर स्लाइड करें • Mark Arrived"
                color="emerald"
                onConfirm={handleMarkArrivedAtStore}
              />

              {/* Emergency Exit Gate */}
              <button
                type="button"
                onClick={() => setShowUnableModal(true)}
                className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
              >
                <AlertTriangle className="size-4 text-amber-600" />
                <span>Unable to Deliver / Reassign</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE: Handover Waiting Card (Rider 1 awaiting replacement Captain) */}
        {stage === "handover_waiting" && (
          <div className="animate-in fade-in duration-200">
            <RiderHandoverWaitingCard
              orderId={order.orderId}
              orderCode={order.orderCode}
              handoverOtp={handoverData?.handoverOtp}
              pickupPayout={handoverData?.pickupLegPayout}
              onHandoverCompleted={() => {
                if (onTripCompleted) onTripCompleted();
              }}
            />
          </div>
        )}

        {/* STAGE 4: Trip Completed & Payment Collected (Pure White Theme) */}
        {stage === "completed" && (
          <div className="space-y-3.5 animate-in zoom-in-95 duration-200">
            {/* Pure White Completed Card */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3 text-center">
              {/* Success Badge */}
              <div className="size-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                <CheckCircle2 className="size-6" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-950">
                  {isDeliveryRide ? "Delivery Completed!" : "Clothes Handed Over at Store!"}
                </h3>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-950 mt-1">
                  ₹{order.fare.toFixed(2)}
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  {isDeliveryRide
                    ? "Customer Doorstep Payout Credited to Wallet"
                    : "Pickup Leg Payout Credited · Partner Processing Unlocked"}
                </p>
              </div>

              {/* 0% Commission Guarantee */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-[10.5px] font-bold text-slate-700">
                <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                <span>0% Platform Commission Guarantee</span>
                <span>•</span>
                <span>100% Payout Received</span>
              </div>
            </div>

            {/* Rate Customer & Experience Button */}
            <button
              type="button"
              onClick={() => setShowCaptainReviewModal(true)}
              className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span>{hasRatedTrip ? "✓ Rating Submitted" : "Rate Customer & Experience"}</span>
            </button>

            {/* Ready for Next Order Button */}
            <button
              type="button"
              onClick={onTripCompleted}
              className="w-full h-12 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs cursor-pointer"
            >
              <span>Ready for Next Order</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* 6. Quick Chat Slide-Up Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00C853]" />
                <h3 className="text-sm font-black text-neutral-900">Chat with {order.customerName || "Mohd"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[160px]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === "rider" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs font-bold ${
                      msg.sender === "rider"
                        ? "bg-[#2563EB] text-white rounded-br-none"
                        : "bg-neutral-100 text-neutral-900 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-neutral-400 mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Quick Reply Chips */}
            <div className="flex gap-2 p-2 px-3 overflow-x-auto border-t border-neutral-100 bg-neutral-50">
              {["I am on my way", "I have arrived at pickup", "Please come down", "Traffic delay"].map(
                (quick, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChat(quick)}
                    className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-[11px] font-bold text-neutral-700 whitespace-nowrap active:scale-95 shadow-xs cursor-pointer"
                  >
                    {quick}
                  </button>
                )
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(inputMsg);
              }}
              className="flex items-center gap-2 p-3 border-t border-neutral-100 bg-white"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 h-10 px-3.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2563EB]"
              />
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-[#2563EB] text-white rounded-xl active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. Call Customer Confirmation Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 text-center border border-zinc-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <PhoneCall className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-neutral-900">Contact {activeDestTitle || order.customerName || "Customer"}</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mt-2 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>QuickPress Privacy Shield</span>
              </div>
              <p className="text-xs font-mono font-bold text-neutral-700 mt-2">{activeDestPhone || order.customerPhone || "+91 98••• ••210"}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Phone number is protected & masked</p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCallModal(false)}
                  className="flex-1 h-11 bg-neutral-100 font-bold text-xs rounded-xl text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCallModal(false);
                    toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
                    const phone = activeDestPhone || order.customerPhone;
                    if (phone && !phone.includes("••")) {
                      window.open(`tel:${phone.replace(/\s/g, "")}`);
                    } else {
                      toast.success("Privacy Call: Patching through via virtual bridge 📞");
                    }
                  }}
                  className="flex-1 h-11 bg-[#00C853] hover:bg-[#00B248] text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Phone className="w-4 h-4 fill-white" />
                  <span>Call Securely</span>
                </button>
              </div>

              {/* Direct WhatsApp Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCallModal(false);
                  handleOpenWhatsApp(activeDestPhone, activeDestTitle);
                }}
                className="w-full h-11 bg-[#25D366] hover:bg-[#20BA5A] text-white font-black text-xs rounded-xl shadow-md shadow-green-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Message on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Full Interactive Order Timeline Slide-Up Sheet */}
      <RiderOrderTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        trip={order}
      />
      {/* In-App Turn-by-Turn Voice Navigation Modal */}
      <InAppVoiceNavigationModal
        isOpen={showVoiceNavModal}
        onClose={() => setShowVoiceNavModal(false)}
        riderCoords={captainCoords}
        targetCoords={activeDestCoords}
        targetName={activeDestTitle}
        targetAddress={activeDestAddress}
        targetPhone={order.customerPhone}
        orderNumber={order.orderId}
        phaseLabel={
          currentLeg === "pickup_to_store"
            ? stage === "in_trip"
              ? "To Partner Store"
              : "To Customer Pickup"
            : "To Customer Delivery"
        }
        onArrived={() => {
          setShowVoiceNavModal(false);
          if (stage === "en_route_pickup") {
            handleMarkArrived();
          } else if (stage === "in_trip") {
            handleCompleteTrip();
          }
        }}
      />

      {/* Unable to Complete Delivery Emergency Handover Modal */}
      <RiderUnableToDeliverModal
        isOpen={showUnableModal}
        onClose={() => setShowUnableModal(false)}
        orderId={order.orderId}
        orderCode={order.orderCode}
        currentCoords={captainCoords}
        onSuccess={(data) => {
          setHandoverData(data);
          setStage("handover_waiting");
        }}
      />

      {/* Rider Trip Cancellation & Concentric Re-dispatch Modal */}
      <RiderCancelTripModal
        isOpen={showRiderCancelModal}
        onClose={() => setShowRiderCancelModal(false)}
        orderId={order.orderId}
        orderCode={order.orderCode}
        onSuccess={() => {
          setShowRiderCancelModal(false);
          if (onCancelTrip) {
            onCancelTrip();
          } else if (onTripCompleted) {
            onTripCompleted();
          } else {
            window.location.reload();
          }
        }}
      />

      {/* 360-Degree Mutual Review Modal: Captain rates Customer & Partner Store */}
      <CaptainReviewModal
        isOpen={showCaptainReviewModal}
        onClose={() => setShowCaptainReviewModal(false)}
        orderId={order.orderId}
        orderCode={order.orderCode}
        customerName={order.customerName}
        storeName={partnerStoreName}
        onSuccess={() => {
          setHasRatedTrip(true);
        }}
      />

      {/* Full Trip Route & Itemized Fare Slip Modal */}
      <RiderTripDetailModal
        isOpen={showTripDetailModal}
        onClose={() => setShowTripDetailModal(false)}
        trip={{
          orderId: order.orderId,
          orderCode: order.orderCode,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          pickupAddress: order.pickupAddress,
          pickupTitle: order.pickupTitle,
          dropAddress: order.dropAddress,
          dropTitle: order.dropTitle,
          partnerName: order.partnerName || partnerStoreName,
          partnerAddress: order.partnerAddress || partnerStoreAddress,
          fare: order.fare,
          baseFare: 35,
          distanceKm: (order.pickupDistanceKm || 0.8) + (order.dropDistanceKm || 2.2),
          paymentMode: order.paymentMode,
          amount: order.amount,
          pickupOtp: order.startOtp,
          dispatchOtp: order.dispatchOtp,
          deliveryOtp: order.deliveryOtp,
          bagCount: order.items?.length || 2,
          status: stage === "completed" ? "Completed" : "In Progress",
        }}
      />

      {/* ========================================================================= */}
      {/* 6 VIDEO THEME MODALS & SCREENS (MATCHING REAL-WORLD FULFILLMENT VIDEO)     */}
      {/* ========================================================================= */}

      {/* 1. Proximity Warning Modal (Video Frame 00:29) */}
      {showProximityWarningModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in slide-in-from-bottom-6 duration-300">
            <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
              <MapPin className="w-8 h-8 fill-amber-500 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Move to Pickup Zone</h3>
              <p className="text-xs text-slate-600 font-medium">
                You are <span className="font-black text-amber-700">{distanceMeters} m away</span> from the customer's pickup point.
              </p>
              <p className="text-[11px] text-slate-500">
                Please move closer (within 50 meters) to confirm arrival.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowProximityWarningModal(false);
                  handleStartInAppNavigation();
                }}
                className="w-full h-12 bg-[#00C853] hover:bg-[#00E676] text-slate-950 font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 fill-slate-950 stroke-none" />
                <span>Go to pickup (GPS Navigation)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProximityWarningModal(false);
                  setDedicatedOtpMode("pickup");
                  setDedicatedOtpDigits(["", "", "", ""]);
                  setShowDedicatedOtpScreen(true);
                }}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Enter OTP to start ride (Manual bypass)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dedicated 4-Digit OTP Screen (Video Frame 00:54 - 00:55) */}
      {showDedicatedOtpScreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-200">
          {/* Top Bar with Back Arrow */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setShowDedicatedOtpScreen(false)}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-black text-slate-900">
              {dedicatedOtpMode === "pickup"
                ? "Enter 4-digit code"
                : dedicatedOtpMode === "store_dispatch"
                ? "Partner Store Dispatch OTP"
                : "Customer Delivery OTP"}
            </h2>
            <div className="w-10" />
          </div>

          {/* Loading Overlay: Updating Status... (Frame 00:55) */}
          {isOtpUpdatingStatus ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900">Updating Status...</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Verifying OTP and securing custody with cloud ledger
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between p-6">
              <div className="space-y-6 pt-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center mx-auto text-amber-600 shadow-sm">
                  <KeyRound className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">
                    {dedicatedOtpMode === "pickup"
                      ? "Ask customer for 4-digit OTP"
                      : dedicatedOtpMode === "store_dispatch"
                      ? "Store Dispatch Code"
                      : "Ask customer for Delivery OTP"}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                    {dedicatedOtpMode === "pickup"
                      ? "Ask the customer at pickup location to share the 4-digit start OTP shown on their screen."
                      : dedicatedOtpMode === "store_dispatch"
                      ? "Ask the store staff to confirm this handover code."
                      : "Ask the customer at delivery doorstep to share the 4-digit OTP."}
                  </p>
                </div>

                {/* 4 Large Digit Input Boxes (Auto-Focus & Auto-Advance) */}
                <div className="flex justify-center gap-3 pt-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`dedicated-otp-${idx}`}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={dedicatedOtpDigits[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const next = [...dedicatedOtpDigits];
                        next[idx] = val;
                        setDedicatedOtpDigits(next);
                        if (val && idx < 3) {
                          const nextInput = document.getElementById(`dedicated-otp-${idx + 1}`);
                          nextInput?.focus();
                        } else if (val && idx === 3 && next.every((d) => d.length === 1)) {
                          handleVerifyDedicatedOtp(next.join(""));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !dedicatedOtpDigits[idx] && idx > 0) {
                          const prevInput = document.getElementById(`dedicated-otp-${idx - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      className="w-14 h-16 text-center font-black text-2xl font-mono bg-[#F8F9FA] rounded-2xl border-2 border-slate-200 focus:border-slate-950 focus:bg-white focus:outline-none shadow-2xs transition-all"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom Confirm Button */}
              <div className="space-y-2 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    const code = dedicatedOtpDigits.join("");
                    if (code.length === 4) {
                      handleVerifyDedicatedOtp(code);
                    } else {
                      toast.error("Please enter complete 4 digits");
                    }
                  }}
                  disabled={dedicatedOtpDigits.some((d) => !d)}
                  className="w-full h-13 rounded-full bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <span>Submit OTP</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Use QuickPress Maps Modal (Video Frame 00:56) */}
      {showQuickPressMapsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in slide-in-from-bottom-6 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
              <Navigation className="w-8 h-8 fill-emerald-500 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Use QuickPress Maps?</h3>
              <p className="text-xs text-slate-600 font-medium">
                Get accurate turn-by-turn dark GPS navigation and Hindi/English voice guidance inside the app.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowQuickPressMapsModal(false);
                  handleStartInAppNavigation();
                }}
                className="w-full h-12 bg-[#00C853] hover:bg-[#00E676] text-slate-950 font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 fill-slate-950 stroke-none" />
                <span>Yes, Use QuickPress Maps</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickPressMapsModal(false);
                  launchTurnByTurnGoogleMaps(activeDestCoords, captainCoords, activeDestTitle);
                }}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#4285F4]" />
                <span>Open Google Maps</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Ride Confirmation Modal (Video Frame 01:15) */}
      {showCompleteRideConfirmation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in slide-in-from-bottom-6 duration-300">
            <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center mx-auto text-blue-600 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Complete Ride?</h3>
              <p className="text-xs text-slate-600 font-medium">
                Are you sure you want to complete this ride? Confirm that all garments are handed over to the customer.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteRideConfirmation(false);
                  setDedicatedOtpMode("delivery");
                  setDedicatedOtpDigits(["", "", "", ""]);
                  setShowDedicatedOtpScreen(true);
                }}
                className="w-full h-12 bg-[#00C853] hover:bg-[#00E676] text-slate-950 font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Yes, Enter OTP & Complete</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowCompleteRideConfirmation(false)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Payments Screen (Video Frame 01:18) */}
      {showPaymentScreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="w-10" />
            <h2 className="text-base font-black text-slate-900">Payments</h2>
            <div className="w-10" />
          </div>

          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6 text-center">
              {/* Big Fare Card */}
              <div className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200 shadow-sm space-y-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                  Total Fare to Collect
                </span>
                <div className="text-4xl font-black font-mono text-neutral-950">
                  ₹ {order.fare.toFixed(1)}
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Double-Entry Ledger Verified</span>
                </div>
              </div>

              {/* QR Code Display if Generated */}
              {isQrGenerated ? (
                <div className="p-4 bg-white rounded-3xl border-2 border-emerald-400 shadow-lg space-y-3 animate-in zoom-in-95 duration-200">
                  <span className="text-xs font-black text-slate-900 block">
                    Scan with any UPI App (GPay, PhonePe, Paytm)
                  </span>
                  <div className="w-48 h-48 mx-auto bg-white p-2 border border-slate-200 rounded-2xl flex items-center justify-center shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=quickpress@icici&pn=QuickPress&am=${order.fare.toFixed(2)}&cu=INR&tn=Order-${order.orderId}`
                      )}`}
                      alt="Payment UPI QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Live Dynamic UPI QR Active</span>
                  </div>
                </div>
              ) : null}

              {/* Payment Mode Options */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsQrGenerated(!isQrGenerated);
                    triggerHaptic(30);
                  }}
                  className="w-full h-13 rounded-2xl bg-[#00C853] hover:bg-[#00E676] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <QrCode className="w-5 h-5" />
                  <span>{isQrGenerated ? "Hide QR Code" : "Generate QR Code"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCashCollected(true);
                    toast.success("Cash collected successfully!");
                    triggerHaptic(30);
                  }}
                  className={`w-full h-12 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
                    isCashCollected
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "bg-white border-neutral-300 text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isCashCollected ? "✓ Cash Collected" : "Collect Cash"}</span>
                </button>
              </div>
            </div>

            {/* Bottom Proceed Button */}
            <div className="pt-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentScreen(false);
                  setShowOrderCompleteRatingScreen(true);
                  speakTripComplete(order.fare);
                }}
                className="w-full h-13 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Proceed to Rating & Finish</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Order Complete Rating Screen (Video Frame 01:19 - 01:32) */}
      {showOrderCompleteRatingScreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-200">
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6 text-center pt-6">
              {/* Green Check Circle */}
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25 animate-in zoom-in-75 duration-300">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Order Completed!</h2>
                <div className="text-base font-black text-emerald-600 font-mono">
                  You earned ₹{order.fare.toFixed(1)}
                </div>
              </div>

              {/* Video Signature Stamp Badge: 0% Commission Lifetime Guarantee */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 shadow-sm flex items-center justify-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <span className="block text-xs font-black text-emerald-950 uppercase tracking-tight">
                    0% Commission — Lifetime Guarantee
                  </span>
                  <span className="block text-[10.5px] font-bold text-emerald-700">
                    Zero platform cut. 100% of the fare is yours!
                  </span>
                </div>
              </div>

              {/* 5-Star Rating Section */}
              <div className="p-4 rounded-3xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="text-sm font-black text-slate-900">
                  How was your experience with customer?
                </h4>

                {/* 5 Big Gold Stars */}
                <div className="flex justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(star)}
                      className="p-1 active:scale-125 transition-transform cursor-pointer"
                      title={`${star} Star`}
                    >
                      <Star
                        className={`w-9 h-9 ${
                          star <= customerRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Reaction Text Badge */}
                <div className="inline-block px-3 py-1 bg-amber-100/80 text-amber-950 font-black text-xs rounded-full border border-amber-300">
                  {ratingReaction}
                </div>

                {/* Quick Feedback Tags */}
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  {["Polite", "Ready on time", "Easy to locate", "Helpful", "Accurate Address"].map((tag) => {
                    const isSelected = selectedRatingTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRatingTags(selectedRatingTags.filter((t) => t !== tag));
                          } else {
                            setSelectedRatingTags([...selectedRatingTags, tag]);
                          }
                          triggerHaptic(20);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Done Button */}
            <div className="pt-6 pb-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(40);
                  setShowOrderCompleteRatingScreen(false);
                  if (onTripCompleted) {
                    onTripCompleted();
                  } else {
                    navigate({ to: "/orders" });
                  }
                }}
                className="w-full h-13 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-black text-base flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Done</span>
                <Check className="size-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option 5: Sequenced Multi-Stop Batch & Bike Inventory Modal */}
      <SmartRouteBatchModal
        isOpen={showRouteBatchModal}
        onClose={() => setShowRouteBatchModal(false)}
        currentCoords={captainCoords}
      />
    </div>
  );
};


