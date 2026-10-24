import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Mail,
  Printer,
  Shield,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiGetJson } from "../api/core/transport";

export interface PublicLegalDoc {
  slug: string;
  title: string;
  currentVersion: string;
  effectiveDate: string;
  summary: string;
  content: string;
  publishedAt?: string;
}

export const Route = createFileRoute("/legal/$docSlug")({
  head: ({ params }) => {
    const slugTitles: Record<string, string> = {
      "privacy-policy": "Privacy Policy — QuickPress Partner",
      "partner-agreement": "Partner Merchant Agreement & SLA — QuickPress",
      "terms-of-service": "Terms of Service — QuickPress",
      "terms": "Terms of Service — QuickPress",
      "cancellation-refund-policy": "Cancellation & Quality SLA Policy — QuickPress",
      "grievance-redressal": "Grievance Officer & Statutory Compliance — QuickPress",
    };
    const title = slugTitles[params.docSlug] || "Legal Documentation — QuickPress Partner";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Official compliance, merchant agreement, terms and privacy policy for QuickPress Laundromat Partners.",
        },
      ],
    };
  },
  component: PartnerLegalDocScreen,
});

function PartnerLegalDocScreen() {
  const { docSlug } = useParams({ from: "/legal/$docSlug" });
  const navigate = useNavigate();
  const [doc, setDoc] = useState<PublicLegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetJson<PublicLegalDoc>(`/api/public/legal/${docSlug}`, { anonymous: true })
      .then((data) => {
        if (data && (data.content || data.title)) {
          setDoc(data);
        } else {
          throw new Error("Document content unavailable");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load legal document");
      })
      .finally(() => setLoading(false));
  }, [docSlug]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleOpenWebsite = () => {
    const targetMap: Record<string, string> = {
      "privacy-policy": "#privacy",
      "partner-agreement": "#terms",
      "terms-of-service": "#terms",
      "terms": "#terms",
      "cancellation-refund-policy": "#terms",
      "grievance-redressal": "#contact",
    };
    const targetHash = targetMap[docSlug] || "#terms";
    const webUrl = `https://withquickpress.com/${targetHash}`;
    window.open(webUrl, "_blank", "noopener,noreferrer");
  };

  const legalPolicies = [
    { slug: "partner-agreement", label: "Partner Agreement & SLA" },
    { slug: "privacy-policy", label: "Privacy Policy" },
    { slug: "terms-of-service", label: "Terms of Service" },
    { slug: "cancellation-refund-policy", label: "Cancellation & SLA" },
    { slug: "grievance-redressal", label: "Grievance Officer" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/auth" });
                }
              }}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-900">
                  Quick<span className="text-emerald-600">Press</span> Partner
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Merchant Compliance
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                {doc?.title || "Legal Document"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer className="size-3.5" /> Print Policy
            </button>
            <button
              type="button"
              onClick={handleOpenWebsite}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
              title="View on Official Website"
            >
              <Globe className="size-3.5 text-emerald-600" />
              <span>withquickpress.com</span>
              <ExternalLink className="size-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Sidebar Tabs */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <FileText className="size-3.5 text-emerald-600" />
                Partner Policies & SLAs
              </h2>
              <nav className="space-y-1.5">
                {legalPolicies.map((p) => {
                  const isActive =
                    docSlug === p.slug ||
                    (docSlug === "terms" && p.slug === "terms-of-service");
                  return (
                    <Link
                      key={p.slug}
                      to="/legal/$docSlug"
                      params={{ docSlug: p.slug }}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span>{p.label}</span>
                      <ChevronRight className="size-3 text-slate-400" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Statutory Desk Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
              <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                Statutory Compliance
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Operating Entity: <strong>QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong><br />
                CIN: <strong>U96010UW2026PTC259787</strong><br />
                Registered Office: <strong>C/O DHANI RAM, Jail Road Nagla Baini, Kasganj, Etah- 207123, UP, India</strong>
              </p>
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <a
                  href="mailto:info@withquickpress.com"
                  className="flex items-center gap-1.5 text-emerald-700 hover:underline font-semibold"
                >
                  <Mail className="size-3.5" /> info@withquickpress.com
                </a>
              </div>
            </div>
          </aside>

          {/* Document Content View */}
          <article className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xs">
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
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Retry
                  </button>
                </div>
              ) : doc ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 mb-1">
                        <ShieldCheck className="size-3.5" />
                        Officially Published Bilateral Policy
                      </div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {doc.title}
                      </h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        v{doc.currentVersion || "1.0"}
                      </span>
                      <span>•</span>
                      <span>Effective: {doc.effectiveDate}</span>
                    </div>
                  </div>

                  {doc.summary && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium">
                      <span className="font-bold uppercase tracking-wider text-emerald-800 text-[10px] block mb-1">
                        Executive Summary
                      </span>
                      {doc.summary}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 pt-2 space-y-4">
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
