import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Clock,
  CreditCard,
  Headphones,
  Loader2,
  MessageSquare,
  Package,
  RefreshCcw,
  ShieldAlert,
  Shirt,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ChangeEvent, RefObject } from "react";

import type { SupportTicket, TicketCategory } from "@/api/customer/help-api";
import type { OrderRecord } from "@/api/customer/history-api";
import { getStatusBadgeStyle } from "./support-utils";

interface CategoryOption {
  id: TicketCategory;
  label: string;
  icon: LucideIcon;
  requiresPhoto?: boolean;
}

const ORDER_CATEGORIES: CategoryOption[] = [
  { id: "wash-quality", label: "Wash / Quality", icon: Shirt, requiresPhoto: true },
  { id: "missing-garment", label: "Missing / Wrong Item", icon: Package, requiresPhoto: true },
  { id: "delay", label: "Pickup / Delivery Delay", icon: Clock },
  { id: "payment", label: "Billing & Refund", icon: CreditCard },
];

const GENERAL_CATEGORIES: CategoryOption[] = [
  { id: "payment", label: "Payment & Wallet", icon: CreditCard },
  { id: "refund", label: "Refund Status", icon: RefreshCcw },
  { id: "partner-complaint", label: "Store / Captain", icon: ShieldAlert },
  { id: "general", label: "General Inquiry", icon: MessageSquare },
];

const SUB_REASONS: Record<string, string[]> = {
  "wash-quality": [
    "Stains not removed",
    "Fabric damaged / torn",
    "Color bleeding / faded",
    "Improper steam press",
  ],
  "missing-garment": [
    "Item missing from bag",
    "Received wrong garment",
    "Tag or hanger missing",
  ],
  delay: [
    "Captain late for pickup",
    "Delivery slot missed",
    "Unable to reach captain",
  ],
  payment: [
    "Double charged on UPI / Card",
    "Refund pending in wallet",
    "Coupon discount missing",
  ],
  refund: [
    "Refund not credited yet",
    "Incorrect refund amount",
    "Cancel & refund request",
  ],
  "partner-complaint": [
    "Store behavior concern",
    "Captain delivery issue",
    "Packaging concern",
  ],
  general: [
    "Quick+ membership help",
    "Pricing or service inquiry",
    "Account or address issue",
  ],
};

interface OrderSupportViewProps {
  order: OrderRecord | null;
  existingOrderTickets: SupportTicket[];
  supportPhone: string;
  category: TicketCategory;
  subReason: string;
  description: string;
  photos: string[];
  submitting: boolean;
  uploadingPhotos: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onSelectCategory: (category: TicketCategory) => void;
  onSelectSubReason: (reason: string) => void;
  onChangeDescription: (value: string) => void;
  onPhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onSubmit: () => void;
  onOpenTicket: (ticket: SupportTicket) => void;
}

export function OrderSupportView({
  order,
  existingOrderTickets,
  supportPhone,
  category,
  subReason,
  description,
  photos,
  submitting,
  uploadingPhotos,
  fileInputRef,
  onBack,
  onSelectCategory,
  onSelectSubReason,
  onChangeDescription,
  onPhotoSelect,
  onRemovePhoto,
  onSubmit,
  onOpenTicket,
}: OrderSupportViewProps) {
  const categories = order ? ORDER_CATEGORIES : GENERAL_CATEGORIES;
  const isPhotoRequired = category === "wash-quality" || category === "missing-garment";
  const reasonOptions = SUB_REASONS[category] || SUB_REASONS.general || [];

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <div className="relative mx-auto w-full max-w-md">
        {/* Safe-area Sticky Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/95 px-4 pb-3 pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe backdrop-blur-md shadow-2xs">
          <button
            type="button"
            aria-label="Back to support hub"
            onClick={onBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="size-4.5 stroke-[2.2]" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-black tracking-tight text-zinc-950">
              {order ? `Order #${order.id} Support` : "Raise Support Ticket"}
            </h1>
            <p className="truncate text-[10px] font-medium text-zinc-500">
              {order ? `${order.store} · ${order.status}` : "Payment, Quick+ or account help"}
            </p>
          </div>

          <a
            href={`tel:${supportPhone}`}
            aria-label="Call support"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Headphones className="size-4 stroke-[2.2]" />
          </a>
        </header>

        <div className="px-4 pt-4 space-y-4">
          {/* Pinned Order Context Card */}
          {order ? (
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <Package className="size-4 stroke-[2.2]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-zinc-950 font-mono">
                      #{order.id}
                    </p>
                    <p className="truncate text-[11px] font-medium text-zinc-500">
                      {order.store}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-zinc-950 tabular-nums font-mono">
                  ₹{order.total}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-[11px] text-zinc-700">
                {order.items.length > 0
                  ? order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")
                  : order.service}
              </div>

              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <span className="text-zinc-500">{order.placedOn}</span>
                <Link
                  to="/track/$orderId"
                  params={{ orderId: order.orderId || order.id }}
                  className="font-bold text-zinc-800 hover:underline flex items-center gap-0.5"
                >
                  <span>View Order</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </section>
          ) : null}

          {/* Existing Tickets on This Order */}
          {existingOrderTickets.length > 0 ? (
            <section className="space-y-2">
              <p className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Existing Tickets on This Order
              </p>
              <div className="space-y-2">
                {existingOrderTickets.map((tkt) => {
                  const badge = getStatusBadgeStyle(tkt.status);
                  return (
                    <button
                      key={tkt.id}
                      type="button"
                      onClick={() => onOpenTicket(tkt)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-950 font-mono">
                            #{tkt.ticketNumber}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-zinc-700">
                          {tkt.subject}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-zinc-800">
                        Open Chat →
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Issue Category Selector */}
          <section className="space-y-2">
            <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Select Issue Type
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((opt) => {
                const Icon = opt.icon;
                const selected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectCategory(opt.id)}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      selected
                        ? "border-2 border-zinc-900 bg-zinc-50 shadow-2xs"
                        : "border-zinc-200/80 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${
                        selected
                          ? "border-zinc-300 bg-white text-zinc-900"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}
                    >
                      <Icon className="size-4 stroke-[2.2]" />
                    </span>
                    <span className="text-xs font-bold leading-tight text-zinc-950">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {reasonOptions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {reasonOptions.map((reason) => {
                  const active = subReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => onSelectSubReason(active ? "" : reason)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                        active
                          ? "bg-[#0c831f] text-white"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          {/* Photo Proof & Details Card */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-zinc-950">
                {isPhotoRequired ? "Garment Photo Proof" : "Attach Photo (Optional)"}
              </p>
              {isPhotoRequired ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                  Required
                </span>
              ) : null}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={onPhotoSelect}
              accept="image/*"
              multiple
              className="hidden"
            />

            <div className="flex flex-wrap gap-2.5">
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="relative size-18 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                >
                  <img src={photo} alt="Issue proof" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(idx)}
                    className="absolute right-1 top-1 rounded-full bg-zinc-900/75 p-1 text-white hover:bg-zinc-900 cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {photos.length < 3 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-18 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#0c831f]/50 bg-emerald-50/40 text-[#0c831f] transition-colors hover:bg-emerald-50 cursor-pointer"
                >
                  <Camera className="size-4.5 stroke-[2.2]" />
                  <span className="mt-1 text-[10px] font-black">
                    {photos.length === 0 ? "Add Photo" : "Add More"}
                  </span>
                </button>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Describe the issue
              </label>
              <textarea
                value={description}
                onChange={(e) => onChangeDescription(e.target.value)}
                placeholder="Share clear details so our care team can resolve this quickly..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-xs font-medium text-zinc-950 placeholder:text-zinc-400 focus:border-[#0c831f] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] text-xs font-black text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{uploadingPhotos ? "Uploading photos..." : "Creating ticket..."}</span>
                </>
              ) : (
                <span>Raise Ticket &amp; Start Live Chat →</span>
              )}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

