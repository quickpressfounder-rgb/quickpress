import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Layers,
  Menu,
  Phone,
  Play,
  QrCode,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Volume2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PullToRefresh } from "../components/dashboard/PullToRefresh";
import { OrderCard } from "../components/orders/OrderCard";
import { OrderEmptyState } from "../components/orders/OrderEmptyState";
import { OrderListSkeleton } from "../components/orders/OrderSkeletons";
import { OrderTabs } from "../components/orders/OrderTabs";
import { OrderToolbar } from "../components/orders/OrderToolbar";
import {
  matchesFilter,
  matchesQuery,
  sortOrders,
  usePartnerOrders,
  type OrderFilterId,
  type OrderSortId,
} from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import {
  type OrderStage,
  type PartnerOrderFilterTab,
  isOrderMatchingTab,
} from "../data/partner-orders-mock";
import { partnerRoutes } from "../navigation/partner-routes";

export function OrdersScreen() {
  const navigate = useNavigate();
  const { orders, counts, isLoading, isOffline, refresh } = usePartnerOrders();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();

  const [filterTab, setFilterTab] = useState<PartnerOrderFilterTab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<OrderSortId>("latest");

  const STAGE_TABS: { id: PartnerOrderFilterTab; label: string; count: number }[] = useMemo(() => {
    return [
      { id: "all", label: "All", count: orders.length },
      { id: "active", label: "Active", count: orders.filter((o) => isOrderMatchingTab(o, "active")).length },
      { id: "pickup", label: "Pickup", count: orders.filter((o) => isOrderMatchingTab(o, "pickup")).length },
      { id: "processing", label: "Processing", count: orders.filter((o) => isOrderMatchingTab(o, "processing")).length },
      { id: "ready", label: "Ready", count: orders.filter((o) => isOrderMatchingTab(o, "ready")).length },
      { id: "dispatch", label: "Dispatch", count: orders.filter((o) => isOrderMatchingTab(o, "dispatch")).length },
      { id: "out_for_delivery", label: "Out for Delivery", count: orders.filter((o) => isOrderMatchingTab(o, "out_for_delivery")).length },
      { id: "delivered", label: "Delivered", count: orders.filter((o) => isOrderMatchingTab(o, "delivered")).length },
    ];
  }, [orders]);

  const visible = useMemo(() => {
    let list = orders.filter((order) => isOrderMatchingTab(order, filterTab));
    const filtered = list.filter((order) => matchesQuery(order, query));
    return sortOrders(filtered, sort);
  }, [orders, filterTab, query, sort]);

  const isSearching = query.trim().length > 0;

  const resetSearch = () => {
    setQuery("");
    setFilterTab("all");
  };

  return (
    <PartnerLayout
      activeTab="orders"
      title="Orders Queue"
      subtitle={`${orders.length} orders total in active database`}
      searchQuery={query}
      onSearchChange={setQuery}
    >
      {/* ========================================================================= */}
      {/* MOBILE COMPACT ORDERS QUEUE (< md)                                        */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F4F5F7] pb-28 text-zinc-900 md:hidden">
        {/* Sticky Filter Header with Search & Horizontal Stage Pills */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-card/95 backdrop-blur-2xl border-b border-slate-200/80 dark:border-border/60 px-4 pt-3 pb-2.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order ID, customer name or phone..."
              className="h-10 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-xs font-bold text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Horizontal Stage Badge Filter Carousel */}
          <div className="no-scrollbar -mx-4 mt-2.5 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            {STAGE_TABS.map((tab) => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all active:scale-95 ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300"
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

        {/* Orders Content View */}
        <div className="p-4 space-y-3">
          {isLoading ? (
            <OrderListSkeleton />
          ) : visible.length === 0 ? (
            <div className="my-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
              <ShoppingBag className="mx-auto size-10 text-zinc-300" />
              <h3 className="mt-3 text-sm font-black text-zinc-900">
                {isSearching ? "No matching orders found" : `No orders in "${filterTab}" queue`}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {isSearching ? "Try searching for a different code or customer name." : "Incoming orders will appear here automatically."}
              </p>
              <button
                type="button"
                onClick={isSearching ? resetSearch : () => void refresh()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-sm shadow-emerald-600/25 active:scale-95 transition-all"
              >
                <RotateCcw className="size-3" />
                <span>{isSearching ? "Reset filter" : "Refresh Orders"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onAction={handleAction}
                  busyAction={busy?.orderId === order.id ? busy.actionId : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP ORDERS VIEW (>= md)                                               */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        <PullToRefresh onRefresh={refresh}>
          {/* Canonical 8 Status Filter Tabs */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {STAGE_TABS.map((tab) => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all active:scale-95 ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300"
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

          {/* Orders Content View */}
          <div className="mt-6 pb-12">
            {isLoading ? (
              <OrderListSkeleton />
            ) : isOffline ? (
              <OrderEmptyState variant="offline" onAction={() => void refresh()} />
            ) : visible.length === 0 ? (
              <OrderEmptyState
                variant={isSearching ? "no-results" : "no-orders"}
                onAction={isSearching ? resetSearch : () => void refresh()}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={index}
                    onAction={handleAction}
                    busyAction={busy?.orderId === order.id ? busy.actionId : null}
                  />
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {sheetNode}
      {overlay}
      <Toaster />
    </PartnerLayout>
  );
}
