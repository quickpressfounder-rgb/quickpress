import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface OrderSlaCountdownProps {
  placedAt?: string;
  deadline?: string;
  acceptedAt?: string;
  readyAt?: string;
  deliveryAssignedAt?: string;
  stage: string;
  autoCancelled?: boolean;
  cancellationReason?: string;
  reassignmentPool?: number;
  isReassigned?: boolean;
}

export function OrderSlaCountdown({
  placedAt,
  deadline,
  acceptedAt,
  readyAt,
  deliveryAssignedAt,
  stage,
  autoCancelled,
  cancellationReason,
  reassignmentPool,
  isReassigned,
}: OrderSlaCountdownProps) {
  const normStage = (stage || "").toLowerCase();
  const isNew = normStage === "new" || normStage === "placed" || normStage === "pending";
  const isSearchingRider = normStage === "accepted" || normStage === "pickup_pending";
  const isDeliveryWaiting =
    normStage === "ready" ||
    normStage === "ready_for_delivery" ||
    normStage === "delivery_rider_assigned" ||
    normStage === "delivery_rider_2_assigned";

  const isRider2Active =
    normStage === "delivery_rider_2_assigned" ||
    Boolean(isReassigned) ||
    Boolean(reassignmentPool && reassignmentPool > 0);

  const [remainingSec, setRemainingSec] = useState<number>(() => {
    const now = Date.now();
    if (isNew) {
      const baseTime = placedAt ? new Date(placedAt).getTime() : now;
      const targetTime = deadline ? new Date(deadline).getTime() : baseTime + 5 * 60 * 1000;
      return Math.max(0, Math.floor((targetTime - now) / 1000));
    }
    if (isSearchingRider) {
      const baseTime = acceptedAt ? new Date(acceptedAt).getTime() : now;
      const targetTime = deadline ? new Date(deadline).getTime() : baseTime + 2 * 60 * 1000;
      return Math.max(0, Math.floor((targetTime - now) / 1000));
    }
    if (isDeliveryWaiting) {
      const baseTime = deliveryAssignedAt || readyAt ? new Date(deliveryAssignedAt || readyAt!).getTime() : now;
      const targetTime = deadline ? new Date(deadline).getTime() : baseTime + 2 * 60 * 1000;
      return Math.max(0, Math.floor((targetTime - now) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    if (!isNew && !isSearchingRider && !isDeliveryWaiting) return;

    const timer = setInterval(() => {
      const now = Date.now();
      let diff = 0;
      if (isNew) {
        const baseTime = placedAt ? new Date(placedAt).getTime() : now;
        const targetTime = deadline ? new Date(deadline).getTime() : baseTime + 5 * 60 * 1000;
        diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      } else if (isSearchingRider) {
        const baseTime = acceptedAt ? new Date(acceptedAt).getTime() : now;
        const targetTime = deadline ? new Date(deadline).getTime() : baseTime + 2 * 60 * 1000;
        diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      } else if (isDeliveryWaiting) {
        const baseTime = deliveryAssignedAt || readyAt ? new Date(deliveryAssignedAt || readyAt!).getTime() : now;
        const targetTime = deadline ? new Date(deadline).getTime() : baseTime + 2 * 60 * 1000;
        diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      }
      setRemainingSec((prev) => (prev === diff ? prev : diff));
      if (diff === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [placedAt, deadline, acceptedAt, readyAt, deliveryAssignedAt, isNew, isSearchingRider, isDeliveryWaiting]);

  if (normStage === "cancelled") {
    if (autoCancelled || (cancellationReason && cancellationReason.toLowerCase().includes("sla"))) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-700">
          <AlertTriangle className="size-3 text-rose-600" />
          <span>SLA Expired (Auto-Cancelled)</span>
        </span>
      );
    }
    return null;
  }

  if (isRider2Active) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-300 px-2 py-0.5 text-[10px] font-black shadow-xs"
        title="Rider 1 breached 2m SLA. Rider 2 auto-assigned with +₹20 bonus pool transferred from Rider 1."
      >
        <span className="flex size-1.5 rounded-full bg-purple-600 animate-ping" />
        <span>Rider 2 Assigned (+₹{reassignmentPool || 20} Pool) · Arriving at Store</span>
      </div>
    );
  }

  if (!isNew && !isSearchingRider && !isDeliveryWaiting) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isUrgent = remainingSec <= 45;

  if (isNew) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black transition-all ${
          isUrgent
            ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse ring-1 ring-rose-300"
            : "bg-amber-50 text-amber-800 border border-amber-300"
        }`}
        title="Accept within 5 minutes SLA to prevent automatic order cancellation"
      >
        <Clock className={`size-3 ${isUrgent ? "text-rose-600 animate-spin" : "text-amber-600"}`} />
        <span>
          {remainingSec > 0 ? `Accept SLA: ${formatted}` : "SLA Expiring..."}
        </span>
      </div>
    );
  }

  if (isSearchingRider) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black ${
          remainingSec <= 30
            ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse"
            : "bg-sky-50 text-sky-800 border border-sky-300"
        }`}
        title="Rider pickup assignment 2-minute SLA window"
      >
        <Clock className="size-3 text-sky-600" />
        <span>
          {remainingSec > 0 ? `Rider Search SLA: ${formatted}` : "Rider SLA Expiring..."}
        </span>
      </div>
    );
  }

  // isDeliveryWaiting
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black ${
        isUrgent
          ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse"
          : "bg-blue-50 text-blue-800 border border-blue-300"
      }`}
      title="Rider must reach partner store within 2 minutes SLA or auto-reassign to Rider 2"
    >
      <Clock className={`size-3 ${isUrgent ? "text-rose-600 animate-spin" : "text-blue-600"}`} />
      <span>
        {remainingSec > 0 ? `Rider Store Arrival SLA: ${formatted}` : "2m SLA Breached · Reassigning Rider 2..."}
      </span>
    </div>
  );
}
