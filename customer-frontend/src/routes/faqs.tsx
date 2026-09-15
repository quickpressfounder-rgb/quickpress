import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchPublicFaqs, type PublicFaq } from "@/api/customer/public-api";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — QuickPress" },
      {
        name: "description",
        content: "Find answers about QuickPress doorstep laundry pickup, delivery timings, pricing, delicate garment care, and subscriptions.",
      },
    ],
  }),
  component: FaqsScreen,
});

function FaqsScreen() {
  const [faqs, setFaqs] = useState<PublicFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetchPublicFaqs()
      .then((data) => {
        setFaqs(data);
        if (data.length > 0 && data[0]?.id) {
          setOpenIds({ [data[0].id]: true });
        }
      })
      .catch((e) => console.error("Failed to load FAQs:", e))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(faqs.map((f) => f.category));
    return ["all", ...Array.from(cats)];
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchCat = selectedCategory === "all" || faq.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        searchQuery.trim() === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [faqs, selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-none bg-white/90 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900">
                Quick<span className="text-emerald-600">Press</span>
              </span>
              <span className="ml-2 text-xs font-semibold text-slate-400">Knowledge Base</span>
            </div>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Contact Team
          </Link>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-white border-b border-slate-200 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700">
            <HelpCircle className="size-3.5" /> Answers & Help Topics
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Everything you need to know about our services, pickup & delivery slots, pricing, and garment care.
          </p>

          {/* Search Box */}
          <div className="relative max-w-lg mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. refund, delicate, pickup)..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-sm transition"
            />
          </div>
        </div>
      </section>

      {/* Main FAQ Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 justify-center pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block size-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="mt-3 text-xs font-medium">Loading answers...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <HelpCircle className="size-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-800">No matching questions found</p>
            <p className="text-xs text-slate-400 mt-1">Try another keyword or reach out directly to our support team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = !!openIds[faq.id];
              return (
                <div
                  key={faq.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {faq.category}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900">{faq.question}</span>
                    </div>
                    <ChevronDown
                      className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-emerald-600" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Support Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Still have questions?</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our support desk is open daily to assist you with order modifications, special instructions, or bulk corporate pricing.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/contact"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
