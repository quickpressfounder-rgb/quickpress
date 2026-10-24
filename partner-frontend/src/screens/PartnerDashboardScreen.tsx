import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  IndianRupee,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  MapPin,
  Package,
  Phone,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Table,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import type { EarningsSummary, PartnerOrderStatus } from "@/shared/types/partner";
import { LiveDeliveryMap } from "../components/map/LiveDeliveryMap";

import { SectionHeading } from "../components/PartnerPrimitives";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { ZomatoHubView } from "../components/dashboard/ZomatoHubView";
import {
  PartnerIncomingOrderAlertModal,
  type PartnerIncomingOrder,
} from "../components/alerts/PartnerIncomingOrderAlertModal";
import { stopPartnerOrderAlertRing } from "../lib/partner-order-alert-sound";
import {
  OrderStatusChips,
  OrderStatusFlowCard,
  QuickActionsGrid,
  QuickStatsGrid,
  RevenueCard,
  WelcomeCard,
  type DashboardShop,
  type DashboardSummaryCard,
  type QuickStat,
} from "../components/dashboard/DashboardCards";
import { DailyAnalyticsSection } from "../components/dashboard/DashboardInsights";
import {
  DashboardSkeleton,
  NoOrdersEmptyState,
  OfflineEmptyState,
} from "../components/dashboard/DashboardStates";
import { LiveOrderCard, type LiveOrder } from "../components/dashboard/LiveOrderCard";
import { PullToRefresh } from "../components/dashboard/PullToRefresh";
import { StoreStatusConfirmModal } from "../components/dashboard/StoreStatusConfirmModal";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile } from "@/api/partner/partner-profile-api";
import { fetchDashboardSummary, setStoreOpen } from "@/api/partner/partner-dashboard-api";
import { fetchEarnings } from "@/api/partner/partner-earnings-api";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import { usePartnerContext } from "../context/PartnerContext";
import { useLanguage } from "../lib/i18n";
import { hasActiveSessionToken } from "@/api/core/session-store";

const STATUS_TO_LIVE: Record<string, LiveOrder["status"]> = {
  new: "pending",
  placed: "pending",
  pending: "pending",
  pending_partner_acceptance: "pending",
  accepted: "accepted",
  partner_accepted: "accepted",
  pickup_pending: "pickup",
  pickup_driver_assigned: "pickup",
  pickup_rider_assigned: "pickup",
  pickup_rider_accepted: "pickup",
  picked_up: "pickup",
  picked: "pickup",
  in_transit_to_store: "pickup",
  at_partner: "pickup",
  store_received: "pickup",
  washing: "washing",
  dry_cleaning: "washing",
  processing: "washing",
  ironing: "ironing",
  ready: "ready",
  ready_for_delivery: "ready",
  delivery_assigned: "ready",
  delivery_rider_assigned: "ready",
  delivery_rider_accepted: "ready",
  dispatch_otp_pending: "ready",
  out_for_delivery: "ready",
  completed: "delivered",
  delivered: "delivered",
  cancelled: "cancelled",
  rejected: "cancelled",
  store_rejected: "cancelled",
};

const DASHBOARD_CACHE_KEY = "qp.partner.cachedDashboard";

function getCachedDashboard(): {
  shop: DashboardShop | null;
  summary: DashboardSummaryCard | null;
  quickStats: QuickStat[];
  earnings: EarningsSummary | null;
  isOnline: boolean;
} {
  if (typeof window === "undefined") {
    return { shop: null, summary: null, quickStats: [], earnings: null, isOnline: true };
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return { shop: null, summary: null, quickStats: [], earnings: null, isOnline: true };
    return JSON.parse(raw);
  } catch {
    return { shop: null, summary: null, quickStats: [], earnings: null, isOnline: true };
  }
}

export function PartnerDashboardScreen() {
  const navigate = useNavigate();
  const { session, isOnline, toggleOnline } = usePartnerContext();
  const { orders, isLoading: ordersLoading, refresh: refreshOrders } = usePartnerOrders();
  const { handleAction, sheetNode, overlay } = useOrderActionHandler();
  const { t, language } = useLanguage();

  const [shop, setShop] = useState<DashboardShop | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryCard | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<LiveOrder | null>(null);
  const [orderViewMode, setOrderViewMode] = useState<"cards" | "table">("cards");

  // Restore cached dashboard data strictly after hydration to prevent React error #418
  useEffect(() => {
    const cached = getCachedDashboard();
    if (cached.shop) {
      setShop(cached.shop);
    } else if (session?.businessName) {
      setShop({
        shopName: session.businessName,
        partnerName: session.ownerName || "Partner",
        logoInitials: (session.businessName || "QP").slice(0, 2).toUpperCase(),
        isVerified: session.isVerified,
        notifications: 0,
      });
    }
    if (cached.summary) setSummary(cached.summary);
    if (cached.quickStats && cached.quickStats.length > 0) setQuickStats(cached.quickStats);
    if (cached.earnings) setEarnings(cached.earnings);
    if (cached.shop || cached.summary) {
      setIsLoading(false);
    }
  }, [session]);

  const load = useCallback(async () => {
    if (!hasActiveSessionToken("partner")) {
      navigate({ to: partnerRoutes.auth });
      return;
    }
    if (!shop && !summary) setIsLoading(true);
    setError(null);
    try {
      const [profile, dashboard, earningsSummary] = await Promise.all([
        fetchPartnerProfile(),
        fetchDashboardSummary(),
        fetchEarnings().catch(() => null),
      ]);
      if (profile.status === "suspended") {
        navigate({ to: partnerRoutes.suspended });
        return;
      }
      if (profile.isOnboarded === false) {
        navigate({ to: partnerRoutes.registration });
        return;
      }
      if (profile.isVerified === false && profile.status !== "active") {
        navigate({ to: partnerRoutes.registrationSubmitted });
        return;
      }
      const newShop: DashboardShop = {
        shopName: profile.businessName || "QuickPress Store",
        partnerName: profile.ownerName || "Partner",
        logoInitials: (profile.businessName || "QP").slice(0, 2).toUpperCase(),
        isVerified: true,
        notifications: 0,
      };
      const newSummary: DashboardSummaryCard = {
        totalOrders: profile.totalOrders,
        earnings: dashboard.todayEarnings,
        activeOrders: dashboard.newOrders + dashboard.inProcess + dashboard.readyForDelivery,
      };
      const newStats: QuickStat[] = [
        { id: "new", label: "New Orders", value: dashboard.newOrders, tone: "primary" },
        { id: "processing", label: "Processing", value: dashboard.inProcess, tone: "primary" },
        { id: "ready", label: "Ready", value: dashboard.readyForDelivery, tone: "green" },
        { id: "completed", label: "Completed", value: dashboard.completedToday, tone: "green" },
      ];

      setShop(newShop);
      setSummary(newSummary);
      setQuickStats(newStats);
      setEarnings(earningsSummary);

      // Save to localStorage for instant 0ms next load
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            DASHBOARD_CACHE_KEY,
            JSON.stringify({
              shop: newShop,
              summary: newSummary,
              quickStats: newStats,
              earnings: earningsSummary,
              isOnline: dashboard.isStoreOpen,
            }),
          );
        } catch {
          /* ignore */
        }
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.kind === "unauthorized") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DASHBOARD_CACHE_KEY);
          window.localStorage.removeItem("qp.partner.profile_cache");
        }
        setShop(null);
        setSummary(null);
        navigate({ to: partnerRoutes.auth });
        return;
      }
      if (err?.status === 403 || err?.status === 404) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DASHBOARD_CACHE_KEY);
          window.localStorage.removeItem("qp.partner.profile_cache");
        }
        setShop(null);
        setSummary(null);
        navigate({ to: partnerRoutes.registration });
        return;
      }
      if (!shop) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, shop, summary]);

  useEffect(() => {
    if (hasActiveSessionToken("partner")) {
      void load();
    }
  }, [load]);

  const refresh = useCallback(async () => {
    await Promise.all([load(), refreshOrders()]);
  }, [load, refreshOrders]);

  const liveOrders = useMemo<LiveOrder[]>(
    () =>
      orders
        .filter((order) => order.stage !== "completed" && order.stage !== "delivered" && order.stage !== "cancelled")
        .slice(0, 8)
        .map((order) => ({
          id: order.id,
          code: order.code,
          customerName: order.customerName,
          pickupTime: order.pickupTime,
          services: order.services,
          amount: order.amount,
          status: STATUS_TO_LIVE[order.stage as PartnerOrderStatus] ?? "pending",
        })),
    [orders],
  );

  const findOrder = useCallback((id: string) => orders.find((order) => order.id === id), [orders]);

  const [activeAlertOrder, setActiveAlertOrder] = useState<PartnerIncomingOrder | null>(null);

  // Instant real-time listener: when a customer places an order, update dashboard KPI numbers instantly (<10ms)
  useEffect(() => {
    const handleNewOrder = () => {
      console.log("[PartnerDashboard] ⚡ Realtime order received, updating summary cards instantly");
      void load();
      void refreshOrders();
    };
    window.addEventListener("qp:partner:new_order", handleNewOrder);
    return () => window.removeEventListener("qp:partner:new_order", handleNewOrder);
  }, [load, refreshOrders]);

  // Monitor incoming unaccepted orders in real-time
  useEffect(() => {
    if (!isOnline) {
      setActiveAlertOrder(null);
      stopPartnerOrderAlertRing();
      return;
    }
    const incoming = orders.find(
      (o) => (o as any).status === "new" || (o as any).status === "placed" || (o as any).status === "pending" || o.stage === "new"
    );
    if (incoming) {
      setActiveAlertOrder({
        id: incoming.id,
        orderCode: incoming.code,
        customerName: incoming.customerName,
        customerPhone: incoming.customerPhone,
        pickupAddress: (incoming as any).address || incoming.pickupAddress || "Customer Doorstep",
        pickupSlot: (incoming as any).slot || incoming.pickupTime || "Today",
        estimatedEarnings: Math.round((incoming.amount || 0) * 0.84),
        itemsCount: incoming.itemCount || incoming.items?.length || 1,
        items: (incoming.items || []).map((it) => ({
          name: it.name,
          quantity: it.qty || 1,
          unit: "pcs",
        })),
        expressDelivery: Boolean(
          (incoming as any).isExpress ||
          (incoming as any).pickup?.express ||
          incoming.services?.some((s) => s.toLowerCase().includes("express")) ||
          incoming.serviceLabel?.toLowerCase().includes("express")
        ),
        isExpress: Boolean(
          (incoming as any).isExpress ||
          (incoming as any).pickup?.express ||
          incoming.services?.some((s) => s.toLowerCase().includes("express")) ||
          incoming.serviceLabel?.toLowerCase().includes("express")
        ),
        expressFee: Number((incoming as any).expressFee || (incoming as any).express_fee) || 40,
        partnerExpressBonus: Number((incoming as any).partnerExpressBonus || (incoming as any).partner_express_bonus) || 8,
        expressPartnerSharePercent: Number((incoming as any).expressPartnerSharePercent || (incoming as any).express_partner_share_percent) || 20,
      });
    } else {
      setActiveAlertOrder(null);
      stopPartnerOrderAlertRing();
    }
  }, [orders, isOnline]);

  const handleAlertAccept = async (orderId: string) => {
    stopPartnerOrderAlertRing();
    const full = findOrder(orderId);
    if (full) {
      await handleAction(full, "accept");
    }
    setActiveAlertOrder(null);
    refreshOrders();
  };

  const handleAlertReject = async (orderId: string, reason?: string) => {
    stopPartnerOrderAlertRing();
    const full = findOrder(orderId);
    if (full) {
      await handleAction(full, "reject");
    }
    setActiveAlertOrder(null);
    refreshOrders();
  };

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      accepted: 0,
      pickup: 0,
      washing: 0,
      ironing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of orders) {
      const stageKey = (o.stage || (o as any).status || "").toLowerCase();
      const mapped = STATUS_TO_LIVE[stageKey] || "pending";
      counts[mapped] = (counts[mapped] || 0) + 1;
    }
    return counts;
  }, [orders]);

  // Real-time reactive KPI calculation merging live Supabase orders with backend metrics
  const liveStats: QuickStat[] = useMemo(() => {
    return [
      {
        id: "new",
        label: "New Orders",
        value: Math.max(stageCounts.pending || 0, quickStats.find((s) => s.id === "new")?.value || 0),
        tone: "primary" as const,
      },
      {
        id: "processing",
        label: "Processing",
        value: Math.max(
          (stageCounts.washing || 0) + (stageCounts.ironing || 0) + (stageCounts.accepted || 0) + (stageCounts.pickup || 0),
          quickStats.find((s) => s.id === "processing")?.value || 0
        ),
        tone: "primary" as const,
      },
      {
        id: "ready",
        label: "Ready for Delivery",
        value: Math.max(stageCounts.ready || 0, quickStats.find((s) => s.id === "ready")?.value || 0),
        tone: "green" as const,
      },
      {
        id: "completed",
        label: "Completed",
        value: Math.max(stageCounts.delivered || 0, quickStats.find((s) => s.id === "completed")?.value || 0),
        tone: "green" as const,
      },
    ];
  }, [stageCounts, quickStats]);

  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleConfirmToggleOnline = useCallback(() => {
    const nextState = !isOnline;
    if (isOnline) {
      stopPartnerOrderAlertRing();
    }
    setShowStatusConfirmModal(false);
    toggleOnline();
    toast.success(
      nextState
        ? "⚡ Store is now ONLINE! Ready to receive laundry orders."
        : "Store is now OFFLINE. New customer orders are paused."
    );
  }, [isOnline, toggleOnline]);

  const handleAccept = (order: LiveOrder) => {
    const full = findOrder(order.id);
    if (full) handleAction(full, "accept");
  };

  const handleReject = (order: LiveOrder) => {
    const full = findOrder(order.id);
    if (full) handleAction(full, "reject");
  };

  const handleView = (order: LiveOrder) => {
    navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } });
  };

  const showSkeleton = (isLoading && !shop && !summary) || (ordersLoading && orders.length === 0 && !shop);

  return (
    <PartnerLayout
      activeTab="dashboard"
      title={t("nav.dashboard", "Dashboard")}
      subtitle={shop ? `${t("dashboard.welcome", "Welcome back")}, ${shop.partnerName} · ${shop.shopName}` : t("dashboard.storeConsole", "Store Console")}
    >
      {/* Full Screen Incoming Order Alert Modal */}
      <PartnerIncomingOrderAlertModal
        order={activeAlertOrder}
        onAccept={handleAlertAccept}
        onReject={handleAlertReject}
        onClose={() => setActiveAlertOrder(null)}
      />

      {/* Mobile Zomato Hub Experience (< md) */}
      <div className="md:hidden">
        <ZomatoHubView />
      </div>

      {/* Desktop Business Dashboard (>= md) */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        <PullToRefresh onRefresh={refresh}>
          {showSkeleton ? (
            <DashboardSkeleton />
          ) : error ? (
            <div className="px-4 py-16 text-center text-sm font-medium text-muted-foreground md:px-6">
              {error}
            </div>
          ) : (
            <div className="animate-soft-fade space-y-7 lg:space-y-9">
              {/* 1. Executive Store Command Hub Banner - 100% Pure White Zomato Partner Console Style */}
              <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 lg:p-7 shadow-xs">
                {/* Subtle light ambient glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 size-72 rounded-full bg-emerald-500/5 blur-3xl" />
                <div className="pointer-events-none absolute -left-12 -bottom-12 size-72 rounded-full bg-blue-500/5 blur-3xl" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Column: Store Details & Live Radar Telemetry */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowStatusConfirmModal(true)}
                        className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black border transition-all cursor-pointer shadow-2xs ${
                          isOnline
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            isOnline
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"
                              : "bg-rose-500"
                          }`}
                        />
                        <span>{isOnline ? "STORE ONLINE & ACCEPTING ORDERS 🟢" : "STORE OFFLINE / PAUSED 🔴"}</span>
                      </button>

                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-[11px] font-black tracking-wide">
                        {session?.city ? `${session.city} Operations Hub` : "Store Operations Hub"}
                      </span>

                      <span className="text-zinc-500 text-xs font-mono font-bold">
                        ID: #PRT-{(session as any)?.partnerId || (session as any)?.account?.linkedId || (session as any)?.account?.id || (session as any)?.id || ""}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-950 flex items-center gap-2.5">
                        <span>{shop?.shopName || session?.businessName || session?.ownerName || "Merchant Store"}</span>
                        <span className="text-emerald-800 text-xs font-black bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-2xs">
                          <ShieldCheck className="size-3.5 text-emerald-600" /> Verified Partner
                        </span>
                      </h2>
                      <p className="mt-1 text-xs text-zinc-600 font-medium max-w-xl leading-relaxed">
                        Commercial Laundry & Garment Care Operations Console · Hyper-Local Delivery Coverage Active
                      </p>
                    </div>

                    {/* Live Telemetry Ticker */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-600 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Radio className="size-3.5 text-emerald-600 animate-pulse" />
                        <span>Radar: <strong className="text-zinc-950 font-black">Broadcasting (12ms)</strong></span>
                      </div>
                      <span className="text-zinc-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-blue-600" />
                        <span>Auto Settlement: <strong className="text-zinc-950 font-black">Daily 06:00 AM</strong></span>
                      </div>
                      <span className="text-zinc-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <Zap className="size-3.5 text-amber-500" />
                        <span>Supabase Live Channel: <strong className="text-zinc-950 font-black">Active</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quick Desktop Actions */}
                  <div className="flex flex-wrap lg:flex-col items-stretch justify-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate({ to: partnerRoutes.orders })}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-3 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                    >
                      <ListOrdered className="size-4" />
                      <span>Open Live Queue ({orders.length})</span>
                      <ArrowRight className="size-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate({ to: partnerRoutes.services })}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-900 font-bold text-xs px-3.5 py-2.5 border border-zinc-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Sparkles className="size-3.5 text-amber-500" />
                        <span>Rate Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={refresh}
                        disabled={isLoading}
                        title="Refresh Live Data"
                        className="flex items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-800 p-2.5 border border-zinc-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <RotateCcw className={`size-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Operational Overview (4 Balanced Columns) */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading title={t("Operational Overview", "Operational Overview")} />
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.orders })}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    <span>{t("View Queue", "View Full Queue")}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="mt-3.5">
                  <QuickStatsGrid stats={liveStats} />
                </div>
              </section>

              {/* 3. Desktop Multi-column Grid: Revenue & Order Status */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)] items-stretch">
                <section className="min-w-0 flex flex-col">
                  <SectionHeading title={t("dashboard.revenueSummary", "Revenue Summary")} />
                  <div className="mt-3.5 flex-1">
                    <RevenueCard earnings={earnings} isLoading={isLoading} orders={orders} />
                  </div>
                </section>

                <section className="min-w-0 flex flex-col">
                  <SectionHeading title={t("dashboard.orderStatusFlow", "Order Status Flow")} />
                  <div className="mt-3.5 flex-1">
                    <OrderStatusFlowCard orders={orders} stageCounts={stageCounts} />
                  </div>
                </section>
              </div>

              {/* 4. Live Orders Section with Table / Cards View Mode Toggle */}
              <section className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SectionHeading title={t("dashboard.liveOrders", "Active Orders")} />
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-black text-emerald-800 shadow-2xs">
                      {liveOrders.length} Live
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Switcher: Zomato Cards vs Table Layout */}
                    <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50/80 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setOrderViewMode("cards")}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                          orderViewMode === "cards"
                            ? "bg-white text-zinc-950 font-black shadow-xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                        title="Zomato Card Grid"
                      >
                        <LayoutGrid className="size-3.5" />
                        <span>Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderViewMode("table")}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                          orderViewMode === "table"
                            ? "bg-white text-zinc-950 font-black shadow-xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                        title="Compact Order Table"
                      >
                        <LayoutList className="size-3.5" />
                        <span>Table Layout</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate({ to: partnerRoutes.orders })}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer pl-2"
                    >
                      <span>{t("View all", "View all")} ({orders.length})</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  {!isOnline ? (
                    <OfflineEmptyState onGoOnline={() => setShowStatusConfirmModal(true)} />
                  ) : liveOrders.length === 0 ? (
                    <NoOrdersEmptyState />
                  ) : orderViewMode === "cards" ? (
                    /* Zomato Order Cards Grid */
                    <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                      {liveOrders.map((order, index) => (
                        <LiveOrderCard
                          key={order.id}
                          order={order}
                          delay={index * 40}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          onView={handleView}
                          onTrackMap={(o) => setTrackingOrder(o)}
                        />
                      ))}
                    </div>
                  ) : (
                    /* High-Density Pure White Zomato Table Layout */
                    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                              <th className="px-4 py-3">Order ID</th>
                              <th className="px-4 py-3">Customer</th>
                              <th className="px-4 py-3">Services / Items</th>
                              <th className="px-4 py-3">Pickup Time</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-medium">
                            {liveOrders.map((order) => {
                              const isPending = order.status === "pending";
                              return (
                                <tr
                                  key={order.id}
                                  className="transition-colors hover:bg-zinc-50/80"
                                >
                                  <td className="px-4 py-3 font-mono font-black text-zinc-950">
                                    #{order.code}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-zinc-900">
                                    {order.customerName}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-600">
                                    <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                      {order.services.map((svc, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className="rounded-md bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                                        >
                                          {svc}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-zinc-700 font-semibold whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="size-3.5 text-zinc-400" />
                                      <span>{order.pickupTime}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-black text-zinc-950 whitespace-nowrap">
                                    ₹{order.amount.toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {isPending ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleReject(order)}
                                            className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                                          >
                                            Reject
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleAccept(order)}
                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                                          >
                                            Accept
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleView(order)}
                                          className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                                        >
                                          View Details
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
                    </div>
                  )}
                </div>
              </section>

              {/* 5. Quick Shortcuts Grid */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading title={t("dashboard.quickShortcuts", "Quick Shortcuts")} />
                  <LayoutGrid className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-3.5">
                  <QuickActionsGrid />
                </div>
              </section>

              {/* 6. Daily Analysis & Performance Graph */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading title={t("dashboard.dailyAnalytics", "Daily Analysis & Performance Graph")} />
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.analytics })}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    <span>{t("Detailed Analytics", "Detailed Analytics & Reports")}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="mt-3.5">
                  <DailyAnalyticsSection orders={orders} earnings={earnings} />
                </div>
              </section>
            </div>
          )}
        </PullToRefresh>
      </div>

      {/* Live Captain Fleet Tracking Modal */}
      {trackingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Live Captain Tracking
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Order #{trackingOrder.code} · {trackingOrder.customerName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTrackingOrder(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Map Body */}
            <div className="p-4 space-y-3">
              <LiveDeliveryMap
                storeLocation={{
                  lat: (session as any)?.lat || (session as any)?.latitude || 28.6139,
                  lng: (session as any)?.lng || (session as any)?.longitude || 77.2090,
                  label: session?.businessName || "My Laundry Store",
                  sublabel: "Store Hub",
                }}
                destinationLocation={{
                  lat: (trackingOrder as any)?.dropLat || (trackingOrder as any)?.latitude || ((session as any)?.lat || 28.6139) + 0.0075,
                  lng: (trackingOrder as any)?.dropLng || (trackingOrder as any)?.longitude || ((session as any)?.lng || 77.2090) + 0.0065,
                  label: trackingOrder.customerName,
                  sublabel: "Customer Delivery Location",
                }}
                riderLocation={{
                  lat: (trackingOrder as any)?.riderLat || ((session as any)?.lat || 28.6139) + 0.0035,
                  lng: (trackingOrder as any)?.riderLng || ((session as any)?.lng || 77.2090) + 0.0028,
                  label: "Assigned Captain",
                  sublabel: "On the way to store",
                }}
                phase="pickup"
                heightClassName="h-72 sm:h-80"
                showControls={true}
              />

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Captain Status</span>
                  <p className="font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                    Approaching Store (~4 mins)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white text-xs hover:bg-emerald-700 cursor-pointer shadow-xs transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {sheetNode}
      {overlay}
      <StoreStatusConfirmModal
        isOpen={showStatusConfirmModal}
        onClose={() => setShowStatusConfirmModal(false)}
        currentOnline={isOnline}
        onConfirm={handleConfirmToggleOnline}
        isLoading={isUpdatingStatus}
      />
      <Toaster />
    </PartnerLayout>
  );
}
