import {
  ArrowLeft,
  ChevronRight,
  Cookie,
  ExternalLink,
  FileText,
  Lock,
  Mail,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface AboutPageProps {
  onBack: () => void;
  onRequestDelete?: () => void;
}

const STATUTORY_DOCS = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy (DPDP 2023)",
    subtitle: "Data rights, consent & privacy notice",
    icon: ShieldCheck,
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    subtitle: "Platform agreement & terms of use",
    icon: FileText,
  },
  {
    slug: "cancellation-refund-policy",
    title: "Cancellation & Refunds",
    subtitle: "Free re-wash & instant refund policy",
    icon: RefreshCw,
  },
  {
    slug: "garment-care-policy",
    title: "Garment Care & Fabric Risk",
    subtitle: "Stain removal, color care & liability",
    icon: Sparkles,
  },
  {
    slug: "cookie-policy",
    title: "Cookie & Tracking Policy",
    subtitle: "Session storage & telemetry safeguards",
    icon: Cookie,
  },
  {
    slug: "grievance-redressal",
    title: "Grievance & Nodal Officer",
    subtitle: "Statutory consumer dispute desk",
    icon: Scale,
  },
] as const;

export function AboutPage({ onBack, onRequestDelete }: AboutPageProps) {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#fafafa] text-zinc-950 font-sans">
      <div className="relative mx-auto w-full max-w-md pb-24">
        {/* Safe-area Aware Sticky Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
          <button
            type="button"
            aria-label="Back to profile"
            onClick={onBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="size-4.5 stroke-[2.2]" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-black tracking-tight text-zinc-950">
              Statutory Policies
            </h1>
            <p className="truncate text-[10px] font-medium text-zinc-500">
              Legal documents &amp; compliance
            </p>
          </div>

          <span className="size-9 shrink-0" aria-hidden="true" />
        </header>

        <div className="px-4 pt-4 space-y-4">
          {/* Classic Brand Identity Card */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#0c831f]">
                <Scale className="size-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-sm font-black tracking-tight text-zinc-950">
                    QuickPress Legal Center
                  </h2>
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-[#0c831f]">
                    v2.4.0
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                  DPDP Act 2023 &amp; Consumer Protection Compliant
                </p>
              </div>
            </div>
          </section>

          {/* Statutory & Legal Documents List */}
          <section className="space-y-2">
            <h3 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Statutory &amp; Legal Documents
            </h3>
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white divide-y divide-zinc-100 shadow-2xs">
              {STATUTORY_DOCS.map((doc) => {
                const Icon = doc.icon;
                return (
                  <Link
                    key={doc.slug}
                    to="/legal/$docSlug"
                    params={{ docSlug: doc.slug }}
                    className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/90 active:bg-zinc-100/70 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                        <Icon className="size-4 stroke-[2.2]" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-zinc-950">{doc.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {doc.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-700" />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Payment & Security Standard */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                  <Lock className="size-3.5 stroke-[2.2]" />
                </span>
                <span className="truncate text-xs font-black text-zinc-950">
                  Payment &amp; Security
                </span>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-[#0c831f]">
                PCI-DSS Level 1
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              All transactions use 256-bit TLS encryption via Razorpay. Your UPI MPIN and card credentials are never stored on QuickPress servers.
            </p>
          </section>

          {/* Data Rights & Account Control */}
          <section className="space-y-2">
            <h3 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Data Rights &amp; Account Control
            </h3>
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white divide-y divide-zinc-100 shadow-2xs">
              <a
                href="mailto:official.quickpress@gmail.com?subject=Privacy%20and%20Data%20Support%20Request"
                className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/90 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <Mail className="size-4 stroke-[2.2]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-950">
                      Data Grievance Support
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      official.quickpress@gmail.com
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 shrink-0 text-zinc-400 group-hover:text-zinc-700" />
              </a>

              {onRequestDelete ? (
                <button
                  type="button"
                  onClick={onRequestDelete}
                  className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-50/60 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
                      <Trash2 className="size-4 stroke-[2.2]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-red-600">
                        Request Account Deletion
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-red-500/80">
                        Permanent data erasure &amp; closure
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-red-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
