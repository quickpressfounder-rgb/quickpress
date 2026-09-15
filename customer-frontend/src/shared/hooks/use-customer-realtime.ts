/**
 * Customer realtime: live order lifecycle + rider location.
 *
 * Covers Order Created → Partner Accepted → Rider Assigned → Rider Reached
 * Shop → Pickup Complete → Washing Started → Washing Finished → Ironing
 * Started → Out For Delivery → Rider Live Location → Delivered.
 */

import { useCallback, useState } from "react";

import {
  ORDER_EVENT_LABELS,
  ORDER_LIFECYCLE_EVENTS,
  SOCKET_EVENTS,
  rooms,
  type AnyRealtimePayload,
  type LocationEventPayload,
  type OrderEventPayload,
} from "@/api/core/socket-events";

import { useRealtimeEvent, useRealtimeRoom } from "./use-realtime";

export type OrderTimelineEntry = {
  event: string;
  label: string;
  at: string;
  message?: string | undefined;
};

export type RiderLocation = { lat: number; lng: number; heading?: number; at: string };

export type CustomerOrderRealtime = {
  status: string | null;
  etaMinutes: number | null;
  timeline: OrderTimelineEntry[];
  riderLocation: RiderLocation | null;
  lastEvent: OrderEventPayload | null;
};

export function useCustomerOrderRealtime(
  orderId: string | null | undefined,
  customerId?: string | null,
): CustomerOrderRealtime {
  const [statusState, setStatusState] = useState<{
    status: string | null;
    etaMinutes: number | null;
    lastEvent: OrderEventPayload | null;
  }>({ status: null, etaMinutes: null, lastEvent: null });
  const [timeline, setTimeline] = useState<OrderTimelineEntry[]>([]);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);

  useRealtimeRoom([
    orderId ? rooms.order(orderId) : "",
    customerId ? rooms.customer(customerId) : "",
  ]);

  const onOrderEvent = useCallback(
    (payload: AnyRealtimePayload, event: string) => {
      const order = payload as OrderEventPayload;
      if (orderId && order.orderId && order.orderId !== orderId) return;
      setStatusState({
        status: order.status ?? event.replace("order.", ""),
        etaMinutes: order.etaMinutes ?? null,
        lastEvent: order,
      });
      setTimeline((current) => {
        // Duplicate prevention at the view layer too — same event never twice.
        if (current.some((entry) => entry.event === event)) return current;
        return [
          ...current,
          {
            event,
            label: ORDER_EVENT_LABELS[event] ?? event,
            at: order.at ?? new Date().toISOString(),
            message: order.message,
          },
        ];
      });
    },
    [orderId],
  );

  useRealtimeEvent(ORDER_LIFECYCLE_EVENTS as string[], onOrderEvent);

  useRealtimeEvent([SOCKET_EVENTS.locationUpdated, "captain_location_update"], (payload) => {
    const location = payload as any;
    if (orderId && location.orderId && location.orderId !== orderId) return;
    const lat = Number(location.lat ?? location.latitude ?? location.coords?.lat);
    const lng = Number(location.lng ?? location.longitude ?? location.coords?.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      setRiderLocation({
        lat,
        lng,
        ...(location.heading === undefined ? {} : { heading: Number(location.heading) }),
        at: location.at ?? new Date().toISOString(),
      });
    }
  });

  return { ...statusState, timeline, riderLocation };
}
