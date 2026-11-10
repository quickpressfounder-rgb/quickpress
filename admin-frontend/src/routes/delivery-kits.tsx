import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PackageCheck,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  IndianRupee,
  Phone,
  MapPin,
  ExternalLink,
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Building2,
  User,
  CreditCard,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import {
  fetchDeliveryKits,
  fetchDeliveryKitsStats,
  dispatchDeliveryKit,
  markDeliveryKitDelivered,
  type AdminDeliveryKitOrder,
} from "../api/delivery-kits";

export const Route = createFileRoute("/delivery-kits")({
  beforeLoad: requireAdminSession,
  ssr: false,
  head: () =>
    adminHead(
      "Captain Delivery Kits Management",
      "Manage Captain Starter Gear kits, track Razorpay part-payments, and dispatch shipments."
    ),
  component: DeliveryKitsPage,
  errorComponent: ({ error }) => (
    <AdminShell title="Delivery Kits Management">
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 m-6">
        <h3 className="text-lg font-bold">Delivery Kits Hub Error</h3>
        <p className="text-xs text-rose-500 mt-1">{String((error as Error)?.message || error)}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-rose-600 text-white font-bold text-xs">
          Reload Page
        </Button>
      </div>
    </AdminShell>
  ),
});

function formatTimestamp(ts?: string): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(ts);
  }
}

export function DeliveryKitsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState<boolean>(false);
  const [selectedKit, setSelectedKit] = useState<AdminDeliveryKitOrder | null>(null);
  const [courierName, setCourierName] = useState<string>("DTDC Express");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [dispatchNotes, setDispatchNotes] = useState<string>("");

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin", "delivery-kits", "stats"],
    queryFn: fetchDeliveryKitsStats,
    refetchInterval: 15000,
  });

  const { data: kitsData, isLoading: kitsLoading, isFetching: kitsFetching, refetch: refetchKits } = useQuery({
    queryKey: ["admin", "delivery-kits", "list", activeTab, searchTerm],
    queryFn: () => fetchDeliveryKits(activeTab, searchTerm, 100),
    refetchInterval: 15000,
  });

  // Mutations
  const dispatchMutation = useMutation({
    mutationFn: (args: { kitId: string; courierName: string; trackingNumber: string; notes?: string }) =>
      dispatchDeliveryKit(args.kitId, {
        courierName: args.courierName,
        trackingNumber: args.trackingNumber,
        notes: args.notes,
      }),
    onSuccess: () => {
      toast.success("✓ Delivery Kit dispatched and tracking recorded!");
      setDispatchModalOpen(false);
      setTrackingNumber("");
      setDispatchNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-kits"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch kit");
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (args: { kitId: string; deliveredBy?: string; notes?: string }) =>
      markDeliveryKitDelivered(args.kitId, {
        deliveredBy: args.deliveredBy || "Hub Operations Manager",
        notes: args.notes,
      }),
    onSuccess: () => {
      toast.success("✓ Kit marked as successfully Delivered to Captain!");
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-kits"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to mark kit as delivered");
    },
  });

  const handleOpenDispatch = (kit: AdminDeliveryKitOrder) => {
    setSelectedKit(kit);
    setCourierName(kit.deliveryPreference === "hub_pickup" ? "Direct Hub Handover" : "DTDC Express");
    setTrackingNumber(kit.fulfillment?.trackingNumber || "");
    setDispatchNotes(kit.fulfillment?.notes || "");
    setDispatchModalOpen(true);
  };

  const handleOpenDetails = (kit: AdminDeliveryKitOrder) => {
    setSelectedKit(kit);
    setDetailsModalOpen(true);
  };

  const handleConfirmDispatch = () => {
    if (!selectedKit) return;
    if (!courierName.trim()) {
      toast.error("Please enter courier or handover provider name");
      return;
    }
    if (!trackingNumber.trim()) {
      toast.error("Please enter tracking number or challan ID");
      return;
    }
    dispatchMutation.mutate({
      kitId: selectedKit._id || selectedKit.id,
      courierName: courierName.trim(),
      trackingNumber: trackingNumber.trim(),
      notes: dispatchNotes.trim(),
    });
  };

  const handleMarkDelivered = (kit: AdminDeliveryKitOrder) => {
    if (confirm(`Confirm delivery handover for Captain ${kit.riderName} (${kit.riderPhone})?`)) {
      deliverMutation.mutate({
        kitId: kit._id || kit.id,
        deliveredBy: "Hub Operations Staff",
      });
    }
  };

  const orders = kitsData?.items || [];

  return (
    <AdminShell title="Delivery Kits & Gear Fulfillment">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* 1. Header Banner & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-neutral-900">
                  Captain Delivery Kits Hub
                </h1>
                <p className="text-xs text-neutral-500 font-medium">
                  Track starter bag & t-shirt payments, Razorpay part-payment EMIs, and fulfillment dispatch
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStats();
                refetchKits();
                toast.success("Kit inventory refreshed");
              }}
              disabled={kitsFetching}
              className="gap-1.5 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${kitsFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <KpiCard
            title="Total Kit Orders"
            value={stats?.totalOrders ?? (statsLoading ? "..." : 0)}
            icon={<Package className="w-4 h-4 text-neutral-600" />}
            color="neutral"
            subtitle="Registering Captains"
          />
          <KpiCard
            title="Pending Dispatch"
            value={stats?.pendingDispatch ?? (statsLoading ? "..." : 0)}
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            color="amber"
            subtitle="Needs Packaging/Courier"
          />
          <KpiCard
            title="Dispatched / Transit"
            value={stats?.dispatched ?? (statsLoading ? "..." : 0)}
            icon={<Truck className="w-4 h-4 text-sky-600" />}
            color="blue"
            subtitle="Courier in-transit"
          />
          <KpiCard
            title="Delivered Kits"
            value={stats?.delivered ?? (statsLoading ? "..." : 0)}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            color="emerald"
            subtitle="Captain On-Road Active"
          />
          <KpiCard
            title="Revenue Collected"
            value={`₹${(stats?.totalRevenueCollected ?? 0).toLocaleString("en-IN")}`}
            icon={<IndianRupee className="w-4 h-4 text-emerald-600" />}
            color="emerald"
            subtitle={`₹${(stats?.outstandingInstallments ?? 0).toLocaleString("en-IN")} EMI Debt`}
          />
        </div>

        {/* 3. Search and Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-neutral-100 p-1 rounded-xl">
              <TabsTrigger value="ALL" className="text-xs font-bold rounded-lg px-3">
                All Kits
              </TabsTrigger>
              <TabsTrigger value="PENDING_DISPATCH" className="text-xs font-bold rounded-lg px-3">
                Pending ({stats?.pendingDispatch ?? 0})
              </TabsTrigger>
              <TabsTrigger value="DISPATCHED" className="text-xs font-bold rounded-lg px-3">
                Dispatched ({stats?.dispatched ?? 0})
              </TabsTrigger>
              <TabsTrigger value="DELIVERED" className="text-xs font-bold rounded-lg px-3">
                Delivered ({stats?.delivered ?? 0})
              </TabsTrigger>
              <TabsTrigger value="PART_PAYMENT" className="text-xs font-bold rounded-lg px-3">
                Part Payment (EMI)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search rider, phone, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* 4. Delivery Kits Data Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-neutral-900">Kit Orders</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {orders.length} records
              </span>
            </div>
            {kitsLoading && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                Loading orders...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Rider Captain</th>
                  <th className="p-3.5">Kit Package & Size</th>
                  <th className="p-3.5">Delivery Preference</th>
                  <th className="p-3.5">Payment Terms</th>
                  <th className="p-3.5">Razorpay ID & Date</th>
                  <th className="p-3.5">Fulfillment Status</th>
                  <th className="p-3.5">Tracking / Courier</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-400 font-medium">
                      {kitsLoading ? "Loading delivery kit orders..." : "No delivery kit orders matching criteria."}
                    </td>
                  </tr>
                ) : (
                  orders.map((k) => {
                    const fulfillStatus = k.fulfillment?.status || "PENDING_DISPATCH";
                    const isPartPayment = k.pricing?.paymentType === "PART_PAYMENT";

                    return (
                      <tr key={k._id || k.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Rider Info */}
                        <td className="p-3.5">
                          <div className="font-bold text-neutral-900 text-xs">
                            {k.riderName || "Captain"}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono mt-0.5">
                            <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span>{k.riderPhone}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400">
                            {k.city || "Kasganj"}
                          </span>
                        </td>

                        {/* Kit & Size */}
                        <td className="p-3.5">
                          <div className="font-bold text-neutral-800 text-[11px]">
                            {k.kitName || "Standard Starter Kit"}
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-100 text-neutral-700 border border-neutral-200">
                            Size: {k.tshirtSize || "L"}
                          </span>
                        </td>

                        {/* Delivery Preference */}
                        <td className="p-3.5">
                          {k.deliveryPreference === "hub_pickup" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Building2 className="w-3 h-3 text-amber-600" />
                              Hub Pickup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <Truck className="w-3 h-3 text-sky-600" />
                              Home Delivery
                            </span>
                          )}
                        </td>

                        {/* Payment Mode */}
                        <td className="p-3.5">
                          {isPartPayment ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">
                                Part Payment (EMI)
                              </span>
                              <div className="text-[11px] font-bold text-neutral-900 mt-1">
                                ₹{k.pricing?.amountPaid || 300}{" "}
                                <span className="text-neutral-400 text-[10px] font-normal">
                                  / ₹{k.pricing?.totalKitPrice || 1200}
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-700 font-medium">
                                Bal: ₹{k.pricing?.remainingBalance || 900} (₹300/wk)
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Full Payment
                              </span>
                              <div className="text-[11px] font-bold text-neutral-900 mt-1">
                                ₹{k.pricing?.amountPaid || 999}
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium">
                                Fully Paid ✓
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Razorpay Order & Date */}
                        <td className="p-3.5">
                          <div className="font-mono text-[10px] text-neutral-700 truncate max-w-[120px]">
                            {k.payment?.razorpayPaymentId || k.payment?.razorpayOrderId || "—"}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            {formatTimestamp(k.payment?.paidAt || k.createdAt)}
                          </div>
                        </td>

                        {/* Fulfillment Status */}
                        <td className="p-3.5">
                          {fulfillStatus === "DELIVERED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Delivered
                            </span>
                          ) : fulfillStatus === "DISPATCHED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                              <Truck className="w-3 h-3 text-sky-600" />
                              Dispatched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Dispatch
                            </span>
                          )}
                        </td>

                        {/* Tracking Details */}
                        <td className="p-3.5">
                          {k.fulfillment?.trackingNumber ? (
                            <div>
                              <div className="text-[11px] font-bold text-neutral-800">
                                {k.fulfillment?.courierName || "Courier"}
                              </div>
                              <div className="font-mono text-[10px] text-neutral-600 mt-0.5">
                                {k.fulfillment?.trackingNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">
                              Not dispatched
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetails(k)}
                              className="h-7 px-2 text-[11px] font-bold text-neutral-600 hover:text-neutral-900"
                            >
                              View
                            </Button>

                            {fulfillStatus === "PENDING_DISPATCH" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenDispatch(k)}
                                className="h-7 px-2.5 text-[11px] font-bold bg-[#00C853] hover:bg-[#00B248] text-black"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Dispatch
                              </Button>
                            )}

                            {fulfillStatus === "DISPATCHED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkDelivered(k)}
                                className="h-7 px-2.5 text-[11px] font-bold border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Delivered
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Dispatch Dialog Modal */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2 text-neutral-900">
              <Truck className="w-4 h-4 text-emerald-600" />
              Dispatch Captain Delivery Kit
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Record courier or direct hub handover details for Captain{" "}
              <strong>{selectedKit?.riderName}</strong> ({selectedKit?.riderPhone}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Selected Size:</span>
                <span className="font-bold text-neutral-900">{selectedKit?.tshirtSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Delivery Preference:</span>
                <span className="font-bold text-neutral-900">
                  {selectedKit?.deliveryPreference === "hub_pickup" ? "Hub Pickup" : "Home Delivery"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Status:</span>
                <span className="font-bold text-emerald-700">{selectedKit?.payment?.status}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 mb-1 block">
                Courier Partner / Handover Mode *
              </label>
              <Input
                type="text"
                placeholder="e.g. DTDC Express, Blue Dart, Hub Handover"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 mb-1 block">
                Tracking Number / Handover Challan ID *
              </label>
              <Input
                type="text"
                placeholder="e.g. DTDC-77492842 or CH-001"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 mb-1 block">
                Dispatch Remarks / Package Note
              </label>
              <Textarea
                placeholder="Optional notes e.g. Packaged in green box with 2 T-shirts and bag."
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDispatchModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDispatch}
              disabled={dispatchMutation.isPending}
              className="text-xs font-bold bg-[#00C853] hover:bg-[#00B248] text-black"
            >
              {dispatchMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Confirm Dispatch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Details Dialog Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Delivery Kit Order Details
            </DialogTitle>
          </DialogHeader>

          {selectedKit && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl space-y-2 border border-neutral-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Order ID:</span>
                  <span className="font-mono font-bold text-neutral-900">{selectedKit._id || selectedKit.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Captain Name:</span>
                  <span className="font-bold text-neutral-900">{selectedKit.riderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Mobile Phone:</span>
                  <span className="font-bold text-neutral-900 font-mono">{selectedKit.riderPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Operating City:</span>
                  <span className="font-bold text-neutral-900">{selectedKit.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">T-Shirt Size:</span>
                  <span className="font-bold text-neutral-900">{selectedKit.tshirtSize}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl space-y-2 border border-emerald-200 text-emerald-950">
                <div className="flex justify-between font-bold">
                  <span>Payment Type:</span>
                  <span>{selectedKit.pricing?.paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Kit Price:</span>
                  <span>₹{selectedKit.pricing?.totalKitPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid Now:</span>
                  <span className="font-bold text-emerald-800">₹{selectedKit.pricing?.amountPaid}</span>
                </div>
                {selectedKit.pricing?.paymentType === "PART_PAYMENT" && (
                  <div className="flex justify-between text-amber-900">
                    <span>Remaining Debt:</span>
                    <span className="font-bold">
                      ₹{selectedKit.pricing?.remainingBalance} (₹{selectedKit.pricing?.installmentWeeklyDeduction}/wk)
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-emerald-200/60 font-mono text-[10px]">
                  <span>Razorpay ID:</span>
                  <span>{selectedKit.payment?.razorpayPaymentId || selectedKit.payment?.razorpayOrderId}</span>
                </div>
              </div>

              {selectedKit.fulfillment?.trackingNumber && (
                <div className="p-3 bg-sky-50 rounded-xl space-y-1.5 border border-sky-200 text-sky-950">
                  <div className="flex justify-between font-bold">
                    <span>Courier:</span>
                    <span>{selectedKit.fulfillment?.courierName}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Tracking:</span>
                    <span>{selectedKit.fulfillment?.trackingNumber}</span>
                  </div>
                  {selectedKit.fulfillment?.notes && (
                    <p className="text-[11px] text-sky-800 italic mt-1">
                      "{selectedKit.fulfillment?.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
