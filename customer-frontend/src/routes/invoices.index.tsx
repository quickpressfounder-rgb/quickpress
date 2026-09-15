import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Receipt,
  Search,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  downloadInvoice,
  downloadInvoicePdfBlob,
  getInvoicePdfUrl,
  fetchInvoices,
  formatInvoiceAmount,
  readCachedInvoices,
  type Invoice,
  type InvoiceStatus,
} from "@/api/customer/invoice-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoices — QuickPress GST Bills & Receipts" },
      {
        name: "description",
        content:
          "View, download and share GST invoices for every QuickPress laundry order — itemised bills, taxes and payment details in one place.",
      },
      { property: "og:title", content: "Invoices — QuickPress GST Bills" },
      {
        property: "og:description",
        content:
          "Itemised GST invoices for your QuickPress laundry orders, ready to download or share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesScreen,
});

const STATUS_TONE: Record<InvoiceStatus, string> = {
  paid: "bg-secondary/10 text-brand-green",
  unpaid: "bg-primary/15 text-brand-dark",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

function InvoicesScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const cached = readCachedInvoices();
  const [invoices, setInvoices] = useState<Invoice[] | null>(cached?.items ?? null);
  const [totalAmount, setTotalAmount] = useState(cached?.totalAmount ?? 0);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const visibleInvoices = useMemo(
    () => (invoices ?? []).filter((inv) => inv.status !== "cancelled"),
    [invoices],
  );

  // Debounce search so each keystroke doesn't hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // GET /api/invoices?q=
  const load = useCallback(
    async (forceRefresh = false, signal?: AbortSignal) => {
      setError(null);
      try {
        const result = await fetchInvoices({
          ...(term ? { q: term } : {}),
          forceRefresh,
          ...(signal ? { signal } : {}),
        });
        if (signal?.aborted) return;
        setInvoices(result.items);
        setTotalAmount(result.totalAmount);
        setOffline(result.fromCache);
      } catch (cause) {
        if (signal?.aborted) return;
        setError(cause instanceof Error ? cause.message : "We couldn't load your invoices.");
      }
    },
    [term],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(false, controller.signal);
    return () => controller.abort();
  }, [load]);

  // Re-sync when the device comes back online.
  useEffect(() => {
    const onOnline = () => void load(true);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const handleDownload = async (invoice: Invoice) => {
    setDownloading(invoice.id);
    try {
      void downloadInvoice(invoice.id).catch(() => {});
      const fileName = invoice.invoiceNumber
        ? `QuickPress-${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`
        : `QuickPress-Invoice-${invoice.id}.pdf`;
      try {
        await downloadInvoicePdfBlob(invoice.id, fileName);
        toast.success(`Downloaded ${invoice.invoiceNumber}`);
      } catch {
        const url = getInvoicePdfUrl(invoice.id);
        window.open(url, "_blank", "noopener");
        toast.success(`Opening ${invoice.invoiceNumber}...`);
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Download failed. Try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="Invoices" onBack={() => navigate({ to: "/profile" })} />

        <div className="px-5 pb-32 pt-4">
          {offline ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-2.5">
              <WifiOff className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-[0.68rem] font-semibold text-muted-foreground">
                Showing saved invoices — they sync when you're back online.
              </p>
            </div>
          ) : null}

          {/* Search — GET /api/invoices?q= */}
          <div className="card-soft flex h-12 items-center gap-2 border border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invoice or order number…"
              className="h-full w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
            />
          </div>


          {error ? (
            <section className="card-soft mt-6 border border-border p-6 text-center">
              <p className="text-sm font-bold text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => void load(true)}
                className="mt-4 rounded-full bg-gradient-to-r from-brand-green to-primary px-5 py-2.5 text-xs font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96]"
              >
                Try again
              </button>
            </section>
          ) : !invoices ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-24 animate-pulse rounded-3xl bg-muted/70" />
              ))}
            </div>
          ) : visibleInvoices.length === 0 ? (
            <section className="card-soft mt-6 border border-border p-8 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <FileText className="size-6" />
              </span>
              <p className="mt-3 text-sm font-bold text-foreground">No invoices yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Invoices appear here once an order is billed.
              </p>
            </section>
          ) : (
            <section className="stagger-children mt-4 space-y-3">
              {visibleInvoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="card-soft overflow-hidden border border-border transition-all duration-300 hover:border-primary/60"
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/invoices/$invoiceId",
                        params: { invoiceId: invoice.id },
                      })
                    }
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                      <Receipt className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[0.82rem] font-black tracking-tight text-foreground">
                          {invoice.invoiceNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[invoice.status]}`}
                        >
                          {STATUS_LABEL[invoice.status]}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {invoice.orderNumber} · {invoice.invoiceDateLabel}
                      </span>
                      <span className="mt-1 block text-sm font-black tracking-tight text-foreground">
                        {formatInvoiceAmount(invoice.totals.grandTotal)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  <div className="flex border-t border-border">
                    <button
                      type="button"
                      disabled={downloading === invoice.id}
                      onClick={() => void handleDownload(invoice)}
                      className="flex flex-1 items-center justify-center gap-2 py-3 text-[11px] font-bold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
                    >
                      {downloading === invoice.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      Download PDF
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </div>

      <BottomNav active="profile" />
      <Toaster />
    </main>
  );
}
