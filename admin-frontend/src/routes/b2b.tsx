import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Scale,
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  IndianRupee,
  Phone,
  MapPin,
  ExternalLink,
  Calendar,
  ShieldCheck,
  Plus,
  Download,
  MessageSquare,
  Check,
  Layers,
  Tag,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  XCircle,
  Eye,
  CreditCard,
  Building,
  Mail,
  Copy,
  Printer,
  Briefcase,
  Sparkles,
  BadgeCheck,
  User,
  Hash,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import {
  fetchB2BStats,
  fetchB2BClients,
  fetchB2BOrders,
  fetchB2BInvoices,
  updateB2BContract,
  createB2BClient,
  createB2BOrder,
  assignB2BOrderLogistics,
  recordB2BWeighIn,
  updateB2BOrderStatus,
  generateB2BInvoice,
  recordB2BPayment,
  getB2BInvoicePdfUrl,
  scheduleB2BTrial,
  convertB2BLeadToContract,
  type B2BClient,
  type B2BOrder,
  type B2BInvoice,
} from "../api/b2b-admin-api";

export const Route = createFileRoute("/b2b")({
  beforeLoad: requireAdminSession,
  ssr: false,
  head: () =>
    adminHead(
      "B2B Enterprise Operations",
      "Manage commercial contracts, hotel & hospital linen rate cards, cargo logistics, dual weigh-in scales, and monthly GST tax invoicing."
    ),
  component: B2BEnterprisePage,
  errorComponent: ({ error }) => (
    <AdminShell title="B2B Enterprise Hub">
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 m-6">
        <h3 className="text-lg font-bold">B2B Enterprise Hub Error</h3>
        <p className="text-xs text-rose-500 mt-1">{String((error as Error)?.message || error)}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-rose-600 text-white font-bold text-xs">
          Reload Page
        </Button>
      </div>
    </AdminShell>
  ),
});

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function B2BEnterprisePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"clients" | "orders" | "invoices" | "leads">("clients");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog States
  const [selectedClientForContract, setSelectedClientForContract] = useState<B2BClient | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedOrderForLogistics, setSelectedOrderForLogistics] = useState<B2BOrder | null>(null);
  const [selectedOrderForWeighIn, setSelectedOrderForWeighIn] = useState<B2BOrder | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<B2BInvoice | null>(null);
  const [selectedLeadForTrial, setSelectedLeadForTrial] = useState<B2BClient | null>(null);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<B2BClient | null>(null);
  const [selectedClientForDossier, setSelectedClientForDossier] = useState<B2BClient | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["b2b-admin-stats"],
    queryFn: fetchB2BStats,
    refetchInterval: 30000,
  });

  const { data: clientsData, isLoading: clientsLoading, refetch: refetchClients } = useQuery({
    queryKey: ["b2b-admin-clients", searchQuery, categoryFilter, statusFilter],
    queryFn: () => fetchB2BClients({ query: searchQuery, category: categoryFilter, status: statusFilter }),
  });

  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["b2b-admin-orders", statusFilter],
    queryFn: () => fetchB2BOrders({ status: statusFilter }),
  });

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ["b2b-admin-invoices", statusFilter],
    queryFn: () => fetchB2BInvoices({ status: statusFilter }),
  });

  const clients = useMemo(() => clientsData?.items || [], [clientsData]);
  const orders = useMemo(() => ordersData?.items || [], [ordersData]);
  const invoices = useMemo(() => invoicesData?.items || [], [invoicesData]);

  // Inbound leads (status != CONTRACT_ACTIVE)
  const leads = useMemo(
    () => clients.filter((c) => c.status !== "CONTRACT_ACTIVE"),
    [clients]
  );
  const contractedClients = useMemo(
    () => clients.filter((c) => c.status === "CONTRACT_ACTIVE"),
    [clients]
  );

  const handleRefreshAll = () => {
    refetchStats();
    refetchClients();
    refetchOrders();
    refetchInvoices();
    toast.success("B2B Enterprise data refreshed");
  };

  return (
    <AdminShell
      title="B2B Enterprise Operations"
      description="Command center for commercial laundry contracts, hotel & hospital linen pricing, cargo logistics, scale dual weigh-in, and GST tax invoicing."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="h-9 gap-1.5 text-xs font-semibold text-zinc-700 bg-white border-zinc-300 hover:bg-zinc-50"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewOrderOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Truck className="size-3.5" />
            New Bulk Dispatch
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewClientOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            <Plus className="size-3.5" />
            Onboard Corporate Client
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        {/* =========================================================================
            1. TOP COMMERCIAL KPI SUMMARY RIBBON (5 Real-Time Operational Cards)
        ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Active Corporate Clients"
            value={statsLoading ? "—" : `${stats?.activeAccounts || contractedClients.length} Accounts`}
            change={`${stats?.totalClientsCount || clients.length} total institutions registered`}
            trend="up"
            icon={<Building2 className="size-5 text-emerald-600" />}
          />
          <KpiCard
            title="Today's Commercial Volume"
            value={statsLoading ? "—" : `${stats?.todayVolumeKg || 0} kg`}
            change="Across active commercial hubs"
            trend="up"
            icon={<Scale className="size-5 text-indigo-600" />}
          />
          <KpiCard
            title="Monthly Commercial GMV"
            value={statsLoading ? "—" : formatCurrency(stats?.monthlyBillingGmv || 0)}
            change="Billed in current cycle (MTD)"
            trend="up"
            icon={<IndianRupee className="size-5 text-emerald-600" />}
          />
          <KpiCard
            title="Outstanding Receivables (A/R)"
            value={statsLoading ? "—" : formatCurrency(stats?.outstandingAr || 0)}
            change={`${invoices.filter((i) => i.status !== "PAID").length} pending GST invoices`}
            trend={Number(stats?.outstandingAr || 0) > 50000 ? "down" : "neutral"}
            icon={<AlertCircle className="size-5 text-amber-600" />}
          />
          <KpiCard
            title="Active Cargo Dispatches"
            value={statsLoading ? "—" : `${stats?.activeCargoDispatches || 0} In-Transit`}
            change="Vans & 3-wheelers on road"
            trend="neutral"
            icon={<Truck className="size-5 text-blue-600" />}
          />
        </div>

        {/* =========================================================================
            2. MAIN TABS NAVIGATION
        ========================================================================= */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-3">
            <TabsList className="bg-zinc-100 p-1 rounded-xl">
              <TabsTrigger value="clients" className="text-xs font-bold gap-2 px-4 py-2">
                <Building2 className="size-4" />
                Commercial Clients ({contractedClients.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs font-bold gap-2 px-4 py-2">
                <Truck className="size-4" />
                Live Bulk Orders ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs font-bold gap-2 px-4 py-2">
                <FileText className="size-4" />
                GST Invoices & A/R ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="leads" className="text-xs font-bold gap-2 px-4 py-2">
                <TrendingUp className="size-4" />
                Inbound Leads Pipeline ({leads.length})
              </TabsTrigger>
            </TabsList>

            {/* Quick Search & Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients, GSTIN, order #..."
                  className="pl-9 h-8 text-xs w-56 bg-white border-zinc-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              TAB 1: COMMERCIAL CLIENTS & CONTRACTS
          ========================================================================= */}
          {activeTab === "clients" && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Industry:</span>
                  {["all", "Hotel", "Hospital", "Hostel", "Restaurant", "Salon", "Corporate"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                        categoryFilter === cat
                          ? "bg-zinc-900 text-white font-bold"
                          : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {cat === "all" ? "All Verticals" : cat}
                    </button>
                  ))}
                </div>
              </div>

              {clientsLoading ? (
                <div className="p-12 text-center text-zinc-500 text-xs">Loading commercial clients directory...</div>
              ) : contractedClients.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
                  <Building2 className="size-12 text-zinc-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-800">No active commercial contracts found</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Institutional accounts like hotels, hospitals, and student hostels will appear here once contracts are activated.
                  </p>
                  <Button
                    onClick={() => setIsNewClientOpen(true)}
                    className="mt-4 text-xs font-semibold bg-zinc-900 text-white"
                  >
                    Onboard First Client
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contractedClients.map((client) => {
                    const contract = client.contract || ({} as any);
                    const limit = contract.creditLimit || 50000;
                    const balance = client.currentBalance || 0;
                    const utilPercent = Math.min(100, Math.round((balance / limit) * 100));
                    const isHoldTriggered = contract.autoHoldEnabled && balance > limit;

                    return (
                      <div
                        key={client.b2bId || client.id}
                        className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs hover:shadow-md transition space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 tracking-wider">
                                {client.category || "Commercial"}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {client.b2bId}
                              </span>
                            </div>
                            <h4 className="font-bold text-zinc-900 text-base mt-1.5">{client.businessName}</h4>
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3 text-zinc-400 shrink-0" />
                              {client.address}, {client.city}
                            </p>
                          </div>
                          <StatusPill value={client.status} />
                        </div>

                        {/* GSTIN & Contact Info */}
                        <div className="bg-zinc-50 rounded-xl p-3 text-xs space-y-1.5 border border-zinc-100">
                          <div className="flex justify-between items-center text-zinc-600">
                            <span className="text-[11px] font-medium text-zinc-500">GSTIN:</span>
                            <span className="font-mono font-semibold text-zinc-800">{client.gstin || "Exempt / Pending"}</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-600">
                            <span className="text-[11px] font-medium text-zinc-500">Contact:</span>
                            <span className="font-medium text-zinc-800">{client.contactName} ({client.phone})</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-600">
                            <span className="text-[11px] font-medium text-zinc-500">Processing Hub:</span>
                            <span className="font-semibold text-zinc-800">{client.assignedHubName || "Central Commercial Hub"}</span>
                          </div>
                        </div>

                        {/* Rate Card & Credit Terms Badge */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Base Rate</span>
                            <span className="text-sm font-black text-zinc-900">
                              ₹{contract.baseRatePerKg || 32}/kg
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Terms</span>
                            <span className="text-xs font-bold text-zinc-700">
                              {contract.creditTerms || "Net 15 Days"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">SLA</span>
                            <span className="text-xs font-bold text-emerald-700">
                              {client.sla || "24h Express"}
                            </span>
                          </div>
                        </div>

                        {/* Credit Utilization Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-medium text-zinc-500">
                              Credit: {formatCurrency(balance)} / {formatCurrency(limit)}
                            </span>
                            <span className={`text-[10px] font-black ${isHoldTriggered ? "text-rose-600 flex items-center gap-1" : "text-zinc-600"}`}>
                              {isHoldTriggered ? (
                                <>
                                  <AlertTriangle className="size-3 text-rose-600 shrink-0" />
                                  <span>HOLD ACTIVE</span>
                                </>
                              ) : (
                                `${utilPercent}% Used`
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHoldTriggered ? "bg-rose-500" : utilPercent > 80 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${utilPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClientForDossier(client)}
                            className="h-8 px-2.5 text-xs font-bold text-zinc-900 border-zinc-300 bg-zinc-50 hover:bg-zinc-100 cursor-pointer"
                            title="View Full Form Record & Complete Dossier"
                          >
                            <Eye className="size-3.5 mr-1 text-zinc-600" />
                            <span>Full Record</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClientForContract(client)}
                            className="flex-1 h-8 text-xs font-semibold text-zinc-700 border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                          >
                            Rates
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClientForInvoice(client)}
                            className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                          >
                            Bill GST
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 2: LIVE BULK ORDERS & CARGO LOGISTICS
          ========================================================================= */}
          {activeTab === "orders" && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status:</span>
                  {["all", "SCHEDULED", "DISPATCHED_PICKUP", "PICKED_UP", "AT_HUB_PROCESSING", "READY_FOR_DELIVERY", "DELIVERED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                        statusFilter === st
                          ? "bg-zinc-900 text-white font-bold"
                          : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {st === "all" ? "All Orders" : st.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewOrderOpen(true)}
                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="size-3.5 mr-1" />
                  Schedule Pickup
                </Button>
              </div>

              {ordersLoading ? (
                <div className="p-12 text-center text-zinc-500 text-xs">Loading commercial bulk orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
                  <Truck className="size-12 text-zinc-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-800">No commercial bulk orders found</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Daily institutional pickup orders with multi-bag QR codes and scale weigh-in tracking will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const isVarianceAlert = order.varianceStatus === "ALERT";
                    const isDelivered = order.status === "DELIVERED";

                    return (
                      <div
                        key={order.orderCode || order.id}
                        className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs hover:border-zinc-300 transition space-y-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-zinc-900">
                                {order.orderCode}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                                {order.category}
                              </span>
                              <StatusPill value={order.status} />
                              {isVarianceAlert && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 flex items-center gap-1">
                                  <AlertTriangle className="size-3" />
                                  Scale Variance {order.variancePercent}%
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-zinc-800 text-sm">{order.businessName}</h4>
                            <p className="text-xs text-zinc-500 flex items-center gap-3">
                              <span>Slot: {order.pickupDate} ({order.pickupSlot})</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{order.sla}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrderForLogistics(order)}
                              className="h-8 text-xs font-semibold text-zinc-700 border-zinc-200"
                            >
                              <Truck className="size-3.5 mr-1 text-blue-600" />
                              Assign Driver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrderForWeighIn(order)}
                              className="h-8 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50"
                            >
                              <Scale className="size-3.5 mr-1" />
                              Record Scale
                            </Button>
                            {!isDelivered && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkDelivered(order.orderCode)}
                                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="size-3.5 mr-1" />
                                Delivery POD
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Scale Verification & Bag Barcodes Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100 text-xs">
                          {/* Weigh-in Dual Reading */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Scale Weigh-In</span>
                            <div className="mt-1 space-y-0.5">
                              <p className="text-zinc-600">
                                Doorstep Scale: <span className="font-bold text-zinc-900">{order.doorstepScaleKg ? `${order.doorstepScaleKg} kg` : "Pending"}</span>
                              </p>
                              <p className="text-zinc-600">
                                Hub Net Scale: <span className="font-bold text-zinc-900">{order.netKg ? `${order.netKg} kg (Net)` : "Pending"}</span>
                              </p>
                              {order.variancePercent !== undefined && order.variancePercent > 0 && (
                                <p className={`text-[11px] font-bold ${isVarianceAlert ? "text-rose-600" : "text-emerald-700"}`}>
                                  Variance: {order.variancePercent}% ({order.varianceStatus})
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Multi-Bag Barcodes */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                              Sealed Bags Custody ({order.bagCount || 1} Bags)
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(order.bagBarcodes || []).map((code) => (
                                <span
                                  key={code}
                                  className="font-mono text-[10px] font-semibold bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-700"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Assigned Logistics Info */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Dispatched Logistics</span>
                            <div className="mt-1 space-y-0.5">
                              <p className="font-bold text-zinc-900 flex items-center gap-1.5">
                                <Truck className="size-3 text-zinc-500" />
                                {order.assignedDriver?.name || "Unassigned Fleet Desk"}
                                <span className="text-[10px] uppercase px-1 py-0.2 rounded bg-zinc-200 text-zinc-700">
                                  {order.assignedDriver?.vehicleType || "cargo"}
                                </span>
                              </p>
                              <p className="text-zinc-500 text-[11px]">
                                Hub: {order.assignedHub?.name || "Central Commercial Hub"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Proof of Delivery Details if Completed */}
                        {order.pod && (
                          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="size-4 text-emerald-700" />
                              <span className="font-semibold text-emerald-900">
                                Handed over to Storekeeper: {order.pod.storekeeperName}
                              </span>
                            </div>
                            <span className="text-emerald-700 font-mono text-[11px]">
                              {order.pod.deliveredAt?.slice(0, 16).replace("T", " ")}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: MONTHLY GST INVOICES & ACCOUNTS RECEIVABLE (A/R)
          ========================================================================= */}
          {activeTab === "invoices" && (
            <div className="space-y-4 pt-4">
              {/* Aging Buckets Summary Ribbon */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">0–15 Days (Current)</span>
                  <span className="text-base font-black text-emerald-700">
                    {formatCurrency(stats?.agingBuckets?.current_0_15 || 0)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">16–30 Days (Due Soon)</span>
                  <span className="text-base font-black text-amber-600">
                    {formatCurrency(stats?.agingBuckets?.due_16_30 || 0)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">31–60 Days (Overdue)</span>
                  <span className="text-base font-black text-rose-600">
                    {formatCurrency(stats?.agingBuckets?.overdue_31_60 || 0)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">&gt;60 Days (Critical)</span>
                  <span className="text-base font-black text-rose-700">
                    {formatCurrency(stats?.agingBuckets?.critical_60_plus || 0)}
                  </span>
                </div>
              </div>

              {invoicesLoading ? (
                <div className="p-12 text-center text-zinc-500 text-xs">Loading GST tax invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
                  <FileText className="size-12 text-zinc-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-800">No commercial invoices generated yet</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Compiled monthly invoices for institutional clients with HSN 9987 and 18% GST will appear here.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Invoice # & Client</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4 text-right">Volume (Kg)</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-right">18% GST</th>
                        <th className="py-3 px-4 text-right">Grand Total</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {invoices.map((inv) => {
                        const isPaid = inv.status === "PAID";
                        return (
                          <tr key={inv.invoiceNumber || inv.id} className="hover:bg-zinc-50 transition">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-zinc-900 block">{inv.invoiceNumber}</span>
                              <span className="text-zinc-600 font-medium">{inv.businessName}</span>
                              <span className="text-[10px] text-zinc-400 block font-mono">
                                GSTIN: {inv.gstin || "Exempt"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-600 font-medium">
                              {inv.billingPeriod}
                              <span className="block text-[10px] text-zinc-400">
                                Due: {inv.dueDate?.slice(0, 10)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-zinc-800">
                              {inv.totalKg} kg
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-zinc-700">
                              {formatCurrency(inv.subtotal)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-zinc-500">
                              {formatCurrency(inv.taxTotal)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-zinc-900">
                              {formatCurrency(inv.totalAmount)}
                              {!isPaid && (
                                <span className="block text-[10px] text-rose-600 font-bold">
                                  Due: {formatCurrency(inv.balanceDue || inv.totalAmount)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <StatusPill value={inv.status} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={getB2BInvoicePdfUrl(inv.invoiceNumber)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold text-[11px]"
                                >
                                  <Download className="size-3" />
                                  PDF
                                </a>
                                {!isPaid && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendWhatsAppReminder(inv)}
                                      className="h-7 px-2 text-[11px] font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                    >
                                      <MessageSquare className="size-3 mr-1" />
                                      WhatsApp
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => setSelectedInvoiceForPayment(inv)}
                                      className="h-7 px-2 text-[11px] font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
                                    >
                                      Record UTR
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 4: INBOUND LEADS PIPELINE
          ========================================================================= */}
          {activeTab === "leads" && (
            <div className="space-y-4 pt-4">
              {leads.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
                  <TrendingUp className="size-12 text-zinc-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-zinc-800">No active inbound leads</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    New inquiries submitted by hotels and commercial businesses from the public B2B portal will arrive here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map((lead) => (
                    <div
                      key={lead.b2bId || lead.id}
                      className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs hover:shadow-md transition space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                              {lead.category}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {lead.b2bId}
                            </span>
                          </div>
                          <h4 className="font-bold text-zinc-900 text-base mt-1.5">{lead.businessName}</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {lead.contactName} ({lead.designation || "Representative"})
                          </p>
                        </div>
                        <StatusPill value={lead.status} />
                      </div>

                      {/* Lead Details */}
                      <div className="bg-zinc-50 rounded-xl p-3 text-xs space-y-1.5 border border-zinc-100">
                        <div className="flex justify-between items-center text-zinc-600">
                          <span className="text-zinc-500">Expected Volume:</span>
                          <span className="font-bold text-zinc-800">{lead.dailyVolume || "150-300 kg/day"}</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-600">
                          <span className="text-zinc-500">Frequency:</span>
                          <span className="font-medium text-zinc-800">{lead.frequency || "Daily 1x"}</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-600">
                          <span className="text-zinc-500">Phone / WhatsApp:</span>
                          <span className="font-semibold text-zinc-800">{lead.phone}</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-600">
                          <span className="text-zinc-500">City / Gate Address:</span>
                          <span className="font-medium text-zinc-800 truncate max-w-[160px]">{lead.address}, {lead.city}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClientForDossier(lead)}
                          className="h-8 px-2.5 text-xs font-bold text-zinc-900 border-zinc-300 bg-zinc-50 hover:bg-zinc-100 cursor-pointer"
                          title="View Full Form Record & Audit Dossier"
                        >
                          <Eye className="size-3.5 mr-1 text-zinc-600" />
                          <span>Full Record</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLeadForTrial(lead)}
                          className="flex-1 h-8 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                        >
                          <Calendar className="size-3 mr-1" />
                          Trial (20kg)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConvertLead(lead.b2bId)}
                          className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          <Check className="size-3 mr-1" />
                          Activate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Tabs>

        {/* =========================================================================
            MODAL 1: CONFIGURE CONTRACT & DYNAMIC RATE CARDS
        ========================================================================= */}
        {selectedClientForContract && (
          <ContractConfigModal
            client={selectedClientForContract}
            onClose={() => setSelectedClientForContract(null)}
            onSuccess={() => {
              setSelectedClientForContract(null);
              refetchClients();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 2: ONBOARD NEW CORPORATE CLIENT (ADMIN DIRECT)
        ========================================================================= */}
        {isNewClientOpen && (
          <NewClientModal
            onClose={() => setIsNewClientOpen(false)}
            onSuccess={() => {
              setIsNewClientOpen(false);
              refetchClients();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 3: SCHEDULE BULK PICKUP ORDER
        ========================================================================= */}
        {isNewOrderOpen && (
          <NewOrderModal
            clients={contractedClients}
            onClose={() => setIsNewOrderOpen(false)}
            onSuccess={() => {
              setIsNewOrderOpen(false);
              refetchOrders();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 4: ASSIGN LOGISTICS (DRIVER & HUB)
        ========================================================================= */}
        {selectedOrderForLogistics && (
          <AssignLogisticsModal
            order={selectedOrderForLogistics}
            onClose={() => setSelectedOrderForLogistics(null)}
            onSuccess={() => {
              setSelectedOrderForLogistics(null);
              refetchOrders();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 5: RECORD DUAL SCALE WEIGH-IN
        ========================================================================= */}
        {selectedOrderForWeighIn && (
          <RecordWeighInModal
            order={selectedOrderForWeighIn}
            onClose={() => setSelectedOrderForWeighIn(null)}
            onSuccess={() => {
              setSelectedOrderForWeighIn(null);
              refetchOrders();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 6: RECORD OFFLINE BANK PAYMENT (UTR)
        ========================================================================= */}
        {selectedInvoiceForPayment && (
          <RecordPaymentModal
            invoice={selectedInvoiceForPayment}
            onClose={() => setSelectedInvoiceForPayment(null)}
            onSuccess={() => {
              setSelectedInvoiceForPayment(null);
              refetchInvoices();
              refetchStats();
              refetchClients();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 7: SCHEDULE 20 KG FREE COMMERCIAL TRIAL
        ========================================================================= */}
        {selectedLeadForTrial && (
          <ScheduleTrialModal
            lead={selectedLeadForTrial}
            onClose={() => setSelectedLeadForTrial(null)}
            onSuccess={() => {
              setSelectedLeadForTrial(null);
              refetchClients();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 8: GENERATE GST B2B INVOICE
        ========================================================================= */}
        {selectedClientForInvoice && (
          <GenerateInvoiceModal
            client={selectedClientForInvoice}
            onClose={() => setSelectedClientForInvoice(null)}
            onSuccess={() => {
              setSelectedClientForInvoice(null);
              refetchInvoices();
              refetchClients();
              refetchStats();
            }}
          />
        )}

        {/* =========================================================================
            MODAL 9: 360° CLIENT DOSSIER & FULL FORM RECORD
        ========================================================================= */}
        {selectedClientForDossier && (
          <B2BClientDossierModal
            client={selectedClientForDossier}
            onClose={() => setSelectedClientForDossier(null)}
            onScheduleTrial={(c) => {
              setSelectedLeadForTrial(c);
              setSelectedClientForDossier(null);
            }}
            onConfigureRates={(c) => {
              setSelectedClientForContract(c);
              setSelectedClientForDossier(null);
            }}
            onGenerateInvoice={(c) => {
              setSelectedClientForInvoice(c);
              setSelectedClientForDossier(null);
            }}
            onConvertLead={async (b2bId) => {
              await handleConvertLead(b2bId);
              setSelectedClientForDossier(null);
            }}
          />
        )}
      </div>
    </AdminShell>
  );

  // Helper actions
  async function handleConvertLead(b2bId: string) {
    try {
      await convertB2BLeadToContract(b2bId);
      toast.success("Lead converted to Active Contract with dynamic rate cards!");
      refetchClients();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed to convert lead");
    }
  }

  async function handleMarkDelivered(orderCode: string) {
    const storekeeper = prompt("Enter storekeeper name for delivery bay handover signoff:", "Dinesh Kumar (Housekeeping)");
    if (!storekeeper) return;
    try {
      await updateB2BOrderStatus(orderCode, "DELIVERED");
      toast.success(`Order ${orderCode} marked Delivered with handover proof!`);
      refetchOrders();
      refetchStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update order status");
    }
  }

  function handleSendWhatsAppReminder(inv: B2BInvoice) {
    const phone = inv.phone?.replace(/[^0-9]/g, "") || "";
    const cleanPhone = phone.startsWith("91") ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `Dear ${inv.businessName},\n\nThis is a friendly reminder regarding Tax Invoice *${inv.invoiceNumber}* for ${inv.billingPeriod} linen services.\n\nTotal Due: *₹${inv.balanceDue || inv.totalAmount}*\nDue Date: *${inv.dueDate?.slice(0, 10)}*\n\nPlease transfer via RTGS/NEFT using Invoice #${inv.invoiceNumber} as payment reference.\n\nThank you,\nQuickPress Enterprise Operations Desk`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  }
}

// -----------------------------------------------------------------------------
// Sub-Modals
// -----------------------------------------------------------------------------

function B2BClientDossierModal({
  client,
  onClose,
  onScheduleTrial,
  onConfigureRates,
  onGenerateInvoice,
  onConvertLead,
}: {
  client: B2BClient;
  onClose: () => void;
  onScheduleTrial: (client: B2BClient) => void;
  onConfigureRates: (client: B2BClient) => void;
  onGenerateInvoice: (client: B2BClient) => void;
  onConvertLead: (b2bId: string) => void;
}) {
  const contract = client.contract || ({} as any);
  const isLead = client.status === "NEW_INQUIRY" || client.status === "CONTACTED" || client.status === "TRIAL_SCHEDULED";

  function copyText(val: string, label: string) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success(`${label} copied to clipboard!`);
  }

  const cleanPhone = (client.phone || "").replace(/[^0-9]/g, "");
  const whatsappNumber = (client.whatsapp || client.phone || "").replace(/[^0-9]/g, "");
  const cleanWa = whatsappNumber.startsWith("91") ? whatsappNumber : `91${whatsappNumber}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border border-zinc-200 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-zinc-200 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-zinc-900 text-white tracking-wider">
                  {client.category || "Commercial Entity"}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {client.b2bId}
                </span>
                <StatusPill value={client.status} />
              </div>
              <DialogTitle className="text-xl font-black text-zinc-900 mt-2 flex items-center gap-2">
                <Building2 className="size-5 text-emerald-600 shrink-0" />
                <span>{client.businessName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                <span>Submitted on {client.createdAt ? new Date(client.createdAt).toLocaleString("en-IN") : "Recent"}</span>
                <span>•</span>
                <span>Account Manager: {client.accountManager || "Enterprise Operations Desk"}</span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 px-2.5 text-xs font-semibold text-zinc-700 border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer"
              >
                <Printer className="size-3.5 mr-1" />
                <span>Print Dossier</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-zinc-50/50">
          {/* Grid Row 1: Facility Location & Authorized SPOC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Facility Location */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 pb-2">
                <MapPin className="size-4 text-emerald-600" />
                <span>Commercial Facility & Receiving Dock</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Gate / Receiving Dock Address</span>
                  <span className="font-semibold text-zinc-900">{client.address || "Main Reception / Security Gate"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Operating City</span>
                    <span className="font-bold text-zinc-800">{client.city}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Postal Pincode</span>
                    <span className="font-mono font-bold text-zinc-800">{client.pincode}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Facility Scale / Units</span>
                    <span className="font-semibold text-zinc-800">{client.unitsCount || "Single Unit"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Processing Hub</span>
                    <span className="font-semibold text-zinc-800">{client.assignedHubName || "Central Commercial Hub"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Authorized SPOC */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 pb-2">
                <User className="size-4 text-emerald-600" />
                <span>Authorized SPOC & Communication</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Key Contact Person</span>
                  <span className="font-bold text-zinc-900 text-sm">{client.contactName}</span>
                  <span className="text-zinc-500 text-[11px] block">{client.designation || "Authorized Representative"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-zinc-400 block text-[11px]">Mobile Phone</span>
                    <a
                      href={`tel:${cleanPhone}`}
                      className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="size-3" />
                      <span>{client.phone}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[11px]">WhatsApp Hotline</span>
                    <a
                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hello ${client.contactName}, regarding your QuickPress Commercial Bulk Laundry account (${client.b2bId})`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <MessageSquare className="size-3" />
                      <span>{client.whatsapp || client.phone}</span>
                    </a>
                  </div>
                </div>
                <div className="pt-1 border-t border-zinc-100">
                  <span className="text-zinc-400 block text-[11px]">Official Email</span>
                  <a
                    href={`mailto:${client.email}?subject=${encodeURIComponent(`QuickPress Commercial Account - ${client.businessName} (${client.b2bId})`)}`}
                    className="font-medium text-emerald-700 hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Row 2: Commercial Laundry Scope & Logistics */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Truck className="size-4 text-emerald-600" />
                <span>Commercial Laundry Scope & Logistics Specifications</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                SLA: {client.sla || contract.sla || "24 Hours Express Standard"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                <span className="text-zinc-500 block text-[11px]">Estimated Daily Volume</span>
                <span className="text-base font-black text-zinc-900 mt-0.5 block">{client.dailyVolume || "150-300 kg/day"}</span>
              </div>
              <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                <span className="text-zinc-500 block text-[11px]">Linen Pickup Frequency</span>
                <span className="text-sm font-bold text-zinc-800 mt-0.5 block">{client.frequency || "Daily Morning"}</span>
              </div>
              <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                <span className="text-zinc-500 block text-[11px]">Base Contract Tariff</span>
                <span className="text-base font-black text-emerald-700 mt-0.5 block">₹{contract.baseRatePerKg || 32}/kg</span>
              </div>
            </div>

            {/* Services Requested Pills */}
            <div className="pt-2">
              <span className="text-zinc-500 block text-[11px] font-bold uppercase tracking-wider mb-1.5">
                Services & Garment Treatments Required:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(client.services && client.services.length > 0
                  ? client.services
                  : ["Wash & Fold Commercial Linen", "High-Pressure Steam Press", "Roller Flatwork Ironing"]
                ).map((srv) => (
                  <span
                    key={srv}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200"
                  >
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    <span>{srv}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Row 3: Statutory Tax Compliance & Credit Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 3: Tax Compliance */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 pb-2">
                <Receipt className="size-4 text-emerald-600" />
                <span>Statutory Compliance & Identifiers</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px]">15-Digit GST Identification Number (GSTIN)</span>
                  <div className="flex items-center justify-between mt-0.5 p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <span className="font-mono font-bold text-zinc-900 tracking-wider">
                      {client.gstin || "EXEMPT / PENDING VERIFICATION"}
                    </span>
                    {client.gstin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyText(client.gstin!, "GSTIN")}
                        className="h-6 w-6 text-zinc-500 hover:text-zinc-900"
                      >
                        <Copy className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px]">Permanent Account Number (PAN)</span>
                  <div className="flex items-center justify-between mt-0.5 p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <span className="font-mono font-bold text-zinc-900 tracking-wider">
                      {client.pan || "NOT PROVIDED"}
                    </span>
                    {client.pan && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyText(client.pan!, "PAN")}
                        className="h-6 w-6 text-zinc-500 hover:text-zinc-900"
                      >
                        <Copy className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px]">Commercial Invoicing Model</span>
                  <span className="font-semibold text-zinc-800 block mt-0.5">
                    {client.billingModel || "Per-Kg Consolidated Weighment Tariff"}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 4: Credit Terms & Balances */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 pb-2">
                <CreditCard className="size-4 text-emerald-600" />
                <span>Credit Terms & Outstanding Float</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-50 rounded-lg p-2 border border-zinc-100">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Payment Credit Terms</span>
                    <span className="font-black text-zinc-900 text-sm mt-0.5 block">
                      {client.creditTerms || contract.creditTerms || "Net 15 Days"}
                    </span>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-2 border border-zinc-100">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Billing Cycle</span>
                    <span className="font-black text-zinc-900 text-sm mt-0.5 block">
                      {contract.billingCycle || "MONTHLY"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-emerald-50/50 rounded-lg p-2 border border-emerald-100">
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Approved Credit Limit</span>
                    <span className="font-black text-emerald-900 text-sm mt-0.5 block">
                      {formatCurrency(contract.creditLimit || 50000)}
                    </span>
                  </div>
                  <div className="bg-amber-50/50 rounded-lg p-2 border border-amber-100">
                    <span className="text-amber-700 block text-[10px] uppercase font-bold">Current Unpaid Balance</span>
                    <span className="font-black text-amber-900 text-sm mt-0.5 block">
                      {formatCurrency(client.currentBalance || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-zinc-500 text-[11px]">
                  <span>Total Delivered Cargo Orders:</span>
                  <span className="font-black text-zinc-900">{client.totalOrdersCount || 0} batches ({client.totalVolumeKg || 0} kg)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Row 4: Free Commercial Pilot Trial & Operational Notes */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Sparkles className="size-4 text-emerald-600" />
                <span>Commercial Pilot Trial & Operational Handling</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                client.trialRequested ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-zinc-100 text-zinc-600"
              }`}>
                {client.trialRequested ? "Free 20kg Pilot Trial Requested" : "Standard Direct Onboarding"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Preferred / Scheduled Pilot Trial Date</span>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="size-4 text-indigo-600" />
                  <span className="font-semibold text-zinc-900">
                    {client.trialDate || "Pending Scheduling with Facility Manager"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Special Security, Gate Clearance & Sorting Instructions</span>
                <p className="text-zinc-700 mt-1 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 text-[11px] leading-relaxed">
                  {client.specialNotes || "Standard commercial processing. Barcode tags required on cargo bags at loading dock."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold text-zinc-700 border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer"
            >
              Close Dossier
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isLead ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduleTrial(client)}
                  className="text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                >
                  <Calendar className="size-3.5 mr-1" />
                  <span>Schedule 20kg Trial</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onConvertLead(client.b2bId)}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <Check className="size-3.5 mr-1" />
                  <span>Convert & Activate Contract</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigureRates(client)}
                  className="text-xs font-semibold text-zinc-700 border-zinc-200 bg-white hover:bg-zinc-100 cursor-pointer"
                >
                  <span>Edit Rate Card & Limits</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onGenerateInvoice(client)}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <Receipt className="size-3.5 mr-1" />
                  <span>Generate GST Invoice</span>
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContractConfigModal({
  client,
  onClose,
  onSuccess,
}: {
  client: B2BClient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const contract = client.contract || ({} as any);
  const [baseRate, setBaseRate] = useState<number>(contract.baseRatePerKg || 32);
  const [creditLimit, setCreditLimit] = useState<number>(contract.creditLimit || 50000);
  const [creditTerms, setCreditTerms] = useState<string>(contract.creditTerms || "NET_15_DAYS");
  const [billingCycle, setBillingCycle] = useState<string>(contract.billingCycle || "MONTHLY");
  const [autoHold, setAutoHold] = useState<boolean>(contract.autoHoldEnabled ?? true);
  const [sla, setSla] = useState<string>(client.sla || "24 Hours Express");
  const [assignedHubName, setAssignedHubName] = useState<string>(client.assignedHubName || "Central Commercial Hub");

  // Itemized linen rates
  const [itemized, setItemized] = useState<Record<string, number>>({
    "Single Bed Sheet": contract.itemizedRates?.["Single Bed Sheet"] ?? 20,
    "Double / King Bed Sheet": contract.itemizedRates?.["Double / King Bed Sheet"] ?? 30,
    "Pillow Cover": contract.itemizedRates?.["Pillow Cover"] ?? 7,
    "Bath Towel": contract.itemizedRates?.["Bath Towel"] ?? 12,
    "Bath Mat": contract.itemizedRates?.["Bath Mat"] ?? 15,
    "Duvet / Quilt Cover": contract.itemizedRates?.["Duvet / Quilt Cover"] ?? 45,
    "Uniform / Scrub Set": contract.itemizedRates?.["Uniform / Scrub Set"] ?? 35,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateB2BContract(client.b2bId, {
        baseRatePerKg: Number(baseRate),
        itemizedRates: itemized,
        creditLimit: Number(creditLimit),
        creditTerms,
        billingCycle,
        autoHoldEnabled: autoHold,
        sla,
        assignedHubName,
      });
      toast.success("Contract & Rate Card updated successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="size-5 text-emerald-600" />
            Configure Contract: {client.businessName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Account ID: <span className="font-mono font-bold text-zinc-900">{client.b2bId}</span> | Category: {client.category}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3 text-xs">
          {/* Base Weight Rate & SLA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Flat Base Rate (₹ / kg)</Label>
              <Input
                type="number"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Turnaround SLA</Label>
              <Input
                value={sla}
                onChange={(e) => setSla(e.target.value)}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>

          {/* Credit Terms & Limit */}
          <div className="grid grid-cols-3 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Approved Credit Limit (₹)</Label>
              <Input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="h-8 mt-1 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Credit Terms</Label>
              <select
                value={creditTerms}
                onChange={(e) => setCreditTerms(e.target.value)}
                className="w-full h-8 mt-1 text-xs bg-white border border-zinc-200 rounded-md px-2 font-medium"
              >
                <option value="NET_7_DAYS">Net 7 Days</option>
                <option value="NET_15_DAYS">Net 15 Days</option>
                <option value="NET_30_DAYS">Net 30 Days</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Billing Cycle</Label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full h-8 mt-1 text-xs bg-white border border-zinc-200 rounded-md px-2 font-medium"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BI_WEEKLY">Bi-Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          {/* Auto-Hold Guard Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div>
              <span className="font-bold text-zinc-900 block">Credit Overdue Auto-Hold Guard</span>
              <span className="text-[11px] text-zinc-600">
                Automatically block daily pickups if unpaid invoice balance exceeds approved credit limit.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoHold}
              onChange={(e) => setAutoHold(e.target.checked)}
              className="size-4 text-emerald-600 rounded"
            />
          </div>

          {/* Itemized Commercial Linen Rates */}
          <div>
            <Label className="text-[11px] font-bold text-zinc-700 mb-2 block">
              Itemized Commercial Linen Pricing (₹ / Piece)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(itemized).map(([item, rate]) => (
                <div key={item} className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                  <span className="text-[11px] font-semibold text-zinc-700 block truncate">{item}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-zinc-400 font-bold">₹</span>
                    <Input
                      type="number"
                      value={rate}
                      onChange={(e) =>
                        setItemized({ ...itemized, [item]: Number(e.target.value) })
                      }
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Processing Hub */}
          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Assigned Processing Hub</Label>
            <Input
              value={assignedHubName}
              onChange={(e) => setAssignedHubName(e.target.value)}
              className="h-8 mt-1 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? "Saving..." : "Save Contract Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    businessName: "",
    category: "Hotel",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    city: "Kasganj",
    pincode: "207123",
    gstin: "",
    pan: "",
    dailyVolume: "250 kg/day",
    frequency: "Daily 1x",
    baseRatePerKg: 32,
    creditLimit: 50000,
    creditTerms: "NET_15_DAYS",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.phone.trim()) {
      toast.error("Please enter Business Name and Phone number");
      return;
    }
    setSaving(true);
    try {
      await createB2BClient({
        ...form,
        contract: {
          baseRatePerKg: Number(form.baseRatePerKg),
          creditLimit: Number(form.creditLimit),
          creditTerms: form.creditTerms as any,
          billingCycle: "MONTHLY",
          autoHoldEnabled: true,
          itemizedRates: {},
          addons: {},
          sla: "24 Hours Express",
        },
      });
      toast.success("Institutional client onboarded successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to onboard client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="size-5 text-emerald-600" />
            Onboard Institutional Commercial Client
          </DialogTitle>
          <DialogDescription className="text-xs">
            Directly register an enterprise hotel, hospital, or student hostel contract.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Business / Hotel Name *</Label>
              <Input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Hotel Grand Heritage"
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Industry Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-8 mt-1 text-xs bg-white border border-zinc-200 rounded-md px-2 font-medium"
              >
                <option value="Hotel">Hotel & Hospitality</option>
                <option value="Hospital">Hospital & Healthcare</option>
                <option value="Hostel">Hostel & Student PG</option>
                <option value="Restaurant">Restaurant & Banquet</option>
                <option value="Salon">Salon & Wellness Spa</option>
                <option value="Corporate">Corporate Office</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Contact Person Name</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Facility Manager / GM"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Phone Number *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Corporate Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="accounts@grandheritage.com"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">GSTIN (15-digit)</Label>
              <Input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="09AAACG1234F1Z8"
                className="h-8 mt-1 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-[11px] font-bold text-zinc-700">Delivery Bay / Gate Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Gate 2, Loading Dock, Civil Lines"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Base Rate (₹/kg)</Label>
              <Input
                type="number"
                value={form.baseRatePerKg}
                onChange={(e) => setForm({ ...form, baseRatePerKg: Number(e.target.value) })}
                className="h-8 mt-1 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Credit Limit (₹)</Label>
              <Input
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                className="h-8 mt-1 text-xs bg-white"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Credit Terms</Label>
              <select
                value={form.creditTerms}
                onChange={(e) => setForm({ ...form, creditTerms: e.target.value })}
                className="w-full h-8 mt-1 text-xs bg-white border border-zinc-200 rounded-md px-2"
              >
                <option value="NET_7_DAYS">Net 7 Days</option>
                <option value="NET_15_DAYS">Net 15 Days</option>
                <option value="NET_30_DAYS">Net 30 Days</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={saving}
              className="h-8 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {saving ? "Creating..." : "Create Commercial Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewOrderModal({
  clients,
  onClose,
  onSuccess,
}: {
  clients: B2BClient[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [b2bId, setB2bId] = useState(clients[0]?.b2bId || "");
  const [estimatedKg, setEstimatedKg] = useState(150);
  const [bagCount, setBagCount] = useState(3);
  const [pickupSlot, setPickupSlot] = useState("08:30 AM - 10:30 AM");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2bId) {
      toast.error("Please select a commercial client");
      return;
    }
    setSaving(true);
    try {
      await createB2BOrder({
        b2bId,
        estimatedKg: Number(estimatedKg),
        bagCount: Number(bagCount),
        pickupSlot,
        specialInstructions: instructions,
      });
      toast.success("Bulk order scheduled with multi-bag QR codes");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule bulk order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Truck className="size-5 text-emerald-600" />
            Schedule Commercial Bulk Dispatch
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate sealed custody bag codes and assign logistics pickup.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Commercial Client</Label>
            <select
              value={b2bId}
              onChange={(e) => setB2bId(e.target.value)}
              className="w-full h-8 mt-1 text-xs bg-white border border-zinc-200 rounded-md px-2 font-medium"
            >
              {clients.map((c) => (
                <option key={c.b2bId} value={c.b2bId}>
                  {c.businessName} ({c.b2bId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Estimated Weight (kg)</Label>
              <Input
                type="number"
                value={estimatedKg}
                onChange={(e) => setEstimatedKg(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Sealed Bag Count</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={bagCount}
                onChange={(e) => setBagCount(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Pickup Slot Window</Label>
            <Input
              value={pickupSlot}
              onChange={(e) => setPickupSlot(e.target.value)}
              className="h-8 mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Gate / Bay Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Loading bay entrance, ask for Housekeeping Supervisor"
              className="h-16 text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={saving}
              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Scheduling..." : "Generate Order & Bags"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignLogisticsModal({
  order,
  onClose,
  onSuccess,
}: {
  order: B2BOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [driverName, setDriverName] = useState(order.assignedDriver?.name || "Mukesh Sharma");
  const [driverPhone, setDriverPhone] = useState(order.assignedDriver?.phone || "+91 98111 22233");
  const [vehicleType, setVehicleType] = useState(order.assignedDriver?.vehicleType || "cargo");
  const [hubName, setHubName] = useState(order.assignedHub?.name || "Central Commercial Hub");
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    setSaving(true);
    try {
      await assignB2BOrderLogistics(order.orderCode, {
        driverName,
        driverPhone,
        vehicleType,
        hubName,
      });
      toast.success("Driver and Hub assigned successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign logistics");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Truck className="size-5 text-blue-600" />
            Assign Cargo Logistics: {order.orderCode}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Client: {order.businessName} | Estimated: {order.estimatedKg} kg
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Driver / Fleet Captain Name</Label>
            <Input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="h-8 mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Driver Phone</Label>
              <Input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Vehicle Type</Label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full h-8 mt-1 text-xs bg-white border border-zinc-200 rounded-md px-2"
              >
                <option value="cargo">Commercial Van / Cargo</option>
                <option value="auto">Auto / 3-Wheeler</option>
                <option value="van">Mini Truck (Tata Ace)</option>
                <option value="bike">Heavy Two-Wheeler</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Assigned Processing Laundromat Hub</Label>
            <Input
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              className="h-8 mt-1 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={saving}
            className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? "Assigning..." : "Confirm Dispatch Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordWeighInModal({
  order,
  onClose,
  onSuccess,
}: {
  order: B2BOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [stage, setStage] = useState<"doorstep" | "hub">("hub");
  const [scaleWeight, setScaleWeight] = useState<number>(order.doorstepScaleKg || order.estimatedKg || 150);
  const [tareWeight, setTareWeight] = useState<number>(order.tareWeightKg || 3);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await recordB2BWeighIn(order.orderCode, {
        stage,
        scaleWeightKg: Number(scaleWeight),
        tareWeightKg: stage === "hub" ? Number(tareWeight) : 0,
        bagBarcodes: order.bagBarcodes,
      });
      toast.success(`${stage === "doorstep" ? "Doorstep" : "Hub Net"} weigh-in recorded`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record weigh-in");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Scale className="size-5 text-indigo-600" />
            Record Scale Weigh-In: {order.orderCode}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dual scale reconciliation prevents billing discrepancies between client bay and hub.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Weigh-in Stage</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStage("doorstep")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                  stage === "doorstep"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-zinc-700 border-zinc-200"
                }`}
              >
                1. Doorstep Scale
              </button>
              <button
                type="button"
                onClick={() => setStage("hub")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                  stage === "hub"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-zinc-700 border-zinc-200"
                }`}
              >
                2. Hub Commercial Scale
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Gross Scale Reading (kg) *</Label>
              <Input
                type="number"
                step="0.1"
                value={scaleWeight}
                onChange={(e) => setScaleWeight(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
            {stage === "hub" && (
              <div>
                <Label className="text-[11px] font-bold text-zinc-700">Bag Tare Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(Number(e.target.value))}
                  className="h-8 mt-1 text-xs"
                />
              </div>
            )}
          </div>

          {stage === "hub" && order.doorstepScaleKg && (
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Variance Preview</span>
              <p className="text-zinc-700 mt-1">
                Doorstep: <span className="font-bold">{order.doorstepScaleKg} kg</span> vs Hub Net:{" "}
                <span className="font-bold">{Math.max(0, scaleWeight - tareWeight).toFixed(1)} kg</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? "Saving..." : "Verify & Save Scale Weight"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: B2BInvoice;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [utrNumber, setUtrNumber] = useState("");
  const [amount, setAmount] = useState<number>(invoice.balanceDue || invoice.totalAmount || 0);
  const [bankName, setBankName] = useState("HDFC Corporate NEFT");
  const [tdsDeducted, setTdsDeducted] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      toast.error("Please enter the Bank UTR / Transaction Reference number");
      return;
    }
    setSaving(true);
    try {
      await recordB2BPayment(invoice.invoiceNumber, {
        utrNumber,
        amount: Number(amount),
        bankName,
        tdsDeducted: Number(tdsDeducted),
      });
      toast.success(`Payment of ₹${amount} recorded successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="size-5 text-emerald-600" />
            Record Bank UTR Payment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Invoice: <span className="font-mono font-bold text-zinc-900">{invoice.invoiceNumber}</span> | Client: {invoice.businessName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Bank Transfer UTR Number *</Label>
            <Input
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
              placeholder="e.g. HDFCR520261115009182"
              className="h-8 mt-1 text-xs font-mono uppercase"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Amount Received (₹) *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">TDS Deducted (if any)</Label>
              <Input
                type="number"
                value={tdsDeducted}
                onChange={(e) => setTdsDeducted(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Remittance Bank Name</Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="h-8 mt-1 text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={saving}
              className="h-8 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {saving ? "Recording..." : "Confirm Bank Credit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleTrialModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: B2BClient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [trialDate, setTrialDate] = useState("2026-11-15");
  const [pickupSlot, setPickupSlot] = useState("10:00 AM - 12:00 PM");
  const [instructions, setInstructions] = useState("Wash & steam press 20 kg test bed linen");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await scheduleB2BTrial(lead.b2bId, {
        trialDate,
        pickupSlot,
        instructions,
      });
      toast.success("Free 20 kg Commercial Trial scheduled successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule trial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="size-5 text-indigo-600" />
            Schedule Free Commercial Trial (20 kg)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Client: {lead.businessName} ({lead.category})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Trial Date</Label>
              <Input
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Pickup Slot</Label>
              <Input
                value={pickupSlot}
                onChange={(e) => setPickupSlot(e.target.value)}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Special Processing Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="h-16 text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={saving}
              className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? "Scheduling..." : "Confirm Free Trial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GenerateInvoiceModal({
  client,
  onClose,
  onSuccess,
}: {
  client: B2BClient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [period, setPeriod] = useState("November 2026");
  const [totalKg, setTotalKg] = useState(250);
  const [ratePerKg, setRatePerKg] = useState(client.contract?.baseRatePerKg || 32);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await generateB2BInvoice({
        b2bId: client.b2bId,
        billingPeriod: period,
        totalKg: Number(totalKg),
        ratePerKg: Number(ratePerKg),
      });
      toast.success("GST Tax Invoice compiled successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="size-5 text-emerald-600" />
            Compile Monthly GST B2B Invoice
          </DialogTitle>
          <DialogDescription className="text-xs">
            Client: {client.businessName} (GSTIN: {client.gstin || "Exempt"})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-zinc-700">Billing Period</Label>
            <Input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-8 mt-1 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Billed Volume (kg)</Label>
              <Input
                type="number"
                value={totalKg}
                onChange={(e) => setTotalKg(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-zinc-700">Contract Rate (₹/kg)</Label>
              <Input
                type="number"
                value={ratePerKg}
                onChange={(e) => setRatePerKg(Number(e.target.value))}
                className="h-8 mt-1 text-xs"
                required
              />
            </div>
          </div>

          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 space-y-1">
            <div className="flex justify-between text-zinc-600">
              <span>Taxable Value:</span>
              <span className="font-bold text-zinc-900">₹{(totalKg * ratePerKg).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>18% GST (9% CGST + 9% SGST):</span>
              <span>₹{(totalKg * ratePerKg * 0.18).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-zinc-900 pt-1 border-t border-zinc-200">
              <span>Grand Total:</span>
              <span className="text-emerald-700">₹{(totalKg * ratePerKg * 1.18).toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" type="button" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={saving}
              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Compiling..." : "Generate GST Tax Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

