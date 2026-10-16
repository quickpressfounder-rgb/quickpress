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
  Globe,
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
  PowerOff,
  Radio,
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
import {
  isNativeAndroidApp,
  isBatteryOptimizationIgnored,
  requestIgnoreBatteryOptimization,
} from "../../lib/merchant-device-opt";
import { OrderTimeline } from "../orders/OrderTimeline";
import { OrderSlaCountdown } from "../orders/OrderSlaCountdown";
import {
  GarmentSummaryChips,
  OrderSlaAcceptanceTimer,
  DirectContactActions,
  CardHandoverOtpInput,
  PrintBagTagButton,
} from "../orders/OrderQuickTools";
import { StoreStatusConfirmModal } from "./StoreStatusConfirmModal";

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
  const { t, openLanguageModal } = useLanguage();

  const [activeFilterTab, setActiveFilterTab] = useState<PartnerOrderFilterTab>("active");
  const [shopName, setShopName] = useState(() =>
    session?.businessName || cachedProfile?.businessName || cachedProfile?.ownerName || "Merchant Store"
  );
  const [shopLogo, setShopLogo] = useState<string>(() =>
    (session as any)?.storeImage || (session as any)?.logoUrl || (session as any)?.logo || cachedProfile?.logo || cachedProfile?.storeImage || ""
  );
  const [locationName, setLocationName] = useState(() =>
    cachedProfile?.city || session?.city || "Local Hub"
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
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
        setShopName(profile.businessName || profile.ownerName || session?.businessName || "Merchant Store");
        setLocationName(profile.city ? `${profile.city}` : (session?.city || "Local Hub"));
        if (profile.storeImage || profile.logoUrl) {
          setShopLogo(profile.storeImage || profile.logoUrl);
        }
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

  // Instant real-time listener for incoming orders (<10ms UI sync)
  useEffect(() => {
    const handleNewOrder = () => {
      fetchDashboardSummary().then((summary) => {
        if (summary) {
          setTodayOrdersCount(
            summary.newOrders + summary.inProcess + summary.readyForDelivery + summary.completedToday
          );
          setTodayEarnings(summary.todayEarnings);
        }
      }).catch(() => {});
      void refreshOrders();
    };
    window.addEventListener("qp:partner:new_order", handleNewOrder);
    return () => window.removeEventListener("qp:partner:new_order", handleNewOrder);
  }, [refreshOrders]);

  const handleConfirmStatusChange = () => {
    const nextState = !isOnline;
    // Instant optimistic modal close and state toggle in < 5ms
    setShowStatusConfirmModal(false);
    toggleOnline();
    toast.success(
      nextState
        ? "⚡ Store is now ONLINE! Ready to receive laundry orders."
        : "Store is now OFFLINE. New customer orders are paused."
    );
  };

  const [showBatteryNotice, setShowBatteryNotice] = useState(false);

  useEffect(() => {
    if (isNativeAndroidApp()) {
      const ignored = isBatteryOptimizationIgnored();
      setShowBatteryNotice(!ignored);
    }
  }, []);

  const handleEnableOptimization = () => {
    requestIgnoreBatteryOptimization();
    setShowBatteryNotice(false);
  };

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) => order.stage !== "completed" && order.stage !== "delivered" && order.stage !== "cancelled"
    );
  }, [orders]);

  const FILTER_TABS: { id: PartnerOrderFilterTab; label: string; count: number }[] = useMemo(() => [
    { id: "all", label: "All", count: orders.length },
    { id: "active", label: "Active", count: activeOrders.length },
    { id: "pickup", label: "Pickup", count: activeOrders.filter((o) => isOrderMatchingTab(o, "pickup")).length },
    { id: "processing", label: "Processing", count: activeOrders.filter((o) => isOrderMatchingTab(o, "processing")).length },
    { id: "ready", label: "Ready", count: activeOrders.filter((o) => isOrderMatchingTab(o, "ready")).length },
    { id: "dispatch", label: "Dispatch", count: activeOrders.filter((o) => isOrderMatchingTab(o, "dispatch")).length },
    { id: "out_for_delivery", label: "Out for Delivery", count: activeOrders.filter((o) => isOrderMatchingTab(o, "out_for_delivery")).length },
    { id: "delivered", label: "Delivered", count: orders.filter((o) => isOrderMatchingTab(o, "delivered")).length },
    { id: "cancelled", label: "Cancelled", count: orders.filter((o) => isOrderMatchingTab(o, "cancelled")).length },
    { id: "refunded", label: "Refunded", count: orders.filter((o) => isOrderMatchingTab(o, "refunded")).length },
  ], [activeOrders, orders]);

  const displayedOrders = useMemo(() => {
    if (activeFilterTab === "active") {
      return activeOrders;
    }
    if (activeFilterTab === "all") {
      return orders;
    }
    return orders.filter((order) => isOrderMatchingTab(order, activeFilterTab));
  }, [activeOrders, orders, activeFilterTab]);

  return (
    <div className="min-h-screen bg-white pb-28 text-black">
      {/* Top Header: Pure White Luxury Brand Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200 px-4 pt-3 pb-2.5 transition-all">
        <div className="flex items-center justify-between gap-2.5">
          {/* Store Logo & Details */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Link
              to={partnerRoutes.shop}
              title="Shop Profile & Photos"
              className="relative shrink-0 active:scale-95 transition-transform"
            >
              <div className="size-11 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                {shopLogo ? (
                  <img
                    src={shopLogo}
                    alt={shopName}
                    className="size-full object-cover"
                    onError={() => setShopLogo("")}
                  />
                ) : (
                  <Store className="size-5 text-blue-600" />
                )}
              </div>
              {/* Online status steady Royal Blue dot on avatar */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white ${
                  isOnline ? "bg-blue-600" : "bg-zinc-400"
                }`}
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-black">
                  QuickPress
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.2 text-[9px] font-black text-blue-700 border border-blue-200 shrink-0">
                  <CheckCircle2 className="size-2.5 fill-blue-600 text-white" />
                  <span>Verified</span>
                </span>
              </div>
              <h1 className="truncate text-base font-black tracking-tight text-black leading-tight">
                {shopName}
              </h1>
              <p className="flex items-center gap-1 text-[11px] font-bold text-zinc-700 truncate mt-0.5">
                <MapPin className="size-3 text-blue-600 shrink-0" />
                <span>{locationName}</span>
              </p>
            </div>
          </div>

          {/* Right Action Controls: Online Switcher, Language & Notifications */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowStatusConfirmModal(true)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                isOnline
                  ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-700"
                  : "bg-white hover:bg-zinc-50 text-black border border-zinc-300"
              }`}
            >
              <span
                className={`size-2 rounded-full shrink-0 ${
                  isOnline ? "bg-white" : "bg-zinc-400"
                }`}
              />
              <span>{isOnline ? "Online" : "Offline"}</span>
              <ChevronRight className="size-3 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={openLanguageModal}
              title="Change Language"
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-blue-500 hover:text-blue-600 shadow-none active:scale-95 transition-all cursor-pointer"
            >
              <Globe className="size-4 text-blue-600" />
            </button>

            <Link
              to={partnerRoutes.notifications}
              title="Notifications"
              className="relative flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-blue-500 hover:text-blue-600 shadow-none active:scale-95 transition-all"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </Link>

            <Link
              to={partnerRoutes.settings}
              title="Settings"
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-blue-500 hover:text-blue-600 shadow-none active:scale-95 transition-all"
            >
              <Menu className="size-4" />
            </Link>
          </div>
        </div>

        {/* Canonical Order Status Filter Pills Bar (Pure White + Royal Blue elements) */}
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white border border-blue-600 shadow-xs"
                    : "border border-zinc-200 bg-white text-black hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-black"
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
      <div className="space-y-4 px-4 pt-3 bg-white">
        {/* Battery Optimization & Background Alert Banner (Native Android only) */}
        {showBatteryNotice && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white text-xs font-black shadow-xs">
                ⚡
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-amber-950 truncate">Keep Orders Ringing 24/7</p>
                <p className="text-[11px] font-medium text-amber-800 leading-tight">Allow background alerts when phone is locked or screen is off</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.permissions })}
                className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer hover:bg-amber-700"
              >
                Configure
              </button>
              <button
                type="button"
                onClick={() => setShowBatteryNotice(false)}
                className="size-7 flex items-center justify-center text-amber-600/70 hover:text-amber-950 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Today's Overview Card: Flat Crisp Pure White Card with Pure Black Text */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-black">
                  Today's Overview
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-3xl font-black tracking-tight text-black">
                    ₹{todayEarnings.toLocaleString("en-IN")}
                  </h3>
                  <span className="text-xs font-bold text-black">Total Sales</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-black border border-zinc-200 shadow-xs">
                  {todayOrdersCount} Total Orders
                </span>
              </div>
            </div>

            {/* Order Flow Progress: Flat 4-Column Divided Grid with Pure Black Text */}
            <div className="mt-4 grid grid-cols-4 rounded-xl border border-zinc-200 bg-zinc-50/60 divide-x divide-zinc-200 overflow-hidden text-center">
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">New</p>
                <p className="mt-0.5 text-lg font-black text-black">{counts.new || 0}</p>
              </div>
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">Accepted</p>
                <p className="mt-0.5 text-lg font-black text-black">
                  {(counts.accepted || 0) + (counts.pickup_pending || 0)}
                </p>
              </div>
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">In Wash</p>
                <p className="mt-0.5 text-lg font-black text-black">
                  {(counts.washing || 0) + (counts.dry_cleaning || 0) + (counts.ironing || 0)}
                </p>
              </div>
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">Ready</p>
                <p className="mt-0.5 text-lg font-black text-black">{counts.ready || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Queue according to selected filter */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black tracking-tight text-black">
              {activeFilterTab === "active" || activeFilterTab === "all" ? (
                <>Active Orders Queue ({displayedOrders.length})</>
              ) : (
                <>Active Orders · {activeFilterTab.toUpperCase()} ({displayedOrders.length})</>
              )}
            </h2>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="text-xs font-black text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all orders <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="mt-2.5 space-y-3">
            {displayedOrders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs space-y-3">
                <div className={`mx-auto size-12 flex items-center justify-center rounded-xl ${
                  isOnline
                    ? "bg-blue-50 border border-blue-200 text-blue-600"
                    : "bg-zinc-100 border border-zinc-200 text-zinc-500"
                }`}>
                  {isOnline ? <Sparkles className="size-5 text-blue-600" /> : <PowerOff className="size-5 text-zinc-500" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-black">
                    {isOnline
                      ? (activeFilterTab === "active" || activeFilterTab === "all"
                          ? "Store is Online & Listening"
                          : `No orders in "${activeFilterTab}" status`)
                      : "Store is Offline (स्टोर ऑफलाइन है)"}
                  </h4>
                  <p className="mt-1 text-xs font-semibold text-zinc-600 max-w-xs mx-auto">
                    {isOnline
                      ? `New customer laundry pickups in ${locationName} will alert here with chime sound automatically.`
                      : "You will not receive new customer orders while offline. Turn on your store to start receiving orders."}
                  </p>
                  {!isOnline && (
                    <button
                      type="button"
                      onClick={() => setShowStatusConfirmModal(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Radio className="size-3.5" />
                      <span>Switch Store Online</span>
                    </button>
                  )}
                </div>
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
                    className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-blue-400 cursor-pointer space-y-3.5"
                  >
                    {/* 1. TOP BAR: Order Code + Services + SLA Timer + Print Tag + Status Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-lg bg-black px-2.5 py-1 text-xs font-black text-white tracking-wide shadow-xs">
                          #{order.code}
                        </span>
                        {isNew && (
                          <OrderSlaAcceptanceTimer
                            placedAt={(order as any).placedAt || (order as any).placedAtRaw}
                            deadline={(order as any).partnerAcceptDeadline}
                            isNew={isNew}
                          />
                        )}
                        <PrintBagTagButton order={order} />
                        {order.services && order.services.length > 0 ? (
                          <span className="truncate rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                            {order.services.join(", ")}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                            isNew
                              ? "bg-amber-50 text-black border border-amber-300 font-bold"
                              : order.stage === "ready"
                                ? "bg-blue-50 text-black border border-blue-200 font-bold"
                                : "bg-zinc-100 text-black border border-zinc-200 font-bold"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isNew
                                ? "bg-amber-500 animate-ping"
                                : "bg-blue-600"
                            }`}
                          />
                          {STAGE_LABEL[order.stage] || order.stage}
                        </span>
                      </div>
                    </div>

                    {/* 2. CUSTOMER INFO & DIRECT 1-TAP CONTACT ACTIONS */}
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50/70 p-3 border border-zinc-200 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs shadow-xs">
                          {getCustomerInitials(order.customerName)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-black truncate">
                            {getDisplayCustomerName(order.customerName)}
                          </h4>
                          <p className="text-[11px] font-bold text-black flex items-center gap-1.5">
                            <span className="text-black font-black">
                              ★ {order.customerRating && order.customerRating > 0 ? order.customerRating.toFixed(1) : "5.0"}
                            </span>
                            <span>•</span>
                            <span>{order.customerOrders ? `${order.customerOrders} orders` : "Verified Customer"}</span>
                          </p>
                        </div>
                      </div>

                      {/* 1-Tap Call & WhatsApp to Customer / Captain */}
                      <DirectContactActions
                        customerName={order.customerName}
                        customerPhone={order.customerPhone}
                        orderCode={order.code}
                        riderName={order.assignedRider?.name || (order as any).rider?.name}
                        riderPhone={order.assignedRider?.phone || (order as any).rider?.phone}
                      />
                    </div>

                    {/* 3. VISUAL GARMENT SUMMARY CHIPS (👕 3 Shirts | 👖 2 Trousers | 🛏️ 1 Bedsheet) */}
                    <div className="rounded-xl bg-white p-2.5 border border-zinc-200 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-black tracking-wider">
                        <span>Garments Summary</span>
                        <span className="text-zinc-500 font-bold">{order.itemCount} pieces</span>
                      </div>
                      <GarmentSummaryChips
                        items={order.items}
                        itemCount={order.itemCount}
                        services={order.services}
                      />
                    </div>

                    {/* 3. ORDER DETAIL (Key Specs 3-column Grid) */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleItemsExpanded(order.id)}
                        className={`rounded-xl p-2 border transition-all cursor-pointer text-center flex flex-col items-center justify-center group ${
                          expandedItemsOrderIds[order.id]
                            ? "bg-blue-50 border-blue-300 text-black shadow-xs"
                            : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-black"
                        }`}
                        title="Click to view items & pricing"
                      >
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 group-hover:text-blue-700">
                          <ReceiptText className="size-3 text-zinc-500 group-hover:text-blue-600" />
                          <span>Items</span>
                          <ChevronDown
                            className={`size-3 transition-transform duration-200 ${
                              expandedItemsOrderIds[order.id] ? "rotate-180 text-blue-600" : ""
                            }`}
                          />
                        </div>
                        <p className="text-xs font-black mt-0.5 group-hover:text-blue-700 flex items-center gap-1">
                          <span className="text-black font-black">{order.itemCount} items</span>
                          <span className="text-[10px] font-bold text-blue-600 underline decoration-dotted">View</span>
                        </p>
                      </button>
                      <div className="rounded-xl bg-white p-2 border border-zinc-200">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Order Amount</p>
                        <p className="text-xs font-black text-blue-600 mt-0.5">₹{order.amount}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-zinc-200">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Schedule</p>
                        <p className="text-xs font-black text-black mt-0.5 truncate">
                          {order.pickupTime || order.deliveryEta || "15-30 mins"}
                        </p>
                      </div>
                    </div>

                    {/* EXPANDABLE ITEMS WITH PRICING BREAKDOWN */}
                    {expandedItemsOrderIds[order.id] && (
                      <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 text-[11px] font-black uppercase tracking-wider text-black">
                          <span className="flex items-center gap-1.5 text-black">
                            <ReceiptText className="size-3.5 text-blue-600" />
                            Items & Pricing Breakdown
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {(!order.items || order.items.length === 0) ? (
                          <div className="py-2.5 text-center text-xs text-black font-medium bg-white rounded-lg border border-zinc-200">
                            Standard Laundry Service · Total: ₹{order.amount}
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                            {order.items.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs shadow-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-black text-blue-700 border border-blue-200">
                                    {item.qty || 1}×
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-black truncate text-black">{item.name}</p>
                                    {item.service && (
                                      <p className="text-[10px] text-zinc-500 capitalize">{item.service}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 font-black text-black pl-2">
                                  <span>₹{(item.qty || 1) * (item.price || 0)}</span>
                                  {item.price ? (
                                    <span className="block text-[9px] font-bold text-zinc-500">₹{item.price}/ea</span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs font-black text-black">
                          <span className="text-zinc-600 uppercase text-[10px] tracking-wider">Total Bill</span>
                          <span className="text-sm font-black text-blue-600">₹{order.amount}</span>
                        </div>
                      </div>
                    )}

                    {/* Pickup Address preview if available */}
                    {order.pickupAddress ? (
                      <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-zinc-700">
                        <MapPin className="size-3.5 shrink-0 text-blue-600" />
                        <span className="truncate">{order.pickupAddress}</span>
                      </div>
                    ) : null}

                    {/* 4. TIMELINE (Horizontal Stepper) */}
                    <div className="rounded-xl bg-zinc-50/60 p-3 border border-zinc-200">
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
                                    idx <= stepIdx ? "bg-blue-600" : "bg-zinc-200"
                                  }`}
                                />
                              )}
                              <div
                                className={`relative z-10 flex size-5 items-center justify-center rounded-full text-[10px] font-black transition-all ${
                                  isCurrent
                                    ? "bg-blue-600 text-white ring-2 ring-blue-600/20 shadow-xs"
                                    : isDone
                                      ? "bg-blue-600 text-white"
                                      : "bg-zinc-200 text-zinc-500"
                                }`}
                              >
                                {isDone ? "✓" : isCurrent ? "✓" : idx + 1}
                              </div>
                              <span
                                className={`mt-1.5 text-[9px] tracking-tight ${
                                  isCurrent
                                    ? "text-blue-600 font-black"
                                    : isDone
                                      ? "text-black font-bold"
                                      : "text-zinc-500 font-semibold"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4.5 INSTANT 4-DIGIT HANDOVER OTP INPUT (WHEN CLOTHES ARE READY) */}
                    {order.stage === "ready" && (
                      <CardHandoverOtpInput
                        orderId={order.id}
                        orderCode={order.code}
                        onVerifyOtp={verifyDispatchOtp}
                      />
                    )}

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
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 py-2.5 sm:py-3 px-3 text-xs font-bold text-black active:scale-95 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText className="size-3.5 text-zinc-500" />
                        <span>Order Details</span>
                      </button>

                      {isNew ? (
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(order, "reject")}
                            className="flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 py-2.5 sm:py-3 px-3.5 text-xs font-bold text-rose-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                          >
                            <X className="size-3.5 text-rose-600" />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(order, "accept")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 hover:bg-blue-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
                          >
                            <Check className="size-3.5" />
                            <span>Accept</span>
                          </button>
                        </div>
                      ) : order.stage === "accepted" || order.stage === "pickup_pending" ? (
                        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 py-2.5 sm:py-3 px-3 text-xs font-bold text-blue-800 shadow-xs">
                          <Bike className="size-3.5 text-blue-700" />
                          <span>Clothes En Route</span>
                        </div>
                      ) : order.stage === "at_partner" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(order, "start_washing")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 hover:bg-blue-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
                        >
                          <span>Start Cleaning 🧺</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      ) : order.stage === "washing" || order.stage === "dry_cleaning" || order.stage === "ironing" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(order, "mark_ready")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 hover:bg-blue-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
                        >
                          <span>Mark Ready ✓</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      ) : order.stage === "ready" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedManageOrder(order);
                            setHubDispatchOtp("");
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 hover:bg-blue-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
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
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 hover:bg-blue-700 py-2.5 sm:py-3 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
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
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-black px-2 py-0.5 text-xs font-black text-white">
                    #{selectedManageOrder.code}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700 border border-blue-200">
                    {STAGE_LABEL[selectedManageOrder.stage] || selectedManageOrder.stage}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-black text-black">
                  {selectedManageOrder.customerName}
                </h3>
                <p className="text-xs text-zinc-600 font-bold">
                  {selectedManageOrder.customerOrders ? `${selectedManageOrder.customerOrders} orders placed · ` : ""}Verified Customer
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedManageOrder(null)}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-black active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Booked Items Summary */}
            <div className="mt-4 rounded-xl bg-zinc-50 p-3.5 border border-zinc-200">
              <p className="text-[11px] font-black uppercase tracking-wider text-black">
                Booked Items ({selectedManageOrder.items.length})
              </p>
              <div className="mt-2 divide-y divide-zinc-200 text-xs font-bold text-black">
                {selectedManageOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                    <span>{item.qty}× {item.name}</span>
                    <span>₹{item.qty * item.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex justify-between border-t border-zinc-300 pt-2 text-xs font-black text-black">
                <span>Total Amount:</span>
                <span className="text-blue-600">₹{selectedManageOrder.amount}</span>
              </div>
            </div>

            {/* Dispatch OTP Verification Card for Handover to Captain */}
            {(selectedManageOrder.stage === "ready" || selectedManageOrder.stage === "dispatch_otp_pending" || selectedManageOrder.status === "ready_for_delivery") && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-black block">
                        Captain Handover Verification
                      </span>
                      <span className="text-[10px] font-bold text-blue-700">
                        कैप्टन को कपड़े सौंपने हेतु ओटीपी दर्ज करें
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[9px] font-black text-blue-700">
                    Mandatory OTP
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold text-zinc-800 leading-relaxed">
                  Ask the arriving Delivery Captain for their <strong className="text-blue-600 font-black">4-digit Dispatch OTP</strong> shown in their app to handover clean laundry:
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
                    className="w-32 rounded-xl border border-blue-300 bg-white px-3 py-2 text-center font-mono text-lg font-black tracking-widest text-black placeholder:text-zinc-400 placeholder:text-xs placeholder:font-sans focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  />
                  <button
                    type="button"
                    disabled={hubDispatchOtp.trim().length !== 4 || isVerifyingHubDispatch}
                    onClick={handleHubVerifyDispatch}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-400 px-3.5 py-2.5 text-xs font-black text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {isVerifyingHubDispatch ? (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="size-4 stroke-[2.5]" />
                    )}
                    <span>Verify & Handover ✓</span>
                  </button>
                </div>

                <p className="mt-2 text-center text-[10px] font-medium text-zinc-600">
                  🔒 Handover is locked. Order cannot be released without entering the Captain's Dispatch OTP.
                </p>
              </div>
            )}

            {/* Real Order Timeline */}
            <div className="mt-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200">
              <p className="text-[11px] font-black uppercase tracking-wider text-black mb-3">
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
                    className="flex-1 rounded-xl border border-red-200 py-3 text-xs font-bold text-red-600 active:scale-95 cursor-pointer"
                  >
                    Reject Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAction(selectedManageOrder, "accept");
                      setSelectedManageOrder(null);
                    }}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white shadow-xs active:scale-95 cursor-pointer"
                  >
                    Accept Order ✓
                  </button>
                </div>
              ) : selectedManageOrder.stage === "accepted" || selectedManageOrder.stage === "pickup_pending" ? (
                <div className="w-full rounded-xl bg-blue-50/80 border border-blue-200 p-3 text-center text-xs font-bold text-blue-800 flex items-center justify-center gap-2">
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
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white shadow-xs active:scale-95 cursor-pointer"
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
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  View Full Order Details →
                </button>
              )}

              {/* Call Customer & Call Captain Quick Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedManageOrder.customerPhone && !selectedManageOrder.customerPhone.includes("••")) {
                      window.open(`tel:${selectedManageOrder.customerPhone.replace(/\s/g, "")}`);
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 py-2.5 text-xs font-bold text-black active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="size-3.5 text-blue-600" />
                  <span>Call Customer</span>
                </button>

                {selectedManageOrder.assignedRider?.phone || selectedManageOrder.rider?.phone || (selectedManageOrder as any).riderPhone ? (
                  <a
                    href={`tel:${String(selectedManageOrder.assignedRider?.phone || selectedManageOrder.rider?.phone || (selectedManageOrder as any).riderPhone).replace(/\s/g, "")}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 py-2.5 text-xs font-bold text-black active:scale-95 cursor-pointer"
                  >
                    <Bike className="size-3.5 text-blue-600" />
                    <span>Call Captain</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    title="Captain not assigned yet for this order"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-xs font-bold text-zinc-400 opacity-60 cursor-not-allowed"
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

      {/* Store Online / Offline Confirmation Popup Modal */}
      <StoreStatusConfirmModal
        isOpen={showStatusConfirmModal}
        onClose={() => setShowStatusConfirmModal(false)}
        currentOnline={isOnline}
        onConfirm={handleConfirmStatusChange}
        isLoading={isUpdatingStatus}
      />

      {/* Action Sheets and Overlays */}
      {sheetNode}
      {overlay}
    </div>
  );
}
