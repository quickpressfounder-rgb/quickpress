import { ArrowLeft, ChevronRight, ShieldCheck, FileText, RefreshCw, Scale, Trash2, Mail, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface AboutPageProps {
  onBack: () => void;
  onRequestDelete?: () => void;
}

export function AboutPage({ onBack, onRequestDelete }: AboutPageProps) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="relative mx-auto w-full max-w-md pb-32">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-background/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to profile"
              onClick={onBack}
              className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95 hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                About & Legal
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                QuickPress version, statutory policies & terms
              </p>
            </div>
          </div>
        </header>

        {/* Brand & App Info Header */}
        <div className="px-5 pt-6 pb-2 text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-lg shadow-brand-navy/20">
            <span className="text-2xl font-black tracking-tighter">QP</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-foreground">QuickPress Laundry & Dry Clean</h2>
          <p className="text-xs text-muted-foreground">Fast, premium doorstep laundry care in 10-15 minutes</p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            <Sparkles className="size-3 text-brand-orange" />
            <span>Version 2.4.0 (Build 2026.09.28)</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pt-4 space-y-5">
          {/* Statutory Documents */}
          <div>
            <h3 className="px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2">
              Statutory & Legal Documents
            </h3>
            <div className="card-soft overflow-hidden border border-border divide-y divide-border rounded-2xl bg-card">
              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "privacy-policy" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Privacy Policy</p>
                    <p className="text-[11px] text-muted-foreground">How your personal & location data is protected</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "terms-of-service" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Terms & Conditions</p>
                    <p className="text-[11px] text-muted-foreground">Garment care, service SLAs & terms</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "cancellation-refund-policy" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <RefreshCw className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Cancellation & Refunds</p>
                    <p className="text-[11px] text-muted-foreground">Instant UPI / Bank refund timelines</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "grievance-redressal" }}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Scale className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Grievance Redressal & Nodal Officer</p>
                    <p className="text-[11px] text-muted-foreground">Statutory consumer dispute escalation desk</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Payment & Security Standard Card */}
          <div className="card-soft p-4 border border-border bg-card/60 space-y-2 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Payment & Security Standard</span>
              <span className="text-[10px] font-black text-brand-green bg-brand-green/10 px-2.5 py-0.5 rounded-full border border-brand-green/20">
                Cashfree PG · PCI-DSS
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All transactions are encrypted with 256-bit TLS and processed securely via Cashfree Payments. Your payment credentials and UPI MPIN are never accessed or stored on our servers.
            </p>
          </div>

          {/* Data Rights & Account Control */}
          <div>
            <h3 className="px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2">
              Data Rights & Account Control
            </h3>
            <div className="space-y-2.5">
              <a
                href="mailto:official.quickpress@gmail.com?subject=Privacy%20and%20Data%20Support%20Request"
                className="card-soft flex items-center justify-between p-4 border border-border rounded-2xl hover:bg-muted/40 transition-colors bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Request Data / Privacy Support</p>
                    <p className="text-[11px] text-muted-foreground">Contact our Data Grievance Officer</p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-muted-foreground" />
              </a>

              {onRequestDelete && (
                <button
                  type="button"
                  onClick={onRequestDelete}
                  className="card-soft w-full flex items-center justify-between p-4 border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                      <Trash2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-destructive">Request Account Deletion</p>
                      <p className="text-[11px] text-destructive/80">Permanent data erasure & account closure</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-destructive/70" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
