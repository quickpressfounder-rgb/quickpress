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
import {
  matchesFilter,
  matchesQuery,
  sortOrders,
  usePartnerOrders,
  type OrderFilterId,
  type OrderSortId,
} from "../context/PartnerOrdersContext";
import { usePartnerContext } from "../context/PartnerContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import {
  type OrderStage,
  type PartnerOrderFilterTab,
  isOrderMatchingTab,
} from "../data/partner-orders-mock";
import { partnerRoutes } from "../navigation/partner-routes";

export function OrdersScreen() {
  const navigate = useNavigate();
  const { orders, counts, isLoading, refresh } = usePartnerOrders();
  const { isOnline, toggleOnline } = usePartnerContext();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();

  const [filterTab, setFilterTab] = useState<PartnerOrderFilterTab>("active");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<OrderSortId>("latest");
  const [orderViewMode, setOrderViewMode] = useState<"cards" | "table">("cards");
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Real store status toggle connected to backend API & Supabase database
  const handleToggleStoreStatus = async () => {
    if (isTogglingStatus) return;
    setIsTogglingStatus(true);
    try {
      const nextState = !isOnline;
      await toggleOnline();
      if (nextState) {
        toast.success("Store is now ONLINE & accepting customer orders!");
      } else {
        toast.info("Store is now OFFLINE (Orders Paused)");
      }
    } catch {
      toast.error("Failed to update store status. Please check your network connection.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // 6 Canonical Stage Tabs requested by merchant: Active, Picked, Process, Out Of Delivery, Delivered, Cancelled
  const ORDER_FILTER_TABS: { id: PartnerOrderFilterTab; label: string; count: number }[] = useMemo(() => {
    return [
      { id: "active", label: "Active", count: orders.filter((o) => isOrderMatchingTab(o, "active")).length },
      { id: "picked", label: "Picked", count: orders.filter((o) => isOrderMatchingTab(o, "picked")).length },
      { id: "process", label: "Process", count: orders.filter((o) => isOrderMatchingTab(o, "process")).length },
      { id: "out_for_delivery", label: "Out Of Delivery", count: orders.filter((o) => isOrderMatchingTab(o, "out_for_delivery")).length },
      { id: "delivered", label: "Delivered", count: orders.filter((o) => isOrderMatchingTab(o, "delivered")).length },
      { id: "cancelled", label: "Cancelled", count: orders.filter((o) => isOrderMatchingTab(o, "cancelled")).length },
    ];
  }, [orders]);

  // Real data filtering: Search Query + Stage Tab
  const visible = useMemo(() => {
    const tabOrders = orders.filter((order) => isOrderMatchingTab(order, filterTab));
    if (query.trim().length > 0) {
      // First check within selected tab
      const inTabMatches = tabOrders.filter((order) => matchesQuery(order, query));
      if (inTabMatches.length > 0) {
        return sortOrders(inTabMatches, sort);
      }
      // If not found in current tab, search across ALL orders so merchant never misses an order
      const allMatches = orders.filter((order) => matchesQuery(order, query));
      return sortOrders(allMatches, sort);
    }
    return sortOrders(tabOrders, sort);
  }, [orders, filterTab, query, sort]);

  const isSearching = query.trim().length > 0;

  const resetSearch = () => {
    setQuery("");
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
        {/* Sticky Filter Header with Real [Online ⚪] Switch, Action Icons & Stage Pills */}
        <header className="sticky top-0 z-20 bg-white border-b border-zinc-200/90 px-4 pt-3 pb-2.5 shadow-2xs">
          {/* Top Bar Row: Real Online Toggle Switch on Left, Action Icons on Right */}
          <div className="flex items-center justify-between">
            {/* Real Store Online Pill Switch */}
            <button
              type="button"
              disabled={isTogglingStatus}
              onClick={handleToggleStoreStatus}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                isOnline
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                  : "bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
              }`}
              title={isOnline ? "Store is ONLINE — Tap to go Offline" : "Store is OFFLINE — Tap to go Online"}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    isOnline ? "bg-white animate-pulse" : "bg-zinc-400"
                  }`}
                />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </span>
              <span
                className={`flex size-4 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xs transition-transform duration-200 ${
                  isOnline ? "translate-x-0" : "-translate-x-0"
                }`}
              >
                {isTogglingStatus ? (
                  <span className="size-2.5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                ) : null}
              </span>
            </button>

            {/* Action Icons: Search, Notifications, App Drawer Grid */}
            <div className="flex items-center gap-3.5 text-zinc-700">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("partner-order-search-input");
                  if (input) input.focus();
                }}
                className="p-1 hover:text-black transition-colors cursor-pointer"
                title="Search Orders"
              >
                <Search className="size-5 stroke-[2.2]" />
              </button>

              <Link
                to={partnerRoutes.notifications}
                className="relative p-1 hover:text-black transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="size-5 stroke-[2.2]" />
                <span className="absolute top-1 right-1 size-2 rounded-full bg-rose-500" />
              </Link>

              <Link
                to={partnerRoutes.shop}
                className="p-1 hover:text-black transition-colors cursor-pointer"
                title="Menu / Outlet Hub"
              >
                <LayoutGrid className="size-5 stroke-[2.2]" />
              </Link>
            </div>
          </div>

          {/* Working Search Box */}
          <div className="relative mt-2.5">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              id="partner-order-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID (#QP-...), customer, phone or items..."
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-9 pr-8 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all shadow-2xs"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Active Search Result Feedback Chip */}
          {isSearching && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200/80">
              <span>
                Found {visible.length} order{visible.length === 1 ? "" : "s"} for "{query}"
              </span>
              <button
                type="button"
                onClick={resetSearch}
                className="text-emerald-700 underline hover:text-emerald-900 cursor-pointer ml-2"
              >
                Clear
              </button>
            </div>
          )}

          {/* Horizontal Stage Badge Filter Carousel: Active, Picked, Process, Out Of Delivery, Delivered, Cancelled */}
          <div className="no-scrollbar -mx-4 mt-2.5 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            {ORDER_FILTER_TABS.map((tab) => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "border-2 border-emerald-600 bg-emerald-50/60 text-emerald-800 shadow-2xs font-black"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isActive ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"
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
                {isSearching ? `No matching orders for "${query}"` : `No orders in "${ORDER_FILTER_TABS.find((t) => t.id === filterTab)?.label || filterTab}" queue`}
              </h3>
              <p className="mt-1 text-xs font-medium text-zinc-600">
                {isSearching
                  ? "Check the spelling or try searching by 10-digit phone number or short order code."
                  : "New orders in this stage will appear here in real-time."}
              </p>
              <button
                type="button"
                onClick={isSearching ? resetSearch : () => void refresh()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-black text-zinc-900 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>{isSearching ? "Clear Search" : "Refresh Orders"}</span>
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
          {/* Top Bar Row: Desktop Stage Tabs + Real Online Switch + View Switcher */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-4">
            {/* 6 Canonical Filter Tabs */}
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              {ORDER_FILTER_TABS.map((tab) => {
                const isActive = filterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id)}
                    className={`shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-cta font-black ring-2 ring-emerald-600/20"
                        : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isActive ? "bg-white text-emerald-800" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Real Store Online Toggle + View Mode Switcher */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {/* Real Online Switch for Desktop */}
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleToggleStoreStatus}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isOnline
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
                title={isOnline ? "Store is Online — Click to switch Offline" : "Store is Offline — Click to switch Online"}
              >
                <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span>{isOnline ? "Online (Accepting Orders)" : "Offline (Paused)"}</span>
                {isTogglingStatus ? (
                  <span className="size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
              </button>

              {/* View Switcher: Cards vs Table Layout */}
              <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200/80">
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
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Search Bar & Status Row */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders by ID, customer name, phone or garment items..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-9 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black cursor-pointer p-0.5"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            {isSearching ? (
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-emerald-800">
                  Showing {visible.length} result{visible.length === 1 ? "" : "s"} for "{query}"
                </span>
                <button
                  type="button"
                  onClick={resetSearch}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            ) : (
              <p className="text-xs font-semibold text-zinc-500">
                {visible.length} order{visible.length === 1 ? "" : "s"} in {ORDER_FILTER_TABS.find((t) => t.id === filterTab)?.label || filterTab}
              </p>
            )}
          </div>

          {/* Orders Content View */}
          <div className="mt-5 pb-12">
            {isLoading ? (
              <OrderListSkeleton />
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
              /* High-Density Pure White Table Layout */
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
