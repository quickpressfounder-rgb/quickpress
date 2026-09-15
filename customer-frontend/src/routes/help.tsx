import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Clock,
  CreditCard,
  FileText,
  Headphones,
  ImagePlus,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  MessagesSquare,
  Package,
  Percent,
  RefreshCcw,
  Search,
  Send,
  Settings,
  Shield,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { HelpSkeleton } from "@/components/account/AccountSkeletons";
import { BottomNav } from "@/components/home/BottomNav";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  createSupportTicket,
  fetchFaqCategories,
  fetchFaqList,
  fetchHelpTopics,
  fetchSupportContact,
  fetchTickets,
  readCachedFaqs,
  readCachedTickets,
  TICKET_CATEGORY_OPTIONS,
  TICKET_STATUS_LABEL,

  type FaqCategory,
  type FaqList,
  type SupportTicket,
  type TicketCategory,
} from "@/api/customer/help-api";


export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — QuickPress Support 24×7" },
      {
        name: "description",
        content:
          "Get QuickPress support fast — live chat, call, WhatsApp and email, popular help topics, FAQs and raise a support ticket for any laundry order issue.",
      },
      { property: "og:title", content: "Help Center — QuickPress Support" },
      {
        property: "og:description",
        content:
          "Live chat, call, WhatsApp and email support plus FAQs and ticket raising for QuickPress laundry orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpScreen,
});

const TOPIC_ICON: Record<string, typeof Package> = {
  track: Truck,
  cancel: XCircle,
  refund: RefreshCcw,
  payment: CreditCard,
  "pickup-delay": Clock,
  "delivery-delay": Package,
  coupons: Percent,
  account: Settings,
};

function HelpScreen() {
  const navigate = useNavigate();
  const contact = fetchSupportContact();
  const allTopics = fetchHelpTopics();
  const [faqList, setFaqList] = useState<FaqList | null>(() => readCachedFaqs());
  const [categories, setCategories] = useState<FaqCategory[]>(
    () => readCachedFaqs()?.categories ?? [],
  );
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => readCachedTickets()?.items ?? []);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [category, setCategory] = useState<TicketCategory>("general");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Debounce the search box so every keystroke doesn't hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // GET /api/help/faqs — re-runs on search term / category change.
  useEffect(() => {
    const controller = new AbortController();
    setFaqsLoading(true);
    void fetchFaqList({
      category: activeCategory,
      ...(term ? { q: term } : {}),
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setFaqList(result);
        if (result.categories.length) setCategories(result.categories);
      })
      .catch(() => {
        /* cached content stays on screen; the ticket form remains usable */
      })
      .finally(() => {
        if (!controller.signal.aborted) setFaqsLoading(false);
      });
    return () => controller.abort();
  }, [activeCategory, term]);

  // GET /api/help/categories + /api/help/tickets
  useEffect(() => {
    let active = true;
    void fetchFaqCategories()
      .then((result) => {
        if (active && result.length) setCategories(result);
      })
      .catch(() => undefined);
    void fetchTickets()
      .then((result) => {
        if (active) setTickets(result.items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const normalized = term.toLowerCase();

  const topics = useMemo(
    () =>
      allTopics.filter(
        (topic) =>
          !normalized ||
          topic.label.toLowerCase().includes(normalized) ||
          topic.note.toLowerCase().includes(normalized),
      ),
    [allTopics, normalized],
  );

  // Filtering happens on the API; the list is rendered as returned.
  const visibleFaqs = faqList?.items ?? [];

  const quickActions = [
    {
      id: "chat",
      label: "Live Chat",
      icon: MessagesSquare,
      onClick: () => toast.success("Connecting you to a support agent…"),
    },
    {
      id: "call",
      label: "Call Support",
      icon: Headphones,
      onClick: () => {
        window.location.href = `tel:${contact.phone}`;
      },
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      onClick: () => window.open(`https://wa.me/${contact.whatsapp}`, "_blank"),
    },
    {
      id: "email",
      label: "Email Us",
      icon: Mail,
      onClick: () => {
        window.location.href = `mailto:${contact.email}`;
      },
    },
  ];

  // POST /api/help/tickets
  const handleSubmitTicket = async () => {
    setSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
        ...(imageName ? { attachmentName: imageName } : {}),
      });
      setSubject("");
      setDescription("");
      setImageName(null);
      setTickets((current) => [ticket, ...current]);
      toast.success(`Ticket ${ticket.ticketNumber} created`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "We couldn't raise your ticket.");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar
          title="Help Center"
          action={
            <button
              type="button"
              aria-label="Search support"
              onClick={() => document.getElementById("help-search")?.focus()}
              className="flex size-10 items-center justify-center rounded-2xl bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
            >
              <Search className="size-5" />
            </button>
          }
        />

        {!faqList && faqsLoading ? (
          <HelpSkeleton />

        ) : (
          <div className="px-5 pb-32 pt-4">
            {/* Search */}
            <div className="card-soft flex h-12 items-center gap-2 border border-border px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                id="help-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help topics, orders, refunds…"
                className="h-full w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
              />
            </div>

            {/* Quick actions */}
            <section className="stagger-children mt-5 grid grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick} className="card-soft ripple flex flex-col items-center gap-2 border border-border px-2 py-3 transition-all duration-300 hover:border-primary/60 active:scale-[0.96]"
                >
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                    <action.icon className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[0.66rem] font-bold tracking-tight text-foreground">
                    {action.label}
                  </span>
                </button>
              ))}
            </section>

            {/* Popular topics */}
            <section className="mt-7">
              <h2 className="text-sm font-black tracking-tight text-foreground">
                Popular Help Topics
              </h2>
              <div className="stagger-children mt-4 grid grid-cols-2 gap-3">
                {topics.map((topic, index) => {
                  const Icon = TOPIC_ICON[topic.id] ?? LifeBuoy;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() =>
                        topic.id === "track"
                          ? navigate({ to: "/history" })
                          : toast(`${topic.label} — opening guide`)
                      } className="card-soft ripple flex items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.96]"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.78rem] font-bold leading-tight text-foreground">
                          {topic.label}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {topic.note}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {topics.length === 0 ? (
                  <p className="col-span-2 text-center text-xs text-muted-foreground">
                    No topics match “{query}”.
                  </p>
                ) : null}
              </div>
            </section>

            {/* FAQ — GET /api/help/faqs + /api/help/categories */}
            <section className="mt-7">
              <h2 className="text-sm font-black tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {[{ id: "all", name: "All" }, ...categories].map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="stagger-children mt-4 space-y-3">
                {faqsLoading ? (
                  <div className="h-16 animate-pulse rounded-3xl bg-muted/70" />
                ) : null}
                {visibleFaqs.map((faq) => {
                  const open = openFaq === faq.id;
                  return (
                    <article
                      key={faq.id} className="card-soft overflow-hidden border border-border transition-all duration-300 hover:border-primary/60"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : faq.id)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3 p-4 text-left"
                      >
                        <span className="min-w-0 flex-1 text-[0.8rem] font-bold leading-snug text-foreground">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {open ? (
                        <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                          {faq.answer}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
                {!faqsLoading && visibleFaqs.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    No answers match “{query}”. Raise a ticket below.
                  </p>
                ) : null}
              </div>
            </section>

            {/* My tickets — GET /api/help/tickets */}
            {tickets.length > 0 ? (
              <section className="mt-7">
                <h2 className="text-sm font-black tracking-tight text-foreground">My Tickets</h2>
                <div className="stagger-children mt-4 space-y-3">
                  {tickets.map((ticket) => (
                    <article
                      key={ticket.id}
                      className="card-soft border border-border p-4 transition-all duration-300 hover:border-primary/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[0.8rem] font-black tracking-tight text-foreground">
                          {ticket.subject || ticket.ticketNumber}
                        </span>
                        <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                          {TICKET_STATUS_LABEL[ticket.status]}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {ticket.description}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                        {ticket.ticketNumber} · {ticket.categoryLabel} · {ticket.messageCount}{" "}
                        messages
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}


            {/* Raise ticket — POST /api/support/ticket */}
            <section className="mt-7">
              <h2 className="text-sm font-black tracking-tight text-foreground">
                Raise a Support Ticket
              </h2>
              <div className="card-soft mt-4 border border-border p-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </span>
                <div className="mb-3 mt-1.5 flex flex-wrap gap-2">
                  {TICKET_CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCategory(option.id)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        category === option.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <label className="block">

                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Subject
                  </span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Order QP-48219 delivered late"
                    className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground/70 focus:border-primary"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder="Tell us what happened so we can fix it quickly."
                    className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground/70 focus:border-primary"
                  />
                </label>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setImageName(event.target.files?.[0]?.name ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 flex w-full items-center gap-3 rounded-3xl bg-muted/70 p-3 text-left transition-colors active:bg-muted"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                    <ImagePlus className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {imageName ?? "Upload Image"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      JPG or PNG, up to 5 MB
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={submitting || !subject.trim() || !description.trim()}
                  onClick={() => void handleSubmitTicket()}
                  className="ripple mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-3xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit Ticket
                </button>
              </div>
            </section>

            {/* Emergency support */}
            <section className="mt-7">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand-dark to-brand-green p-5 shadow-soft">
                <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/25 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-background/70">
                      Emergency Support
                    </p>
                    <p className="mt-1 text-lg font-black tracking-tight text-background">
                      24×7 Customer Support
                    </p>
                    <p className="mt-1 text-xs text-background/75">
                      Average response time · {contact?.responseTime}
                    </p>
                  </div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/15 text-background">
                    <LifeBuoy className="size-5" />
                  </span>
                </div>
                <a
                  href={`tel:${contact?.phone}`}
                  className="ripple relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-3xl bg-primary text-sm font-bold text-primary-foreground transition-all duration-300 active:scale-[0.97]"
                >
                  <Headphones className="size-4" />
                  Call {contact?.phoneLabel}
                </a>
              </div>
            </section>

            {/* Legal & Compliance Quick Links */}
            <section className="mt-6 mb-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="size-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Statutory Policies & Grievance
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                QuickPress operations comply with the Consumer Protection (E-Commerce) Rules 2020 & IT Act 2000.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "terms-of-service" }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/50 font-semibold text-foreground transition-colors"
                >
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">Terms & SLAs</span>
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "privacy-policy" }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/50 font-semibold text-foreground transition-colors"
                >
                  <Shield className="size-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Privacy Policy</span>
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "cancellation-refund-policy" }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/50 font-semibold text-foreground transition-colors"
                >
                  <RefreshCcw className="size-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Refunds & Cancel</span>
                </Link>
                <Link
                  to="/legal/$docSlug"
                  params={{ docSlug: "grievance-redressal" }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/50 font-semibold text-foreground transition-colors"
                >
                  <LifeBuoy className="size-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Grievance Officer</span>
                </Link>
              </div>
            </section>

          </div>
        )}
      </div>

      <BottomNav active="help" />
      <Toaster />
    </main>
  );
}
