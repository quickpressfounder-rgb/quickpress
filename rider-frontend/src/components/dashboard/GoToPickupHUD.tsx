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
  Headphones,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { initRiderSocket, subscribeRiderOrders, emitRiderLocation } from "../../lib/rider-socket";
import { riderLocationEngine } from "../../lib/rider-location-service";
import {
  playArrivalChime,
  playSuccessChime,
  playTripAssignedBell,
  playOrderAlertSound,
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

type TripStage = "en_route_pickup" | "arrived_pickup" | "in_trip" | "arrived_store" | "store_processing" | "ready_pickup_store" | "handover_waiting" | "completed";

export const GoToPickupHUD: React.FC<GoToPickupHUDProps> = ({
  order,
  onOpenDrawer,
  onTripCompleted,
  onCancelTrip,
  onBackToTrips,
}) => {
  const navigate = useNavigate();

  // Guard safe defaults if order is incomplete or missing
  const safeOrder = order || ({} as ActiveOrderData);
  const safeFare = Number(safeOrder.fare ?? (safeOrder as any).amount ?? (safeOrder as any).estimatedEarning ?? (safeOrder as any).delivery_fee ?? 45) || 45;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapEngineRef = useRef<"google" | "leaflet" | null>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleOverlaysRef = useRef<any[]>([]);

  // Two-Leg State Machine: "pickup_to_store" (Leg 1) vs "store_to_customer" (Leg 2)
  const [currentLeg, setCurrentLeg] = useState<"pickup_to_store" | "store_to_customer">(() => {
    if (safeOrder.currentLeg) return safeOrder.currentLeg;
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
  const [waitingSeconds, setWaitingSeconds] = useState(180); // 3 mins waiting from video
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

  // --- VIDEO THEME INTEGRATION STATES (RAPIDO YELLOW THEME) ---
  const [showArrivedConfirmModal, setShowArrivedConfirmModal] = useState(false);
  const [showHandoverConfirmModal, setShowHandoverConfirmModal] = useState(false);
  const [showProximityWarningModal, setShowProximityWarningModal] = useState(false);
  const [showDedicatedOtpScreen, setShowDedicatedOtpScreen] = useState(false);
  const [dedicatedOtpMode, setDedicatedOtpMode] = useState<"pickup" | "delivery" | "store_dispatch">("pickup");
  const [dedicatedOtpDigits, setDedicatedOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [isOtpUpdatingStatus, setIsOtpUpdatingStatus] = useState(false);
  const [showQuickPressMapsModal, setShowQuickPressMapsModal] = useState(false);
  const [showPerfectPickupBanner, setShowPerfectPickupBanner] = useState(false);
  const [showCompleteRideConfirmation, setShowCompleteRideConfirmation] = useState(false);
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [isCashCollected, setIsCashCollected] = useState(false);
  const [showOrderCompleteRatingScreen, setShowOrderCompleteRatingScreen] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
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
          playTripAssignedBell();
          playOrderAlertSound();
          playSuccessChime();
          speakLaundryReadyForDelivery();
          toast.success("🎉 Order Packed & Ready! Go to Partner Store to collect package.");
          setStage("ready_pickup_store");
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [stage, order.orderId]);

  // Polling while in "ready_pickup_store" waiting for partner to verify dispatch OTP
  useEffect(() => {
    if (stage !== "ready_pickup_store" || !order.orderId || order.orderId.startsWith("TEST-")) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchDispatchOtp(order.orderId);
        if (res?.dispatchOtp) setCaptainDispatchOtp(res.dispatchOtp);
        if (
          res?.status === "out_for_delivery" ||
          res?.status === "OUT_FOR_DELIVERY" ||
          res?.isVerified
        ) {
          unlockAudioContext();
          playSuccessChime();
          speakDispatchOtpVerified();
          toast.success("✓ Dispatch OTP verified by Partner! Navigating to customer.");
          setCurrentLeg("store_to_customer");
          setStage("in_trip");
          setIsInAppNavActive(true);
          setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          setTimeout(() => {
            launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName || "Customer");
          }, 600);
        }
      } catch {}
    }, 3000);
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

        // 2. Partner marked ready -> instantly ring bell & siren alarm, chime & voice alert
        if (stat === "ready_for_delivery" || stat === "ready") {
          if (data?.dispatchOtp) setCaptainDispatchOtp(data.dispatchOtp);
          unlockAudioContext();
          playTripAssignedBell();
          playOrderAlertSound();
          playSuccessChime();
          speakLaundryReadyForDelivery();
          toast.success("🎉 Order Packed & Ready! Go to Partner Store to collect package.");
          setStage("ready_pickup_store");
        }

        // 3. Dispatch OTP verified by Partner -> auto-advance to in_trip with voice & customer navigation
        if (stat === "out_for_delivery" || data?.dispatchOtpVerified || data?.dispatchVerified) {
          unlockAudioContext();
          playSuccessChime();
          speakDispatchOtpVerified();
          toast.success("✓ Dispatch OTP verified by Partner! Navigating to customer.");
          setCurrentLeg("store_to_customer");
          setStage("in_trip");
          setIsInAppNavActive(true);
          setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          setTimeout(() => {
            launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName || "Customer");
          }, 600);
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
      ? stage === "in_trip" || stage === "arrived_store"
        ? storeCoords
        : customerCoords
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? storeCoords
        : customerCoords;

  const activeDestTitle =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip" || stage === "arrived_store"
        ? (partnerStoreName || "Partner Store")
        : (order.pickupTitle || order.customerName || "Customer Pickup")
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? (partnerStoreName || "Partner Store")
        : (order.customerName || "Customer Delivery");

  const activeDestAddress =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip" || stage === "arrived_store"
        ? (partnerStoreAddress || "Partner Store Kasganj")
        : (order.pickupAddress || "Customer Pickup Address")
      : stage === "ready_pickup_store" || (stage === "arrived_pickup" && isStorePickupForDelivery)
        ? (partnerStoreAddress || "Partner Store Kasganj")
        : (order.dropAddress || order.pickupAddress || "Customer Delivery Address");

  const activeDestPhone =
    currentLeg === "pickup_to_store"
      ? stage === "in_trip" || stage === "arrived_store"
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

      // If captain coords are coincident with destination (e.g. initial load or simulation), provide realistic road offset so both pins and route line are visible
      let startPoint = { ...captainCoords };
      const isCoincident =
        Math.abs(startPoint.lat - dest.lat) < 0.00015 &&
        Math.abs(startPoint.lng - dest.lng) < 0.00015;
      if (isCoincident) {
        startPoint = {
          lat: dest.lat - 0.0035,
          lng: dest.lng - 0.0028,
        };
      }

      // 1. Captain Scooter Marker with Signature Icon
      const captainMarker = new google.maps.Marker({
        map,
        position: { lat: startPoint.lat, lng: startPoint.lng },
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
      const routeData = await fetchStreetRoute(startPoint, dest, activeDestTitle);
      const points =
        routeData.coordinates.length >= 2
          ? routeData.coordinates
          : [
              [startPoint.lat, startPoint.lng],
              [(startPoint.lat + dest.lat) / 2 + 0.0005, (startPoint.lng + dest.lng) / 2 - 0.0004],
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

      // If captain coords are coincident with destination, provide realistic simulated road offset
      let startPoint = { ...captainCoords };
      const isCoincident =
        Math.abs(startPoint.lat - dest.lat) < 0.00015 &&
        Math.abs(startPoint.lng - dest.lng) < 0.00015;
      if (isCoincident) {
        startPoint = {
          lat: dest.lat - 0.0035,
          lng: dest.lng - 0.0028,
        };
      }

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

      leafletCaptainMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: captainIcon }).addTo(map);

      // 2. Destination Target Pin (High Contrast Pin with prominent Customer / Store Label)
      const pickupIcon = L.divIcon({
        className: "custom-pickup-icon",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="padding: 3px 10px; border-radius: 9999px; background-color: #0F172A; color: white; font-weight: 900; font-size: 11px; box-shadow: 0 2px 10px rgba(0,0,0,0.35); border: 1.5px solid #FACC15; white-space: nowrap; margin-bottom: 2px;">
              📍 ${isStoreDrop ? partnerStoreName : (order.customerName || "Customer Pickup")}
            </div>
            <div style="position: relative; display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 9999px; background-color: ${isStoreDrop ? "#059669" : "#E11D48"}; color: white; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); border: 3px solid white;">
              <div style="width: 12px; height: 12px; border-radius: 9999px; background-color: white;"></div>
            </div>
          </div>
        `,
        iconSize: [140, 60],
        iconAnchor: [70, 52],
      });

      leafletDestMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: pickupIcon }).addTo(map);

      // 3. Real Street-Following Route Polyline (Dual-Layer: Dark Casing + Solid Route)
      const routeData = await fetchStreetRoute(startPoint, dest, activeDestTitle);
      const points = routeData.coordinates.length >= 2 ? routeData.coordinates : [
        [startPoint.lat, startPoint.lng],
        [(startPoint.lat + dest.lat) / 2 + 0.0005, (startPoint.lng + dest.lng) / 2 - 0.0004],
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
        setShowPerfectPickupBanner(true);
      } else if (dedicatedOtpMode === "store_dispatch") {
        setShowDedicatedOtpScreen(false);
        setStage("in_trip");
        toast.success("Custody verified! Navigating to customer drop.");
        setShowPerfectPickupBanner(true);
      } else {
        await handleCompleteTrip(code);
        setShowDedicatedOtpScreen(false);
        setStage("completed");
        setShowOrderCompleteRatingScreen(true);
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
    setWaitingSeconds(180);
    setIsWaitingTimerActive(true);
    setArrivedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast.success("You have arrived at Pickup location! 📍 Customer notified.");

    // Direct transition to Full-Screen 4-Digit OTP Screen
    setDedicatedOtpMode("pickup");
    setDedicatedOtpDigits(["", "", "", ""]);
    setShowDedicatedOtpScreen(true);

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

  const handleStoreIntakeVerified = async () => {
    unlockAudioContext();
    triggerHaptic();
    playSuccessChime();
    const mins = order.processingEstimateMinutes || Math.round(processingTotalSecs / 60) || 120;
    speakStoreProcessingStarted(mins);
    setCurrentLeg("store_to_customer");
    setStage("store_processing");
    setIsInAppNavActive(false);
    toast.success(
      `🎉 Clothes Handed Over at Store! Pickup payout ₹${(order.pickupLegPayout || safeFare / 2 || 35).toFixed(2)} credited. Processing started!`
    );

    try {
      const cur = localStorage.getItem("qp_active_rider_order");
      if (cur) {
        const parsed = JSON.parse(cur);
        parsed.currentLeg = "store_to_customer";
        parsed.status = "at_partner";
        localStorage.setItem("qp_active_rider_order", JSON.stringify(parsed));
      }
    } catch {}

    if (order.orderId && !order.orderId.startsWith("TEST-")) {
      try {
        await confirmDropAtPartner(order.orderId, false);
      } catch (e) {
        console.warn("confirmDropAtPartner error:", e);
      }
    }
  };

  const handleMarkArrivedAtStore = () => {
    // Direct Handover at store without OTP barrier
    handleStoreIntakeVerified();
  };

  const handleReachedAtCustomer = () => {
    unlockAudioContext();
    triggerHaptic(30);
    playArrivalChime();
    const isAlreadyPaid = Boolean(
      order.isPaid ||
      (order as any).paymentStatus === "paid" ||
      order.paymentMode === "online" ||
      order.paymentMode === "upi" ||
      order.paymentMode === "razorpay" ||
      isPaymentConfirmed
    );
    if (!isAlreadyPaid) {
      setShowPaymentScreen(true);
    } else {
      setDedicatedOtpMode("delivery");
      setDedicatedOtpDigits(["", "", "", ""]);
      setShowDedicatedOtpScreen(true);
    }
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
        `🎉 Clothes Dropped at Store! Pickup payout ₹${(order.pickupLegPayout || safeFare / 2 || 35).toFixed(2)} credited. Turnaround timer active!`
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

      speakTripComplete(safeFare);
      setStage("completed");
      setIsInAppNavActive(false);
      setCompletedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success(`🎉 Delivery Completed! Collected ₹${safeFare.toFixed(2)} — Credited to Wallet`);

      try {
        localStorage.removeItem("qp_active_rider_order");
      } catch {}
    }
  };

  const handleStartCustomerDelivery = async () => {
    unlockAudioContext();
    triggerHaptic(40);
    playSuccessChime();
    speakText("डिस्पैच वेरिफाई हुआ। कस्टमर डिलीवरी के लिए नेविगेशन शुरू हो रहा है।");
    setCurrentLeg("store_to_customer");
    setStage("in_trip");
    setIsInAppNavActive(true);
    setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast.success("🛵 Package Collected! Heading to Customer Doorstep...");

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

    if (order.orderId && !order.orderId.startsWith("TEST-")) {
      try {
        await startDelivery(order.orderId, captainDispatchOtp || order.dispatchOtp);
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
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-slate-900 shadow-2xl overflow-hidden text-neutral-900 select-none">
      {/* 1. Top Navigation Bar (Back Button + Title + Help Button) - Notch Safe */}
      <header
        className="shrink-0 z-30 flex items-center justify-between px-3.5 pb-2.5 bg-white border-b border-slate-200/80 text-slate-950 shadow-2xs"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        {stage === "completed" ? (
          <div className="flex items-center justify-between w-full">
            <h1 className="text-base font-black tracking-tight text-slate-950">
              Order Complete
            </h1>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setShowUnableModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <Headphones className="size-3.5 text-slate-700" />
              <span>Help</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center size-9 text-slate-800 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shrink-0"
              aria-label="Back to Trips"
              title="Back to Trips"
            >
              <ArrowLeft className="size-5 stroke-[2.2]" />
            </button>

            {/* Screen Title & Live Pulse */}
            <div className="flex items-center gap-1.5 min-w-0 px-2 text-center">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-yellow-500" />
              </span>
              <h1 className="text-sm font-black tracking-tight truncate max-w-[200px] sm:max-w-xs text-slate-950">
                {stage === "en_route_pickup" && "Inside the Pickup Zone"}
                {stage === "arrived_pickup" && "Meet the Customer"}
                {stage === "in_trip" && (currentLeg === "pickup_to_store" ? "Go to Partner Store" : "Go to Customer Drop")}
                {stage === "arrived_store" && "Handover at Partner Store"}
                {stage === "store_processing" && "Store Laundry Processing"}
                {stage === "ready_pickup_store" && "Collect from Partner Store"}
                {stage === "handover_waiting" && "Handover in Progress"}
              </h1>
            </div>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setShowUnableModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <Headphones className="size-3.5 text-slate-700" />
              <span>Help</span>
            </button>
          </div>
        )}
      </header>

      {/* TRIP ROUTE BANNER (Clean White Style: Customer to Store) */}
      <div className="shrink-0 z-20 bg-white border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-2xs">
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
            ₹{safeFare.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 2. Locked Large Map Box Card */}
      {stage !== "store_processing" && (
        <div className="relative flex-1 w-full min-h-[350px] p-2.5 sm:p-3 overflow-hidden bg-slate-100 flex flex-col">
          <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 border-slate-300/80 shadow-md bg-white">
            <div ref={mapContainerRef} className="w-full h-full z-0" style={{ touchAction: "none" }} />

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

          {/* Floating Geofence Speech Bubble ("Pick up here" tooltip - Rapido Video Style) */}
          {stage === "en_route_pickup" && (
            <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-12 z-20 pointer-events-none animate-bounce duration-1000">
              <div className="relative flex flex-col items-center">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#16A34A] text-white font-black text-[11px] rounded-full shadow-lg border border-emerald-400">
                  <span className="size-1.5 rounded-full bg-white animate-ping" />
                  <span>Pick up here</span>
                  <span className="text-[10px] font-mono opacity-90">({distanceMeters}m)</span>
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#16A34A] -mt-0.5" />
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

          {/* Floating Yellow Action Button (Rapido Video Style: "▲ Go to pickup" / "▲ Go to drop") */}
          {(stage === "en_route_pickup" || stage === "in_trip") && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  if (stage === "in_trip") {
                    launchTurnByTurnGoogleMaps(storeCoords, captainCoords, partnerStoreName);
                  } else {
                    launchTurnByTurnGoogleMaps(activeDestCoords, captainCoords, activeDestTitle);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-full shadow-lg border border-yellow-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Navigation className="size-3.5 fill-slate-950 stroke-none" />
                <span>{stage === "en_route_pickup" ? "Go to pickup" : "Go to drop"}</span>
              </button>
            </div>
          )}

          {/* Floating Map Controls (Bottom Right GPS Recenter Button + SOS) */}
          <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(50);
                toast.error("🚨 Emergency SOS Beacon Dispatched to Safety Team");
              }}
              className="flex items-center justify-center size-9 bg-rose-600 text-white rounded-xl shadow-lg border border-rose-700 active:scale-90 transition-transform hover:bg-rose-700 cursor-pointer text-xs font-black"
              aria-label="SOS Emergency"
              title="Emergency SOS"
            >
              SOS
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className="flex items-center justify-center size-9 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-300 active:scale-90 transition-transform hover:bg-slate-50 cursor-pointer"
              aria-label="Recenter Map"
            >
              <Crosshair className="size-4.5 text-[#00C853]" />
            </button>
          </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Sheet Card (Locked at bottom, scrollable internally if needed) */}
      <div className={`relative z-20 bg-white ${stage === "store_processing" ? "flex-1 max-h-none overflow-y-auto p-4 space-y-4" : "border-t border-slate-200/90 shadow-2xl shrink-0 flex flex-col max-h-[46vh] overflow-y-auto"}`}>
        {/* Customer / Store Information Card */}
        {stage !== "store_processing" && (
          <div className="px-4 py-3 border-b border-zinc-100">
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
    )}

        {/* Bottom Action Controls depending on Stage */}
        <div className={`p-4 pt-2 space-y-2 ${stage === "store_processing" ? "p-0 pt-0" : ""}`}>
        {/* STAGE 1: Heading to Pickup */}
        {stage === "en_route_pickup" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {/* Action Buttons: Message customer button (Video Frame 00:23) */}
            <button
              type="button"
              onClick={() => setShowChatModal(true)}
              className="w-full h-11 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare className="size-4 text-slate-700" />
              <span>Message customer</span>
            </button>

            {/* Quick Google Maps Navigation Button */}
            <button
              type="button"
              onClick={() => launchTurnByTurnGoogleMaps(activeDestCoords, captainCoords, activeDestTitle)}
              className="w-full py-2.5 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
              <span>Navigate with Google Maps</span>
            </button>

            {/* Dark Navy Pill Swipe to Arrive with ArrowRight and only Arrived label */}
            <SwipeActionButton
              label="Arrived"
              color="darkNavy"
              onConfirm={() => {
                triggerHaptic(30);
                setShowArrivedConfirmModal(true);
              }}
            />
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
                {/* Rapido Yellow Theme: Soft Blue Wait Timer Banner (Video Frame 00:33) */}
                <div className="flex items-center justify-between p-3.5 bg-[#EBF3FF] border border-[#D0E2FF] rounded-2xl shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">Wait Timer</span>
                    <span className="text-xs font-black font-mono bg-[#FACC15] text-slate-950 px-2.5 py-0.5 rounded-md border border-yellow-500 shadow-2xs">
                      {formatTimer(waitingSeconds)}
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-blue-900 max-w-[190px] leading-tight text-right">
                    ⓘ After 3 minutes, you will get extra charge for waiting
                  </p>
                </div>

                {/* Doorstep Garment Intake & Security Bag Tag Card with Photo Proof */}
                <RiderDoorstepPickupCard
                  initialPiecesCount={initialDoorstepPieces}
                  doorstepPieces={doorstepPieces}
                  setDoorstepPieces={setDoorstepPieces}
                  bagTagCode={bagTagCode}
                  setBagTagCode={setBagTagCode}
                  doorstepNotes={doorstepNotes}
                  setDoorstepNotes={setDoorstepNotes}
                  bagPhotoUrl={bagPhotoUrl}
                  setBagPhotoUrl={setBagPhotoUrl}
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
                  <span>Enter OTP Manually</span>
                </button>

                {/* Solid Emerald Swipe to Start Ride (Video Frame 00:35) */}
                <SwipeActionButton
                  label="Start Ride"
                  hint="कस्टमर से OTP लेकर स्लाइड करें • Start Ride"
                  color="emerald"
                  onConfirm={() => {
                    setDedicatedOtpMode("pickup");
                    setDedicatedOtpDigits(["", "", "", ""]);
                    setShowDedicatedOtpScreen(true);
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* STAGE 3: In Trip -> Drop at Store (Leg 1) OR Complete Delivery (Leg 2) */}
        {stage === "in_trip" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Perfect Pick-up Celebration Banner (Video Frame 00:56) */}
            {showPerfectPickupBanner && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-600 shrink-0" />
                  <span>Perfect Pick-up! ✨ You started the ride at the right location.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPerfectPickupBanner(false)}
                  className="p-1 text-emerald-800 hover:text-emerald-950 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {currentLeg === "pickup_to_store" ? (
              <>
                {/* Destination Store Banner (Clean White Theme) */}
                <div className="p-3.5 bg-white border border-slate-200/90 rounded-3xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-2xl bg-amber-50 border border-amber-200 text-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <Package className="size-5 text-amber-600" />
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

                {/* Dark Navy Pill Swipe to Handover at Store */}
                <SwipeActionButton
                  label="Handover"
                  color="darkNavy"
                  onConfirm={() => {
                    triggerHaptic(30);
                    setShowHandoverConfirmModal(true);
                  }}
                />
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

                {/* Reached at Customer Action Button */}
                <SwipeActionButton
                  label="Reached at Customer"
                  color="darkNavy"
                  onConfirm={handleReachedAtCustomer}
                />
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

                {/* Reached at Customer Dark Navy Button */}
                <SwipeActionButton
                  label="Reached at Customer"
                  color="darkNavy"
                  onConfirm={handleReachedAtCustomer}
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

        {/* STAGE: Arrived at Store with Clothes for Handover */}
        {stage === "arrived_store" && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* 1. Partner Store Location Card */}
            <div className="p-3.5 bg-white rounded-3xl border border-slate-200/90 flex items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Partner Store Handover
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

            {/* 2. Direct Handover Summary Card (No OTP needed for drop-off) */}
            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Store Clothes Drop-Off
              </span>
              <h4 className="text-sm font-black text-slate-900">
                Hand over clothes bag to {partnerStoreName}
              </h4>
              <p className="text-[11px] text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
                Confirm handover with store staff. Wash processing will start automatically upon handover.
              </p>
            </div>

            {/* 3. Sealed Bag & Piece Cross-Check Summary */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <Package className="size-4.5 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-black text-emerald-950">
                    Sealed Bag: {bagTagCode || "QP-BAG"}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700">
                    {doorstepPieces} Garments Handed Over
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-800 bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                Verified ✓
              </span>
            </div>

            {/* 4. Action Button: Partner Accepted / Continue */}
            <button
              type="button"
              onClick={handleStoreIntakeVerified}
              className="w-full h-13 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="size-4.5 text-emerald-400" />
              <span>Partner Accepted • Start Wash Processing</span>
            </button>

            {/* Emergency Help */}
            <button
              type="button"
              onClick={() => setShowUnableModal(true)}
              className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              <AlertTriangle className="size-4 text-amber-600" />
              <span>Need Help / Store Issue</span>
            </button>
          </div>
        )}

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
                    Pickup Payout Credited: ₹{(order.pickupLegPayout || safeFare / 2 || 35).toFixed(2)}
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

        {/* STAGE: Ready for Store Pickup -> Captain at Store, Shows Dispatch OTP to Partner */}
        {stage === "ready_pickup_store" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
              {/* Header with status pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                    <Package className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950 tracking-tight leading-tight">
                      Clothes Ready • Store Dispatch
                    </h3>
                    <p className="text-[10.5px] font-medium text-slate-500">
                      Show Dispatch OTP to Store Partner
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-800">
                  DISPATCH OTP
                </span>
              </div>

              {/* 1. Big Prominent Golden Monospace Dispatch OTP Card */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-3xl border-2 border-yellow-500 shadow-lg text-center space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">
                    CAPTAIN DISPATCH OTP
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    Tell to Partner
                  </span>
                </div>

                {/* 4 Large Golden Digit Monospace Blocks */}
                <div className="flex items-center justify-center gap-2.5 pt-0.5">
                  {(captainDispatchOtp || order.dispatchOtp || "4821")
                    .slice(0, 4)
                    .split("")
                    .map((digit, idx) => (
                      <div
                        key={idx}
                        className="size-13 flex items-center justify-center text-3xl font-black font-mono text-[#FACC15] bg-slate-900 rounded-2xl border-2 border-yellow-400 shadow-inner"
                      >
                        {digit}
                      </div>
                    ))}
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      const code = (captainDispatchOtp || order.dispatchOtp || "4821").slice(0, 4);
                      navigator.clipboard.writeText(code);
                      toast.success(`Copied Dispatch OTP: ${code}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold border border-yellow-500/40 transition-all cursor-pointer"
                  >
                    <Copy className="size-3" />
                    <span>Copy Code</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 font-medium max-w-xs mx-auto leading-relaxed pt-1">
                  Partner will enter this 4-digit code in their Partner Console to release packed clothes and dispatch the order.
                </p>
              </div>

              {/* 2. Partner Store Collection Card */}
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

              {/* 3. 1-Tap Google Maps Navigation */}
              <button
                type="button"
                onClick={() => launchTurnByTurnGoogleMaps(storeCoords, captainCoords, partnerStoreName)}
                className="w-full h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs cursor-pointer"
              >
                <ExternalLink className="size-4 text-[#4285F4] shrink-0" />
                <span>Navigate to Store with Google Maps</span>
              </button>

              {/* 4. Action Button: Swipe to Start Delivery to Customer */}
              <SwipeActionButton
                label="Dispatch Done • Go to Customer"
                color="darkNavy"
                onConfirm={handleStartCustomerDelivery}
              />

              {/* Direct button */}
              <button
                type="button"
                onClick={handleStartCustomerDelivery}
                className="w-full h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border border-slate-300"
              >
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Dispatch Verified • Start Customer Delivery →</span>
              </button>

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

        {/* STAGE 4: Trip Completed (Rapido Yellow Theme - Screenshot WhatsApp Image 2026-10-30 at 11.06.20 (1).jpeg) */}
        {stage === "completed" && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            {/* Card 1: Estimated Earning with Blue Ink Stamp */}
            <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                  Estimated Earning
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 tracking-tight mt-0.5">
                  ₹{safeFare.toFixed(2)}
                </div>
                <p className="text-[11px] font-bold text-slate-600 mt-1">
                  100% Payout Received · No Commission
                </p>
              </div>

              {/* Blue Circular Ink Stamp (Rapido / QuickPress Guarantee Stamp) */}
              <div className="relative flex items-center justify-center size-24 rounded-full border-2 border-dashed border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF] p-2 rotate-[-8deg] shadow-xs shrink-0">
                <div className="flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="size-5 text-[#1E40AF]" />
                  <span className="text-[7.5px] font-black uppercase tracking-tight leading-tight">
                    0% Commission
                  </span>
                  <span className="text-[6.5px] font-bold">Lifetime Guarantee</span>
                </div>
              </div>
            </div>

            {/* Card 2: Rate your Customer */}
            <div className="p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3 text-center">
              <h3 className="text-sm font-black text-slate-950">
                Rate your Customer
              </h3>

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
                      className={`size-8 ${
                        star <= customerRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Reaction Badge */}
              <div className="inline-block px-3 py-1 bg-amber-50 text-amber-900 font-black text-xs rounded-full border border-amber-300">
                {ratingReaction}
              </div>

              {/* Quick Feedback Chips */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                {["⏰ Timely", "😊 Polite", "🤝 Friendly", "Other"].map((tag) => {
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
                          : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Full-Width Solid Bright Yellow Done Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(40);
                if (onTripCompleted) {
                  onTripCompleted();
                } else {
                  navigate({ to: "/orders" });
                }
              }}
              className="w-full h-13 rounded-full bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer border border-yellow-500"
            >
              <span>Done</span>
              <Check className="size-5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
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

      {/* 0. Arrived Confirmation Modal (Rapido Yellow Theme Video Frame 00:29) */}
      {showArrivedConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in slide-in-from-bottom-6 duration-300">
            <div className="size-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto text-blue-600 shadow-inner">
              <MapPin className="size-7 fill-blue-600 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Confirmation</h3>
              <p className="text-xs text-slate-600 font-medium">
                Have you arrived at the customer's location?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowArrivedConfirmModal(false)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowArrivedConfirmModal(false);
                  handleMarkArrived();
                }}
                className="w-full h-11 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md border border-yellow-500"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover at Store Confirmation Modal */}
      {showHandoverConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in slide-in-from-bottom-6 duration-300">
            <div className="size-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
              <Package className="size-7 text-amber-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Store Handover Confirmation</h3>
              <p className="text-xs text-slate-600 font-medium">
                Have you arrived at {partnerStoreName} to handover clothes?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowHandoverConfirmModal(false)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHandoverConfirmModal(false);
                  handleStoreIntakeVerified();
                }}
                className="w-full h-11 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md border border-yellow-500"
              >
                Yes, Handover
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 2. Dedicated 4-Digit OTP Screen (Video Frame 00:54 - 00:55, Screenshot WhatsApp Image 2026-10-30 at 11.06.19.jpeg) */}
      {showDedicatedOtpScreen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in fade-in duration-200">
          {/* Top Bar matching video: Left "← Start Ride", Right Black circle with Yellow phone */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowDedicatedOtpScreen(false)}
              className="flex items-center gap-2 text-slate-900 font-black text-sm active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="size-5 stroke-[2.5]" />
              <span>{dedicatedOtpMode === "pickup" ? "Start Ride" : "Complete Ride"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              className="flex items-center justify-center size-9 rounded-full bg-black text-[#FACC15] hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer shadow-xs"
              aria-label="Call Customer"
              title="Call Customer"
            >
              <Phone className="size-4 fill-[#FACC15] text-[#FACC15]" />
            </button>
          </div>

          {/* Loading Overlay: Updating Status... (Frame 00:55) */}
          {isOtpUpdatingStatus ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
              <div className="relative">
                <div className="size-16 rounded-full border-4 border-amber-200 border-t-[#FACC15] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <KeyRound className="size-6 text-yellow-600" />
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
            <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto">
              <div className="space-y-5 pt-2">
                {/* 1. Black Order ID Bar (Screenshot Reference) */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-black text-white rounded-xl text-xs font-mono font-bold shadow-xs">
                  <span>Order ID: {order.orderCode || (order.orderId ? order.orderId.slice(-6).toUpperCase() : "LIVE")}</span>
                  <span className="text-[#FACC15] font-black">₹{safeFare.toFixed(2)}</span>
                </div>

                {/* 2. Customer Pill (Screenshot Reference: [Auto] 👤 Customer Name) */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-xs">
                    <span className="text-[#FACC15] font-black">[Auto]</span>
                    <User className="size-3.5 text-white" />
                    <span>{order.customerName || "Customer"}</span>
                  </div>
                </div>

                {/* 3. Heading & Subtitle */}
                <div className="space-y-1 text-center pt-2">
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight">Enter OTP</h2>
                  <p className="text-xs font-bold text-slate-500">
                    {dedicatedOtpMode === "pickup"
                      ? "Please ask customer for OTP"
                      : "Please ask customer for Delivery OTP"}
                  </p>
                </div>

                {/* 4. 4 Large Square Digit Input Boxes */}
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
                      className="w-14 h-16 text-center font-black text-2xl font-mono bg-[#F8F9FA] rounded-2xl border-2 border-slate-300 focus:border-[#FACC15] focus:bg-white focus:outline-none shadow-xs transition-all"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {/* 5. Instruction text */}
                <p className="text-center text-[11px] text-slate-500 font-medium max-w-xs mx-auto leading-relaxed pt-2">
                  Ask the customer for the 4 digit OTP shown on their screen to start the ride
                </p>
              </div>

              {/* Bottom Confirm Button (Solid Yellow Rapido Style) */}
              <div className="pt-6 pb-4">
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
                  className="w-full h-13 rounded-full bg-[#FACC15] hover:bg-yellow-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer border border-yellow-500"
                >
                  <span>Submit OTP</span>
                  <ArrowRight className="size-4 text-slate-950 stroke-[2.5]" />
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
            <div className="size-14 rounded-full bg-[#FACC15]/20 border-2 border-yellow-400 flex items-center justify-center mx-auto text-slate-900 shadow-inner">
              <Navigation className="size-7 fill-slate-900 stroke-none" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Use QuickPress Maps?</h3>
              <p className="text-xs text-slate-600 font-medium">
                Get accurate turn-by-turn navigation and Hindi/English voice guidance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuickPressMapsModal(false);
                  launchTurnByTurnGoogleMaps(activeDestCoords, captainCoords, activeDestTitle);
                }}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                No, thanks
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuickPressMapsModal(false);
                  handleStartInAppNavigation();
                }}
                className="w-full h-11 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md border border-yellow-500"
              >
                Go To Maps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Ride Confirmation Modal (Video Frame 01:15) */}
      {showCompleteRideConfirmation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 animate-in slide-in-from-bottom-6 duration-300">
            <div className="size-14 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-inner">
              <CheckCircle2 className="size-7 text-rose-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Confirmation</h3>
              <p className="text-xs text-slate-600 font-medium">
                Are you sure you want to complete the trip?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteRideConfirmation(false)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompleteRideConfirmation(false);
                  if (currentLeg === "pickup_to_store") {
                    handleCompleteTrip();
                  } else {
                    setDedicatedOtpMode("delivery");
                    setDedicatedOtpDigits(["", "", "", ""]);
                    setShowDedicatedOtpScreen(true);
                  }
                }}
                className="w-full h-11 bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md border border-yellow-500"
              >
                Yes
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
                  ₹ {safeFare.toFixed(1)}
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
                        `upi://pay?pa=quickpress@icici&pn=QuickPress&am=${safeFare.toFixed(2)}&cu=INR&tn=Order-${order.orderId}`
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

            {/* Bottom Proceed Button to Delivery OTP Screen */}
            <div className="pt-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentConfirmed(true);
                  setShowPaymentScreen(false);
                  setDedicatedOtpMode("delivery");
                  setDedicatedOtpDigits(["", "", "", ""]);
                  setShowDedicatedOtpScreen(true);
                }}
                className="w-full h-13 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Proceed to Delivery OTP</span>
                <ArrowRight className="size-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Order Complete Rating Screen (Video Frame 01:19 - 01:32, Screenshots 11.06.20 (1) & (2)) */}
      {showOrderCompleteRatingScreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in fade-in duration-200">
          {/* Top Bar: Left "Order Complete", Right "[🎧 Help]" button */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-2xs">
            <h2 className="text-base font-black text-slate-950">Order Complete</h2>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setShowUnableModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <Headphones className="size-3.5 text-slate-700" />
              <span>Help</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto space-y-4">
            <div className="space-y-4 pt-2">
              {/* Card 1: Estimated Earning with Blue Ink Stamp */}
              <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                    Estimated Earning
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 tracking-tight mt-0.5">
                    ₹{safeFare.toFixed(2)}
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">
                    100% Payout Received · No Commission
                  </p>
                </div>

                {/* Blue Circular Ink Stamp (Rapido / QuickPress Guarantee Stamp) */}
                <div className="relative flex items-center justify-center size-24 rounded-full border-2 border-dashed border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF] p-2 rotate-[-8deg] shadow-xs shrink-0">
                  <div className="flex flex-col items-center justify-center text-center">
                    <ShieldCheck className="size-5 text-[#1E40AF]" />
                    <span className="text-[7.5px] font-black uppercase tracking-tight leading-tight">
                      0% Commission
                    </span>
                    <span className="text-[6.5px] font-bold">Lifetime Guarantee</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Rate your Customer */}
              <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
                <h3 className="text-sm font-black text-slate-950">
                  Rate your Customer
                </h3>

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
                        className={`size-8.5 ${
                          star <= customerRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Reaction Badge */}
                <div className="inline-block px-3 py-1 bg-amber-50 text-amber-900 font-black text-xs rounded-full border border-amber-300">
                  {ratingReaction}
                </div>

                {/* Quick Feedback Chips */}
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {["⏰ Timely", "😊 Polite", "🤝 Friendly", "Other"].map((tag) => {
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
                            : "bg-slate-50 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Solid Bright Yellow Done Button */}
            <div className="pt-4 pb-2">
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
                className="w-full h-13 rounded-full bg-[#FACC15] hover:bg-yellow-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer border border-yellow-500"
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


