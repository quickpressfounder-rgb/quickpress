import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Globe2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Store,
  Bike,
  Users,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Shirt,
  PieChart,
  FileDown,
  Navigation,
  CreditCard,
  Wallet,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import { RevenueAreaChart, OrdersBarChart, GrowthLineChart } from "../components/AdminCharts";
import {
  fetchAnalyticsData,
  fetchAnalyticsKpis,
  fetchCityPerformance,
  fetchGrowthSeries,
  fetchReports,
  exportReportCsv,
  type BackendAnalytics,
  type CityPerformance,
  type ReportFile,
  type ServiceEconomics,
} from "../api/analytics";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/analytics")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Platform Analytics & Business Intelligence",
      "Live nationwide GMV trajectory, market hub benchmarks, service line economics, and downloadable executive audit reports."
    ),
  component: AnalyticsPage,
});

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"growth" | "cities" | "services" | "reports">("growth");

  // Query analytics with current range & city filters
  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", "data", timeRange, selectedCity],
    queryFn: () => fetchAnalyticsData({ range: timeRange, city: selectedCity }),
  });

  const kpisQuery = useQuery({
    queryKey: ["admin", "analytics", "kpis", timeRange, selectedCity],
    queryFn: () => fetchAnalyticsKpis({ range: timeRange, city: selectedCity }),
  });

  const data = analyticsQuery.data;
  const kpis = kpisQuery.data ?? [];
  const cities = data?.cities ?? [];
  const reports = data?.reports ?? [];
  const services = data?.servicesBreakdown ?? [];
  const paymentModes = data?.paymentModes ?? {};
  const growthSeries = data?.growthSeries ?? [];

  const handleDownloadReport = async (reportType: string, reportName: string) => {
    try {
      toast.info(`Generating ${reportName}...`);
      const exportUrl = await exportReportCsv(reportType, selectedCity);
      const link = document.createElement("a");
      link.href = exportUrl;
      link.setAttribute("download", `QuickPress_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${reportName} downloaded successfully!`);
    } catch {
      toast.error(`Failed to export ${reportName}`);
    }
  };

  const handleExportQuickSummary = () => {
    const csvContent = [
      "Metric,Value,Notes",
      `Gross Platform Revenue,INR ${data?.revenue || 0},Orders GMV + VIP Memberships`,
      `Delivered Orders GMV,INR ${data?.ordersGmv || 0},Completed laundry orders`,
      `VIP Membership Revenue,INR ${data?.membershipRevenue || 0},VIP subscription passes`,
      `Total Booked Orders,${data?.totalOrders || 0},Incoming order pipeline`,
      `Delivered Orders,${data?.deliveredOrders || 0},Doorstep completed`,
      `Average Order Value,INR ${data?.aov || 0},Per delivered order`,
      `Fulfillment Rate,${data?.fulfillmentRate || 100}%,Success rate`,
      `Active Stores,${data?.partners || 0},Operational laundry hubs`,
      `Fleet Captains,${data?.riders || 0},Active delivery fleet`,
      `Registered Customers,${data?.customers || 0},User base`,
      `Generated At,${new Date().toISOString()},Real Supabase Database Sync`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Executive_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Executive summary exported!");
  };

  return (
    <AdminShell
      title="Platform Analytics & Business Intelligence"
      subtitle="Nationwide GMV trajectory, market hub benchmarks, service line economics, and executive audit reports."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Filter Selector */}
          <div className="flex items-center rounded-xl bg-zinc-100 p-0.5 border border-zinc-200">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7D" },
              { id: "30d", label: "30D" },
              { id: "90d", label: "90D" },
              { id: "all", label: "All Time" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRange === t.id ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* City Filter Selector */}
          <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded-xl px-2 py-0.5">
            <Globe2 className="size-3.5 text-zinc-500" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filter analytics by city"
              className="bg-transparent text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer py-1"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.city}>
                  {c.city} ({c.orders} orders)
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Action */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              analyticsQuery.refetch();
              kpisQuery.refetch();
              toast.success("Analytics refreshed from Supabase database!");
            }}
            disabled={analyticsQuery.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${analyticsQuery.isRefetching ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </Button>

          {/* Quick Export Actions */}
          <Button
            size="sm"
            onClick={handleExportQuickSummary}
            className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleDownloadReport("financial_pl", "Executive Board Statement")}
            className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
          >
            <FileText className="size-3.5 mr-1.5" />
            <span>Executive P&L</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP 6 DYNAMIC KPI SUMMARY CARDS
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "gmv",
              label: "Gross Platform Revenue",
              value: `₹${(data?.revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              hint: `Orders: ₹${(data?.ordersGmv || 0).toLocaleString("en-IN")} · VIP: ₹${(data?.membershipRevenue || 0).toLocaleString("en-IN")}`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "aov",
              label: "Average Order Value (AOV)",
              value: `₹${(data?.aov || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              hint: "Per delivered cart",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "orders",
              label: "Booked Pipeline",
              value: `${data?.totalOrders || 0} Orders`,
              hint: `${data?.deliveredOrders || 0} Delivered · ${data?.inProgressOrders || 0} In Transit`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "fulfillment",
              label: "Fulfillment Success",
              value: `${data?.fulfillmentRate || 100}%`,
              hint: `${data?.cancellationRate || 0}% cancellations`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "partners",
              label: "Partner Store Hubs",
              value: `${data?.partners || 0} Stores`,
              hint: "Active processing network",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "fleet",
              label: "Delivery Fleet Captains",
              value: `${data?.riders || 0} Captains`,
              hint: `${data?.customers || 0} Registered Users`,
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            2. MAIN TABS NAVIGATION
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="growth" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Growth Velocity & Revenue Funnel
                </TabsTrigger>
                <TabsTrigger value="cities" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Market Hubs & City Benchmarks ({cities.length})
                </TabsTrigger>
                <TabsTrigger value="services" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Service Line Economics ({services.length})
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Downloadable Executive Reports ({reports.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Sparkles className="size-3.5 text-emerald-600 animate-pulse" />
              <span>Real-Time Supabase Sync</span>
            </div>
          </div>
        </SectionCard>

        {/* =========================================================================
            3. TAB 1: GROWTH VELOCITY & FUNNEL
        ========================================================================= */}
        {activeTab === "growth" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                title="Gross Platform Revenue Trajectory"
                description="Live daily and cumulative gross merchandise revenue realized from delivered bookings."
              >
                <RevenueAreaChart data={growthSeries} loading={analyticsQuery.isLoading} />
              </SectionCard>

              <SectionCard
                title="Daily Booking Volume & Orders Progression"
                description="Order intake and delivery completion velocity across the active timeline."
              >
                <OrdersBarChart data={growthSeries} loading={analyticsQuery.isLoading} />
              </SectionCard>
            </div>

            <SectionCard
              title="Order Fulfillment Pipeline & Operational Stages"
              description="Live progression of customer laundry orders from placement to final doorstep return."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Booked</span>
                    <Clock className="size-4 text-zinc-400" />
                  </div>
                  <p className="text-2xl font-black text-zinc-900">{data?.totalOrders || 0} Orders</p>
                  <p className="text-[10px] text-zinc-500">₹{(data?.grossBookedValue || 0).toLocaleString("en-IN")} pipeline value</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">In Processing & Transit</span>
                    <Layers className="size-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-900">{data?.inProgressOrders || 0} Active</p>
                  <p className="text-[10px] text-amber-700">Processed by hubs & riders</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Delivered & Fulfilled</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-900">{data?.deliveredOrders || 0} Delivered</p>
                  <p className="text-[10px] text-emerald-700 font-bold">₹{(data?.ordersGmv || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} realized GMV</p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Cancellations</span>
                    <ShieldCheck className="size-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-black text-rose-900">{data?.cancelledOrders || 0} Cancelled</p>
                  <p className="text-[10px] text-rose-700 font-bold">{data?.cancellationRate || 0}% cancellation rate</p>
                </div>
              </div>
            </SectionCard>

            {/* Payment Modes Distribution */}
            <SectionCard
              title="Customer Payment Methods & Settlement Channels"
              description="Distribution of order revenues across COD, UPI, cards, and QuickPress Wallet."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(paymentModes).map(([k, p]) => (
                  <div key={k} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                        {k === "cod" ? <IndianRupee className="size-4" /> : k === "upi" ? <QrCode className="size-4" /> : k === "card" ? <CreditCard className="size-4" /> : <Wallet className="size-4" />}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {p.count} orders
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{p.label}</p>
                      <p className="text-lg font-black text-zinc-900">₹{(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* =========================================================================
            4. TAB 2: MARKET HUBS & CITY BENCHMARKS
        ========================================================================= */}
        {activeTab === "cities" && (
          <SectionCard
            title="City Performance & Operational Benchmarks"
            description="Comparative metrics across operational cities including GMV, average order cart, store hubs, and delivery capacity."
          >
            <DataTable
              loading={analyticsQuery.isLoading}
              rows={cities}
              columns={[
                {
                  key: "city",
                  label: "Market Hub & State",
                  render: (r: CityPerformance) => (
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs">
                        <Globe2 className="size-4" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 text-xs">{r.city}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{r.state}, India</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r: CityPerformance) => <StatusPill value={r.status} />,
                },
                {
                  key: "orders",
                  label: "Booked Orders",
                  render: (r: CityPerformance) => (
                    <div className="text-xs">
                      <span className="font-bold text-zinc-900">{r.orders} Total</span>
                      <span className="text-zinc-400 text-[10px] block">({r.delivered || 0} Delivered)</span>
                    </div>
                  ),
                },
                {
                  key: "gmv",
                  label: "Gross GMV",
                  render: (r: CityPerformance) => (
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
                      {r.gmv}
                    </span>
                  ),
                },
                {
                  key: "aov",
                  label: "Avg Order Cart (AOV)",
                  render: (r: CityPerformance) => <span className="font-bold text-xs text-zinc-700">{r.aov}</span>,
                },
                {
                  key: "partners",
                  label: "Partner Stores",
                  render: (r: CityPerformance) => (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700">
                      <Store className="size-3.5 text-emerald-600" /> {r.partners} Hubs
                    </span>
                  ),
                },
                {
                  key: "riders",
                  label: "Captains Fleet",
                  render: (r: CityPerformance) => (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700">
                      <Bike className="size-3.5 text-sky-600" /> {r.riders} Captains
                    </span>
                  ),
                },
                {
                  key: "customers",
                  label: "User Base",
                  render: (r: CityPerformance) => (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700">
                      <Users className="size-3.5 text-indigo-600" /> {r.customers} Users
                    </span>
                  ),
                },
                {
                  key: "growth",
                  label: "Growth Velocity",
                  render: (r: CityPerformance) => (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                      <ArrowUpRight className="size-3" /> {r.growth}
                    </span>
                  ),
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            5. TAB 3: SERVICE LINE ECONOMICS
        ========================================================================= */}
        {activeTab === "services" && (
          <SectionCard
            title="Service Line Economics & Category Share"
            description="Real-time revenue contribution and booking volume calculated dynamically from order items in the database."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s: ServiceEconomics) => (
                <div key={s.name} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs hover:border-zinc-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl font-bold ${
                        s.color === "emerald"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.color === "purple"
                          ? "bg-purple-100 text-purple-800"
                          : s.color === "sky"
                          ? "bg-sky-100 text-sky-800"
                          : s.color === "amber"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {s.icon === "shirt" ? <Shirt className="size-5" /> : s.icon === "layers" ? <Layers className="size-5" /> : s.icon === "shield" ? <ShieldCheck className="size-5" /> : <Sparkles className="size-5" />}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        s.sharePercent > 0
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-zinc-500 bg-zinc-100 border-zinc-200"
                      }`}
                    >
                      {s.sharePercent}% Share
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-900 text-sm">{s.name}</h4>
                    <p className="text-[11px] text-zinc-400">{s.description}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">Delivered Gross</span>
                      <span className="font-black text-zinc-900 text-sm">{s.formattedRevenue}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block font-medium">Orders Count</span>
                      <span className="font-bold text-zinc-700">{s.orders} Bookings</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* =========================================================================
            6. TAB 4: DOWNLOADABLE EXECUTIVE REPORTS
        ========================================================================= */}
        {activeTab === "reports" && (
          <SectionCard
            title="Executive Audit Reports & Data Exports"
            description="Live official platform reconciliations, merchant payout statements, and city operational spreadsheets generated directly from live database records."
          >
            <div className="rounded-2xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
              {reports.map((rep: ReportFile) => (
                <div key={rep.id} className="p-4 flex flex-wrap items-center justify-between gap-4 bg-white hover:bg-zinc-50/80 transition-colors text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl font-bold text-xs ${
                        rep.format === "PDF"
                          ? "bg-red-50 text-red-700"
                          : rep.format === "CSV"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {rep.format === "PDF" ? <FileText className="size-5" /> : <FileSpreadsheet className="size-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{rep.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        Period: {rep.period} · File Size: {rep.fileSize} · Generated: {rep.generated}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 border border-emerald-200 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Ready
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 shadow-2xs"
                      onClick={() => handleDownloadReport(rep.type || "financial_pl", rep.name)}
                    >
                      <FileDown className="size-3.5 mr-1 text-emerald-600" />
                      Download {rep.format}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </AdminShell>
  );
}
