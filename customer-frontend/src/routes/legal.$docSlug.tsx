import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  Mail,
  Printer,
  Shield,
  ShieldCheck,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";

import { fetchPublicLegalDoc, type PublicLegalDoc } from "@/api/customer/public-api";

export const Route = createFileRoute("/legal/$docSlug")({
  head: ({ params }) => {
    const slugTitles: Record<string, string> = {
      "privacy-policy": "Privacy Policy — QuickPress",
      "terms-of-service": "Terms & Conditions — QuickPress",
      "terms": "Terms & Conditions — QuickPress",
      "cancellation-refund-policy": "Cancellation & Refund Policy — QuickPress",
      "garment-care-policy": "Garment Care, Fabric Risk & Loss Policy — QuickPress",
      "cookie-policy": "Cookie & Tracking Policy — QuickPress",
      "partner-agreement": "Partner Merchant Agreement & SLA — QuickPress",
      "rider-agreement": "Captain Delivery Agreement — QuickPress",
      "grievance-redressal": "Grievance Redressal & Nodal Officer — QuickPress",
    };
    const title = slugTitles[params.docSlug] || "Legal Documentation — QuickPress";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Read the official compliance, terms, privacy, and refund policies for QuickPress Doorstep Laundry.",
        },
      ],
    };
  },
  component: LegalDocScreen,
});

function LegalDocScreen() {
  const { docSlug } = useParams({ from: "/legal/$docSlug" });
  const navigate = useNavigate();
  const [doc, setDoc] = useState<PublicLegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPublicLegalDoc(docSlug)
      .then(setDoc)
      .catch((err) => setError(err.message || "Failed to load document"))
      .finally(() => setLoading(false));
  }, [docSlug]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const getWebsiteLegalUrl = (slug: string) => {
    const targetMap: Record<string, string> = {
      "privacy-policy": "#privacy",
      "terms-of-service": "#terms",
      "terms": "#terms",
      "cancellation-refund-policy": "#refund",
      "garment-care-policy": "#garment-care",
      "cookie-policy": "#cookie",
      "partner-agreement": "#partner",
      "rider-agreement": "#terms",
      "grievance-redressal": "#grievance",
    };
    const targetHash = targetMap[slug] || "#terms";
    return `https://withquickpress.com/${targetHash}`;
  };

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#fafafa] text-slate-900 pb-20">
      {/* Top sticky brand bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 pb-3 pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  void navigate({ to: "/profile" });
                }
              }}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition hover:bg-zinc-200 active:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4.5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-zinc-950">
                {doc?.title || "Legal Policy"}
              </p>
              <p className="truncate text-[10px] font-medium text-zinc-500">
                QuickPress Legal &amp; Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              <Printer className="size-3.5" /> Print
            </button>
            <a
              href={getWebsiteLegalUrl(docSlug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-[#0c831f] hover:bg-emerald-100 transition cursor-pointer"
              title="View on Official Website"
            >
              <Globe className="size-3.5" />
              <span className="hidden sm:inline">withquickpress.com</span>
              <span className="sm:hidden">Web</span>
            </a>
            <Link
              to="/contact"
              className="rounded-xl bg-[#0c831f] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#0a701a]"
            >
              Support
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="border-b border-slate-200 bg-white py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-3">
            <Link to="/home" className="hover:text-emerald-600">Home</Link>
            <ChevronRight className="size-3 text-slate-400" />
            <Link to="/help" className="hover:text-emerald-600">Help & Legal</Link>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-semibold">{doc?.title || "Legal Document"}</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 mb-2">
                <ShieldCheck className="size-3.5" />
                Officially Published Document
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {doc?.title || (loading ? "Loading policy..." : "Legal Document")}
              </h1>
            </div>

            {doc && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                    v{doc.currentVersion}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-slate-400" />
                  Effective: <span className="font-medium text-slate-700">{doc.effectiveDate}</span>
                </div>
              </div>
            )}
          </div>

          {doc?.summary && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs sm:text-sm text-emerald-900 leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-emerald-800 text-[10px] block mb-1">Executive Summary</span>
              {doc.summary}
            </div>
          )}
        </div>
      </section>

      {/* Main Document Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Mobile Horizontal Policy Switcher */}
        <div className="lg:hidden mb-6 overflow-x-auto pb-2 -mx-4 px-4 flex items-center gap-2 no-scrollbar">
          {[
            { slug: "privacy-policy", label: "Privacy" },
            { slug: "terms-of-service", label: "Terms" },
            { slug: "cancellation-refund-policy", label: "Refunds" },
            { slug: "garment-care-policy", label: "Garment Care" },
            { slug: "cookie-policy", label: "Cookies" },
            { slug: "grievance-redressal", label: "Grievance Desk" },
          ].map((item) => (
            <Link
              key={item.slug}
              to="/legal/$docSlug"
              params={{ docSlug: item.slug }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                docSlug === item.slug
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Quick Legal Policy Switcher */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <FileText className="size-3.5 text-emerald-600" />
                Company Policies
              </h2>
              <nav className="space-y-1.5">
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "privacy-policy" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "privacy-policy"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Privacy Policy (DPDP)</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "terms-of-service" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "terms-of-service"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Terms of Service</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "cancellation-refund-policy" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "cancellation-refund-policy"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Cancellation &amp; Refunds</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "garment-care-policy" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "garment-care-policy"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Garment Care &amp; Liability</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "cookie-policy" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "cookie-policy"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Cookie &amp; Tracking Policy</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "grievance-redressal" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "grievance-redressal"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Grievance &amp; Nodal Desk</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "partner-agreement" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "partner-agreement"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Partner Agreement &amp; SLA</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "rider-agreement" }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    docSlug === "rider-agreement"
                      ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Captain Delivery Agreement</span>
                  <ChevronRight className="size-3 text-slate-400" />
                </Link>
              </nav>
            </div>

            {/* Assistance card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 text-zinc-900 shadow-2xs">
              <h3 className="text-sm font-black flex items-center gap-1.5 text-zinc-950">
                <HelpCircle className="size-4 text-[#0c831f]" />
                Questions about this policy?
              </h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Our compliance and customer grievance officer is available to resolve any data, payment, or service inquiries.
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <a
                  href="mailto:official.quickpress@gmail.com"
                  className="flex items-center gap-2 font-semibold text-[#0c831f] hover:underline"
                >
                  <Mail className="size-3.5" /> official.quickpress@gmail.com
                </a>
                <a
                  href="https://withquickpress.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-semibold text-[#0c831f] hover:underline"
                >
                  <Globe className="size-3.5" /> withquickpress.com
                </a>
              </div>
            </div>
          </aside>

          {/* Document Body */}
          <article className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
              {loading ? (
                <div className="py-20 text-center text-slate-400">
                  <div className="inline-block size-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  <p className="mt-3 text-xs font-medium">Fetching verified legal document...</p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
                  <p className="font-semibold">Unable to load document</p>
                  <p className="text-xs text-rose-600 mt-1">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Retry
                  </button>
                </div>
              ) : doc ? (
                <div className="prose prose-slate max-w-none text-slate-700 prose-headings:font-bold prose-headings:text-slate-900 prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h3:text-base prose-p:leading-relaxed prose-p:text-sm prose-li:text-sm prose-strong:text-slate-900">
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed space-y-4">
                    {doc.content}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
