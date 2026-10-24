import { Clock3, IndianRupee, Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import {
  categoryLabel,
  formatTurnaround,
  formatUpdated,
  unitSuffix,
  type ManagedService,
  type ServiceOffer,
} from "../../data/partner-services-mock";
import { serviceIcon } from "./service-icons";

/** Pure White Zomato Merchant Service & Rate Card item */
export function ServiceCard({
  service,
  offers = [],
  index = 0,
  onToggle,
  onToggleEnabled,
  onEdit,
  onViewDetails,
  onOpenDetails,
}: {
  service: ManagedService;
  offers?: ServiceOffer[];
  index?: number;
  onToggle?: () => void;
  onToggleEnabled?: (id: string) => void;
  onEdit?: () => void;
  onViewDetails?: () => void;
  onOpenDetails?: (s: ManagedService) => void;
}) {
  const Icon = serviceIcon(service.icon);
  const isPending = Boolean(service.pendingApproval || service.approvalStatus === "pending");
  const isRejected = service.approvalStatus === "rejected";

  const handleToggle = () => {
    if (isPending) {
      toast.error("Yeh service Admin review ke liye pending hai. Approval ke baad hi live hogi!");
      return;
    }
    if (isRejected) {
      toast.error(`Service Admin ne reject kar di: ${service.rejectionReason || "Please edit and resubmit."}`);
      return;
    }
    if (onToggle) {
      onToggle();
    } else if (onToggleEnabled) {
      onToggleEnabled(service.id);
    }
  };

  const handleView = () => {
    if (onViewDetails) {
      onViewDetails();
    } else if (onOpenDetails) {
      onOpenDetails(service);
    }
  };

  return (
    <article
      className="card-soft animate-rise group flex flex-col justify-between border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md rounded-2xl relative select-none"
      style={{ animationDelay: `${(index % 6) * 50}ms` }}
    >
      <div>
        <div className="flex items-start gap-3.5">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 border ${
              isPending
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : isRejected
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : service.enabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs"
                : "bg-zinc-100 text-zinc-500 border-zinc-200"
            }`}
          >
            <Icon className="size-5.5" strokeWidth={2.2} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black tracking-tight text-zinc-950">
                  {service.name}
                </h3>
                <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                  {categoryLabel(service.category)}
                </p>
              </div>

              {/* Instant In-Stock / Availability Switch (Zomato Style) */}
              <button
                type="button"
                role="switch"
                aria-checked={service.enabled}
                aria-label={`Toggle ${service.name}`}
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPending
                    ? "bg-amber-300 cursor-not-allowed opacity-80"
                    : isRejected
                    ? "bg-rose-300 cursor-not-allowed opacity-80"
                    : service.enabled
                    ? "bg-emerald-600 shadow-xs"
                    : "bg-zinc-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    service.enabled && !isPending && !isRejected ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-zinc-600">
              {service.description}
            </p>
          </div>
        </div>

        {/* Badges strip */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <StatusPill
            enabled={service.enabled}
            pendingApproval={isPending}
            approvalStatus={service.approvalStatus}
            rejectionReason={service.rejectionReason}
          />
          <Chip icon={Clock3} label={formatTurnaround(service.estimatedHours)} />
          {service.ordersThisMonth > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold tracking-tight text-emerald-800">
              <TrendingUp className="size-3 text-emerald-600" />
              {service.ordersThisMonth} orders
            </span>
          ) : null}
          {offers.map((offer) => (
            <span
              key={offer.id}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-black tracking-tight text-emerald-900"
            >
              🏷️ {offer.type === "flat" ? `₹${offer.value} off` : `${offer.value}% off`}
            </span>
          ))}
        </div>
      </div>

      {/* Price & Action Buttons */}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3.5">
        <div>
          <span className="flex items-center gap-0.5 text-xl font-black tracking-tight text-zinc-950">
            <IndianRupee className="size-4.5 text-zinc-800" strokeWidth={2.4} />
            {service.price}
            <span className="text-xs font-bold text-zinc-500 ml-0.5">
              {unitSuffix(service.unit)}
            </span>
          </span>
          <p className="text-[10.5px] font-medium text-zinc-500 mt-0.5">
            Updated {formatUpdated(service.updatedMinutesAgo)} · Min ₹{service.minOrderValue}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleView}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 transition-all hover:bg-zinc-50 active:scale-95 cursor-pointer shadow-2xs"
          >
            Details
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${service.name}`}
              className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Pencil className="size-3 text-emerald-600" />
              Edit
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function StatusPill({
  enabled,
  pendingApproval,
  approvalStatus,
  rejectionReason,
}: {
  enabled: boolean;
  pendingApproval?: boolean;
  approvalStatus?: string;
  rejectionReason?: string;
}) {
  if (pendingApproval || approvalStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-black tracking-tight text-amber-800 border border-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
        ⏳ Pending Approval
      </span>
    );
  }
  if (approvalStatus === "rejected") {
    return (
      <span
        title={rejectionReason}
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-black tracking-tight text-rose-800 border border-rose-300"
      >
        <span className="size-1.5 rounded-full bg-rose-500" />
        ❌ Rejected
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-black tracking-tight border ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-zinc-200 bg-zinc-100 text-zinc-600"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${enabled ? "bg-emerald-600" : "bg-zinc-400"}`}
      />
      {enabled ? "Live 🟢" : "Paused ⏸️"}
    </span>
  );
}

function Chip({
  icon: Icon,
  label,
}: {
  icon: typeof Clock3;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10.5px] font-semibold tracking-tight text-zinc-700">
      <Icon className="size-3 text-zinc-500" />
      {label}
    </span>
  );
}
