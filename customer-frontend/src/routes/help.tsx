import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Headphones,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { OrderSupportView } from "@/components/support/OrderSupportView";
import { TicketsListView } from "@/components/support/TicketsListView";
import { TicketChatView } from "@/components/support/TicketChatView";
import { getTicketBucket, type TicketBucket } from "@/components/support/support-utils";
import { useRealtimeEvent } from "@/shared/hooks/use-realtime";
import { playOrderBellNotificationSound } from "@/lib/order-success-sound";
import {
  createSupportTicket,
  fetchFaqList,
  fetchSupportContact,
  fetchTicket,
  fetchTickets,
  readCachedFaqs,
  readCachedTickets,
  replyToTicket,
  uploadSupportPhoto,
  TICKET_CATEGORY_OPTIONS,
  type FaqList,
  type SupportTicket,
  type TicketCategory,
} from "@/api/customer/help-api";
import { fetchOrderHistory, type OrderRecord } from "@/api/customer/history-api";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — QuickPress 24×7" },
      {
        name: "description",
        content:
          "Fast QuickPress customer support with order-specific help, photo verification, ticket lifecycle tracking and live chat.",
      },
      { property: "og:title", content: "Help & Support — QuickPress" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HelpScreen,
});

const ORDER_STATUS_PILL: Record<string, string> = {
  delivered: "bg-emerald-50 text-[#0c831f] border-emerald-200",
  "in-progress": "bg-amber-50 text-amber-800 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-blue-50 text-blue-700 border-blue-200",
};

function HelpScreen() {
  const contact = fetchSupportContact();

  // Top-level navigation: Hub | OrderSupport | LiveChat
  const [hubTab, setHubTab] = useState<"help" | "tickets">("help");
  const [ticketFilter, setTicketFilter] = useState<TicketBucket>("all");
  const [orderSupportOpen, setOrderSupportOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  // FAQs
  const [faqList, setFaqList] = useState<FaqList | null>(() => readCachedFaqs());
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Orders & Tickets
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => readCachedTickets()?.items ?? []);

  // Ticket Creation Form
  const [category, setCategory] = useState<TicketCategory>("wash-quality");
  const [subReason, setSubReason] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Chat
  const [replyText, setReplyText] = useState("");
  const [replyPhoto, setReplyPhoto] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [previewZoomPhoto, setPreviewZoomPhoto] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch recent orders
  useEffect(() => {
    let alive = true;
    setLoadingOrders(true);
    fetchOrderHistory()
      .then((records) => {
        if (alive) setOrders(records.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingOrders(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Debounced FAQ search
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Fetch FAQs
  useEffect(() => {
    const controller = new AbortController();
    fetchFaqList({
      ...(term ? { q: term } : {}),
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setFaqList(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [term]);

  // Fetch tickets
  const refreshTickets = useCallback(() => {
    fetchTickets({ forceRefresh: true })
      .then((result) => setTickets(result.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // Poll active ticket chat every 4s
  useEffect(() => {
    if (!activeTicket?.id) return;
    const interval = setInterval(() => {
      fetchTicket(activeTicket.id, { forceRefresh: true })
        .then((fresh) => {
          setActiveTicket((curr) => (curr && curr.id === fresh.id ? fresh : curr));
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicket?.id]);

  // Real-time WebSocket support messages
  useRealtimeEvent(["support:message", "support_message"], (payload: any) => {
    if (activeTicket?.id && (payload?.ticketId === activeTicket.id || !payload?.ticketId)) {
      playOrderBellNotificationSound();
      fetchTicket(activeTicket.id, { forceRefresh: true })
        .then((fresh) => setActiveTicket(fresh))
        .catch(() => {});
    }
    refreshTickets();
  });

  // Auto-scroll chat
  useEffect(() => {
    if (activeTicket) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.messages?.length, activeTicket]);

  // Open Dedicated Order Support View
  const openOrderSupport = (order: OrderRecord) => {
    setSelectedOrder(order);
    setCategory("wash-quality");
    setSubReason("");
    setDescription("");
    setPhotos([]);
    setOrderSupportOpen(true);
  };

  // Open General Topic Support View
  const openTopicSupport = (topicCategory: TicketCategory) => {
    setSelectedOrder(null);
    setCategory(topicCategory);
    setSubReason("");
    setDescription("");
    setPhotos([]);
    setOrderSupportOpen(true);
  };

  // Open Tickets Tab filtered by bucket
  const openTicketsBucket = (bucket: TicketBucket) => {
    setTicketFilter(bucket);
    setHubTab("tickets");
  };

  // Photo selection for ticket creation
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      toast.error("Maximum 3 photos allowed.");
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotos((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // Photo selection for reply
  const handleReplyPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setReplyPhoto(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Submit new ticket
  const handleCreateTicket = async () => {
    const isPhotoCompulsory = category === "wash-quality" || category === "missing-garment";
    if (isPhotoCompulsory && photos.length === 0) {
      toast.error("Please attach at least 1 garment photo so we can verify the issue.");
      return;
    }

    const catLabel =
      TICKET_CATEGORY_OPTIONS.find((c) => c.id === category)?.label ||
      (category === "refund"
        ? "Refund Status"
        : category === "partner-complaint"
          ? "Store / Captain"
          : "Support Issue");

    const finalSubject = subReason
      ? `${catLabel}: ${subReason}`
      : `${catLabel}${selectedOrder ? ` (#${selectedOrder.id})` : ""}`;

    const finalDescription = description.trim()
      ? description.trim()
      : subReason
        ? `Issue reported: ${subReason}. Reference: ${selectedOrder?.id || "General inquiry"}.`
        : "Customer requested assistance via QuickPress Support.";

    setSubmitting(true);
    setUploadingPhotos(photos.length > 0);

    try {
      const uploadedUrls: string[] = [];
      for (const photoData of photos) {
        try {
          const url = await uploadSupportPhoto(photoData);
          uploadedUrls.push(url);
        } catch {
          uploadedUrls.push(photoData);
        }
      }
      setUploadingPhotos(false);

      const ticket = await createSupportTicket({
        category,
        subject: finalSubject,
        description: finalDescription,
        priority: isPhotoCompulsory ? "high" : "medium",
        ...(selectedOrder ? { orderId: selectedOrder.orderId || selectedOrder.id } : {}),
        ...(uploadedUrls[0] ? { attachmentUrl: uploadedUrls[0] } : {}),
        ...(uploadedUrls.length > 0 ? { photos: uploadedUrls } : {}),
      });

      toast.success(`Ticket #${ticket.ticketNumber} created!`);
      refreshTickets();
      setDescription("");
      setPhotos([]);
      setSubReason("");
      setOrderSupportOpen(false);
      setActiveTicket(ticket);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Failed to create ticket.");
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  // Send live chat reply
  const handleSendReply = async () => {
    if (!activeTicket || (!replyText.trim() && !replyPhoto)) return;
    setSendingReply(true);
    try {
      let uploadedUrl: string | undefined;
      if (replyPhoto) {
        try {
          uploadedUrl = await uploadSupportPhoto(replyPhoto);
        } catch {
          uploadedUrl = replyPhoto;
        }
      }
      const bodyText = replyText.trim() || "Uploaded photo proof";
      const updated = await replyToTicket(
        activeTicket.id,
        bodyText,
        undefined,
        uploadedUrl,
        uploadedUrl ? [uploadedUrl] : undefined,
      );
      setActiveTicket(updated);
      setReplyText("");
      setReplyPhoto(null);
      refreshTickets();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  const ticketCounts = useMemo(
    () => ({
      active: tickets.filter((t) => getTicketBucket(t.status) === "active").length,
      solved: tickets.filter((t) => getTicketBucket(t.status) === "solved").length,
      closed: tickets.filter((t) => getTicketBucket(t.status) === "closed").length,
    }),
    [tickets],
  );

  const existingOrderTickets = useMemo(() => {
    if (!selectedOrder) return [];
    const targetIds = new Set([selectedOrder.id, selectedOrder.orderId].filter(Boolean));
    return tickets.filter(
      (t) =>
        (t.orderId && targetIds.has(t.orderId)) ||
        (t.orderNumber && targetIds.has(t.orderNumber)),
    );
  }, [selectedOrder, tickets]);

  // VIEW 1: LIVE TICKET CHAT
  if (activeTicket) {
    return (
      <TicketChatView
        ticket={activeTicket}
        supportPhone={contact.phone}
        replyText={replyText}
        replyPhoto={replyPhoto}
        sendingReply={sendingReply}
        previewZoomPhoto={previewZoomPhoto}
        chatBottomRef={chatBottomRef}
        replyFileInputRef={replyFileInputRef}
        onBack={() => setActiveTicket(null)}
        onChangeReplyText={setReplyText}
        onReplyPhotoSelect={handleReplyPhotoSelect}
        onClearReplyPhoto={() => setReplyPhoto(null)}
        onSendReply={() => void handleSendReply()}
        onZoomPhoto={setPreviewZoomPhoto}
      />
    );
  }

  // VIEW 2: DEDICATED ORDER SUPPORT PAGE (OR GENERAL TICKET PAGE)
  if (orderSupportOpen) {
    return (
      <OrderSupportView
        order={selectedOrder}
        existingOrderTickets={existingOrderTickets}
        supportPhone={contact.phone}
        category={category}
        subReason={subReason}
        description={description}
        photos={photos}
        submitting={submitting}
        uploadingPhotos={uploadingPhotos}
        fileInputRef={fileInputRef}
        onBack={() => setOrderSupportOpen(false)}
        onSelectCategory={(cat) => {
          setCategory(cat);
          setSubReason("");
        }}
        onSelectSubReason={setSubReason}
        onChangeDescription={setDescription}
        onPhotoSelect={handlePhotoSelect}
        onRemovePhoto={(idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
        onSubmit={() => void handleCreateTicket()}
        onOpenTicket={(tkt) => {
          setOrderSupportOpen(false);
          setActiveTicket(tkt);
        }}
      />
    );
  }

  const visibleFaqs = faqList?.items ?? [];

  // VIEW 3: MAIN SUPPORT HUB
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#fafafa] pb-28 text-zinc-950 font-sans">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar
          title="Help & Support"
          action={
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Support"
              className="flex size-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[#0c831f] transition-colors hover:bg-emerald-100"
            >
              <MessageCircle className="size-4.5 stroke-[2.2]" />
            </a>
          }
        />

        {/* Top Segmented Tabs */}
        <div className="px-4 pt-3.5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 p-1">
            <button
              type="button"
              onClick={() => setHubTab("help")}
              className={`h-9 rounded-xl text-xs transition-all cursor-pointer ${
                hubTab === "help"
                  ? "bg-white font-black text-zinc-950 shadow-2xs"
                  : "font-bold text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Help &amp; Orders
            </button>
            <button
              type="button"
              onClick={() => setHubTab("tickets")}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                hubTab === "tickets"
                  ? "bg-white font-black text-zinc-950 shadow-2xs"
                  : "font-bold text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>My Tickets</span>
              {tickets.length > 0 ? (
                <span className="rounded-full bg-[#0c831f] px-1.5 py-0.5 text-[9px] font-black text-white tabular-nums">
                  {tickets.length}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {hubTab === "help" ? (
          <div className="px-4 pt-4 space-y-5">
            {/* Ticket Status Summary Strip */}
            <section className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => openTicketsBucket("active")}
                className="rounded-2xl border border-zinc-200/80 bg-white p-3 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Active
                </p>
                <p className="mt-1 text-lg font-black text-amber-600 tabular-nums font-mono">
                  {ticketCounts.active}
                </p>
              </button>
              <button
                type="button"
                onClick={() => openTicketsBucket("solved")}
                className="rounded-2xl border border-zinc-200/80 bg-white p-3 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Solved
                </p>
                <p className="mt-1 text-lg font-black text-[#0c831f] tabular-nums font-mono">
                  {ticketCounts.solved}
                </p>
              </button>
              <button
                type="button"
                onClick={() => openTicketsBucket("closed")}
                className="rounded-2xl border border-zinc-200/80 bg-white p-3 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Closed
                </p>
                <p className="mt-1 text-lg font-black text-zinc-700 tabular-nums font-mono">
                  {ticketCounts.closed}
                </p>
              </button>
            </section>

            {/* Recent Orders (Tap an Order -> Dedicated Order Support Page) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Need Help With an Order?
                </h2>
                <Link
                  to="/history"
                  className="text-[11px] font-bold text-[#0c831f] hover:underline"
                >
                  All Orders →
                </Link>
              </div>

              {loadingOrders ? (
                <div className="space-y-2">
                  <div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
                  <div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.map((ord) => {
                    const pillClass =
                      ORDER_STATUS_PILL[ord.status] ||
                      "bg-zinc-100 text-zinc-700 border-zinc-200";
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => openOrderSupport(ord)}
                        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-2xs transition-all hover:border-[#0c831f] active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                            <Package className="size-4 stroke-[2.2]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-zinc-950 font-mono">
                                #{ord.id}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[9px] font-black capitalize ${pillClass}`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-semibold text-zinc-700">
                              {ord.store} · {ord.service}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {ord.placedOn} · ₹{ord.total}
                            </p>
                          </div>
                        </div>

                        <span className="flex shrink-0 items-center gap-0.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-[#0c831f] group-hover:bg-[#0c831f] group-hover:text-white transition-colors">
                          <span>Help</span>
                          <ChevronRight className="size-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 text-center shadow-2xs space-y-2">
                  <p className="text-xs font-bold text-zinc-800">No recent orders found</p>
                  <button
                    type="button"
                    onClick={() => openTopicSupport("general")}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#0c831f] px-4 text-xs font-black text-white cursor-pointer"
                  >
                    Raise General Ticket
                  </button>
                </div>
              )}
            </section>

            {/* Other Support Topics */}
            <section className="space-y-2.5">
              <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Other Support Topics
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openTopicSupport("payment")}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer space-y-2"
                >
                  <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                    <CreditCard className="size-4 stroke-[2.2]" />
                  </span>
                  <p className="text-xs font-black text-zinc-950">Payment &amp; Wallet</p>
                </button>

                <button
                  type="button"
                  onClick={() => openTopicSupport("general")}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer space-y-2"
                >
                  <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                    <Sparkles className="size-4 stroke-[2.2]" />
                  </span>
                  <p className="text-xs font-black text-zinc-950">Quick+ &amp; Offers</p>
                </button>

                <button
                  type="button"
                  onClick={() => openTopicSupport("partner-complaint")}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer space-y-2"
                >
                  <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                    <Store className="size-4 stroke-[2.2]" />
                  </span>
                  <p className="text-xs font-black text-zinc-950">Partner Feedback</p>
                </button>

                <button
                  type="button"
                  onClick={() => openTopicSupport("general")}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-2xs transition-colors hover:border-[#0c831f] cursor-pointer space-y-2"
                >
                  <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                    <MessageSquare className="size-4 stroke-[2.2]" />
                  </span>
                  <p className="text-xs font-black text-zinc-950">General Inquiry</p>
                </button>
              </div>
            </section>

            {/* Quick Direct Channels */}
            <section className="space-y-2">
              <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Direct Care Channels
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`tel:${contact.phone}`}
                  className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-2xs transition-colors hover:border-[#0c831f]"
                >
                  <Headphones className="mb-1.5 size-4.5 text-[#0c831f]" />
                  <span className="text-[11px] font-black text-zinc-950">Call</span>
                </a>

                <a
                  href={`https://wa.me/${contact.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-2xs transition-colors hover:border-[#0c831f]"
                >
                  <MessageCircle className="mb-1.5 size-4.5 text-[#0c831f]" />
                  <span className="text-[11px] font-black text-zinc-950">WhatsApp</span>
                </a>

                <a
                  href={`mailto:${contact.email}`}
                  className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-2xs transition-colors hover:border-[#0c831f]"
                >
                  <Mail className="mb-1.5 size-4.5 text-[#0c831f]" />
                  <span className="text-[11px] font-black text-zinc-950">Email</span>
                </a>
              </div>
            </section>

            {/* FAQs */}
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Frequently Asked Questions
              </h3>

              <div className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3">
                <Search className="size-3.5 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-transparent text-xs font-medium text-zinc-950 outline-none placeholder:text-zinc-400"
                />
              </div>

              <div className="divide-y divide-zinc-100">
                {visibleFaqs.slice(0, 5).map((faq) => {
                  const isOpen = openFaq === faq.id;
                  return (
                    <div key={faq.id} className="py-2.5 first:pt-1 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                        className="flex w-full items-center justify-between gap-2 text-left text-xs font-bold text-zinc-950 cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-[#0c831f]" : ""
                          }`}
                        />
                      </button>
                      {isOpen ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
                          {faq.answer}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Statutory & Grievance Desk Shortcut */}
            <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white divide-y divide-zinc-100 shadow-2xs">
              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "cancellation-refund-policy" }}
                className="flex items-center justify-between px-4 py-3 text-xs font-bold text-zinc-900 hover:bg-zinc-50"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-[#0c831f]" />
                  <span>Cancellation &amp; Refund Policy</span>
                </span>
                <ChevronRight className="size-4 text-zinc-400" />
              </Link>
              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "grievance-redressal" }}
                className="flex items-center justify-between px-4 py-3 text-xs font-bold text-zinc-900 hover:bg-zinc-50"
              >
                <span className="flex items-center gap-2.5">
                  <Scale className="size-4 text-[#0c831f]" />
                  <span>Grievance &amp; Nodal Officer Desk</span>
                </span>
                <ExternalLink className="size-3.5 text-zinc-400" />
              </Link>
            </section>
          </div>
        ) : (
          <div className="px-4 pt-4">
            <TicketsListView
              tickets={tickets}
              filter={ticketFilter}
              onChangeFilter={setTicketFilter}
              onOpenTicket={(tkt) => setActiveTicket(tkt)}
              onRaiseNew={() => setHubTab("help")}
            />
          </div>
        )}
      </div>

      <BottomNav active="help" />
    </main>
  );
}
