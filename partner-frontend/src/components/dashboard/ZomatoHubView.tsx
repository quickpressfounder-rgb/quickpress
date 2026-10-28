import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  BarChart2,
  Bell,
  Bike,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  FileCheck2,
  FileText,
  Gift,
  Headphones,
  HelpCircle,
  History,
  Layers,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Phone,
  PhoneCall,
  PowerOff,
  QrCode,
  Radio,
  Receipt,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sliders,
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
import { fetchDashboardSummary, getCachedDashboardSummary } from "../../api/partner/partner-dashboard-api";
import { fetchEarnings } from "../../api/partner/partner-earnings-api";
import { fetchPartnerProfile, fetchPartnerUnreadCount, getCachedPartnerProfile, getCleanPartnerName } from "../../api/partner/partner-profile-api";
import { subscribePartnerNotifications } from "../../lib/partner-socket";
import { usePartnerContext } from "../../context/PartnerContext";
import { usePartnerOrders } from "../../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../../hooks/use-order-action-handler";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { STAGE_LABEL, formatOrderPlacedTime } from "../../data/partner-orders-mock";
import { OrderTimeline } from "../orders/OrderTimeline";
import {
  GarmentSummaryChips,
  OrderSlaAcceptanceTimer,
  DirectContactActions,
  CardHandoverOtpInput,
  PrintBagTagButton,
} from "../orders/OrderQuickTools";
import { StoreStatusConfirmModal } from "./StoreStatusConfirmModal";
import { DailyAnalyticsSection } from "./DashboardInsights";
import { ZomatoBottomNav } from "../layout/ZomatoBottomNav";

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
  const isPhone = /^[+\d\s\-()]+$/.test(trimmed) && digitsOnly.length >= 10;
  if (isPhone || (trimmed.toLowerCase().includes("customer") && digitsOnly.length >= 10)) {
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

type ZomatoKitchenStageTab = "preparing" | "ready" | "out_for_delivery" | "scheduled" | "completed";

export function ZomatoHubView() {
  const navigate = useNavigate();
  const { session, isOnline, toggleOnline, signOut } = usePartnerContext();
  const cachedProfile = useMemo(getCachedPartnerProfile, []);
  const cachedSummary = useMemo(getCachedDashboardSummary, []);

  const { orders, refresh: refreshOrders, verifyDispatchOtp } = usePartnerOrders();
  const { handleAction, sheetNode, overlay } = useOrderActionHandler();

  // Mode state: "orders" (Live Kitchen Order Station) vs "hub" (Business Hub & Analytics)
  const [activeMode, setActiveMode] = useState<"orders" | "hub">(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const param = urlParams.get("mode");
      if (param === "hub" || param === "orders") return param;
      const stored = window.localStorage.getItem("qp_partner_mode");
      if (stored === "hub" || stored === "orders") return stored;
    }
    return "orders";
  });

  const [activeStageTab, setActiveStageTab] = useState<ZomatoKitchenStageTab>("preparing");
  const [showExploreMoreDrawer, setShowExploreMoreDrawer] = useState(false);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isRushHour, setIsRushHour] = useState(false);

  const [shopName, setShopName] = useState(() => {
    const cached = getCachedPartnerProfile();
    return getCleanPartnerName([
      cached?.businessName,
      cached?.ownerName,
      cached?.name,
      session?.businessName,
      session?.ownerName,
      (session as any)?.account?.ownerName,
      (session as any)?.account?.name,
    ], "QuickPress Partner");
  });

  const [shopLogo, setShopLogo] = useState<string>(() => {
    const cached = getCachedPartnerProfile();
    return (
      cached?.logo ||
      cached?.logoUrl ||
      cached?.storeImage ||
      cached?.image ||
      (session as any)?.storeImage ||
      (session as any)?.logoUrl ||
      (session as any)?.logo ||
      ""
    );
  });

  const [locationName, setLocationName] = useState(() =>
    cachedProfile?.city || session?.city || "Kasganj"
  );
  const [todayEarnings, setTodayEarnings] = useState(() => cachedSummary?.todayEarnings ?? 0);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [selectedManageOrder, setSelectedManageOrder] = useState<ManagedOrder | null>(null);
  const [hubDispatchOtp, setHubDispatchOtp] = useState("");
  const [isVerifyingHubDispatch, setIsVerifyingHubDispatch] = useState(false);
  const [expandedItemsOrderIds, setExpandedItemsOrderIds] = useState<Record<string, boolean>>({});
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [overviewTimeframe, setOverviewTimeframe] = useState<"today" | "yesterday" | "week" | "month" | "all">("today");

  // Mode switch handler with micro toast
  const handleSwitchMode = (nextMode: "orders" | "hub") => {
    setActiveMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qp_partner_mode", nextMode);
    }
    if (nextMode === "hub") {
      toast.info("Switching to Business Hub...", { duration: 1200 });
    } else {
      toast.info("Switching to Orders...", { duration: 1200 });
    }
  };

  // Sync profile details
  useEffect(() => {
    const cleanSessionName = getCleanPartnerName([
      session?.businessName,
      session?.ownerName,
      (session as any)?.account?.ownerName,
      (session as any)?.account?.name,
    ], "");
    if (cleanSessionName) setShopName(cleanSessionName);
    if (session?.city) setLocationName(session.city);
  }, [session?.businessName, session?.ownerName, session?.city]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchPartnerProfile().catch(() => null),
      fetchDashboardSummary().catch(() => null),
      fetchEarnings().catch(() => null),
    ]).then(([profile, summary, earnings]) => {
      if (!alive) return;
      if (profile) {
        const fresh = getCleanPartnerName([
          profile.businessName,
          profile.ownerName,
          profile.name,
          profile.storeName,
        ], "");
        if (fresh) setShopName(fresh);
        if (profile.city) setLocationName(profile.city);
        const foundLogo = profile.storeImage || profile.logoUrl || profile.logo || profile.image;
        if (foundLogo) setShopLogo(foundLogo);
      }
      if (summary) setTodayEarnings(summary.todayEarnings);
      if (earnings) setEarningsData(earnings);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Notifications
  useEffect(() => {
    let mounted = true;
    void fetchPartnerUnreadCount().then((cnt) => {
      if (mounted) setUnreadCount(cnt);
    });
    const unsub = subscribePartnerNotifications(() => {
      if (mounted) setUnreadCount((prev) => prev + 1);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Toggle online/offline
  const handleConfirmStatusChange = () => {
    const nextState = !isOnline;
    setShowStatusConfirmModal(false);
    toggleOnline();
    toast.success(
      nextState
        ? "⚡ Store is now ONLINE! Ready to receive laundry orders."
        : "Store is now OFFLINE. New customer orders are paused."
    );
  };

  // Calculate 100% Real Interactive Overview Metrics based on selected timeframe
  const overviewMetrics = useMemo(() => {
    const now = new Date();
    const getLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const todayStr = getLocalDateStr(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    const parseOrderDate = (o: any): string => {
      const raw = o.placedAt || o.createdAt || (o as any).placedAtRaw || "";
      if (!raw) return "";
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) return getLocalDateStr(d);
      } catch {}
      return String(raw).slice(0, 10);
    };

    const timeframeOrders = orders.filter((o) => {
      const dateStr = parseOrderDate(o);
      if (overviewTimeframe === "today") return Boolean(dateStr && dateStr === todayStr);
      if (overviewTimeframe === "yesterday") return Boolean(dateStr && dateStr === yesterdayStr);
      if (overviewTimeframe === "week") {
        const t = new Date(o.placedAt || (o as any).createdAt || "").getTime();
        return !isNaN(t) && (now.getTime() - t) <= 7 * 86400000;
      }
      if (overviewTimeframe === "month") {
        const currentMonthStr = todayStr.slice(0, 7);
        return Boolean(dateStr && dateStr.startsWith(currentMonthStr));
      }
      return true; // all
    });

    const deliveredOrders = timeframeOrders.filter(
      (o) => o.status === "delivered" || (o as any).stage === "completed"
    );

    const sales = deliveredOrders.reduce(
      (sum, o) => sum + (o.amount || (o as any).totalPrice || (o as any).totalAmount || 0),
      0
    );

    const newOrders = timeframeOrders.filter(
      (o) => o.status === "new" || (o as any).stage === "new" || o.status === "placed" || o.status === "pending"
    ).length;
    const accepted = timeframeOrders.filter(
      (o) => o.status === "accepted" || (o as any).stage === "accepted" || (o as any).stage === "pickup_pending" || o.status === "at_partner"
    ).length;
    const inWash = timeframeOrders.filter((o) =>
      ["washing", "dry_cleaning", "ironing", "processing"].includes(o.status as string) ||
      ["washing", "dry_cleaning", "ironing"].includes((o as any).stage as string)
    ).length;
    const ready = timeframeOrders.filter(
      (o) => o.status === "ready" || (o as any).stage === "ready" || o.status === "ready_for_delivery"
    ).length;

    let title = "TODAY'S OVERVIEW";
    if (overviewTimeframe === "yesterday") title = "YESTERDAY'S OVERVIEW";
    if (overviewTimeframe === "week") title = "THIS WEEK'S OVERVIEW";
    if (overviewTimeframe === "month") title = "THIS MONTH'S OVERVIEW";
    if (overviewTimeframe === "all") title = "ALL-TIME OVERVIEW";

    return {
      title,
      sales: overviewTimeframe === "today" && todayEarnings !== undefined && orders.length === 0 ? todayEarnings : sales,
      totalOrders: timeframeOrders.length,
      newOrders,
      accepted,
      inWash,
      ready,
    };
  }, [orders, overviewTimeframe, todayEarnings]);

  // Stage categorization matching Zomato Restaurant Partner App
  const stageCounts = useMemo(() => {
    let preparing = 0;
    let ready = 0;
    let outForDelivery = 0;
    let scheduled = 0;
    let completed = 0;

    for (const o of orders) {
      const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
      const isSched = Boolean((o as any).isScheduled || o.pickupTime?.toLowerCase().includes("tomorrow"));

      if (isSched) {
        scheduled++;
      } else if (
        [
          "new", "placed", "pending", "pending_partner_acceptance",
          "accepted", "partner_accepted", "pickup_pending",
          "pickup_driver_assigned", "pickup_rider_assigned", "pickup_rider_accepted",
          "picked", "picked_up", "in_transit_to_store", "at_partner", "store_received",
          "washing", "dry_cleaning", "ironing", "processing"
        ].includes(s)
      ) {
        preparing++;
      } else if (["ready", "ready_for_delivery", "dispatch_otp_pending"].includes(s)) {
        ready++;
      } else if (
        ["out_for_delivery", "delivery_assigned", "delivery_rider_assigned", "delivery_rider_accepted", "dispatch"].includes(s)
      ) {
        outForDelivery++;
      } else if (["delivered", "completed"].includes(s)) {
        completed++;
      }
    }

    return { preparing, ready, outForDelivery, scheduled, completed };
  }, [orders]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter(
      (o) => o.stage !== "completed" && o.stage !== "delivered" && o.stage !== "cancelled"
    ).length;
  }, [orders]);

  // Orders displayed according to current stage tab & search
  const displayedOrders = useMemo(() => {
    let list = orders.filter((o) => {
      const s = ((o.stage || (o as any).status || "") as string).toLowerCase();
      const isSched = Boolean((o as any).isScheduled || o.pickupTime?.toLowerCase().includes("tomorrow"));

      if (activeStageTab === "scheduled") return isSched;
      if (isSched) return false;

      if (activeStageTab === "preparing") {
        return [
          "new", "placed", "pending", "pending_partner_acceptance",
          "accepted", "partner_accepted", "pickup_pending",
          "pickup_driver_assigned", "pickup_rider_assigned", "pickup_rider_accepted",
          "picked", "picked_up", "in_transit_to_store", "at_partner", "store_received",
          "washing", "dry_cleaning", "ironing", "processing"
        ].includes(s);
      }
      if (activeStageTab === "ready") {
        return ["ready", "ready_for_delivery", "dispatch_otp_pending"].includes(s);
      }
      if (activeStageTab === "out_for_delivery") {
        return ["out_for_delivery", "delivery_assigned", "delivery_rider_assigned", "delivery_rider_accepted", "dispatch"].includes(s);
      }
      if (activeStageTab === "completed") {
        return ["delivered", "completed"].includes(s);
      }
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.code?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.placedAt || 0).getTime();
      const timeB = new Date(b.placedAt || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return (a.placedMinutesAgo ?? 0) - (b.placedMinutesAgo ?? 0);
    });
  }, [orders, activeStageTab, searchQuery]);

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

  const handleLogout = () => {
    signOut();
    void navigate({ to: partnerRoutes.auth });
  };

  return (
    <div className="min-h-screen bg-white pb-32 text-black select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Exact Pure Minimalist Zomato Header                        */}
      {/* ========================================================================= */}
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
                  <Store className="size-5 text-zinc-800" />
                )}
              </div>
              {/* Online status steady dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white ${
                  isOnline ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black tracking-tight text-black leading-tight">
                {shopName}
              </h1>
              <p className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 truncate mt-0.5">
                <span>{locationName} Locality</span>
                <ChevronRight className="size-3 text-zinc-400 shrink-0" />
              </p>
            </div>
          </div>

          {/* Right Action Controls: Online Pill, Search, Bag, Hamburger Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status Pill Button */}
            <button
              type="button"
              onClick={() => setShowStatusConfirmModal(true)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                isOnline
                  ? "bg-emerald-50 text-emerald-950 border border-emerald-500 font-black"
                  : "bg-white text-zinc-700 border border-zinc-300"
              }`}
            >
              <span
                className={`size-2 rounded-full shrink-0 ${
                  isOnline ? "bg-emerald-600" : "bg-zinc-400"
                }`}
              />
              <span>{isOnline ? "Online" : "Offline"}</span>
              <ChevronRight className="size-3 stroke-[2.5]" />
            </button>

            {/* Search Icon */}
            <button
              type="button"
              onClick={() => setShowSearchBar((prev) => !prev)}
              title="Search orders"
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-zinc-400 active:scale-95 transition-all cursor-pointer"
            >
              <Search className="size-4" />
            </button>

            {/* Notification / Bag Icon */}
            {activeMode === "hub" ? (
              <Link
                to={partnerRoutes.notifications}
                title="Notifications"
                className="relative flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-zinc-400 active:scale-95 transition-all"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleSwitchMode("hub")}
                title="Active Orders Bag"
                className="relative flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-zinc-400 active:scale-95 transition-all"
              >
                <ShoppingBag className="size-4" />
                {activeOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-black text-[9px] font-black text-white ring-2 ring-white">
                    {activeOrdersCount > 9 ? "9+" : activeOrdersCount}
                  </span>
                )}
              </button>
            )}

            {/* Hamburger Menu ☰ -> Opens Explore More Sheet */}
            <button
              type="button"
              onClick={() => setShowExploreMoreDrawer(true)}
              title="Explore More / Settings"
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-black hover:border-zinc-400 active:scale-95 transition-all cursor-pointer"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>

        {/* Optional Search Bar Input */}
        {showSearchBar && (
          <div className="mt-2.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 pl-9 pr-3 py-1.5 text-xs font-bold text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:bg-white"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs font-black text-zinc-500 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Canonical Zomato Stage Pills (Only in Orders Mode) */}
        {activeMode === "orders" && (
          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
            {[
              { id: "preparing" as const, label: "Preparing", count: stageCounts.preparing },
              { id: "ready" as const, label: "Ready", count: stageCounts.ready },
              { id: "out_for_delivery" as const, label: "Out for delivery", count: stageCounts.outForDelivery },
              { id: "scheduled" as const, label: "Scheduled", count: stageCounts.scheduled },
              { id: "completed" as const, label: "Completed", count: stageCounts.completed },
            ].map((tab) => {
              const isActive = activeStageTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStageTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-zinc-950 text-white font-black shadow-xs border border-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-black"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isActive ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. MODE 1: OPERATIONAL KITCHEN / ORDER QUEUE MODE                         */}
      {/* ========================================================================= */}
      {activeMode === "orders" && (
        <div className="space-y-4 px-4 pt-3 bg-white">
          {/* Header indicator */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black tracking-tight text-black capitalize">
              {activeStageTab.replace(/_/g, " ")} Orders ({displayedOrders.length})
            </h2>
            <button
              type="button"
              onClick={() => void refreshOrders()}
              className="text-xs font-bold text-zinc-500 hover:text-black flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Orders List / Empty State */}
          <div className="space-y-3">
            {displayedOrders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-xs space-y-4">
                <div
                  className={`mx-auto size-16 flex items-center justify-center rounded-2xl ${
                    isOnline
                      ? "bg-zinc-100 border border-zinc-200 text-zinc-700"
                      : "bg-zinc-100 border border-zinc-200 text-zinc-500"
                  }`}
                >
                  {isOnline ? (
                    <Store className="size-8 stroke-[1.5]" />
                  ) : (
                    <PowerOff className="size-8 stroke-[1.5]" />
                  )}
                </div>
                <div>
                  <h4 className="text-base font-black text-black">
                    {isOnline
                      ? activeStageTab === "preparing"
                        ? "Waiting for new orders"
                        : `No orders in "${activeStageTab.replace(/_/g, " ")}"`
                      : "Offline as directed by you"}
                  </h4>
                  <p className="mt-1.5 text-xs font-medium text-zinc-600 max-w-xs mx-auto leading-relaxed">
                    {isOnline
                      ? `New customer laundry orders in ${locationName} will appear here.`
                      : "You won't receive any customer orders while offline. Turn on your store when ready."}
                  </p>
                  {!isOnline && (
                    <button
                      type="button"
                      onClick={() => setShowStatusConfirmModal(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-xs active:scale-95 transition-all cursor-pointer"
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
                const placedInfo = formatOrderPlacedTime(
                  (order as any).placedAt || (order as any).placedAtRaw || order.placedAt
                );

                return (
                  <div
                    key={order.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, a, input")) return;
                      navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } });
                    }}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-400 cursor-pointer space-y-3.5"
                  >
                    {/* Top Bar: Order Code + Tag + Services + Status Pill */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-black text-zinc-950 tracking-wide shadow-2xs">
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
                          <span className="truncate rounded-lg bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-bold text-zinc-800">
                            {order.services.join(", ")}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-zinc-100 text-black border border-zinc-200">
                          <span
                            className={`size-1.5 rounded-full ${
                              isNew ? "bg-amber-500" : "bg-black"
                            }`}
                          />
                          {STAGE_LABEL[order.stage] || order.stage}
                        </span>
                      </div>
                    </div>

                    {/* Order Arrival Time Strip */}
                    <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                          <Clock className="size-3.5" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-zinc-500 text-[11px] uppercase tracking-wider">
                            Arrived:
                          </span>
                          <span className="font-black text-black text-[12px] tracking-tight">
                            {placedInfo.time}
                          </span>
                          <span className="text-zinc-400 text-[11px]">•</span>
                          <span className="font-semibold text-zinc-700 text-[11px]">
                            {placedInfo.date}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-black">
                        {placedInfo.relative}
                      </span>
                    </div>

                    {/* Customer Info & Direct Call Action */}
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50/70 p-3 border border-zinc-200 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white font-black text-xs shadow-xs">
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

                      <DirectContactActions
                        customerName={order.customerName}
                        customerPhone={order.customerPhone}
                        orderCode={order.code}
                        riderName={order.assignedRider?.name || (order as any).rider?.name}
                        riderPhone={order.assignedRider?.phone || (order as any).rider?.phone}
                      />
                    </div>

                    {/* Visual Garment Summary Chips */}
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

                    {/* Order Details & Pure Order Price (Strict: No Deductions Shown!) */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleItemsExpanded(order.id)}
                        className={`rounded-xl p-2 border transition-all cursor-pointer text-center flex flex-col items-center justify-center group ${
                          expandedItemsOrderIds[order.id]
                            ? "bg-zinc-100 border-zinc-400 text-black shadow-xs"
                            : "bg-white border-zinc-200 hover:bg-zinc-50 text-black"
                        }`}
                        title="Click to view item details"
                      >
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500">
                          <ReceiptText className="size-3 text-zinc-500" />
                          <span>Items</span>
                          <ChevronDown
                            className={`size-3 transition-transform duration-200 ${
                              expandedItemsOrderIds[order.id] ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                        <p className="text-xs font-black mt-0.5 text-black">
                          {order.itemCount} items
                        </p>
                      </button>

                      {/* Pure Order Price: Full Order Value (No commission / deductions) */}
                      <div className="rounded-xl bg-white p-2 border border-zinc-200">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Order Price</p>
                        <p className="text-xs font-black text-black mt-0.5">₹{order.amount}</p>
                      </div>

                      <div className="rounded-xl bg-white p-2 border border-zinc-200">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Schedule</p>
                        <p className="text-xs font-black text-black mt-0.5 truncate">
                          {order.pickupTime || order.deliveryEta || "15-30 mins"}
                        </p>
                      </div>
                    </div>

                    {/* Expandable Items Breakdown */}
                    {expandedItemsOrderIds[order.id] && (
                      <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 text-[11px] font-black uppercase tracking-wider text-black">
                          <span className="flex items-center gap-1.5 text-black">
                            <ReceiptText className="size-3.5" />
                            Items Breakdown
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {order.items?.length || 0} items
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
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-black text-black border border-zinc-200">
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
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs font-black text-black">
                          <span className="text-zinc-600 uppercase text-[10px] tracking-wider">Order Value</span>
                          <span className="text-sm font-black text-black">₹{order.amount}</span>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
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
                                    idx <= stepIdx ? "bg-black" : "bg-zinc-200"
                                  }`}
                                />
                              )}
                              <div
                                className={`relative z-10 flex size-5 items-center justify-center rounded-full text-[10px] font-black transition-all ${
                                  isCurrent
                                    ? "border-2 border-black bg-white text-black font-black"
                                    : isDone
                                      ? "bg-black text-white"
                                      : "bg-zinc-200 text-zinc-500"
                                }`}
                              >
                                {isDone ? "✓" : isCurrent ? "✓" : idx + 1}
                              </div>
                              <span
                                className={`mt-1.5 text-[9px] tracking-tight ${
                                  isCurrent
                                    ? "text-black font-black"
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

                    {/* Ready state OTP input */}
                    {order.stage === "ready" && (
                      <CardHandoverOtpInput
                        orderId={order.id}
                        orderCode={order.code}
                        onVerifyOtp={verifyDispatchOtp}
                      />
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 pt-1.5 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: partnerRoutes.orderDetails,
                            params: { orderId: order.id },
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 py-2.5 px-3 text-xs font-bold text-black active:scale-95 shadow-xs transition-all cursor-pointer"
                      >
                        <FileText className="size-3.5 text-zinc-500" />
                        <span>Order Details</span>
                      </button>

                      {isNew ? (
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(order, "reject")}
                            className="flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 py-2.5 px-3.5 text-xs font-bold text-rose-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                          >
                            <X className="size-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(order, "accept")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 py-2.5 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
                          >
                            <Check className="size-3.5" />
                            <span>Accept</span>
                          </button>
                        </div>
                      ) : order.stage === "accepted" || order.stage === "pickup_pending" ? (
                        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs font-bold text-zinc-800 shadow-xs">
                          <Bike className="size-3.5 text-zinc-700" />
                          <span>Clothes En Route</span>
                        </div>
                      ) : order.stage === "at_partner" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(order, "start_washing")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-black hover:bg-zinc-800 py-2.5 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
                        >
                          <span>Start Cleaning 🧺</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      ) : order.stage === "washing" || order.stage === "dry_cleaning" || order.stage === "ironing" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(order, "mark_ready")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
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
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-black text-white active:scale-95 shadow-xs transition-all cursor-pointer"
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
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 py-2.5 px-3 text-xs font-black text-zinc-950 active:scale-95 shadow-xs transition-all cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* 3. MODE 2: BUSINESS HUB & FINANCE MODE                                    */}
      {/* ========================================================================= */}
      {activeMode === "hub" && (
        <div className="space-y-4 px-4 pt-3 bg-white">
          {/* Today's Overview Card: Flat Crisp Pure White Card with Date Filter Pills */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-black">
                  {overviewMetrics.title}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-3xl font-black tracking-tight text-black">
                    ₹{overviewMetrics.sales.toLocaleString("en-IN")}
                  </h3>
                  <span className="text-xs font-bold text-black">Total Sales</span>
                </div>
              </div>

              {/* Date Filter Pills */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar">
                {(["today", "yesterday", "week", "month", "all"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setOverviewTimeframe(tf)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      overviewTimeframe === tf
                        ? "bg-black text-white shadow-xs"
                        : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    {tf === "today"
                      ? "Today"
                      : tf === "yesterday"
                      ? "Yesterday"
                      : tf === "week"
                      ? "Week"
                      : tf === "month"
                      ? "Month"
                      : "All Time"}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Orders Strip */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Orders during selected period
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-black border border-zinc-200 shadow-xs">
                {overviewMetrics.totalOrders} Total Orders
              </span>
            </div>

            {/* Order Flow Progress: Flat 4-Column Divided Grid */}
            <div className="mt-3 grid grid-cols-4 rounded-xl border border-zinc-200 bg-zinc-50/60 divide-x divide-zinc-200 overflow-hidden text-center">
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">NEW</p>
                <p className="mt-0.5 text-lg font-black text-black">{overviewMetrics.newOrders}</p>
              </div>
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">ACCEPTED</p>
                <p className="mt-0.5 text-lg font-black text-black">{overviewMetrics.accepted}</p>
              </div>
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">IN WASH</p>
                <p className="mt-0.5 text-lg font-black text-black">{overviewMetrics.inWash}</p>
              </div>
              <div className="py-2.5 px-1">
                <p className="text-[10px] font-black uppercase text-black tracking-wider">READY</p>
                <p className="mt-0.5 text-lg font-black text-black">{overviewMetrics.ready}</p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Grid (Clean 6 Tiles matching Zomato Hub) */}
          <div>
            <h3 className="px-1 text-xs font-black uppercase tracking-wider text-black mb-2">
              Business Operations
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.earnings })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
                  <DollarSign className="size-5" />
                </div>
                <p className="mt-1.5 text-[11px] font-black text-black">Weekly Payouts</p>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.services })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
                  <Package className="size-5" />
                </div>
                <p className="mt-1.5 text-[11px] font-black text-black">Services & Menu</p>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.reviews })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
                  <Star className="size-5" />
                </div>
                <p className="mt-1.5 text-[11px] font-black text-black">Reviews & Ratings</p>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.analytics })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
                  <TrendingUp className="size-5" />
                </div>
                <p className="mt-1.5 text-[11px] font-black text-black">Insights & Growth</p>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.settings })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
                  <Clock className="size-5" />
                </div>
                <p className="mt-1.5 text-[11px] font-black text-black">Store Timings</p>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.help })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
                  <Headphones className="size-5" />
                </div>
                <p className="mt-1.5 text-[11px] font-black text-black">Help & Support</p>
              </button>
            </div>
          </div>

          {/* Daily Analytics Performance */}
          <DailyAnalyticsSection orders={orders} earnings={earningsData} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXPLORE MORE DRAWER (Exact 1:1 Match of Video 01:09)                   */}
      {/* ========================================================================= */}
      {showExploreMoreDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            onClick={() => setShowExploreMoreDrawer(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-base font-black text-black tracking-tight">Explore More</h3>
              <button
                type="button"
                onClick={() => setShowExploreMoreDrawer(false)}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:text-black active:scale-95 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-12 rounded-2xl overflow-hidden border border-zinc-300 bg-white flex items-center justify-center shrink-0">
                  {shopLogo ? (
                    <img src={shopLogo} alt={shopName} className="size-full object-cover" />
                  ) : (
                    <Store className="size-6 text-zinc-800" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-black text-black truncate">{shopName}</h4>
                    <span className="rounded bg-black px-1.5 py-0.2 text-[9px] font-black text-white shrink-0">
                      OWNER
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-600 truncate mt-0.5">
                    {session?.ownerName || "Merchant Partner"} • {session?.phone || "+91 95484 21376"}
                  </p>
                </div>
              </div>

              <span
                className={`size-2.5 rounded-full shrink-0 ring-4 ring-white ${
                  isOnline ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
            </div>

            {/* 5 Organized Category Grids */}
            <div className="mt-5 space-y-5">
              {/* Category 1: Manage Outlet */}
              <div>
                <p className="px-1 text-xs font-black uppercase tracking-wider text-zinc-500">
                  Manage Outlet
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.shop });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Store className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Outlet info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.settings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Clock className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Timings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.settings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Phone className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Phones</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.settings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Users className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Staff</span>
                  </button>
                </div>
              </div>

              {/* Category 2: Settings */}
              <div>
                <p className="px-1 text-xs font-black uppercase tracking-wider text-zinc-500">
                  Settings
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.settings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Sliders className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.settings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Bell className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Alerts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.settings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <MapPin className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRushHour((prev) => !prev);
                      toast.success(!isRushHour ? "⚡ Rush Hour turned ON (+15 min buffer)" : "Rush Hour turned OFF");
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer ${
                      isRushHour ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-white border-zinc-200 text-black hover:bg-zinc-50"
                    }`}
                  >
                    <Zap className="size-5" />
                    <span className="mt-1.5 text-[10px] font-bold leading-tight">
                      {isRushHour ? "Rush ON" : "Rush Hour"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Category 3: Orders */}
              <div>
                <p className="px-1 text-xs font-black uppercase tracking-wider text-zinc-500">
                  Orders
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.orders });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <History className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.help });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <AlertTriangle className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Complaints</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.reviews });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Star className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Reviews</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.services });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Package className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Rate Card</span>
                  </button>
                </div>
              </div>

              {/* Category 4: Help */}
              <div>
                <p className="px-1 text-xs font-black uppercase tracking-wider text-zinc-500">
                  Help & Support
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <a
                    href="tel:18008890123"
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Headphones className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Helpline</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.help });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <HelpCircle className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Help Centre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.help });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <BookOpen className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Learning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.help });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <FileText className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Policies</span>
                  </button>
                </div>
              </div>

              {/* Category 5: Accounting */}
              <div>
                <p className="px-1 text-xs font-black uppercase tracking-wider text-zinc-500">
                  Accounting & Payouts
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.earnings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Wallet className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Passbook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.earnings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <Receipt className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Invoices</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.profile });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <FileCheck2 className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">KYC Docs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExploreMoreDrawer(false);
                      navigate({ to: partnerRoutes.earnings });
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-center shadow-xs active:scale-95 transition-transform cursor-pointer hover:bg-zinc-50"
                  >
                    <DollarSign className="size-5 text-black" />
                    <span className="mt-1.5 text-[10px] font-bold text-black leading-tight">Bank Details</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Red Log Out Button */}
            <div className="mt-6 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 py-3 text-xs font-black text-rose-600 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="size-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. QUICK MANAGE ORDER POPUP MODAL (When clicking order or Handover OTP)   */}
      {/* ========================================================================= */}
      {selectedManageOrder && (
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
                  <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-black text-zinc-950">
                    #{selectedManageOrder.code}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-black border border-zinc-200">
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
                <span>Order Total:</span>
                <span className="text-black font-black">₹{selectedManageOrder.amount}</span>
              </div>
            </div>

            {/* Dispatch OTP Verification Card for Handover to Captain */}
            {(selectedManageOrder.stage === "ready" ||
              selectedManageOrder.stage === "dispatch_otp_pending" ||
              selectedManageOrder.status === "ready_for_delivery") && (
              <div className="mt-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-xl bg-black text-white shadow-xs">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-black block">
                        Captain Handover Verification
                      </span>
                      <span className="text-[10px] font-bold text-zinc-600">
                        कैप्टन को कपड़े सौंपने हेतु ओटीपी दर्ज करें
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-zinc-200 border border-zinc-300 px-2.5 py-0.5 text-[9px] font-black text-black">
                    Mandatory OTP
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold text-zinc-800 leading-relaxed">
                  Ask the arriving Delivery Captain for their <strong className="text-black font-black">4-digit Dispatch OTP</strong> shown in their app:
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
                    className="w-32 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-center font-mono text-lg font-black tracking-widest text-black placeholder:text-zinc-400 placeholder:text-xs placeholder:font-sans focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 shadow-xs"
                  />
                  <button
                    type="button"
                    disabled={hubDispatchOtp.trim().length !== 4 || isVerifyingHubDispatch}
                    onClick={handleHubVerifyDispatch}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-200 disabled:text-zinc-400 px-3.5 py-2.5 text-xs font-black text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {isVerifyingHubDispatch ? (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="size-4 stroke-[2.5]" />
                    )}
                    <span>Verify & Handover ✓</span>
                  </button>
                </div>
              </div>
            )}

            {/* Real Order Timeline */}
            <div className="mt-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200">
              <p className="text-[11px] font-black uppercase tracking-wider text-black mb-3">
                Order Timeline
              </p>
              <OrderTimeline order={selectedManageOrder} />
            </div>

            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  navigate({
                    to: partnerRoutes.orderDetails,
                    params: { orderId: selectedManageOrder.id },
                  });
                  setSelectedManageOrder(null);
                }}
                className="w-full rounded-xl bg-black hover:bg-zinc-800 py-3 text-xs font-black text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                View Full Order Details →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online / Offline Confirmation Popup Modal */}
      <StoreStatusConfirmModal
        isOpen={showStatusConfirmModal}
        onClose={() => setShowStatusConfirmModal(false)}
        currentOnline={isOnline}
        onConfirm={handleConfirmStatusChange}
        isLoading={isUpdatingStatus}
      />

      {/* ========================================================================= */}
      {/* 6. ZOMATO FLOATING BOTTOM PILL NAVIGATION                                  */}
      {/* ========================================================================= */}
      <ZomatoBottomNav
        mode={activeMode}
        activeTab={activeMode === "orders" ? "orders" : "hub"}
        ordersCount={activeOrdersCount}
        onSwitchMode={handleSwitchMode}
      />

      {/* Action Sheets and Overlays */}
      {sheetNode}
      {overlay}
    </div>
  );
}
