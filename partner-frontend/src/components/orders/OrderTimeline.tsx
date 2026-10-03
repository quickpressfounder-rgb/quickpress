import { Check, CircleDashed, XCircle } from "lucide-react";

import {
  STAGE_TIMELINE_INDEX,
  TIMELINE_STEPS,
  type ManagedOrder,
} from "../../data/partner-orders-mock";

function formatTimelineTime(time?: string): string {
  if (!time) return "Completed";
  if (time.includes("ago") || time === "Just now" || time === "Completed" || time === "Pending") {
    return time;
  }
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time;
  }
}

/** Vertical status timeline: Pending → Accepted → … → Delivered. */
export function OrderTimeline({
  order,
  timeline: propTimeline,
  stage: propStage,
}: {
  order?: ManagedOrder;
  timeline?: { id: string; label: string; time: string; done?: boolean }[];
  stage?: string;
}) {
  const currentStage = (order?.stage || propStage || "new") as any;
  const activeIndex = STAGE_TIMELINE_INDEX[currentStage] ?? 0;
  const cancelled = currentStage === "cancelled";
  const timelineList = order?.timeline || propTimeline || [];
  const cancelReason = (order as any)?.cancellationReason || (order as any)?.cancelledReason || (order as any)?.rejectReason || "";
  const isSlaBreached = cancelReason.toLowerCase().includes("sla") || (order as any)?.autoCancelled || (order as any)?.slaBreached;

  return (
    <div className="space-y-4">
      {cancelled && (
        <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-destructive text-white font-black text-xs">
              ✕
            </span>
            <p className="text-xs font-black text-destructive">
              {isSlaBreached ? "Order Auto-Cancelled (Platform SLA Breach)" : "Order Cancelled"}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-destructive/90 leading-relaxed">
            {cancelReason || "This order was cancelled and closed."}
          </p>
        </div>
      )}

      <ol className="relative">
        {TIMELINE_STEPS.map((step, index) => {
          const entry = timelineList[index];
          const hasTime = Boolean(entry?.time && entry.time !== "Pending" && entry.time !== "");
          const done = !cancelled ? index <= activeIndex : Boolean(entry?.done || hasTime);
          const current = !cancelled && index === activeIndex;
          const isLast = index === TIMELINE_STEPS.length - 1;

          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                    done
                      ? "bg-secondary/15 text-brand-green-dark"
                      : "bg-muted text-muted-foreground"
                  } ${current ? "ring-2 ring-primary/40" : ""}`}
                >
                  {done ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : (
                    <CircleDashed className="size-4" />
                  )}
                </span>
                {!isLast ? (
                  <span
                    className={`my-1 w-px flex-1 transition-colors duration-500 ${
                      done ? "bg-brand-green/50" : "bg-border"
                    }`}
                  />
                ) : null}
              </div>
              <div className={isLast ? "pb-0" : "pb-5"}>
                <p
                  className={`text-sm font-bold tracking-tight ${
                    done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[0.68rem] font-semibold text-muted-foreground">
                  {done ? formatTimelineTime(entry?.time) : cancelled ? "Cancelled before stage" : "Pending"}
                </p>
                {current ? (
                  <span className="mt-1 inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-brand-dark">
                    Current
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
