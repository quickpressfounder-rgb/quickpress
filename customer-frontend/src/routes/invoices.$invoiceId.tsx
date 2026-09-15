import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Download, Loader2, Share2, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  downloadInvoice,
  downloadInvoicePdfBlob,
  getInvoicePdfUrl,
  fetchInvoice,
  formatInvoiceAmount,
  shareInvoice,
  type Invoice,
} from "@/api/customer/invoice-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice Details — QuickPress GST Bill" },
      {
        name: "description",
        content:
          "Itemised QuickPress invoice with services, quantities, GST breakdown, payment method and totals — download or share it in one tap.",
      },
      { property: "og:title", content: "Invoice Details — QuickPress" },
      {
        property: "og:description",
        content: "Itemised laundry invoice with GST breakdown, payment details and totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoiceDetailScreen,
});

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className={`text-xs ${strong ? "font-black text-foreground" : "font-semibold text-muted-foreground"}`}
      >
        {label}
      </span>
      <span
        className={`text-xs ${strong ? "font-black text-foreground" : "font-bold text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function InvoiceDetailScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const { invoiceId } = useParams({ from: "/invoices/$invoiceId" });
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);

  // GET /api/invoices/{invoiceId}
  const load = useCallback(
    async (forceRefresh = false) => {
      setError(null);
      try {
        const result = await fetchInvoice(invoiceId, { forceRefresh });
        if (result.status === "cancelled") {
          setError("Invoice is not available for cancelled orders.");
          setInvoice(null);
          return;
        }
        setInvoice(result);
        setOffline(typeof navigator !== "undefined" && !navigator.onLine);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "We couldn't load this invoice.");
      }
    },
    [invoiceId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onOnline = () => void load(true);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const handleDownload = async () => {
    setBusy("download");
    try {
      // Mark download count in backend
      void downloadInvoice(invoiceId).catch(() => {});
      const fileName = invoice?.invoiceNumber
        ? `QuickPress-${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`
        : `QuickPress-Invoice-${invoiceId}.pdf`;
      try {
        await downloadInvoicePdfBlob(invoiceId, fileName);
        toast.success("Tax Invoice PDF downloaded successfully!");
      } catch {
        const url = getInvoicePdfUrl(invoiceId);
        window.open(url, "_blank", "noopener");
        toast.success("Opening Tax Invoice PDF...");
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Download failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      const result = await shareInvoice(invoiceId, "whatsapp");
      toast.success(result.message || "Invoice shared");
      if (result.shareUrl) window.open(result.shareUrl, "_blank", "noopener");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Sharing failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="Invoice" onBack={() => navigate({ to: "/invoices" })} />

        <div className="px-5 pb-32 pt-4">
          {offline ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-2.5">
              <WifiOff className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-[0.68rem] font-semibold text-muted-foreground">
                Showing the saved copy of this invoice.
              </p>
            </div>
          ) : null}

          {error ? (
            <section className="card-soft border border-border p-6 text-center">
              <p className="text-sm font-bold text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => void load(true)}
                className="mt-4 rounded-full bg-gradient-to-r from-brand-green to-primary px-5 py-2.5 text-xs font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96]"
              >
                Try again
              </button>
            </section>
          ) : !invoice ? (
            <div className="space-y-3">
              <div className="h-28 animate-pulse rounded-3xl bg-muted/70" />
              <div className="h-52 animate-pulse rounded-3xl bg-muted/70" />
              <div className="h-40 animate-pulse rounded-3xl bg-muted/70" />
            </div>
          ) : (
            <>
              {/* Header */}
              <section className="rounded-3xl bg-gradient-to-br from-brand-dark via-brand-dark to-brand-green p-5 shadow-soft">
                <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-background/70">
                  {invoice.serviceLabel} · {invoice.invoiceDateLabel}
                </p>
                <p className="mt-1 text-xl font-black tracking-tight text-background">
                  {invoice.invoiceNumber}
                </p>
                <p className="mt-0.5 text-xs text-background/75">Order {invoice.orderNumber}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-background">
                  {formatInvoiceAmount(invoice.totals.grandTotal)}
                </p>
              </section>

              {/* Parties */}
              <section className="card-soft mt-4 border border-border p-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Billed by
                </h2>
                <p className="mt-1 text-sm font-black text-foreground">{invoice.partner.name}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.partner.addressLine} {invoice.partner.city}
                </p>
                <h2 className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Billed to
                </h2>
                <p className="mt-1 text-sm font-black text-foreground">{invoice.customer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.customer.addressLine} {invoice.customer.city}
                </p>
                <p className="text-xs text-muted-foreground">{invoice.customer.phone}</p>
              </section>

              {/* Items */}
              <section className="card-soft mt-4 border border-border p-4">
                <h2 className="text-sm font-black tracking-tight text-foreground">Items</h2>
                <div className="mt-3 divide-y divide-border">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[0.8rem] font-bold text-foreground">
                          {item.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.quantity} × {formatInvoiceAmount(item.unitPrice)}
                          {item.description ? ` · ${item.description}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-[0.8rem] font-black text-foreground">
                        {formatInvoiceAmount(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Totals + GST */}
              <section className="card-soft mt-4 border border-border p-4">
                <h2 className="text-sm font-black tracking-tight text-foreground">Bill summary</h2>
                <div className="mt-2 divide-y divide-border">
                  <div>
                    <Row
                      label="Items total"
                      value={formatInvoiceAmount(invoice.totals.itemsTotal)}
                    />
                    {invoice.totals.discount > 0 ? (
                      <Row
                        label="Discount"
                        value={`− ${formatInvoiceAmount(invoice.totals.discount)}`}
                      />
                    ) : null}
                    <Row
                      label="Pickup charge"
                      value={formatInvoiceAmount(invoice.totals.pickupCharge)}
                    />
                    <Row
                      label="Delivery charge"
                      value={formatInvoiceAmount(invoice.totals.deliveryCharge)}
                    />
                    <Row
                      label="Handling fee"
                      value={formatInvoiceAmount(invoice.totals.handlingFee)}
                    />
                  </div>
                  <div className="pt-1.5">
                    <Row
                      label="Taxable value"
                      value={formatInvoiceAmount(invoice.totals.taxableValue)}
                    />
                    {invoice.gst.igst > 0 ? (
                      <Row
                        label={`IGST (${invoice.gst.taxRate}%)`}
                        value={formatInvoiceAmount(invoice.gst.igst)}
                      />
                    ) : (
                      <>
                        <Row
                          label={`CGST (${invoice.gst.taxRate / 2}%)`}
                          value={formatInvoiceAmount(invoice.gst.cgst)}
                        />
                        <Row
                          label={`SGST (${invoice.gst.taxRate / 2}%)`}
                          value={formatInvoiceAmount(invoice.gst.sgst)}
                        />
                      </>
                    )}
                  </div>
                  <div className="pt-1.5">
                    <Row
                      label="Grand total"
                      value={formatInvoiceAmount(invoice.totals.grandTotal)}
                      strong
                    />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  GSTIN {invoice.gst.gstin} · HSN {invoice.gst.hsnCode} · Place of supply{" "}
                  {invoice.gst.placeOfSupply}
                </p>
              </section>

              {/* Payment */}
              <section className="card-soft mt-4 border border-border p-4">
                <h2 className="text-sm font-black tracking-tight text-foreground">Payment</h2>
                <div className="mt-2">
                  <Row label="Method" value={invoice.payment.methodLabel} />
                  <Row label="Status" value={invoice.payment.status} />
                  {invoice.payment.transactionId ? (
                    <Row label="Transaction" value={invoice.payment.transactionId} />
                  ) : null}
                </div>
                {invoice.notes ? (
                  <p className="mt-3 text-[11px] text-muted-foreground">{invoice.notes}</p>
                ) : null}
              </section>

              {/* Actions */}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void handleDownload()}
                  className="ripple flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
                >
                  {busy === "download" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Download
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void handleShare()}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl border border-border bg-background text-sm font-bold text-foreground transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
                >
                  {busy === "share" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                  Share
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Toaster />
    </main>
  );
}
