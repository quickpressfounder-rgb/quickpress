import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  History,
  IndianRupee,
  Package,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { partnerRoutes } from "../navigation/partner-routes";
import { usePartnerContext } from "../context/PartnerContext";
import {
  matchesQuery,
  sortOrders,
  usePartnerOrders,
} from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import type { OrderActionId } from "../components/orders/order-actions";
import {
  STAGE_LABEL,
  formatOrderPlacedTime,
  type ManagedOrder,
  type OrderStage,
} from "../data/partner-orders-mock";
import {
  fetchDashboardSummary,
  getCachedDashboardSummary,
} from "../api/partner/partner-dashboard-api";
import { fetchEarnings } from "../api/partner/partner-earnings-api";
import {
  fetchPartnerProfile,
  fetchPartnerUnreadCount,
  getCachedPartnerProfile,
  getCleanPartnerName,
} from "../api/partner/partner-profile-api";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerOnlineToggle } from "../components/layout/PartnerOnlineToggle";
import { OrderCard, OrderStatusBadge } from "../components/orders/OrderCard";
import { IncomingOrderModal } from "../components/orders/IncomingOrderModal";
import { AcceptedOrderPipelineCard } from "../components/orders/AcceptedOrderPipelineCard";
import { WalkInOrderModal } from "../components/dashboard/WalkInOrderModal";
import { ScanBagTagModal } from "../components/dashboard/ScanBagTagModal";
import {
  playPartnerOrderAcceptedTone,
  playPartnerOrderChime,
} from "../lib/partner-order-alert-sound";
import { inr } from "../lib/currency";

type StageFilter =
  | "all"
  | "new"
  | "accepted"
  | "pickup_pending"
  | "processing"
  | "ready"
  | "completed"
  | "cancelled";

const STAGE_PILLS: { id: StageFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "accepted", label: "Accepted" },
  { id: "pickup_pending", label: "Pickup" },
  { id: "processing", label: "Processing" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const PROCESSING_STAGES = new Set<OrderStage>([
  "at_partner",
  "processing",
  "washing",
  "dry_cleaning",
  "ironing",
]);

function matchesStagePill(order: ManagedOrder, tab: StageFilter): boolean {
  if (tab === "all") return true;
  if (tab === "processing") return PROCESSING_STAGES.has(order.stage);
  return order.stage === tab;
}

export function OrdersScreen() {
  const navigate = useNavigate();
  const { session, isOnline, setOnline } = usePartnerContext();
  const {
    orders,
    isLoading,
    isRefreshing,
    incomingOrder,
    isAlarmMuted,
    toggleAlarmMute,
    dismissIncomingOrder,
    acceptOrder,
    rejectOrder,
    refresh,
    verifyDispatchOtp,
    confirmedHandoverIds,
  } = usePartnerOrders();

  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();

  const cachedProfile = useMemo(getCachedPartnerProfile, []);
  const cachedSummary = useMemo(getCachedDashboardSummary, []);

  const [shopName, setShopName] = useState<string>(() =>
    getCleanPartnerName(
      [
        cachedProfile?.businessName,
        cachedProfile?.ownerName,
        (cachedProfile as any)?.name,
        session?.businessName,
        session?.ownerName,
      ],
      "QuickPress Partner"
    )
  );
  const [todayEarnings, setTodayEarnings] = useState<number>(
    Number(cachedSummary?.todayEarnings || 0)
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StageFilter>("all");
  const [spotlightOrderId, setSpotlightOrderId] = useState<string | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Sync live KPIs & profile metadata
  const loadMetrics = useCallback(async () => {
    try {
      const [summaryRes, earningsRes, profileRes, unreadRes] = await Promise.allSettled([
        fetchDashboardSummary(),
        fetchEarnings(),
        fetchPartnerProfile(),
        fetchPartnerUnreadCount(),
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value) {
        const val = Number(summaryRes.value.todayEarnings ?? 0);
        if (Number.isFinite(val) && val >= 0) {
          setTodayEarnings(val);
        }
      }
      if (earningsRes.status === "fulfilled" && earningsRes.value) {
        const eVal = Number((earningsRes.value as any).todayEarnings ?? 0);
        if (Number.isFinite(eVal) && eVal > 0) {
          setTodayEarnings(eVal);
        }
      }
      if (profileRes.status === "fulfilled" && profileRes.value) {
        const name = getCleanPartnerName(
          [
            profileRes.value.businessName,
            profileRes.value.ownerName,
            (profileRes.value as any).name,
          ],
          ""
        );
        if (name) setShopName(name);
      }
      if (unreadRes.status === "fulfilled") {
        setUnreadCount(Number(unreadRes.value || 0));
      }
    } catch {
      // Non-fatal background metrics refresh
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics, orders.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onNewOrder = () => void loadMetrics();
    window.addEventListener("qp:partner:new_order", onNewOrder);
    return () => window.removeEventListener("qp:partner:new_order", onNewOrder);
  }, [loadMetrics]);

  // Tab counts computed live from real orders
  const stageCounts = useMemo(() => {
    const counts: Record<StageFilter, number> = {
      all: orders.length,
      new: 0,
      accepted: 0,
      pickup_pending: 0,
      processing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const order of orders) {
      if (order.stage === "new") counts.new += 1;
      else if (order.stage === "accepted") counts.accepted += 1;
      else if (order.stage === "pickup_pending") counts.pickup_pending += 1;
      else if (PROCESSING_STAGES.has(order.stage)) counts.processing += 1;
      else if (order.stage === "ready") counts.ready += 1;
      else if (order.stage === "completed") counts.completed += 1;
      else if (order.stage === "cancelled" || order.stage === "refunded") counts.cancelled += 1;
    }
    return counts;
  }, [orders]);

  const activeQueueCount = useMemo(
    () =>
      orders.filter(
        (o) => o.stage !== "completed" && o.stage !== "cancelled" && o.stage !== "refunded"
      ).length,
    [orders]
  );

  const loadPercent = Math.min(100, Math.round((activeQueueCount / 50) * 100));

  // Filtered & sorted order feed
  const filteredOrders = useMemo(() => {
    const matched = orders.filter(
      (o) => matchesStagePill(o, activeTab) && matchesQuery(o, query)
    );
    return sortOrders(matched, "latest");
  }, [orders, activeTab, query]);

  // Spotlight order shown in the "Accepted Par" 4-step live pipeline panel
  const spotlightOrder = useMemo(() => {
    if (spotlightOrderId) {
      const explicit = orders.find((o) => o.id === spotlightOrderId);
      if (explicit && explicit.stage !== "completed" && explicit.stage !== "cancelled") {
        return explicit;
      }
    }
    if (activeTab === "accepted") {
      return orders.find((o) => o.stage === "accepted") || null;
    }
    return null;
  }, [orders, spotlightOrderId, activeTab]);

  // Unified Accept handler so accepting from either Incoming Modal OR Order Card transitions cleanly
  const handleAcceptFromModal = useCallback(
    async (orderId: string, prepTimeMinutes: number) => {
      await acceptOrder(orderId, prepTimeMinutes);
      playPartnerOrderAcceptedTone();
      setSpotlightOrderId(orderId);
      if (activeTab === "new") {
        setActiveTab("all");
      }
      toast.success("Order accepted — dispatch pipeline active");
    },
    [acceptOrder, activeTab]
  );

  const handleRejectFromModal = useCallback(
    async (orderId: string, reason: string) => {
      await rejectOrder(orderId, reason);
      toast.info(`Order declined (${reason})`);
    },
    [rejectOrder]
  );

  const handleWrappedAction = useCallback(
    (order: ManagedOrder, action: OrderActionId) => {
      if (action === "accept") {
        playPartnerOrderAcceptedTone();
        setSpotlightOrderId(order.id);
      }
      handleAction(order, action);
    },
    [handleAction]
  );

  const handleToggleSound = () => {
    const willUnmute = isAlarmMuted;
    toggleAlarmMute();
    if (willUnmute) {
      playPartnerOrderChime();
      toast.success("Order alerts unmuted");
    } else {
      toast.info("Order alerts muted");
    }
  };

  return (
    <PartnerLayout
      activeTab="orders"
      title={shopName}
      subtitle="Live Order Console"
      searchQuery={query}
      onSearchChange={setQuery}
    >
      <div className="min-h-full bg-[#FAFAFA] pb-16">
        {/* Clean Minimalist Sticky Header (Mobile & Tablet; Desktop uses TopBar + Subheader) */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="app-header-safe mx-auto max-w-6xl px-4 pb-3 md:pt-3.5 md:px-6">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Brand Identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-900 text-xs font-bold text-white tracking-tight">
                  {(shopName[0] || "Q").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-zinc-950 truncate">
                    {shopName}
                  </h1>
                  <p className="text-[11px] font-medium text-zinc-500">
                    {isOnline ? "Accepting orders" : "Store paused"} ·{" "}
                    <span className="tabular-nums">{activeQueueCount} active</span>
                  </p>
                </div>
              </div>

              {/* Right: Status Toggle + Bell + Refresh */}
              <div className="flex items-center gap-2 shrink-0">
                <PartnerOnlineToggle showScheduleHint />

                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.notifications })}
                  aria-label="Notifications"
                  className="relative flex size-8.5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white tabular-nums">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void refresh();
                    void loadMetrics();
                  }}
                  disabled={isRefreshing}
                  aria-label="Refresh orders"
                  className="flex size-8.5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Clean Blank Search Bar (Zero text/placeholder inside box) */}
            <div className="relative mt-3 md:hidden">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="partner-order-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder=""
                aria-label="Search orders"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white pl-10 pr-9 text-xs font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-hidden transition-all"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 space-y-4">
          {/* Persistent Offline Banner with 1-Tap Go Live */}
          {!isOnline ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 animate-in fade-in duration-150">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="mt-1 sm:mt-0 size-2 shrink-0 rounded-full bg-rose-500" />
                <div>
                  <p className="text-xs font-bold text-rose-950">Storefront is currently paused</p>
                  <p className="text-[11px] font-medium text-rose-800/80">
                    New customer pickup requests are hidden while in-progress orders stay active.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void setOnline(true);
                  toast.success("Store is now LIVE — ready to receive orders");
                }}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer"
              >
                <Radio className="size-3.5" />
                Go Live
              </button>
            </div>
          ) : null}

          {/* Clean Executive KPI Strip (100% Real Aggregated Data) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Today's Payout */}
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.earnings })}
              className="rounded-2xl border border-zinc-200 bg-white p-3.5 text-left hover:border-zinc-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Today&apos;s Payout</span>
                <IndianRupee className="size-3.5 text-zinc-400" />
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {inr(todayEarnings)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                View settlements →
              </p>
            </button>

            {/* Active Queue & Store Load */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Active Queue</span>
                <span className="text-[11px] font-semibold text-zinc-500 tabular-nums">
                  {loadPercent}% load
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {activeQueueCount}
              </p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    loadPercent >= 85 ? "bg-rose-500" : "bg-zinc-900"
                  }`}
                  style={{ width: `${loadPercent}%` }}
                />
              </div>
            </div>

            {/* Desktop Card 3: Incoming New */}
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className="hidden lg:block rounded-2xl border border-zinc-200 bg-white p-3.5 text-left hover:border-zinc-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">New Requests</span>
                <Zap className={`size-3.5 ${stageCounts.new > 0 ? "text-amber-600" : "text-zinc-400"}`} />
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {stageCounts.new}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                {stageCounts.new > 0 ? "Awaiting acceptance" : "Queue clear"}
              </p>
            </button>

            {/* Desktop Card 4: Ready for Dispatch */}
            <button
              type="button"
              onClick={() => setActiveTab("ready")}
              className="hidden lg:block rounded-2xl border border-zinc-200 bg-white p-3.5 text-left hover:border-zinc-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Ready Dispatch</span>
                <Package className="size-3.5 text-zinc-400" />
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {stageCounts.ready}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                {stageCounts.completed} completed overall
              </p>
            </button>
          </div>

          {/* Streamlined Utility & POS Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setShowWalkInModal(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="size-3.5" />
                Walk-In Order
              </button>

              <button
                type="button"
                onClick={() => setShowScanModal(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 transition-all active:scale-95 cursor-pointer"
              >
                <QrCode className="size-3.5 text-zinc-600" />
                Scan Bag QR
              </button>

              <button
                type="button"
                onClick={handleToggleSound}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  isAlarmMuted
                    ? "border-zinc-200 bg-zinc-100 text-zinc-600"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800"
                }`}
              >
                {isAlarmMuted ? (
                  <VolumeX className="size-3.5 text-zinc-500" />
                ) : (
                  <Volume2 className="size-3.5 text-emerald-600" />
                )}
                {isAlarmMuted ? "Sound Muted" : "Alerts On"}
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.analytics })}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all active:scale-95 cursor-pointer"
              >
                <History className="size-3.5 text-zinc-500" />
                Analytics
              </button>
            </div>

            {/* Desktop Clean Blank Search Box */}
            <div className="hidden md:block relative w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder=""
                aria-label="Search orders"
                className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-8.5 pr-8 text-xs font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-hidden transition-all"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Crisp Stage Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {STAGE_PILLS.map((pill) => {
              const selected = activeTab === pill.id;
              const count = stageCounts[pill.id];
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveTab(pill.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                  }`}
                >
                  <span>{pill.label}</span>
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                        selected
                          ? "bg-white/20 text-white"
                          : pill.id === "new"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* "Accept Par" Live 4-Step Pipeline Highlight */}
          {spotlightOrder ? (
            <AcceptedOrderPipelineCard
              order={spotlightOrder}
              busy={busy?.orderId === spotlightOrder.id}
              isConfirmedHandover={confirmedHandoverIds.has(spotlightOrder.id)}
              onVerifyDispatchOtp={verifyDispatchOtp}
              onAction={handleWrappedAction}
              onDismiss={() => setSpotlightOrderId(null)}
            />
          ) : null}

          {/* Orders List / Empty States */}
          {isLoading && orders.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl border border-zinc-200 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-zinc-950">
                {query
                  ? "No matching orders found"
                  : activeTab === "all"
                    ? "No orders in queue yet"
                    : `No ${STAGE_PILLS.find((p) => p.id === activeTab)?.label.toLowerCase()} orders`}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {query
                  ? "Try clearing your search filter or scan a Bag QR tag."
                  : isOnline
                    ? "Your storefront is Live — incoming requests appear automatically."
                    : "Go Live above to resume receiving nearby customer requests."}
              </p>
              {query || activeTab !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveTab("all");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-800 cursor-pointer"
                >
                  Reset View
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Crisp Card Stream */}
              <div className="space-y-3 md:hidden">
                {filteredOrders.map((order, idx) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={idx}
                    busyAction={busy?.orderId === order.id ? busy.actionId : null}
                    onAction={handleWrappedAction}
                  />
                ))}
              </div>

              {/* Desktop Clean Table Matrix */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="py-3 pl-4 pr-3">Order & Customer</th>
                      <th className="py-3 px-3">Placed</th>
                      <th className="py-3 px-3">Garments & Service</th>
                      <th className="py-3 px-3">Stage</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 pl-3 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {filteredOrders.map((order) => {
                      const placed = formatOrderPlacedTime(order.placedAt);
                      const isWaitingHandover =
                        !confirmedHandoverIds.has(order.id) &&
                        (order.stage === "accepted" || order.stage === "pickup_pending");
                      const isReadyToWash =
                        confirmedHandoverIds.has(order.id) || order.stage === "at_partner";

                      return (
                        <tr
                          key={order.id}
                          onClick={() =>
                            order.stage === "accepted" || order.stage === "pickup_pending"
                              ? setSpotlightOrderId(order.id)
                              : navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } })
                          }
                          className="group hover:bg-zinc-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pl-4 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-950 tabular-nums">
                                #{order.code}
                              </span>
                              {order.isExpress ? (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  Express
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 font-medium text-zinc-600 truncate max-w-[200px]">
                              {order.customerName || "QuickPress Customer"}
                            </p>
                          </td>

                          <td className="py-3.5 px-3 text-zinc-500 tabular-nums whitespace-nowrap">
                            <div className="font-medium text-zinc-700">{placed.time}</div>
                            <div className="text-[11px]">{placed.relative}</div>
                          </td>

                          <td className="py-3.5 px-3 text-zinc-700">
                            <div className="font-semibold text-zinc-900">
                              {order.itemCount || order.items?.length || 1} pcs
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                              {order.services?.join(", ") || "Laundry Care"}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <OrderStatusBadge order={order} />
                          </td>

                          <td className="py-3.5 px-3 text-right font-bold text-zinc-950 tabular-nums whitespace-nowrap">
                            {inr(order.amount)}
                          </td>

                          <td
                            className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {order.stage === "new" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy?.orderId === order.id}
                                    onClick={() => handleWrappedAction(order, "reject")}
                                    className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy?.orderId === order.id}
                                    onClick={() => handleWrappedAction(order, "accept")}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                                  >
                                    <Check className="size-3" />
                                    Accept
                                  </button>
                                </>
                              ) : isWaitingHandover ? (
                                <button
                                  type="button"
                                  disabled={busy?.orderId === order.id}
                                  onClick={() => {
                                    setSpotlightOrderId(order.id);
                                    handleWrappedAction(order, "confirm_handover");
                                  }}
                                  className="rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                                >
                                  Handover
                                </button>
                              ) : isReadyToWash ? (
                                <button
                                  type="button"
                                  disabled={busy?.orderId === order.id}
                                  onClick={() => handleWrappedAction(order, "start_washing")}
                                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                                >
                                  Start Wash
                                </button>
                              ) : PROCESSING_STAGES.has(order.stage) ? (
                                <button
                                  type="button"
                                  disabled={busy?.orderId === order.id}
                                  onClick={() => handleWrappedAction(order, "mark_ready")}
                                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                                >
                                  Mark Ready
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 cursor-pointer"
                                >
                                  <Eye className="size-3" />
                                  View
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live "Order Aate Time" Incoming Order Alert Overlay */}
      <IncomingOrderModal
        order={incomingOrder}
        onAccept={handleAcceptFromModal}
        onReject={handleRejectFromModal}
        onDismiss={dismissIncomingOrder}
        isMuted={isAlarmMuted}
        onToggleMute={handleToggleSound}
      />

      {/* Counter Walk-In POS & Bag QR Scanner */}
      {showWalkInModal ? (
        <WalkInOrderModal
          onClose={() => setShowWalkInModal(false)}
          onOrderCreated={(created) => {
            setShowWalkInModal(false);
            setSpotlightOrderId(created.id);
            void refresh();
            void loadMetrics();
          }}
        />
      ) : null}

      {showScanModal ? (
        <ScanBagTagModal
          orders={orders}
          onClose={() => setShowScanModal(false)}
          onSelectOrder={(orderId) => {
            setShowScanModal(false);
            setSpotlightOrderId(orderId);
            void navigate({ to: partnerRoutes.orderDetails, params: { orderId } });
          }}
        />
      ) : null}

      {sheetNode}
      {overlay}
      <Toaster />
    </PartnerLayout>
  );
}
