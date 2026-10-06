import React from "react";
import {
  Check,
  CircleDashed,
  XCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  Store,
  Bike,
  Truck,
  PackageCheck,
  KeyRound,
  Navigation,
  Award,
  Phone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import {
  STAGE_TIMELINE_INDEX,
  TIMELINE_STEPS,
  type ManagedOrder,
} from "../../data/partner-orders-mock";

function formatTimelineTime(time?: string): string {
  if (!time) return "Completed";
  if (
    time.includes("ago") ||
    time === "Just now" ||
    time === "Completed" ||
    time === "Pending"
  ) {
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

const STEP_ICONS: Record<string, React.FC<{ className?: string }>> = {
  pending: ShoppingBag,
  accepted: Store,
  pickup_pending: Bike,
  picked: CheckCircle2,
  processing: Sparkles,
  ready: PackageCheck,
  delivery_assigned: Truck,
  dispatch: KeyRound,
  out_for_delivery: Navigation,
  delivered: Award,
};

const STEP_SUBTEXTS: Record<string, string> = {
  pending: "Order placed by customer & waiting for store confirmation",
  accepted: "Store confirmed laundry processing capacity within SLA",
  pickup_pending: "Captain dispatched to collect dirty garments from customer",
  picked: "Garments collected from customer & bag tagged with OTP check",
  processing: "Washing, stain removal, steam pressing & garment care in store",
  ready: "Garments packaged in branded laundry bag & quality checked",
  delivery_assigned: "Delivery Captain assigned & dispatched to store hub",
  dispatch: "Garments handed over to delivery captain with dispatch OTP",
  out_for_delivery: "Captain en route with clean clothes to customer doorstep",
  delivered: "Customer received clothes, OTP verified & order completed",
};

/** High-Fidelity Vertical status timeline: Pending → Accepted → … → Delivered. */
export function OrderTimeline({
  order,
  timeline: propTimeline,
  stage: propStage,
}: {
  order?: ManagedOrder;
  timeline?: { id: string; label: string; time: string; done?: boolean; current?: boolean }[];
  stage?: string;
}) {
  const currentStage = (order?.stage || propStage || "new") as string;
  const activeIndex = STAGE_TIMELINE_INDEX[currentStage] ?? 0;
  const cancelled = currentStage === "cancelled";
  const timelineList = order?.timeline || propTimeline || [];
  const cancelReason =
    (order as any)?.cancellationReason ||
    (order as any)?.cancelledReason ||
    (order as any)?.rejectReason ||
    "";
  const isSlaBreached =
    cancelReason.toLowerCase().includes("sla") ||
    (order as any)?.autoCancelled ||
    (order as any)?.slaBreached;

  const totalSteps = TIMELINE_STEPS.length;
  const completedSteps = cancelled
    ? 0
    : Math.min(totalSteps, activeIndex + 1);
  const progressPercent = cancelled
    ? 0
    : Math.round((completedSteps / totalSteps) * 100);

  const riderObj = (order as any)?.rider;
  const pickupOtp = (order as any)?.pickupOtp || (order as any)?.otp?.pickup?.code;
  const dispatchOtp = (order as any)?.dispatchOtp || (order as any)?.otp?.dispatch?.code;
  const deliveryOtp = (order as any)?.deliveryOtp || (order as any)?.otp?.delivery?.code;

  return (
    <div className="space-y-4">
      {/* 1. Overall Progress Header Bar */}
      {!cancelled && (
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Current Stage:</span>
              <span className="font-black text-zinc-950 dark:text-white capitalize">
                {TIMELINE_STEPS[activeIndex]?.label || "In Progress"}
              </span>
            </span>
            <span className="text-[11px] font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {progressPercent}% Complete
            </span>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Cancellation / SLA Breach Alert Box */}
      {cancelled && (
        <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 p-4 animate-in fade-in space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-rose-600 text-white font-black text-xs shadow-xs">
              <XCircle className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black text-rose-900 dark:text-rose-200">
                {isSlaBreached
                  ? "Order Auto-Cancelled (Platform SLA Breach)"
                  : "Order Cancelled & Closed"}
              </p>
              <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                Double-entry escrow reversed · Zero partner penalty on automatic SLA timeouts
              </p>
            </div>
          </div>
          <p className="text-xs font-medium text-rose-800 dark:text-rose-300 leading-relaxed bg-white/80 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/80">
            {cancelReason || "This order was cancelled and closed."}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
            <ShieldCheck className="size-3 text-rose-600" />
            <span>Customer automated refund triggered directly to source account</span>
          </div>
        </div>
      )}

      {/* 3. Interactive Stepper List */}
      <ol className="relative pl-1">
        {TIMELINE_STEPS.map((step, index) => {
          const entry = timelineList[index];
          const hasTime = Boolean(entry?.time && entry.time !== "Pending" && entry.time !== "");
          const done = !cancelled ? index <= activeIndex : Boolean(entry?.done || hasTime);
          const current = !cancelled && index === activeIndex;
          const isLast = index === TIMELINE_STEPS.length - 1;
          const StepIcon = STEP_ICONS[step.key] || CircleDashed;

          return (
            <li key={step.key} className="flex gap-3.5 group">
              {/* Left Column: Icon Circle & Connector Line */}
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 shadow-2xs ${
                    done
                      ? "bg-emerald-600 text-white shadow-emerald-500/20"
                      : current
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 animate-pulse"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {done ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : (
                    <StepIcon className="size-4" />
                  )}
                </span>
                {!isLast && (
                  <span
                    className={`my-1 w-0.5 flex-1 transition-colors duration-500 ${
                      done
                        ? "bg-emerald-500"
                        : current
                        ? "bg-blue-300 dark:bg-blue-800"
                        : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                )}
              </div>

              {/* Right Column: Step Label, Subtext & Badges */}
              <div className={isLast ? "pb-2 flex-1" : "pb-5 flex-1"}>
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`text-xs font-black tracking-tight ${
                      done
                        ? "text-zinc-950 dark:text-white"
                        : current
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 dark:text-zinc-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <span
                    className={`text-[10px] font-semibold shrink-0 ${
                      done
                        ? "text-emerald-700 dark:text-emerald-400 font-bold"
                        : current
                        ? "text-blue-600 dark:text-blue-400 font-bold"
                        : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {done
                      ? formatTimelineTime(entry?.time)
                      : cancelled
                      ? "Cancelled"
                      : "Pending"}
                  </span>
                </div>

                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  {STEP_SUBTEXTS[step.key]}
                </p>

                {/* Current Stage Highlight Pill */}
                {current && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    <span className="size-1.5 rounded-full bg-blue-600 animate-ping" />
                    <span>In Progress Now</span>
                  </div>
                )}

                {/* Contextual Badges */}
                {/* Rider Info Pill for pickup / delivery steps */}
                {(step.key === "pickup_pending" || step.key === "delivery_assigned") && riderObj && (
                  <div className="mt-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                        🛵
                      </div>
                      <div>
                        <p className="font-black text-zinc-900 dark:text-white text-[11px]">
                          Captain: {riderObj.name || "Assigned"}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {riderObj.vehicleNumber || "QuickPress Delivery Bike"}
                        </p>
                      </div>
                    </div>
                    {riderObj.phone && (
                      <a
                        href={`tel:${riderObj.phone}`}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <Phone className="size-2.5" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Pickup OTP Badge */}
                {step.key === "picked" && pickupOtp && (
                  <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold">
                    <span>Pickup OTP:</span>
                    <span className="font-black">{pickupOtp} ✓</span>
                  </div>
                )}

                {/* Dispatch OTP Badge */}
                {step.key === "dispatch" && (
                  <div className="mt-1.5 inline-flex items-center gap-1 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 text-[10px] font-mono font-bold">
                    <span>Dispatch OTP:</span>
                    <span className="font-black">{dispatchOtp || "Required at handoff"}</span>
                  </div>
                )}

                {/* Delivery OTP Badge */}
                {step.key === "delivered" && deliveryOtp && (
                  <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold">
                    <span>Delivery OTP:</span>
                    <span className="font-black">{deliveryOtp} ✓</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
