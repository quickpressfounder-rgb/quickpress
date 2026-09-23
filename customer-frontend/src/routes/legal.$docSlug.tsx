import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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
} from "lucide-react";
import { useEffect, useState } from "react";

import { fetchPublicLegalDoc, type PublicLegalDoc } from "@/api/customer/public-api";

export const Route = createFileRoute("/legal/$docSlug")({
  head: ({ params }) => {
    const slugTitles: Record<string, string> = {
      "privacy-policy": "Privacy Policy — QuickPress",
      "terms-of-service": "Terms & Conditions — QuickPress",
      "cancellation-refund-policy": "Cancellation & Refund Policy — QuickPress",
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

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 pb-20">
      {/* Top sticky brand bar */}
      <header className="sticky top-0 z-40 border-none bg-white/90 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200/60 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <Link to="/home" className="text-base font-black tracking-tight text-slate-900">
                Quick<span className="text-emerald-600">Press</span>
              </Link>
              <span className="ml-2 text-xs font-semibold text-slate-400">Legal & Compliance</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Printer className="size-3.5" /> Print Policy
            </button>
            <Link
              to="/contact"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Need Support?
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
                  <span>Privacy Policy</span>
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
                  <span>Cancellation & Refunds</span>
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
                  <span>Grievance & Nodal Desk</span>
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
                  <span>Partner Agreement & SLA</span>
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
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <HelpCircle className="size-4 text-emerald-400" />
                Questions about this policy?
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Our compliance and customer grievance officer is available to resolve any data, payment, or service inquiries.
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <a
                  href="mailto:official.quickpress@gmail.com"
                  className="flex items-center gap-2 text-emerald-300 hover:underline"
                >
                  <Mail className="size-3.5" /> official.quickpress@gmail.com
                </a>
                <a
                  href="https://with.quickpress.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-emerald-300 hover:underline"
                >
                  <Globe className="size-3.5" /> with.quickpress.com
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
