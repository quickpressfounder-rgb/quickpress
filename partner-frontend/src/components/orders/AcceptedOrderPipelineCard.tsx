import React from "react";
import {
  Bike,
  Check,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Sparkles,
  WashingMachine,
  X,
} from "lucide-react";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { inr } from "../../lib/currency";
import type { OrderActionId } from "./order-actions";
import {
  CardHandoverOtpInput,
  DirectContactActions,
  GarmentSummaryChips,
  PrintBagTagButton,
} from "./OrderQuickTools";

interface AcceptedOrderPipelineCardProps {
  order: ManagedOrder;
  busy?: boolean;
  isConfirmedHandover?: boolean;
  onVerifyDispatchOtp: (orderId: string, otp: string) => Promise<void>;
  onAction: (order: ManagedOrder, action: OrderActionId) => void;
  onDismiss?: () => void;
}

const PIPELINE_STEPS = [
  { id: "accepted", label: "Accepted" },
  { id: "captain", label: "Captain Pickup" },
  { id: "washing", label: "In Washing" },
  { id: "ready", label: "Ready" },
] as const;

function resolvePipelineStepIndex(stage: string, isConfirmedHandover: boolean): number {
  if (stage === "ready" || stage === "completed") return 3;
  if (
    stage === "processing" ||
    stage === "washing" ||
    stage === "dry_cleaning" ||
    stage === "ironing"
  ) {
    return 2;
  }
  if (isConfirmedHandover || stage === "at_partner") return 2;
  if (stage === "accepted" || stage === "pickup_pending") return 1;
  return 0;
}

/**
 * Focused post-acceptance order card ("Accept Par").
 * Shows live 4-step pipeline, Captain assignment & 1-tap contact,
 * Print Bag Tag QR, and contextual Confirm Handover / Start Washing / Mark Ready / OTP actions.
 */
export function AcceptedOrderPipelineCard({
  order,
  busy = false,
  isConfirmedHandover = false,
  onVerifyDispatchOtp,
  onAction,
  onDismiss,
}: AcceptedOrderPipelineCardProps) {
  const stepIndex = resolvePipelineStepIndex(order.stage, isConfirmedHandover);
  const rider = order.assignedRider || order.rider;
  const riderName = rider?.name || rider?.fullName || "";
  const riderPhone = rider?.phone || rider?.mobile || "";

  const isWaitingCaptainPickup =
    !isConfirmedHandover && (order.stage === "accepted" || order.stage === "pickup_pending");
  const isAtPartnerReadyToWash = isConfirmedHandover || order.stage === "at_partner";
  const isProcessing =
    order.stage === "processing" ||
    order.stage === "washing" ||
    order.stage === "dry_cleaning" ||
    order.stage === "ironing";
  const isReady = order.stage === "ready";

  return (
    <section
      aria-label="Accepted Order Live Pipeline"
      className="rounded-2xl border border-emerald-200 bg-white shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Top Emerald Acceptance Banner */}
      <div className="flex items-center justify-between gap-3 bg-emerald-50/80 px-4 py-2.5 border-b border-emerald-200/70">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-emerald-950 truncate">
            Accepted Order · #{order.code}
          </span>
          {order.isExpress ? (
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Express
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-zinc-900 tabular-nums">
            {inr(order.amount)}
          </span>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close accepted spotlight"
              className="flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-emerald-100 hover:text-zinc-900 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 4-Step Horizontal Live Pipeline */}
        <div className="grid grid-cols-4 gap-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const completed = idx < stepIndex || (stepIndex === 3 && idx === 3);
            const active = idx === stepIndex && !completed;
            return (
              <div key={step.id} className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completed
                        ? "w-full bg-emerald-600"
                        : active
                          ? "w-2/3 bg-zinc-900 animate-pulse"
                          : "w-0 bg-zinc-200"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {completed ? (
                    <Check className="size-3 text-emerald-600 shrink-0" />
                  ) : null}
                  <span
                    className={`text-[11px] font-semibold truncate ${
                      completed
                        ? "text-emerald-800"
                        : active
                          ? "text-zinc-950 font-bold"
                          : "text-zinc-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Captain Status + Customer Pickup Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
                <Bike className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Pickup Captain
                </p>
                <p className="text-xs font-bold text-zinc-950 truncate mt-0.5">
                  {riderName || "Assigning nearest Captain..."}
                </p>
                <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                  {riderName
                    ? "En route for customer pickup & store drop"
                    : "Tag garments while dispatch completes"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-950 truncate">
                {order.customerName || "QuickPress Customer"}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 tabular-nums">
                {order.pickupTime || "Today"}
              </span>
            </div>
            {order.pickupAddress ? (
              <div className="flex items-start gap-1.5 text-[11px] font-medium text-zinc-600">
                <MapPin className="size-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{order.pickupAddress}</span>
              </div>
            ) : null}
            <DirectContactActions
              customerName={order.customerName}
              customerPhone={order.customerPhone}
              orderCode={order.code}
              riderName={riderName}
              riderPhone={riderPhone}
            />
          </div>
        </div>

        {/* Garment Chips & Instructions */}
        <div className="space-y-1.5">
          <GarmentSummaryChips
            items={order.items}
            itemCount={order.itemCount}
            services={order.services}
          />
          {order.specialInstructions ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50/70 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
              <Sparkles className="size-3.5 text-amber-600 shrink-0" />
              <span>{order.specialInstructions}</span>
            </div>
          ) : null}
        </div>

        {/* Ready Dispatch OTP Input if in Ready Stage */}
        {isReady ? (
          <CardHandoverOtpInput
            orderId={order.id}
            orderCode={order.code}
            onVerifyOtp={onVerifyDispatchOtp}
          />
        ) : null}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-100">
          <PrintBagTagButton
            order={{
              id: order.id,
              code: order.code,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              pickupAddress: order.pickupAddress,
              items: order.items,
              itemCount: order.itemCount,
              services: order.services,
              amount: order.amount,
              paymentMode: order.paymentMode,
              paymentStatus: order.paymentStatus,
              placedAt: order.placedAt,
              specialInstructions: order.specialInstructions,
            }}
          />

          <div className="flex items-center gap-2 ml-auto">
            {isWaitingCaptainPickup ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(order, "confirm_handover")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <PackageCheck className="size-3.5" />
                Confirm Shop Handover
              </button>
            ) : null}

            {isAtPartnerReadyToWash ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(order, "start_washing")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <WashingMachine className="size-3.5" />
                Start Washing
              </button>
            ) : null}

            {isProcessing ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(order, "mark_ready")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                Mark Ready
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

