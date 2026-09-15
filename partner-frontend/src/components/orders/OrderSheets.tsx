import { Bike, Download, FileText, Info, Loader2, Printer, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { ManagedOrder } from "../../data/partner-orders-mock";
import {
  downloadPartnerInvoicePdfBlob,
  getPartnerOrderInvoicePdfUrl,
} from "../../api/partner/partner-finance-api";

function Sheet({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="animate-sheet-up relative w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-soft sm:rounded-3xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
              {icon}
            </span>
            <h3 className="truncate text-sm font-black tracking-tight text-foreground">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

const REJECT_REASONS = [
  "Store at full capacity",
  "Outside my pickup radius",
  "Items not serviced here",
  "Pickup slot unavailable",
];

export function RejectOrderSheet({
  order,
  onClose,
  onConfirm,
}: {
  order: ManagedOrder;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(REJECT_REASONS[0] ?? "");

  return (
    <Sheet title={`Reject ${order.code}`} icon={<X className="size-4" />} onClose={onClose}>
      <div className="space-y-2">
        {REJECT_REASONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setReason(option)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-xs font-bold tracking-tight transition-all duration-300 ${
              reason === option
                ? "border-primary bg-primary/10 text-brand-dark"
                : "border-border bg-card text-muted-foreground hover:border-primary/60"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onConfirm(reason)}
        className="ripple mt-4 w-full rounded-2xl border border-destructive/30 bg-destructive/10 py-3.5 text-sm font-black tracking-tight text-destructive transition-all duration-300 active:scale-[0.97]"
      >
        Confirm rejection
      </button>
    </Sheet>
  );
}

const RIDERS = [
  { id: "r1", name: "Sanjay K.", eta: "6 min away", rating: 4.8 },
  { id: "r2", name: "Rajesh P.", eta: "11 min away", rating: 4.6 },
  { id: "r3", name: "Imtiaz A.", eta: "18 min away", rating: 4.9 },
];

export function AssignRiderSheet({
  order,
  onClose,
  onAssign,
}: {
  order: ManagedOrder;
  onClose: () => void;
  onAssign: (riderName: string) => void;
}) {
  return (
    <Sheet title={`Assign rider · ${order.code}`} icon={<Bike className="size-4" />} onClose={onClose}>
      <p className="mb-3 text-[0.7rem] font-semibold text-muted-foreground">
        Rider allocation is a UI placeholder — dispatch will be wired to the rider network later.
      </p>
      <div className="space-y-2">
        {RIDERS.map((rider) => (
          <button
            key={rider.id}
            type="button"
            onClick={() => onAssign(rider.name)}
            className="ripple flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.98]"
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-black tracking-tight text-foreground">
                {rider.name}
              </span>
              <span className="block text-[0.68rem] font-semibold text-muted-foreground">
                {rider.eta} · ★ {rider.rating}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-[0.65rem] font-bold text-brand-dark">
              Assign
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function InvoiceSheet({ order, onClose }: { order: ManagedOrder; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const orderId = order.id || order.code;
  const invoiceNumber =
    order.invoiceNo ||
    `QP/2026/${(order.code || "").replace(/\D/g, "").padStart(6, "0") || "001234"}`;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadPartnerInvoicePdfBlob(orderId, `QuickPress-Tax-Invoice-${order.code}.pdf`);
      toast.success("Tax Invoice PDF downloaded successfully!");
    } catch {
      const url = getPartnerOrderInvoicePdfUrl(orderId);
      window.open(url, "_blank", "noopener");
      toast.success("Opening Tax Invoice PDF...");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const url = getPartnerOrderInvoicePdfUrl(orderId);
    window.open(url, "_blank", "noopener");
  };

  return (
    <Sheet title="Tax Invoice & Cash Receipt" icon={<FileText className="size-4" />} onClose={onClose}>
      <div className="space-y-4">
        {/* Header Card */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Official Tax Invoice
              </p>
              <h4 className="mt-0.5 text-sm font-black text-foreground">{invoiceNumber}</h4>
              <p className="text-xs font-semibold text-muted-foreground">Order: {order.code}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                order.paymentStatus === "paid"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              }`}
            >
              {order.paymentStatus === "paid" ? "Paid" : "Pay on Delivery"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-dashed border-border/80 pt-3 text-[11px]">
            <div>
              <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Billed To</p>
              <p className="font-black text-foreground">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-muted-foreground font-medium">Verified Customer</p>
              )}
            </div>
            <div>
              <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Store Hub</p>
              <p className="font-black text-foreground">QuickPress Partner Hub</p>
              <p className="text-muted-foreground font-medium">GSTIN: 29AABCQ1234P1ZV</p>
            </div>
          </div>
        </div>

        {/* Itemized Services Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Billed Items ({order.items?.length || 1})
          </p>
          <div className="mt-2.5 divide-y divide-border/60">
            {!order.items || order.items.length === 0 ? (
              <div className="flex justify-between py-1.5 text-xs">
                <span className="font-semibold text-foreground">Standard Laundry Service</span>
                <span className="font-bold text-foreground">₹{order.charges.subtotal}</span>
              </div>
            ) : (
              order.items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between py-1.5 text-xs">
                  <div>
                    <span className="font-bold text-foreground">{item.name}</span>
                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                      ({item.qty} × ₹{item.price})
                    </span>
                  </div>
                  <span className="font-bold text-foreground">₹{item.qty * item.price}</span>
                </div>
              ))
            )}
          </div>

          {/* Charges and Tax breakdown */}
          <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground font-medium">
              <span>Item Subtotal</span>
              <span className="font-semibold text-foreground">₹{order.charges.subtotal}</span>
            </div>
            {order.charges.pickupFee > 0 && (
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Pickup & Delivery Fee</span>
                <span className="font-semibold text-foreground">₹{order.charges.pickupFee}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground font-medium">
              <span>GST (CGST 2.5% + SGST 2.5%)</span>
              <span className="font-semibold text-foreground">₹{order.charges.taxes}</span>
            </div>
            {order.charges.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied</span>
                <span>−₹{order.charges.discount}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-sm font-black text-foreground">
              <span>Total Bill Value</span>
              <span className="text-primary font-black">₹{order.charges.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Download PDF & Print */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 dark:bg-white px-4 py-3 text-xs font-black text-white dark:text-zinc-900 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs font-black text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all"
          >
            <Printer className="size-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function CancelReasonSheet({ order, onClose }: { order: ManagedOrder; onClose: () => void }) {
  return (
    <Sheet title="Cancellation reason" icon={<Info className="size-4" />} onClose={onClose}>
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-xs font-bold tracking-tight text-destructive">
          {order.cancelReason ?? "No reason recorded for this order."}
        </p>
        <p className="mt-2 text-[0.68rem] font-semibold text-muted-foreground">
          {order.code} · {order.placedAt}
        </p>
      </div>
    </Sheet>
  );
}
