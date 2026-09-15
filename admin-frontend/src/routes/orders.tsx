import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Filter,
  Search,
  Undo2,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  User,
  Building2,
  Calendar,
  MapPin,
  ChevronRight,
  Phone,
  PhoneCall,
  Mail,
  Store,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Wallet,
  Eye,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  assignRider,
  changeOrderStatus,
  fetchOrder,
  fetchOrders,
  downloadOrderInvoicePdfBlob,
  viewOrderInvoicePdf,
  getOrderInvoicePdfUrl,
  type AdminOrder,
  type OrderStatus,
} from "../api/orders";
import { fetchRiders } from "../api/riders";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/orders")({
  beforeLoad: requireAdminSession,
  head: () => adminHead("Orders Management", "Search, filter and manage every QuickPress order."),
  component: OrdersPage,
});

const STATUS_TABS = [
  { id: "all", label: "All Orders" },
  { id: "reassigned", label: "2-Way Reassigned" },
  { id: "Pending", label: "Pending Acceptance" },
  { id: "Picked up", label: "Picked Up" },
  { id: "Processing", label: "In Processing" },
  { id: "Out for delivery", label: "Out for Delivery" },
  { id: "Delivered", label: "Delivered" },
  { id: "Cancelled", label: "Cancelled" },
];

export function OrdersPage() {
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ["admin", "orders"], queryFn: fetchOrders });
  const riders = useQuery({ queryKey: ["admin", "riders"], queryFn: fetchRiders });

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [city, setCity] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const allOrders = orders.data ?? [];

  const metrics = useMemo(() => {
    const total = allOrders.length;
    const active = allOrders.filter((o) =>
      ["Pending", "Accepted", "Pickup Assigned", "Picked up", "Processing", "Ready for delivery", "Delivery Assigned", "Out for delivery"].includes(o.status)
    ).length;
    const delivered = allOrders.filter((o) => o.status === "Delivered").length;
    const cancelled = allOrders.filter((o) => o.status === "Cancelled").length;
    return { total, active, delivered, cancelled };
  }, [allOrders]);

  const cities = useMemo(
    () => Array.from(new Set(allOrders.map((o) => o.city).filter(Boolean))),
    [allOrders],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOrders.filter((order) => {
      const matchesQuery =
        !q ||
        [order.id, order.customer, order.phone, order.partner, order.rider, order.service]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesStatus =
        activeTab === "all" ||
        (activeTab === "reassigned" ? Boolean(order.isReassigned) : order.status === activeTab);
      const matchesCity = city === "all" || order.city === city;
      const matchesFrom = !from || order.placedAt >= from;
      const matchesTo = !to || order.placedAt <= to;
      return matchesQuery && matchesStatus && matchesCity && matchesFrom && matchesTo;
    });
  }, [allOrders, query, activeTab, city, from, to]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No orders to export.");
      return;
    }
    const headers = ["Order ID", "Customer", "Partner", "Rider", "Service", "City", "Status", "Payment", "Placed At", "Total"];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      csvRows.push(
        [
          `"${r.id}"`,
          `"${r.customer}"`,
          `"${r.partner}"`,
          `"${r.rider}"`,
          `"${r.service}"`,
          `"${r.city}"`,
          `"${r.status}"`,
          `"${r.payment}"`,
          `"${r.placedAt}"`,
          `"${r.total}"`,
        ].join(","),
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orders CSV exported successfully!");
  };

  return (
    <AdminShell
      title="Orders Management"
      subtitle="Central tracking, dispatch, and status governance across all network orders."
      actions={
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-95 shadow-xs"
        >
          <Download className="size-3.5" />
          <span>Export CSV</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP METRIC CARDS
        ========================================================================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            kpi={{
              id: "tot-orders",
              label: "Total Orders",
              value: metrics.total.toLocaleString("en-IN"),
              hint: "Lifetime platform bookings",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "active-orders",
              label: "Active In-Flight",
              value: metrics.active.toLocaleString("en-IN"),
              hint: "Currently being serviced",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "del-orders",
              label: "Completed Deliveries",
              value: metrics.delivered.toLocaleString("en-IN"),
              hint: `${metrics.total ? Math.round((metrics.delivered / metrics.total) * 100) : 0}% fulfillment rate`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "can-orders",
              label: "Cancelled Orders",
              value: metrics.cancelled.toLocaleString("en-IN"),
              hint: "Customer or system cancellations",
              positive: metrics.cancelled === 0,
            }}
          />
        </div>

        {/* =========================================================================
            2. STATUS TABS & FILTERS
        ========================================================================= */}
        <SectionCard>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto p-1 bg-zinc-100/80 rounded-xl gap-1">
              {STATUS_TABS.map((tab) => {
                const countNum =
                  tab.id === "all"
                    ? allOrders.length
                    : tab.id === "reassigned"
                    ? allOrders.filter((o) => o.isReassigned).length
                    : allOrders.filter((o) => o.status === tab.id).length;

                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
                  >
                    <span>{tab.label}</span>
                    <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-black text-zinc-700">
                      {countNum}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by order ID, customer name, phone, partner..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="From date"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-700 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
              <span className="text-zinc-400 text-xs">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="To date"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-700 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* =========================================================================
            3. ORDERS DATA TABLE
        ========================================================================= */}
        <SectionCard
          title="All Platform Orders"
          description={`Showing ${rows.length} of ${allOrders.length} records. Click any row to inspect or dispatch.`}
        >
          <DataTable
            loading={orders.isLoading}
            rows={rows}
            onRowClick={setSelected}
            emptyMessage="No orders match the selected filters."
            columns={[
              {
                key: "id",
                label: "Order ID",
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 font-mono text-[11px] font-black text-zinc-800 border border-zinc-200">
                      #
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono font-black text-xs text-zinc-900">{r.id}</p>
                        {r.isReassigned && (
                          <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800 border border-amber-300">
                            2-Way
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium">{r.placedAt}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "customer",
                label: "Customer",
                render: (r) => (
                  <div>
                    <p className="font-bold text-zinc-900 text-xs">{r.customer}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{r.city}</p>
                  </div>
                ),
              },
              {
                key: "partner",
                label: "Partner Store",
                render: (r) => (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-zinc-400" />
                    <span className="text-zinc-800 font-semibold text-xs">{r.partner}</span>
                  </div>
                ),
              },
              {
                key: "rider",
                label: "Assigned Rider",
                render: (r) => (
                  <div className="flex items-center gap-1.5">
                    <Truck className="size-3.5 text-zinc-400" />
                    <div>
                      <span className={`text-xs font-semibold ${r.rider === "Unassigned" ? "text-amber-600 font-black" : "text-zinc-800"}`}>
                        {r.rider}
                      </span>
                      {r.isReassigned && (
                        <span className="block text-[9px] font-black text-amber-600">
                          (Reassigned / 2-Way)
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "service",
                label: "Service",
                render: (r) => (
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                    {r.service}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Order Status",
                render: (r) => (
                  <div className="space-y-1">
                    <StatusPill value={r.status} />
                    {r.status === "Cancelled" && r.cancellationReason ? (
                      <p
                        className="text-[10.5px] font-bold text-rose-600 line-clamp-1 max-w-[220px]"
                        title={r.cancellationReason}
                      >
                        ⚠️ {r.cancellationReason}
                      </p>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "payment",
                label: "Payment",
                render: (r) => (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      r.payment === "Paid"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : r.payment === "COD"
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    {r.payment}
                  </span>
                ),
              },
              {
                key: "total",
                label: "Total Amount",
                className: "text-right",
                render: (r) => <span className="font-black text-emerald-700 text-xs">{r.total}</span>,
              },
              {
                key: "invoice",
                label: "Tax Invoice",
                className: "text-right",
                render: (r) => (
                  <div
                    className="flex items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="View Tax Invoice"
                      onClick={() => {
                        viewOrderInvoicePdf(r.id);
                        toast.success(`Opening Invoice for #${r.id}...`);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 shadow-2xs"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Download Invoice PDF"
                      onClick={async () => {
                        try {
                          await downloadOrderInvoicePdfBlob(r.id, `QuickPress_Invoice_${r.id}.pdf`);
                          toast.success(`Invoice PDF for #${r.id} downloaded!`);
                        } catch (err: any) {
                          toast.error(err.message || "Failed to download invoice");
                        }
                      }}
                      className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95 shadow-2xs"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </SectionCard>
      </div>

      {/* =========================================================================
          4. ORDER DETAIL & DISPATCH DRAWER
      ========================================================================= */}
      <OrderDetailSheet
        order={selected}
        onClose={() => setSelected(null)}
      />
    </AdminShell>
  );
}

const STATUS_RANK: Record<string, number> = {
  placed: 1,
  pending: 1,
  Pending: 1,
  pending_partner_acceptance: 1,
  partner_accepted: 2,
  Accepted: 2,
  rider_searching: 2,
  pickup_rider_assigned: 2,
  rider_assigned: 2,
  "Pickup Assigned": 2,
  pickup_rider_accepted: 2,
  rider_accepted: 2,
  pickup_otp_pending: 2,
  picked_up: 3,
  "Picked up": 3,
  at_partner: 3,
  processing: 4,
  Processing: 4,
  in_wash: 4,
  "In wash": 4,
  washing: 4,
  dry_cleaning: 4,
  ironing: 4,
  ready_for_delivery: 4,
  "Ready for delivery": 4,
  completed: 4,
  ready: 4,
  delivery_rider_assigned: 5,
  "Delivery Assigned": 5,
  delivery_rider_accepted: 5,
  dispatch_otp_pending: 5,
  out_for_delivery: 5,
  "Out for delivery": 5,
  delivery_otp_pending: 5,
  delivered: 6,
  Delivered: 6,
  cancelled: 99,
  Cancelled: 99,
};

function OrderDetailSheet({
  order,
  onClose,
}: {
  order: AdminOrder | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "orders", order?.id],
    queryFn: () => (order ? fetchOrder(order.id) : null),
    enabled: Boolean(order),
  });

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);

  const invoicePdfUrl = order ? getOrderInvoicePdfUrl(order.id) : "";

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      const fileName = await downloadOrderInvoicePdfBlob(order.id, `QuickPress_Invoice_${order.id}.pdf`);
      toast.success(`Tax Invoice ${fileName} downloaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download Tax Invoice PDF");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleViewInvoice = () => {
    if (!order) return;
    setInvoicePreviewOpen(true);
  };

  const riders = useQuery({ queryKey: ["admin", "riders"], queryFn: fetchRiders });
  const availableRiders = riders.data ?? [];

  const assignMutation = useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      assignRider(orderId, riderId),
    onSuccess: () => {
      toast.success("Rider assigned to order successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: () => {
      toast.error("Failed to assign rider to order.");
    },
  });

  const currentStatus = data?.status ?? order?.status ?? "";
  const currentRank = STATUS_RANK[currentStatus] ?? 1;
  const isFinalized = currentRank >= 6;
  const isCancelled = currentStatus === "Cancelled" || currentStatus === "cancelled" || order?.status === "Cancelled";
  const cancellationReason =
    (data as any)?.cancellationReason ||
    order?.cancellationReason ||
    (data as any)?.cancelledReason ||
    (data as any)?.refundReason ||
    "Cancelled by platform / SLA Timeout";
  const cancelledBy = (data as any)?.cancelledBy || order?.cancelledBy || "system";
  const autoCancelled = Boolean((data as any)?.autoCancelled || order?.autoCancelled);
  const refundStatus = (data as any)?.refundStatus || order?.refundStatus || "Refund Processed (Wallet/Online)";

  const is2Way = Boolean(
    data?.isReassigned ||
    (order as any)?.isReassigned ||
    data?.reassignment ||
    (data as any)?.reassignment ||
    data?.rider1 ||
    data?.rider2
  );

  const reassignmentData = data?.reassignment || (order as any)?.reassignment;
  const rider1 = data?.rider1 || (reassignmentData ? {
    id: reassignmentData.originalRiderId,
    name: "Rider 1 (Pickup Captain)",
    phone: "",
    vehicle: "Bike",
    plate: "UP-87-QP-1001",
    payout: Number(reassignmentData.pickupLegPayout || 35.0),
  } : null);

  const rider2 = data?.rider2 || (reassignmentData?.assignedTransferRiderId ? {
    id: reassignmentData.assignedTransferRiderId,
    name: "Rider 2 (Delivery Captain)",
    phone: "",
    vehicle: "Bike",
    plate: "UP-87-QP-1002",
    payout: Number(reassignmentData.deliveryLegPayout || 35.0),
  } : null);

  const dispatchOtp =
    data?.dispatchOtp ||
    reassignmentData?.dispatchOtp ||
    reassignmentData?.handoverOtp ||
    "5387";
  const custodyStatus = data?.custody || reassignmentData?.custody || "partner";
  const settlement = data?.settlement;

  const getReasonMeta = (reason?: string) => {
    switch (reason) {
      case "vehicle_problem":
      case "vehicle_breakdown":
        return { label: "🛵 Vehicle Breakdown / Problem", badge: "border-amber-300 bg-amber-100/80 text-amber-900" };
      case "medical_emergency":
      case "emergency":
        return { label: "🚨 Medical Emergency", badge: "border-rose-300 bg-rose-100/80 text-rose-900" };
      case "accident":
      case "accident_health":
        return { label: "⚠️ Accident / Collision", badge: "border-red-400 bg-red-100/80 text-red-900" };
      case "personal_issue":
      case "family_emergency":
        return { label: "🏠 Personal / Family Emergency", badge: "border-purple-300 bg-purple-100/80 text-purple-900" };
      default:
        return {
          label: `⚠️ ${reason ? reason.replace(/_/g, " ") : "Operational Difficulty"}`,
          badge: "border-amber-300 bg-amber-100/80 text-amber-900",
        };
    }
  };

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) => {
      const targetRank = STATUS_RANK[status] ?? 0;
      const latestRank = STATUS_RANK[data?.status ?? order?.status ?? ""] ?? 1;
      if (status.toLowerCase() !== "cancelled" && targetRank <= latestRank) {
        throw new Error("Cannot move order status backwards. Progression is strictly one-way.");
      }
      return changeOrderStatus(orderId, status);
    },
    onSuccess: () => {
      toast.success("Order status updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update order status.");
    },
  });

  return (
    <Sheet open={Boolean(order)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl bg-white text-zinc-900 border-zinc-200">
        <SheetHeader className="border-b border-zinc-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-black text-zinc-900">
                Order #{order?.id}
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-500 font-medium mt-0.5">
                {order?.service} · {order?.city}
              </SheetDescription>
            </div>
            {order && <StatusPill value={data?.status ?? order.status} />}
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 py-6">
          {/* CANCELLATION & REFUND REASON BANNER */}
          {isCancelled && (
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4.5 shadow-xs animate-in fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200/80 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-950">
                  <AlertTriangle className="size-4 text-rose-600 animate-pulse shrink-0" />
                  <span>CANCELLATION &amp; REFUND DETAILS</span>
                </div>
                <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider shadow-xs">
                  {autoCancelled ? "⚡ SLA Auto-Cancelled" : "Cancelled"}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-rose-800 mb-1">
                  Reason for Cancellation:
                </div>
                <div className="rounded-xl border border-rose-300/80 bg-white p-3 text-xs font-bold text-rose-950 leading-relaxed shadow-2xs">
                  ⚠️ {cancellationReason}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="rounded-xl border border-rose-200 bg-rose-100/60 p-2.5">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wide">Cancelled By</span>
                  <div className="font-black text-rose-950 capitalize mt-0.5">
                    {cancelledBy === "system" || autoCancelled ? "🤖 System (SLA Engine)" : cancelledBy}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-100/60 p-2.5">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wide">Customer Refund</span>
                  <div className="font-black text-emerald-800 flex items-center gap-1 mt-0.5">
                    <span>💳</span>
                    <span className="truncate">Refunded ({order?.total || "Full Amount"})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <User className="size-3.5 text-emerald-600" />
                <span>CUSTOMER PERSONAL DETAILS</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono">
                ID: {(data as any)?.userId || (order as any)?.userId || "USR-29401"}
              </span>
            </div>
            <DetailRow label="Customer Name" value={<span className="font-bold text-zinc-900">{(data as any)?.customerName || order?.customer || "—"}</span>} />
            <DetailRow
              label="Contact Phone"
              value={
                <a
                  href={`tel:${(data as any)?.customerPhone || order?.phone}`}
                  className="flex items-center gap-1 font-mono text-emerald-700 font-bold hover:underline"
                >
                  <PhoneCall className="size-3" />
                  <span>{(data as any)?.customerPhone || order?.phone || "—"}</span>
                </a>
              }
            />
            <DetailRow
              label="Email Address"
              value={
                (data as any)?.customerEmail ? (
                  <a href={`mailto:${(data as any)?.customerEmail}`} className="flex items-center gap-1 font-mono text-emerald-700 font-medium hover:underline">
                    <Mail className="size-3" />
                    <span>{(data as any)?.customerEmail}</span>
                  </a>
                ) : (
                  <span className="text-zinc-400 italic font-mono text-[11px]">Not Provided</span>
                )
              }
            />
            <DetailRow
              label="Pickup & Delivery Address"
              value={
                <span className="flex items-start gap-1 text-zinc-800 font-semibold leading-relaxed">
                  <MapPin className="size-3 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{(data as any)?.address || (order as any)?.address || "—"}</span>
                </span>
              }
            />
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-sky-900 mb-3 border-b border-sky-100 pb-2 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-sky-600" />
              <span>FULFILLMENT HUB &amp; RIDER</span>
            </h4>
            <DetailRow
              label="Assigned Laundromat Partner"
              value={
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Store className="size-3 text-sky-600" />
                  <span>{order?.partner}</span>
                </span>
              }
            />
            <DetailRow
              label="Partner Phone"
              value={
                (data as any)?.partnerPhone ? (
                  <a href={`tel:${(data as any)?.partnerPhone}`} className="font-mono text-sky-700 font-bold hover:underline">
                    {(data as any)?.partnerPhone}
                  </a>
                ) : (
                  <span className="font-mono text-zinc-400">—</span>
                )
              }
            />
            <DetailRow
              label="Assigned Delivery Captain"
              value={
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Truck className="size-3 text-purple-600" />
                  <span>{order?.rider}</span>
                </span>
              }
            />
            <DetailRow
              label="Rider Phone"
              value={
                (data as any)?.riderPhone ? (
                  <a href={`tel:${(data as any)?.riderPhone}`} className="font-mono text-purple-700 font-bold hover:underline">
                    {(data as any)?.riderPhone}
                  </a>
                ) : (
                  <span className="font-mono text-zinc-400">—</span>
                )
              }
            />
            <DetailRow label="Service Slot" value={<span className="font-medium text-zinc-700">{data?.slot || "—"}</span>} />
            <DetailRow
              label="Payment Mode"
              value={
                <span className="font-mono font-bold text-zinc-900 uppercase">
                  {(data as any)?.paymentMode || order?.payment || "—"}
                </span>
              }
            />
            <DetailRow
              label="Grand Total"
              value={<span className="text-base font-black text-emerald-700">{order?.total}</span>}
            />
          </div>

          {/* =========================================================================
              2-WAY DELIVERY & REASSIGNMENT AUDIT RECORD CARD
          ========================================================================= */}
          {is2Way && (
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-4 shadow-xs space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <span>2-WAY DELIVERY &amp; REASSIGNMENT AUDIT RECORD</span>
                    </h4>
                    <p className="text-[10px] font-medium text-indigo-700/90">
                      Dual-Captain Protocol · Custody Governance · Payout Distribution
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                    reassignmentData?.handoverCompleted
                      ? "bg-emerald-600 text-white"
                      : reassignmentData?.requested
                      ? "bg-amber-500 text-white animate-pulse"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {reassignmentData?.handoverCompleted
                    ? "✓ Handover Complete"
                    : reassignmentData?.requested
                    ? "⚡ Reassignment Active"
                    : "2-Way Delivery"}
                </span>
              </div>

              {/* Reassignment Incident Banner (if requested) */}
              {reassignmentData && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                      <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                      <span>INCIDENT: UNABLE TO COMPLETE DELIVERY REPORTED</span>
                    </div>
                    {reassignmentData.requestedAt && (
                      <span className="text-[10px] font-mono font-bold text-amber-800">
                        {new Date(reassignmentData.requestedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-[11px] capitalize shadow-2xs ${
                        getReasonMeta(reassignmentData.reason).badge
                      }`}
                    >
                      {getReasonMeta(reassignmentData.reason).label}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-[11px] shadow-2xs">
                      <Store className="size-3 text-emerald-700" />
                      <span>Custody: Safe at Partner ({order?.partner || "Laundromat Store"})</span>
                    </span>
                  </div>

                  {reassignmentData.remarks && (
                    <div className="text-[11px] text-amber-950 font-medium italic bg-white/90 rounded-lg p-2 border border-amber-200">
                      "{reassignmentData.remarks}"
                    </div>
                  )}
                </div>
              )}

              {/* Dual Captains (Rider 1 & Rider 2) Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rider 1: Pickup Captain */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-black text-white">
                        1
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wide text-purple-900">
                        Rider 1 (Pickup Captain)
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Completed
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-bold text-zinc-900 flex items-center justify-between">
                      <span className="truncate">{rider1?.name || (order as any)?.rider || "Captain 1"}</span>
                      {rider1?.phone && (
                        <a
                          href={`tel:${rider1.phone}`}
                          className="text-purple-700 hover:underline flex items-center gap-1 font-mono text-[11px] shrink-0"
                        >
                          <PhoneCall className="size-3" />
                          <span>{rider1.phone}</span>
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-600 flex items-center justify-between font-mono">
                      <span>{rider1?.vehicle || "Bike"} · {rider1?.plate || "UP-87-QP-1001"}</span>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-purple-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-purple-950">Leg 1 Payout:</span>
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ₹{(rider1?.payout ?? settlement?.rider1Payout ?? 35).toFixed(2)} (Credited)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rider 2: Delivery Captain */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-black text-white">
                        2
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wide text-sky-900">
                        Rider 2 (Delivery Captain)
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        reassignmentData?.handoverCompleted
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {reassignmentData?.handoverCompleted ? "Dispatched" : "Pending Handshake"}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-bold text-zinc-900 flex items-center justify-between">
                      <span className="truncate">
                        {rider2?.name ||
                          (order as any)?.deliveryRider ||
                          (reassignmentData?.assignedTransferRiderId ? "Replacement Captain" : "Auto-Dispatching...")}
                      </span>
                      {rider2?.phone && (
                        <a
                          href={`tel:${rider2.phone}`}
                          className="text-sky-700 hover:underline flex items-center gap-1 font-mono text-[11px] shrink-0"
                        >
                          <PhoneCall className="size-3" />
                          <span>{rider2.phone}</span>
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-600 flex items-center justify-between font-mono">
                      <span>{rider2?.vehicle || "Bike"} · {rider2?.plate || "UP-87-QP-1002"}</span>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-sky-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-sky-950">Leg 2 Payout:</span>
                      <span className="font-mono font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        ₹{(rider2?.payout ?? settlement?.rider2Payout ?? 35).toFixed(2)} (Delivery)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dispatch OTP Handshake Card */}
              <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                    <KeyRound className="size-4 text-indigo-600" />
                    <span>PARTNER STORE DISPATCH OTP (PHYSICAL HANDSHAKE)</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      reassignmentData?.handoverCompleted
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-indigo-50 text-indigo-800 border-indigo-200"
                    }`}
                  >
                    {reassignmentData?.handoverCompleted ? "✓ Verified by Partner" : "Required for Dispatch"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="space-y-0.5 max-w-xs">
                    <p className="text-[11px] text-zinc-600">
                      Rider 2 communicates this 4-digit code to Partner for parcel release:
                    </p>
                    <span className="text-[10px] text-zinc-400 font-mono block">
                      {reassignmentData?.handoverCompleted
                        ? "Security handshake verified at partner counter."
                        : "Physical verification pending at laundromat store."}
                    </span>
                  </div>

                  {/* 4-digit OTP Boxes */}
                  <div className="flex items-center gap-1.5 font-mono self-start sm:self-auto">
                    {(dispatchOtp || "5387").slice(0, 4).split("").map((digit: string, i: number) => (
                      <span
                        key={i}
                        className="flex h-9 w-8 items-center justify-center rounded-lg border-2 border-indigo-600 bg-indigo-50/80 text-sm font-black text-indigo-950 shadow-xs"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Split Breakdown Matrix */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-emerald-600" />
                    <span>FINANCIAL SPLIT BREAKDOWN (DUAL-LEG MATRIX)</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Autonomous Settlement</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded-lg bg-white p-2 border border-zinc-200 text-center shadow-2xs">
                    <span className="text-[9.5px] font-bold text-zinc-500 uppercase block">Customer Total</span>
                    <span className="text-xs font-black text-zinc-900 font-mono">{order?.total || "₹149.00"}</span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-zinc-200 text-center shadow-2xs">
                    <span className="text-[9.5px] font-bold text-sky-700 uppercase block">Partner Net</span>
                    <span className="text-xs font-black text-sky-900 font-mono">
                      ₹{(settlement?.partnerNet ?? 104.30).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-purple-200 text-center shadow-2xs">
                    <span className="text-[9.5px] font-bold text-purple-700 uppercase block">Rider 1 + Rider 2</span>
                    <span className="text-xs font-black text-purple-900 font-mono">
                      ₹{((rider1?.payout ?? 35) + (rider2?.payout ?? 35)).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-emerald-200 text-center shadow-2xs">
                    <span className="text-[9.5px] font-bold text-emerald-700 uppercase block">Platform Fee</span>
                    <span className="text-xs font-black text-emerald-900 font-mono">
                      ₹{(settlement?.platformFee ?? 4.70).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
              ORDER ITEMS ({data?.items?.length ?? 0})
            </h4>
            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-zinc-50/50">
              {(data?.items ?? []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <span className="font-bold text-zinc-900">{item.name}</span>
                    <span className="ml-2 font-mono text-zinc-400">× {item.qty}</span>
                  </div>
                  <span className="font-black text-zinc-900">{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* =========================================================================
              TAX INVOICE & CASH BILL CARD
          ========================================================================= */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                  <FileText className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                    TAX INVOICE &amp; PAYMENT BILL
                  </h4>
                  <p className="text-[10px] font-semibold text-zinc-500">
                    Official 3-page GST Tax Invoice &amp; Payment Summary
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                  order?.payment === "Paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order?.payment === "COD"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {order?.payment || "Paid"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-y border-indigo-100/80 py-2.5">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Order Reference</span>
                <span className="font-mono font-black text-zinc-900 text-xs">#{order?.id}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Grand Total (Incl. GST)</span>
                <span className="font-mono font-black text-emerald-700 text-sm">{order?.total}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleViewInvoice}
                className="h-9 rounded-xl border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50 hover:text-indigo-950 text-xs font-bold shadow-xs active:scale-[0.98] transition-all"
              >
                <Eye className="mr-1.5 size-3.5 text-indigo-600" />
                <span>View Invoice</span>
              </Button>

              <Button
                type="button"
                disabled={downloadingInvoice}
                onClick={handleDownloadInvoice}
                className="h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-xs active:scale-[0.98] transition-all"
              >
                {downloadingInvoice ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 size-3.5" />
                )}
                <span>Download PDF</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                LIFECYCLE MILESTONE TIMELINE
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Audit Progression
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <ol className="relative space-y-4 border-l-2 border-zinc-200 pl-4">
                {(data?.timeline ?? []).map((step, idx) => {
                  const isCancelStep = step.label.toLowerCase().includes("cancelled");
                  return (
                    <li key={idx} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-white ${
                          isCancelStep
                            ? "bg-rose-600 ring-2 ring-rose-100"
                            : step.done
                            ? "bg-emerald-600 ring-2 ring-emerald-100"
                            : "bg-zinc-300"
                        }`}
                      />
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`font-bold ${
                              isCancelStep
                                ? "text-rose-700"
                                : step.done
                                ? "text-zinc-900"
                                : "text-zinc-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.done && !isCancelStep && (
                            <CheckCircle2 className="size-3 text-emerald-600 inline" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono font-semibold">{step.at}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
              DISPATCH &amp; GOVERNANCE ACTIONS
            </h4>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700">Assign / Reassign Rider</Label>
              <Select
                disabled={isFinalized}
                onValueChange={(riderId) => {
                  if (order) assignMutation.mutate({ orderId: order.id, riderId });
                }}
              >
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder={order?.rider === "Unassigned" ? "Choose a rider..." : order?.rider} />
                </SelectTrigger>
                <SelectContent>
                  {availableRiders.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.city} · {r.live})
                    </SelectItem>
                  ))}
                  {availableRiders.length === 0 && (
                    <SelectItem value="rdr-auto">Auto-assign Nearest Rider</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-700">Update Order Status Override</Label>
                <span className="text-[10px] font-semibold text-zinc-400">Strictly Forward Progression</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentRank >= 2 || isFinalized}
                  className={`h-8 rounded-lg text-[11px] font-bold transition-all ${
                    currentRank >= 2
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-600 opacity-60 cursor-not-allowed"
                      : "border-emerald-300 text-emerald-800 hover:bg-emerald-50 active:scale-95"
                  }`}
                  onClick={() => order && statusMutation.mutate({ orderId: order.id, status: "partner_accepted" })}
                >
                  {currentRank >= 2 ? "✓ Accepted" : "Store Accept"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={currentRank >= 3 || isFinalized}
                  className={`h-8 rounded-lg text-[11px] font-bold transition-all ${
                    currentRank >= 3
                      ? "border-sky-200 bg-sky-50/50 text-sky-600 opacity-60 cursor-not-allowed"
                      : "border-sky-300 text-sky-800 hover:bg-sky-50 active:scale-95"
                  }`}
                  onClick={() => order && statusMutation.mutate({ orderId: order.id, status: "picked_up" })}
                >
                  {currentRank >= 3 ? "✓ Picked Up" : "Picked Up"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={currentRank >= 4 || isFinalized}
                  className={`h-8 rounded-lg text-[11px] font-bold transition-all ${
                    currentRank >= 4
                      ? "border-indigo-200 bg-indigo-50/50 text-indigo-600 opacity-60 cursor-not-allowed"
                      : "border-indigo-300 text-indigo-800 hover:bg-indigo-50 active:scale-95"
                  }`}
                  onClick={() => order && statusMutation.mutate({ orderId: order.id, status: "processing" })}
                >
                  {currentRank >= 4 ? "✓ Processing" : "In Processing"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={currentRank >= 5 || isFinalized}
                  className={`h-8 rounded-lg text-[11px] font-bold transition-all ${
                    currentRank >= 5
                      ? "border-amber-200 bg-amber-50/50 text-amber-600 opacity-60 cursor-not-allowed"
                      : "border-amber-300 text-amber-800 hover:bg-amber-50 active:scale-95"
                  }`}
                  onClick={() => order && statusMutation.mutate({ orderId: order.id, status: "out_for_delivery" })}
                >
                  {currentRank >= 5 ? "✓ Dispatched" : "Out Delivery"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={currentRank >= 6 || isFinalized}
                  className={`h-8 rounded-lg text-[11px] font-bold transition-all ${
                    currentRank >= 6
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60 cursor-not-allowed"
                      : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                  }`}
                  onClick={() => order && statusMutation.mutate({ orderId: order.id, status: "delivered" })}
                >
                  {currentRank >= 6 ? "✓ Delivered" : "Delivered"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isFinalized}
                  className={`h-8 rounded-lg text-[11px] font-bold transition-all ${
                    isFinalized
                      ? "border-zinc-200 bg-zinc-50 text-zinc-400 opacity-50 cursor-not-allowed"
                      : "border-rose-300 text-rose-800 hover:bg-rose-50 active:scale-95"
                  }`}
                  onClick={() => order && statusMutation.mutate({ orderId: order.id, status: "cancelled" })}
                >
                  {currentRank === 99 ? "Cancelled" : "Cancel Order"}
                </Button>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-50"
                onClick={handleViewInvoice}
              >
                <Eye className="mr-1.5 size-3.5 text-zinc-700" />
                <span>View Tax Invoice</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-50"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
              >
                {downloadingInvoice ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 size-3.5 text-zinc-700" />
                )}
                <span>Download Invoice PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

      {/* Invoice Preview Dialog */}
      <Dialog open={invoicePreviewOpen} onOpenChange={setInvoicePreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col overflow-hidden rounded-2xl border border-zinc-300 shadow-2xl">
          <DialogHeader className="p-4 border-b border-zinc-200 bg-zinc-50/80 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black text-zinc-900">
                  Tax Invoice Preview — #{order?.id}
                </DialogTitle>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Official 3-page Tax Invoice &amp; Customer/Store Breakdown
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-6">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg text-xs font-bold"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
              >
                <Download className="mr-1.5 size-3.5" />
                <span>Download PDF</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg text-xs font-bold"
                onClick={() => {
                  if (order) viewOrderInvoicePdf(order.id);
                }}
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                <span>Open in Tab</span>
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full bg-zinc-100 relative">
            {invoicePdfUrl ? (
              <iframe
                src={invoicePdfUrl}
                title={`Tax Invoice ${order?.id}`}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-zinc-400" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
