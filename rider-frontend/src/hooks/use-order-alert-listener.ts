import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { acceptRiderOrder, fetchRiderOrders, rejectRiderOrder } from "@/api/rider/rider-orders-api";
import type { RiderOrder } from "@/shared/types/rider";
import { useRiderContext } from "../context/RiderContext";
import { riderRoutes } from "../navigation/rider-routes";

export function useOrderAlertListener() {
  const navigate = useNavigate();
  const { session, isOnline } = useRiderContext();

  const [incomingOrder, setIncomingOrder] = useState<RiderOrder | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const seenOrderIds = useRef<Set<string>>(new Set());

  const checkIncomingOffers = useCallback(async () => {
    if (!isOnline || !session?.token) return;
    try {
      const orders = await fetchRiderOrders();
      const assigned = orders.filter(
        (o: any) =>
          (o.status === "assigned" || o.stage === "pickup_assigned") &&
          !seenOrderIds.current.has(o.id) &&
          !seenOrderIds.current.has(o.code || "")
      );

      if (assigned.length > 0 && !isAlertOpen) {
        const nextOrder = assigned[0];
        if (nextOrder) {
          seenOrderIds.current.add(nextOrder.id);
          if (nextOrder.code) seenOrderIds.current.add(nextOrder.code);

          setIncomingOrder(nextOrder);
          setIsAlertOpen(true);
        }
      }
    } catch {
      /* ignore polling error */
    }
  }, [isOnline, session?.token, isAlertOpen]);

  useEffect(() => {
    if (!isOnline) {
      setIsAlertOpen(false);
      setIncomingOrder(null);
      return;
    }

    void checkIncomingOffers();
    const interval = setInterval(() => {
      void checkIncomingOffers();
    }, 3500);

    return () => clearInterval(interval);
  }, [isOnline, checkIncomingOffers]);

  const handleAccept = useCallback(
    async (order: RiderOrder) => {
      try {
        await acceptRiderOrder(order.code || order.id);
        setIsAlertOpen(false);
        setIncomingOrder(null);
        toast.success(`Trip Offer #${order.code || order.id} Accepted!`);
        void (navigate as any)({
          to: riderRoutes.orderDetails,
          params: { orderId: order.code || order.id },
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to accept trip offer");
      }
    },
    [navigate]
  );

  const handleReject = useCallback(
    async (order: RiderOrder) => {
      try {
        await rejectRiderOrder(order.code || order.id);
        setIsAlertOpen(false);
        setIncomingOrder(null);
        toast.info(`Trip offer #${order.code || order.id} declined`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to decline offer");
      }
    },
    []
  );

  return {
    incomingOrder,
    isAlertOpen,
    handleAccept,
    handleReject,
    triggerTestAlert: (testOrder: RiderOrder) => {
      setIncomingOrder(testOrder);
      setIsAlertOpen(true);
    },
  };
}
