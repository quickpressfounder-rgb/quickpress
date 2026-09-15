import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface OrderSlaCountdownProps {
  placedAt?: string;
  deadline?: string;
  acceptedAt?: string;
  stage: string;
  autoCancelled?: boolean;
  cancellationReason?: string;
}

export function OrderSlaCountdown({
  placedAt,
  deadline,
  acceptedAt,
  stage,
  autoCancelled,
  cancellationReason,
}: OrderSlaCountdownProps) {
  const isNew = stage === "new" || stage === "placed" || stage === "pending";
  const isSearchingRider = stage === "accepted" || stage === "pickup_pending";

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
    return 0;
  });

  useEffect(() => {
    if (!isNew && !isSearchingRider) return;

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
      }
      setRemainingSec((prev) => (prev === diff ? prev : diff));
      if (diff === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [placedAt, deadline, acceptedAt, isNew, isSearchingRider]);

  if (stage === "cancelled") {
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

  if (!isNew && !isSearchingRider) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isUrgent = remainingSec <= 60;

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

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black ${
        remainingSec <= 30
          ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse"
          : "bg-sky-50 text-sky-800 border border-sky-300"
      }`}
      title="Rider assignment 2-minute SLA window"
    >
      <Clock className="size-3 text-sky-600" />
      <span>
        {remainingSec > 0 ? `Rider Search SLA: ${formatted}` : "Rider SLA Expiring..."}
      </span>
    </div>
  );
}
