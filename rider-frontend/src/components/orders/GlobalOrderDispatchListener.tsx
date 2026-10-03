import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRiderContext } from "../../context/RiderContext";
import { subscribeRiderOffers } from "../../lib/rider-socket";
import { fetchRiderOffers } from "../../api/rider/rider-orders-api";
import {
  unlockAudioContext,
  playOrderAlertSound,
  playTripAssignedBell,
  stopOrderAlertSound,
  speakOrderAlert,
  speakTripAssigned,
  triggerHaptic,
} from "../../lib/captain-audio";
import { FlashTripOfferModal, type FlashOfferData } from "./FlashTripOfferModal";

export const GlobalOrderDispatchListener: React.FC = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, isOnline } = useRiderContext();
  const lastDispatchedOfferIdRef = useRef<string | null>(null);
  const [activeFlashOffer, setActiveFlashOffer] = useState<FlashOfferData | null>(null);

  useEffect(() => {
    // Only listen for incoming orders if rider is authenticated and online
    const hasAuth = Boolean(
      session?.token ||
      session?.riderId ||
      (typeof window !== "undefined" && (localStorage.getItem("quickpress.session.rider") || localStorage.getItem("qp_rider_id") || localStorage.getItem("qp_rider_phone")))
    );
    if (!hasAuth || !isOnline) return;

    const handleIncomingOffer = (offer: any) => {
      if (!offer) return;
      // If event was a lifecycle ping without fare, fetch latest offers immediately
      if (!offer.fare && !offer.estimatedEarning && (offer.orderId || offer.rideId)) {
        fetchRiderOffers().then((offers) => {
          if (Array.isArray(offers) && offers.length > 0) {
            handleIncomingOffer(offers[0]);
          }
        }).catch(() => {});
        return;
      }
      // Ignore only already completed, cancelled, or rejected orders
      const ordStatus = String(offer.orderStatus || offer.status || "").toLowerCase();
      if (ordStatus === "cancelled" || ordStatus === "completed" || ordStatus === "rejected" || ordStatus === "expired") {
        return;
      }

      const offerId = offer.offerId || offer.orderId || offer.id || offer._id || `offer-${Date.now()}`;

      // Prevent duplicate instant triggers for the same offer ID
      if (lastDispatchedOfferIdRef.current === offerId) {
        return;
      }
      lastDispatchedOfferIdRef.current = offerId;

      const isExpress = Boolean(offer.isExpress || offer.express || (offer.rideDoc && offer.rideDoc.isExpress));
      const riderBonus = Number(offer.riderExpressBonus || (offer.rideDoc && offer.rideDoc.riderExpressBonus) || 32);
      const isAutoAssigned = Boolean(
        offer.autoAssigned ||
        offer.isAssigned ||
        ordStatus === "assigned" ||
        ordStatus === "pickup_rider_accepted" ||
        ordStatus === "rider_assigned" ||
        offer.event === "order.trip_assigned"
      );

      const targetId = offer.orderId || offer.id || offer.rideId;
      const fare = Number(offer.fare || offer.estimatedEarning || 45);
      const pickupTitle = offer.pickupTitle || offer.pickupAddress || "Customer Pickup";
      const dropTitle = offer.dropTitle || offer.dropAddress || "QuickPress Partner Store";

      // If directly assigned to this rider, immediately sync to active order state
      if (isAutoAssigned && targetId) {
        const pOtp = (typeof offer.otp?.pickup === "object" ? offer.otp?.pickup?.code : offer.otp?.pickup) || offer.pickupOtp || "";
        const dOtp = (typeof offer.otp?.delivery === "object" ? offer.otp?.delivery?.code : offer.otp?.delivery) || offer.deliveryOtp || "";
        const hOtp = (typeof offer.otp?.handover === "object" ? offer.otp?.handover?.code : offer.otp?.handover) || offer.handoverOtp || offer.dispatchOtp || "";

        const activeOrderData = {
          orderId: targetId,
          orderCode: offer.orderCode || (targetId ? String(targetId).slice(-6).toUpperCase() : "TRIP"),
          customerName: offer.customerName || "Customer",
          customerPhone: offer.customerPhone || "",
          partnerName: offer.partnerName || "QuickPress Partner Store",
          partnerPhone: offer.partnerPhone || "",
          partnerAddress: offer.partnerAddress || offer.dropAddress || "",
          pickupAddress: offer.pickupAddress || pickupTitle,
          pickupTitle: pickupTitle,
          dropAddress: offer.dropAddress || dropTitle,
          dropTitle: dropTitle,
          distanceMeters: Math.round((offer.pickupDistanceKm || offer.distanceKm || 1.2) * 1000),
          pickupDistanceKm: Number(offer.pickupDistanceKm || offer.distanceKm || 1.2),
          dropDistanceKm: Number(offer.dropDistanceKm || 2.5),
          fare: fare,
          amount: Number(offer.amount || fare),
          paymentMode: offer.paymentMode || "cod",
          items: offer.items || [],
          placedAt: offer.placedAt || new Date().toISOString(),
          startOtp: String(pOtp),
          deliveryOtp: String(dOtp),
          dispatchOtp: String(hOtp),
          customerCoords: offer.customerCoords,
          partnerCoords: offer.partnerCoords,
          pickupCoords: offer.pickupCoords,
          dropCoords: offer.dropCoords,
          rideType: offer.rideType || "pickup",
        };

        try {
          localStorage.setItem("qp_active_rider_order", JSON.stringify(activeOrderData));
          localStorage.setItem("qp_active_delivery_order", JSON.stringify(activeOrderData));
        } catch {}
      }

      const flashData: FlashOfferData = {
        offerId: String(offerId),
        orderId: String(targetId),
        rideId: String(offer.rideId || targetId),
        orderCode: String(offer.orderCode || (targetId ? String(targetId).slice(-6).toUpperCase() : "TRIP")),
        rideType: offer.rideType || "pickup",
        fare: fare,
        isExpress: isExpress,
        riderExpressBonus: riderBonus,
        pickupTitle: pickupTitle,
        pickupAddress: offer.pickupAddress || pickupTitle,
        dropTitle: dropTitle,
        dropAddress: offer.dropAddress || dropTitle,
        pickupDistanceKm: Number(offer.pickupDistanceKm || offer.distanceKm || 1.2),
        dropDistanceKm: Number(offer.dropDistanceKm || 2.5),
        customerName: offer.customerName || "Customer",
        customerPhone: offer.customerPhone || "",
        partnerName: offer.partnerName || "QuickPress Partner Store",
        partnerPhone: offer.partnerPhone || "",
        partnerAddress: offer.partnerAddress || offer.dropAddress || "",
        paymentMode: offer.paymentMode || "cod",
        amount: Number(offer.amount || fare),
        items: offer.items || [],
        placedAt: offer.placedAt || new Date().toISOString(),
        otp: offer.otp,
        pickupOtp: offer.pickupOtp,
        deliveryOtp: offer.deliveryOtp,
        dispatchOtp: offer.dispatchOtp,
        customerCoords: offer.customerCoords,
        partnerCoords: offer.partnerCoords,
        pickupCoords: offer.pickupCoords,
        dropCoords: offer.dropCoords,
      };

      // Trigger Flash Offer Modal directly over whatever screen rider is currently viewing
      setActiveFlashOffer(flashData);

      // Play continuous high-priority bell ringtone & speech alert
      try {
        unlockAudioContext();
        triggerHaptic([350, 150, 350, 150, 600, 300]);
        playTripAssignedBell();

        if (isAutoAssigned) {
          speakTripAssigned(fare, pickupTitle);
        } else {
          speakOrderAlert(fare, pickupTitle, dropTitle);
        }
      } catch (err) {
        console.warn("[GlobalOrderListener] Audio playback alert failed:", err);
      }

      if (isExpress) {
        toast.warning(`⚡ EXPRESS PICKUP ALERT! +₹${riderBonus} Captain Bonus Shamil Hai!`, {
          duration: 5000,
        });
      }
    };

    // 1. Listen via WebSocket
    const unsubscribe = subscribeRiderOffers((rawOffer) => {
      handleIncomingOffer(rawOffer);
    });

    // 2. Initial check
    fetchRiderOffers()
      .then((offers) => {
        if (Array.isArray(offers) && offers.length > 0) {
          handleIncomingOffer(offers[0]);
        }
      })
      .catch(() => {});

    // 3. Fast polling backup (snappy 2.5-second safety heartbeat)
    const pollInterval = setInterval(async () => {
      try {
        const offers = await fetchRiderOffers();
        if (Array.isArray(offers) && offers.length > 0) {
          handleIncomingOffer(offers[0]);
        } else {
          // Reset last seen offer ID if queue cleared
          lastDispatchedOfferIdRef.current = null;
        }
      } catch {
        // Quiet fallback
      }
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [session?.token, isOnline, pathname, navigate]);

  return (
    <FlashTripOfferModal
      offer={activeFlashOffer}
      onAccepted={(orderId, acceptedOffer) => {
        const pOtp = (typeof acceptedOffer.otp?.pickup === "object" ? acceptedOffer.otp?.pickup?.code : acceptedOffer.otp?.pickup) || acceptedOffer.pickupOtp || "";
        const dOtp = (typeof acceptedOffer.otp?.delivery === "object" ? acceptedOffer.otp?.delivery?.code : acceptedOffer.otp?.delivery) || acceptedOffer.deliveryOtp || "";
        const hOtp = (typeof acceptedOffer.otp?.handover === "object" ? acceptedOffer.otp?.handover?.code : acceptedOffer.otp?.handover) || acceptedOffer.dispatchOtp || "";

        const activeOrderData = {
          orderId: acceptedOffer.orderId,
          orderCode: acceptedOffer.orderCode || acceptedOffer.orderId.slice(-6).toUpperCase(),
          customerName: acceptedOffer.customerName || "Customer",
          customerPhone: acceptedOffer.customerPhone || "",
          partnerName: acceptedOffer.partnerName || "QuickPress Partner Store",
          partnerPhone: acceptedOffer.partnerPhone || "",
          partnerAddress: acceptedOffer.partnerAddress || acceptedOffer.dropAddress || "",
          pickupAddress: acceptedOffer.pickupAddress,
          pickupTitle: acceptedOffer.pickupTitle,
          dropAddress: acceptedOffer.dropAddress,
          dropTitle: acceptedOffer.dropTitle,
          distanceMeters: Math.round((acceptedOffer.pickupDistanceKm || 1.2) * 1000),
          pickupDistanceKm: Number(acceptedOffer.pickupDistanceKm || 1.2),
          dropDistanceKm: Number(acceptedOffer.dropDistanceKm || 2.5),
          fare: acceptedOffer.fare,
          amount: Number(acceptedOffer.amount || acceptedOffer.fare),
          paymentMode: acceptedOffer.paymentMode || "cod",
          items: acceptedOffer.items || [],
          placedAt: acceptedOffer.placedAt || new Date().toISOString(),
          startOtp: String(pOtp),
          deliveryOtp: String(dOtp),
          dispatchOtp: String(hOtp),
          customerCoords: acceptedOffer.customerCoords,
          partnerCoords: acceptedOffer.partnerCoords,
          pickupCoords: acceptedOffer.pickupCoords,
          dropCoords: acceptedOffer.dropCoords,
          rideType: acceptedOffer.rideType || "pickup",
        };

        try {
          localStorage.setItem("qp_active_rider_order", JSON.stringify(activeOrderData));
          localStorage.setItem("qp_active_delivery_order", JSON.stringify(activeOrderData));
        } catch {}

        setActiveFlashOffer(null);
        navigate({ to: "/orders" });
      }}
      onDeclined={() => {
        setActiveFlashOffer(null);
      }}
    />
  );
};
