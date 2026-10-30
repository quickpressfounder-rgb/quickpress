import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Layers,
  LayoutGrid,
  LayoutList,
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

  const [filterTab, setFilterTab] = useState<PartnerOrderFilterTab>("active");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<OrderSortId>("latest");
  const [orderViewMode, setOrderViewMode] = useState<"cards" | "table">("cards");

  const STAGE_TABS: { id: PartnerOrderFilterTab; label: string; count: number }[] = useMemo(() => {
    return [
      { id: "active", label: "Active", count: orders.filter((o) => isOrderMatchingTab(o, "active")).length },
      { id: "pickup", label: "Pickup", count: orders.filter((o) => isOrderMatchingTab(o, "pickup")).length },
      { id: "processing", label: "Processing", count: orders.filter((o) => isOrderMatchingTab(o, "processing")).length },
      { id: "ready", label: "Ready", count: orders.filter((o) => isOrderMatchingTab(o, "ready")).length },
      { id: "dispatch", label: "Dispatch", count: orders.filter((o) => isOrderMatchingTab(o, "dispatch")).length },
      { id: "out_for_delivery", label: "Out for Delivery", count: orders.filter((o) => isOrderMatchingTab(o, "out_for_delivery")).length },
      { id: "delivered", label: "Delivered", count: orders.filter((o) => isOrderMatchingTab(o, "delivered")).length },
      { id: "cancelled", label: "Cancelled", count: orders.filter((o) => isOrderMatchingTab(o, "cancelled")).length },
      { id: "refunded", label: "Refunded", count: orders.filter((o) => isOrderMatchingTab(o, "refunded")).length },
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
    setFilterTab("active");
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
      <div className="min-h-screen bg-white pb-28 text-black md:hidden">
        {/* Sticky Filter Header with Search & Horizontal Stage Pills */}
        <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border/70 px-4 pt-3 pb-2.5 shadow-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order ID, customer name or phone..."
              className="h-10 w-full rounded-2xl border border-input bg-card pl-10 pr-4 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-brand-green text-white shadow-cta font-black"
                      : "border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isActive ? "bg-white text-emerald-800" : "bg-muted text-muted-foreground"
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
            <div className="my-8 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs">
              <div className="mx-auto size-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="size-6 text-emerald-600" />
              </div>
              <h3 className="mt-3 text-sm font-black text-black">
                {isSearching ? "No matching orders found" : `No orders in "${filterTab}" queue`}
              </h3>
              <p className="mt-1 text-xs font-medium text-zinc-700">
                {isSearching ? "Try searching for a different code or customer name." : "Incoming orders will appear here automatically."}
              </p>
              <button
                type="button"
                onClick={isSearching ? resetSearch : () => void refresh()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-black text-zinc-900 shadow-xs active:scale-95 transition-all cursor-pointer"
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
          {/* Canonical Status Filter Tabs + Table/Cards Switcher Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-4">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              {STAGE_TABS.map((tab) => {
                const isActive = filterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? "bg-brand-green text-white shadow-cta font-black"
                        : "border border-border/70 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                        isActive ? "bg-white text-emerald-800" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Switcher: Cards vs Table Layout */}
            <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200/80 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setOrderViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  orderViewMode === "cards"
                    ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="size-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  orderViewMode === "table"
                    ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
                title="Compact Order Table"
              >
                <LayoutList className="size-3.5" />
                <span>Table Layout</span>
              </button>
            </div>
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
            ) : orderViewMode === "cards" ? (
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
            ) : (
              /* High-Density Pure White Zomato Table Layout */
              <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3.5">Order ID</th>
                        <th className="px-4 py-3.5">Customer</th>
                        <th className="px-4 py-3.5">Services / Items</th>
                        <th className="px-4 py-3.5">Pickup Time</th>
                        <th className="px-4 py-3.5">Amount</th>
                        <th className="px-4 py-3.5">Stage / Status</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {visible.map((order) => {
                        return (
                          <tr
                            key={order.id}
                            className="transition-colors hover:bg-zinc-50/80 cursor-pointer"
                            onClick={() => navigate({ to: partnerRoutes.orderDetail(order.id) })}
                          >
                            <td className="px-4 py-3.5 font-mono font-black text-zinc-950">
                              #{order.code}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-zinc-900">{order.customerName}</p>
                              <p className="text-[11px] text-zinc-500">{order.customerPhone}</p>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-600">
                              <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                {(order.services || []).map((svc, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="rounded-md bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                                  >
                                    {svc}
                                  </span>
                                ))}
                                {(!order.services || order.services.length === 0) && (
                                  <span className="text-[11px] text-zinc-500">
                                    {order.itemCount || 1} items
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-700 font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-zinc-400" />
                                <span>{order.pickupTime || "Today"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-black text-zinc-950 whitespace-nowrap">
                              ₹{(order.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                {order.stage}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => navigate({ to: partnerRoutes.orderDetail(order.id) })}
                                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                                >
                                  Details
                                </button>
                                {order.stage === "new" || order.stage === "pending" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAction(order, "accept")}
                                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                ) : null}
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
        </PullToRefresh>
      </div>

      {sheetNode}
      {overlay}
      <Toaster />
    </PartnerLayout>
  );
}
