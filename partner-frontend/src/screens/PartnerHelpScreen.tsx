import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { partnerRoutes } from "../navigation/partner-routes";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import {
  createPartnerTicket,
  fetchPartnerTickets,
  ORDER_HELP_TOPICS,
  type OrderHelpTopic,
  type SupportTicket,
  type TicketCategory,
  type TicketPriority,
} from "../api/partner/partner-help-api";

const FAQ_ITEMS = [
  {
    q: "How does the store payout settlement work?",
    a: "All completed orders delivered to customers are aggregated and settled automatically in 7-day weekly automated cycles into your registered bank account via direct IMPS/NEFT bank transfer with itemized GST, commission, and statutory tax reconciliation.",
  },
  {
    q: "What should I do if a customer is unreachable during doorstep delivery?",
    a: "The delivery captain must wait a mandatory 10 minutes at the customer's address and attempt at least 2 phone calls via the secure caller relay. If still unreachable, the captain returns the clean clothes safely to your store hub.",
  },
  {
    q: "How do I hand over packed clothes to the arriving Delivery Captain?",
    a: "When garments are cleaned and packed, click 'Mark Ready' in your order details. When the Delivery Captain arrives at your store, ask them for their 4-digit Dispatch Code shown on their screen. Enter it in your console to verify custody transfer.",
  },
  {
    q: "What if garments received in the bag do not match the customer's booking checklist?",
    a: "Immediately pause washing for that bag. Go to the Order-Wise Help tab in this Help Centre, select the order, and choose 'Garment Count / Item Discrepancy'. Take a quick photo of the contents. Our merchant support team will mediate with the customer.",
  },
  {
    q: "Can I temporarily pause incoming orders during peak wash rush?",
    a: "Yes. From your top navigation bar or Outlet info page, toggle your store status from 'Online' to 'Offline' or use the Capacity Pause feature. Existing orders in progress will remain active, but new customer bookings will pause until you turn online again.",
  },
  {
    q: "How do I request branded QuickPress packaging bags, garment covers, and tags?",
    a: "Raise a support ticket under 'Store Operations & Packaging Supplies' or message our Partner Supplies desk via WhatsApp. Packaging bundles are dispatched to your store within 24 hours.",
  },
];

export function PartnerHelpScreen() {
  const navigate = useNavigate();
  const { orders } = usePartnerOrders();

  const [activeTab, setActiveTab] = useState<"order_help" | "general_help" | "tickets" | "faqs">("order_help");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Order-wise help state
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<OrderHelpTopic | null>(null);

  // Support Ticket Modal state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>("order_issue");
  const [ticketOrderCode, setTicketOrderCode] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>("normal");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Search filter
  const [faqSearch, setFaqSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await fetchPartnerTickets();
      setTickets(data);
    } catch {
      toast.error("Failed to fetch support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Default to first order if available
  useEffect(() => {
    if (!selectedOrderCode && orders.length > 0) {
      setSelectedOrderCode(orders[0].code);
    }
  }, [orders, selectedOrderCode]);

  const selectedOrder = useMemo(() => {
    return orders.find(
      (o) =>
        o.code?.toLowerCase() === selectedOrderCode.toLowerCase() ||
        o.id?.toLowerCase() === selectedOrderCode.toLowerCase()
    );
  }, [orders, selectedOrderCode]);

  const handleOpenTicketForOrder = (topic?: OrderHelpTopic) => {
    setTicketCategory("order_issue");
    setTicketOrderCode(selectedOrder ? selectedOrder.code : selectedOrderCode);
    if (topic) {
      setTicketSubject(`${topic.title} · Order #${selectedOrder?.code || selectedOrderCode}`);
      setTicketDescription(`Issue regarding Order #${selectedOrder?.code || selectedOrderCode}:\n${topic.shortDesc}\n\nDetails:\n`);
      setTicketPriority(topic.defaultPriority);
    } else {
      setTicketSubject(`Order Query · Order #${selectedOrder?.code || selectedOrderCode}`);
      setTicketDescription("");
      setTicketPriority("normal");
    }
    setShowTicketModal(true);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast.error("Please fill in both the ticket subject and description.");
      return;
    }
    setIsSubmittingTicket(true);
    try {
      const categoryLabelMap: Record<TicketCategory, string> = {
        order_issue: "Order Issue",
        payout_finance: "Payout & Finance",
        delivery_captain: "Delivery Fleet",
        garment_damage: "Garment & Quality",
        store_operations: "Store Operations",
        other: "General Help",
      };

      const newTicket = await createPartnerTicket({
        category: ticketCategory,
        categoryLabel: categoryLabelMap[ticketCategory],
        orderCode: ticketOrderCode || undefined,
        subject: ticketSubject,
        description: ticketDescription,
        priority: ticketPriority,
      });

      setTickets((prev) => [newTicket, ...prev]);
      toast.success(`✓ Support Ticket #${newTicket.id} created! Our Merchant Ops team will respond shortly.`);
      setShowTicketModal(false);
      setTicketSubject("");
      setTicketDescription("");
      setTicketOrderCode("");
      setActiveTab("tickets");
    } catch {
      toast.error("Failed to create support ticket. Please try again.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQ_ITEMS;
    const q = faqSearch.toLowerCase();
    return FAQ_ITEMS.filter((item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q));
  }, [faqSearch]);

  return (
    <PartnerLayout
      activeTab="settings"
      title="Partner Support & Help Centre"
      subtitle="Order troubleshooting, dedicated helpline, payouts, and ticket management"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-6 space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Back to Orders"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-zinc-950 tracking-tight">
                  Partner Help Centre &amp; Operations Support
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                  24x7 Active
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Instant resolution for active orders, delivery fleet coordination, bank payouts, and support tickets.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTicketCategory("other");
              setTicketOrderCode("");
              setTicketSubject("");
              setTicketDescription("");
              setShowTicketModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="size-4" />
            <span>Raise Support Ticket</span>
          </button>
        </div>

        {/* Priority Helpline Quick Strip */}
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href="tel:18008897842"
            className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:scale-105 transition-transform">
              <PhoneCall className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority Helpline</p>
              <p className="text-sm font-black text-zinc-950">1800-889-QUICK</p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Toll-Free · Instant Connect</p>
            </div>
          </a>

          <a
            href="https://wa.me/919876543210?text=Hi%20QuickPress%20Support,%20I%20need%20help%20with%20my%20partner%20store."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:scale-105 transition-transform">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">WhatsApp Merchant Desk</p>
              <p className="text-sm font-black text-zinc-950">+91 98765 43210</p>
              <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Chat with Merchant Ops Team</p>
            </div>
          </a>

          <a
            href="mailto:official.quickpress@gmail.com?subject=Partner%20Support%20Request"
            className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 group-hover:scale-105 transition-transform">
              <Mail className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Official Email Desk</p>
              <p className="text-sm font-black text-zinc-950">official.quickpress@gmail.com</p>
              <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Formal Inquiries &amp; Statements</p>
            </div>
          </a>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("order_help")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "order_help"
                ? "bg-zinc-950 text-white shadow-2xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Package className="size-4" />
            <span>1. Order-Wise Help</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("general_help")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "general_help"
                ? "bg-zinc-950 text-white shadow-2xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Store className="size-4" />
            <span>2. Store &amp; Operational Help</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "tickets"
                ? "bg-zinc-950 text-white shadow-2xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <LifeBuoy className="size-4" />
            <span>3. Support Tickets ({tickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "faqs"
                ? "bg-zinc-950 text-white shadow-2xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <HelpCircle className="size-4" />
            <span>4. Merchant FAQs &amp; Guidelines</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ORDER-WISE HELP                                                    */}
        {/* ========================================================================= */}
        {activeTab === "order_help" && (
          <div className="space-y-6">
            {/* Order Selector Card */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-100">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                    Select Order for Instant Resolution
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Pick an active or past order to troubleshoot customer, delivery, or payout issues directly.
                  </p>
                </div>
                {selectedOrder && (
                  <Link
                    to={partnerRoutes.orderDetails}
                    params={{ orderId: selectedOrder.id }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 hover:underline cursor-pointer"
                  >
                    <span>View Order Details</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>

              {/* Order Selection Pill Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-zinc-500">Recent Orders:</span>
                {orders.slice(0, 6).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrderCode(o.code);
                      setSelectedTopic(null);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      selectedOrderCode === o.code
                        ? "bg-zinc-950 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                    }`}
                  >
                    #{o.code}
                  </button>
                ))}
              </div>

              {/* Selected Order Summary Banner */}
              {selectedOrder ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white font-black text-sm">
                      <Package className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-zinc-950">Order #{selectedOrder.code}</span>
                        <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.2 text-[10px] font-bold text-zinc-700 capitalize">
                          {selectedOrder.stage}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        Customer: <strong className="text-zinc-800">{selectedOrder.customerName}</strong> · Bill: <strong className="text-zinc-950">₹{selectedOrder.amount}</strong> · {selectedOrder.services.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedOrder.customerPhone && (
                      <a
                        href={`tel:${selectedOrder.customerPhone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                      >
                        <PhoneCall className="size-3.5 text-emerald-700" />
                        <span>Call Customer</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenTicketForOrder()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Raise Ticket</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Real Order Action & Resolution Pathways */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                    Order Assistance &amp; Direct Resolution
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Immediate escalation pathways for active or delivered bookings
                  </p>
                </div>
                {selectedOrder && (
                  <button
                    type="button"
                    onClick={() => handleOpenTicketForOrder()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="size-3.5" />
                    <span>Raise Ticket for #{selectedOrder.code}</span>
                  </button>
                )}
              </div>

              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Bike className="size-4 text-blue-600" />
                    <span className="text-xs font-bold text-zinc-900">Captain Coordination</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Check captain ETA or report doorstep handoff delays directly to fleet dispatch.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketCategory("delivery_captain");
                      setTicketOrderCode(selectedOrder?.code || "");
                      setTicketSubject(`Delivery Captain Query · Order #${selectedOrder?.code || ""}`);
                      setTicketDescription("Captain coordination inquiry:");
                      setShowTicketModal(true);
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>Contact Logistics →</span>
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shirt className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-zinc-900">Garment &amp; Quality Query</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Flag pre-existing fabric stains, count discrepancies, or special laundry instructions.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketCategory("garment_damage");
                      setTicketOrderCode(selectedOrder?.code || "");
                      setTicketSubject(`Garment Care Query · Order #${selectedOrder?.code || ""}`);
                      setTicketDescription("Garment inspection / stain warning details:");
                      setShowTicketModal(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>Report Discrepancy →</span>
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-zinc-900" />
                    <span className="text-xs font-bold text-zinc-900">Billing &amp; Settlement</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Audit order gross value, platform commission deduction, and GST credit invoice.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketCategory("payout_finance");
                      setTicketOrderCode(selectedOrder?.code || "");
                      setTicketSubject(`Settlement Ledger Query · Order #${selectedOrder?.code || ""}`);
                      setTicketDescription("Audit net payout breakdown:");
                      setShowTicketModal(true);
                    }}
                    className="text-xs font-bold text-zinc-900 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>Verify Settlement →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GENERAL STORE & OPERATIONAL HELP                                   */}
        {/* ========================================================================= */}
        {activeTab === "general_help" && (
          <div className="grid gap-5 md:grid-cols-2">
            {/* 1. Payouts & Finance */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">
                    Payouts, Bank &amp; Finances
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Automated weekly 7-day cycles &amp; tax reconciliation</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-700">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">📅 Automated 7-Day Weekly Cycle</p>
                  <p className="mt-0.5 text-zinc-600">
                    All completed orders are settled weekly into your verified bank account via direct IMPS bank transfer every Monday.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">📑 Itemized GST &amp; Tax Reconciliations</p>
                  <p className="mt-0.5 text-zinc-600">
                    Download official double-entry settlement statements (PDF &amp; Excel) and Monthly SAC 998311 GST Invoices for Input Tax Credit (ITC).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTicketCategory("payout_finance");
                  setTicketSubject("Bank Account / Payout Settlement Assistance");
                  setTicketDescription("Please assist with my store payout / bank settlement query:");
                  setShowTicketModal(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <span>Raise Payout Support Query</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            {/* 2. Delivery Fleet & Logistics */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                  <Bike className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">
                    Delivery Fleet &amp; Captains
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Logistics handoff, OTP verification &amp; radius</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-700">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">🔒 Physical Handshake Dispatch OTP</p>
                  <p className="mt-0.5 text-zinc-600">
                    Never release packed clothes to a captain without entering their 4-digit code in your console. This transfers legal custody and protects your store.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">🛵 Captain Breakdown / Delay SOP</p>
                  <p className="mt-0.5 text-zinc-600">
                    If an assigned captain does not reach your store within 15 minutes, the system auto-reassigns to a standby fleet captain.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTicketCategory("delivery_captain");
                  setTicketSubject("Fleet Logistics & Delivery Captain Assistance");
                  setTicketDescription("Please assist with delivery captain dispatch / logistics query:");
                  setShowTicketModal(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <span>Contact Logistics Dispatch</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            {/* 3. Garment Care & Quality Standards */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <Shirt className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">
                    Garment Care &amp; Quality SOPs
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Stain claims, delicate fabrics &amp; packaging</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-700">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">✨ QuickPress Quality Guidelines</p>
                  <p className="mt-0.5 text-zinc-600">
                    Formal shirts require crisp collar steam pressing; silk sarees must be wrapped in breathable tissue before bag sealing.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">📦 Ordering Official Packaging Bags</p>
                  <p className="mt-0.5 text-zinc-600">
                    Store hubs can order subsidized QuickPress laundry bags, garment tags, and hangers delivered in bundles of 250.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTicketCategory("garment_damage");
                  setTicketSubject("Garment Care / Packaging Supplies Request");
                  setTicketDescription("Request for packaging materials or quality dispute assistance:");
                  setShowTicketModal(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <span>Request Packaging Materials</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            {/* 4. Store Operations & Capacity */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Store className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">
                    Store Operations &amp; Holidays
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Rush capacity pause &amp; schedule management</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-700">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">🛑 Peak Capacity Pause</p>
                  <p className="mt-0.5 text-zinc-600">
                    If your drying lines or steam boilers are at maximum capacity, toggle your outlet to 'Offline' to temporarily pause incoming bookings.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-950">🗓️ Setting Weekly Holiday or Leave</p>
                  <p className="mt-0.5 text-zinc-600">
                    Plan your weekly store closure in advance from Outlet Info so customers cannot schedule pickup slots on off days.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.shop })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <span>Manage Store Timings &amp; Services</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SUPPORT TICKETS LIST                                               */}
        {/* ========================================================================= */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                  My Support Tickets &amp; Audit Trail
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  Official inquiries submitted to QuickPress Merchant Support &amp; Fleet Operations.
                </p>
              </div>

              <button
                type="button"
                onClick={loadTickets}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${loadingTickets ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-2xs space-y-2">
                <LifeBuoy className="size-10 text-zinc-300 mx-auto" />
                <h3 className="text-sm font-black text-zinc-950">No support tickets found</h3>
                <p className="text-xs text-zinc-500">
                  You have not raised any support requests yet. Everything is running smoothly!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                            #{t.id}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              t.status === "resolved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : t.status === "in_review"
                                ? "bg-blue-100 text-blue-800 border border-blue-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {t.status === "resolved" ? "✓ Resolved" : t.status === "in_review" ? "● Under Review" : "● Open"}
                          </span>
                          <span className="text-xs font-bold text-zinc-500">
                            {t.categoryLabel}
                          </span>
                          {t.orderCode && (
                            <span className="rounded-md bg-zinc-100 px-2 py-0.2 text-[10px] font-bold text-zinc-700">
                              Order #{t.orderCode}
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-sm font-black text-zinc-950">{t.subject}</h4>
                        <p className="mt-1 text-xs text-zinc-600 leading-relaxed font-medium whitespace-pre-line">
                          {t.description}
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-zinc-400 shrink-0">
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Support Team Resolution Bubble */}
                    {t.supportReply && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                          <ShieldCheck className="size-4 text-emerald-700" />
                          <span>QuickPress Merchant Support Resolution:</span>
                        </div>
                        <p className="mt-1 text-emerald-900 leading-relaxed font-normal">
                          {t.supportReply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MERCHANT FAQS ACCORDION                                            */}
        {/* ========================================================================= */}
        {activeTab === "faqs" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                  Frequently Asked Questions &amp; Merchant Operating Guide
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  Instant answers to common operational, logistics, and payout questions.
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search FAQ topics..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left text-xs font-black text-zinc-900 hover:text-black cursor-pointer"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs text-zinc-600 leading-relaxed font-medium bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Raise Support Ticket Modal */}
        {showTicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="size-5 text-zinc-900" />
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">
                    Raise Support Ticket
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
                {/* Category Picker */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Issue Category:</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  >
                    <option value="order_issue">Active Order Issue</option>
                    <option value="payout_finance">Bank Payout &amp; Settlement</option>
                    <option value="delivery_captain">Delivery Captain / Logistics</option>
                    <option value="garment_damage">Garment Care, Stains &amp; Damage</option>
                    <option value="store_operations">Store Operations &amp; Packaging</option>
                    <option value="other">General Merchant Support</option>
                  </select>
                </div>

                {/* Related Order Code (Optional) */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Related Order ID / Code <span className="font-normal text-zinc-400">(Optional)</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRT-4040"
                    value={ticketOrderCode}
                    onChange={(e) => setTicketOrderCode(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Subject / Summary:</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Detailed Description:</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what happened, any captain/customer details, and what action is required..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Urgency Level:</label>
                  <div className="flex items-center gap-3">
                    {(["normal", "high", "urgent"] as TicketPriority[]).map((p) => (
                      <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value={p}
                          checked={ticketPriority === p}
                          onChange={() => setTicketPriority(p)}
                          className="text-zinc-950 focus:ring-zinc-950"
                        />
                        <span className="capitalize font-semibold text-zinc-800">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:bg-zinc-300 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    {isSubmittingTicket ? (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    <span>Submit Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
