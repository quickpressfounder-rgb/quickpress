import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  DollarSign,
  ExternalLink,
  Info,
  KeyRound,
  Layers,
  Locate,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  Package,
  Phone,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { initRiderSocket, subscribeRiderOrders, emitRiderLocation } from "../../lib/rider-socket";
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
import { RiderUnableToDeliverModal } from "../orders/RiderUnableToDeliverModal";
import { RiderHandoverWaitingCard } from "../orders/RiderHandoverWaitingCard";
import { CaptainReviewModal } from "./CaptainReviewModal";
import { pushRiderLocation } from "../../api/rider/rider-dashboard-api";

import {
  verifyHandoverOtp,
  fetchDispatchOtp,
  confirmArrivalAtPickup,
  confirmPickup,
  confirmDelivery,
  confirmDropAtPartner,
  startDelivery,
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
  partnerName?: string;
  partnerAddress?: string;
  partnerPhone?: string;
  custody?: string;
  paymentMode?: string;
  amount?: number;
  placedAt?: string;
  items?: any[];
  processingEstimateMinutes?: number;
  estimatedReadyAt?: string;
  processingStartedAt?: string;
}

interface GoToPickupHUDProps {
  order: ActiveOrderData;
  onOpenDrawer?: () => void;
  onTripCompleted?: () => void;
  onCancelTrip?: () => void;
}

type TripStage = "en_route_pickup" | "arrived_pickup" | "in_trip" | "store_processing" | "ready_pickup_store" | "handover_waiting" | "completed";

export const GoToPickupHUD: React.FC<GoToPickupHUDProps> = ({
  order,
  onOpenDrawer,
  onTripCompleted,
  onCancelTrip,
}) => {
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
  const [showUnableModal, setShowUnableModal] = useState(false);
  const [isVerifyingHandover, setIsVerifyingHandover] = useState(false);
  const [handoverVerifyOtpDigits, setHandoverVerifyOtpDigits] = useState<string[]>(["", "", "", ""]);
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
  const [acceptedTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const [arrivedTime, setArrivedTime] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [completedTime, setCompletedTime] = useState<string | null>(null);
  const [showVoiceNavModal, setShowVoiceNavModal] = useState(false);
  const [captainBearing, setCaptainBearing] = useState<number>(0);
  const [nextTurnManeuver, setNextTurnManeuver] = useState<ManeuverType>("straight");
  const [nextTurnDistanceM, setNextTurnDistanceM] = useState<number>(order.distanceMeters || 250);
  const [nextTurnInstruction, setNextTurnInstruction] = useState<string>("");
  const prevCaptainPosRef = useRef<{ lat: number; lng: number } | null>(null);

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

  // Load dispatch OTP for Rider 2
  useEffect(() => {
    if (order.orderId) {
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

  // Fallback heartbeat poll while at partner store for partner verification
  useEffect(() => {
    if (stage !== "arrived_pickup" || (!isHandoverRide && !isStorePickupForDelivery)) return;
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
    if (stage !== "store_processing" || !order.orderId) return;
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
      }
    };
    try {
      const socket = initRiderSocket();
      socket?.on("order.processing", handleOrderEvent);
      socket?.on("order.ready", handleOrderEvent);
      socket?.on("order.status_changed", handleOrderEvent);
      socket?.on("order.out_for_delivery", handleOrderEvent);
      socket?.on("order.dispatch_verified", handleOrderEvent);
      return () => {
        socket?.off("order.processing", handleOrderEvent);
        socket?.off("order.ready", handleOrderEvent);
        socket?.off("order.status_changed", handleOrderEvent);
        socket?.off("order.out_for_delivery", handleOrderEvent);
        socket?.off("order.dispatch_verified", handleOrderEvent);
      };
    } catch {}
  }, [order.orderId, stage]);


  const handleVerifyHandoverTransfer = async () => {
    const code = handoverVerifyOtpDigits.join("");
    if (code.length < 4) {
      toast.error("Please enter the complete 4-digit Handover OTP from Captain");
      return;
    }
    try {
      setIsVerifyingHandover(true);
      triggerHaptic();
      const res = await verifyHandoverOtp(order.orderId, code);
      if (res && res.ok) {
        unlockAudioContext();
        playSuccessChime();
        speakText("हैंडओवर सत्यापित। अब ग्राहक को ऑर्डर डिलीवर करें।");
        toast.success("Handover verified! Custody transferred to you.");
        setStage("in_trip");
        setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else {
        toast.error(res?.message || "Invalid Handover OTP. Please verify with Captain.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify Handover OTP. Please try again.");
    } finally {
      setIsVerifyingHandover(false);
    }
  };

  // Live Device GPS Coordinates for Captain
  const [captainCoords, setCaptainCoords] = useState<{ lat: number; lng: number }>(() => {
    return (
      order.customerCoords ||
      order.partnerCoords ||
      order.pickupCoords ||
      { lat: 27.8118, lng: 78.6477 }
    );
  });

  // Track Captain's real-time device GPS coordinates and sync with backend
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    let isMounted = true;
    const handlePos = (pos: GeolocationPosition) => {
      if (!isMounted) return;
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const isMock = Boolean(
        (pos.coords as any).isMock ||
        (pos as any).isMock ||
        (pos.coords as any).isFromMockProvider ||
        (pos.coords as any).mocked
      );
      pushRiderLocation(next.lat, next.lng, {
        isMock,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
        accuracy: pos.coords.accuracy ?? undefined,
      }).catch(() => {});
      emitRiderLocation({
        lat: next.lat,
        lng: next.lng,
        orderId: order.orderId,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
      });
    };

    const handleErr = (err: any) => {
      console.warn("GPS tracking note:", err?.message || err);
    };

    navigator.geolocation.getCurrentPosition(handlePos, handleErr, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(handlePos, handleErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    });

    return () => {
      isMounted = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const customerCoords = order.customerCoords || order.pickupCoords || { lat: 27.8095, lng: 78.6490 };
  const storeCoords = order.partnerCoords || (order.rideType === "pickup" ? (order.dropCoords || { lat: 27.8118, lng: 78.6477 }) : (order.pickupCoords || { lat: 27.8118, lng: 78.6477 }));

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

  // Initialize Google Maps JavaScript API (with Leaflet fallback)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      // 1. Primary: Official Google Maps JavaScript API
      if (isGoogleMapsConfigured()) {
        try {
          const isGoogleReady = await loadGoogleMaps();
          const google = (window as any).google;

          if (isMounted && isGoogleReady && google?.maps?.Map && mapContainerRef.current) {
            const center = pickupCoords;
            const gMap = new google.maps.Map(mapContainerRef.current, {
              center: { lat: center.lat, lng: center.lng },
              zoom: 16,
              disableDefaultUI: true,
              gestureHandling: "greedy",
              clickableIcons: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: false,
            });

            try {
              const trafficLayer = new google.maps.TrafficLayer();
              trafficLayer.setMap(gMap);
            } catch {}

            googleMapInstanceRef.current = gMap;
            mapEngineRef.current = "google";

            setTimeout(() => {
              if (isMounted && gMap && google?.maps?.event) {
                google.maps.event.trigger(gMap, "resize");
              }
            }, 150);
            setTimeout(() => {
              if (isMounted && gMap && google?.maps?.event) {
                google.maps.event.trigger(gMap, "resize");
              }
            }, 500);

            if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
              const ro = new ResizeObserver(() => {
                if (isMounted && gMap && google?.maps?.event) {
                  google.maps.event.trigger(gMap, "resize");
                }
              });
              ro.observe(mapContainerRef.current);
            }

            await updateGoogleMapLayers(google, gMap, stage, currentLeg);
            return;
          }
        } catch (err) {
          console.warn("Google Maps SDK failed, falling back to Leaflet:", err);
        }
      }

      // 2. Secondary Fallback: Leaflet with Google Maps Tiles
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

        const center = pickupCoords;
        const map = L.map(mapContainerRef.current, {
          center: [center.lat, center.lng],
          zoom: 16,
          zoomControl: false,
          attributionControl: false,
        });

        // Google Maps High-Resolution Roadmap Tiles
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

        // Render markers & street route initially
        updateMapLayers(L, map, stage, currentLeg);
      } catch (err) {
        console.warn("Leaflet map initialization notice:", err);
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
              <text x="23" y="28" font-size="16" text-anchor="middle" fill="#FFFFFF">🛵</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(46, 46),
          anchor: new google.maps.Point(23, 23),
        },
      });
      googleOverlaysRef.current.push(captainMarker);

      // 2. Destination Pin
      const destPinColor = isStoreDrop ? "#059669" : "#E11D48";
      const destPinEmoji = isStoreDrop ? "🧺" : "📍";
      const destMarker = new google.maps.Marker({
        map,
        position: { lat: dest.lat, lng: dest.lng },
        title: isStoreDrop ? partnerStoreName : (order.customerName || "Customer"),
        zIndex: 900,
        icon: {
          url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="17" fill="${destPinColor}" stroke="#FFFFFF" stroke-width="2.5" />
              <text x="21" y="26" font-size="16" text-anchor="middle" fill="#FFFFFF">${destPinEmoji}</text>
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

  // Track bearing whenever captain GPS updates
  useEffect(() => {
    if (prevCaptainPosRef.current && captainCoords) {
      const b = calculateBearing(
        prevCaptainPosRef.current.lat,
        prevCaptainPosRef.current.lng,
        captainCoords.lat,
        captainCoords.lng
      );
      if (b !== 0) setCaptainBearing(b);
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
            <div style="position: relative; display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #0F172A; color: white; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); border: 2.5px solid white; transform: rotate(${captainBearing}deg); transition: transform 0.3s ease;">
              <div style="position: absolute; top: -3px; width: 8px; height: 8px; background-color: #00C853; transform: rotate(45deg); border: 1px solid white;"></div>
              <span style="font-size: 15px;">🛵</span>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      L.marker([captainCoords.lat, captainCoords.lng], { icon: captainIcon }).addTo(map);

      // 2. Destination Target Pin (High Contrast Pin)
      const pickupIcon = L.divIcon({
        className: "custom-pickup-icon",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="padding: 2px 8px; border-radius: 6px; background-color: #0F172A; color: white; font-weight: 900; font-size: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.3); white-space: nowrap; margin-bottom: 2px;">
              ${isStoreDrop ? "🧺 " + partnerStoreName : "👤 " + (order.customerName || "Customer")}
            </div>
            <div style="position: relative; display: flex; width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: 9999px; background-color: ${isStoreDrop ? "#059669" : "#E11D48"}; color: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border: 2px solid white; font-size: 15px;">
              ${isStoreDrop ? "🧺" : "📍"}
            </div>
          </div>
        `,
        iconSize: [120, 56],
        iconAnchor: [60, 50],
      });

      L.marker([dest.lat, dest.lng], { icon: pickupIcon }).addTo(map);

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
      L.polyline(points, {
        color: "#0F172A",
        weight: 9,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // 3b. Route Path (Vibrant Rapido Green / Electric Delivery Blue)
      L.polyline(points, {
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

  // Trigger layer update on stage, currentLeg, or GPS coordinate change
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
  }, [stage, currentLeg, captainCoords.lat, captainCoords.lng]);

  // Recenter GPS on Captain Location
  const handleRecenter = () => {
    if (mapEngineRef.current === "google" && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.panTo({ lat: captainCoords.lat, lng: captainCoords.lng });
      googleMapInstanceRef.current.setZoom(17);
      toast.info("Google Map centered on your location 📍");
      return;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([captainCoords.lat, captainCoords.lng], 16);
      toast.info("Map centered on your location 📍");
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
    launchTurnByTurnGoogleMaps(dest, captainCoords, activeDestTitle);
  };

  // In-App GPS Navigation Mode (No External Google Maps Redirect)
  const handleStartInAppNavigation = () => {
    unlockAudioContext();
    triggerHaptic();
    setIsInAppNavActive(true);
    setShowVoiceNavModal(true);
    const text = `नेविगेशन शुरू हुआ। ${activeDestTitle} की तरफ चलें।`;
    speakText(text);
    toast.info(`📍 In-App GPS Navigation active to ${activeDestTitle}`);
  };

  // Action Handlers
  const handleMarkArrived = () => {
    unlockAudioContext();
    triggerHaptic();
    playArrivalChime();
    speakPickupOtpPrompt();
    setStage("arrived_pickup");
    setIsWaitingTimerActive(true);
    setArrivedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast.success("You have arrived at Pickup location! 📍 Customer notified.");

    // Real backend notification
    if (order.orderId) {
      confirmArrivalAtPickup(order.orderId).catch(() => {});
    }
  };

  const handleStartTrip = async () => {
    const enteredOtp = otpDigits.join("").trim();
    const otpToVerify = enteredOtp || order.startOtp;

    if (!otpToVerify || otpToVerify.length < 4) {
      toast.error("Please enter the 4-digit pickup code told by customer");
      return;
    }

    // Call Real Backend verification first
    if (order.orderId) {
      try {
        await confirmPickup(order.orderId, otpToVerify);
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

  const handleCompleteTrip = async () => {
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

      if (order.orderId) {
        try {
          await confirmDropAtPartner(order.orderId, false);
        } catch (e) {
          console.warn("confirmDropAtPartner error:", e);
        }
      }
    } else {
      // --- LEG 2 COMPLETE: Customer Doorstep Delivery ---
      const enteredOtp = (customerDeliveryOtpDigits.join("") || otpDigits.join("")).trim();
      const otpToVerify = enteredOtp || order.deliveryOtp;
      if (!otpToVerify || otpToVerify.length < 4) {
        toast.error("Please enter the 4-digit delivery code from the customer");
        return;
      }

      if (order.orderId) {
        try {
          await confirmDelivery(order.orderId, enteredOtp);
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

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-white shadow-2xl overflow-hidden text-neutral-900 select-none">
      {/* 1. Top Navigation Bar (Exact Match: ☰ Go to Pickup Zone 📞) */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 pb-3 bg-white border-b border-neutral-100 shadow-xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        {/* Hamburger Menu Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center justify-center w-10 h-10 -ml-1 text-neutral-900 rounded-full hover:bg-neutral-100 active:scale-95 transition-transform"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="w-6 h-6 stroke-[2.4]" />
        </button>

        {/* Screen Title */}
        <h1 className={`text-base font-black tracking-tight ${isDeliveryRide ? "text-blue-950" : "text-neutral-950"}`}>
          {stage === "en_route_pickup" && (isDeliveryRide ? "📦 Go to Partner Store (Pick up)" : isHandoverRide ? "Go to Handover Point" : "Go to Pickup Zone")}
          {stage === "arrived_pickup" && (isDeliveryRide ? "📦 At Partner Store" : isHandoverRide ? "At Handover Point" : "At Pickup Location")}
          {stage === "in_trip" && (isDeliveryRide ? "📦 En Route to Customer Delivery" : order.rideType === "pickup" ? "Heading to Partner Store" : "Heading to Drop Zone")}
          {stage === "store_processing" && "🧺 Washing & Ironing in Progress"}
          {stage === "ready_pickup_store" && "📦 Collect from Store & Deliver"}
          {stage === "handover_waiting" && "Order Handover in Progress"}
          {stage === "completed" && (isDeliveryRide ? "🎉 Delivery Completed" : "Trip Completed")}
        </h1>

        {/* Support / Call Customer Button (Black circle with Yellow telephone icon) */}
        <button
          type="button"
          onClick={() => setShowCallModal(true)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-950 text-[#FBBF24] hover:bg-neutral-800 shadow-sm active:scale-95 transition-all"
          aria-label="Call Customer"
        >
          <Phone className="w-5 h-5 fill-[#FBBF24] stroke-none" />
        </button>
      </header>

      {/* DELIVERY BLUE THEME BANNER */}
      {isDeliveryRide && (
        <div className="z-25 bg-blue-600 text-white px-4 py-1.5 flex items-center justify-between text-xs font-black shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            <span>DELIVERY ORDER (स्टोर से ग्राहक तक डिलीवरी)</span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
            BLUE
          </span>
        </div>
      )}

      {/* 1.1 ORDER TIMELINE STEP PROGRESS BAR */}
      <div className="z-25 bg-neutral-50 px-3.5 py-2 border-b border-neutral-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <button
            type="button"
            onClick={() => setShowTimelineModal(true)}
            className="flex items-center gap-1.5 text-xs font-black text-neutral-900 hover:text-[#00C853] transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-[#00C853]" />
            <span>Order Timeline</span>
            <span className="text-[10px] text-[#00C853] font-bold bg-[#00C853]/10 px-1.5 py-0.2 rounded-full">
              View
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>
          <span className="text-[10px] font-bold text-neutral-500 bg-white px-2 py-0.5 rounded-full border border-neutral-200">
            Trip #{order.orderCode || (order.orderId ? order.orderId.slice(-6).toUpperCase() : "LIVE")} · ₹{order.fare.toFixed(2)}
          </span>
        </div>

        {/* 4 Step Progress Line */}
        <div className="grid grid-cols-4 gap-1 items-center pt-0.5">
          {/* Step 1: Accepted */}
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-[#00C853] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3 h-3 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-[#00C853] truncate">Accept</span>
          </div>

          {/* Step 2: Pickup */}
          <div className="flex items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${
                stage === "en_route_pickup"
                  ? "bg-blue-600 text-white ring-2 ring-blue-200 animate-pulse"
                  : "bg-[#00C853] text-white"
              }`}
            >
              {stage === "en_route_pickup" ? "2" : "✓"}
            </div>
            <span
              className={`text-[10px] font-black truncate ${
                stage === "en_route_pickup" ? "text-blue-600" : "text-[#00C853]"
              }`}
            >
              Pickup
            </span>
          </div>

          {/* Step 3: In-Trip */}
          <div className="flex items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${
                stage === "in_trip"
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-200 animate-pulse"
                  : stage === "completed"
                  ? "bg-[#00C853] text-white"
                  : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {stage === "completed" ? "✓" : "3"}
            </div>
            <span
              className={`text-[10px] font-black truncate ${
                stage === "in_trip" ? "text-emerald-700" : stage === "completed" ? "text-[#00C853]" : "text-neutral-400"
              }`}
            >
              In-Trip
            </span>
          </div>

          {/* Step 4: Drop */}
          <div className="flex items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${
                stage === "completed"
                  ? "bg-[#00C853] text-white"
                  : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {stage === "completed" ? "✓" : "4"}
            </div>
            <span
              className={`text-[10px] font-black truncate ${
                stage === "completed" ? "text-[#00C853]" : "text-neutral-400"
              }`}
            >
              Drop
            </span>
          </div>
        </div>
      </div>

      {/* 2. Map Box Card (Rapido Navigation Box Container) */}
      <div className="relative flex-1 w-full px-3 py-2 flex flex-col min-h-[300px] overflow-hidden bg-neutral-100/90">
        <div className="relative flex-1 w-full rounded-3xl overflow-hidden border-2 border-neutral-300 shadow-md bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Rapido Top Floating Turn-by-Turn Maneuver Pill (In-App Live Navigation HUD) */}
          {(stage === "en_route_pickup" || stage === "in_trip") && (
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 pointer-events-auto">
              <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white shadow-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
                    {nextTurnManeuver === "turn-right" || nextTurnManeuver === "slight-right" ? (
                      <CornerUpRight className="w-5 h-5 text-[#00C853] stroke-[2.5]" />
                    ) : nextTurnManeuver === "turn-left" || nextTurnManeuver === "slight-left" ? (
                      <CornerUpLeft className="w-5 h-5 text-[#00C853] stroke-[2.5]" />
                    ) : (
                      <Navigation className="w-5 h-5 text-[#00C853] -rotate-45 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black font-mono text-white">
                        {nextTurnDistanceM > 1000 ? `${(nextTurnDistanceM / 1000).toFixed(1)} km` : `${nextTurnDistanceM} m`}
                      </span>
                      <span className="text-[9px] font-black text-[#00C853] uppercase tracking-wider">
                        {stage === "en_route_pickup" ? "To Pickup" : "In-Trip"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 truncate">
                      {nextTurnInstruction || `Proceed towards ${activeDestTitle}`}
                    </p>
                  </div>
                </div>

                {/* Start In-App Turn-by-Turn GPS Button */}
                <button
                  type="button"
                  onClick={handleStartInAppNavigation}
                  className="px-3 py-1.5 rounded-xl bg-[#00C853] hover:bg-[#00B248] text-white font-black text-xs shadow-lg flex items-center gap-1 active:scale-95 transition-all shrink-0 border border-emerald-400 cursor-pointer"
                  title="Open In-App Voice Turn-by-Turn Navigation"
                >
                  <Navigation className="w-3 h-3 fill-white stroke-none" />
                  <span>Navigate</span>
                </button>
              </div>
            </div>
          )}

          {/* Floating Distance Pill (Over destination pin) */}
          {stage === "en_route_pickup" && (
            <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-12 z-20 pointer-events-none animate-bounce duration-1000">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/95 text-white font-black text-[11px] rounded-full shadow-2xl border border-emerald-400">
                <span className="w-2 h-2 rounded-full bg-[#00C853] animate-ping" />
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

          {/* Floating Map Controls (Bottom Right GPS Recenter, Voice Navigation & Google Maps Button) */}
          <div className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleOpenExternalGoogleMaps}
              className="flex items-center gap-1 px-2.5 py-2 bg-white/95 backdrop-blur-md text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-lg border border-slate-300 active:scale-95 transition-all cursor-pointer"
              title="Open Directions in Google Maps App"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#4285F4]" />
              <span className="hidden sm:inline">Open in</span>
              <span>Google Maps</span>
            </button>
            <button
              type="button"
              onClick={handleStartInAppNavigation}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#00C853] hover:bg-[#00B248] text-white font-black text-xs rounded-xl shadow-xl border border-emerald-300 active:scale-95 transition-all cursor-pointer"
              title="In-App Voice Turn-by-Turn GPS"
            >
              <Navigation className="w-3.5 h-3.5 fill-white stroke-none" />
              <span>Voice GPS</span>
            </button>
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

      {/* 3. Status Pill Banner: ✔ Customer Verified Location + ⏱️ Order Timeline Trigger */}
      <div className="z-20 flex items-center justify-between py-2 px-4 bg-white border-t border-zinc-200 text-xs font-black text-zinc-950">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#00C853] shrink-0" />
          <span className="text-zinc-950 font-black">Customer Verified Location</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTimelineModal(true)}
          className="flex items-center gap-1 text-[11px] font-black text-[#00873D] hover:text-[#00B248] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 active:scale-95 transition-all"
        >
          <Clock className="w-3 h-3 text-[#00873D]" />
          <span>Timeline</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* 4. Customer Information Card (Dark High-Contrast Text for Sunlight Readability) */}
      <div className="relative z-20 bg-white px-4 pt-3.5 pb-3.5 border-t border-zinc-200 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          {/* Green Location Pin & Customer Details */}
          <div className="flex items-start gap-2.5 flex-1 pr-12">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-[#00C853] shrink-0 mt-0.5 border border-emerald-300">
              <MapPin className="w-5 h-5 fill-[#00C853] text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-zinc-950 leading-tight">
                  {stage === "in_trip" && currentLeg === "pickup_to_store"
                    ? partnerStoreName
                    : (order.customerName || "Customer")}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(true)}
                  className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md hover:bg-blue-200"
                >
                  ⏱️ Timeline
                </button>
              </div>
              <p className="text-xs font-bold text-zinc-800 leading-snug mt-1 line-clamp-2">
                {activeDestAddress}
              </p>
            </div>
          </div>

          {/* Floating Royal Blue Chat Button 💬 */}
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="absolute right-4 top-3.5 flex items-center justify-center w-12 h-12 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl active:scale-95 transition-all border border-blue-400"
            aria-label="Open Chat with Customer"
          >
            <MessageSquare className="w-6 h-6 fill-white" />
          </button>
        </div>
      </div>

      {/* 5. Bottom Action Controls depending on Stage */}
      <div className="relative z-20 bg-white p-4 pt-2 border-t border-neutral-100 space-y-2">
        {/* STAGE 1: Royal Blue [ → ARRIVED ] Button (Exact Match to Screenshot) */}
        {stage === "en_route_pickup" && (
          <button
            type="button"
            onClick={handleMarkArrived}
            className="w-full h-13.5 flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-black text-base tracking-wider rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all overflow-hidden"
          >
            {/* Left Arrow Icon Box */}
            <div className="flex items-center justify-center w-14 h-full bg-blue-600/60 border-r border-blue-400/30">
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </div>
            {/* Center Label */}
            <div className="flex-1 text-center pr-14">
              <span>ARRIVED</span>
            </div>
          </button>
        )}

        {/* STAGE 2: Arrived at Pickup / Handover Point */}
        {stage === "arrived_pickup" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {isStorePickupForDelivery || isHandoverRide ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wide block">
                        Partner Store Dispatch OTP
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        Tell this 4-digit code to Partner (पार्टनर को यह 4-अंकीय कोड बताएं)
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    Handshake Code
                  </span>
                </div>

                <p className="text-xs text-emerald-900 font-medium">
                  You have arrived at <b>{partnerStoreName}</b>. Tell this 4-digit code to the Partner to collect the clean laundry package:
                </p>

                {/* Big 4-digit OTP cards */}
                <div className="flex justify-center gap-3 py-2">
                  {(captainDispatchOtp || "----").padEnd(4, "-").slice(0, 4).split("").map((digit, idx) => (
                    <span
                      key={idx}
                      className="w-13 h-14 flex items-center justify-center text-2xl font-black font-mono bg-white border-2 border-emerald-400 text-emerald-950 rounded-xl shadow-md"
                    >
                      {digit}
                    </span>
                  ))}
                </div>

                <div className="bg-white/90 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-900 font-semibold">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{partnerStoreAddress}</span>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetchDispatchOtp(order.orderId);
                        if (res?.isVerified || res?.status === "out_for_delivery" || res?.status === "OUT_FOR_DELIVERY") {
                          unlockAudioContext();
                          playSuccessChime();
                          speakText("डिलीवरी शुरू करें।");
                          toast.success("✓ Custody verified! Navigating to customer.");
                          setStage("in_trip");
                          setStartTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
                          setTimeout(() => {
                            launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName);
                          }, 600);
                        } else {
                          toast.error("Partner has not verified your Dispatch OTP yet! Please ask store partner to enter the 4-digit code in their Partner Panel.");
                        }
                      } catch {
                        toast.error("Could not verify partner status. Please ask partner to enter OTP.");
                      }
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>Check Partner Verification & Start Trip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualHandoverInput(!showManualHandoverInput)}
                    className="w-full text-center text-[10px] font-bold text-emerald-700 hover:underline"
                  >
                    {showManualHandoverInput ? "Hide direct Captain OTP input" : "Switch to Captain-to-Captain OTP verification"}
                  </button>
                </div>

                {showManualHandoverInput && (
                  <div className="pt-2 border-t border-emerald-200 space-y-2">
                    <p className="text-[11px] text-zinc-600 font-medium">
                      Enter 4-digit Handover OTP if receiving package directly from Captain 1:
                    </p>
                    <div className="flex gap-2 justify-center py-1">
                      {[0, 1, 2, 3].map((idx) => (
                        <input
                          key={idx}
                          type="tel"
                          maxLength={1}
                          value={handoverVerifyOtpDigits[idx]}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const next = [...handoverVerifyOtpDigits];
                            next[idx] = val;
                            setHandoverVerifyOtpDigits(next);
                            if (val && idx < 3) {
                              const nextEl = document.getElementById(`handover-otp-${idx + 1}`);
                              nextEl?.focus();
                            }
                          }}
                          id={`handover-otp-${idx}`}
                          className="w-11 h-11 text-center font-black text-xl bg-white border-2 border-zinc-300 rounded-xl focus:border-emerald-500 focus:outline-none shadow-sm"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyHandoverTransfer}
                      disabled={isVerifyingHandover}
                      className="w-full py-2.5 bg-zinc-800 text-white font-bold text-xs rounded-xl"
                    >
                      {isVerifyingHandover ? "Verifying..." : "Verify Direct Handover"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Waiting Timer Card */}
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                    <Timer className="w-4 h-4 text-amber-600 animate-spin duration-3000" />
                    <span>Free Waiting Time</span>
                  </div>
                  <span className="text-sm font-black text-amber-950 font-mono">
                    {formatTimer(waitingSeconds)}
                  </span>
                </div>

                {/* 4-Digit Start OTP Input (Dark High-Contrast) */}
                <div className="p-3.5 bg-zinc-50 border-2 border-zinc-300 rounded-2xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-950 uppercase tracking-wide">
                      Enter Customer Start OTP
                    </label>
                    <span className="text-[11px] font-bold text-zinc-700">
                      Ask 4-digit code from customer
                    </span>
                  </div>

                  <div className="flex gap-2.5 justify-center py-1">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        type="tel"
                        maxLength={1}
                        value={otpDigits[idx]}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const next = [...otpDigits];
                          next[idx] = val;
                          setOtpDigits(next);
                          if (val && idx < 3) {
                            const nextEl = document.getElementById(`trip-otp-${idx + 1}`);
                            nextEl?.focus();
                          }
                        }}
                        id={`trip-otp-${idx}`}
                        className="w-13 h-13 text-center font-black font-mono text-2xl bg-white border-2 border-zinc-400 rounded-xl focus:border-[#00C853] focus:ring-2 focus:ring-emerald-200 focus:outline-none shadow-md text-zinc-950"
                      />
                    ))}
                  </div>
                </div>

                {/* Bright Green [ → START TRIP ] Slider */}
                <button
                  type="button"
                  onClick={handleStartTrip}
                  className="w-full h-13.5 flex items-center bg-[#00C853] hover:bg-[#00B248] text-white font-black text-base tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all overflow-hidden"
                >
                  <div className="flex items-center justify-center w-14 h-full bg-emerald-600/50 border-r border-emerald-400/30">
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div className="flex-1 text-center pr-14">
                    <span>START TRIP</span>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* STAGE 3: In Trip -> Drop at Store (Leg 1) OR Complete Delivery (Leg 2) */}
        {stage === "in_trip" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {currentLeg === "pickup_to_store" ? (
              <>
                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  className="w-full h-14 flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all overflow-hidden"
                >
                  <div className="flex items-center justify-center w-14 h-full bg-emerald-700/60 border-r border-emerald-400/30">
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div className="flex-1 text-center pr-14">
                    <span>ARRIVAL TO STORE & HANDOVER 🧺</span>
                  </div>
                </button>

                {/* In-Trip Navigation Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleStartInAppNavigation}
                    className="py-2.5 px-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
                  >
                    <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>In-App Voice GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => launchTurnByTurnGoogleMaps(storeCoords, captainCoords, partnerStoreName)}
                    className="py-2.5 px-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4 text-[#4285F4] shrink-0" />
                    <span>Google Maps Turn-by-Turn</span>
                  </button>
                </div>

                {/* Unable to Deliver: Opt-out at store with 25% fee */}
                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Unable to Deliver / Leave Trip at Store (25% Fee)</span>
                </button>
              </>
            ) : (
              <>
                {/* Arrived at Customer Doorstep Action Button (Voice Prompt) */}
                <button
                  type="button"
                  onClick={handleMarkArrivedAtCustomer}
                  className="w-full py-2.5 px-3 rounded-xl border border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-950 font-black text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
                >
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>ARRIVED AT CUSTOMER DOORSTEP 📍</span>
                </button>

                {/* 4-Digit Customer Delivery OTP Input */}
                <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-blue-950">
                      Enter Customer Delivery OTP
                    </label>
                    <span className="text-[10px] font-bold text-blue-700">
                      Ask 4-digit code from customer
                    </span>
                  </div>

                  <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        type="tel"
                        maxLength={1}
                        value={customerDeliveryOtpDigits[idx]}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const next = [...customerDeliveryOtpDigits];
                          next[idx] = val;
                          setCustomerDeliveryOtpDigits(next);
                          if (val && idx < 3) {
                            const nextEl = document.getElementById(`customer-del-otp-${idx + 1}`);
                            nextEl?.focus();
                          }
                        }}
                        id={`customer-del-otp-${idx}`}
                        className="w-12 h-11 text-center font-black text-lg bg-white border border-blue-300 rounded-lg focus:border-blue-600 focus:outline-none shadow-xs text-blue-950"
                      />
                    ))}
                  </div>
                </div>

                {/* Delivery Ride: Vibrant Royal Blue Theme */}
                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  className="w-full h-14 flex items-center bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all overflow-hidden"
                >
                  <div className="flex items-center justify-center w-14 h-full bg-blue-700/60 border-r border-blue-400/30">
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div className="flex-1 text-center pr-14">
                    <span>COMPLETE CUSTOMER DELIVERY (OTP) 📦</span>
                  </div>
                </button>

                {/* In-Trip Navigation Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleStartInAppNavigation}
                    className="py-2.5 px-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
                  >
                    <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>In-App Voice GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => launchTurnByTurnGoogleMaps(customerCoords, captainCoords, order.customerName)}
                    className="py-2.5 px-2 rounded-xl border border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-900 font-black text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4 text-[#4285F4] shrink-0" />
                    <span>Google Maps Turn-by-Turn</span>
                  </button>
                </div>

                {/* Unable to Complete Delivery */}
                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="w-full py-2 px-3 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 font-bold text-[11px] flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Need Help / Emergency Transfer</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* STAGE: Clothes Dropped at Store & In Cleaning (Single Continuous Ride Active) */}
        {stage === "store_processing" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-3">
              {/* Header with animated sparkles */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Sparkles className="w-4 h-4 animate-spin duration-3000" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black tracking-tight">
                      Washing & Steam Ironing at Store
                    </h3>
                    <p className="text-[11px] font-bold text-emerald-700">
                      Trip is continuously active on your cockpit
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-black text-emerald-800 animate-pulse">
                  IN CLEANING
                </span>
              </div>

              {/* ⏱️ LIVE SERVICE SLA COUNTDOWN TIMER */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 rounded-2xl border-2 border-emerald-400/60 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                    <Timer className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>Service Turnaround Countdown</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    SLA Timer
                  </span>
                </div>

                <div className="flex items-baseline justify-between py-1">
                  <div>
                    <div className="text-3xl font-black font-mono tracking-tight text-emerald-950">
                      {formatCountdown(processingRemainingSecs)}
                    </div>
                    <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                      {processingRemainingSecs > 0 ? "अनुमानित सर्विस समय बाकी है" : "कपड़े जल्द ही तैयार होने वाले हैं"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-800">
                      {Math.round(processingTotalSecs / 60)} min cycle
                    </span>
                    <p className="text-[10px] text-emerald-600 font-medium">Standard SLA</p>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000"
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

                <p className="text-[10px] font-semibold text-emerald-800 bg-white/70 p-2 rounded-xl border border-emerald-200/60 leading-tight">
                  ℹ️ जैसे ही पार्टनर कपड़े तैयार ("Mark Ready") करेगा, यह टाइमर तुरंत हट जाएगा और आपको कलेक्ट करने का वॉइस सायरन अलर्ट मिलेगा।
                </p>
              </div>

              {/* Partner Store Info */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Partner Laundry Store
                    </span>
                    <p className="text-xs font-black text-black">
                      {partnerStoreName}
                    </p>
                    <p className="text-[11px] font-semibold text-neutral-600 line-clamp-1">
                      {partnerStoreAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCallModal(true)}
                    className="p-2 rounded-lg bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 active:scale-95 shadow-2xs"
                    aria-label="Call Store"
                  >
                    <Phone className="w-3.5 h-3.5 text-neutral-800" />
                  </button>
                </div>
              </div>

              {/* Real Earnings Settlement Badge */}
              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-black text-neutral-600 uppercase">
                    Pickup Leg Fare
                  </span>
                  <p className="text-sm font-black text-emerald-700">
                    ₹{(order.pickupLegPayout || order.fare / 2 || 35).toFixed(2)}
                  </p>
                  <span className="text-[9px] font-bold text-emerald-600">✓ Credited to Wallet</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <span className="text-[10px] font-black text-neutral-600 uppercase">
                    Delivery Leg Fare
                  </span>
                  <p className="text-sm font-black text-black">
                    ₹{(order.fare / 2 || 35).toFixed(2)}
                  </p>
                  <span className="text-[9px] font-bold text-neutral-500">Upon Customer Drop</span>
                </div>
              </div>

              {/* Quick Check / Refresh Button */}
              <button
                type="button"
                onClick={async () => {
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
                      toast.success("🎉 Order Ready! Collect from Store.");
                      setStage("ready_pickup_store");
                    } else {
                      toast.info("Partner is currently processing clothes. Timer ticking...");
                    }
                  } catch {
                    toast.info("Checking partner status...");
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Check If Clothes Are Ready Early 🔄</span>
              </button>

              {/* Exit Gate Action: Unable to Deliver / Leave Trip at Store */}
              <button
                type="button"
                onClick={() => setShowUnableModal(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-950 font-black text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Unable to Deliver / Leave Trip at Store (Exit Gate)</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE: Ready for Store Pickup -> Captain goes to Store & shows Dispatch OTP */}
        {stage === "ready_pickup_store" && (
          <div className="space-y-3 animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-white rounded-2xl border-2 border-[#00C853] shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-[#00C853] shadow-xs">
                    <Package className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black tracking-tight">
                      Clothes Ready at Store! (कपड़े तैयार हैं)
                    </h3>
                    <p className="text-[11px] font-bold text-emerald-700">
                      Go to Partner Store & Collect Package
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black animate-pulse">
                  READY FOR PICKUP
                </span>
              </div>

              {/* Partner Store Collection Card */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                    Collect From Partner Store
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">
                    Step 1 of 2
                  </span>
                </div>
                <p className="text-xs font-black text-neutral-900">
                  {partnerStoreName}
                </p>
                <p className="text-[11px] font-semibold text-neutral-600 line-clamp-1">
                  {partnerStoreAddress}
                </p>
              </div>

              {/* Action Button: Arrived at Store */}
              <button
                type="button"
                onClick={handleMarkArrivedAtStore}
                className="w-full h-14 flex items-center bg-[#00C853] hover:bg-[#00B248] text-white font-black text-sm sm:text-base tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all overflow-hidden"
              >
                <div className="flex items-center justify-center w-14 h-full bg-emerald-600/50 border-r border-emerald-400/30">
                  <ArrowRight className="w-6 h-6 stroke-[3]" />
                </div>
                <div className="flex-1 text-center pr-14">
                  <span>ARRIVED AT STORE 🏪</span>
                </div>
              </button>

              {/* In-App Turn-by-Turn GPS to Store */}
              <button
                type="button"
                onClick={handleStartInAppNavigation}
                className="w-full py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
              >
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Turn-by-Turn GPS to Store 🧭</span>
              </button>

              {/* Emergency Exit Gate if still needed */}
              <button
                type="button"
                onClick={() => setShowUnableModal(true)}
                className="w-full py-2 px-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
                <span>Unable to Deliver / Reassign to Another Captain</span>
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

        {/* STAGE 4: Trip Completed & Payment Collected */}
        {stage === "completed" && (
          <div className="space-y-3 animate-in zoom-in-95 duration-200">
            <div
              className={`p-4 rounded-2xl text-center space-y-1 border ${
                isDeliveryRide
                  ? "bg-blue-50 border-blue-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <span className="text-3xl">🎉</span>
              <h3 className={`text-lg font-black ${isDeliveryRide ? "text-blue-950" : "text-emerald-950"}`}>
                {isDeliveryRide ? "Delivery Completed!" : "Clothes Handed Over at Store!"}
              </h3>
              <p className={`text-2xl font-black ${isDeliveryRide ? "text-blue-600" : "text-[#00C853]"}`}>
                ₹{order.fare.toFixed(2)}
              </p>
              <p className={`text-xs font-semibold ${isDeliveryRide ? "text-blue-800" : "text-emerald-800"}`}>
                {isDeliveryRide
                  ? "Customer Doorstep Payout Credited to Wallet"
                  : "Pickup Leg Payout Credited · Partner Processing Unlocked"}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 border border-emerald-300 text-[10px] font-black text-emerald-900">
                <span>🛡️ 0% Platform Commission Guarantee</span>
                <span>•</span>
                <span>100% Payout Received</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCaptainReviewModal(true)}
              className="w-full h-12 flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-black border-2 border-emerald-500 font-black text-xs rounded-xl shadow-xs active:scale-98 transition-all"
            >
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span>{hasRatedTrip ? "✓ Rated Customer & Store" : "⭐ Rate Customer & Store (Build Trust)"}</span>
            </button>

            <button
              type="button"
              onClick={onTripCompleted}
              className={`w-full h-13 flex items-center justify-center text-white font-black text-sm tracking-wide rounded-xl shadow-lg active:scale-98 transition-all ${
                isDeliveryRide
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                  : "bg-[#00C853] hover:bg-[#00B248] shadow-emerald-500/25"
              }`}
            >
              <span>Ready for Next Order 🚀</span>
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
              {["I am on my way 🛵", "I have arrived at pickup 📍", "Please come down 👍", "Traffic delay ⏳"].map(
                (quick, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChat(quick)}
                    className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-[11px] font-bold text-neutral-700 whitespace-nowrap active:scale-95 shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <PhoneCall className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-neutral-900">Call {order.customerName || "Customer"}?</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mt-2 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>QuickPress Privacy Shield</span>
              </div>
              <p className="text-xs font-mono font-bold text-neutral-700 mt-2">{order.customerPhone || "+91 98••• ••210"}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Customer phone number is protected & masked</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="flex-1 h-11 bg-neutral-100 font-bold text-xs rounded-xl text-neutral-700 hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCallModal(false);
                  toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
                  if (order.customerPhone && !order.customerPhone.includes("••")) {
                    window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                  } else {
                    toast.success("Privacy Call: Patching through to customer via virtual bridge 📞");
                  }
                }}
                className="flex-1 h-11 bg-[#00C853] hover:bg-[#00B248] text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/25"
              >
                Call Securely 📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Full Interactive Order Timeline Slide-Up Sheet */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-[#00C853] border border-emerald-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 leading-tight">
                    Live Order Timeline
                  </h3>
                  <p className="text-[11px] font-bold text-zinc-700">
                    Trip #{order.orderCode || (order.orderId ? order.orderId.slice(-6).toUpperCase() : "LIVE")} · QuickPress Bike
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-100 text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Fare & OTP Banner */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-100 border-b border-zinc-200 text-xs">
              <div className="flex items-center gap-1.5 font-black text-zinc-950">
                <span className="text-sm font-black text-emerald-700 font-mono">₹{order.fare.toFixed(2)}</span>
                <span className="text-[10px] text-zinc-700 font-bold">{order.paymentMode === "cod" ? "(Cash on Delivery)" : "(Paid Online)"}</span>
              </div>
              <div className="flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-0.5 rounded-full font-black text-[11px]">
                <KeyRound className="w-3 h-3 text-amber-700" />
                <span>Start OTP: {order.startOtp || "Pending verification"}</span>
              </div>
            </div>

            {/* Vertical Timeline Stepper */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Event 1: Order Placed */}
              <div className="relative flex gap-3.5 items-start">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00C853] text-white shrink-0 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="w-0.5 h-12 bg-[#00C853]" />
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-xs font-black text-zinc-950">Order Placed</h4>
                    <span className="text-[10px] font-bold text-zinc-600">{order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
                  </div>
                  <p className="text-[11px] text-zinc-700 font-medium mt-0.5">
                    Order initiated by {order.customerName || "Customer"}
                  </p>
                </div>
              </div>

              {/* Event 2: Order Accepted */}
              <div className="relative flex gap-3.5 items-start">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00C853] text-white shrink-0 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="w-0.5 h-12 bg-[#00C853]" />
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-xs font-black text-zinc-950">Order Accepted</h4>
                    <span className="text-[10px] font-black text-emerald-800">{acceptedTime}</span>
                  </div>
                  <p className="text-[11px] text-zinc-700 font-medium mt-0.5">
                    Captain accepted the delivery offer
                  </p>
                </div>
              </div>

              {/* Event 3: Arrived at Pickup */}
              <div className="relative flex gap-3.5 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                      stage === "en_route_pickup"
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                        : "bg-[#00C853] text-white"
                    }`}
                  >
                    {stage === "en_route_pickup" ? (
                      <Bike className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>
                  <div
                    className={`w-0.5 h-14 ${
                      stage === "en_route_pickup" ? "bg-zinc-300" : "bg-[#00C853]"
                    }`}
                  />
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between">
                    <h4
                      className={`text-xs font-black ${
                        stage === "en_route_pickup" ? "text-blue-700" : "text-zinc-950"
                      }`}
                    >
                      {stage === "en_route_pickup" ? "En Route to Pickup" : "Arrived at Pickup"}
                    </h4>
                    <span className="text-[10px] font-black text-zinc-700">
                      {arrivedTime || "In Progress"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-900 font-bold mt-0.5">
                    {order.pickupTitle || "Dabirpura"} ({order.distanceMeters || 258}m)
                  </p>
                  <p className="text-[10px] text-zinc-700 font-medium mt-0.5 line-clamp-1">
                    {order.pickupAddress}
                  </p>
                </div>
              </div>

              {/* Event 4: Trip Started / OTP Verified */}
              <div className="relative flex gap-3.5 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                      stage === "arrived_pickup"
                        ? "bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse"
                        : stage === "in_trip" || stage === "completed"
                        ? "bg-[#00C853] text-white"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {stage === "in_trip" || stage === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <KeyRound className="w-3 h-3" />
                    )}
                  </div>
                  <div
                    className={`w-0.5 h-14 ${
                      stage === "in_trip" || stage === "completed" ? "bg-[#00C853]" : "bg-zinc-300"
                    }`}
                  />
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between">
                    <h4
                      className={`text-xs font-black ${
                        stage === "arrived_pickup"
                          ? "text-amber-700"
                          : stage === "in_trip"
                          ? "text-emerald-800"
                          : "text-zinc-950"
                      }`}
                    >
                      OTP Verification & Start Trip
                    </h4>
                    <span className="text-[10px] font-black text-zinc-700">
                      {startTime || "Pending"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-700 font-medium mt-0.5">
                    Customer OTP: <span className="font-mono font-black text-zinc-950">{order.startOtp || "Verified at pickup"}</span>
                  </p>
                </div>
              </div>

              {/* Event 5: Heading to Destination */}
              <div className="relative flex gap-3.5 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                      stage === "in_trip"
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                        : stage === "completed"
                        ? "bg-[#00C853] text-white"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {stage === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <MapPin className="w-3 h-3" />
                    )}
                  </div>
                  <div
                    className={`w-0.5 h-12 ${
                      stage === "completed" ? "bg-[#00C853]" : "bg-zinc-300"
                    }`}
                  />
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-xs font-black text-zinc-950">
                      Heading to Drop Location
                    </h4>
                    <span className="text-[10px] font-black text-zinc-700">
                      {stage === "in_trip" ? "Live" : stage === "completed" ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-900 font-bold mt-0.5">
                    {order.dropTitle || "Saidabad"} ({order.dropDistanceKm || 3.6} km)
                  </p>
                  <p className="text-[10px] text-zinc-700 font-medium mt-0.5 line-clamp-1">
                    {order.dropAddress}
                  </p>
                </div>
              </div>

              {/* Event 6: Delivered & Completed */}
              <div className="relative flex gap-3.5 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                      stage === "completed"
                        ? "bg-[#00C853] text-white ring-4 ring-emerald-100"
                        : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between">
                    <h4
                      className={`text-xs font-black ${
                        stage === "completed" ? "text-[#00C853]" : "text-zinc-600"
                      }`}
                    >
                      Trip Completed
                    </h4>
                    <span className="text-[10px] font-black text-zinc-700">
                      {completedTime || "Estimated"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-800 font-bold mt-0.5">
                    Collect ₹{order.fare.toFixed(2)} & credit to wallet
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="p-4 border-t border-neutral-100 bg-white">
              <button
                type="button"
                onClick={() => setShowTimelineModal(false)}
                className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs rounded-xl active:scale-98 transition-all"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
};


