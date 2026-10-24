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

import {
  fetchPublicLegalDoc,
  type PublicLegalDoc,
  CAPTAIN_SUPPORT_EMAIL,
  CAPTAIN_SUPPORT_EMAIL_OFFICIAL,
} from "../api/rider/rider-support-api";
import { triggerHaptic } from "../lib/captain-audio";

export const Route = createFileRoute("/legal/$docSlug")({
  head: ({ params }) => {
    const slugTitles: Record<string, string> = {
      "privacy-policy": "Privacy Policy — QuickPress Captain",
      "terms-of-service": "Terms & Conditions — QuickPress",
      "terms": "Terms & Conditions — QuickPress",
      "rider-agreement": "Captain Delivery Agreement & SLA — QuickPress",
      "cancellation-refund-policy": "Cancellation & Order Dispute SOP — QuickPress",
      "grievance-redressal": "Grievance Officer & Statutory Desk — QuickPress",
    };
    const title = slugTitles[params.docSlug] || "Legal Documentation — QuickPress Captain";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Official compliance, driver agreement, terms and privacy policy for QuickPress Captains.",
        },
      ],
    };
  },
  component: CaptainLegalDocScreen,
});

function CaptainLegalDocScreen() {
  const { docSlug } = useParams({ from: "/legal/$docSlug" });
  const navigate = useNavigate();
  const [doc, setDoc] = useState<PublicLegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPublicLegalDoc(docSlug)
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
    triggerHaptic(20);
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleOpenWebsite = () => {
    triggerHaptic(20);
    const targetMap: Record<string, string> = {
      "privacy-policy": "#privacy",
      "terms-of-service": "#terms",
      "terms": "#terms",
      "rider-agreement": "#terms",
      "cancellation-refund-policy": "#terms",
      "grievance-redressal": "#contact",
    };
    const targetHash = targetMap[docSlug] || "#terms";
    const webUrl = `https://withquickpress.com/${targetHash}`;
    window.open(webUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    triggerHaptic(20);
    const targetMap: Record<string, string> = {
      "privacy-policy": "#privacy",
      "terms-of-service": "#terms",
      "terms": "#terms",
      "rider-agreement": "#terms",
      "cancellation-refund-policy": "#terms",
      "grievance-redressal": "#contact",
    };
    const targetHash = targetMap[docSlug] || "#terms";
    const webUrl = `https://withquickpress.com/${targetHash}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc?.title || "QuickPress Legal Compliance",
          text: `Read QuickPress official ${doc?.title || "Legal Policy"}`,
          url: webUrl,
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(webUrl);
    toast.success("Official policy link copied to clipboard!");
  };

  const legalPolicies = [
    { slug: "privacy-policy", label: "Privacy Policy" },
    { slug: "rider-agreement", label: "Captain Agreement" },
    { slug: "terms-of-service", label: "Terms & Conditions" },
    { slug: "cancellation-refund-policy", label: "Cancellation SOP" },
    { slug: "grievance-redressal", label: "Grievance Officer" },
  ];

  return (
    <div
      className="min-h-screen bg-[#F6F7F9] text-slate-900 select-none font-sans pb-16"
      style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 8px), 44px)" }}
    >
      {/* 1. Sticky Notch-Safe Header */}
      <header className="sticky top-0 z-40 bg-[#F6F7F9]/95 backdrop-blur-md border-b border-slate-200/80 px-4 pb-3 shadow-2xs">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/auth" });
                }
              }}
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-950 tracking-tight truncate">
                  Quick<span className="text-emerald-600">Press</span> Legal
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                  Official
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                {doc?.title || "Statutory Compliance Document"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenWebsite}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer"
              title="Open Official Website"
            >
              <Globe className="size-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Website</span>
              <ExternalLink className="size-3 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer"
              title="Share Link"
            >
              <Share2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Horizontal Policy Navigation Tabs */}
        <div className="mx-auto max-w-lg mt-3 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-0.5">
          {legalPolicies.map((p) => {
            const isActive =
              docSlug === p.slug ||
              (docSlug === "terms" && p.slug === "terms-of-service");
            return (
              <Link
                key={p.slug}
                to="/legal/$docSlug"
                params={{ docSlug: p.slug }}
                onClick={() => triggerHaptic(15)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black transition-all border ${
                  isActive
                    ? "bg-[#00C853] text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* 3. Main Document Body */}
      <main className="mx-auto max-w-lg px-4 pt-3 space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="inline-block size-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
            <p className="text-xs font-bold text-slate-600">
              Fetching verified policy from QuickPress Legal CMS...
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-6 border border-rose-200 text-center space-y-3 shadow-2xs">
            <Shield className="size-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-black text-rose-950">Document Unavailable</h3>
            <p className="text-xs text-rose-600 font-medium leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={handleOpenWebsite}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-black text-xs hover:bg-slate-200"
              >
                Open on withquickpress.com
              </button>
            </div>
          </div>
        ) : doc ? (
          <div className="space-y-3">
            {/* Meta Card: Document Status & Effective Date */}
            <div className="bg-white rounded-3xl p-4.5 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="size-3.5" />
                  <span>Statutory Compliance Document</span>
                </span>
                <span className="font-mono text-[11px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  v{doc.currentVersion || "1.0"}
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-950 tracking-tight leading-snug">
                {doc.title}
              </h2>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Calendar className="size-3.5 text-slate-400" />
                <span>Effective Date:</span>
                <span className="text-slate-800 font-bold">{doc.effectiveDate}</span>
              </div>

              {doc.summary && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-xs text-emerald-950 font-medium leading-relaxed">
                  <span className="font-black text-emerald-900 block text-[10px] uppercase tracking-wider mb-0.5">
                    Executive Summary
                  </span>
                  {doc.summary}
                </div>
              )}
            </div>

            {/* Document Content View */}
            <article className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                {doc.content}
              </div>
            </article>

            {/* Legal Desk & Helpline Footer */}
            <div className="bg-slate-900 text-white rounded-3xl p-4.5 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-300 font-black text-xs">
                <HelpCircle className="size-4" />
                <span>QuickPress Statutory & Grievance Desk</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                Operating Entity: <strong>QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</strong> (CIN: <strong>U96010UW2026PTC259787</strong>).
                For compliance or grievance inquiries, reach out to our legal officer.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3 text-xs">
                <a
                  href={`mailto:${CAPTAIN_SUPPORT_EMAIL_OFFICIAL}`}
                  className="flex items-center gap-1.5 text-emerald-400 hover:underline font-bold"
                >
                  <Mail className="size-3.5" />
                  <span>{CAPTAIN_SUPPORT_EMAIL_OFFICIAL}</span>
                </a>
                <button
                  type="button"
                  onClick={handleOpenWebsite}
                  className="flex items-center gap-1.5 text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  <Globe className="size-3.5" />
                  <span>withquickpress.com</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
