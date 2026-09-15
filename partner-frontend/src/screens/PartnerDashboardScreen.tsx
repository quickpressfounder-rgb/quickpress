import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid, MapPin, Plus, ShoppingBag, Sparkles, TrendingUp, Wallet, X } from "lucide-react";
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
  QuickActionsGrid,
  QuickStatsGrid,
  RevenueCard,
  WelcomeCard,
  type DashboardShop,
  type DashboardSummaryCard,
  type QuickStat,
} from "../components/dashboard/DashboardCards";
import { Announcements, TodayPerformance } from "../components/dashboard/DashboardInsights";
import {
  DashboardSkeleton,
  NoOrdersEmptyState,
  OfflineEmptyState,
} from "../components/dashboard/DashboardStates";
import { LiveOrderCard, type LiveOrder } from "../components/dashboard/LiveOrderCard";
import { PullToRefresh } from "../components/dashboard/PullToRefresh";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile } from "@/api/partner/partner-profile-api";
import { fetchDashboardSummary, setStoreOpen } from "@/api/partner/partner-dashboard-api";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import { usePartnerContext } from "../context/PartnerContext";

const STATUS_TO_LIVE: Record<string, LiveOrder["status"]> = {
  new: "pending",
  placed: "pending",
  pending: "pending",
  accepted: "accepted",
  pickup_pending: "pickup",
  pickup_driver_assigned: "pickup",
  picked_up: "pickup",
  picked: "pickup",
  at_partner: "pickup",
  washing: "washing",
  dry_cleaning: "washing",
  processing: "washing",
  ironing: "ironing",
  ready: "ready",
  delivery_assigned: "ready",
  out_for_delivery: "ready",
  completed: "delivered",
  delivered: "delivered",
  cancelled: "delivered",
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

  const cached = useMemo(getCachedDashboard, []);

  const [shop, setShop] = useState<DashboardShop | null>(() => {
    if (cached.shop) return cached.shop;
    if (session?.businessName) {
      return {
        shopName: session.businessName,
        partnerName: session.ownerName || "Partner",
        logoInitials: (session.businessName || "QP").slice(0, 2).toUpperCase(),
        isVerified: session.isVerified,
        notifications: 0,
      };
    }
    return null;
  });
  const [summary, setSummary] = useState<DashboardSummaryCard | null>(cached.summary);
  const [quickStats, setQuickStats] = useState<QuickStat[]>(cached.quickStats);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(cached.earnings);
  const [isLoading, setIsLoading] = useState(() => !cached.shop && !cached.summary && !session);
  const [error, setError] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<LiveOrder | null>(null);

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await Promise.all([load(), refreshOrders()]);
    toast.success("Dashboard updated");
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

  // Monitor incoming unaccepted orders in real-time
  useEffect(() => {
    if (!isOnline) {
      setActiveAlertOrder(null);
      stopPartnerOrderAlertRing();
      return;
    }
    const incoming = orders.find(
      (o) => o.status === "new" || o.status === "placed" || o.status === "pending"
    );
    if (incoming) {
      setActiveAlertOrder({
        id: incoming.id,
        orderCode: incoming.code,
        customerName: incoming.customerName,
        customerPhone: incoming.customerPhone,
        pickupAddress: incoming.address || "Customer Doorstep",
        pickupSlot: incoming.slot,
        estimatedEarnings: Math.round(incoming.amount * 0.84),
        itemsCount: incoming.itemCount || incoming.items?.length || 1,
        items: (incoming.items || []).map((it) => ({
          name: it.name,
          quantity: it.qty || 1,
          unit: "pcs",
        })),
        expressDelivery: Boolean(
          (incoming as any).isExpress ||
          (incoming as any).pickup?.express ||
          incoming.serviceLabel?.toLowerCase().includes("express")
        ),
        isExpress: Boolean(
          (incoming as any).isExpress ||
          (incoming as any).pickup?.express ||
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

  const handleToggleOnline = useCallback(async () => {
    try {
      if (isOnline) {
        stopPartnerOrderAlertRing();
      }
      await toggleOnline();
      toast.success(!isOnline ? "Store is ONLINE & Accepting Orders" : "Store is now OFFLINE");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update store status");
    }
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
      title="Partner Dashboard"
      subtitle={shop ? `Welcome back, ${shop.partnerName} · ${shop.shopName}` : "Store Console"}
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
            <div className="animate-soft-fade space-y-6 lg:space-y-8">
              {/* Operational Metric Cards */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading title="Operational Overview" />
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.orders })}
                    className="flex items-center gap-1 text-xs font-bold text-brand-green hover:underline"
                  >
                    View Queue <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="mt-3.5">
                  <QuickStatsGrid stats={quickStats} />
                </div>
              </section>

              {/* Desktop Multi-column Grid: Revenue & Order Status */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <section className="min-w-0">
                  <SectionHeading title="Revenue Summary" />
                  <div className="mt-3.5">
                    <RevenueCard earnings={earnings} isLoading={isLoading} />
                  </div>
                </section>

                <section className="min-w-0">
                  <SectionHeading title="Order Status Flow" />
                  <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm mt-3.5">
                    <OrderStatusChips active="Washing" />
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">
                      Real-time stage transitions across your active customer bookings.
                    </p>
                  </div>
                </section>
              </div>

              {/* Live Orders Section */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading title="Active Orders" />
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.orders })}
                    className="flex items-center gap-1 text-xs font-bold text-brand-green hover:underline"
                  >
                    View all ({orders.length}) <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="mt-3.5">
                  {!isOnline ? (
                    <OfflineEmptyState onGoOnline={() => void handleToggleOnline()} />
                  ) : liveOrders.length === 0 ? (
                    <NoOrdersEmptyState />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  )}
                </div>
              </section>

              {/* Quick Actions Grid */}
              <section>
                <div className="flex items-center justify-between">
                  <SectionHeading title="Quick Shortcuts" />
                  <LayoutGrid className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-3.5">
                  <QuickActionsGrid />
                </div>
              </section>

              {/* Performance Insights */}
              <div className="grid gap-6 md:grid-cols-2">
                <section>
                  <SectionHeading title="Performance Insights" />
                  <div className="mt-3.5">
                    <TodayPerformance />
                  </div>
                </section>

                <section>
                  <SectionHeading title="Platform Announcements" />
                  <div className="mt-3.5">
                    <Announcements />
                  </div>
                </section>
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
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
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
                  lat: 27.8118,
                  lng: 78.6477,
                  label: session?.businessName || "My Laundry Store",
                  sublabel: "Store Hub",
                }}
                destinationLocation={{
                  lat: 27.8118 + 0.0075,
                  lng: 78.6477 + 0.0065,
                  label: trackingOrder.customerName,
                  sublabel: "Customer Delivery Location",
                }}
                riderLocation={{
                  lat: 27.8118 + 0.0035,
                  lng: 78.6477 + 0.0028,
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
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Approaching Store (~4 mins)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  className="rounded-xl bg-zinc-900 px-3.5 py-1.5 font-bold text-white text-xs hover:bg-black cursor-pointer"
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
      <Toaster />
    </PartnerLayout>
  );
}
