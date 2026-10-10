import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Headphones,
  HelpCircle,
  Image as ImageIcon,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  MessagesSquare,
  Package,
  Percent,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { HelpSkeleton } from "@/components/account/AccountSkeletons";
import { BottomNav } from "@/components/home/BottomNav";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { useRealtimeEvent } from "@/shared/hooks/use-realtime";
import { playOrderBellNotificationSound } from "@/lib/order-success-sound";
import {
  createSupportTicket,
  fetchFaqCategories,
  fetchFaqList,
  fetchSupportContact,
  fetchTicket,
  fetchTickets,
  readCachedFaqs,
  readCachedTickets,
  replyToTicket,
  uploadSupportPhoto,
  TICKET_CATEGORY_OPTIONS,
  TICKET_STATUS_LABEL,
  type FaqCategory,
  type FaqList,
  type SupportTicket,
  type TicketCategory,
} from "@/api/customer/help-api";
import { fetchOrderHistory, type OrderRecord } from "@/api/customer/history-api";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center & Live Support — QuickPress 24×7" },
      {
        name: "description",
        content:
          "Fast QuickPress customer support with live chat, photo upload for garment issues, order-linked tickets and 24x7 helpline.",
      },
      { property: "og:title", content: "Help Center & Live Support — QuickPress" },
      {
        property: "og:description",
        content: "Live chat, garment photo verification, and order-linked support tickets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpScreen,
});

const SUB_REASONS: Record<string, string[]> = {
  "wash-quality": [
    "Stains not removed",
    "Fabric damaged / Torn",
    "Color bleeding / Faded",
    "Bad smell / Improper wash",
    "Crease / Ironing issue",
  ],
  "missing-garment": [
    "One or more clothes missing",
    "Received wrong garment",
    "Cloth tag / hanger missing",
  ],
  delay: [
    "Rider hasn't arrived for pickup",
    "Delivery is past scheduled slot",
    "Unable to contact rider",
  ],
  payment: [
    "Double charged on UPI / Card",
    "Refund not received in wallet",
    "Coupon discount was not applied",
  ],
  general: [
    "Inquiry about dry clean rates",
    "Special garment care request",
    "Account or profile question",
  ],
};

function HelpScreen() {
  const navigate = useNavigate();
  const contact = fetchSupportContact();

  // Navigation & Tab state
  const [activeTab, setActiveTab] = useState<"need-help" | "my-tickets">("need-help");
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  // FAQ state
  const [faqList, setFaqList] = useState<FaqList | null>(null);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Order selection state
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Ticket creation form state
  const [category, setCategory] = useState<TicketCategory>("wash-quality");
  const [subReason, setSubReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Chat state
  const [replyText, setReplyText] = useState("");
  const [replyPhoto, setReplyPhoto] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [previewZoomPhoto, setPreviewZoomPhoto] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial FAQs and tickets
  useEffect(() => {
    const cachedFaqs = readCachedFaqs();
    if (cachedFaqs) {
      setFaqList(cachedFaqs);
      setCategories(cachedFaqs.categories ?? []);
    }
    const cachedTix = readCachedTickets();
    if (cachedTix?.items) {
      setTickets(cachedTix.items);
    }
  }, []);

  // Fetch recent orders for selection
  useEffect(() => {
    let active = true;
    setLoadingOrders(true);
    fetchOrderHistory()
      .then((records) => {
        if (active) {
          setOrders(records.slice(0, 5));
          if (records.length > 0 && !selectedOrder) {
            setSelectedOrder(records[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingOrders(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounce FAQ search
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Fetch FAQs
  useEffect(() => {
    const controller = new AbortController();
    setFaqsLoading(true);
    fetchFaqList({
      category: activeCategory,
      ...(term ? { q: term } : {}),
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setFaqList(result);
        if (result.categories.length) setCategories(result.categories);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setFaqsLoading(false);
      });
    return () => controller.abort();
  }, [activeCategory, term]);

  // Fetch Tickets list
  const refreshTickets = useCallback(() => {
    fetchTickets()
      .then((result) => setTickets(result.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // Auto-poll active ticket conversation every 4s
  useEffect(() => {
    if (!activeTicket?.id) return;
    const interval = setInterval(() => {
      fetchTicket(activeTicket.id)
        .then((fresh) => {
          setActiveTicket((curr) => (curr && curr.id === fresh.id ? fresh : curr));
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicket?.id]);

  // Instant sub-second chat update via real-time WebSocket connection
  useRealtimeEvent(["support:message", "support_message"], (payload: any) => {
    if (activeTicket?.id && (payload?.ticketId === activeTicket.id || !payload?.ticketId)) {
      playOrderBellNotificationSound();
      fetchTicket(activeTicket.id)
        .then((fresh) => {
          setActiveTicket(fresh);
        })
        .catch(() => {});
    }
    refreshTickets();
  });

  // Scroll chat to bottom when messages update
  useEffect(() => {
    if (activeTicket) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.messages]);

  // Handle image picker for Ticket creation
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      toast.error("You can upload a maximum of 3 photos.");
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

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Photo select for live chat reply
  const handleReplyPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReplyPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Submit Ticket Creation (5-step flow result)
  const handleCreateTicket = async () => {
    const isPhotoCompulsory = category === "wash-quality" || category === "missing-garment";
    if (isPhotoCompulsory && photos.length === 0) {
      toast.error("Please upload at least 1 photo of the garment so we can verify the issue.");
      return;
    }

    const finalSub = subReason
      ? `${TICKET_CATEGORY_OPTIONS.find((c) => c.id === category)?.label}: ${subReason}`
      : `${TICKET_CATEGORY_OPTIONS.find((c) => c.id === category)?.label || "Laundry Issue"}${
          selectedOrder ? ` (#${selectedOrder.id})` : ""
        }`;

    const finalDesc = description.trim()
      ? description.trim()
      : subReason
        ? `Issue reported: ${subReason}. Reference: ${selectedOrder?.id || "General inquiry"}.`
        : "Customer reported an issue and requested assistance.";

    setSubmitting(true);
    setUploadingPhotos(true);

    try {
      // 1. Upload photos to Cloudinary CDN
      const uploadedUrls: string[] = [];
      for (const photoData of photos) {
        try {
          const url = await uploadSupportPhoto(photoData);
          uploadedUrls.push(url);
        } catch {
          // Fallback to data url if offline/demo
          uploadedUrls.push(photoData);
        }
      }

      setUploadingPhotos(false);

      // 2. Create Ticket
      const ticket = await createSupportTicket({
        category,
        subject: finalSub,
        description: finalDesc,
        priority: isPhotoCompulsory ? "high" : "medium",
        orderId: selectedOrder?.orderId || selectedOrder?.id || undefined,
        attachmentUrl: uploadedUrls[0] || undefined,
        photos: uploadedUrls,
      });

      toast.success(`Ticket #${ticket.ticketNumber} created!`);
      refreshTickets();

      // Reset form
      setDescription("");
      setPhotos([]);
      setSubReason("");

      // Open Live Chat immediately!
      setActiveTicket(ticket);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Failed to create ticket.");
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  // Send Reply in Live Chat
  const handleSendReply = async () => {
    if (!activeTicket || (!replyText.trim() && !replyPhoto)) return;

    setSendingReply(true);
    try {
      let uploadedUrl: string | undefined = undefined;
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

  const visibleFaqs = faqList?.items ?? [];

  // =========================================================================
  // VIEW: FULL SCREEN LIVE CHAT (When a ticket is open)
  // =========================================================================
  if (activeTicket) {
    const isPhotoCompulsory =
      activeTicket.category === "wash-quality" || activeTicket.category === "missing-garment";

    return (
      <main className="relative flex h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        {/* Top Chat Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur-md dark:bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTicket(null)}
              className="flex size-9 items-center justify-center rounded-2xl bg-muted text-foreground transition-transform active:scale-90"
              aria-label="Back to tickets"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xs">
                  <LifeBuoy className="size-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black tracking-tight text-foreground">
                    QuickPress Care
                  </p>
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    Online
                  </span>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  #{activeTicket.ticketNumber} · {TICKET_STATUS_LABEL[activeTicket.status] || activeTicket.status}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${contact.phone}`}
              className="flex size-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-label="Call Support"
            >
              <Headphones className="size-4" />
            </a>
          </div>
        </header>

        {/* Order Reference Pill (if order linked) */}
        {activeTicket.orderNumber ? (
          <div className="flex items-center justify-between border-b border-border/60 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex items-center gap-1.5">
              <Package className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Linked to Order #{activeTicket.orderNumber}</span>
            </div>
            <Link
              to="/history"
              className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 underline dark:text-emerald-300"
            >
              View Order <ExternalLink className="size-2.5" />
            </Link>
          </div>
        ) : null}

        {/* Messages Stream */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
          {/* Issue Header Info Card */}
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center">
            <p className="text-[11px] font-bold text-foreground">
              {activeTicket.subject}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {activeTicket.categoryLabel} · Priority: {activeTicket.priority.toUpperCase()}
            </p>
          </div>

          {activeTicket.messages?.map((msg) => {
            const isCustomer = msg.author === "customer";
            const isSystem = msg.author === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="my-2 flex justify-center">
                  <div className="max-w-[85%] rounded-2xl bg-muted/60 px-3.5 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                    {msg.body}
                  </div>
                </div>
              );
            }

            const photosList = msg.photos || (msg.attachmentUrl ? [msg.attachmentUrl] : []);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
              >
                <div className="flex items-end gap-1.5 max-w-[82%]">
                  {!isCustomer && (
                    <div className="mb-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                      Q
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                      isCustomer
                        ? "rounded-br-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                        : "rounded-bl-xs border border-border bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {/* Attached Photos */}
                    {photosList.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {photosList.map((photoUrl, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setPreviewZoomPhoto(photoUrl)}
                            className="group relative size-20 overflow-hidden rounded-xl border border-black/10 bg-black/5"
                          >
                            <img
                              src={photoUrl}
                              alt="Garment attachment"
                              className="size-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                              <Search className="size-4 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>

                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                        isCustomer ? "text-emerald-100/80" : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                      {isCustomer && <CheckCircle2 className="size-2.5" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={chatBottomRef} />
        </div>

        {/* Reply Photo Thumbnail Preview */}
        {replyPhoto && (
          <div className="flex items-center gap-2 border-t border-border bg-white px-4 py-2 dark:bg-zinc-900">
            <div className="relative size-14 overflow-hidden rounded-xl border border-border">
              <img src={replyPhoto} alt="Pending upload" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setReplyPhoto(null)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Photo ready to send with reply</p>
          </div>
        )}

        {/* Chat Input Bar */}
        <footer className="border-t border-border bg-white p-3 dark:bg-zinc-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendReply();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={replyFileInputRef}
              onChange={handleReplyPhotoSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => replyFileInputRef.current?.click()}
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Attach photo"
            >
              <Camera className="size-4" />
            </button>

            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your message..."
              disabled={sendingReply}
              className="h-10 flex-1 rounded-2xl border border-border bg-muted/40 px-3.5 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-emerald-500 focus:bg-background"
            />

            <button
              type="submit"
              disabled={sendingReply || (!replyText.trim() && !replyPhoto)}
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs transition-transform active:scale-95 disabled:opacity-40"
              aria-label="Send"
            >
              {sendingReply ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </form>
        </footer>

        {/* Photo Zoom Modal */}
        {previewZoomPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setPreviewZoomPhoto(null)}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            >
              <X className="size-5" />
            </button>
            <img
              src={previewZoomPhoto}
              alt="Zoomed garment proof"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        )}
      </main>
    );
  }

  // =========================================================================
  // VIEW: MAIN HELP CENTER SCREEN
  // =========================================================================
  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white pb-32 dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar
          title="Help & Support"
          action={
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Support"
              className="flex size-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <MessageCircle className="size-4" />
            </a>
          }
        />

        {/* Segmented Top Tabs */}
        <div className="px-5 pt-3">
          <div className="flex rounded-2xl border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("need-help")}
              className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${
                activeTab === "need-help"
                  ? "bg-white text-emerald-800 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Need Help?
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my-tickets")}
              className={`relative flex-1 rounded-xl py-2 text-xs font-black transition-all ${
                activeTab === "my-tickets"
                  ? "bg-white text-emerald-800 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Tickets
              {tickets.length > 0 && (
                <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  {tickets.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 1: NEED HELP? (5-STEP TICKET CREATION & LIVE CHAT FLOW) */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === "need-help" ? (
          <div className="px-5 pt-4 space-y-6">
            {/* Step 1 & 2: Recent Orders Carousel */}
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                    1. Select an Order
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Choose the laundry order you need help with
                  </p>
                </div>
                {selectedOrder && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-[10px] font-bold text-emerald-600 underline dark:text-emerald-400"
                  >
                    Clear
                  </button>
                )}
              </div>

              {loadingOrders ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <div className="h-24 w-48 shrink-0 animate-pulse rounded-2xl bg-muted/60" />
                  <div className="h-24 w-48 shrink-0 animate-pulse rounded-2xl bg-muted/60" />
                </div>
              ) : orders.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                  {orders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className={`flex w-52 shrink-0 flex-col justify-between rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20 dark:bg-emerald-950/30"
                            : "border-border bg-card hover:border-border/80"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-tight text-foreground">
                              #{ord.id}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold capitalize ${
                                ord.status === "delivered"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
                            {ord.service} · {ord.store}
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground">₹{ord.total}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {ord.placedOn}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className={`flex w-36 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed p-3 text-center transition-all ${
                      selectedOrder === null
                        ? "border-emerald-600 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <HelpCircle className="size-5 mb-1 opacity-70" />
                    <span className="text-[10px] font-bold">General Inquiry (No Order)</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                  No recent orders found. You can raise a general inquiry below.
                </div>
              )}
            </section>

            {/* Step 3: Issue Category Selector */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground mb-2">
                2. What issue are you facing?
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {TICKET_CATEGORY_OPTIONS.map((opt) => {
                  const isSelected = category === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setCategory(opt.id);
                        setSubReason("");
                      }}
                      className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 font-black text-emerald-950 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "border-border bg-card text-foreground hover:bg-muted/40 font-bold"
                      }`}
                    >
                      <span className="text-base">
                        {opt.id === "wash-quality"
                          ? "🧼"
                          : opt.id === "missing-garment"
                            ? "👔"
                            : opt.id === "delay"
                              ? "⏱️"
                              : opt.id === "payment"
                                ? "💳"
                                : "❓"}
                      </span>
                      <span className="text-xs leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-reasons chips */}
              {SUB_REASONS[category] && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUB_REASONS[category].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSubReason(reason)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        subReason === reason
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Step 4: Photo Proof Upload & Description */}
            <section className="rounded-3xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                  3. Upload Garment Photo
                </h2>
                {(category === "wash-quality" || category === "missing-garment") && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                    Photo Required *
                  </span>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground mb-3">
                {category === "wash-quality" || category === "missing-garment"
                  ? "Please take a photo of the stain, fabric damage, or cloth tag for fast resolution."
                  : "Optional: Upload photos to help our team understand the issue."}
              </p>

              {/* Photo Previews & Picker */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              <div className="flex flex-wrap gap-2.5">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative size-20 overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-xs"
                  >
                    <img src={photo} alt="Preview" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

                {photos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex size-20 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/40 text-emerald-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-300"
                  >
                    <Camera className="size-5" />
                    <span className="mt-1 text-[9px] font-black">
                      {photos.length === 0 ? "Add Photo" : "Add More"}
                    </span>
                  </button>
                )}
              </div>

              {/* Description Input */}
              <div className="mt-4">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Describe what happened
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. White shirt ke sleeve par coffee daag reh gaya hai..."
                  rows={2}
                  className="w-full rounded-2xl border border-border bg-muted/30 p-3 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:bg-background"
                />
              </div>

              {/* Step 5 CTA: Create Ticket & Live Chat */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCreateTicket()}
                className="ripple mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-xs font-black tracking-wide text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {uploadingPhotos ? "Uploading photos..." : "Creating ticket..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Create Ticket & Start Live Chat
                  </>
                )}
              </button>
            </section>

            {/* Quick Actions (Call, WhatsApp, Email) */}
            <section className="grid grid-cols-3 gap-2.5">
              <a
                href={`tel:${contact.phone}`}
                className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:bg-muted/40"
              >
                <Headphones className="size-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold text-foreground">Call Support</span>
                <span className="text-[9px] text-muted-foreground">Toll Free</span>
              </a>

              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:bg-muted/40"
              >
                <MessageCircle className="size-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold text-foreground">WhatsApp</span>
                <span className="text-[9px] text-muted-foreground">Chat Instantly</span>
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:bg-muted/40"
              >
                <Mail className="size-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold text-foreground">Email Desk</span>
                <span className="text-[9px] text-muted-foreground">24h SLA</span>
              </a>
            </section>

            {/* Popular FAQs Section */}
            <section className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Frequently Asked Questions
                </h3>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Instant Answers
                </span>
              </div>

              {/* Search FAQ */}
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 mb-3">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="divide-y divide-border/60">
                {visibleFaqs.slice(0, 5).map((faq) => {
                  const isOpen = openFaq === faq.id;
                  return (
                    <div key={faq.id} className="py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                        className="flex w-full items-center justify-between text-left text-xs font-bold text-foreground"
                      >
                        <span className="pr-2">{faq.question}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          /* ----------------------------------------------------------------- */
          /* TAB 2: MY TICKETS (HISTORY & STATUS TRACKING) */
          /* ----------------------------------------------------------------- */
          <div className="px-5 pt-4 space-y-3">
            {tickets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center">
                <MessagesSquare className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">No support tickets raised</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  If you face any issue with washing, delay, or missing clothes, tap "Need Help?" to create a ticket.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("need-help")}
                  className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Raise an Issue
                </button>
              </div>
            ) : (
              tickets.map((tkt) => {
                const photosList = tkt.photos || (tkt.attachmentUrl ? [tkt.attachmentUrl] : []);
                return (
                  <article
                    key={tkt.id}
                    onClick={() => setActiveTicket(tkt)}
                    className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-emerald-500 hover:shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-foreground">
                            #{tkt.ticketNumber}
                          </span>
                          {tkt.orderNumber && (
                            <span className="rounded-md bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                              Order #{tkt.orderNumber}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-bold text-foreground line-clamp-1">
                          {tkt.subject}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          tkt.status === "open"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : tkt.status === "in-progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : tkt.status === "resolved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {TICKET_STATUS_LABEL[tkt.status] || tkt.status}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {tkt.description}
                    </p>

                    {/* Photos indicator if attached */}
                    {photosList.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <ImageIcon className="size-3 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          {photosList.length} Photo{photosList.length > 1 ? "s" : ""} verified
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                      <span>{tkt.categoryLabel}</span>
                      <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                        Open Chat ({tkt.messageCount}) &rarr;
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>

      <BottomNav active="help" />
    </main>
  );
}
