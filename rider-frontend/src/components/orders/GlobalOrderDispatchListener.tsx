import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRiderContext } from "../../context/RiderContext";
import { subscribeRiderOffers, subscribeRiderOrders } from "../../lib/rider-socket";
import { fetchRiderOffers } from "../../api/rider/rider-orders-api";
import { stopOrderAlertSound } from "../../lib/captain-audio";
import { FlashTripOfferModal, type FlashOfferData } from "./FlashTripOfferModal";

export const GlobalOrderDispatchListener: React.FC = () => {
  const navigate = useNavigate();
  const { session, isOnline } = useRiderContext();
  const lastDispatchedOrderIdRef = useRef<string | null>(null);
  const acceptedOrderIdsRef = useRef<Set<string>>(new Set());
  const declinedOrderIdsRef = useRef<Set<string>>(new Set());
  const [activeFlashOffer, setActiveFlashOffer] = useState<FlashOfferData | null>(null);
  const activeFlashOfferRef = useRef<FlashOfferData | null>(null);

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

      const targetId = String(offer.orderId || offer.id || offer.rideId || "");
      const offerId = String(offer.offerId || targetId || `offer-${Date.now()}`);

      // Permanently skip already accepted or declined orders in this session
      if (
        (targetId && (acceptedOrderIdsRef.current.has(targetId) || declinedOrderIdsRef.current.has(targetId))) ||
        (offerId && (acceptedOrderIdsRef.current.has(offerId) || declinedOrderIdsRef.current.has(offerId)))
      ) {
        return;
      }

      // Check if rider already has this trip active in local storage
      try {
        const saved = localStorage.getItem("qp_active_rider_order");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (String(parsed.orderId) === targetId || String(parsed.id) === targetId)) {
            return;
          }
        }
      } catch {}

      // If an offer modal is already actively showing on screen, or this order is already dispatched, don't interrupt
      if (activeFlashOfferRef.current !== null || lastDispatchedOrderIdRef.current === targetId) {
        return;
      }

      // If event was a lifecycle ping without fare, fetch latest offers
      if (!offer.fare && !offer.estimatedEarning && targetId) {
        fetchRiderOffers()
          .then((offers) => {
            if (Array.isArray(offers) && offers.length > 0) {
              const fresh = offers.find(
                (o) =>
                  !acceptedOrderIdsRef.current.has(String(o.orderId || o.id || o.rideId)) &&
                  !declinedOrderIdsRef.current.has(String(o.orderId || o.id || o.rideId))
              );
              if (fresh) handleIncomingOffer(fresh);
            }
          })
          .catch(() => {});
        return;
      }

      // Ignore terminal or finished order states
      const ordStatus = String(offer.orderStatus || offer.status || "").toLowerCase();
      if (ordStatus === "cancelled" || ordStatus === "completed" || ordStatus === "rejected" || ordStatus === "expired") {
        return;
      }

      lastDispatchedOrderIdRef.current = targetId;

      const isExpress = Boolean(offer.isExpress || offer.express || (offer.rideDoc && offer.rideDoc.isExpress));
      const riderBonus = Number(offer.riderExpressBonus || (offer.rideDoc && offer.rideDoc.riderExpressBonus) || 32);
      const fare = Number(offer.fare || offer.estimatedEarning || 45);
      const pickupTitle = offer.pickupTitle || offer.pickupAddress || "Customer Pickup";
      const dropTitle = offer.dropTitle || offer.dropAddress || "QuickPress Partner Store";

      const flashData: FlashOfferData = {
        offerId: offerId,
        orderId: targetId,
        rideId: String(offer.rideId || targetId),
        orderCode: String(offer.orderCode || (targetId ? targetId.slice(-6).toUpperCase() : "TRIP")),
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
        wave: offer.wave !== undefined ? Number(offer.wave) : undefined,
        proximityTier: offer.proximityTier,
        proximityBadge: offer.proximityBadge,
        estimatedArrivalMinutes: offer.estimatedArrivalMinutes !== undefined ? Number(offer.estimatedArrivalMinutes) : undefined,
        waveTimeoutSeconds: offer.waveTimeoutSeconds !== undefined ? Number(offer.waveTimeoutSeconds) : undefined,
        fareBreakdown: offer.fareBreakdown,
        fareBreakdownText: offer.fareBreakdownText || (offer.fareBreakdown ? offer.fareBreakdown.breakdownText : undefined),
      };

      // Trigger Flash Offer Modal (FlashTripOfferModal handles the siren, language speech, and countdown)
      activeFlashOfferRef.current = flashData;
      setActiveFlashOffer(flashData);

      if (isExpress) {
        toast.warning(`⚡ EXPRESS PICKUP ALERT! +₹${riderBonus} Captain Bonus Shamil Hai!`, {
          duration: 5000,
        });
      }
    };

    // 1. Listen for new incoming offers via WebSocket
    const unsubscribeOffers = subscribeRiderOffers((rawOffer) => {
      handleIncomingOffer(rawOffer);
    });

    // 2. Listen for ride claimed / order assigned events to instantly stop siren & dismiss modal if another captain accepted
    const unsubscribeOrders = subscribeRiderOrders((eventData: any) => {
      const evType = eventData?.event || "";
      if (
        evType === "ride.claimed" ||
        evType === "order.claimed" ||
        evType === "order.rider_assigned" ||
        eventData?.claimedBy ||
        eventData?.riderId
      ) {
        const claimedRideId = String(eventData?.rideId || "");
        const claimedOrderId = String(eventData?.orderId || eventData?._id || eventData?.id || "");
        const claimedBy = String(
          eventData?.claimedBy || eventData?.riderId || (eventData?.rider || {}).id || ""
        );

        const myRiderId = String(
          (session as any)?.riderId ||
          (session as any)?.account?.riderId ||
          (session as any)?.account?.linkedId ||
          (typeof window !== "undefined" ? localStorage.getItem("qp_rider_id") || "" : "")
        );

        if (activeFlashOfferRef.current) {
          const currentOrderId = String(activeFlashOfferRef.current.orderId || "");
          const currentRideId = String(activeFlashOfferRef.current.rideId || "");

          const isMatch =
            (claimedOrderId && (claimedOrderId === currentOrderId || claimedOrderId === currentRideId)) ||
            (claimedRideId && (claimedRideId === currentRideId || claimedRideId === currentOrderId));

          if (isMatch && claimedBy && claimedBy !== myRiderId) {
            console.log(
              `[DispatchListener] Offer ${currentOrderId} was claimed by another Captain (${claimedBy}). Stopping bell & dismissing modal.`
            );
            declinedOrderIdsRef.current.add(currentOrderId);
            if (currentRideId) declinedOrderIdsRef.current.add(currentRideId);
            stopOrderAlertSound();
            activeFlashOfferRef.current = null;
            setActiveFlashOffer(null);
            toast.info("⚡ Yeh order kisi aur Captain ne accept kar liya!");
          }
        }
      }

      // 2b. Listen for ride / order cancellation (Customer or Partner cancelled)
      if (
        evType === "ride.cancelled" ||
        evType === "order.cancelled" ||
        eventData?.status === "cancelled"
      ) {
        const cancelledOrderId = String(eventData?.orderId || eventData?._id || eventData?.id || "");
        if (activeFlashOfferRef.current) {
          const currentOrderId = String(activeFlashOfferRef.current.orderId || "");
          const currentRideId = String(activeFlashOfferRef.current.rideId || "");
          if (
            cancelledOrderId &&
            (cancelledOrderId === currentOrderId || cancelledOrderId === currentRideId)
          ) {
            stopOrderAlertSound();
            activeFlashOfferRef.current = null;
            setActiveFlashOffer(null);
            toast.error("❌ Yeh order customer/store dwara cancel kar diya gaya.");
          }
        }
      }
    });

    // 3. Initial check
    fetchRiderOffers()
      .then((offers) => {
        if (Array.isArray(offers) && offers.length > 0) {
          const fresh = offers.find(
            (o) =>
              !acceptedOrderIdsRef.current.has(String(o.orderId || o.id || o.rideId)) &&
              !declinedOrderIdsRef.current.has(String(o.orderId || o.id || o.rideId))
          );
          if (fresh) handleIncomingOffer(fresh);
        }
      })
      .catch(() => {});

    // 4. Snappy 3-second heartbeat polling
    const pollInterval = setInterval(async () => {
      try {
        const offers = await fetchRiderOffers();
        if (Array.isArray(offers) && offers.length > 0) {
          const fresh = offers.find(
            (o) =>
              !acceptedOrderIdsRef.current.has(String(o.orderId || o.id || o.rideId)) &&
              !declinedOrderIdsRef.current.has(String(o.orderId || o.id || o.rideId))
          );
          if (fresh) {
            handleIncomingOffer(fresh);
          }
        } else {
          lastDispatchedOrderIdRef.current = null;
        }
      } catch {
        // Quiet fallback
      }
    }, 3000);

    return () => {
      unsubscribeOffers();
      unsubscribeOrders();
      clearInterval(pollInterval);
    };
  }, [session?.token, isOnline]);

  return (
    <FlashTripOfferModal
      offer={activeFlashOffer}
      onAccepted={(orderId, acceptedOffer) => {
        // 1. Instantly kill siren & sound effects
        stopOrderAlertSound();

        // 2. Permanently remember this order was accepted so it never rings again
        if (orderId) acceptedOrderIdsRef.current.add(String(orderId));
        if (acceptedOffer.orderId) acceptedOrderIdsRef.current.add(String(acceptedOffer.orderId));
        if (acceptedOffer.rideId) acceptedOrderIdsRef.current.add(String(acceptedOffer.rideId));
        if (acceptedOffer.offerId) acceptedOrderIdsRef.current.add(String(acceptedOffer.offerId));

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
          window.dispatchEvent(new CustomEvent("qp:active_order_updated", { detail: activeOrderData }));
        } catch {}

        activeFlashOfferRef.current = null;
        setActiveFlashOffer(null);
        try {
          void navigate({ to: "/orders" as any }).catch(() => {
            window.location.href = "/orders";
          });
        } catch {
          window.location.href = "/orders";
        }
      }}
      onDeclined={(declinedId) => {
        stopOrderAlertSound();
        if (declinedId) declinedOrderIdsRef.current.add(String(declinedId));
        activeFlashOfferRef.current = null;
        setActiveFlashOffer(null);
      }}
    />
  );
};
