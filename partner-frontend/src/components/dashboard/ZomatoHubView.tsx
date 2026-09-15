import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BarChart3,
  Bell,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Headphones,
  HelpCircle,
  History,
  Layers,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Phone,
  PhoneCall,
  Play,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  UserCheck,
  Users,
  Volume2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { partnerRoutes } from "../../navigation/partner-routes";
import { fetchDashboardSummary, getCachedDashboardSummary, setStoreOpen } from "../../api/partner/partner-dashboard-api";
import { fetchEarnings } from "../../api/partner/partner-earnings-api";
import { fetchPartnerProfile, getCachedPartnerProfile } from "../../api/partner/partner-profile-api";
import { usePartnerContext } from "../../context/PartnerContext";
import { usePartnerOrders } from "../../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../../hooks/use-order-action-handler";
import { useLanguage } from "../../lib/i18n";
import type { ManagedOrder, PartnerOrderFilterTab } from "../../data/partner-orders-mock";
import { STAGE_LABEL, isOrderMatchingTab } from "../../data/partner-orders-mock";
import { OrderTimeline } from "../orders/OrderTimeline";
import { OrderSlaCountdown } from "../orders/OrderSlaCountdown";

function getStageTimelineIndex(stage: string): number {
  switch (stage) {
    case "new":
      return 0; // Placed
    case "accepted":
    case "pickup_pending":
      return 1; // Accepted
    case "at_partner":
    case "pickup_rider_assigned":
    case "pickup_rider_accepted":
      return 2; // Pickup
    case "washing":
    case "dry_cleaning":
    case "ironing":
    case "processing":
      return 3; // Cleaning
    case "ready":
    case "delivery_rider_assigned":
    case "delivery_rider_accepted":
    case "out_for_delivery":
      return 4; // Ready
    case "delivered":
    case "completed":
      return 5; // Delivered
    default:
      return 0;
  }
}

function getDisplayCustomerName(name?: string): string {
  if (!name) return "QuickPress Customer";
  const trimmed = name.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const isPhoneNumber = /^[+\d\s\-()]+$/.test(trimmed) && digitsOnly.length >= 10;
  if (isPhoneNumber || (trimmed.toLowerCase().includes("customer") && digitsOnly.length >= 10)) {
    return "QuickPress Customer";
  }
  return trimmed;
}

function getCustomerInitials(name?: string): string {
  const cleanName = getDisplayCustomerName(name);
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return (cleanName[0] || "C").toUpperCase();
}

const PERFORMANCE_METRIC_TABS = [
  { id: "sales", label: "Sales & Orders" },
  { id: "funnel", label: "Funnel" },
  { id: "quality", label: "Service quality" },
  { id: "operations", label: "Operations" },
];

export function ZomatoHubView() {
  const navigate = useNavigate();
  const { session, isOnline, toggleOnline } = usePartnerContext();
  const cachedProfile = useMemo(getCachedPartnerProfile, []);
  const cachedSummary = useMemo(getCachedDashboardSummary, []);

  const { orders, counts, refresh: refreshOrders, verifyDispatchOtp } = usePartnerOrders();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();
  const { t } = useLanguage();

  const [activeFilterTab, setActiveFilterTab] = useState<PartnerOrderFilterTab>("active");
  const [shopName, setShopName] = useState(() =>
    session?.businessName || cachedProfile?.businessName || cachedProfile?.ownerName || "QuickPress Laundry Store"
  );
  const [locationName, setLocationName] = useState(() =>
    cachedProfile?.city || session?.city || "Kasganj"
  );
  const [todayEarnings, setTodayEarnings] = useState(() => cachedSummary?.todayEarnings ?? 0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(() =>
    cachedSummary ? (cachedSummary.newOrders + cachedSummary.inProcess + cachedSummary.readyForDelivery + cachedSummary.completedToday) : 0
  );
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(() => !session && !cachedProfile && !cachedSummary);
  const [selectedManageOrder, setSelectedManageOrder] = useState<ManagedOrder | null>(null);
  const [hubDispatchOtp, setHubDispatchOtp] = useState("");
  const [isVerifyingHubDispatch, setIsVerifyingHubDispatch] = useState(false);
  const [expandedItemsOrderIds, setExpandedItemsOrderIds] = useState<Record<string, boolean>>({});

  const toggleItemsExpanded = (orderId: string) => {
    setExpandedItemsOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleHubVerifyDispatch = async () => {
    if (!selectedManageOrder) return;
    const cleanOtp = hubDispatchOtp.trim();
    if (cleanOtp.length !== 4) {
      toast.error("Please enter the complete 4-digit Dispatch OTP communicated by the Captain.");
      return;
    }
    setIsVerifyingHubDispatch(true);
    try {
      await verifyDispatchOtp(selectedManageOrder.id, cleanOtp);
      toast.success("✓ Dispatch OTP Verified! Package handed over to Delivery Captain.");
      setHubDispatchOtp("");
      setSelectedManageOrder(null);
    } catch (err: any) {
      toast.error(err?.message || "Invalid Dispatch OTP! Please ask the Captain for their 4-digit code.");
    } finally {
      setIsVerifyingHubDispatch(false);
    }
  };

  useEffect(() => {
    if (session?.businessName) {
      setShopName(session.businessName);
    }
    if (session?.city) {
      setLocationName(session.city);
    }
  }, [session?.businessName, session?.city]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchPartnerProfile().catch(() => null),
      fetchDashboardSummary().catch(() => null),
      fetchEarnings().catch(() => null),
    ]).then(([profile, summary, earnings]) => {
      if (!alive) return;
      if (profile) {
        setShopName(profile.businessName || profile.ownerName || session?.businessName || "QuickPress Laundry Store");
        setLocationName(profile.city ? `${profile.city}` : (session?.city || "Kasganj"));
      }
      if (summary) {
        setTodayOrdersCount(
          summary.newOrders + summary.inProcess + summary.readyForDelivery + summary.completedToday
        );
        setTodayEarnings(summary.todayEarnings);
      }
      if (earnings) {
        setEarningsData(earnings);
      }
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [session?.businessName, session?.city]);

  const handleToggleStore = async () => {
    try {
      await toggleOnline();
      toast.success(!isOnline ? "Store is now Online & Accepting Orders" : "Store is now Offline");
    } catch {
      toast.error("Failed to update store status");
    }
  };

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) => order.stage !== "completed" && order.stage !== "delivered" && order.stage !== "cancelled"
    );
  }, [orders]);

  const FILTER_TABS: { id: PartnerOrderFilterTab; label: string; count: number }[] = useMemo(() => [
    { id: "active", label: "Active", count: activeOrders.length },
    { id: "pickup", label: "Pickup", count: activeOrders.filter((o) => isOrderMatchingTab(o, "pickup")).length },
    { id: "processing", label: "Processing", count: activeOrders.filter((o) => isOrderMatchingTab(o, "processing")).length },
    { id: "ready", label: "Ready", count: activeOrders.filter((o) => isOrderMatchingTab(o, "ready")).length },
    { id: "dispatch", label: "Dispatch", count: activeOrders.filter((o) => isOrderMatchingTab(o, "dispatch")).length },
    { id: "out_for_delivery", label: "Out for Delivery", count: activeOrders.filter((o) => isOrderMatchingTab(o, "out_for_delivery")).length },
  ], [activeOrders]);

  const displayedOrders = useMemo(() => {
    if (activeFilterTab === "active" || activeFilterTab === "all") {
      return activeOrders;
    }
    return activeOrders.filter((order) => isOrderMatchingTab(order, activeFilterTab));
  }, [activeOrders, activeFilterTab]);

  return (
    <div className="min-h-screen bg-[#F4F5F7] pb-28 text-zinc-900">
      {/* Top Header: Showing data for */}
      <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
              SHOWING DATA FOR
            </p>
            <h1 className="truncate text-base font-black tracking-tight text-zinc-900">
              {shopName}
            </h1>
            <p className="text-xs font-semibold text-zinc-500">{locationName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleStore}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${
                isOnline
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                }`}
              />
              <span>{isOnline ? "Online" : "Offline"}</span>
              <ChevronRight className="size-3" />
            </button>

            <Link
              to={partnerRoutes.notifications}
              className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95"
            >
              <Bell className="size-4" />
            </Link>

            <Link
              to={partnerRoutes.settings}
              className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95"
            >
              <Menu className="size-4" />
            </Link>
          </div>
        </div>

        {/* Canonical Order Status Filter Pills Bar */}
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all active:scale-95 ${
                  isActive
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. OPERATIONAL DASHBOARD VIEW                                             */}
      {/* ========================================================================= */}
      <div className="space-y-4 px-4 pt-3">
        {/* Today So Far Card */}
        <div>
          <h2 className="text-xs font-black tracking-wider text-zinc-500 uppercase">
            Today so far
          </h2>
          <div className="mt-1.5 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-baseline gap-6">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Total sales
                  </p>
                  <p className="mt-0.5 text-2xl font-black text-zinc-900">
                    ₹{todayEarnings.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Total orders
                  </p>
                  <p className="mt-0.5 text-2xl font-black text-zinc-900">
                    {todayOrdersCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Flow Progress */}
            <div className="mt-5 grid grid-cols-4 gap-2 pt-3 border-t border-zinc-100 text-center">
              <div className="rounded-xl bg-zinc-50 p-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">New</p>
                <p className="text-sm font-black text-zinc-900">{counts.new || 0}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Accepted</p>
                <p className="text-sm font-black text-zinc-900">
                  {(counts.accepted || 0) + (counts.pickup_pending || 0)}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Processing</p>
                <p className="text-sm font-black text-zinc-900">
                  {(counts.washing || 0) + (counts.dry_cleaning || 0) + (counts.ironing || 0)}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Ready</p>
                <p className="text-sm font-black text-zinc-900">{counts.ready || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Queue according to selected filter */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black tracking-tight text-zinc-900">
              {activeFilterTab === "active" || activeFilterTab === "all" ? (
                <>Active Orders Queue ({displayedOrders.length})</>
              ) : (
                <>Active Orders · {activeFilterTab.toUpperCase()} ({displayedOrders.length})</>
              )}
            </h2>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
            >
              View all orders <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="mt-2.5 space-y-3">
            {displayedOrders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-sm">
                <ShoppingBag className="mx-auto size-8 text-zinc-300" />
                <p className="mt-2 text-xs font-bold text-zinc-600">
                  {activeFilterTab === "active" || activeFilterTab === "all" ? "No active orders right now" : `No active orders in "${activeFilterTab}" status`}
                </p>
                <p className="text-[10px] text-zinc-400">Incoming customer orders will appear here in real-time.</p>
              </div>
            ) : (
              displayedOrders.map((order) => {
                const stepIdx = getStageTimelineIndex(order.stage);
                const isNew = order.stage === "new";

                return (
                  <div
                    key={order.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, a, input")) return;
                      navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } });
                    }}
                    className="rounded-3xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md cursor-pointer space-y-3.5"
                  >
                    {/* 1. TOP BAR: Order Code + Services + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-black text-white tracking-wide shadow-2xs">
                          #{order.code}
                        </span>
                        {order.services && order.services.length > 0 ? (
                          <span className="truncate rounded-lg bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                            {order.services.join(", ")}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                            isNew
                              ? "bg-amber-50 text-amber-800 border border-amber-300 animate-pulse"
                              : order.stage === "ready"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isNew
                                ? "bg-amber-500"
                                : order.stage === "ready"
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                            }`}
                          />
                          {STAGE_LABEL[order.stage] || order.stage}
                        </span>
                      </div>
                    </div>

                    {/* 2. CUSTOMER NAME & SLA BAR */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50/70 p-3 border border-zinc-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xs shadow-xs">
                          {getCustomerInitials(order.customerName)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-zinc-900 truncate">
                            {getDisplayCustomerName(order.customerName)}
                          </h4>
                          <p className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5">
                            <span className="text-emerald-700 font-bold">
                              ★ {order.customerRating && order.customerRating > 0 ? order.customerRating.toFixed(1) : "5.0"}
                            </span>
                            <span>•</span>
                            <span>{order.customerOrders ? `${order.customerOrders} orders placed` : "Verified Customer"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <OrderSlaCountdown
                          placedAt={(order as any).placedAt || (order as any).placedAtRaw}
                          deadline={(order as any).partnerAcceptDeadline || (order as any).riderAcceptDeadline}
                          acceptedAt={(order as any).partnerAcceptedAt}
                          stage={order.stage}
                          autoCancelled={(order as any).autoCancelled}
                          cancellationReason={(order as any).cancellationReason || (order as any).cancelledReason}
                        />
                      </div>
                    </div>

                    {/* 3. ORDER KI DETAIL (Key Specs 3-column Grid) */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleItemsExpanded(order.id)}
                        className={`rounded-xl p-2 border transition-all cursor-pointer text-center flex flex-col items-center justify-center group ${
                          expandedItemsOrderIds[order.id]
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs"
                            : "bg-zinc-50 border-zinc-100/80 hover:bg-zinc-100/90 text-zinc-900"
                        }`}
                        title="Click to view items & pricing"
                      >
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400 group-hover:text-emerald-700">
                          <ReceiptText className="size-3 text-zinc-500 group-hover:text-emerald-600" />
                          <span>Items</span>
                          <ChevronDown
                            className={`size-3 transition-transform duration-200 ${
                              expandedItemsOrderIds[order.id] ? "rotate-180 text-emerald-600" : ""
                            }`}
                          />
                        </div>
                        <p className="text-xs font-black mt-0.5 group-hover:text-emerald-700 flex items-center gap-1">
                          <span>{order.itemCount} items</span>
                          <span className="text-[10px] font-semibold text-emerald-600 underline decoration-dotted">View</span>
                        </p>
                      </button>
                      <div className="rounded-xl bg-zinc-50 p-2 border border-zinc-100/80">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Order Amount</p>
                        <p className="text-xs font-black text-emerald-700 mt-0.5">₹{order.amount}</p>
                      </div>
                      <div className="rounded-xl bg-zinc-50 p-2 border border-zinc-100/80">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Schedule</p>
                        <p className="text-xs font-black text-zinc-900 mt-0.5 truncate">
                          {order.pickupTime || order.deliveryEta || "15-30 mins"}
                        </p>
                      </div>
                    </div>

                    {/* EXPANDABLE ITEMS WITH PRICING BREAKDOWN */}
                    {expandedItemsOrderIds[order.id] && (
                      <div className="rounded-2xl bg-zinc-50/95 border border-zinc-200/90 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/60 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                          <span className="flex items-center gap-1.5 text-zinc-800">
                            <ReceiptText className="size-3.5 text-emerald-600" />
                            Items & Pricing Breakdown
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400">
                            {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {(!order.items || order.items.length === 0) ? (
                          <div className="py-2.5 text-center text-xs text-zinc-500 font-medium bg-white rounded-xl border border-zinc-100">
                            Standard Laundry Service · Total: ₹{order.amount}
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                            {order.items.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white border border-zinc-100 text-xs shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[10px] font-black text-emerald-700 border border-emerald-200/60">
                                    {item.qty || 1}×
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-black truncate text-zinc-900">{item.name}</p>
                                    {item.service && (
                                      <p className="text-[10px] text-zinc-400 capitalize">{item.service}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 font-black text-zinc-900 pl-2">
                                  <span>₹{(item.qty || 1) * (item.price || 0)}</span>
                                  {item.price ? (
                                    <span className="block text-[9px] font-semibold text-zinc-400">₹{item.price}/ea</span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/80 text-xs font-black text-zinc-900">
                          <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Total Bill</span>
                          <span className="text-sm font-black text-emerald-700">₹{order.amount}</span>
                        </div>
                      </div>
                    )}

                    {/* Pickup Address preview if available */}
                    {order.pickupAddress ? (
                      <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
                        <MapPin className="size-3.5 shrink-0 text-zinc-400" />
                        <span className="truncate">{order.pickupAddress}</span>
                      </div>
                    ) : null}

                    {/* 4. TIMELINE (Horizontal Stepper) */}
                    <div className="rounded-2xl bg-zinc-50/90 p-3 border border-zinc-100">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        {[
                          { key: "placed", label: "Placed" },
                          { key: "accepted", label: "Accepted" },
                          { key: "pickup", label: "Pickup" },
                          { key: "cleaning", label: "Cleaning" },
                          { key: "ready", label: "Ready" },
                        ].map((step, idx) => {
                          const isDone = idx < stepIdx;
                          const isCurrent = idx === stepIdx;
                          return (
                            <div key={step.key} className="flex flex-1 flex-col items-center relative">
                              {idx > 0 && (
                                <div
                                  className={`absolute top-2.5 -left-1/2 w-full h-[2px] -z-0 transition-colors ${
                                    idx <= stepIdx ? "bg-emerald-500" : "bg-zinc-200"
                                  }`}
                                />
                              )}
                              <div
                                className={`relative z-10 flex size-5 items-center justify-center rounded-full text-[10px] font-black transition-all ${
                                  isCurrent
                                    ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20 shadow-xs scale-110"
                                    : isDone
                                      ? "bg-emerald-500 text-white"
                                      : "bg-zinc-200 text-zinc-400"
                                }`}
                              >
                                {isDone ? "✓" : isCurrent ? "✓" : idx + 1}
                              </div>
                              <span
                                className={`mt-1.5 text-[9px] tracking-tight ${
                                  isCurrent
                                    ? "text-emerald-800 font-black"
                                    : isDone
                                      ? "text-zinc-700 font-bold"
                                      : "text-zinc-400 font-medium"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. ACTION BUTTONS (Details & Primary Action in matching Pill style) */}
                    <div className="flex items-center gap-2.5 pt-1.5 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: partnerRoutes.orderDetails,
                            params: { orderId: order.id },
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-50 hover:bg-zinc-100 py-2.5 sm:py-3 px-3 text-xs font-bold text-zinc-700 active:scale-95 shadow-2xs transition-all cursor-pointer"
                      >
                        <FileText className="size-3.5 text-zinc-500" />
                        <span>Order Details</span>
                      </button>

                      {isNew ? (
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(order, "reject")}
                            className="flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 py-2.5 sm:py-3 px-3.5 text-xs font-bold text-rose-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            <X className="size-3.5 text-rose-600" />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(order, "accept")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <Check className="size-3.5" />
                            <span>Accept</span>
                          </button>
                        </div>
                      ) : order.stage === "accepted" || order.stage === "pickup_pending" ? (
                        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/90 py-2.5 sm:py-3 px-3 text-xs font-bold text-amber-800 shadow-2xs">
                          <Bike className="size-3.5 text-amber-700" />
                          <span>Clothes En Route</span>
                        </div>
                      ) : order.stage === "at_partner" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(order, "start_washing")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <span>Start Cleaning 🧺</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      ) : order.stage === "washing" || order.stage === "dry_cleaning" || order.stage === "ironing" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(order, "mark_ready")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-emerald-500 bg-gradient-to-r from-amber-500 to-emerald-600 hover:opacity-95 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <span>Mark Ready ✨</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      ) : order.stage === "ready" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedManageOrder(order);
                            setHubDispatchOtp("");
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <ShieldCheck className="size-4" />
                          <span>Handover (OTP)</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: partnerRoutes.orderDetails,
                              params: { orderId: order.id },
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-900 hover:bg-black py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-2xs transition-all cursor-pointer"
                        >
                          <span>Manage Order</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* 📱 QUICK MANAGE ORDER POPUP MODAL (Opens directly on Home Page!)          */}
      {/* ========================================================================= */}
      {selectedManageOrder ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setSelectedManageOrder(null)}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-black text-zinc-800">
                    #{selectedManageOrder.code}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                    {STAGE_LABEL[selectedManageOrder.stage] || selectedManageOrder.stage}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-black text-zinc-900">
                  {selectedManageOrder.customerName}
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  {selectedManageOrder.customerOrders ? `${selectedManageOrder.customerOrders} orders placed · ` : ""}Verified Customer
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedManageOrder(null)}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Booked Items Summary */}
            <div className="mt-4 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-100">
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                Booked Items ({selectedManageOrder.items.length})
              </p>
              <div className="mt-2 divide-y divide-zinc-200/60 text-xs font-bold text-zinc-800">
                {selectedManageOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                    <span>{item.qty}× {item.name}</span>
                    <span>₹{item.qty * item.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex justify-between border-t border-dashed border-zinc-300 pt-2 text-xs font-black text-zinc-900">
                <span>Total Amount:</span>
                <span className="text-emerald-700">₹{selectedManageOrder.amount}</span>
              </div>
            </div>

            {/* Dispatch OTP Verification Card for Handover to Captain */}
            {(selectedManageOrder.stage === "ready" || selectedManageOrder.stage === "dispatch_otp_pending" || selectedManageOrder.status === "ready_for_delivery") && (
              <div className="mt-4 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 block">
                        Captain Handover Verification
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        कैप्टन को कपड़े सौंपने हेतु ओटीपी दर्ज करें
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[9px] font-black text-emerald-800">
                    Mandatory OTP
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold text-zinc-700 leading-relaxed">
                  Ask the arriving Delivery Captain for their <strong className="text-emerald-900 font-black">4-digit Dispatch OTP</strong> shown in their app to handover clean laundry:
                </p>

                {/* 4-Digit Numeric OTP Input + Handover Button */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 5387"
                    value={hubDispatchOtp}
                    onChange={(e) => setHubDispatchOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-32 rounded-xl border-2 border-emerald-400 bg-white px-3 py-2 text-center font-mono text-lg font-black tracking-widest text-emerald-950 placeholder:text-zinc-300 placeholder:text-xs placeholder:font-sans focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                  <button
                    type="button"
                    disabled={hubDispatchOtp.trim().length !== 4 || isVerifyingHubDispatch}
                    onClick={handleHubVerifyDispatch}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 px-3.5 py-2.5 text-xs font-black text-white shadow-xs transition-all active:scale-95"
                  >
                    {isVerifyingHubDispatch ? (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="size-4 stroke-[2.5]" />
                    )}
                    <span>Verify & Handover ✓</span>
                  </button>
                </div>

                <p className="mt-2 text-center text-[10px] font-medium text-zinc-500">
                  🔒 Handover is locked. Order cannot be released without entering the Captain's Dispatch OTP.
                </p>
              </div>
            )}

            {/* Real Order Timeline */}
            <div className="mt-4 rounded-2xl bg-zinc-50 p-4 border border-zinc-100">
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-3">
                Order Timeline
              </p>
              <OrderTimeline order={selectedManageOrder} />
            </div>

            {/* Stage Action Buttons */}
            <div className="mt-4 space-y-2">
              {selectedManageOrder.stage === "new" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleAction(selectedManageOrder, "reject");
                      setSelectedManageOrder(null);
                    }}
                    className="flex-1 rounded-2xl border border-red-200 py-3 text-xs font-black text-red-600 active:scale-95"
                  >
                    Reject Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAction(selectedManageOrder, "accept");
                      setSelectedManageOrder(null);
                    }}
                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm active:scale-95"
                  >
                    Accept Order ✓
                  </button>
                </div>
              ) : selectedManageOrder.stage === "accepted" || selectedManageOrder.stage === "pickup_pending" ? (
                <div className="w-full rounded-2xl bg-amber-50 border border-amber-200/80 p-3 text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
                  <span>🛵</span>
                  <span>Waiting for Captain to reach store with laundry (कैप्टन के कपड़े लेकर स्टोर पहुँचने की प्रतीक्षा है)</span>
                </div>
              ) : selectedManageOrder.stage === "at_partner" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleAction(selectedManageOrder, "start_washing");
                    setSelectedManageOrder(null);
                  }}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>Start Cleaning 🧺</span>
                  <ArrowRight className="size-3" />
                </button>
              ) : selectedManageOrder.stage === "washing" || selectedManageOrder.stage === "dry_cleaning" || selectedManageOrder.stage === "ironing" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleAction(selectedManageOrder, "mark_ready");
                    setSelectedManageOrder(null);
                  }}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm active:scale-95"
                >
                  Mark Order Ready for Delivery ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: partnerRoutes.orderDetails,
                      params: { orderId: selectedManageOrder.id },
                    });
                    setSelectedManageOrder(null);
                  }}
                  className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white active:scale-95"
                >
                  View Full Order Details →
                </button>
              )}

              {/* Call Customer & Call Captain Quick Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
                    if (selectedManageOrder.customerPhone && !selectedManageOrder.customerPhone.includes("••")) {
                      window.open(`tel:${selectedManageOrder.customerPhone.replace(/\s/g, "")}`);
                    } else {
                      toast.success("Privacy Call: Patching through to customer via virtual bridge 📞");
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="size-3.5 text-emerald-600" />
                  <span>Call Customer 🔒</span>
                </button>

                {selectedManageOrder.assignedRider?.phone || selectedManageOrder.rider?.phone || (selectedManageOrder as any).riderPhone ? (
                  <a
                    href={`tel:${String(selectedManageOrder.assignedRider?.phone || selectedManageOrder.rider?.phone || (selectedManageOrder as any).riderPhone).replace(/\s/g, "")}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50/70 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 cursor-pointer"
                  >
                    <Bike className="size-3.5 text-blue-600" />
                    <span>Call Captain</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.info("Captain not assigned yet for this order")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 active:scale-95 cursor-pointer"
                  >
                    <Bike className="size-3.5 text-zinc-400" />
                    <span>Call Captain</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Action Sheets and Overlays */}
      {sheetNode}
      {overlay}
    </div>
  );
}
