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
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Table,
  TrendingUp,
  Volume2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { playPartnerOrderChime, stopPartnerOrderAlertRing } from "../lib/partner-order-alert-sound";
import { OrderCard } from "../components/orders/OrderCard";
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

function ZomatoOfflineView({ onGoOnline }: { onGoOnline: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center select-none animate-in fade-in duration-200">
      {/* Exact Zomato Hanging CLOSED Board from Image 1 */}
      <div className="relative mb-6">
        <svg
          width="260"
          height="170"
          viewBox="0 0 260 170"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto drop-shadow-sm"
        >
          {/* Red Hanging Pin / Nail */}
          <circle cx="130" cy="22" r="12" fill="#E23744" />
          <circle cx="130" cy="22" r="6" fill="#B91C1C" />

          {/* Ropes hanging down to board corners */}
          <line
            x1="130"
            y1="22"
            x2="56"
            y2="82"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="130"
            y1="22"
            x2="204"
            y2="82"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Tilted Hanging Signboard */}
          <g transform="rotate(-6 130 105)">
            {/* Board Shadow */}
            <rect
              x="42"
              y="66"
              width="176"
              height="84"
              rx="14"
              fill="#CBD5E1"
              opacity="0.6"
            />
            {/* Board Background */}
            <rect
              x="38"
              y="62"
              width="176"
              height="84"
              rx="14"
              fill="#FFFFFF"
              stroke="#64748B"
              strokeWidth="3.5"
            />
            {/* Inner Border */}
            <rect
              x="44"
              y="68"
              width="164"
              height="72"
              rx="9"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* Holes / Rivets */}
            <circle cx="54" cy="78" r="3.5" fill="#64748B" />
            <circle cx="198" cy="78" r="3.5" fill="#64748B" />

            {/* CLOSED Typography matching Image 1 */}
            <text
              x="126"
              y="117"
              textAnchor="middle"
              fill="#475569"
              fontSize="28"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              letterSpacing="3.5"
            >
              CLOSED
            </text>
          </g>
        </svg>
      </div>

      {/* Title matching Image 1 */}
      <h2 className="text-base sm:text-lg font-bold text-zinc-800">
        You are offline
      </h2>

      {/* Subtitle with dotted underline matching Image 1 */}
      <p className="mt-1.5 text-xs text-zinc-500">
        Visit{" "}
        <a
          href="/settings"
          className="border-b border-dotted border-zinc-400 font-medium text-zinc-700 hover:text-black transition-colors"
        >
          help centre
        </a>{" "}
        for more details
      </p>

      {/* Go Online Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onGoOnline}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95 cursor-pointer"
        >
          <span className="size-2 rounded-full bg-white animate-pulse" />
          <span>Go Online &amp; Accept Orders</span>
        </button>
      </div>
    </div>
  );
}

export function PartnerDashboardScreen() {
  const navigate = useNavigate();
  const { session, isOnline, toggleOnline } = usePartnerContext();
  const { orders, isLoading: ordersLoading, refresh: refreshOrders } = usePartnerOrders();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();
  const { t, language } = useLanguage();

  const [shop, setShop] = useState<DashboardShop | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryCard | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<LiveOrder | null>(null);
  const [orderViewMode, setOrderViewMode] = useState<"cards" | "table">("cards");
  const [selectedTab, setSelectedTab] = useState<"new" | "processing" | "ready" | "dispatched" | "completed" | "all">("new");
  const [searchQuery, setSearchQuery] = useState("");

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

  const shopRef = useRef<DashboardShop | null>(null);
  const summaryRef = useRef<DashboardSummaryCard | null>(null);

  useEffect(() => {
    shopRef.current = shop;
  }, [shop]);

  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  const load = useCallback(async () => {
    if (!hasActiveSessionToken("partner")) {
      navigate({ to: partnerRoutes.auth });
      return;
    }
    if (!shopRef.current && !summaryRef.current) setIsLoading(true);
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
      if (!shopRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

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

  const zomatoStageCounts = useMemo(() => {
    let newOrders = 0;
    let processing = 0;
    let ready = 0;
    let dispatched = 0;
    let completed = 0;

    for (const o of orders) {
      const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
      if (s === "new" || s === "placed" || s === "pending" || s === "pending_partner_acceptance") {
        newOrders++;
      } else if (
        s === "washing" ||
        s === "ironing" ||
        s === "dry_cleaning" ||
        s === "processing" ||
        s === "at_partner" ||
        s === "accepted" ||
        s === "partner_accepted" ||
        s === "picked" ||
        s === "picked_up" ||
        s === "store_received" ||
        s === "pickup_pending" ||
        s === "pickup_rider_assigned"
      ) {
        processing++;
      } else if (s === "ready" || s === "ready_for_delivery") {
        ready++;
      } else if (
        s === "out_for_delivery" ||
        s === "dispatch_otp_pending" ||
        s === "delivery_rider_assigned" ||
        s === "delivery_rider_accepted" ||
        s === "dispatch"
      ) {
        dispatched++;
      } else if (s === "delivered" || s === "completed") {
        completed++;
      }
    }

    return {
      all: orders.length,
      new: newOrders,
      processing,
      ready,
      dispatched,
      completed,
    };
  }, [orders]);

  const displayedOrders = useMemo(() => {
    let list = orders;
    if (selectedTab === "new") {
      list = orders.filter((o) => {
        const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
        return s === "new" || s === "placed" || s === "pending" || s === "pending_partner_acceptance";
      });
    } else if (selectedTab === "processing") {
      list = orders.filter((o) => {
        const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
        return (
          s === "washing" ||
          s === "ironing" ||
          s === "dry_cleaning" ||
          s === "processing" ||
          s === "at_partner" ||
          s === "accepted" ||
          s === "partner_accepted" ||
          s === "picked" ||
          s === "picked_up" ||
          s === "store_received" ||
          s === "pickup_pending" ||
          s === "pickup_rider_assigned"
        );
      });
    } else if (selectedTab === "ready") {
      list = orders.filter((o) => {
        const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
        return s === "ready" || s === "ready_for_delivery";
      });
    } else if (selectedTab === "dispatched") {
      list = orders.filter((o) => {
        const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
        return (
          s === "out_for_delivery" ||
          s === "dispatch_otp_pending" ||
          s === "delivery_rider_assigned" ||
          s === "delivery_rider_accepted" ||
          s === "dispatch"
        );
      });
    } else if (selectedTab === "completed") {
      list = orders.filter((o) => {
        const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
        return s === "delivered" || s === "completed";
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.code?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [orders, selectedTab, searchQuery]);

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
          ) : !isOnline ? (
            /* EXACT Zomato Offline Screen matching Image 1 */
            <ZomatoOfflineView onGoOnline={() => setShowStatusConfirmModal(true)} />
          ) : (
            <div className="animate-soft-fade space-y-6">
              {/* ZOMATO RESTAURANT PARTNER LIVE ORDER STATION */}
              {/* 1. Sleek Store Operational Ribbon */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 sm:px-6 sm:py-3.5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white font-black text-xs">
                    {(shop?.shopName || session?.businessName || "QP").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-zinc-950 tracking-tight">
                        {shop?.shopName || session?.businessName || session?.ownerName || "Merchant Store"}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online &amp; Accepting Orders
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500">
                      Outlet #{session?.partnerId || (session as any)?.account?.linkedId || "186660"} · {session?.city || "Kasganj"} · Realtime Live Queue
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-1.5 text-xs font-bold text-zinc-700">
                    <IndianRupee className="size-3.5 text-zinc-500" />
                    <span>Today:</span>
                    <span className="font-black text-zinc-950">₹{(earnings?.todayEarnings || 0).toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-1.5 text-xs font-bold text-zinc-700">
                    <Package className="size-3.5 text-zinc-500" />
                    <span>Total Orders:</span>
                    <span className="font-black text-zinc-950">{orders.length}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.services })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Rate Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={refresh}
                    disabled={isLoading}
                    title="Refresh Live Data"
                    className="flex size-8.5 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
                  </button>
                </div>
              </div>

              {/* 2. Canonical Zomato Stage Navigation Tabs & Search */}
              <div className="flex flex-col gap-3.5 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: "new", label: "New Orders", count: zomatoStageCounts.new, alert: zomatoStageCounts.new > 0 },
                    { id: "processing", label: "In Processing", count: zomatoStageCounts.processing },
                    { id: "ready", label: "Ready for Delivery", count: zomatoStageCounts.ready },
                    { id: "dispatched", label: "Dispatched", count: zomatoStageCounts.dispatched },
                    { id: "completed", label: "Completed", count: zomatoStageCounts.completed },
                    { id: "all", label: "All Orders", count: zomatoStageCounts.all },
                  ].map((tab) => {
                    const isActive = selectedTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-zinc-950 text-white font-black shadow-xs"
                            : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200/80"
                        }`}
                      >
                        {tab.alert ? <span className="size-2 rounded-full bg-rose-500 animate-pulse" /> : null}
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            isActive
                              ? "bg-zinc-800 text-white"
                              : tab.alert
                                ? "bg-rose-100 text-rose-700"
                                : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search order #, customer, phone..."
                      className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-8.5 pr-7 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-hidden shadow-2xs"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setOrderViewMode("cards")}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        orderViewMode === "cards"
                          ? "bg-white text-zinc-950 font-black shadow-xs border border-zinc-200/80"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                      title="Card Grid"
                    >
                      <LayoutGrid className="size-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderViewMode("table")}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        orderViewMode === "table"
                          ? "bg-white text-zinc-950 font-black shadow-xs border border-zinc-200/80"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                      title="Table Layout"
                    >
                      <LayoutList className="size-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Main Order Management Workspace */}
              <div>
                {displayedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/90 bg-white px-6 py-20 text-center shadow-2xs">
                    <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 mb-4">
                      <ShoppingBag className="size-8 stroke-[1.5]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                      {searchQuery
                        ? "No orders match your search"
                        : selectedTab === "new"
                          ? "Waiting for new orders"
                          : `No orders in this stage`}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs text-zinc-500 leading-relaxed">
                      {searchQuery
                        ? "Try searching with a different order code, customer name or phone number."
                        : "Your outlet is online and ready. New orders from nearby customers will appear here automatically with a loud audio ring."}
                    </p>
                    <div className="mt-6 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Refresh Queue</span>
                      </button>
                    </div>
                  </div>
                ) : orderViewMode === "cards" ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {displayedOrders.map((order, index) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        index={index}
                        onAction={handleAction}
                        busyAction={busy?.orderId === order.id ? busy.actionId : null}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                            <th className="px-4 py-3.5">Order ID</th>
                            <th className="px-4 py-3.5">Customer</th>
                            <th className="px-4 py-3.5">Items &amp; Services</th>
                            <th className="px-4 py-3.5">Pickup Time</th>
                            <th className="px-4 py-3.5">Amount</th>
                            <th className="px-4 py-3.5">Stage</th>
                            <th className="px-4 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-medium">
                          {displayedOrders.map((order) => {
                            const isNew =
                              order.stage === "new" ||
                              (order as any).status === "new" ||
                              order.stage === "pending" ||
                              (order as any).status === "placed";
                            const amount =
                              (order as any).totalPrice ||
                              (order as any).amount ||
                              (order as any).totalAmount ||
                              0;
                            return (
                              <tr
                                key={order.id}
                                onClick={() =>
                                  navigate({
                                    to: partnerRoutes.orderDetails,
                                    params: { orderId: order.id },
                                  })
                                }
                                className="transition-colors hover:bg-zinc-50/80 cursor-pointer"
                              >
                                <td className="px-4 py-3.5 font-mono font-black text-zinc-950">
                                  #{order.code}
                                </td>
                                <td className="px-4 py-3.5 font-bold text-zinc-900">
                                  {order.customerName}
                                  {order.customerPhone ? (
                                    <p className="text-[11px] font-normal text-zinc-500">
                                      {order.customerPhone}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3.5 text-zinc-600">
                                  <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                    <span className="rounded-md bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                                      {order.itemCount || 1} items
                                    </span>
                                    {(order.services || []).slice(0, 2).map((svc, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="rounded-md bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                                      >
                                        {svc}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-zinc-700 font-semibold whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-zinc-400" />
                                    <span>{(order as any).pickupTime || "Today"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 font-black text-zinc-950 whitespace-nowrap">
                                  ₹{Number(amount).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                    {order.stage}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  <div
                                    className="flex items-center justify-end gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isNew ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleAction(order, "reject")}
                                          className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAction(order, "accept")}
                                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                                        >
                                          Accept
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate({
                                            to: partnerRoutes.orderDetails,
                                            params: { orderId: order.id },
                                          })
                                        }
                                        className="rounded-lg bg-zinc-100 border border-zinc-200 px-3 py-1 text-xs font-bold text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
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
